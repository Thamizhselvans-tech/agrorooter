export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'camera_offline' | string;
  camera_connected: boolean;
  camera_streaming: boolean;
  model_loaded: boolean;
  uptime_seconds: number;
  captures_count: number;
  timestamp: string;
}

export interface CameraStatus {
  connected: boolean;
  streaming: boolean;
  camera_index: number;
  resolution: string;
  fps: number;
  error?: string | null;
}

export interface ModelInfo {
  loaded: boolean;
  model_name: string;
  architecture: string;
  total_classes: number;
  tomato_classes_count: number;
  input_shape: number[];
  input_dtype: string;
  output_shape: number[];
  output_dtype: string;
  classes: string[];
  tomato_classes: string[];
  quantization?: string;
  error?: string | null;
}

export interface ClassPrediction {
  class_name: string;
  display_name: string;
  plant: string;
  disease: string;
  confidence: number;
  percentage: number;
  original_index: number;
  is_tomato: boolean;
}

export interface PredictResponse {
  success: boolean;
  predicted_class: string;
  display_name: string;
  plant: string;
  disease: string;
  confidence: number;
  percentage: number;
  is_tomato: boolean;
  tomato_specific_prediction?: ClassPrediction | null;
  top_3_predictions: ClassPrediction[];
  top_3_tomato_predictions: ClassPrediction[];
  image_filename?: string | null;
  image_url?: string | null;
  thumbnail_base64?: string | null;
  timestamp: string;
  inference_time_ms: number;
  disclaimer: string;
}

export interface PredictionRecord {
  id: number;
  timestamp: string;
  predicted_class: string;
  plant: string;
  disease: string;
  confidence: number;
  is_tomato: boolean;
  tomato_confidence?: number | null;
  top_predictions: ClassPrediction[];
  tomato_top_predictions?: ClassPrediction[] | null;
  image_filename?: string | null;
  image_url?: string | null;
  thumbnail_base64?: string | null;
  source: string;
}
