import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { CompetencyReport } from '../types';
import { 
  Award, 
  CheckCircle2, 
  Printer, 
  ArrowLeft, 
  ShieldCheck, 
  FileCheck, 
  Lock, 
  Layers, 
  Building,
  BookOpen,
  Clock,
  AlertTriangle 
} from 'lucide-react';

interface CompetencyReportProps {
  sessionId: string;
  onNavigate: (view: string, id?: string) => void;
}

export const CompetencyReportPage: React.FC<CompetencyReportProps> = ({ sessionId, onNavigate }) => {
  const [report, setReport] = useState<CompetencyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.assessments.getReport(sessionId);
        setReport(res.report);
      } catch (e: any) {
        setError(e.message || 'Failed to generate competency report');
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [sessionId]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !report) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center text-slate-500">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mb-3" />
        <p>Generating formal NSQF Competency Profile...</p>
      </div>
    );
  }

  const isCertified = report.assessor_final_decision === 'CERTIFIED';

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Controls */}
      <div className="flex justify-between items-center no-print">
        <button
          onClick={() => onNavigate('assessment-session', sessionId)}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Checklist</span>
        </button>

        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center space-x-1.5"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Export Certificate Profile</span>
        </button>
      </div>

      {/* Official Certificate & Competency Document */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-lg p-8 sm:p-12 space-y-8 relative overflow-hidden">
        {/* Certificate Decorative Border Header */}
        <div className="border-b-2 border-indigo-900 pb-6 text-center space-y-2">
          <div className="inline-flex items-center space-x-2 text-indigo-900 font-bold text-sm tracking-wider uppercase">
            <Award className="w-6 h-6 text-amber-500" />
            <span>National Council for Vocational Education and Training (NCVET)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            RECOGNITION OF PRIOR LEARNING (RPL)
          </h1>
          <div className="text-sm font-semibold text-indigo-700">
            OFFICIAL NSQF COMPETENCY PROFILE & ASSESSMENT REPORT
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Report Serial: {report.report_id} • Session: {report.session_id.slice(0, 8)}
          </div>
        </div>

        {/* Candidate & Qualification Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
          <div className="space-y-1.5 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">Candidate Details</span>
            <div><strong>Candidate Name:</strong> {report.candidate.name}</div>
            <div><strong>Email Address:</strong> {report.candidate.email}</div>
            <div><strong>Aadhaar (Last 4):</strong> ****{report.candidate.aadhaar_last_four || 'XXXX'}</div>
            <div><strong>State / Region:</strong> {report.candidate.state || 'India'}</div>
          </div>

          <div className="space-y-1.5 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">Target Qualification</span>
            <div><strong>Qualification:</strong> {report.qualification.title}</div>
            <div><strong>NSQF Level:</strong> {report.qualification.nsqf_level}</div>
            <div><strong>NQR Code:</strong> {report.qualification.nqr_code || 'N/A'}</div>
            <div><strong>Awarding Body:</strong> {report.qualification.awarding_body || 'MSME Technology Centre'}</div>
            <div><strong>Credits:</strong> {report.qualification.credits || 20.0} • <strong>Hours:</strong> {report.qualification.notional_hours || 600} hrs</div>
          </div>
        </div>

        {/* Score Summary Metrics */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Assessed Score Performance Summary
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-500 font-medium block">Theory Evaluation</span>
              <div className="text-xl font-extrabold text-slate-900 mt-1">
                {report.score_summary.theory.percentage}%
              </div>
              <span className="text-[11px] text-slate-500">
                ({report.score_summary.theory.obtained} / {report.score_summary.theory.max} pts)
              </span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-500 font-medium block">Practical Evaluation</span>
              <div className="text-xl font-extrabold text-slate-900 mt-1">
                {report.score_summary.practical.percentage}%
              </div>
              <span className="text-[11px] text-slate-500">
                ({report.score_summary.practical.obtained} / {report.score_summary.practical.max} pts)
              </span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-500 font-medium block">Overall Aggregate</span>
              <div className="text-xl font-extrabold text-indigo-700 mt-1">
                {report.score_summary.overall.percentage}%
              </div>
              <span className="text-[11px] text-slate-500">
                ({report.score_summary.overall.obtained} / {report.score_summary.overall.max} pts)
              </span>
            </div>
          </div>
        </div>

        {/* NOS-Wise Competency Breakdown Table */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Module-Wise National Occupational Standards (NOS) Competency Breakdown
          </h2>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">NOS Code</th>
                  <th className="py-2.5 px-3">Module Name</th>
                  <th className="py-2.5 px-3 text-center">Criteria Assessed</th>
                  <th className="py-2.5 px-3 text-right">Theory Marks</th>
                  <th className="py-2.5 px-3 text-right">Practical Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.nos_breakdown.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{row.nos_code}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{row.nos_title}</td>
                    <td className="py-2.5 px-3 text-center">{row.assessed_count} / {row.criteria_count}</td>
                    <td className="py-2.5 px-3 text-right">{row.theory_score} / {row.max_theory}</td>
                    <td className="py-2.5 px-3 text-right font-medium">{row.practical_score} / {row.max_practical}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* NCVET 12-Hour Mandatory Orientation & Bridge Course Prescription */}
        {report.orientation_and_bridge_plan && (
          <div className="p-5 bg-gradient-to-br from-indigo-50/70 to-blue-50/50 rounded-xl border border-indigo-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-indigo-700" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                  NCVET Mandatory 12-Hour Orientation & Bridge Course Prescription
                </h2>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                report.orientation_and_bridge_plan.status === 'ORIENTATION_COMPLETED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {report.orientation_and_bridge_plan.status.replace(/_/g, ' ')}
              </span>
            </div>

            <p className="text-xs text-slate-700">
              <strong>Prescribed Recommendation:</strong> {report.orientation_and_bridge_plan.prescribed_action}
            </p>

            {/* Standard 12-Hour Orientation Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
              {report.orientation_and_bridge_plan.orientation_modules.map((m, idx) => (
                <div key={idx} className="bg-white/80 p-2.5 rounded-lg border border-indigo-100 shadow-2xs space-y-1">
                  <div className="flex items-center text-indigo-800 font-semibold">
                    <Clock className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                    <span>{m.hours} Hours</span>
                  </div>
                  <p className="text-slate-600 line-clamp-2">{m.module_name}</p>
                </div>
              ))}
            </div>

            {/* Specific Remedial Bridge Modules if candidate has gaps */}
            {report.orientation_and_bridge_plan.bridge_modules.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-2">
                <div className="flex items-center text-amber-900 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 mr-1 text-amber-600" />
                  <span>Targeted NOS Bridge Upskilling Modules (Prior to Re-assessment):</span>
                </div>
                <div className="space-y-1.5">
                  {report.orientation_and_bridge_plan.bridge_modules.map((bm, idx) => (
                    <div key={idx} className="p-2 bg-white rounded border border-amber-100 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-slate-900">{bm.nos_code}: {bm.nos_title}</div>
                        <div className="text-[11px] text-amber-700">{bm.reasons.join(', ')}</div>
                      </div>
                      <span className="text-[11px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                        +{bm.recommended_bridge_hours}h Bridge
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-[10px] text-slate-400 font-mono italic">
              Governed by: {report.orientation_and_bridge_plan.ncvet_mandate_reference}
            </div>
          </div>
        )}

        {/* Evidence Manifest */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Verified Practical Evidence Manifest
          </h2>
          {report.evidence_manifest.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No external digital evidence files linked.</p>
          ) : (
            <div className="space-y-1.5">
              {report.evidence_manifest.map((ev, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-slate-800">• {ev.title}</span>
                    <span className="text-slate-500 ml-2 uppercase font-mono">[{ev.evidence_type}]</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Attached: {ev.uploaded_at?.slice(0, 10)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assessor Sign-Off & Binding Certification Stamp */}
        <div className="border-t-2 border-slate-200 pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs uppercase font-bold text-slate-400 block mb-1">
                Authorized Assessor Final Binding Decision
              </span>
              <div className="flex items-center space-x-2">
                <span className={`text-lg font-extrabold px-3 py-1 rounded-md ${
                  isCertified ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                }`}>
                  {report.assessor_final_decision || 'PENDING ASSESSOR SIGN-OFF'}
                </span>
                {isCertified && (
                  <span className="text-xs font-semibold text-emerald-700 flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1" /> NSQF Competencies Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-2 italic">
                "{report.assessor_remarks || 'Pending final assessor evaluation notes.'}"
              </p>
            </div>

            <div className="text-right text-xs space-y-1">
              <div><strong>Evaluator:</strong> {report.assessment_details.assessor_name}</div>
              <div><strong>Signed Off:</strong> {report.assessment_details.signed_off_at ? new Date(report.assessment_details.signed_off_at).toLocaleString() : 'N/A'}</div>
              <div><strong>Location:</strong> {report.assessment_details.location}</div>
            </div>
          </div>

          {/* Tamper-Evident SHA256 Signature Stamp & Digital Verification QR Code */}
          <div className="flex flex-col md:flex-row items-center gap-4 p-4 bg-slate-950 text-slate-300 rounded-xl">
            {report.audit_verification.qr_code_data_uri && (
              <div className="flex flex-col items-center p-2 bg-white rounded-lg shadow-sm shrink-0">
                <img
                  src={report.audit_verification.qr_code_data_uri}
                  alt="NCVET Verification QR"
                  className="w-24 h-24 object-contain"
                />
                <span className="text-[9px] font-bold text-slate-700 uppercase tracking-tighter mt-1">
                  Scan to Verify
                </span>
              </div>
            )}

            <div className="space-y-1.5 font-mono text-[11px] flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start space-x-1.5 text-amber-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>CRYPTOGRAPHIC AUDIT SIGNATURE (TAMPER-EVIDENT):</span>
              </div>
              <div className="break-all text-slate-400">
                {report.assessment_details.signature_hash || 'SHA256: UNSIGNED_DRAFT_ASSESSMENT'}
              </div>
              {report.audit_verification.verification_url && (
                <div className="pt-1 text-[10px] text-slate-400 flex flex-wrap items-center justify-center md:justify-start gap-1">
                  <span>Registry URL:</span>
                  <a
                    href={report.audit_verification.verification_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 underline break-all"
                  >
                    {report.audit_verification.verification_url}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
