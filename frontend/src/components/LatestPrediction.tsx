import React, { useState } from 'react';
import { 
  CheckCircle, 
  ShieldAlert, 
  Clock, 
  Leaf, 
  Zap, 
  Maximize2, 
  X,
  Layers,
  Cpu,
  Radio,
  Laptop
} from 'lucide-react';
import { PredictResponse, PredictionMode } from '../types';
import { api } from '../api/client';

interface LatestPredictionProps {
  prediction: PredictResponse | null;
  predictionMode: PredictionMode;
  modelLoaded: boolean;
  isRoverConnected: boolean;
  isInferencing: boolean;
}

export const LatestPrediction: React.FC<LatestPredictionProps> = ({
  prediction,
  predictionMode,
  modelLoaded,
  isRoverConnected,
  isInferencing,
}) => {
  const [modalImageOpen, setModalImageOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // If no prediction exists yet
  if (!prediction) {
    if (predictionMode === 'standalone') {
      return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-inner">
            <Leaf className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Awaiting Tomato Specimen</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
              Upload a leaf photo or start your laptop webcam to run instant in-browser AI diagnosis.
            </p>
          </div>
          <div className="text-[11px] text-emerald-700 font-mono bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-semibold">
            Mode A: Standalone AI Ready
          </div>
        </div>
      );
    }

    if (!isRoverConnected) {
      return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 shadow-inner">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Waiting for Raspberry Pi</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
              Raspberry Pi is currently offline. Switch to Standalone Mode above to analyze leaves immediately on your computer.
            </p>
          </div>
          <div className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            RPi Standby
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-inner">
          <Radio className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Awaiting RPi Camera Frame</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
            Click 'Capture Now' or enable Auto Capture in the live camera feed to diagnose a leaf.
          </p>
        </div>
        <div className="text-[11px] text-emerald-700 font-mono bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-semibold">
          Mode B: RPi Connected
        </div>
      </div>
    );
  }

  const isHealthy = prediction.disease.toLowerCase() === 'healthy';
  const isTomato = prediction.is_tomato;
  const confidencePercent = prediction.percentage;
  const formattedTime = new Date(prediction.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const imgSrc = prediction.thumbnail_base64 || (prediction.image_url ? api.getImageUrl(prediction.image_url) : '');

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Latest Prediction</h3>
            <p className="text-[11px] text-slate-500">
              {predictionMode === 'standalone'
                ? 'Client-Side ONNX Neural Network'
                : 'Edge Inference via Raspberry Pi 4'}
            </p>
          </div>
        </div>

        {/* Inference Latency & Mode Pill */}
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            {prediction.inference_time_ms} ms
          </span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            {predictionMode === 'standalone' ? 'WASM' : 'RPi'}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Main Result Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-emerald-100/80">
          <div className="flex items-center gap-4">
            {/* Captured Leaf Thumbnail */}
            <div 
              onClick={() => setModalImageOpen(true)}
              className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-emerald-500/40 shadow-xs shrink-0 cursor-pointer group bg-slate-900 flex items-center justify-center"
            >
              {!imageFailed && imgSrc ? (
                <img
                  src={imgSrc}
                  alt="Captured leaf"
                  onError={() => setImageFailed(true)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-emerald-400 p-1">
                  <Leaf className="w-7 h-7" />
                  <span className="text-[8px] text-slate-400 mt-0.5 font-mono">Archived</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Maximize2 className="w-4 h-4" />
              </div>
            </div>

            {/* Diagnosis & Classification */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase bg-emerald-100 text-emerald-800 border border-emerald-200/80">
                  {prediction.plant}
                </span>

                {isTomato && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200/80 flex items-center gap-1">
                    <span>🍅</span> Tomato Target
                  </span>
                )}

                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 ${
                    isHealthy
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {isHealthy ? <CheckCircle className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                  {isHealthy ? 'Healthy Specimen' : 'Pathogen Detected'}
                </span>
              </div>

              {/* Disease Name */}
              <h4 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {prediction.disease}
              </h4>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formattedTime}
                </span>
                <span>•</span>
                <span className="font-mono text-[11px]">Class: {prediction.predicted_class}</span>
              </div>
            </div>
          </div>

          {/* Big Confidence Score Pill */}
          <div className="text-right sm:border-l sm:border-slate-200/80 sm:pl-5 shrink-0">
            <span className="text-[11px] text-slate-500 uppercase font-semibold tracking-wider block">
              Confidence
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">
                {confidencePercent.toFixed(1)}
              </span>
              <span className="text-sm font-bold text-emerald-600">%</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Raw: {prediction.confidence.toFixed(4)}
            </span>
          </div>
        </div>

        {/* Agricultural Disclaimer Alert */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong className="font-semibold text-slate-700">Advisory:</strong> {prediction.disclaimer}
          </p>
        </div>
      </div>

      {/* Modal for Full Image View */}
      {modalImageOpen && (
        <div 
          onClick={() => setModalImageOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 p-2 shadow-2xl"
          >
            <button 
              onClick={() => setModalImageOpen(false)}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            {!imageFailed && imgSrc ? (
              <img
                src={imgSrc}
                alt="Enlarged captured leaf"
                onError={() => setImageFailed(true)}
                className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
              />
            ) : (
              <div className="w-full py-16 flex flex-col items-center justify-center text-center bg-slate-800/80 rounded-xl border border-slate-700/60 p-6 space-y-3">
                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-700/50 text-emerald-400">
                  <Leaf className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Specimen Saved in Archive</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Captured specimen for <code className="text-emerald-400 font-mono text-[11px]">{prediction.display_name}</code>
                  </p>
                </div>
              </div>
            )}
            <div className="p-3 text-white text-xs font-mono flex items-center justify-between">
              <span>{prediction.display_name}</span>
              <span>{prediction.percentage.toFixed(1)}% Confidence</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
