import cv2
import time
import threading
import logging
import numpy as np
from typing import Optional, Tuple
from .config import settings

logger = logging.getLogger("camera")

class CameraManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(CameraManager, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.camera_index = settings.CAMERA_INDEX
        self.width = settings.CAMERA_WIDTH
        self.height = settings.CAMERA_HEIGHT
        self.fps = settings.CAMERA_FPS
        
        self.cap: Optional[cv2.VideoCapture] = None
        self.is_running = False
        self.latest_frame: Optional[np.ndarray] = None
        self.frame_lock = threading.Lock()
        self.thread: Optional[threading.Thread] = None
        self.error_message: Optional[str] = None
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 3
        self.last_frame_time = 0.0

    def start(self) -> Tuple[bool, str]:
        """Start camera capture in background thread."""
        with self._lock:
            if self.is_running and self.cap and self.cap.isOpened():
                return True, "Camera already running"

            self.error_message = None
            try:
                # Open USB camera
                # On Windows, cv2.CAP_DSHOW is often helpful; on Linux/RPi cv2.CAP_V4L2 or default
                import sys
                backend = cv2.CAP_ANY
                if sys.platform.startswith("win"):
                    backend = cv2.CAP_DSHOW
                elif sys.platform.startswith("linux"):
                    backend = cv2.CAP_V4L2

                self.cap = cv2.VideoCapture(self.camera_index, backend)
                if not self.cap or not self.cap.isOpened():
                    # Fallback to cv2.CAP_ANY
                    self.cap = cv2.VideoCapture(self.camera_index)

                if not self.cap.isOpened():
                    self.error_message = f"Failed to open USB webcam at index {self.camera_index}"
                    logger.warning(self.error_message)
                    self.is_running = False
                    return False, self.error_message

                # Configure resolution and FPS
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
                self.cap.set(cv2.CAP_PROP_FPS, self.fps)

                self.is_running = True
                self.thread = threading.Thread(target=self._capture_loop, daemon=True)
                self.thread.start()
                logger.info(f"Logitech USB webcam started at index {self.camera_index} ({self.width}x{self.height}@{self.fps}fps)")
                return True, "Camera started successfully"

            except Exception as e:
                self.error_message = f"Camera initialization error: {str(e)}"
                logger.error(self.error_message)
                self.is_running = False
                return False, self.error_message

    def stop(self) -> Tuple[bool, str]:
        """Safely release camera hardware resource and stop background capture."""
        with self._lock:
            self.is_running = False
            if self.thread and self.thread.is_alive():
                # Let capture thread exit
                self.thread.join(timeout=1.5)
            self.thread = None

            if self.cap:
                try:
                    self.cap.release()
                except Exception as e:
                    logger.error(f"Error releasing camera: {e}")
                self.cap = None

            with self.frame_lock:
                self.latest_frame = None

            logger.info("Camera stopped and hardware resource released")
            return True, "Camera stopped successfully"

    def _capture_loop(self):
        """Continuously capture frames from camera into memory buffer."""
        consecutive_failures = 0
        while self.is_running:
            if not self.cap or not self.cap.isOpened():
                time.sleep(0.1)
                continue

            ret, frame = self.cap.read()
            if ret and frame is not None:
                consecutive_failures = 0
                with self.frame_lock:
                    self.latest_frame = frame
                    self.last_frame_time = time.time()
                time.sleep(max(0.001, 1.0 / self.fps))
            else:
                consecutive_failures += 1
                if consecutive_failures > 15:
                    logger.warning("Repeated frame read failures. Attempting reconnect...")
                    self._attempt_reconnect()
                    consecutive_failures = 0
                time.sleep(0.05)

    def _attempt_reconnect(self):
        """Attempt to reconnect to camera after disconnection."""
        if not self.is_running:
            return
        logger.info("Reconnecting camera...")
        try:
            if self.cap:
                self.cap.release()
            time.sleep(0.5)
            self.cap = cv2.VideoCapture(self.camera_index)
            if self.cap.isOpened():
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
                logger.info("Camera reconnected successfully")
                self.error_message = None
            else:
                self.error_message = "Camera disconnected. Retrying on next cycle..."
        except Exception as e:
            self.error_message = f"Reconnect failed: {str(e)}"

    def get_latest_frame(self) -> Optional[np.ndarray]:
        """Return a copy of the latest captured frame."""
        with self.frame_lock:
            if self.latest_frame is not None:
                return self.latest_frame.copy()
            return None

    def get_status(self) -> dict:
        """Return current camera hardware and streaming status."""
        connected = bool(self.cap and self.cap.isOpened() and self.is_running)
        return {
            "connected": connected,
            "streaming": self.is_running,
            "camera_index": self.camera_index,
            "resolution": f"{self.width}x{self.height}",
            "fps": self.fps,
            "error": self.error_message,
            "last_frame_timestamp": self.last_frame_time if self.last_frame_time > 0 else None
        }

    def generate_mjpeg_stream(self):
        """Generator yielding MJPEG frame stream."""
        while True:
            if not self.is_running:
                # Yield placeholder frame indicating camera stopped
                placeholder = self._create_status_frame("Camera Stopped", "Click 'Start Camera' to begin stream")
                ret, jpeg = cv2.imencode('.jpg', placeholder, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
                if ret:
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
                time.sleep(0.5)
                continue

            frame = self.get_latest_frame()
            if frame is None:
                placeholder = self._create_status_frame("Camera Disconnected", self.error_message or "Waiting for webcam feed...")
                ret, jpeg = cv2.imencode('.jpg', placeholder, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
                if ret:
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
                time.sleep(0.3)
                continue

            # Encode actual frame
            ret, jpeg = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            if ret:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
            time.sleep(max(0.01, 1.0 / self.fps))

    def _create_status_frame(self, title: str, subtitle: str) -> np.ndarray:
        """Create a placeholder status image for stream when webcam is stopped or disconnected."""
        img = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        # Background dark slate
        img[:] = (26, 36, 33) # Dark agricultural forest tone BGR
        
        # Center text
        cv2.putText(img, "Agri Rover AI", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (46, 204, 113), 2)
        cv2.putText(img, title, (int(self.width * 0.15), int(self.height * 0.45)), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.putText(img, subtitle, (int(self.width * 0.08), int(self.height * 0.58)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (160, 180, 170), 1)
        
        # Draw target reticle in center
        cx, cy = self.width // 2, self.height // 2
        cv2.circle(img, (cx, cy), 50, (46, 204, 113), 1)
        cv2.line(img, (cx - 65, cy), (cx - 35, cy), (46, 204, 113), 1)
        cv2.line(img, (cx + 35, cy), (cx + 65, cy), (46, 204, 113), 1)
        cv2.line(img, (cx, cy - 65), (cx, cy - 35), (46, 204, 113), 1)
        cv2.line(img, (cx, cy + 35), (cx, cy + 65), (46, 204, 113), 1)
        
        return img

camera_manager = CameraManager()
