# Agri Rover AI: Tomato Disease Classification & Raspberry Pi 4 Integration

Automated edge AI rover dashboard for real-time plant disease detection, integrating an existing MobileNetV2 TensorFlow Lite model with a Logitech USB webcam connected to a Raspberry Pi 4 Model B.

---

## 1. System Architecture

```
+---------------------------------------------------------------------------------+
|                               RASPBERRY PI 4 MODEL B                            |
|                                                                                 |
|  +--------------------+                                                         |
|  | Logitech USB Cam   |                                                         |
|  | (/dev/video0)      |                                                         |
|  +---------+----------+                                                         |
|            |                                                                    |
|            v                                                                    |
|  +---------+----------+       +-------------------+      +-------------------+  |
|  | OpenCV Camera Mgr  | ----> | /api/stream       | ---> | Dashboard Preview |  |
|  | (Singleton Thread) |       | (MJPEG Stream)    |      +-------------------+  |
|  +---------+----------+       +-------------------+                             |
|            |                                                                    |
|            v (Frame under Lock)                                                 |
|  +---------+----------+       +-------------------+      +-------------------+  |
|  | MobileNetV2 TFLite | ----> | /api/predict      | ---> | Live Diagnosis &  |  |
|  | (224x224x3 Input)  |       | (FastAPI Worker)  |      | Top 3 Predictions |  |
|  +--------------------+       +---------+---------+      +-------------------+  |
|                                         |                                       |
|                                         v                                       |
|                               +---------+---------+                             |
|                               | SQLite & Captures |                             |
|                               | (predictions.db)  |                             |
|                               +-------------------+                             |
+---------------------------------------------------------------------------------+
```

---

## 2. Directory Structure

```
agrorooter/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py             # Environment configuration & paths
│   │   ├── database.py           # SQLite connection and prediction models
│   │   ├── camera.py             # Thread-safe OpenCV Logitech webcam manager + MJPEG
│   │   ├── model.py              # TFLite model loader, preprocessing & tomato ranking
│   │   ├── schemas.py            # Pydantic request/response schemas
│   │   ├── main.py               # FastAPI application with CORS and lifespan
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── health.py         # GET /api/health
│   │       ├── model.py          # GET /api/model/info
│   │       ├── camera.py         # /api/camera/status, /start, /stop, /api/stream
│   │       └── predict.py        # /api/predict, /api/predictions, /api/predictions/{id}
│   ├── captures/                 # Stored leaf images selected for prediction
│   ├── plant_disease_model/      # Extracted model and class labels
│   │   ├── plant_disease_model.tflite
│   │   └── class_names.json
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Sample environment variables
│   └── .env                      # Active environment configuration
├── frontend/                     # React + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── api/client.ts         # Type-safe API client
│   │   ├── components/
│   │   │   ├── Sidebar.tsx       # Navigation & Raspberry Pi hardware status
│   │   │   ├── Header.tsx        # Title, counters & health indicators
│   │   │   ├── CameraFeed.tsx    # Live MJPEG stream, 5s countdown & controls
│   │   │   ├── LatestPrediction.tsx # Diagnosis card, leaf photo & disclaimer
│   │   │   ├── TopPredictions.tsx  # Confidence progress bars (Overall & Tomato)
│   │   │   ├── RecentImages.tsx    # Gallery of recent captures
│   │   │   ├── PredictionHistory.tsx # Filterable SQLite records table
│   │   │   ├── ModelInfoModal.tsx  # Full 27-class mapping & specs
│   │   │   └── SettingsModal.tsx   # Rover interval & hardware configuration
│   │   ├── types/index.ts        # TypeScript data models
│   │   ├── App.tsx               # Root component & state management
│   │   ├── main.tsx              # React DOM entrypoint
│   │   └── index.css             # Tailwind CSS & animations
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── scripts/
│   ├── test_model.py             # Acceptance test suite (validates model & DB)
│   ├── test_camera.py            # Webcam hardware diagnostic script
│   ├── setup_raspberry_pi.sh     # Automated Raspberry Pi OS installer script
│   └── agri-rover.service        # Systemd service unit for auto-boot
└── README.md
```

---

## 3. TFLite Model Specifications & Preprocessing

