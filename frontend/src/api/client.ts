import {
  HealthStatus,
  CameraStatus,
  ModelInfo,
  PredictResponse,
  PredictionRecord
} from '../types';

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('AGRI_ROVER_API_BASE');
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  }
  const raw =
    (import.meta as any).env?.VITE_API_BASE ||
    (import.meta as any).env?.VITE_API_BASE_URL ||
    'https://horse-tank-wendy-partners.trycloudflare.com';
  return raw.replace(/\/+$/, '');
}

export function setApiBase(url: string): void {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('AGRI_ROVER_API_BASE', url.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem('AGRI_ROVER_API_BASE');
    }
  }
}

export const API_BASE = getApiBase();
const API_KEY: string = (import.meta as any).env?.VITE_API_KEY || '';

function buildUrl(path: string): string {
  const base = getApiBase();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) {
    return cleanPath;
  }
  return `${base}${cleanPath}`;
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
      if (res.status === 405) {
        throw new Error(
          "Backend connection required: You are viewing the cloud frontend on Vercel. Because the Python AI model & camera run on your hardware, open Settings (⚙️) to configure your Raspberry Pi / Cloudflare Tunnel URL, or test locally at http://localhost:5173."
        );
      }
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
