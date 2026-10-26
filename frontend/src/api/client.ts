import {
  HealthStatus,
  CameraStatus,
  ModelInfo,
  PredictResponse,
  PredictionRecord
} from '../types';

const RAW_API_BASE: string =
  (import.meta as any).env?.VITE_API_BASE ||
  (import.meta as any).env?.VITE_API_BASE_URL ||
  '';

export const API_BASE = RAW_API_BASE.replace(/\/+$/, '');
const API_KEY: string = (import.meta as any).env?.VITE_API_KEY || '';

function buildUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE) {
    return cleanPath;
  }
  return `${API_BASE}${cleanPath}`;
}

function getHeaders(extraHeaders: Record<string, string> = {}): HeadersInit {
  const headers: Record<string, string> = { ...extraHeaders };
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  return headers;
}

export const api = {
  async getHealth(): Promise<HealthStatus> {
    const res = await fetch(buildUrl('/api/health'), {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  async getModelInfo(): Promise<ModelInfo> {
    const res = await fetch(buildUrl('/api/model/info'), {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch model info: ${res.statusText}`);
    return res.json();
  },

  async getCameraStatus(): Promise<CameraStatus> {
    const res = await fetch(buildUrl('/api/camera/status'), {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch camera status: ${res.statusText}`);
    return res.json();
  },

  async startCamera(): Promise<{ success: boolean; message: string; connected: boolean; streaming: boolean }> {
    const res = await fetch(buildUrl('/api/camera/start'), {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to start camera: ${res.statusText}`);
    return res.json();
  },

  async stopCamera(): Promise<{ success: boolean; message: string; connected: boolean; streaming: boolean }> {
    const res = await fetch(buildUrl('/api/camera/stop'), {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to stop camera: ${res.statusText}`);
    return res.json();
  },

  async predict(file?: File): Promise<PredictResponse> {
    let res: Response;
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      res = await fetch(buildUrl('/api/predict'), {
        method: 'POST',
        headers: getHeaders(),
        body: formData,
      });
    } else {
      res = await fetch(buildUrl('/api/predict'), {
        method: 'POST',
        headers: getHeaders(),
      });
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.detail || `Prediction failed (${res.status}): ${res.statusText}`);
    }
    return res.json();
  },

  async getPredictions(limit: number = 20, plant?: string): Promise<PredictionRecord[]> {
    const base = buildUrl('/api/predictions');
    const url = new URL(base, window.location.origin);
    url.searchParams.append('limit', limit.toString());
    if (plant) {
      url.searchParams.append('plant', plant);
    }
    const res = await fetch(url.toString(), {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch predictions: ${res.statusText}`);
    return res.json();
  },

  async getPredictionById(id: number): Promise<PredictionRecord> {
    const res = await fetch(buildUrl(`/api/predictions/${id}`), {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch prediction ${id}`);
    return res.json();
  },

  getStreamUrl(): string {
    return `${buildUrl('/api/stream')}?t=${Date.now()}`;
  },

  getImageUrl(url?: string | null): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return buildUrl(url);
  }
};
