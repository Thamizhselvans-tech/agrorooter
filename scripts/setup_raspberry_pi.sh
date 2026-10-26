#!/usr/bin/env bash
# ==============================================================================
# Agri Rover AI — Raspberry Pi 4 Model B Deployment & Setup Script
# Logitech USB Webcam + TensorFlow Lite Inference Backend
# ==============================================================================

set -e

echo "=========================================================="
echo "  Agri Rover AI: Raspberry Pi 4 Setup & Environment Config"
echo "=========================================================="

# 1. Update package lists and install system dependencies
echo -e "\n[1/7] Updating apt repositories and installing system packages..."
sudo apt-get update
sudo apt-get install -y \
    python3-pip \
    python3-venv \
    python3-dev \
    libatlas-base-dev \
    libopenjp2-7 \
    libtiff5 \
    libjpeg-dev \
    zlib1g-dev \
    v4l-utils \
    fswebcam \
    curl \
    git

# 2. Add current user to video group for USB webcam access
echo -e "\n[2/7] Ensuring user '$USER' is in 'video' group..."
sudo usermod -aG video "$USER"

# 3. Detect Logitech USB Webcam
echo -e "\n[3/7] Detecting USB webcams..."
lsusb | grep -i "Logitech" || echo "Logitech USB webcam not found in lsusb. Check USB connection."
v4l2-ctl --list-devices || true

# 4. Create and activate Python virtual environment
echo -e "\n[4/7] Setting up Python virtual environment..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VENV_DIR="$PROJECT_ROOT/backend/venv"

if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
    echo "Created virtual environment at $VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
pip install --upgrade pip setuptools wheel

# 5. Install backend dependencies
echo -e "\n[5/7] Installing backend Python dependencies..."
cd "$PROJECT_ROOT/backend"
pip install fastapi uvicorn pillow numpy python-multipart python-dotenv opencv-python-headless

# 6. Install compatible TensorFlow Lite runtime for Raspberry Pi OS
echo -e "\n[6/7] Installing TensorFlow Lite runtime..."
PYTHON_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "Detected Python version: $PYTHON_VER on $(uname -m)"

# Strategy 1: Modern standalone Google runtime
if pip install ai-edge-litert; then
    echo "Successfully installed ai-edge-litert!"
# Strategy 2: Official tflite-runtime pip package
elif pip install tflite-runtime; then
    echo "Successfully installed tflite-runtime!"
# Strategy 3: Debian package if Bullseye / Bookworm
elif sudo apt-get install -y python3-tflite-runtime; then
    echo "Installed python3-tflite-runtime via apt!"
else
    echo "Fallback: Installing full tensorflow (may take several minutes)..."
    pip install tensorflow
fi

# 7. Model file verification & test inference
echo -e "\n[7/7] Verifying plant disease model and running diagnostic test..."
python3 "$PROJECT_ROOT/scripts/test_model.py"

echo -e "\n=========================================================="
echo "  Agri Rover AI Setup Complete!"
echo "=========================================================="
echo ""
echo "To start the backend server on Raspberry Pi (listening on 0.0.0.0:8000):"
echo "  cd $PROJECT_ROOT/backend"
echo "  source venv/bin/activate"
echo "  uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo ""
echo "To run backend as a systemd service automatically on boot:"
echo "  sudo cp $PROJECT_ROOT/scripts/agri-rover.service /etc/systemd/system/"
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable --now agri-rover"
echo "=========================================================="
