import os
# Ensure Keras uses PyTorch backend
os.environ["KERAS_BACKEND"] = "torch"

import cv2
import json
import logging
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image
from .config import settings

logger = logging.getLogger("model")

# Multi-provider backend loaders
keras_module = None
torch_module = None
Interpreter = None

try:
    import keras
    keras_module = keras
    logger.info(f"Keras {keras.__version__} (backend={keras.backend.backend()}) available")
except Exception as e:
    logger.warning(f"Keras import unavailable: {e}")

try:
    import torch
    torch_module = torch
    logger.info(f"PyTorch {torch.__version__} available")
except Exception as e:
    logger.warning(f"PyTorch import unavailable: {e}")

try:
    from ai_edge_litert.interpreter import Interpreter as LiteRtInterpreter
    Interpreter = LiteRtInterpreter
except ImportError:
    try:
        from tflite_runtime.interpreter import Interpreter as TFLiteInterpreter
        Interpreter = TFLiteInterpreter
    except ImportError:
        try:
            import tensorflow as tf
            Interpreter = tf.lite.Interpreter
        except ImportError:
            pass


def format_disease_name(raw_name: str) -> Tuple[str, str, str]:
    """
    Format raw label like 'Tomato___Early_blight' or 'tomato - Early_blight' into:
    plant ('Tomato'), disease ('Early Blight'), display_name ('Tomato Early Blight')
    """
    if "___" in raw_name:
        plant_raw, disease_raw = raw_name.split("___", 1)
    elif " - " in raw_name:
        plant_raw, disease_raw = raw_name.split(" - ", 1)
    elif "_" in raw_name:
        parts = raw_name.split("_", 1)
        plant_raw, disease_raw = parts[0], parts[1]
    else:
        plant_raw, disease_raw = raw_name, "Unknown"

    plant = plant_raw.strip().capitalize()
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

    # Clean display name formatting
    if disease.lower().startswith(plant.lower() + " "):
        display_name = disease
    elif disease.lower() == "healthy":
        display_name = f"{plant} Healthy"
    else:
        display_name = f"{plant} {disease}"

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
        
        self.backend_type: Optional[str] = None  # "keras", "torchscript", "tflite"
        self.model = None
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
            # Check configured labels_path, then fallbacks
            path = self.labels_path
            if not os.path.exists(path):
                base = os.path.dirname(self.labels_path)
                alt1 = os.path.join(base, "mobilenetv2_class_names.json")
                alt2 = os.path.join(base, "class_names.json")
                if os.path.exists(alt1):
                    path = alt1
                elif os.path.exists(alt2):
                    path = alt2
                else:
                    self.load_error = f"Labels file not found: {self.labels_path}"
                    logger.error(self.load_error)
                    return

            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict) and "class_names" in data:
                    self.labels = data["class_names"]
                elif isinstance(data, list):
                    self.labels = data
                else:
                    self.labels = []

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
        """Load AI model (.keras, .pt, or .tflite)."""
        # Resolve model path
        path = self.model_path
        if not os.path.exists(path):
            base = os.path.dirname(self.model_path)
            alt_keras = os.path.join(base, "mobilenetv2_finetuned_best.keras")
            alt_pt = os.path.join(base, "mobilenetv2_finetuned.pt")
            alt_tflite = os.path.join(base, "plant_disease_model.tflite")
            if os.path.exists(alt_keras):
                path = alt_keras
            elif os.path.exists(alt_pt):
                path = alt_pt
            elif os.path.exists(alt_tflite):
                path = alt_tflite
            else:
                self.load_error = f"Model file not found: {self.model_path}"
                logger.error(self.load_error)
                return

        self.model_path = path

        # Case 1: Keras 3 model (.keras)
        if path.endswith(".keras"):
            if keras_module is None:
                self.load_error = "Keras 3 is not installed or backend unavailable."
                logger.error(self.load_error)
                return
            try:
                logger.info(f"Loading fine-tuned Keras model from {path}...")
                self.model = keras_module.models.load_model(path, compile=False)
                self.backend_type = "keras"
                self.is_loaded = True
                self.load_error = None
                logger.info(f"Keras MobileNetV2 loaded successfully! Input: {self.model.input_shape}, Output: {self.model.output_shape}")
                return
            except Exception as e:
                logger.warning(f"Failed to load .keras directly: {e}. Trying TorchScript fallback...")

        # Case 2: TorchScript model (.pt)
        if path.endswith(".pt") or (torch_module is not None and os.path.exists(path.replace(".keras", ".pt"))):
            pt_path = path if path.endswith(".pt") else path.replace(".keras", ".pt")
            if torch_module and os.path.exists(pt_path):
                try:
                    logger.info(f"Loading TorchScript model from {pt_path}...")
                    self.model = torch_module.jit.load(pt_path)
                    self.model.eval()
                    self.backend_type = "torchscript"
                    self.is_loaded = True
                    self.load_error = None
                    logger.info("TorchScript model loaded successfully!")
                    return
                except Exception as e:
                    logger.warning(f"Failed to load TorchScript model: {e}")

        # Case 3: TFLite model (.tflite)
        if path.endswith(".tflite") and Interpreter is not None:
            try:
                self.interpreter = Interpreter(model_path=path)
                self.interpreter.allocate_tensors()
                self.input_details = self.interpreter.get_input_details()
                self.output_details = self.interpreter.get_output_details()
                self.backend_type = "tflite"
                self.is_loaded = True
                self.load_error = None
                logger.info(f"TFLite model loaded successfully! Input: {self.input_details[0]['shape']}")
                return
            except Exception as e:
                self.load_error = f"Failed to load TFLite model: {e}"
                logger.error(self.load_error)
                return

        self.load_error = f"No compatible inference engine available for model at {path}"
        logger.error(self.load_error)

    def get_info(self) -> Dict[str, Any]:
        """Return model metadata, input/output tensor properties, and label list."""
        out_count = len(self.labels) or 29
        return {
            "loaded": self.is_loaded,
            "model_name": "Fine-Tuned MobileNetV2 Plant Disease Classifier",
            "architecture": f"MobileNetV2 ({self.backend_type or 'Keras/PyTorch'})",
            "total_classes": len(self.labels),
            "tomato_classes_count": len(self.tomato_indices),
            "input_shape": [1, 224, 224, 3],
            "input_dtype": "float32",
            "output_shape": [1, out_count],
            "output_dtype": "float32",
            "classes": self.labels,
            "tomato_classes": [self.labels[i] for i in self.tomato_indices],
            "quantization": "Float32 (Fine-Tuned 96.5% Test Accuracy)",
            "error": self.load_error
        }

    def preprocess_image(self, image_np_or_pil) -> np.ndarray:
        """
        Preprocess input image to match model input specifications:
        - Convert to RGB
        - Resize to 224x224
        - MobileNetV2 normalization: (img / 127.5) - 1.0 (range [-1, 1])
        - Return array with shape [1, 224, 224, 3] and dtype float32
        """
        if isinstance(image_np_or_pil, np.ndarray):
            if len(image_np_or_pil.shape) == 3 and image_np_or_pil.shape[2] == 3:
                rgb = cv2.cvtColor(image_np_or_pil, cv2.COLOR_BGR2RGB)
            else:
                rgb = image_np_or_pil
            pil_img = Image.fromarray(rgb)
        else:
            pil_img = image_np_or_pil.convert("RGB")

        # Resize to 224x224
        resized = pil_img.resize((224, 224), Image.Resampling.BILINEAR)
        img_array = np.array(resized, dtype=np.float32)

        # Normalization for MobileNetV2: [-1, 1]
        normalized = (img_array / 127.5) - 1.0

        # Expand batch dimension [1, 224, 224, 3]
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
        if not self.is_loaded or (self.model is None and self.interpreter is None):
            self._load_model()
            if not self.is_loaded:
                raise RuntimeError(self.load_error or "AI model unavailable")

        # 1. Preprocess image
        input_tensor = self.preprocess_image(image_input)

        # 2. Run inference based on backend
        if self.backend_type == "keras":
            out = self.model(input_tensor, training=False)
            probabilities = out.detach().cpu().numpy()[0] if hasattr(out, "detach") else np.array(out)[0]
        elif self.backend_type == "torchscript":
            with torch_module.no_grad():
                tensor_torch = torch_module.from_numpy(input_tensor)
                out = self.model(tensor_torch)
                probabilities = out.detach().cpu().numpy()[0]
        elif self.backend_type == "tflite":
            self.interpreter.set_tensor(self.input_details[0]["index"], input_tensor)
            self.interpreter.invoke()
            raw_output = self.interpreter.get_tensor(self.output_details[0]["index"])
            probabilities = raw_output[0].copy()
        else:
            raise RuntimeError(f"Unknown backend type: {self.backend_type}")

        # 3. Softmax check (ensure calibrated probabilities)
        prob_sum = float(np.sum(probabilities))
        if prob_sum < 0.95 or prob_sum > 1.05 or np.any(probabilities < 0):
            exp_p = np.exp(probabilities - np.max(probabilities))
            probabilities = exp_p / np.sum(exp_p)

        # 4. Overall top prediction
        top_idx = int(np.argmax(probabilities))
        top_confidence = float(probabilities[top_idx])
        top_label = self.labels[top_idx] if top_idx < len(self.labels) else f"Class_{top_idx}"
        top_plant, top_disease, top_display = format_disease_name(top_label)
        is_tomato = top_idx in self.tomato_indices or top_label.strip().lower().startswith("tomato")

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
