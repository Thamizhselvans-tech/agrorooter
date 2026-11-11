import { PredictionRecord, PredictResponse } from '../types';

const STORAGE_KEYS = {
  API_BASE: 'AGRI_ROVER_API_BASE',
  CACHED_PREDICTIONS: 'AGRI_ROVER_CACHED_PREDICTIONS',
  CACHED_LATEST: 'AGRI_ROVER_CACHED_LATEST_PRED',
  PREDICTION_MODE: 'AGRI_ROVER_PREDICTION_MODE',
};

export const offlineStorage = {
  getApiBase(): string {
    if (typeof window === 'undefined') return '';
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.API_BASE);
      if (saved && saved.trim()) {
        return saved.trim().replace(/\/+$/, '');
      }
    } catch (e) {
      // Storage access may be restricted
    }
    const envBase =
      (import.meta as any).env?.VITE_API_BASE ||
      (import.meta as any).env?.VITE_API_BASE_URL ||
      '';
    return (envBase || '').trim().replace(/\/+$/, '');
  },

  setApiBase(url: string): void {
    if (typeof window === 'undefined') return;
    try {
      const clean = (url || '').trim().replace(/\/+$/, '');
      if (clean) {
        localStorage.setItem(STORAGE_KEYS.API_BASE, clean);
      } else {
        localStorage.removeItem(STORAGE_KEYS.API_BASE);
      }
    } catch (e) {
      console.warn('Failed to save API base to localStorage:', e);
    }
  },

  getCachedPredictions(): PredictionRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CACHED_PREDICTIONS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  },

  setCachedPredictions(records: PredictionRecord[]): void {
    if (typeof window === 'undefined' || !Array.isArray(records)) return;
    try {
      // Cap at 100 to avoid localStorage quota issues
      const slice = records.slice(0, 100);
      localStorage.setItem(STORAGE_KEYS.CACHED_PREDICTIONS, JSON.stringify(slice));
    } catch (e) {
      console.warn('Failed to cache predictions in localStorage:', e);
    }
  },

  getCachedLatestPrediction(): PredictResponse | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CACHED_LATEST);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  setCachedLatestPrediction(pred: PredictResponse | null): void {
    if (typeof window === 'undefined') return;
    try {
      if (pred) {
        localStorage.setItem(STORAGE_KEYS.CACHED_LATEST, JSON.stringify(pred));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CACHED_LATEST);
      }
    } catch (e) {
      console.warn('Failed to cache latest prediction in localStorage:', e);
    }
  },

  getPredictionMode(): 'standalone' | 'raspberry_pi' {
    if (typeof window === 'undefined') return 'standalone';
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PREDICTION_MODE);
      if (saved === 'raspberry_pi') return 'raspberry_pi';
    } catch (e) {}
    return 'standalone';
  },

  setPredictionMode(mode: 'standalone' | 'raspberry_pi'): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.PREDICTION_MODE, mode);
    } catch (e) {}
  },

  addPredictionRecord(record: PredictionRecord): PredictionRecord[] {
    const list = this.getCachedPredictions();
    // Prepend new record, ensure unique ID
    const nextId = list.length > 0 ? Math.max(...list.map((r) => r.id || 0)) + 1 : 1;
    const finalRecord = { ...record, id: record.id || nextId };
    const updated = [finalRecord, ...list.filter((r) => r.id !== finalRecord.id)].slice(0, 100);
    this.setCachedPredictions(updated);
    return updated;
  },
};
