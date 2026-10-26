import React, { useState } from 'react';
import { Image as ImageIcon, Maximize2, X, Clock, Leaf } from 'lucide-react';
import { PredictionRecord } from '../types';
import { api } from '../api/client';

interface RecentImagesProps {
  records: PredictionRecord[];
}

export const RecentImages: React.FC<RecentImagesProps> = ({ records }) => {
  const [selectedRecord, setSelectedRecord] = useState<PredictionRecord | null>(null);

  // Filter records that have images
  const imageRecords = records.filter((r) => r.image_url);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Recent Captured Images</h3>
            <p className="text-[11px] text-slate-500">Field Rover Photo Log</p>
          </div>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          {imageRecords.length} stored
        </span>
      </div>

      {/* Gallery Cards */}
      <div className="p-5">
        {imageRecords.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No leaf photos captured yet. Run a prediction to store imagery.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {imageRecords.slice(0, 6).map((rec) => {
              const formattedTime = new Date(rec.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={rec.id}
                  onClick={() => setSelectedRecord(rec)}
                  className="group relative bg-slate-50 border border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:border-emerald-500/60 hover:shadow-md transition-all flex flex-col"
                >
                  <div className="aspect-square bg-slate-900 relative overflow-hidden">
                    <img
                      src={api.getImageUrl(rec.image_url)}
                      alt={rec.disease}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                    <span className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur text-emerald-400 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold">
                      {(rec.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="p-2 space-y-0.5">
                    <p className="text-[11px] font-bold text-slate-800 truncate" title={rec.disease}>
                      {rec.disease}
                    </p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formattedTime}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedRecord && selectedRecord.image_url && (
        <div
          onClick={() => setSelectedRecord(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden p-3 shadow-2xl"
          >
            <button
              onClick={() => setSelectedRecord(null)}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={api.getImageUrl(selectedRecord.image_url)}
              alt="Enlarged captured leaf"
              className="w-full h-auto max-h-[70vh] object-contain rounded-xl"
            />
            <div className="p-4 bg-slate-900 text-white space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                    {selectedRecord.plant}
                  </span>
                  <h4 className="text-base font-bold text-white">{selectedRecord.disease}</h4>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    {(selectedRecord.confidence * 100).toFixed(1)}%
                  </span>
                  <p className="text-[10px] text-slate-400">Confidence</p>
                </div>
              </div>
              <div className="text-xs text-slate-400 flex items-center justify-between border-t border-slate-800 pt-2 font-mono">
                <span>Record #{selectedRecord.id}</span>
                <span>{new Date(selectedRecord.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
