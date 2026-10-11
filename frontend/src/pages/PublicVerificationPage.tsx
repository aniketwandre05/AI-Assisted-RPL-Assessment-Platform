import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Award, 
  CheckCircle2, 
  ArrowLeft, 
  Printer, 
  Lock, 
  Building, 
  ExternalLink 
} from 'lucide-react';

interface PublicVerificationPageProps {
  signatureHash: string;
  onNavigate: (view: string) => void;
}

export const PublicVerificationPage: React.FC<PublicVerificationPageProps> = ({ signatureHash, onNavigate }) => {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVerification = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.assessments.verifyCertificate(signatureHash);
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Certificate signature hash could not be verified on the national registry.');
      } finally {
        setIsLoading(false);
      }
    };

    if (signatureHash) {
      fetchVerification();
    } else {
      setIsLoading(false);
      setError('No certificate signature hash provided for verification.');
    }
  }, [signatureHash]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-20 px-4 text-center text-slate-500">
        <div className="inline-block animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mb-4" />
        <h2 className="text-lg font-bold text-slate-800">Verifying Digital Credential Signature...</h2>
        <p className="text-xs text-slate-500 mt-1">Cross-referencing cryptographic audit ledger on NCVET registry</p>
      </div>
    );
  }

  if (error || !data || !data.is_valid) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-red-200 shadow-md p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-red-900">Certificate Verification Failed</h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            {error || data?.message || 'The provided digital signature hash does not match any official assessment record on the national registry.'}
          </p>
          <div className="p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-500 break-all border border-slate-200">
            Hash: {signatureHash || 'UNKNOWN'}
          </div>
          <div className="pt-4 flex justify-center space-x-3">
            <button
              onClick={() => onNavigate('landing')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Portal Homepage</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCertified = data.assessment_outcome?.final_decision === 'CERTIFIED';

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top action header */}
      <div className="flex justify-between items-center no-print">
        <button
          onClick={() => onNavigate('landing')}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center space-x-1.5"
        >
          <Printer className="w-4 h-4" />
          <span>Print Verification Record</span>
        </button>
      </div>

      {/* Main Verification Card */}
      <div className="bg-white rounded-2xl border-2 border-emerald-500 shadow-xl overflow-hidden">
        {/* Verification Status Banner */}
        <div className="bg-emerald-600 text-white p-6 sm:p-8 text-center space-y-2">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-xs">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <span className="text-xs font-bold tracking-widest uppercase bg-emerald-700/60 px-3 py-1 rounded-full inline-block">
            {data.is_draft ? 'PROVISIONAL DRAFT ASSESSMENT RECORD' : 'OFFICIAL NCVET RPL CERTIFICATION VERIFIED'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isCertified ? 'Authentic NSQF Certified Qualification' : 'Official Registered Assessment Record'}
          </h1>
          <p className="text-xs text-emerald-100 max-w-lg mx-auto">
            This digital credential has been verified against the National Council for Vocational Education and Training (NCVET) registry.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Certificate Identification */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-2 text-xs">
            <div>
              <span className="text-slate-400 font-semibold uppercase tracking-wider block">Certificate ID</span>
              <span className="text-base font-bold text-slate-900 font-mono">{data.certificate_id}</span>
            </div>
            <div className="sm:text-right">
              <span className="text-slate-400 font-semibold uppercase tracking-wider block">Verification Timestamp</span>
              <span className="text-slate-600 font-mono">{new Date(data.verification_timestamp).toLocaleString()}</span>
            </div>
          </div>

          {/* Candidate & Qualification Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <span className="text-slate-500 font-bold uppercase tracking-wider block mb-1">Candidate Credentials</span>
              <div><strong>Name:</strong> <span className="text-slate-900">{data.candidate?.name}</span></div>
              <div><strong>Aadhaar:</strong> <span className="font-mono text-slate-700">{data.candidate?.masked_aadhaar}</span></div>
              <div><strong>State / Region:</strong> <span className="text-slate-700">{data.candidate?.state || 'India'}</span></div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <span className="text-slate-500 font-bold uppercase tracking-wider block mb-1">Qualification Framework</span>
              <div><strong>Title:</strong> <span className="text-slate-900 font-semibold">{data.qualification?.title}</span></div>
              <div><strong>NSQF Level:</strong> <span className="font-bold text-indigo-700">Level {data.qualification?.nsqf_level}</span></div>
              <div><strong>Sector:</strong> <span className="text-slate-700">{data.qualification?.sector}</span></div>
              <div><strong>NQR Code:</strong> <span className="font-mono text-slate-700">{data.qualification?.nqr_code || 'N/A'}</span></div>
            </div>
          </div>

          {/* Assessed Score Performance */}
          <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold uppercase tracking-wider text-indigo-950">Assessment Outcome</span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                isCertified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {data.assessment_outcome?.final_decision?.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                <span className="text-[11px] text-slate-500 block">Theory Evaluation</span>
                <span className="text-base font-extrabold text-slate-900">{data.assessment_outcome?.theory_percentage}%</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                <span className="text-[11px] text-slate-500 block">Practical Evaluation</span>
                <span className="text-base font-extrabold text-slate-900">{data.assessment_outcome?.practical_percentage}%</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                <span className="text-[11px] text-slate-500 block">Overall Score</span>
                <span className="text-base font-extrabold text-indigo-600">{data.assessment_outcome?.overall_percentage}%</span>
              </div>
            </div>
          </div>

          {/* Evaluator Sign-off & Cryptographic Stamp */}
          <div className="p-4 bg-slate-900 text-slate-300 rounded-xl space-y-2 text-xs">
            <div className="flex items-center space-x-2 text-amber-400 font-bold">
              <Lock className="w-4 h-4" />
              <span>CRYPTOGRAPHIC AUDIT SIGNATURE (SHA-256)</span>
            </div>
            <div className="font-mono text-[11px] break-all text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              {data.assessment_outcome?.signature_hash || signatureHash}
            </div>
            <div className="flex flex-wrap justify-between text-[11px] text-slate-400 pt-1">
              <span>Certified by: <strong>{data.assessment_outcome?.assessor_name}</strong></span>
              {data.assessment_outcome?.certified_date && (
                <span>Signed at: {new Date(data.assessment_outcome.certified_date).toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
