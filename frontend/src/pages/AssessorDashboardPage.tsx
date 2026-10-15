import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AssessmentSession } from '../types';
import { 
  CheckSquare, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  FileText,
  Search,
  Filter 
} from 'lucide-react';

interface AssessorDashboardProps {
  onNavigate: (view: string, id?: string) => void;
}

export const AssessorDashboardPage: React.FC<AssessorDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<AssessmentSession[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await api.assessments.listSessions();
        setSessions(res.sessions);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const filteredSessions = sessions.filter((s) => {
    const matchesFilter = filterStatus === 'all' || s.status === filterStatus;
    const matchesSearch =
      !searchQuery ||
      (s.worker_name && s.worker_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.qualification_title && s.qualification_title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-6 h-6 text-[#0b2545]" />
            <h1 className="text-xl font-bold text-slate-900">Authorized Assessor Evaluation Portal</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Logged in as <strong>{user?.full_name}</strong> (Assessor). 
            Review checklists, score against NSQF rubrics, verify evidence, and record official certification decisions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold border border-emerald-200">
            {sessions.length} Total Registered Candidates
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search candidate name or qualification..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-sm border border-slate-300 rounded-lg focus:border-blue-700"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
          >
            <option value="all">All Sessions ({sessions.length})</option>
            <option value="in_progress">In Progress</option>
            <option value="finalized">Finalized Decisions</option>
          </select>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading candidate queue...</div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No assessment candidates match criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-6">Candidate</th>
                  <th className="py-3 px-6">Qualification & Level</th>
                  <th className="py-3 px-6">Current Scores</th>
                  <th className="py-3 px-6">Quality Flags</th>
                  <th className="py-3 px-6">Status / Decision</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900">{sess.worker_name}</div>
                      <div className="text-xs text-slate-500">{sess.worker_email}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-slate-800">{sess.qualification_title}</div>
                      <div className="text-xs text-slate-500">NSQF Level {sess.qualification_nsqf_level}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-xs font-medium text-slate-800">
                        Th: <span className={sess.theory_percentage >= 40 ? 'text-emerald-700' : 'text-red-600'}>{sess.theory_percentage}%</span>{' '}
                        • Pr: <span className={sess.practical_percentage >= 60 ? 'text-emerald-700' : 'text-red-600'}>{sess.practical_percentage}%</span>
                      </div>
                      <div className="text-[11px] text-slate-500">Overall: {sess.overall_percentage}%</div>
                    </td>
                    <td className="py-4 px-6">
                      {sess.missing_evidence_count > 0 || sess.incomplete_criteria_count > 0 ? (
                        <div className="space-y-0.5 text-xs">
                          {sess.incomplete_criteria_count > 0 && (
                            <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[11px] font-medium mr-1">
                              {sess.incomplete_criteria_count} unassessed
                            </span>
                          )}
                          {sess.missing_evidence_count > 0 && (
                            <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-[11px] font-medium">
                              {sess.missing_evidence_count} missing ev.
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-700 font-semibold flex items-center">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Checklist Complete
                        </span>
                      )}
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          <Clock className="w-3.5 h-3.5 mr-1" /> In Progress
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => onNavigate('assessment-session', sess.id)}
                        className="px-3 py-1.5 bg-[#0b2545] hover:bg-[#133e7c] text-white rounded text-xs font-semibold shadow-xs transition"
                      >
                        {sess.status === 'finalized' ? 'Review Checklist' : 'Score Candidate'}
                      </button>
                      {sess.status === 'finalized' && (
                        <button
                          onClick={() => onNavigate('competency-report', sess.id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold transition"
                        >
                          Certificate
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
