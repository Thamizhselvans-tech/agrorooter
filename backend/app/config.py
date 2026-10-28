import os
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
# Load .env if present
load_dotenv(BASE_DIR / ".env")

class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "Agri Rover AI")
    APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1")
    
    # Model configuration (Fine-tuned MobileNetV2 with 29 classes)
    _raw_model: str = os.getenv("MODEL_PATH", "plant_disease_model/mobilenetv2_finetuned_best.keras")
    MODEL_PATH: str = str(BASE_DIR / _raw_model) if not os.path.isabs(_raw_model) else _raw_model

    _raw_labels: str = os.getenv("LABELS_PATH", "plant_disease_model/mobilenetv2_class_names.json")
    LABELS_PATH: str = str(BASE_DIR / _raw_labels) if not os.path.isabs(_raw_labels) else _raw_labels
    
    # Storage configuration
    CAPTURES_DIR: str = os.getenv("CAPTURES_DIR", str(BASE_DIR / "captures"))
    MAX_CAPTURES_STORED: int = int(os.getenv("MAX_CAPTURES_STORED", "500"))
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", str(BASE_DIR / "predictions.db"))
    
    # Camera hardware configuration (Logitech USB Webcam on RPi)
    CAMERA_INDEX: int = int(os.getenv("CAMERA_INDEX", "0"))
    CAMERA_WIDTH: int = int(os.getenv("CAMERA_WIDTH", "640"))
    CAMERA_HEIGHT: int = int(os.getenv("CAMERA_HEIGHT", "480"))
    CAMERA_FPS: int = int(os.getenv("CAMERA_FPS", "30"))
    
    # Security & Optional API Authentication
    API_KEY: Optional[str] = os.getenv("API_KEY", None)

    # Network and CORS
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Parse CORS origins from environment variable or use safe defaults
    raw_cors: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000,http://localhost:8000,*"
    )
    CORS_ORIGINS: List[str] = [o.strip() for o in raw_cors.split(",") if o.strip()]

settings = Settings()

# Ensure storage directories exist
os.makedirs(settings.CAPTURES_DIR, exist_ok=True)
