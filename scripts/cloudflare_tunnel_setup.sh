#!/usr/bin/env bash
# ==============================================================================
# Cloudflare Tunnel Setup Script for Raspberry Pi 4 Model B
# Exposes the local FastAPI backend (port 8000) securely over HTTPS
# ==============================================================================

set -e

echo "=========================================================="
echo "  Agri Rover AI — Cloudflare Tunnel Setup for Raspberry Pi"
echo "=========================================================="

ARCH=$(uname -m)
echo "Detected system architecture: $ARCH"

# 1. Download and install cloudflared package for Raspberry Pi architecture
if command -v cloudflared &> /dev/null; then
    echo "cloudflared is already installed: $(cloudflared --version)"
else
    echo "Downloading and installing official cloudflared binary..."
    if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
        curl -L --output /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
    elif [ "$ARCH" = "armv7l" ] || [ "$ARCH" = "armhf" ]; then
        curl -L --output /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm.deb
    else
        curl -L --output /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    fi
    sudo dpkg -i /tmp/cloudflared.deb
    rm /tmp/cloudflared.deb
    echo "cloudflared installed successfully!"
fi

echo ""
echo "=========================================================="
echo "Choose Tunnel Mode:"
echo "=========================================================="
echo "Option A: Free Quick Tunnel (Instant temporary HTTPS URL, no domain required)"
echo "  Command: cloudflared tunnel --url http://localhost:8000"
echo "  This will print a public https://<subdomain>.trycloudflare.com URL."
echo "  Copy that URL and set it as VITE_API_BASE on Vercel."
echo ""
echo "Option B: Named Tunnel with Custom Domain (Production)"
echo "  Step 1: Login to Cloudflare:"
echo "    cloudflared tunnel login"
echo ""
echo "  Step 2: Create named tunnel:"
echo "    cloudflared tunnel create agri-rover-tunnel"
echo ""
echo "  Step 3: Route DNS hostname to tunnel:"
echo "    cloudflared tunnel route dns agri-rover-tunnel <YOUR_SUBDOMAIN.YOUR_DOMAIN.COM>"
echo ""
echo "  Step 4: Copy and edit config:"
echo "    mkdir -p ~/.cloudflared"
echo "    cp ../scripts/cloudflare-tunnel.config.yml.example ~/.cloudflared/config.yml"
echo "    nano ~/.cloudflared/config.yml"
echo ""
echo "  Step 5: Run as systemd background service:"
echo "    sudo cloudflared service install"
echo "    sudo systemctl enable --now cloudflared"
echo "=========================================================="
