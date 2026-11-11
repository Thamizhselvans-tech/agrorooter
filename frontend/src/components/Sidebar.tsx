import React from 'react';
import { 
  LayoutDashboard, 
  History, 
  Settings as SettingsIcon, 
  Camera, 
  CheckCircle, 
  Radio,
  Layers,
  Cloud,
  Server,
  WifiOff
} from 'lucide-react';
import { CameraStatus, ModelInfo, HealthStatus, SystemConnectionStatus } from '../types';

interface SidebarProps {
  activeTab: 'dashboard' | 'history' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'history' | 'settings') => void;
  systemStatus: SystemConnectionStatus;
  cameraStatus: CameraStatus | null;
  modelInfo: ModelInfo | null;
  health: HealthStatus | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  systemStatus,
  cameraStatus,
  modelInfo,
  health,
}) => {
  const isRoverConnected = systemStatus.isRoverOnline;
  const isBackendConnected = systemStatus.isBackendConnected;
  const isCameraOnline = isRoverConnected && (cameraStatus?.connected && cameraStatus?.streaming);
  const isModelReady = isRoverConnected && (modelInfo?.loaded ?? false);

  return (
    <aside className="w-64 h-screen sticky top-0 bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800 shadow-xl shrink-0 overflow-y-auto select-none z-20">
      {/* Brand & Logo */}
      <div>
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-green-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-green-900/40">
              <span className="text-xl">🌿</span>
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                Agri Rover <span className="text-emerald-400 font-extrabold text-xs px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/50">AI</span>
              </h1>
              <p className="text-xs text-slate-400">Leaf Disease Detection</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="p-4 space-y-1.5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 font-semibold'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 font-semibold'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Prediction History</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 font-semibold'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </nav>
      </div>

      {/* Hardware & System Status Summary */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/60 text-xs space-y-2.5">
          {/* Raspberry Pi Hardware status */}
          <div className="flex items-center justify-between text-slate-300 font-semibold pb-1.5 border-b border-slate-700/50">
            <span className="flex items-center gap-1.5">
              <Radio className={`w-3.5 h-3.5 ${isRoverConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              Raspberry Pi
            </span>
            {isRoverConnected ? (
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                {health?.uptime_seconds ? `${Math.floor(health.uptime_seconds / 60)}m up` : 'Online'}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded border border-slate-600/50 font-mono">
                Offline
              </span>
            )}
          </div>

          {/* Backend API status */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" />
              Backend API
            </span>
            {isBackendConnected ? (
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                Connected
              </span>
            ) : (
              <span className="text-slate-400 font-medium text-[11px]">
                Waiting for Connection
              </span>
            )}
          </div>

          {/* Camera hardware status */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              Camera
            </span>
            {isCameraOnline ? (
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                Live
              </span>
            ) : (
              <span className="text-slate-400 font-medium text-[11px]">
                Not Connected
              </span>
            )}
          </div>

          {/* AI Model status */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              AI Model
            </span>
            {isModelReady ? (
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                Loaded
              </span>
            ) : (
              <span className="text-slate-400 font-medium text-[11px]">
                Waiting for Device
              </span>
            )}
          </div>

          {/* Cloud Firestore status */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              Cloud Sync
            </span>
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              Active
            </span>
          </div>

          {/* Direct connect button if backend is offline */}
          {!isRoverConnected && (
            <button
              onClick={() => setActiveTab('settings')}
              className="w-full mt-2 pt-2 border-t border-slate-700/50 py-1.5 px-2 bg-slate-700/30 hover:bg-emerald-950/40 border border-slate-700 hover:border-emerald-700/50 rounded-lg text-[11px] text-slate-300 hover:text-emerald-300 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <SettingsIcon className="w-3 h-3 text-emerald-400" />
              Configure Connection
            </button>
          )}
        </div>

        <div className="text-[11px] text-slate-500 text-center font-mono">
          Agri Rover AI v1.0.0
        </div>
      </div>
    </aside>
  );
};
