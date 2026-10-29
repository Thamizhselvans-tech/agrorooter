import os
import cv2
import time
import asyncio
import numpy as np
import base64
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, status
from starlette.concurrency import run_in_threadpool
from PIL import Image
import io

from ..schemas import PredictResponse, ClassPrediction, PredictionRecord
from ..camera import camera_manager
from ..model import model_instance
from ..database import save_prediction, get_predictions, get_prediction_by_id
from ..config import settings

router = APIRouter(prefix="/api", tags=["Prediction"])

# Concurrency lock to prevent overlapping inference calls
inference_lock = asyncio.Lock()

def prune_old_captures():
    """Maintain safe storage limits on Raspberry Pi disk by pruning oldest captures."""
    try:
        files = [
            os.path.join(settings.CAPTURES_DIR, f)
            for f in os.listdir(settings.CAPTURES_DIR)
            if f.lower().endswith(('.jpg', '.jpeg', '.png'))
        ]
        if len(files) > settings.MAX_CAPTURES_STORED:
            # Sort by modification time ascending (oldest first)
            files.sort(key=os.path.getmtime)
            to_remove = files[:len(files) - settings.MAX_CAPTURES_STORED]
            for f in to_remove:
                try:
                    os.remove(f)
                except OSError:
                    pass
    except Exception as e:
        pass

@router.get("/predict")
@router.get("/predict/")
async def predict_info():
    """Information endpoint for predict route (avoids 405 on GET)."""
    return {
        "status": "active",
        "method": "POST",
        "usage": "Send a POST request with multipart/form-data 'file' for image upload, or empty POST for live camera capture."
    }

@router.post("/predict", response_model=PredictResponse)
@router.post("/predict/", response_model=PredictResponse)
async def predict_plant_disease(
    file: Optional[UploadFile] = File(None)
):
    """
    Run plant disease classification on either:
    1. Uploaded image file (multipart/form-data), or
    2. Latest frame from Logitech USB webcam.
    Thread-safe, non-blocking, and prevents overlapping requests.
    """
    if inference_lock.locked():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Inference currently in progress. Overlapping inference requests are prevented."
        )

    async with inference_lock:
        start_time = time.time()
        source = "camera"
        img_np = None

        if file is not None:
            # Process uploaded file
            source = "upload"
            try:
                contents = await file.read()
                pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
                img_np = np.array(pil_img)
                # Convert RGB to BGR for OpenCV saving
                img_to_save = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid image file uploaded: {str(e)}"
                )
        else:
            # Capture latest frame from webcam
            img_np = camera_manager.get_latest_frame()
            if img_np is None:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Camera disconnected or stopped. Start the camera or upload an image to run prediction."
                )
            img_to_save = img_np

        # Run inference in worker thread pool so FastAPI event loop is never blocked
        try:
            prediction_result = await run_in_threadpool(model_instance.predict, img_np)
        except RuntimeError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI model inference error: {str(e)}"
            )

        inference_time_ms = round((time.time() - start_time) * 1000.0, 2)
        timestamp_str = datetime.utcnow().isoformat() + "Z"

        # Generate lightweight base64 thumbnail for cloud sync & offline resilience
        thumbnail_base64 = None
        try:
            thumb_img = cv2.resize(img_to_save, (160, 160), interpolation=cv2.INTER_AREA)
            _, thumb_buf = cv2.imencode('.jpg', thumb_img, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
            thumbnail_base64 = f"data:image/jpeg;base64,{base64.b64encode(thumb_buf).decode('utf-8')}"
        except Exception:
            thumbnail_base64 = None

        # Save captured frame to storage
        ts_filename = datetime.utcnow().strftime("capture_%Y%m%d_%H%M%S_%f.jpg")
        save_path = os.path.join(settings.CAPTURES_DIR, ts_filename)
        try:
            cv2.imwrite(save_path, img_to_save, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
            prune_old_captures()
            image_url = f"/captures/{ts_filename}"
        except Exception:
            ts_filename = None
            image_url = None

        # Persist prediction in SQLite
        top_preds = prediction_result["top_3_predictions"]
        top_tomato_preds = prediction_result["top_3_tomato_predictions"]
        top_tomato = prediction_result["tomato_specific_prediction"]
        tomato_conf = top_tomato["confidence"] if top_tomato else None

        save_prediction(
            predicted_class=prediction_result["predicted_class"],
            plant=prediction_result["plant"],
            disease=prediction_result["disease"],
            confidence=prediction_result["confidence"],
            is_tomato=prediction_result["is_tomato"],
            top_predictions=top_preds,
            tomato_top_predictions=top_tomato_preds,
            tomato_confidence=tomato_conf,
            image_filename=ts_filename,
            image_url=image_url,
            thumbnail_base64=thumbnail_base64,
            source=source,
            timestamp=timestamp_str
        )

        return PredictResponse(
            success=True,
            predicted_class=prediction_result["predicted_class"],
            display_name=prediction_result["display_name"],
            plant=prediction_result["plant"],
            disease=prediction_result["disease"],
            confidence=prediction_result["confidence"],
            percentage=prediction_result["percentage"],
            is_tomato=prediction_result["is_tomato"],
            tomato_specific_prediction=ClassPrediction(**top_tomato) if top_tomato else None,
            top_3_predictions=[ClassPrediction(**p) for p in top_preds],
            top_3_tomato_predictions=[ClassPrediction(**p) for p in top_tomato_preds],
            image_filename=ts_filename,
            image_url=image_url,
            thumbnail_base64=thumbnail_base64,
            timestamp=timestamp_str,
            inference_time_ms=inference_time_ms
        )

@router.get("/predictions", response_model=List[PredictionRecord])
def list_predictions(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    plant: Optional[str] = Query(None)
):
    """Retrieve prediction history from SQLite with optional pagination and filtering."""
    rows = get_predictions(limit=limit, offset=offset, plant_filter=plant)
    return [PredictionRecord(**r) for r in rows]

@router.get("/predictions/{prediction_id}", response_model=PredictionRecord)
def get_prediction_record(prediction_id: int):
    """Retrieve single prediction record by ID."""
    record = get_prediction_by_id(prediction_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prediction with ID {prediction_id} not found"
        )
    return PredictionRecord(**record)
