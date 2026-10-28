import React from 'react';
import { Cpu, CheckCircle2, Layers, AlertCircle, FileText, Code2, Tag } from 'lucide-react';
import { ModelInfo } from '../types';

interface ModelInfoModalProps {
  modelInfo: ModelInfo | null;
}

export const ModelInfoModal: React.FC<ModelInfoModalProps> = ({ modelInfo }) => {
  if (!modelInfo) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
        Loading model specifications...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Model Architecture &amp; Specifications</h3>
            <p className="text-xs text-slate-500">TensorFlow Lite Edge Vision Engine</p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
            modelInfo.loaded
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {modelInfo.loaded ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Active in Memory
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              Unavailable
            </>
          )}
        </span>
      </div>

      {/* Hardware / Model Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Backbone</span>
          <p className="font-bold text-slate-800 text-sm">{modelInfo.architecture}</p>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Input Tensor</span>
          <p className="font-bold text-slate-800 text-sm font-mono">
            {JSON.stringify(modelInfo.input_shape)} ({modelInfo.input_dtype})
          </p>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Output Tensor</span>
          <p className="font-bold text-slate-800 text-sm font-mono">
            {JSON.stringify(modelInfo.output_shape)} ({modelInfo.output_dtype})
          </p>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Classes</span>
          <p className="font-bold text-emerald-700 text-sm">
            {modelInfo.total_classes} ({modelInfo.tomato_classes_count} Tomato)
          </p>
        </div>
      </div>

      {/* Preprocessing Specifications */}
      <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs space-y-2">
        <h4 className="font-bold text-emerald-900 flex items-center gap-1.5">
          <Code2 className="w-4 h-4 text-emerald-700" />
          Validated Preprocessing Pipeline
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-600 font-mono text-[11px]">
          <div className="bg-white p-2 rounded border border-emerald-200/60">
            <strong>Color Format:</strong> RGB (cv2.BGR2RGB)
          </div>
          <div className="bg-white p-2 rounded border border-emerald-200/60">
            <strong>Target Dimensions:</strong> 224 x 224 pixels
          </div>
          <div className="bg-white p-2 rounded border border-emerald-200/60">
            <strong>Normalization:</strong> (img / 127.5) - 1.0 [-1, 1]
          </div>
        </div>
      </div>

      {/* Class Labels Mapping Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-emerald-600" />
            Class Labels Output Index Mapping (class_names.json)
          </h4>
          <span className="text-xs text-slate-400 font-mono">{modelInfo.total_classes} Classes Ordered</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-y-auto pr-1">
          {modelInfo.classes.map((cls, idx) => {
            const isTomato = cls.toLowerCase().startsWith('tomato');
            return (
              <div
                key={cls}
                className={`flex items-center justify-between p-2 rounded-lg border text-xs font-mono transition-colors ${
                  isTomato
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                      isTomato ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {idx}
                  </span>
                  <span className="truncate" title={cls}>
                    {cls}
                  </span>
                </div>

                {isTomato && (
                  <span className="text-[9px] uppercase font-bold text-emerald-700 bg-emerald-100 px-1 rounded ml-1 shrink-0">
                    Tomato
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
