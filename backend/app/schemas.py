from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class HealthResponse(BaseModel):
    status: str
    camera_connected: bool
    camera_streaming: bool
    model_loaded: bool
    uptime_seconds: float
    captures_count: int
    timestamp: str

class ModelInfoResponse(BaseModel):
    loaded: bool
    model_name: str
    architecture: str
    total_classes: int
    tomato_classes_count: int
    input_shape: List[int]
    input_dtype: str
    output_shape: List[int]
    output_dtype: str
    classes: List[str]
    tomato_classes: List[str]
    quantization: Optional[str] = "Float32"

class ClassPrediction(BaseModel):
    class_name: str
    display_name: str
    plant: str
    disease: str
    confidence: float
    percentage: float
    original_index: int
    is_tomato: bool

class PredictResponse(BaseModel):
    success: bool
    predicted_class: str
    display_name: str
    plant: str
    disease: str
    confidence: float
    percentage: float
    is_tomato: bool
    tomato_specific_prediction: Optional[ClassPrediction] = None
    top_3_predictions: List[ClassPrediction]
    top_3_tomato_predictions: List[ClassPrediction]
    image_filename: Optional[str] = None
    image_url: Optional[str] = None
    thumbnail_base64: Optional[str] = None
    timestamp: str
    inference_time_ms: float
    disclaimer: str = (
        "AI predictions are estimates based on computer vision models "
        "and do not substitute for certified agricultural inspection or lab testing."
    )

class PredictionRecord(BaseModel):
    id: int
    timestamp: str
    predicted_class: str
    plant: str
    disease: str
    confidence: float
    is_tomato: bool
    tomato_confidence: Optional[float] = None
    top_predictions: List[Dict[str, Any]]
    tomato_top_predictions: Optional[List[Dict[str, Any]]] = None
    image_filename: Optional[str] = None
    image_url: Optional[str] = None
    thumbnail_base64: Optional[str] = None
    source: str = "camera"

class CameraStatusResponse(BaseModel):
    connected: bool
    streaming: bool
    camera_index: int
    resolution: str
    fps: int
    error: Optional[str] = None

class CameraControlResponse(BaseModel):
    success: bool
    message: str
    connected: bool
    streaming: bool
