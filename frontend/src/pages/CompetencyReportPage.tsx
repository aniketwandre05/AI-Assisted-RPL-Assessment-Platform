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
  Building 
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

          {/* Tamper-Evident SHA256 Signature Stamp */}
          <div className="p-3 bg-slate-950 text-slate-300 rounded-lg text-[11px] font-mono space-y-1">
            <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>CRYPTOGRAPHIC AUDIT SIGNATURE (TAMPER-EVIDENT):</span>
            </div>
            <div className="break-all text-slate-400">
              {report.assessment_details.signature_hash || 'SHA256: UNSIGNED_DRAFT_ASSESSMENT'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