- **Backbone**: MobileNetV2
- **Input Tensor**: `[1, 224, 224, 3]`, Float32
- **Output Tensor**: `[1, 27]`, Float32 (Softmax probabilities sum to 1.0)
- **Input Preprocessing**:
  1. Conversion from OpenCV BGR to RGB
  2. High-quality bilinear resize to $224 \times 224$
  3. MobileNetV2 normalization: `(image.astype(float32) / 127.5) - 1.0` (range $[-1.0, 1.0]$)
  4. Batch dimension expansion: `[1, 224, 224, 3]`
- **Class Labels Mapping (27 Classes Total)**:
  - **Grape (4 classes)**: `grape - Black_rot` (0), `grape - Esca_(Black_Measles)` (1), `grape - Leaf_blight_(Isariopsis_Leaf_Spot)` (2), `grape - healthy` (3)
  - **Mango (8 classes)**: `mango - Anthracnose` (4), `mango - Bacterial Canker` (5), `mango - Cutting Weevil` (6), `mango - Die Back` (7), `mango - Gall Midge` (8), `mango - Healthy` (9), `mango - Powdery Mildew` (10), `mango - Sooty Mould` (11)
  - **Pepper (2 classes)**: `pepper - Bacterial_spot` (12), `pepper - healthy` (13)
  - **Potato (3 classes)**: `potato - Early_blight` (14), `potato - Late_blight` (15), `potato - healthy` (16)
  - **Tomato (10 classes)**:
    - `tomato - Bacterial_spot` (17)
    - `tomato - Early_blight` (18)
    - `tomato - Late_blight` (19)
    - `tomato - Leaf_Mold` (20)
    - `tomato - Septoria_leaf_spot` (21)
    - `tomato - Spider_mites Two-spotted_spider_mite` (22)
    - `tomato - Target_Spot` (23)
    - `tomato - Tomato_Yellow_Leaf_Curl_Virus` (24)
    - `tomato - Tomato_mosaic_virus` (25)
    - `tomato - healthy` (26)

---

## 4. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check (camera status, model status, uptime, captures count) |
| `GET` | `/api/model/info` | Architecture, tensor shapes, quantization, 27 class labels |
| `GET` | `/api/camera/status` | Hardware connection, resolution, FPS, error message |
| `POST` | `/api/camera/start` | Initialize and open Logitech webcam capture |
| `POST` | `/api/camera/stop` | Safely release webcam hardware resource |
| `GET` | `/api/stream` | Live MJPEG stream (`multipart/x-mixed-replace`) |
| `POST` | `/api/predict` | Run inference on latest webcam frame or uploaded file |
| `GET` | `/api/predictions` | Query SQLite prediction history with pagination (`limit`, `offset`, `plant`) |
| `GET` | `/api/predictions/{id}` | Single prediction record by ID |
| `GET` | `/captures/{filename}` | Stored leaf photos |

---

## 5. Raspberry Pi 4 Deployment Instructions

### Prerequisites
- Raspberry Pi 4 Model B (4GB or 8GB recommended).
- Raspberry Pi OS (64-bit Debian Bookworm or Bullseye).
- Logitech USB Webcam (C270, C920, or similar) plugged into a USB 3.0 port (blue).

### Automated Installation
```bash
# Clone or copy agrorooter to Raspberry Pi
cd /home/pi/agrorooter

# Run automated deployment script
chmod +x scripts/setup_raspberry_pi.sh
./scripts/setup_raspberry_pi.sh
```

### Manual Installation Steps
```bash
# 1. System packages
sudo apt-get update
sudo apt-get install -y python3-pip python3-venv python3-dev libatlas-base-dev v4l-utils

# 2. Add user to video group
sudo usermod -aG video $USER

# 3. Create virtual environment
cd /home/pi/agrorooter/backend
python3 -m venv venv
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Run test suite
python ../scripts/test_model.py
python ../scripts/test_camera.py

# 6. Start backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 6. Running the Frontend Website

```bash
cd /home/pi/agrorooter/frontend # Or on your laptop
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 7. Acceptance Test Verification

Run the acceptance test suite:
```bash
python scripts/test_model.py
```
Output:
```
[Test 1] Validating model and label files: PASS (8.60 MB)
[Test 2] Validating class labels: PASS (27 total, 10 tomato)
[Test 3] Validating model loading & tensor shapes: PASS ([1, 224, 224, 3] -> [1, 27])
[Test 4] Generating synthetic leaf sample & executing inference: PASS (Latency: 21ms, Prob sum: 0.9999)
[Test 5] Validating SQLite persistence: PASS (Record saved and retrieved)
ALL ACCEPTANCE TESTS PASSED (5/5)!
```
