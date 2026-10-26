# Agri Rover AI: End-to-End Production Deployment Guide

This guide details the step-by-step production deployment workflow for **Agri Rover AI**:
1. **Frontend**: Hosted globally on **Vercel** (React + Vite + TypeScript).
2. **Backend & AI Engine**: Running locally on **Raspberry Pi 4 Model B** with the Logitech USB Webcam and MobileNetV2 TensorFlow Lite model.
3. **Connectivity**: Securely connected via **Cloudflare Tunnel** (HTTPS, zero open router ports, zero mixed-content errors).

---

## Architecture Overview

```
                                      +---------------------------------------------+
                                      |                GLOBAL USERS                 |
                                      |            (Desktop / Mobile)               |
                                      +----------------------+----------------------+
                                                             |
                                           HTTPS (Port 443)  |
                                                             v
                                      +---------------------------------------------+
                                      |             VERCEL EDGE CDN                 |
                                      |   https://agri-rover-ai.vercel.app          |
                                      |   (React 18 + Vite + Tailwind CSS Dashboard)|
                                      +----------------------+----------------------+
                                                             |
                                           HTTPS (Encrypted) |  API Requests & Stream
                                      (VITE_API_BASE)        v
                      +-----------------------------------------------------------------------------+
                      |                      CLOUDFLARE ZERO TRUST NETWORK                          |
                      |          https://<tunnel-id-or-custom-domain>.trycloudflare.com             |
                      +--------------------------------------+--------------------------------------+
                                                             |
                                    Outbound Encrypted Tunnel| (No open router ports)
                                                             v
+---------------------------------------------------------------------------------------------------+
|                                      RASPBERRY PI 4 MODEL B                                       |
|                                                                                                   |
|   +-----------------------+              +-----------------------+                                |
|   |   Logitech USB Cam    |              |   cloudflared daemon  |                                |
|   |      /dev/video0      |              |   (systemd service)   |                                |
|   +-----------+-----------+              +-----------+-----------+                                |
|               |                                      |                                            |
|               v                                      v  localhost:8000                            |
|   +-----------------------+              +-----------+-----------+                                |
|   | OpenCV Camera Manager | -----------> |   FastAPI Application |                                |
|   | (Singleton capture)   |              |  - /api/health        |                                |
|   +-----------+-----------+              |  - /api/model/info    |                                |
|               |                          |  - /api/stream (MJPEG)|                                |
|               v Frame under Lock         |  - /api/predict       |                                |
|   +-----------------------+              |  - /api/predictions   |                                |
|   | MobileNetV2 (TFLite)  | -----------> +-----------+-----------+                                |
|   | (224x224x3 Float32)   |                          |                                            |
|   +-----------------------+                          v                                            |
|                                          +-----------+-----------+                                |
|                                          | SQLite (predictions.db|                                |
|                                          | Captures (/captures/) |                                |
|                                          +-----------------------+                                |
+---------------------------------------------------------------------------------------------------+
```

---

## Phase 1: Push Codebase to GitHub

