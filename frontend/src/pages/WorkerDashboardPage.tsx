import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { WorkerProfile, AssessmentSession } from '../types';
import { 
  FileText, 
  Layers, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Award, 
  AlertTriangle,
  Building 
} from 'lucide-react';

interface WorkerDashboardProps {
  onNavigate: (view: string, id?: string) => void;
}

export const WorkerDashboardPage: React.FC<WorkerDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [sessions, setSessions] = useState<AssessmentSession[]>([]);
  const [matchesCount, setMatchesCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [profRes, sessRes, matchRes] = await Promise.all([
          api.worker.getProfile().catch(() => ({ profile: null })),
          api.assessments.listSessions().catch(() => ({ sessions: [] })),
          api.worker.getMatches().catch(() => ({ matches: [] })),
        ]);
        setProfile(profRes.profile);
        setSessions(sessRes.sessions);
        setMatchesCount(matchRes.matches.length);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 text-center text-slate-500">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-[#0b2545] border-t-amber-500 rounded-full mb-3" />
        <p>Loading your worker skill dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header Profile Greeting */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.full_name}</h1>
            <span className="bg-blue-50 text-blue-900 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              Worker Portal
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            State: {user?.state || 'Not specified'} • Aadhaar: ****{user?.aadhaar_last_four || 'XXXX'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigate('worker-profile')}
            className="px-4 py-2 bg-[#0b2545] hover:bg-[#133e7c] text-white text-sm font-semibold rounded-lg shadow-xs transition flex items-center space-x-1.5"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>{profile ? 'Edit Skill Profile' : 'Complete Self-Declaration'}</span>
          </button>
          {profile && (
            <button
              onClick={() => onNavigate('worker-matches')}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg shadow-xs transition flex items-center space-x-1.5"
            >
              <Layers className="w-4 h-4" />
              <span>Qualification Matches ({matchesCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Skill Declaration</span>
            <FileText className="w-5 h-5 text-[#0b2545]" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {profile ? profile.occupation_title : 'Not Started'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {profile ? `${profile.experience_years} years experience reported` : 'Declare your trade tasks to find matches'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">NSQF Matches</span>
            <Layers className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {matchesCount} Qualifications Found
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {matchesCount > 0 ? 'Aligned with official criteria' : 'Submit declaration to trigger matching'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Assessment Status</span>
            <Award className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {sessions.length} Active Sessions
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {sessions.filter(s => s.status === 'finalized').length} Certified / Completed
          </p>
        </div>
      </div>

      {/* Assessment History & Sessions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">My RPL Practical Assessment Sessions</h2>
            <p className="text-xs text-slate-500 mt-0.5">Track assessor checklists, provisional scores, and official sign-off certificates</p>
          </div>
          {matchesCount > 0 && (
            <button
              onClick={() => onNavigate('worker-matches')}
              className="text-xs text-blue-800 hover:text-blue-950 font-semibold flex items-center space-x-1"
            >
              <span>Request new assessment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-medium text-slate-700">No assessment sessions scheduled yet.</p>
            <p className="text-xs mt-1">
              Complete your skill declaration and select a qualification from your matches to initiate practical assessment.
            </p>
            <button
              onClick={() => onNavigate('worker-profile')}
              className="mt-4 px-4 py-2 bg-[#0b2545] hover:bg-[#133e7c] text-white text-xs font-semibold rounded-lg shadow-xs transition"
            >
              Go to Skill Declaration
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-6">Qualification</th>
                  <th className="py-3 px-6">NSQF Level</th>
                  <th className="py-3 px-6">Assessor</th>
                  <th className="py-3 px-6">Scores</th>
                  <th className="py-3 px-6">Status & Decision</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6 font-medium text-slate-900">
                      {sess.qualification_title}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      Level {sess.qualification_nsqf_level}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {sess.assessor_name || 'Pending Assignment'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-xs">
                        <span className="font-medium text-slate-800">Th: {sess.theory_percentage}%</span> •{' '}
                        <span className="font-medium text-slate-800">Pr: {sess.practical_percentage}%</span>
                      </div>
                      <div className="text-[11px] text-slate-500">Overall: {sess.overall_percentage}%</div>
                    </td>
                    <td className="py-4 px-6">
                      {sess.assessor_final_decision === 'CERTIFIED' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Certified
                        </span>
                      ) : sess.status === 'finalized' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          {sess.assessor_final_decision}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          <Clock className="w-3.5 h-3.5 mr-1" /> In Progress
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {sess.status === 'finalized' ? (
                        <button
                          onClick={() => onNavigate('competency-report', sess.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-sm transition"
                        >
                          View Certificate Report
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigate('assessment-session', sess.id)}
                          className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded text-xs font-semibold border border-blue-200 transition"
                        >
                          View Checklist
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
