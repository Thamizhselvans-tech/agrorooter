import cv2
import sys
import os
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.config import settings

def test_webcam():
    print("=" * 60)
    print("AGRI ROVER AI — LOGITECH USB WEBCAM DIAGNOSTIC TEST")
    print("=" * 60)

    camera_idx = settings.CAMERA_INDEX
    print(f"Testing camera at index {camera_idx}...")
    
    # Platform-specific backend selection
    backend = cv2.CAP_ANY
    if sys.platform.startswith("win"):
        backend = cv2.CAP_DSHOW
    elif sys.platform.startswith("linux"):
        backend = cv2.CAP_V4L2

    cap = cv2.VideoCapture(camera_idx, backend)
    if not cap.isOpened():
        print(f"Fallback to cv2.CAP_ANY for index {camera_idx}...")
        cap = cv2.VideoCapture(camera_idx)

    if not cap.isOpened():
        print(f"\n[WARNING] No USB camera detected at index {camera_idx}.")
        print("Raspberry Pi Troubleshooting Checklist:")
        print("  1. Verify Logitech webcam is plugged into USB 3.0 (blue port).")
        print("  2. Run 'lsusb' to verify the device is recognized.")
        print("  3. Run 'v4l2-ctl --list-devices' to check video device node (/dev/video0).")
        print("  4. Ensure user is in 'video' group: 'sudo usermod -aG video $USER'.")
        print("  5. The Agri Rover backend will safely report 'Camera Disconnected' until attached.")
        return False

    # Configure
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, settings.CAMERA_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, settings.CAMERA_HEIGHT)

    actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    actual_fps = cap.get(cv2.CAP_PROP_FPS)

    print(f"\n[SUCCESS] Camera opened successfully!")
    print(f"  Resolution: {actual_w}x{actual_h}")
    print(f"  Reported FPS: {actual_fps}")

    # Read test frame
    time.sleep(0.5) # Warmup
    ret, frame = cap.read()
    cap.release()

    if ret and frame is not None:
        os.makedirs(settings.CAPTURES_DIR, exist_ok=True)
        out_path = os.path.join(settings.CAPTURES_DIR, "webcam_hardware_test.jpg")
        cv2.imwrite(out_path, frame)
        print(f"  Captured live test frame: {out_path} ({frame.shape[1]}x{frame.shape[0]}px)")
        print("\nLogitech USB Webcam test PASSED!")
        return True
    else:
        print("\n[ERROR] Camera opened but failed to read frame.")
        return False

if __name__ == "__main__":
    test_webcam()
