import React, { useState } from 'react';
import { 
  Sprout, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  FileDown, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Bug, 
  FlaskConical, 
  Leaf, 
  Calendar 
} from 'lucide-react';
import { getDiseaseDetails, DiseaseDetails } from '../data/diseaseInfo';

interface TreatmentCardProps {
  diseaseName: string;
  confidence: number;
  plantName?: string;
  inferenceTimeMs?: number;
  sourceMode?: string;
}

export const TreatmentCard: React.FC<TreatmentCardProps> = ({
  diseaseName,
  confidence,
  plantName = 'Tomato',
  inferenceTimeMs,
  sourceMode = 'Standalone AI Mode',
}) => {
  const details: DiseaseDetails = getDiseaseDetails(diseaseName);
  const [expanded, setExpanded] = useState<boolean>(true);

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'Severe':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'High':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  const handleDownloadReport = () => {
    const reportText = `=====================================================
AGRI ROVER AI - CROP PATHOLOGY & TREATMENT REPORT
=====================================================
Date & Time: ${new Date().toLocaleString()}
Inference Mode: ${sourceMode}
Plant Crop: ${details.plant}
Diagnosis: ${details.disease}
Confidence: ${(confidence * 100).toFixed(2)}%
Status: ${details.isHealthy ? 'HEALTHY' : 'DISEASED / PATHOGEN DETECTED'}
Pathogen Type: ${details.pathogenType}
Severity Level: ${details.severity}
${details.scientificName ? `Scientific Name: ${details.scientificName}\n` : ''}
-----------------------------------------------------
SYMPTOM PROFILE:
${details.symptoms.map((s) => ` • ${s}`).join('\n')}

-----------------------------------------------------
ORGANIC & BIOLOGICAL TREATMENT:
${details.organicTreatment.map((t) => ` • ${t}`).join('\n')}

-----------------------------------------------------
CHEMICAL & FUNGICIDAL INTERVENTION:
${details.chemicalTreatment.map((t) => ` • ${t}`).join('\n')}

-----------------------------------------------------
PREVENTION & CULTURAL PRACTICES:
${details.prevention.map((p) => ` • ${p}`).join('\n')}

=====================================================
DISCLAIMER: AI agricultural diagnostics are recommendations based on computer vision models and should be verified alongside certified field agronomy inspection.
=====================================================`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AgriRover_Report_${details.disease.replace(/\s+/g, '_')}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/70 to-slate-50 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              Agronomic Diagnosis &amp; Recommended Treatment
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getSeverityBadgeClass(
                  details.severity
                )}`}
              >
                {details.severity === 'None' ? 'Optimal' : `${details.severity} Risk`}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Actionable field guidance for {details.plant} growers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadReport();
            }}
            title="Download Treatment Report"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Report</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-5 space-y-5 text-xs">
          {/* Top Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Pathogen Agent</span>
              <p className="text-slate-800 font-bold text-sm flex items-center gap-1.5">
                <Bug className="w-4 h-4 text-emerald-600" />
                {details.pathogenType}
              </p>
              {details.scientificName && (
                <span className="text-[11px] text-slate-500 italic block">{details.scientificName}</span>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Crop Condition</span>
              <p className="text-slate-800 font-bold text-sm flex items-center gap-1.5">
                {details.isHealthy ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Healthy Foliage</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span className="text-rose-700">Infection Present</span>
                  </>
                )}
              </p>
              <span className="text-[11px] text-slate-500 font-mono">Confidence: {(confidence * 100).toFixed(1)}%</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Recommended Action</span>
              <p className="text-slate-800 font-bold text-sm flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                {details.isHealthy ? 'Routine Scouting' : 'Immediate Spray'}
              </p>
              <span className="text-[11px] text-slate-500">
                {details.isHealthy ? 'No urgent intervention' : 'Treat within 24-48 hours'}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-700 leading-relaxed">
            <h4 className="font-bold text-slate-800 text-xs mb-1">Pathology Overview:</h4>
            <p>{details.description}</p>
          </div>

          {/* Symptoms Checklist */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5 text-emerald-600" />
              Recognized Visual Symptoms:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {details.symptoms.map((symptom, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{symptom}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Treatment Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Organic Treatment */}
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
              <h4 className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-emerald-700" />
                Organic &amp; Biological Controls:
              </h4>
              <ul className="space-y-1.5 text-slate-700">
                {details.organicTreatment.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Chemical Treatment */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4 text-emerald-700" />
                Chemical &amp; Synthetic Treatments:
              </h4>
              <ul className="space-y-1.5 text-slate-700">
                {details.chemicalTreatment.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-slate-500 font-bold mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Preventive Protocol */}
          <div className="p-3.5 rounded-xl bg-slate-100/70 border border-slate-200 space-y-1.5">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Long-Term Preventive Management:
            </h4>
            <div className="flex flex-wrap gap-2 pt-1">
              {details.prevention.map((prev, idx) => (
                <span
                  key={idx}
                  className="bg-white px-2.5 py-1 rounded-md border border-slate-200 text-slate-700 text-xs shadow-2xs font-medium"
                >
                  ✓ {prev}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
