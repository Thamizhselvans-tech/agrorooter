import React from 'react';
import { 
  RefreshCw, 
  Camera, 
  Layers, 
  Radio, 
  Server, 
  Cpu, 
  Laptop, 
  CheckCircle2, 
  ChevronRight,
  Wifi
} from 'lucide-react';
import { CameraStatus, ModelInfo, HealthStatus, SystemConnectionStatus, PredictionMode } from '../types';

interface HeaderProps {
  predictionMode: PredictionMode;
  setPredictionMode: (mode: PredictionMode) => void;
  systemStatus: SystemConnectionStatus;
  cameraStatus: CameraStatus | null;
  modelInfo: ModelInfo | null;
  health: HealthStatus | null;
  standaloneModelLoaded: boolean;
  capturesCount: number;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  predictionMode,
  setPredictionMode,
  systemStatus,
  cameraStatus,
  modelInfo,
  health,
  standaloneModelLoaded,
  capturesCount,
  onRefresh,
  isLoading,
}) => {
  const isRoverConnected = systemStatus.isRoverOnline;
  const isBackendConnected = systemStatus.isBackendConnected;
  const isCameraOnline = isRoverConnected && (cameraStatus?.connected && cameraStatus?.streaming);
  const isModelReady = isRoverConnected && (modelInfo?.loaded ?? false);

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-10 shrink-0">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              Leaf Disease Detection
            </h2>
            <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Dual Mode AI
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {predictionMode === 'standalone'
              ? 'Mode A: In-Browser Standalone AI Diagnostics (Laptop/Mobile)'
              : 'Mode B: Edge IoT Diagnostics via Raspberry Pi 4 & USB Webcam'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Mode Selector Pill Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold shadow-2xs">
          <button
            onClick={() => setPredictionMode('standalone')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              predictionMode === 'standalone'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Standalone AI</span>
          </button>

          <button
            onClick={() => setPredictionMode('raspberry_pi')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              predictionMode === 'raspberry_pi'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Raspberry Pi IoT</span>
            {isRoverConnected && predictionMode === 'standalone' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" title="RPi Online" />
            )}
          </button>
        </div>

        {/* Captures Count Badge */}
        <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Predictions:</span>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {capturesCount}
          </span>
        </div>

        {/* Dynamic Mode Badges */}
        {predictionMode === 'standalone' ? (
          <>
            {/* Standalone In-Browser Model Status */}
            <div
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border shadow-2xs ${
                standaloneModelLoaded
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title="In-Browser Neural Network Inference Engine (WebAssembly)"
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
              <span>{standaloneModelLoaded ? 'Browser AI: Ready' : 'Browser AI: Loading...'}</span>
            </div>

            {/* Background RPi Availability Pill */}
            <div
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border shadow-2xs ${
                isRoverConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 cursor-pointer'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
              onClick={() => isRoverConnected && setPredictionMode('raspberry_pi')}
              title={isRoverConnected ? 'Click to switch to Raspberry Pi IoT mode' : 'Raspberry Pi is currently offline'}
            >
              <Radio className={`w-3.5 h-3.5 ${isRoverConnected ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
              <span>{isRoverConnected ? 'RPi Available' : 'RPi Standby'}</span>
            </div>
          </>
        ) : (
          <>
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
              <span>{isRoverConnected ? 'RPi: Online' : 'RPi: Offline'}</span>
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
              <span>{isCameraOnline ? 'Webcam: Live' : 'Camera: Offline'}</span>
            </div>
          </>
        )}

        {/* Refresh System Health */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh System Status"
          className="p-2 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>
    </header>
  );
};
