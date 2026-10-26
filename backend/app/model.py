import os
import cv2
import json
import logging
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image
from .config import settings

logger = logging.getLogger("model")

# Multi-provider TFLite Interpreter import fallback
Interpreter = None
INTERPRETER_BACKEND = None

try:
    from ai_edge_litert.interpreter import Interpreter as LiteRtInterpreter
    Interpreter = LiteRtInterpreter
    INTERPRETER_BACKEND = "ai_edge_litert"
    logger.info("Using ai_edge_litert interpreter")
except ImportError:
    try:
        from tflite_runtime.interpreter import Interpreter as TFLiteInterpreter
        Interpreter = TFLiteInterpreter
        INTERPRETER_BACKEND = "tflite_runtime"
        logger.info("Using tflite_runtime interpreter")
    except ImportError:
        try:
            import tensorflow as tf
            Interpreter = tf.lite.Interpreter
            INTERPRETER_BACKEND = "tensorflow.lite"
            logger.info("Using tensorflow.lite interpreter")
        except ImportError:
            logger.warning("No TFLite interpreter installed yet (ai_edge_litert / tflite_runtime / tensorflow). Inference will be unavailable until runtime is installed.")


def format_disease_name(raw_name: str) -> Tuple[str, str, str]:
    """
    Format raw label like 'tomato - Early_blight' into:
    plant ('Tomato'), disease ('Early Blight'), display_name ('Tomato Early Blight')
    """
    if " - " in raw_name:
        plant_raw, disease_raw = raw_name.split(" - ", 1)
    elif "_" in raw_name:
        parts = raw_name.split("_", 1)
        plant_raw, disease_raw = parts[0], parts[1]
    else:
        plant_raw, disease_raw = raw_name, "Unknown"

    plant = plant_raw.strip().capitalize()
    
    # Format disease name: replace underscores with spaces, format title
    cleaned_disease = disease_raw.replace("_", " ").strip()
    # Handle known phrases
    if cleaned_disease.lower() == "healthy":
        disease = "Healthy"
    elif "spider" in cleaned_disease.lower() and "mite" in cleaned_disease.lower():
        disease = "Spider Mites / Two-Spotted Spider Mite"
    elif "curl" in cleaned_disease.lower() and "virus" in cleaned_disease.lower():
        disease = "Tomato Yellow Leaf Curl Virus"
    elif "mosaic" in cleaned_disease.lower() and "virus" in cleaned_disease.lower():
        disease = "Tomato Mosaic Virus"
    else:
        # Title case words
        disease = " ".join([w.capitalize() for w in cleaned_disease.split()])

    display_name = f"{plant} {disease}" if not disease.lower().startswith(plant.lower()) else disease
    return plant, disease, display_name


