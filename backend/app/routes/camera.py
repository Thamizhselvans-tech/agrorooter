from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from ..schemas import CameraStatusResponse, CameraControlResponse
from ..camera import camera_manager

router = APIRouter(prefix="/api", tags=["Camera"])

@router.get("/camera/status", response_model=CameraStatusResponse)
def get_camera_status():
    status = camera_manager.get_status()
    return CameraStatusResponse(
        connected=status["connected"],
        streaming=status["streaming"],
        camera_index=status["camera_index"],
        resolution=status["resolution"],
        fps=status["fps"],
        error=status["error"]
    )

@router.post("/camera/start", response_model=CameraControlResponse)
def start_camera():
    success, message = camera_manager.start()
    status = camera_manager.get_status()
    return CameraControlResponse(
        success=success,
        message=message,
        connected=status["connected"],
        streaming=status["streaming"]
    )

@router.post("/camera/stop", response_model=CameraControlResponse)
def stop_camera():
    success, message = camera_manager.stop()
    status = camera_manager.get_status()
    return CameraControlResponse(
        success=success,
        message=message,
        connected=status["connected"],
        streaming=status["streaming"]
    )

@router.get("/stream")
def get_live_stream():
    """
    Live MJPEG streaming endpoint for dashboard webcam preview.
    Uses multipart/x-mixed-replace boundary protocol.
    """
    return StreamingResponse(
        camera_manager.generate_mjpeg_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
