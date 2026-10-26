import React, { useState } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  Leaf, 
  Zap, 
  Maximize2, 
  X,
  Layers,
  HelpCircle
} from 'lucide-react';
import { PredictResponse } from '../types';
import { api } from '../api/client';

interface LatestPredictionProps {
  prediction: PredictResponse | null;
  modelLoaded: boolean;
  isInferencing: boolean;
}

export const LatestPrediction: React.FC<LatestPredictionProps> = ({
  prediction,
  modelLoaded,
  isInferencing,
}) => {
  const [modalImageOpen, setModalImageOpen] = useState(false);

  if (!modelLoaded) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200/80 p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-200">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">AI Model Unavailable</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            The TensorFlow Lite plant disease model is not currently loaded into memory. Check backend startup logs.
          </p>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-inner">
          <Leaf className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Awaiting Leaf Specimen</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Start the camera and enable Auto Capture, or click 'Capture Now' to run real-time inference on a leaf.
          </p>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          Model: MobileNetV2 (27 Classes)
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Latest Prediction</h3>
            <p className="text-[11px] text-slate-500">Real-Time TFLite Inference</p>
          </div>
        </div>

        {/* Inference Latency */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
          <span>{prediction.inference_time_ms} ms</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Main Result Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-emerald-100/80">
          <div className="flex items-center gap-4">
            {/* Captured Leaf Thumbnail */}
            {prediction.image_url ? (
              <div 
                onClick={() => setModalImageOpen(true)}
                className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-emerald-500/40 shadow-sm shrink-0 cursor-pointer group"
              >
                <img
                  src={api.getImageUrl(prediction.image_url)}
                  alt="Captured leaf"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Maximize2 className="w-4 h-4" />
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                <Leaf className="w-8 h-8" />
              </div>
            )}

            {/* Diagnosis & Classification */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isTomato
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/60'
                      : 'bg-amber-100 text-amber-800 border border-amber-300/60'
                  }`}
                >
                  {prediction.plant}
                </span>

                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    isHealthy
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {isHealthy ? 'Healthy Plant' : 'Pathology Detected'}
                </span>
              </div>

              <h4 className="text-lg font-bold text-slate-900 leading-tight">
                {prediction.disease}
              </h4>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Timestamp: {formattedTime}
              </p>
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

        {/* Tomato-Specific Ranking Section (if predicted class was non-tomato, highlight tomato alternative) */}
        {!isTomato && prediction.tomato_specific_prediction && (
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-amber-900 font-semibold">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Tomato Subset Diagnosis:
              </span>
              <span className="font-mono text-amber-700 font-bold">
                {prediction.tomato_specific_prediction.percentage.toFixed(1)}%
              </span>
            </div>
            <p className="text-amber-800 text-[11px]">
              The primary model detected a <strong>{prediction.plant}</strong> leaf. Restricting candidate classes to tomato diseases yields highest match:{' '}
              <strong className="text-amber-950 font-bold">
                {prediction.tomato_specific_prediction.disease}
              </strong>.
            </p>
          </div>
        )}

        {/* Agricultural Disclaimer Alert */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong className="font-semibold text-slate-700">Advisory:</strong> {prediction.disclaimer}
          </p>
        </div>
      </div>

      {/* Modal for Full Image View */}
      {modalImageOpen && prediction.image_url && (
        <div 
          onClick={() => setModalImageOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 p-2">
            <button 
              onClick={() => setModalImageOpen(false)}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={api.getImageUrl(prediction.image_url)}
              alt="Enlarged captured leaf"
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
            />
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
