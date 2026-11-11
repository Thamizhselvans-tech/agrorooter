import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, AlertCircle, VideoOff, Play, Square, SwitchCamera } from 'lucide-react';

interface LaptopWebcamProps {
  onCaptureFrame: (canvas: HTMLCanvasElement) => void;
  isInferencing: boolean;
  disabled?: boolean;
}

export const LaptopWebcam: React.FC<LaptopWebcamProps> = ({
  onCaptureFrame,
  isInferencing,
  disabled = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

  // List available video devices
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const cams = devices.filter((d) => d.kind === 'videoinput');
          setVideoDevices(cams);
        })
        .catch(() => {});
    }
  }, []);

  const startWebcam = async (faceMode = facingMode) => {
    setPermissionError(null);
    try {
      // Stop prior stream if active
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: faceMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setStream(newStream);
      setCameraActive(true);
      setFacingMode(faceMode);
    } catch (err: any) {
      console.warn('Webcam access error:', err);
      let msg = 'Could not access laptop/desktop camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera permissions in your browser address bar.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device was detected on this computer.';
      } else if (err.name === 'NotReadableError') {
        msg = 'Camera is currently in use by another application.';
      }
      setPermissionError(msg);
      setCameraActive(false);
    }
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startWebcam(nextMode);
  };

  const captureFrame = () => {
    if (!videoRef.current || !cameraActive) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      onCaptureFrame(canvas);
    }
  };

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="space-y-4">
      {/* Video Viewport Container */}
      <div className="relative bg-slate-900 aspect-video rounded-xl overflow-hidden border border-slate-700/80 shadow-inner flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
        />

        {/* Reticle Focus Overlay when Camera Active */}
        {cameraActive && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-emerald-400/50 rounded-2xl flex items-center justify-center relative">
              <div className="w-3 h-3 bg-emerald-400/80 rounded-full animate-ping" />
              <div className="absolute top-2 left-2 text-[10px] text-emerald-300 font-mono tracking-wider bg-slate-900/60 px-1 rounded">
                LEAF SCAN
              </div>
            </div>
          </div>
        )}

        {/* Idle / Error State */}
        {!cameraActive && (
          <div className="p-6 text-center max-w-sm space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-200 font-semibold text-sm">Laptop / Desktop Webcam</p>
              <p className="text-xs text-slate-400 mt-1">
                {permissionError || 'Click "Start Camera" to scan a leaf using your computer webcam.'}
              </p>
            </div>
            {permissionError && (
              <div className="text-[11px] text-amber-300/90 bg-amber-950/40 p-2.5 rounded-lg border border-amber-800/40 flex items-start gap-1.5 text-left">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{permissionError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {!cameraActive ? (
            <button
              onClick={() => startWebcam()}
              disabled={disabled || isInferencing}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Webcam
            </button>
          ) : (
            <button
              onClick={stopWebcam}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop Webcam
            </button>
          )}

          {cameraActive && (
            <button
              onClick={captureFrame}
              disabled={isInferencing}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              Capture &amp; Analyze Leaf
            </button>
          )}
        </div>

        {cameraActive && videoDevices.length > 1 && (
          <button
            onClick={toggleCameraFacing}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <SwitchCamera className="w-3.5 h-3.5" />
            Flip Camera ({facingMode === 'environment' ? 'Rear' : 'Front'})
          </button>
        )}
      </div>
    </div>
  );
};