class PlantDiseaseModel:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PlantDiseaseModel, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.model_path = settings.MODEL_PATH
        self.labels_path = settings.LABELS_PATH
        
        self.interpreter = None
        self.input_details = None
        self.output_details = None
        self.labels: List[str] = []
        self.tomato_indices: List[int] = []
        self.is_loaded = False
        self.load_error: Optional[str] = None
        
        self._load_labels()
        self._load_model()

    def _load_labels(self):
        """Load class labels from JSON without altering the original array order."""
        try:
            if not os.path.exists(self.labels_path):
                self.load_error = f"Labels file not found: {self.labels_path}"
                logger.error(self.load_error)
                return

            with open(self.labels_path, "r", encoding="utf-8") as f:
                self.labels = json.load(f)

            # Identify tomato class indices exactly as ordered in the label file
            self.tomato_indices = [
                idx for idx, label in enumerate(self.labels)
                if label.strip().lower().startswith("tomato")
            ]
            logger.info(f"Loaded {len(self.labels)} class labels ({len(self.tomato_indices)} tomato classes)")

        except Exception as e:
            self.load_error = f"Failed to load labels: {str(e)}"
            logger.error(self.load_error)

    def _load_model(self):
        """Load TFLite model and allocate input/output tensor buffers."""
        global Interpreter
        if Interpreter is None:
            # Recheck if runtime became available
            try:
                from ai_edge_litert.interpreter import Interpreter as LiteRtInterpreter
                Interpreter = LiteRtInterpreter
            except ImportError:
                try:
                    from tflite_runtime.interpreter import Interpreter as TFLiteInterpreter
                    Interpreter = TFLiteInterpreter
                except ImportError:
                    pass

        if Interpreter is None:
            self.load_error = "TensorFlow Lite interpreter is not installed on this machine."
            logger.warning(self.load_error)
            return

        if not os.path.exists(self.model_path):
            self.load_error = f"Model file not found: {self.model_path}"
            logger.error(self.load_error)
            return

        try:
            self.interpreter = Interpreter(model_path=self.model_path)
            self.interpreter.allocate_tensors()
            self.input_details = self.interpreter.get_input_details()
            self.output_details = self.interpreter.get_output_details()
            self.is_loaded = True
            self.load_error = None
            logger.info(f"TFLite model loaded successfully! Input: {self.input_details[0]['shape']}, Output: {self.output_details[0]['shape']}")

        except Exception as e:
            self.load_error = f"Failed to load TFLite model: {str(e)}"
            self.is_loaded = False
            logger.error(self.load_error)

    def get_info(self) -> Dict[str, Any]:
        """Return model metadata, input/output tensor properties, and label list."""
        if not self.is_loaded or not self.input_details or not self.output_details:
            return {
                "loaded": False,
                "model_name": "Plant Disease MobileNetV2",
                "architecture": "MobileNetV2 (TFLite)",
                "total_classes": len(self.labels),
                "tomato_classes_count": len(self.tomato_indices),
                "input_shape": [1, 224, 224, 3],
                "input_dtype": "FLOAT32",
                "output_shape": [1, 27],
                "output_dtype": "FLOAT32",
                "classes": self.labels,
                "tomato_classes": [self.labels[i] for i in self.tomato_indices],
                "quantization": "Float32",
                "error": self.load_error
            }

        inp = self.input_details[0]
        out = self.output_details[0]
        
        return {
            "loaded": True,
            "model_name": "Plant Disease MobileNetV2",
            "architecture": "MobileNetV2 (TFLite)",
            "total_classes": len(self.labels),
            "tomato_classes_count": len(self.tomato_indices),
            "input_shape": [int(x) for x in inp["shape"]],
            "input_dtype": str(np.dtype(inp["dtype"])),
            "output_shape": [int(x) for x in out["shape"]],
            "output_dtype": str(np.dtype(out["dtype"])),
            "classes": self.labels,
            "tomato_classes": [self.labels[i] for i in self.tomato_indices],
            "quantization": "Float32" if "float" in str(inp["dtype"]).lower() else "Quantized",
            "error": None
        }

    def preprocess_image(self, image_np_or_pil) -> np.ndarray:
        """
        Preprocess input image to match model input specifications:
        - Convert to RGB
        - Resize to expected input tensor dimensions (224x224)
        - MobileNetV2 normalization: (image / 127.5) - 1.0 (range [-1, 1])
        - Return array with shape [1, 224, 224, 3] and dtype float32
        """
        if isinstance(image_np_or_pil, np.ndarray):
            # Convert BGR (from OpenCV) to RGB
            if len(image_np_or_pil.shape) == 3 and image_np_or_pil.shape[2] == 3:
                rgb = cv2.cvtColor(image_np_or_pil, cv2.COLOR_BGR2RGB)
            else:
                rgb = image_np_or_pil
            pil_img = Image.fromarray(rgb)
        else:
            pil_img = image_np_or_pil.convert("RGB")

        # Get target input size (default 224x224)
        target_size = (224, 224)
        if self.input_details:
            shape = self.input_details[0]["shape"]
            target_size = (int(shape[2]), int(shape[1]))

        # Resize with high-quality resampling
        resized = pil_img.resize(target_size, Image.Resampling.BILINEAR)
        img_array = np.array(resized, dtype=np.float32)

        # Normalization for MobileNetV2: [-1, 1]
        normalized = (img_array / 127.5) - 1.0

        # Expand batch dimension [1, H, W, C]
        batched = np.expand_dims(normalized, axis=0)
        return batched

    def predict(self, image_input) -> Dict[str, Any]:
        """
        Run inference on the provided image and compute:
        - Overall highest prediction
        - Tomato-specific ranking (displaying tomato classes only)
        - Top 3 overall predictions
        - Top 3 tomato predictions
        """
        if not self.is_loaded or self.interpreter is None:
            self._load_model()
            if not self.is_loaded:
                raise RuntimeError(self.load_error or "AI model unavailable")

        # 1. Preprocess
        input_tensor = self.preprocess_image(image_input)
        
        # 2. Invoke interpreter
        self.interpreter.set_tensor(self.input_details[0]["index"], input_tensor)
        self.interpreter.invoke()
        
        # 3. Retrieve raw model output logits / probabilities
        raw_output = self.interpreter.get_tensor(self.output_details[0]["index"])
        probabilities = raw_output[0].copy()

        # If model output wasn't passed through softmax (e.g. raw logits sum != 1), compute softmax
        prob_sum = float(np.sum(probabilities))
        if prob_sum < 0.95 or prob_sum > 1.05 or np.any(probabilities < 0):
            # Compute numerically stable softmax
            exp_p = np.exp(probabilities - np.max(probabilities))
            probabilities = exp_p / np.sum(exp_p)

        # 4. Overall top prediction
        top_idx = int(np.argmax(probabilities))
        top_confidence = float(probabilities[top_idx])
        top_label = self.labels[top_idx] if top_idx < len(self.labels) else f"Class_{top_idx}"
        top_plant, top_disease, top_display = format_disease_name(top_label)
        is_tomato = top_label.strip().lower().startswith("tomato")

        # Build list of all structured predictions
        all_preds = []
        for i, prob in enumerate(probabilities):
            lbl = self.labels[i] if i < len(self.labels) else f"Class_{i}"
            plant, disease, display = format_disease_name(lbl)
            all_preds.append({
                "class_name": lbl,
                "display_name": display,
                "plant": plant,
                "disease": disease,
                "confidence": round(float(prob), 4),
                "percentage": round(float(prob) * 100.0, 2),
                "original_index": i,
                "is_tomato": i in self.tomato_indices
            })

        # Sort all predictions by confidence descending
        sorted_all = sorted(all_preds, key=lambda x: x["confidence"], reverse=True)
        top_3_overall = sorted_all[:3]

        # 5. Tomato-specific ranking (filtering strictly to tomato classes)
        tomato_preds = [p for p in all_preds if p["is_tomato"]]
        sorted_tomato = sorted(tomato_preds, key=lambda x: x["confidence"], reverse=True)
        top_3_tomato = sorted_tomato[:3]

        # Tomato top prediction
        top_tomato = sorted_tomato[0] if sorted_tomato else None

        return {
            "predicted_class": top_label,
            "display_name": top_display,
            "plant": top_plant,
            "disease": top_disease,
            "confidence": round(top_confidence, 4),
            "percentage": round(top_confidence * 100.0, 2),
            "is_tomato": is_tomato,
            "top_3_predictions": top_3_overall,
            "top_3_tomato_predictions": top_3_tomato,
            "tomato_specific_prediction": top_tomato,
            "all_predictions": all_preds
        }

model_instance = PlantDiseaseModel()
