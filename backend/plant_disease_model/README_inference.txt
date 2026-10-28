PLANT DISEASE DETECTION — MODEL BUNDLE

Files:
- mobilenetv2_finetuned_best.keras: fine-tuned TensorFlow/Keras model
- mobilenetv2_class_names.json: class names in model output order
- inference_config.json: image size and preprocessing settings
- mobilenetv2_finetuned_test_results.json: final held-out test results

Model:
- Architecture: MobileNetV2
- Input: RGB image, 224 x 224
- Preprocessing: mobilenet_v2.preprocess_input
- Expected preprocessed values: approximately [-1, 1]
- Output classes: 29

Basic inference:
    import json
    import numpy as np
    import tensorflow as tf

    model = tf.keras.models.load_model(
        "mobilenetv2_finetuned_best.keras",
        compile=False
    )
    classes = json.load(
        open("mobilenetv2_class_names.json", encoding="utf-8")
    )["class_names"]

    # image_rgb must be an RGB image array with shape H x W x 3.
    image = tf.convert_to_tensor(image_rgb)
    image = tf.image.resize(image, [224, 224])
    image = tf.cast(image, tf.float32)
    image = tf.keras.applications.mobilenet_v2.preprocess_input(image)
    image = tf.expand_dims(image, axis=0)

    scores = model(image, training=False).numpy()[0]
    index = int(np.argmax(scores))
    predicted_class = classes[index]
    score = float(scores[index])

Note: The score is not guaranteed to be a calibrated confidence.
The model only predicts among its 29 trained classes. Test it on
real camera images before relying on predictions in production.