> **User Action Required**: Create a new private or public repository on [GitHub](https://github.com/new).

Run these commands in your project terminal on your computer:

```bash
cd C:\Users\Student\Documents\agrorooter

# 1. Stage all tracked files (secrets and databases are automatically excluded by .gitignore)
git add .

# 2. Commit the initial release
git commit -m "feat: Agri Rover AI production release with Vercel and Cloudflare Tunnel configs"

# 3. Rename branch to main
git branch -M main

# 4. Link your remote repository (replace with your real GitHub repo URL)
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/agrorooter.git

# 5. Push to GitHub
git push -u origin main
```

---

## Phase 2: Deploy Frontend on Vercel

> **User Action Required**: Log in to [Vercel](https://vercel.com) and import your GitHub repository.

1. In the Vercel Dashboard, click **Add New...** $\rightarrow$ **Project**.
2. Select the `agrorooter` GitHub repository and click **Import**.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select **`frontend`**
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
   - **Install Command**: `npm install` (default)
4. Configure Environment Variables:
   - Add **`VITE_API_BASE`**: Set this to your secure HTTPS Cloudflare Tunnel URL (obtained in Phase 3), e.g.:
     ```text
     https://<your-subdomain>.trycloudflare.com
     ```
     *(You can leave this blank initially or update it once the Cloudflare Tunnel is running).*
5. Click **Deploy**. Vercel will build and deploy the React application in ~30 seconds, generating your live URL (e.g., `https://agri-rover-ai.vercel.app`).

---

## Phase 3: Setup Raspberry Pi 4 Model B

### 3.1 Hardware Preparation
1. Plug the **Logitech USB Webcam** into a **blue USB 3.0 port** on the Raspberry Pi 4.
2. Connect the Raspberry Pi to your local network (Wi-Fi or Ethernet).

### 3.2 Automated Setup
Clone your repository onto the Raspberry Pi:
```bash
# On Raspberry Pi (via SSH or terminal):
cd /home/pi
git clone https://github.com/<YOUR_GITHUB_USERNAME>/agrorooter.git
cd /home/pi/agrorooter

# Run automated Raspberry Pi environment installer
chmod +x scripts/setup_raspberry_pi.sh
./scripts/setup_raspberry_pi.sh
```

### 3.3 Verify Hardware & AI Model
```bash
# Activate virtual environment
source backend/venv/bin/activate

# 1. Test Logitech Webcam detection
python scripts/test_camera.py

# 2. Test TFLite Model Loading and Inference
python scripts/test_model.py
```

### 3.4 Enable Auto-Boot Service on Raspberry Pi
To run the backend continuously in the background on boot:
```bash
# Copy systemd service unit
sudo cp scripts/agri-rover.service /etc/systemd/system/

# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl enable --now agri-rover

# Check service status
sudo systemctl status agri-rover
```

---

## Phase 4: Configure Cloudflare Tunnel (HTTPS Bridge)

Cloudflare Tunnel creates an encrypted outbound tunnel from your Raspberry Pi to Cloudflare's edge without opening router ports or exposing your home IP.

### Option A: Free Quick Tunnel (Immediate, No Custom Domain Needed)
For instant testing and live demonstrations:
```bash
# On Raspberry Pi:
cloudflared tunnel --url http://localhost:8000
```
`cloudflared` will print a public HTTPS address:
```text
+--------------------------------------------------------------------------------------------+
| Your quick Tunnel has been created! Visit it at:                                           |
| https://agri-sample-random.trycloudflare.com                                               |
+--------------------------------------------------------------------------------------------+
```
Copy this URL and set it as **`VITE_API_BASE`** in your Vercel Project Settings $\rightarrow$ Environment Variables, then click **Redeploy**.

### Option B: Named Tunnel with Custom Domain (Production)
```bash
# 1. Authenticate with Cloudflare
cloudflared tunnel login

# 2. Create named tunnel
cloudflared tunnel create agri-rover-tunnel

# 3. Route hostname (e.g., api-rover.yourdomain.com)
cloudflared tunnel route dns agri-rover-tunnel api-rover.yourdomain.com

# 4. Copy configuration template
mkdir -p ~/.cloudflared
cp /home/pi/agrorooter/scripts/cloudflare-tunnel.config.yml.example ~/.cloudflared/config.yml
nano ~/.cloudflared/config.yml
# (Fill in your Tunnel ID and hostname)

# 5. Install as persistent system service
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

---

## Phase 5: Verification & Acceptance Checklist

| Step | Action | Expected Result |
|---|---|---|
| **1. Vercel Frontend** | Open Vercel URL in browser | Dashboard loads green-and-white theme with static sidebar and controls. |
| **2. Backend Health** | Open `https://<YOUR_TUNNEL_URL>/api/health` | Returns JSON: `{"status": "healthy", "camera_connected": true, "model_loaded": true}`. |
| **3. Model Metadata** | Open `https://<YOUR_TUNNEL_URL>/api/model/info` | Returns 27 total classes, 10 tomato classes, and tensor dimensions. |
| **4. Live Stream** | Click **Start Camera** on dashboard | Logitech USB webcam activates and streams live video preview. |
| **5. Inference** | Click **Capture Now** or enable **Auto Capture** | Captures live leaf frame, predicts diagnosis in <30ms, and updates Top 3 cards. |
| **6. Persistence** | Inspect **Prediction History** tab | Displays saved prediction records stored in SQLite with thumbnail previews. |
| **7. HTTPS / Mixed Content** | Inspect Browser DevTools Console | **0 Mixed-Content errors** because both frontend and API use HTTPS. |
