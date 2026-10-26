import React, { useState } from 'react';
import { BarChart3, Info, Sparkles, Filter } from 'lucide-react';
import { PredictResponse, ClassPrediction } from '../types';

interface TopPredictionsProps {
  prediction: PredictResponse | null;
}

export const TopPredictions: React.FC<TopPredictionsProps> = ({ prediction }) => {
  const [viewMode, setViewMode] = useState<'overall' | 'tomato'>('overall');

  if (!prediction) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Top 3 Predictions</h3>
            <p className="text-[11px] text-slate-500">Confidence Distribution</p>
          </div>
        </div>
        <div className="py-8 text-center text-xs text-slate-400">
          Awaiting specimen prediction...
        </div>
      </div>
    );
  }

  const items: ClassPrediction[] =
    viewMode === 'overall'
      ? prediction.top_3_predictions
      : prediction.top_3_tomato_predictions;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Top 3 Predictions</h3>
            <p className="text-[11px] text-slate-500">
              {viewMode === 'overall' ? 'Highest Confidence Classes' : 'Tomato Specific Ranking'}
            </p>
          </div>
        </div>

        {/* Toggle between Overall and Tomato-only */}
        <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-xs font-medium">
          <button
            onClick={() => setViewMode('overall')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              viewMode === 'overall'
                ? 'bg-white text-emerald-800 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overall (27)
          </button>
          <button
            onClick={() => setViewMode('tomato')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              viewMode === 'tomato'
                ? 'bg-white text-emerald-800 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tomato (10)
          </button>
        </div>
      </div>

      {/* Prediction List with Progress Bars */}
      <div className="p-5 space-y-4">
        {items.map((item, index) => {
          const isHighest = index === 0;
          return (
            <div key={`${item.class_name}-${index}`} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                      isHighest
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {item.display_name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    #{item.original_index}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono">
                  <span
                    className={`font-bold ${
                      isHighest ? 'text-emerald-700 text-sm' : 'text-slate-600 text-xs'
                    }`}
                  >
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/50">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    isHighest
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600'
                      : 'bg-slate-400'
                  }`}
                  style={{ width: `${Math.max(2, Math.min(100, item.percentage))}%` }}
                />
              </div>
            </div>
          );
        })}

        {/* Calculation explanation note */}
        <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-400 shrink-0" />
          {viewMode === 'overall'
            ? 'Original softmax probabilities from TFLite 27-class MobileNetV2 output.'
            : 'Tomato ranking preserves original model confidence without arbitrary renormalizing.'}
        </p>
      </div>
    </div>
  );
};
