import React, { useState } from 'react';
import { Image as ImageIcon, Maximize2, X, Clock, Leaf, HardDrive } from 'lucide-react';
import { PredictionRecord } from '../types';
import { api } from '../api/client';

interface RecentImagesProps {
  records: PredictionRecord[];
}

export const RecentImages: React.FC<RecentImagesProps> = ({ records }) => {
  const [selectedRecord, setSelectedRecord] = useState<PredictionRecord | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string | number, boolean>>({});

  // Filter records that have either image_url or thumbnail_base64
  const imageRecords = records.filter((r) => r.image_url || r.thumbnail_base64);

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
              const isFailed = !!failedImages[rec.id];
              const imgSrc = rec.thumbnail_base64 || (rec.image_url ? api.getImageUrl(rec.image_url) : '');

              return (
                <div
                  key={rec.id}
                  onClick={() => setSelectedRecord(rec)}
                  className="group relative bg-slate-50 border border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:border-emerald-500/60 hover:shadow-md transition-all flex flex-col"
                >
                  <div className="aspect-square bg-slate-900 relative overflow-hidden flex items-center justify-center">
                    {!isFailed && imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={rec.disease}
                        onError={() => setFailedImages((prev) => ({ ...prev, [rec.id]: true }))}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950/40 text-slate-300">
                        <div className="w-8 h-8 rounded-lg bg-emerald-900/60 border border-emerald-600/40 flex items-center justify-center text-emerald-400 mb-1 shadow-inner">
                          <Leaf className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-200 truncate max-w-[90%]">
                          {rec.plant || 'Specimen'}
                        </span>
                        <span className="text-[8px] text-emerald-400/80 font-mono tracking-wide">
                          FIELD LOG
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                    <span className="absolute top-1.5 right-1.5 bg-black/75 backdrop-blur text-emerald-400 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shadow-xs">
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
      {selectedRecord && (
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

            {/* Modal Image or Graceful Placeholder */}
            {selectedRecord.thumbnail_base64 || (!failedImages[selectedRecord.id] && selectedRecord.image_url) ? (
              <img
                src={selectedRecord.thumbnail_base64 || api.getImageUrl(selectedRecord.image_url)}
                alt="Enlarged captured leaf"
                onError={() => setFailedImages((prev) => ({ ...prev, [selectedRecord.id]: true }))}
                className="w-full h-auto max-h-[70vh] object-contain rounded-xl bg-black/40"
              />
            ) : (
              <div className="w-full py-12 flex flex-col items-center justify-center text-center bg-slate-800/80 rounded-xl border border-slate-700/60 p-6 space-y-3">
                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-700/50 text-emerald-400">
                  <Leaf className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Image Stored Locally on Rover</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    File <code className="text-emerald-400 font-mono text-[11px]">{selectedRecord.image_filename || 'capture.jpg'}</code> was captured and archived in the rover's local storage.
                  </p>
                </div>
                <div className="text-[11px] text-amber-300/90 bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-800/40">
                  Connect the rover's Cloudflare Tunnel URL in Settings to view full-resolution imagery remotely.
                </div>
              </div>
            )}

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
