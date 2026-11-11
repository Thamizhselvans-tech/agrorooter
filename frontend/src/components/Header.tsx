import React from 'react';
import { RefreshCw, Camera, Layers, Radio, Server, CheckCircle2 } from 'lucide-react';
import { CameraStatus, ModelInfo, HealthStatus, SystemConnectionStatus } from '../types';

interface HeaderProps {
  systemStatus: SystemConnectionStatus;
  cameraStatus: CameraStatus | null;
  modelInfo: ModelInfo | null;
  health: HealthStatus | null;
  capturesCount: number;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  systemStatus,
  cameraStatus,
  modelInfo,
  health,
  capturesCount,
  onRefresh,
  isLoading,
}) => {
  const isRoverConnected = systemStatus.isRoverOnline;
  const isBackendConnected = systemStatus.isBackendConnected;
  const isCameraOnline = isRoverConnected && (cameraStatus?.connected && cameraStatus?.streaming);
  const isModelReady = isRoverConnected && (modelInfo?.loaded ?? false);

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-10 shrink-0">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          Leaf Disease Detection
          <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
            Field Monitor
          </span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time automated edge diagnostics via Raspberry Pi 4 &amp; Logitech Webcam
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Captures Taken Badge */}
        <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Captures:</span>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {capturesCount}
          </span>
        </div>

        {/* Raspberry Pi Hardware Status */}
        <div
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border shadow-2xs transition-colors ${
            isRoverConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
          title={isRoverConnected ? 'Raspberry Pi 4 Online' : 'Raspberry Pi is currently offline'}
        >
          <Radio className={`w-3.5 h-3.5 ${isRoverConnected ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
          <span>{isRoverConnected ? 'RPi: Online' : 'Raspberry Pi: Offline'}</span>
        </div>

        {/* Backend Connection Status */}
        <div
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border shadow-2xs transition-colors ${
            isBackendConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
          title={isBackendConnected ? 'FastAPI Backend Connected' : 'Waiting for backend connection'}
        >
          <Server className={`w-3.5 h-3.5 ${isBackendConnected ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>{isBackendConnected ? 'Backend: Connected' : 'Backend: Waiting for Connection'}</span>
        </div>

        {/* Camera Status Badge */}
        <div
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border shadow-2xs transition-colors ${
            isCameraOnline
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
          title={isCameraOnline ? 'Logitech Webcam Active & Streaming' : 'Camera is not connected'}
        >
          <Camera className={`w-3.5 h-3.5 ${isCameraOnline ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>{isCameraOnline ? 'Camera: Live' : 'Camera: Not Connected'}</span>
        </div>

        {/* Model Status Badge */}
        <div
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border shadow-2xs transition-colors ${
            isModelReady
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
          title={isModelReady ? 'MobileNetV2 Classifier Loaded' : 'Waiting for device'}
        >
          <Layers className={`w-3.5 h-3.5 ${isModelReady ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>{isModelReady ? 'AI Model: Ready' : 'AI Model: Waiting for Device'}</span>
        </div>

        {/* Refresh System Health */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh System Status"
          className="p-2 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 transition-colors shadow-2xs disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>
    </header>
  );
};
