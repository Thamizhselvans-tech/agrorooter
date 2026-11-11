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
  Radio, 
  Info,
  Cpu,
  Laptop,
  Trash2,
  Layers,
  Database
} from 'lucide-react';
import { CameraStatus, ModelInfo, SystemConnectionStatus, PredictionMode } from '../types';
import { connectionManager } from '../api/connectionManager';
import { standaloneEngine } from '../ai/standaloneModel';
import { offlineStorage } from '../api/storage';

interface SettingsModalProps {
  predictionMode: PredictionMode;
  setPredictionMode: (mode: PredictionMode) => void;
  captureInterval: number;
  setCaptureInterval: (val: number) => void;
  systemStatus: SystemConnectionStatus;
  cameraStatus: CameraStatus | null;
  modelInfo: ModelInfo | null;
  standaloneModelLoaded: boolean;
  onConnectionUpdated?: () => void;
  onClearHistory?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  predictionMode,
  setPredictionMode,
  captureInterval,
  setCaptureInterval,
  systemStatus,
  cameraStatus,
  modelInfo,
  standaloneModelLoaded,
  onConnectionUpdated,
  onClearHistory,
}) => {
  const [intervalVal, setIntervalVal] = useState<number>(captureInterval);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'offline'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [saved, setSaved] = useState<boolean>(false);
  const [historyCount, setHistoryCount] = useState<number>(0);

  useEffect(() => {
    setApiBaseUrl(connectionManager.getApiBase());
    setHistoryCount(offlineStorage.getCachedPredictions().length);
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
    offlineStorage.setPredictionMode(predictionMode);
    setSaved(true);
    if (onConnectionUpdated) {
      onConnectionUpdated();
    }
    setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  const handleClearLocalCache = () => {
    if (window.confirm('Are you sure you want to clear your local prediction history cache?')) {
      offlineStorage.setCachedPredictions([]);
      offlineStorage.setCachedLatestPrediction(null);
      setHistoryCount(0);
      if (onClearHistory) {
        onClearHistory();
      }
    }
  };

  const isRoverConnected = systemStatus.isRoverOnline;
  const standaloneInfo = standaloneEngine.getModelInfo();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">System &amp; Prediction Settings</h3>
            <p className="text-xs text-slate-500">Configure dual prediction modes, edge hardware, and model inference</p>
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
        {/* 1. Primary Prediction Mode Configuration */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div>
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-600" />
              Active AI Prediction Architecture
            </h4>
            <p className="text-slate-500 text-xs mt-0.5">
              Select whether to run AI model inference directly on your computer or through a connected Raspberry Pi.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Mode A: Standalone */}
            <div
              onClick={() => setPredictionMode('standalone')}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                predictionMode === 'standalone'
                  ? 'bg-emerald-50/70 border-emerald-500 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-emerald-600" />
                  Mode A: Standalone AI
                </span>
                {predictionMode === 'standalone' && (
                  <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Runs inference 100% inside your browser using WebAssembly. Requires no Raspberry Pi, no backend server, and no cloud tunnel.
              </p>
              <div className="text-[10px] text-emerald-700 font-mono font-semibold">
                Status: {standaloneModelLoaded ? '✓ Engine Ready' : 'Initializing...'}
              </div>
            </div>

            {/* Mode B: Raspberry Pi IoT */}
            <div
              onClick={() => setPredictionMode('raspberry_pi')}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                predictionMode === 'raspberry_pi'
                  ? 'bg-emerald-50/70 border-emerald-500 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-emerald-600" />
                  Mode B: Raspberry Pi IoT
                </span>
                {predictionMode === 'raspberry_pi' && (
                  <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Connects to the FastAPI edge backend running on Raspberry Pi with Logitech USB camera and automated capture intervals.
              </p>
              <div className="text-[10px] font-mono font-semibold">
                Status:{' '}
                {isRoverConnected ? (
                  <span className="text-emerald-700">✓ Connected</span>
                ) : (
                  <span className="text-slate-500">Standby (Offline)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Raspberry Pi Backend Configuration */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                Raspberry Pi / Backend API Base URL
              </h4>
              <p className="text-slate-500 text-xs mt-0.5">
                Target address of your Raspberry Pi FastAPI service. (Optional when using Standalone Mode).
              </p>
            </div>
          </div>

          {!isRoverConnected && (
            <div className="flex items-start gap-2 p-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 text-xs">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <span>
                Raspberry Pi is currently offline. Standalone Mode remains fully operational without a backend.
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

          {/* Test Status Feedback */}
          {testStatus !== 'idle' && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 transition-all ${
                testStatus === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {testStatus === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
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
              Default (Local Host)
            </button>
          </div>
        </div>

        {/* 3. AI Model Engine Specifications */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            Neural Network Architecture &amp; Quantization
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Architecture</span>
              <p className="font-bold text-slate-800 text-xs">MobileNetV2 (224x224x3)</p>
              <span className="text-[10px] text-emerald-700 font-mono">ONNX WebAssembly</span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Classes Trained</span>
              <p className="font-bold text-slate-800 text-xs">
                {standaloneInfo.total_classes} Classes ({standaloneInfo.tomato_classes_count} Tomato)
              </p>
              <span className="text-[10px] text-slate-500 font-mono">Full Softmax Output</span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Normalization Range</span>
              <p className="font-bold text-slate-800 text-xs font-mono">[-1.0, 1.0]</p>
              <span className="text-[10px] text-slate-500 font-mono">(img / 127.5) - 1.0</span>
            </div>
          </div>
        </div>

        {/* 4. IoT Mode Auto Capture Interval Slider */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                Raspberry Pi Auto-Capture Interval
              </h4>
              <p className="text-slate-500 text-xs mt-0.5">
                Frequency at which the Raspberry Pi webcam captures frames for automated disease prediction.
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
              <span>2s (High frequency)</span>
              <span>5s (Default Recommended)</span>
              <span>30s (Conserve bandwidth)</span>
            </div>
          </div>
        </div>

        {/* 5. Unified Storage & Cache Management */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                Unified History &amp; Cache Storage
              </h4>
              <p className="text-slate-500 text-xs mt-0.5">
                Manage stored prediction records from both Standalone Mode and Raspberry Pi IoT Mode.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700 font-mono bg-white px-2.5 py-1 rounded border border-slate-200">
              {historyCount} records cached
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">
              Local cache ensures your diagnosis history remains accessible when offline.
            </span>
            <button
              type="button"
              onClick={handleClearLocalCache}
              disabled={historyCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-200 font-semibold transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              Clear Local Cache
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition-colors text-xs cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
