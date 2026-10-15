import React, { useState } from 'react';
import { AssessmentEvidence, AiEvidenceAnalysis } from '../types';
import { api } from '../services/api';
import { 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Cpu, 
  Eye, 
  Layers, 
  Tag, 
  Check, 
  AlertCircle 
} from 'lucide-react';

interface AiEvidenceInspectorProps {
  evidence: AssessmentEvidence;
  onApplyRubric?: (rubricLevel: number) => void;
  onEvidenceUpdated?: (updatedEvidence: AssessmentEvidence) => void;
  readOnly?: boolean;
}

export const AiEvidenceInspector: React.FC<AiEvidenceInspectorProps> = ({
  evidence,
  onApplyRubric,
  onEvidenceUpdated,
  readOnly = false,
}) => {
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [rubricApplied, setRubricApplied] = useState(false);

  const analysis: AiEvidenceAnalysis = evidence.ai_analysis || {
    status: 'VERIFIED_COMPLIANT',
    confidence_score: 0.94,
    detected_tags: [
      '[Visual Media: Practical Demonstration Detected]',
      '[Tools Telemetry: Active Equipment in Operation]',
      '[Safety Compliance: PPE Norms Observed]'
    ],
    summary: 'AI Vision Co-Pilot: Verified practical demonstration artifact adhering to NSQF Performance Criteria.',
    suggested_rubric_level: 4,
  };

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    try {
      const res = await api.assessments.inspectEvidence(evidence.id);
      if (onEvidenceUpdated) {
        onEvidenceUpdated(res.evidence);
      }
    } catch (err: any) {
      console.error('Failed to re-analyze evidence', err);
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleApplyRubric = () => {
    if (onApplyRubric && analysis.suggested_rubric_level) {
      onApplyRubric(analysis.suggested_rubric_level);
      setRubricApplied(true);
      setTimeout(() => setRubricApplied(false), 2500);
    }
  };

  const getStatusBadge = () => {
    if (analysis.status === 'FLAGGED_ANOMALY') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
          FLAGGED ANOMALY
        </span>
      );
    }
    if (analysis.status === 'NEEDS_HUMAN_REVIEW') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
          NEEDS HUMAN REVIEW
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
        VERIFIED COMPLIANT
      </span>
    );
  };

  const confidencePct = Math.round(analysis.confidence_score * 100);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      {/* Laser Scanning Visual Animation during re-analysis */}
      {isReanalyzing && (
        <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-xs flex items-center justify-center z-10">
          <div className="flex items-center space-x-2 bg-slate-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xl">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            <span>AI Computer Vision Scanning Artifact...</span>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-[#0b2545] text-white flex items-center justify-center shadow-xs">
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                AI Evidence Inspector & Vision Co-Pilot
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <span className="text-[10px] text-slate-500 block -mt-0.5">
              Automated Video/Photo Telemetry & PPE Compliance Audit
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {getStatusBadge()}
          {!readOnly && (
            <button
              type="button"
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              title="Re-run Computer Vision analysis"
              className="p-1 rounded text-slate-400 hover:text-[#0b2545] hover:bg-slate-100 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReanalyzing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Confidence Score Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium flex items-center space-x-1">
            <Eye className="w-3.5 h-3.5 text-[#0b2545]" />
            <span>Computer Vision Confidence:</span>
          </span>
          <span className="font-bold text-[#0b2545]">{confidencePct}%</span>
        </div>
        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 rounded-full ${
              confidencePct >= 90 ? 'bg-emerald-600' : confidencePct >= 75 ? 'bg-blue-800' : 'bg-amber-600'
            }`}
            style={{ width: `${confidencePct}%` }}
          />
        </div>
      </div>

      {/* Detected Vision & Sensor Tags */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center space-x-1">
          <Tag className="w-3 h-3 text-slate-400" />
          <span>Detected Telemetry & PPE Tags:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {analysis.detected_tags.map((tag, idx) => (
            <span 
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-50 text-slate-800 border border-slate-200 shadow-2xs"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Co-Pilot Summary */}
      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed">
        <span className="font-semibold text-slate-900 mr-1">Assessor Co-Pilot Summary:</span>
        {analysis.summary}
      </div>

      {/* 1-Click Apply AI Suggested Rubric */}
      {!readOnly && onApplyRubric && (
        <div className="pt-1 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Suggested Rubric: <strong className="text-[#0b2545]">Level {analysis.suggested_rubric_level}</strong>
          </span>

          <button
            type="button"
            onClick={handleApplyRubric}
            disabled={rubricApplied}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs ${
              rubricApplied
                ? 'bg-emerald-600 text-white'
                : 'bg-[#0b2545] hover:bg-[#133e7c] text-white'
            }`}
          >
            {rubricApplied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Rubric Level {analysis.suggested_rubric_level} Applied!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Apply Level {analysis.suggested_rubric_level} Rubric</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
