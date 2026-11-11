import {
  HealthStatus,
  CameraStatus,
  ModelInfo,
  SystemConnectionStatus,
  ConnectionState,
} from '../types';
import { offlineStorage } from './storage';

export type ConnectionListener = (status: SystemConnectionStatus) => void;

class ConnectionManager {
  private static instance: ConnectionManager;

  private currentStatus: SystemConnectionStatus = {
    state: 'checking',
    isBackendConnected: false,
    isRoverOnline: false,
    isCameraConnected: false,
    isCameraStreaming: false,
    isModelLoaded: false,
    lastChecked: null,
    apiBase: offlineStorage.getApiBase(),
    health: null,
    cameraStatus: null,
    modelInfo: null,
    error: null,
  };

  private listeners: Set<ConnectionListener> = new Set();
  private pollIntervalId: any = null;
  private activeCheckAbortController: AbortController | null = null;
  private isChecking = false;
  private readonly defaultTimeoutMs = 4500;
  private readonly pollIntervalMs = 12000; // 12s (between 10-15 seconds requirement)

  private constructor() {
    this.currentStatus.apiBase = offlineStorage.getApiBase();
  }

  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  public getStatus(): SystemConnectionStatus {
    return { ...this.currentStatus };
  }

  public getApiBase(): string {
    return this.currentStatus.apiBase;
  }

  public setApiBase(url: string): void {
    const clean = (url || '').trim().replace(/\/+$/, '');
    offlineStorage.setApiBase(clean);
    this.currentStatus.apiBase = clean;
    this.notify();
    // Immediately test new URL
    this.checkConnection({ force: true });
  }

