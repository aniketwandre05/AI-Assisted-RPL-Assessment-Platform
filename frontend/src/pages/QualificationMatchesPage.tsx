import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { QualificationMatch, MatchingResult } from '../types';
import { 
  Layers, 
  Award, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw, 
  Wrench, 
  BookOpen, 
  HelpCircle,
  ShieldCheck 
} from 'lucide-react';

interface QualificationMatchesProps {
  onNavigate: (view: string, id?: string) => void;
}

export const QualificationMatchesPage: React.FC<QualificationMatchesProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [matchingResult, setMatchingResult] = useState<MatchingResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreatingSession, setIsCreatingSession] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.worker.triggerMatching(15.0);
      setMatchingResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to match qualifications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const handleCreateSession = async (qualId: string) => {
    setIsCreatingSession(qualId);
    try {
      const res = await api.assessments.createSession({
        qualification_id: qualId,
        worker_id: user?.id,
        location: 'Assessment Centre / Digital Workplace',
        session_date: new Date().toISOString().split('T')[0],
      });
      // Redirect directly to the assessment checklist session!
      onNavigate('assessment-session', res.session.id);
    } catch (err: any) {
      alert(err.message || 'Could not initiate assessment session.');
    } finally {
      setIsCreatingSession(null);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 text-[#0b2545] animate-spin mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Analyzing Your Trade Competencies...</h2>
        <p className="text-sm text-slate-500 mt-1">
          Comparing declared tasks and tools against 1,912 official NSQF qualifications...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-6 h-6 text-[#0b2545]" />
            <h1 className="text-xl font-bold text-slate-900">NSQF Qualification Match Results</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Explainable AI-assisted qualification alignment based on your declared practical tasks and tools.
          </p>
        </div>

        <button
          onClick={fetchMatches}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Re-run Alignment</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Explicit No-Match Case */}
      {matchingResult && !matchingResult.is_match_found && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-amber-900">No Confident Qualification Match Found</h2>
          <p className="text-sm text-amber-800 max-w-xl mx-auto">
            {matchingResult.reason}
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate('worker-profile')}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
            >
              Update Trade Tasks & Tools
            </button>
          </div>
        </div>
      )}

      {/* Matches List */}
      {matchingResult && matchingResult.is_match_found && (
        <div className="space-y-6">
          <div className="text-xs uppercase font-bold tracking-wider text-slate-500 px-1">
            Found {matchingResult.total_matches} Aligned National Qualification(s)
          </div>

          {matchingResult.matches.map((match) => (
            <div
              key={match.qualification_id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 hover:border-blue-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-slate-900">{match.title}</h3>
                    {match.is_synthetic ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        DEMO TRADE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center">
                        <ShieldCheck className="w-3 h-3 mr-1" /> NCVET VERIFIED
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <span><strong>Sector:</strong> {match.sector}</span>
                    <span><strong>Trade:</strong> {match.trade}</span>
                    <span><strong>NSQF Level:</strong> {match.nsqf_level}</span>
                    {match.nqr_code && <span><strong>NQR Code:</strong> {match.nqr_code}</span>}
                  </div>
                </div>

                {/* Match Score Badge */}
                <div className="flex items-center space-x-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 self-start">
                  <div className="text-right">
                    <div className="text-base font-extrabold text-[#0b2545] leading-none">
                      {match.match_score}%
                    </div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Match Score</div>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                    match.confidence === 'HIGH' ? 'bg-emerald-100 text-emerald-800' :
                    match.confidence === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {match.confidence}
                  </span>
                </div>
              </div>

              {/* Match Rationale & Citations */}
              <div className="space-y-3">
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                  "{match.rationale.reason_summary}"
                </p>

                {/* NCVET Pre-Screening Candidate Eligibility Check */}
                {match.eligibility && (
                  <div className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    match.eligibility.eligibility_status === 'ELIGIBLE'
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : match.eligibility.eligibility_status === 'PROVISIONALLY_ELIGIBLE'
                      ? 'bg-blue-50/60 border-blue-200 text-blue-950'
                      : 'bg-amber-50/60 border-amber-200 text-amber-950'
                  }`}>
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">
                          NCVET Pre-Screening Matrix:
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          match.eligibility.eligibility_status === 'ELIGIBLE'
                            ? 'bg-emerald-200 text-emerald-900'
                            : match.eligibility.eligibility_status === 'PROVISIONALLY_ELIGIBLE'
                            ? 'bg-blue-200 text-blue-900'
                            : 'bg-amber-200 text-amber-900'
                        }`}>
                          {match.eligibility.eligibility_status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700">{match.eligibility.summary_assessment}</p>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 whitespace-nowrap sm:text-right">
                      Req: {match.eligibility.minimum_experience_required_years}y exp • Declared: {match.eligibility.declared_experience_years}y
                    </div>
                  </div>
                )}

                {/* Overlapping skills & tools chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {match.rationale.matched_skills.length > 0 && (
                    <div>
                      <span className="font-semibold text-slate-600 block mb-1">Aligned Skills:</span>
                      <div className="flex flex-wrap gap-1">
                        {match.rationale.matched_skills.map((sk, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-900 rounded font-medium">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {match.rationale.matched_tools.length > 0 && (
                    <div>
                      <span className="font-semibold text-slate-600 block mb-1">Aligned Tools:</span>
                      <div className="flex flex-wrap gap-1">
                        {match.rationale.matched_tools.map((t, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cited Performance Criteria */}
                {match.rationale.matched_criteria.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs font-semibold text-slate-600 block mb-1.5">
                      Cited Official Performance Criteria:
                    </span>
                    <div className="space-y-1.5">
                      {match.rationale.matched_criteria.map((crit, idx) => (
                        <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700">
                          <span className="font-mono font-bold text-[#0b2545] mr-2">[{crit.criterion_code}]</span>
                          <span>{crit.criterion_text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleCreateSession(match.qualification_id)}
                  disabled={isCreatingSession === match.qualification_id}
                  className="px-5 py-2.5 bg-[#0b2545] hover:bg-[#133e7c] text-white rounded-lg text-sm font-semibold shadow-xs transition flex items-center space-x-2"
                >
                  <span>{isCreatingSession === match.qualification_id ? 'Initiating Session...' : 'Start Practical Assessment Session'}</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
