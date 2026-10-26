import os
import sys
import json
import time
import numpy as np
import cv2
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.config import settings
from backend.app.model import model_instance, format_disease_name
from backend.app.database import init_db, save_prediction, get_predictions, get_prediction_by_id

def run_acceptance_tests():
    print("=" * 65)
    print("AGRI ROVER AI — ACCEPTANCE TEST SUITE: MODEL & INFERENCE VERIFICATION")
    print("=" * 65)

    # 1. Test ZIP extraction & Model File Existence
    print("\n[Test 1] Validating model and label files...")
    assert os.path.exists(settings.MODEL_PATH), f"Model file not found at {settings.MODEL_PATH}"
    assert os.path.exists(settings.LABELS_PATH), f"Labels file not found at {settings.LABELS_PATH}"
    file_size_mb = os.path.getsize(settings.MODEL_PATH) / (1024 * 1024)
    print(f"  PASS: Model file found ({file_size_mb:.2f} MB)")
    print(f"  PASS: Labels file found at {settings.LABELS_PATH}")

    # 2. Test Class Labels Count & Output Dimension Compatibility
    print("\n[Test 2] Validating class labels & output dimension compatibility...")
    with open(settings.LABELS_PATH, "r", encoding="utf-8") as f:
        labels = json.load(f)
    print(f"  Total classes in JSON: {len(labels)}")
    assert len(labels) == 27, f"Expected 27 classes, got {len(labels)}"
    
    tomato_classes = [l for l in labels if l.lower().startswith("tomato")]
    print(f"  Total tomato classes: {len(tomato_classes)}")
    assert len(tomato_classes) == 10, f"Expected 10 tomato classes, got {len(tomato_classes)}"
    print("  PASS: Exactly 27 classes and 10 tomato classes confirmed.")

    # 3. Test Model Loading & Tensor Shapes
    print("\n[Test 3] Validating model loading & tensor shapes...")
    info = model_instance.get_info()
    assert info["loaded"] is True, f"Model failed to load: {info.get('error')}"
    print(f"  Input Shape: {info['input_shape']}, Dtype: {info['input_dtype']}")
    print(f"  Output Shape: {info['output_shape']}, Dtype: {info['output_dtype']}")
    assert info["input_shape"] == [1, 224, 224, 3], f"Unexpected input shape: {info['input_shape']}"
    assert info["output_shape"] == [1, 27], f"Unexpected output shape: {info['output_shape']}"
    print("  PASS: Input is [1, 224, 224, 3] and output is [1, 27] Float32.")

    # 4. Generate Test Leaf Image & Run Inference
    print("\n[Test 4] Generating synthetic leaf sample and executing inference...")
    test_leaf = np.zeros((300, 300, 3), dtype=np.uint8)
    test_leaf[:] = (220, 240, 220) # Soft agricultural background
    # Draw leaf blade with veins
    cv2.ellipse(test_leaf, (150, 150), (100, 60), 35, 0, 360, (34, 139, 34), -1)
    # Add simulated leaf spot lesions
    cv2.circle(test_leaf, (140, 130), 8, (20, 40, 100), -1)
    cv2.circle(test_leaf, (170, 150), 6, (15, 30, 80), -1)
    cv2.circle(test_leaf, (120, 160), 10, (10, 25, 70), -1)

    os.makedirs(settings.CAPTURES_DIR, exist_ok=True)
    test_image_path = os.path.join(settings.CAPTURES_DIR, "test_leaf_specimen.jpg")
    cv2.imwrite(test_image_path, test_leaf)
    print(f"  Created test leaf image at: {test_image_path}")

    t0 = time.time()
    result = model_instance.predict(test_leaf)
    latency_ms = (time.time() - t0) * 1000.0

    print(f"\n  Inference Latency: {latency_ms:.2f} ms")
    print(f"  Predicted Class: {result['predicted_class']}")
    print(f"  Plant: {result['plant']}")
    print(f"  Disease: {result['disease']}")
    print(f"  Confidence: {result['confidence']:.4f} ({result['percentage']}%)")
    print(f"  Is Tomato: {result['is_tomato']}")

    print("\n  Top 3 Overall Predictions:")
    for i, p in enumerate(result['top_3_predictions'], 1):
        print(f"    {i}. {p['display_name']} — {p['percentage']}% (Raw conf: {p['confidence']}, index: {p['original_index']})")

    print("\n  Top 3 Tomato-Specific Predictions:")
    for i, p in enumerate(result['top_3_tomato_predictions'], 1):
        print(f"    {i}. {p['display_name']} — {p['percentage']}% (Raw conf: {p['confidence']}, index: {p['original_index']})")

    assert len(result['top_3_predictions']) == 3, "Expected 3 overall predictions"
    assert len(result['top_3_tomato_predictions']) == 3, "Expected 3 tomato predictions"
    # Ensure probabilities are normalized
    total_prob = sum(p["confidence"] for p in result["all_predictions"])
    assert 0.99 <= total_prob <= 1.01, f"Total probability should sum to ~1.0, got {total_prob}"
    print(f"  PASS: Probability sum: {total_prob:.4f}")

    # 5. Test SQLite Persistence
    print("\n[Test 5] Validating SQLite prediction persistence...")
    init_db()
    record_id = save_prediction(
        predicted_class=result["predicted_class"],
        plant=result["plant"],
        disease=result["disease"],
        confidence=result["confidence"],
        is_tomato=result["is_tomato"],
        top_predictions=result["top_3_predictions"],
        tomato_top_predictions=result["top_3_tomato_predictions"],
        image_filename="test_leaf_specimen.jpg",
        image_url="/captures/test_leaf_specimen.jpg",
        source="test"
    )
    print(f"  Saved test prediction record with ID: {record_id}")
    
    fetched = get_prediction_by_id(record_id)
    assert fetched is not None, f"Record {record_id} not found in database"
    assert fetched["predicted_class"] == result["predicted_class"], "Record data mismatch"
    assert len(fetched["top_predictions"]) == 3, "Stored top predictions mismatch"
    print(f"  PASS: Retrieved record {record_id} successfully: {fetched['predicted_class']} ({fetched['confidence']})")

    print("\n" + "=" * 65)
    print("ALL ACCEPTANCE TESTS PASSED SUCCESSFULLY (5/5)!")
    print("=" * 65)

if __name__ == "__main__":
    run_acceptance_tests()