  public subscribe(listener: ConnectionListener): () => void {
    this.listeners.add(listener);
    // Send immediate initial status
    listener({ ...this.currentStatus });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = { ...this.currentStatus };
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (e) {
        console.warn('Error in connection listener:', e);
      }
    });
  }

  public buildUrl(path: string, customBase?: string): string {
    const base = customBase !== undefined ? customBase : this.getApiBase();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (!base) {
      return cleanPath;
    }
    return `${base.replace(/\/+$/, '')}${cleanPath}`;
  }

  private getAuthHeaders(extraHeaders: Record<string, string> = {}): HeadersInit {
    const headers: Record<string, string> = { ...extraHeaders };
    const apiKey = (import.meta as any).env?.VITE_API_KEY || '';
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
    return headers;
  }

  /**
   * Safe fetch with configurable timeout and abort controller.
   * Catches network exceptions and rejects with friendly errors.
   */
  public async safeFetch(
    path: string,
    options: RequestInit = {},
    timeoutMs: number = this.defaultTimeoutMs,
    customBase?: string
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Merge external signal if provided
    let combinedSignal = controller.signal;
    if (options.signal) {
      const externalSignal = options.signal;
      if (externalSignal.aborted) {
        clearTimeout(timer);
        throw new DOMException('Aborted', 'AbortError');
      }
      externalSignal.addEventListener('abort', () => controller.abort());
    }

    const url = this.buildUrl(path, customBase);
    const headers = this.getAuthHeaders(
      (options.headers as Record<string, string>) || {}
    );

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: combinedSignal,
      });
      clearTimeout(timer);
      return response;
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error('Connection timed out. Device or backend is unreachable.');
      }
      // Clean up technical message
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        throw new Error('Backend is unreachable. Please verify Raspberry Pi is powered on and connected.');
      }
      throw err;
    }
  }

  /**
   * Safely check connection without throwing uncaught exceptions.
   * Cancels any previously running health check.
   */
  public async checkConnection(options?: {
    force?: boolean;
    timeoutMs?: number;
  }): Promise<SystemConnectionStatus> {
    if (this.isChecking && !options?.force) {
      return this.currentStatus;
    }

    // Cancel prior in-flight check
    if (this.activeCheckAbortController) {
      this.activeCheckAbortController.abort();
      this.activeCheckAbortController = null;
    }

    const abortController = new AbortController();
    this.activeCheckAbortController = abortController;
    this.isChecking = true;

    // Check for mixed content upfront if in HTTPS browser environment
    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      this.currentStatus.apiBase.startsWith('http://')
    ) {
      this.isChecking = false;
      this.currentStatus = {
        ...this.currentStatus,
        state: 'offline',
        isBackendConnected: false,
        isRoverOnline: false,
        isCameraConnected: false,
        isCameraStreaming: false,
        isModelLoaded: false,
        lastChecked: Date.now(),
        error: 'Mixed Content: HTTPS frontend cannot query an HTTP backend.',
      };
      this.notify();
      return this.currentStatus;
    }

    try {
      const timeout = options?.timeoutMs ?? this.defaultTimeoutMs;
      const res = await this.safeFetch(
        '/api/health',
        { method: 'GET', signal: abortController.signal },
        timeout
      );

      if (!res.ok) {
        throw new Error(`Health check returned status ${res.status}`);
      }

      const health: HealthStatus = await res.json();

      // If backend responded, fetch auxiliary status safely
      let cameraStatus: CameraStatus | null = null;
      let modelInfo: ModelInfo | null = null;

      try {
        const [camRes, modRes] = await Promise.allSettled([
          this.safeFetch('/api/camera/status', { method: 'GET', signal: abortController.signal }, 3000),
          this.safeFetch('/api/model/info', { method: 'GET', signal: abortController.signal }, 3000),
        ]);

        if (camRes.status === 'fulfilled' && camRes.value.ok) {
          cameraStatus = await camRes.value.json();
        }
        if (modRes.status === 'fulfilled' && modRes.value.ok) {
          modelInfo = await modRes.value.json();
        }
      } catch (auxErr) {
        // Aux calls are optional; health already confirmed backend is up
      }

      const isCameraConn = cameraStatus?.connected ?? health.camera_connected;
      const isCameraStream = cameraStatus?.streaming ?? health.camera_streaming;
      const isModelLd = modelInfo?.loaded ?? health.model_loaded;

      this.currentStatus = {
        state: 'connected',
        isBackendConnected: true,
        isRoverOnline: true,
        isCameraConnected: isCameraConn,
        isCameraStreaming: isCameraStream,
        isModelLoaded: isModelLd,
        lastChecked: Date.now(),
        apiBase: this.getApiBase(),
        health,
        cameraStatus,
        modelInfo,
        error: null,
      };
    } catch (err: any) {
      if (err.name === 'AbortError' && abortController.signal.aborted) {
        // Was aborted intentionally by another check call, ignore
        return this.currentStatus;
      }

      // Clean offline state
      this.currentStatus = {
        state: 'offline',
        isBackendConnected: false,
        isRoverOnline: false,
        isCameraConnected: false,
        isCameraStreaming: false,
        isModelLoaded: false,
        lastChecked: Date.now(),
        apiBase: this.getApiBase(),
        health: null,
        cameraStatus: null,
        modelInfo: null,
        error: null, // Don't hold raw technical error
      };
    } finally {
      this.isChecking = false;
      this.activeCheckAbortController = null;
      this.notify();
    }

    return this.currentStatus;
  }

  /**
   * Safe test connection method for Settings page.
   * Gives friendly, non-technical feedback.
   */
  public async testConnection(targetUrl: string): Promise<{
    success: boolean;
    message: string;
    health?: HealthStatus;
  }> {
    const cleanUrl = (targetUrl || '').trim().replace(/\/+$/, '');

    // 1. Check for mixed content
    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      cleanUrl.toLowerCase().startsWith('http://')
    ) {
      return {
        success: false,
        message:
          'Mixed Content Restriction: This dashboard is running securely over HTTPS, but the entered backend URL uses insecure "http://". Modern browsers block this for security. Please provide a secure HTTPS Cloudflare Tunnel URL or test locally at http://localhost:5173.',
      };
    }

    try {
      const res = await this.safeFetch(
        '/api/health',
        { method: 'GET' },
        5000,
        cleanUrl
      );

      if (!res.ok) {
        return {
          success: false,
          message: `Backend reached, but server returned HTTP status ${res.status}. Please check backend logs.`,
        };
      }

      const health: HealthStatus = await res.json();
      return {
        success: true,
        message: `Connection established successfully! Model: ${
          health.model_loaded ? 'Ready' : 'Waiting for Model'
        }, Camera: ${health.camera_connected ? 'Live' : 'Not Connected'}.`,
        health,
      };
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('timed out')) {
        return {
          success: false,
          message:
            'Connection timed out after 5 seconds. Raspberry Pi is not responding. Ensure the device is powered on and connected to the network.',
        };
      }
      return {
        success: false,
        message:
          'Unable to reach Raspberry Pi backend. Please verify your device is powered on, connected to WiFi, and the address is correct.',
      };
    }
  }

  /**
   * Starts periodic background health check polling (12s interval).
   */
  public startPolling(intervalMs: number = this.pollIntervalMs): void {
    this.stopPolling();
    // Run an initial check
    this.checkConnection();

    this.pollIntervalId = setInterval(() => {
      // If user has minimized the tab, skip or do light check
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      this.checkConnection();
    }, intervalMs);
  }

  public stopPolling(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    if (this.activeCheckAbortController) {
      this.activeCheckAbortController.abort();
      this.activeCheckAbortController = null;
    }
    this.isChecking = false;
  }
}

export const connectionManager = ConnectionManager.getInstance();
