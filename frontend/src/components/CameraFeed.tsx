import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  Camera, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Upload, 
  Loader2, 
  RefreshCw 
} from 'lucide-react';
import { CameraStatus } from '../types';
import { api } from '../api/client';

interface CameraFeedProps {
  cameraStatus: CameraStatus | null;
  onStartCamera: () => Promise<void>;
  onStopCamera: () => Promise<void>;
  onCaptureNow: () => Promise<void>;
  onUploadImage: (file: File) => Promise<void>;
  isInferencing: boolean;
  autoCapture: boolean;
  setAutoCapture: (val: boolean) => void;
  captureInterval: number;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  cameraStatus,
  onStartCamera,
  onStopCamera,
  onCaptureNow,
  onUploadImage,
  isInferencing,
  autoCapture,
  setAutoCapture,
  captureInterval = 5,
}) => {
  const isCameraOnline = cameraStatus?.connected && cameraStatus?.streaming;
  const [countdown, setCountdown] = useState<number>(captureInterval);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [streamError, setStreamError] = useState<boolean>(false);
  const [streamKey, setStreamKey] = useState<number>(Date.now());

  // Auto capture countdown timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    if (autoCapture && isCameraOnline) {
      setCountdown(captureInterval);

      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Trigger automatic capture if not already inferencing
            if (!isInferencing) {
              onCaptureNow();
            }
            return captureInterval;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(captureInterval);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [autoCapture, isCameraOnline, captureInterval, isInferencing, onCaptureNow]);

  // When camera stops, turn off auto capture cleanly
  useEffect(() => {
    if (!isCameraOnline && autoCapture) {
      setAutoCapture(false);
    }
  }, [isCameraOnline, autoCapture, setAutoCapture]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadImage(e.target.files[0]);
    }
  };

  const handleRefreshStream = () => {
    setStreamError(false);
    setStreamKey(Date.now());
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* Top Header of Card */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Live Camera Feed</h3>
            <p className="text-[11px] text-slate-500">Logitech USB Webcam (Raspberry Pi 4)</p>
          </div>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isCameraOnline
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isCameraOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            {isCameraOnline ? 'STREAMING' : 'OFFLINE'}
          </span>

          {isCameraOnline && (
            <button
              onClick={handleRefreshStream}
              title="Reload Stream"
              className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Stream Display Container */}
      <div className="relative bg-slate-900 aspect-video flex items-center justify-center overflow-hidden">
        {isCameraOnline && !streamError ? (
          <img
            key={streamKey}
            src={api.getStreamUrl()}
            alt="Logitech Webcam Live Stream"
            onError={() => setStreamError(true)}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="p-8 text-center max-w-sm space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-200 font-semibold text-sm">
                {cameraStatus?.error ? 'Camera Disconnected' : 'Camera Feed Inactive'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {cameraStatus?.error || "Click 'Start Camera' below to initialize the USB webcam on Raspberry Pi."}
              </p>
            </div>
            {cameraStatus?.error && (
              <p className="text-[11px] text-amber-400/90 bg-amber-950/40 p-2 rounded border border-amber-800/40">
                Check that the Logitech webcam is plugged into a Raspberry Pi USB 3.0 port.
              </p>
            )}
          </div>
        )}

        {/* Reticle Overlay when Active */}
        {isCameraOnline && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-emerald-400/40 rounded-xl flex items-center justify-center relative">
              <div className="w-3 h-3 bg-emerald-400/60 rounded-full" />
              <div className="absolute top-2 left-2 text-[10px] text-emerald-300/80 font-mono tracking-wider">
                LEAF FOCUS
              </div>
            </div>
          </div>
        )}

        {/* Inferencing Loading Banner */}
        {isInferencing && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center gap-2.5 text-white">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            <span className="text-sm font-semibold tracking-wide">Analyzing leaf specimen...</span>
          </div>
        )}

        {/* Auto Capture Countdown Pill */}
        {autoCapture && isCameraOnline && (
          <div className="absolute top-3 right-3 bg-slate-900/85 backdrop-blur border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-mono shadow-lg">
            <Clock className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            <span>Next capture in: <strong className="text-white text-sm">{countdown}s</strong></span>
          </div>
        )}
      </div>

      {/* Camera Controls Footer */}
      <div className="p-4 bg-white border-t border-slate-100 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Start / Stop Controls */}
          <div className="flex items-center gap-2">
            {!isCameraOnline ? (
              <button
                onClick={onStartCamera}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-all shadow-sm shadow-emerald-700/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Start Camera
              </button>
            ) : (
              <button
                onClick={onStopCamera}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-lg transition-all shadow-sm shadow-rose-700/20"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Stop Camera
              </button>
            )}

            {/* Manual Capture Now */}
            <button
              onClick={onCaptureNow}
              disabled={!isCameraOnline || isInferencing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white text-xs font-bold rounded-lg transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Camera className="w-3.5 h-3.5" />
              Capture Now
            </button>
          </div>

          {/* Auto Capture Toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs font-semibold text-slate-700">Auto Capture:</span>
              <div
                onClick={() => {
                  if (isCameraOnline) setAutoCapture(!autoCapture);
                }}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                  autoCapture && isCameraOnline ? 'bg-emerald-600' : 'bg-slate-300'
                } ${!isCameraOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm transform ${
                    autoCapture && isCameraOnline ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </label>
            <span className="text-[11px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              5s interval
            </span>
          </div>
        </div>

        {/* Fallback Upload Image for Testing / Offline */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Manual testing mode:</span>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isInferencing}
            className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-medium hover:underline disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Leaf Image for Prediction
          </button>
        </div>
      </div>
    </div>
  );
};
