import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Sliders, 
  HardDrive, 
  Camera, 
  Save, 
  Check, 
  Globe, 
  RefreshCw, 
  AlertCircle,
  Radio,
  Info
} from 'lucide-react';
import { CameraStatus, ModelInfo, SystemConnectionStatus } from '../types';
import { connectionManager } from '../api/connectionManager';

interface SettingsModalProps {
  captureInterval: number;
  setCaptureInterval: (val: number) => void;
  systemStatus: SystemConnectionStatus;
  cameraStatus: CameraStatus | null;
  modelInfo: ModelInfo | null;
  onConnectionUpdated?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  captureInterval,
  setCaptureInterval,
  systemStatus,
  cameraStatus,
  modelInfo,
  onConnectionUpdated,
}) => {
  const [intervalVal, setIntervalVal] = useState<number>(captureInterval);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'offline'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    setApiBaseUrl(connectionManager.getApiBase());
  }, []);

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Testing connection to Raspberry Pi backend...');

    const result = await connectionManager.testConnection(apiBaseUrl);

    if (result.success) {
      setTestStatus('success');
      setTestMessage(result.message);
    } else {
      setTestStatus('offline');
      setTestMessage(result.message);
    }
  };

  const handleSave = () => {
    setCaptureInterval(intervalVal);
    connectionManager.setApiBase(apiBaseUrl);
    setSaved(true);
    if (onConnectionUpdated) {
      onConnectionUpdated();
    }
    setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  const isRoverConnected = systemStatus.isRoverOnline;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Rover &amp; System Settings</h3>
            <p className="text-xs text-slate-500">Hardware parameters, connectivity URLs, and inference intervals</p>
          </div>
        </div>

        {saved && (
          <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-semibold animate-fade-in">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            Settings Applied
          </span>
        )}
      </div>

      <div className="space-y-5 text-xs">
        {/* Backend API Connection Configuration */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                Raspberry Pi / Backend API Base URL
              </h4>
              <p className="text-slate-500 text-xs mt-0.5">
                Target address of the FastAPI backend running on your Raspberry Pi (or localhost).
              </p>
            </div>
          </div>

          {/* Informative offline message */}
          {!isRoverConnected && (
            <div className="flex items-start gap-2 p-3 bg-slate-100 border border-slate-200/90 rounded-lg text-slate-600 text-xs">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <span>
                Raspberry Pi is currently offline. Connect your device to enable live disease detection.
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. http://localhost:8000 or https://your-tunnel.trycloudflare.com"
              value={apiBaseUrl}
              onChange={(e) => {
                setApiBaseUrl(e.target.value);
                setTestStatus('idle');
              }}
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 text-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
              Test Connection
            </button>
          </div>

          {/* Test Status Feedback - only shown after testing */}
          {testStatus !== 'idle' && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 transition-all ${
                testStatus === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : testStatus === 'offline'
                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {testStatus === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : testStatus === 'offline' ? (
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-500 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{testMessage}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-1">
            <span>Quick presets:</span>
            <button
              type="button"
              onClick={() => {
                setApiBaseUrl('http://localhost:8000');
                setTestStatus('idle');
              }}
              className="text-emerald-700 hover:underline font-mono bg-white px-2 py-0.5 rounded border border-slate-200 cursor-pointer"
            >
              http://localhost:8000
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                setApiBaseUrl('http://127.0.0.1:8000');
                setTestStatus('idle');
              }}
              className="text-emerald-700 hover:underline font-mono bg-white px-2 py-0.5 rounded border border-slate-200 cursor-pointer"
            >
              http://127.0.0.1:8000
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                setApiBaseUrl('');
                setTestStatus('idle');
              }}
              className="text-slate-600 hover:underline font-mono bg-white px-2 py-0.5 rounded border border-slate-200 cursor-pointer"
            >
              Reset to Default
            </button>
          </div>
        </div>

        {/* Auto Capture Interval Slider */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                Auto-Capture Inference Interval
              </h4>
              <p className="text-slate-500 text-xs mt-0.5">
                Frequency at which the rover webcam automatically captures frames for disease inference.
              </p>
            </div>
            <span className="font-mono text-base font-bold text-emerald-700 bg-white px-3 py-1 rounded-lg border border-slate-200">
              {intervalVal} seconds
            </span>
          </div>

          <div className="space-y-1">
            <input
              type="range"
              min="2"
              max="30"
              step="1"
              value={intervalVal}
              onChange={(e) => setIntervalVal(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>2s (High load)</span>
              <span>5s (Default Recommended)</span>
              <span>30s (Conserve power)</span>
            </div>
          </div>
        </div>

        {/* Camera Hardware Parameters */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-600" />
            Logitech USB Webcam Configuration
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-500 font-semibold mb-1">Camera Device Index</label>
              <input
                type="text"
                disabled
                value={cameraStatus?.camera_index ?? 0}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-slate-700 text-xs"
              />
              <span className="text-[10px] text-slate-400">Default OpenCV V4L2 device</span>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">Stream Resolution</label>
              <input
                type="text"
                disabled
                value={cameraStatus?.resolution || '640x480'}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-slate-700 text-xs"
              />
              <span className="text-[10px] text-slate-400">4:3 Aspect Ratio</span>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">Target FPS</label>
              <input
                type="text"
                disabled
                value={`${cameraStatus?.fps || 30} FPS`}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-slate-700 text-xs"
              />
              <span className="text-[10px] text-slate-400">Optimized for low RPi CPU usage</span>
            </div>
          </div>
        </div>

        {/* Storage Limits */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-600" />
            Storage &amp; Retention Policies
          </h4>
          <p className="text-slate-500">
            To prevent SD card exhaustion on the Raspberry Pi 4, only frames triggered for prediction are saved. Oldest frames are automatically pruned when count exceeds 500 images.
          </p>
        </div>

        {/* Save Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition-colors text-xs cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
