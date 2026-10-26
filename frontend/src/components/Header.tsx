import React from 'react';
import { RefreshCw, Camera, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import { CameraStatus, ModelInfo, HealthStatus } from '../types';

interface HeaderProps {
  cameraStatus: CameraStatus | null;
  modelInfo: ModelInfo | null;
  health: HealthStatus | null;
  capturesCount: number;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  cameraStatus,
  modelInfo,
  health,
  capturesCount,
  onRefresh,
  isLoading,
}) => {
  const isCameraOnline = cameraStatus?.connected && cameraStatus?.streaming;
  const isModelReady = modelInfo?.loaded;

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-10 shrink-0">
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

      <div className="flex flex-wrap items-center gap-3">
        {/* Captures Taken Badge */}
        <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Captures Taken:</span>
          <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {capturesCount}
          </span>
        </div>

        {/* Camera Status Badge */}
        <div
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border shadow-sm ${
            isCameraOnline
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>{isCameraOnline ? 'Webcam Live' : 'Camera Disconnected'}</span>
        </div>

        {/* Model Status Badge */}
        <div
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border shadow-sm ${
            isModelReady
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{isModelReady ? 'AI Model Ready' : 'AI Model Unavailable'}</span>
        </div>

        {/* Refresh System Health */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh System Health"
          className="p-2 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>
    </header>
  );
};
