import React, { useState } from 'react';
import { 
  History, 
  Search, 
  CheckCircle2, 
  Clock, 
  Leaf, 
  RefreshCw,
  Inbox
} from 'lucide-react';
import { PredictionRecord } from '../types';
import { api } from '../api/client';

interface PredictionHistoryProps {
  records: PredictionRecord[];
  onRefresh: () => void;
  isLoading: boolean;
  isRoverOnline?: boolean;
}

export const PredictionHistory: React.FC<PredictionHistoryProps> = ({
  records,
  onRefresh,
  isLoading,
  isRoverOnline = false,
}) => {
  const [filterPlant, setFilterPlant] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredRecords = records.filter((rec) => {
    const matchesPlant =
      filterPlant === 'all' || rec.plant.toLowerCase() === filterPlant.toLowerCase();
    const matchesSearch =
      rec.predicted_class.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.disease.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.plant.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPlant && matchesSearch;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* Table Header & Controls */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Prediction History Log</h3>
            <p className="text-xs text-slate-500">
              {isRoverOnline
                ? 'Persistent Edge Database Records'
                : 'Local & Cloud Synced Specimen Records (Device Offline)'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Plant filter tabs */}
          <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-xs font-medium">
            {['all', 'tomato', 'potato', 'grape', 'mango', 'pepper'].map((p) => (
              <button
                key={p}
                onClick={() => setFilterPlant(p)}
                className={`px-2.5 py-1 rounded-md capitalize transition-all cursor-pointer ${
                  filterPlant === p
                    ? 'bg-white text-emerald-800 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search diagnosis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-36 sm:w-44 shadow-2xs"
            />
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Refresh history"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4"># ID</th>
              <th className="py-3 px-4">Specimen</th>
              <th className="py-3 px-4">Plant Crop</th>
              <th className="py-3 px-4">Predicted Diagnosis</th>
              <th className="py-3 px-4">Confidence</th>
              <th className="py-3 px-4">Tomato Scope</th>
              <th className="py-3 px-4">Source</th>
              <th className="py-3 px-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-14 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 max-w-sm mx-auto">
                    <div className="p-3 bg-slate-100 rounded-full text-slate-400">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-slate-700 text-sm">No Field Records Yet</p>
                    <p className="text-xs text-slate-500">
                      Archived disease scans will appear here once the Raspberry Pi captures its first specimen.
                    </p>
                  </div>
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                  No prediction records match the current filter criteria.
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => {
                const formattedDate = new Date(rec.timestamp).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const imgSrc = rec.thumbnail_base64 || (rec.image_url ? api.getImageUrl(rec.image_url) : '');

                return (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400">
                      #{rec.id}
                    </td>

                    <td className="py-3 px-4">
                      {imgSrc ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shadow-2xs bg-slate-900">
                          <img
                            src={imgSrc}
                            alt="Leaf"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Hide broken image smoothly
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                          <Leaf className="w-4 h-4" />
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 uppercase tracking-wider text-[10px] bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        {rec.plant}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{rec.disease}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {rec.predicted_class}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                      {(rec.confidence * 100).toFixed(1)}%
                    </td>

                    <td className="py-3 px-4">
                      {rec.is_tomato ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Tomato Target
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          Other Crop
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 capitalize font-mono text-slate-500 text-[11px]">
                      {rec.source}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {formattedDate}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
