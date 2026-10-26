import time
import os
from datetime import datetime
from fastapi import APIRouter
from ..schemas import HealthResponse
from ..camera import camera_manager
from ..model import model_instance
from ..config import settings

router = APIRouter(prefix="/api", tags=["Health"])

START_TIME = time.time()

@router.get("/health", response_model=HealthResponse)
def get_health():
    uptime = time.time() - START_TIME
    cam_status = camera_manager.get_status()
    model_info = model_instance.get_info()
    
    # Count stored captures
    captures_count = 0
    if os.path.exists(settings.CAPTURES_DIR):
        captures_count = len([f for f in os.listdir(settings.CAPTURES_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])

    overall_status = "healthy"
    if not model_info["loaded"]:
        overall_status = "degraded"
    elif not cam_status["connected"]:
        overall_status = "camera_offline"

    return HealthResponse(
        status=overall_status,
        camera_connected=cam_status["connected"],
        camera_streaming=cam_status["streaming"],
        model_loaded=model_info["loaded"],
        uptime_seconds=round(uptime, 1),
        captures_count=captures_count,
        timestamp=datetime.utcnow().isoformat() + "Z"
    )
