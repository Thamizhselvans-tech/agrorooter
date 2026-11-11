import {
  HealthStatus,
  CameraStatus,
  ModelInfo,
  PredictResponse,
  PredictionRecord,
} from '../types';
import { connectionManager } from './connectionManager';
import { offlineStorage } from './storage';

export function getApiBase(): string {
  return connectionManager.getApiBase();
}

export function setApiBase(url: string): void {
  connectionManager.setApiBase(url);
}

export const API_BASE = getApiBase();

export const api = {
  async getHealth(): Promise<HealthStatus> {
    const res = await connectionManager.safeFetch('/api/health', { method: 'GET' }, 4000);
    if (!res.ok) throw new Error(`Health check unavailable (${res.status})`);
    return res.json();
  },

  async getModelInfo(): Promise<ModelInfo> {
    const res = await connectionManager.safeFetch('/api/model/info', { method: 'GET' }, 4000);
    if (!res.ok) throw new Error(`Model info unavailable (${res.status})`);
    return res.json();
  },

  async getCameraStatus(): Promise<CameraStatus> {
    const res = await connectionManager.safeFetch('/api/camera/status', { method: 'GET' }, 4000);
    if (!res.ok) throw new Error(`Camera status unavailable (${res.status})`);
    return res.json();
  },

  async startCamera(): Promise<{ success: boolean; message: string; connected: boolean; streaming: boolean }> {
    const res = await connectionManager.safeFetch(
      '/api/camera/start',
      { method: 'POST' },
      5000
    );
    if (!res.ok) {
      throw new Error('Unable to start camera. Please verify the webcam is connected to the Raspberry Pi.');
    }
    return res.json();
  },

  async stopCamera(): Promise<{ success: boolean; message: string; connected: boolean; streaming: boolean }> {
    const res = await connectionManager.safeFetch(
      '/api/camera/stop',
      { method: 'POST' },
      5000
    );
    if (!res.ok) {
      throw new Error('Unable to stop camera.');
    }
    return res.json();
  },

  async predict(file?: File): Promise<PredictResponse> {
    let body: any = undefined;
    const headers: Record<string, string> = {};

    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      body = formData;
    }

    try {
      const res = await connectionManager.safeFetch(
        '/api/predict',
        {
          method: 'POST',
          body,
          headers,
        },
        12000 // Give inference a little more time
      );

      if (!res.ok) {
        if (res.status === 405) {
          throw new Error(
            'Backend connection required: Connect your Raspberry Pi or configure your tunnel in Settings to run AI inference.'
          );
        }
        if (res.status === 503) {
          const errData = await res.json().catch(() => null);
          throw new Error(
            errData?.detail || 'Inference engine is waiting for camera or model. Please check device status.'
          );
        }
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || 'Inference could not be completed.');
      }

      const pred: PredictResponse = await res.json();
      // Cache latest prediction
      offlineStorage.setCachedLatestPrediction(pred);
      return pred;
    } catch (err: any) {
      const msg = err.message || '';
      if (
        msg.includes('Backend is unreachable') ||
        msg.includes('timed out') ||
        msg.includes('Failed to fetch')
      ) {
        throw new Error(
          'Raspberry Pi is currently offline. Connect your device to enable live disease detection.'
        );
      }
      throw err;
    }
  },

  async getPredictions(limit: number = 50, plant?: string): Promise<PredictionRecord[]> {
    try {
      const base = connectionManager.buildUrl('/api/predictions');
      const url = new URL(base, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      url.searchParams.append('limit', limit.toString());
      if (plant) {
        url.searchParams.append('plant', plant);
      }

      const res = await connectionManager.safeFetch(
        `${url.pathname}${url.search}`,
        { method: 'GET' },
        4000
      );

      if (res.ok) {
        const records: PredictionRecord[] = await res.json();
        if (Array.isArray(records) && records.length > 0) {
          offlineStorage.setCachedPredictions(records);
        }
        return records;
      }
    } catch (e) {
      // Graceful fallback to offline cache
    }

    // Return cached records if network fails or backend is offline
    const cached = offlineStorage.getCachedPredictions();
    if (plant && plant !== 'all') {
      return cached.filter((r) => ((r && r.plant) || '').toLowerCase() === (plant || '').toLowerCase());
    }
    return cached;
  },

  async getPredictionById(id: number): Promise<PredictionRecord> {
    try {
      const res = await connectionManager.safeFetch(`/api/predictions/${id}`, { method: 'GET' }, 4000);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Try local cache
    }

    const cached = offlineStorage.getCachedPredictions().find((r) => r.id === id);
    if (cached) return cached;
    throw new Error(`Prediction record #${id} not found.`);
  },

  getStreamUrl(): string {
    const base = connectionManager.getApiBase();
    if (!base) return '';
    return `${connectionManager.buildUrl('/api/stream')}?t=${Date.now()}`;
  },

  getImageUrl(url?: string | null): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    return connectionManager.buildUrl(url);
  },
};
