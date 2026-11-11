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
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((r) => r && typeof r === 'object')
        .map((r, idx) => {
          const className = r.predicted_class || 'tomato - healthy';
          const parts = className.split('-');
          const fallbackPlant = parts[0]?.trim() || 'Tomato';
          const fallbackDisease = parts.slice(1).join('-').trim() || 'Healthy';
          return {
            id: r.id || idx + 1,
            timestamp: r.timestamp || new Date().toISOString(),
            predicted_class: className,
            plant: r.plant || fallbackPlant,
            disease: r.disease || fallbackDisease,
            confidence: typeof r.confidence === 'number' ? r.confidence : 0.9,
            is_tomato: r.is_tomato !== undefined ? !!r.is_tomato : true,
            tomato_confidence: r.tomato_confidence ?? null,
            top_predictions: Array.isArray(r.top_predictions) ? r.top_predictions : [],
            tomato_top_predictions: Array.isArray(r.tomato_top_predictions) ? r.tomato_top_predictions : [],
            image_filename: r.image_filename,
            image_url: r.image_url,
            thumbnail_base64: r.thumbnail_base64,
            source: r.source || 'standalone_upload',
          };
        });
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
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      const className = parsed.predicted_class || 'tomato - healthy';
      const parts = className.split('-');
      const fallbackPlant = parts[0]?.trim() || 'Tomato';
      const fallbackDisease = parts.slice(1).join('-').trim() || 'Healthy';
      return {
        success: true,
        predicted_class: className,
        display_name: parsed.display_name || `${fallbackPlant} ${fallbackDisease}`,
        plant: parsed.plant || fallbackPlant,
        disease: parsed.disease || fallbackDisease,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
        percentage: typeof parsed.percentage === 'number' ? parsed.percentage : 90,
        is_tomato: parsed.is_tomato !== undefined ? !!parsed.is_tomato : true,
        tomato_specific_prediction: parsed.tomato_specific_prediction || null,
        top_3_predictions: Array.isArray(parsed.top_3_predictions) ? parsed.top_3_predictions : [],
        top_3_tomato_predictions: Array.isArray(parsed.top_3_tomato_predictions) ? parsed.top_3_tomato_predictions : [],
        image_filename: parsed.image_filename,
        image_url: parsed.image_url,
        thumbnail_base64: parsed.thumbnail_base64,
        timestamp: parsed.timestamp || new Date().toISOString(),
        inference_time_ms: parsed.inference_time_ms || 25,
        disclaimer: parsed.disclaimer,
      };
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
