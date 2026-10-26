import React, { useState } from 'react';
import { Settings as SettingsIcon, Sliders, HardDrive, Camera, Save, Check } from 'lucide-react';
import { CameraStatus, ModelInfo } from '../types';

interface SettingsModalProps {
  captureInterval: number;
  setCaptureInterval: (val: number) => void;
  cameraStatus: CameraStatus | null;
  modelInfo: ModelInfo | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  captureInterval,
  setCaptureInterval,
  cameraStatus,
  modelInfo,
}) => {
  const [intervalVal, setIntervalVal] = useState<number>(captureInterval);
  const [saved, setSaved] = useState<boolean>(false);

  const handleSave = () => {
    setCaptureInterval(intervalVal);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Rover &amp; System Settings</h3>
            <p className="text-xs text-slate-500">Hardware parameters, inference intervals, and storage limits</p>
          </div>
        </div>

        {saved && (
          <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-semibold">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            Settings Saved
          </span>
        )}
      </div>

      <div className="space-y-5 text-xs">
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
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-colors text-xs"
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
