import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { offlineStorage } from '../services/offlineStorage';
import { 
  AssessmentSession, 
  Qualification, 
  CriterionScore, 
  NationalOccupationalStandard,
  PerformanceCriterion,
  AssessmentEvidence 
} from '../types';
import { AiEvidenceInspector } from '../components/AiEvidenceInspector';
import { 
  CheckSquare, 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  Upload, 
  Lock, 
  Save, 
  ArrowLeft, 
  FileText, 
  ShieldCheck, 
  Video, 
  ExternalLink,
  Sparkles,
  Cpu 
} from 'lucide-react';

interface AssessmentSessionProps {
  sessionId: string;
  onNavigate: (view: string, id?: string) => void;
}

export const AssessmentSessionPage: React.FC<AssessmentSessionProps> = ({ sessionId, onNavigate }) => {
  const { user, isOnline } = useAuth();
  
  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [qualification, setQualification] = useState<Qualification | null>(null);
  const [selectedNosId, setSelectedNosId] = useState<string>('');
  
  // Local score states: criterionId -> { rubric_level, assessor_notes }
  const [localScores, setLocalScores] = useState<Record<string, { rubric_level: number; assessor_notes?: string }>>({});
  
  // Modals & forms
  const [evidenceModalCritId, setEvidenceModalCritId] = useState<string | null>(null);
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceType, setEvidenceType] = useState('video');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  
  // Final sign-off form
  const [finalDecision, setFinalDecision] = useState('CERTIFIED');
  const [finalRemarks, setFinalRemarks] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch Session and Qualification Criteria
  const loadData = async () => {
    setIsLoading(true);
    try {
      const sessRes = await api.assessments.getSession(sessionId);
      setSession(sessRes.session);

      const qualRes = await api.qualifications.getDetail(sessRes.session.qualification_id);
      setQualification(qualRes.qualification);

      // Select first NOS tab by default
      if (qualRes.qualification.occupational_standards?.length) {
        setSelectedNosId(qualRes.qualification.occupational_standards[0].id);
      }

      // Initialize local scores from server
      const initialMap: Record<string, { rubric_level: number; assessor_notes?: string }> = {};
      sessRes.session.criterion_scores?.forEach((cs) => {
        initialMap[cs.criterion_id] = {
          rubric_level: cs.rubric_level,
          assessor_notes: cs.assessor_notes || '',
        };
      });

      // Overlay any offline draft if present
      const draft = offlineStorage.getChecklistDraft(sessionId);
      if (draft) {
        Object.assign(initialMap, draft);
      }

      setLocalScores(initialMap);
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message || 'Failed to load assessment checklist' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sessionId]);

  // 2. Persist local checklist state to survive offline page reloads
  const updateCriterionScore = (criterionId: string, level: number, notes?: string) => {
    setLocalScores((prev) => {
      const current = prev[criterionId] || { rubric_level: 0, assessor_notes: '' };
      const updated = {
        ...prev,
        [criterionId]: {
          rubric_level: level,
          assessor_notes: notes !== undefined ? notes : current.assessor_notes,
        },
      };
      offlineStorage.saveChecklistDraft(sessionId, updated);
      return updated;
    });
  };

  // 3. Save scores to backend or enqueue offline
  const handleSaveScores = async () => {
    setIsSaving(true);
    setStatusMsg(null);

    const scoreUpdates = Object.entries(localScores).map(([critId, data]) => ({
      criterion_id: critId,
      rubric_level: data.rubric_level,
      assessor_notes: data.assessor_notes,
    }));

    if (!isOnline) {
      offlineStorage.enqueue({
        type: 'SCORE_UPDATE',
        sessionId,
        payload: { scores: scoreUpdates },
      });
      setStatusMsg({
        type: 'success',
        text: 'Scores saved locally offline. Will synchronize when reconnected to network.',
      });
      setIsSaving(false);
      return;
    }

    try {
      const res = await api.assessments.saveScores(sessionId, scoreUpdates);
      setSession(res.session);
      setStatusMsg({ type: 'success', text: 'Evaluation scores recalculated and persisted!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error updating scores' });
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Attach evidence
  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceTitle.trim()) return;

    const payload = {
      criterion_id: evidenceModalCritId || undefined,
      evidence_type: evidenceType,
      title: evidenceTitle.trim(),
      external_url: evidenceUrl.trim() || undefined,
    };

    if (!isOnline) {
      offlineStorage.enqueue({
        type: 'EVIDENCE_ADD',
        sessionId,
        payload,
      });
      setEvidenceModalCritId(null);
      setStatusMsg({ type: 'success', text: 'Evidence recorded locally in offline queue.' });
      return;
    }

    try {
      await api.assessments.addEvidence(sessionId, payload);
      setEvidenceModalCritId(null);
      setEvidenceTitle('');
      setEvidenceUrl('');
      // Reload session
      const updated = await api.assessments.getSession(sessionId);
      setSession(updated.session);
      setStatusMsg({ type: 'success', text: 'Evidence file verified and attached!' });
    } catch (err: any) {
      alert(err.message || 'Error attaching evidence');
    }
  };

  const handleEvidenceUpdated = (updatedEvidence: AssessmentEvidence) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        evidence_files: prev.evidence_files?.map((ev) => (ev.id === updatedEvidence.id ? updatedEvidence : ev)) || [],
      };
    });
  };

  // 5. Finalize decision
  const handleFinalize = async () => {
    if (!window.confirm(`Are you certain you want to record the binding decision: ${finalDecision}?`)) {
      return;
    }

    setIsSaving(true);
    try {
      // First save all current rubric scores to guarantee the backend is 100% synchronized
      const scoreUpdates = Object.entries(localScores).map(([critId, data]) => ({
        criterion_id: critId,
        rubric_level: data.rubric_level,
        assessor_notes: data.assessor_notes,
      }));
      if (scoreUpdates.length > 0 && isOnline) {
        await api.assessments.saveScores(sessionId, scoreUpdates);
      }

      const res = await api.assessments.finalize(sessionId, {
        decision: finalDecision,
        remarks: finalRemarks,
      });
      setSession(res.session);
      setStatusMsg({ type: 'success', text: `Assessment officially finalized with decision: ${finalDecision}` });
      offlineStorage.clearChecklistDraft(sessionId);
      // Redirect to formal competency report
      setTimeout(() => onNavigate('competency-report', sessionId), 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to finalize assessment');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !session || !qualification) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4 text-center text-slate-500">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-[#0b2545] border-t-amber-500 rounded-full mb-3" />
        <p>Loading official practical checklist...</p>
      </div>
    );
  }

  const selectedNos = qualification.occupational_standards?.find((n) => n.id === selectedNosId);
  const isFinalized = session.status === 'finalized';
  const isAssessor = user?.role === 'assessor' || user?.role === 'admin';

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Back and Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate(isAssessor ? 'assessor-dashboard' : 'worker-dashboard')}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        {isFinalized && (
          <button
            onClick={() => onNavigate('competency-report', sessionId)}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center space-x-1"
          >
            <FileText className="w-4 h-4" />
            <span>View Final Competency Report</span>
          </button>
        )}
      </div>

      {/* Qualification Metadata & Candidate Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900">{qualification.title}</h1>
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 font-bold text-xs rounded-full">
                NSQF Level {qualification.nsqf_level}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span><strong>Candidate:</strong> {session.worker_name} ({session.worker_email})</span>
              <span><strong>Assessor:</strong> {session.assessor_name || 'Unassigned'}</span>
              <span><strong>NQR Code:</strong> {qualification.nqr_code || 'N/A'}</span>
            </div>
          </div>

          {/* Pass Criteria Info Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
            <span className="font-bold text-slate-700 block mb-1">Official Qualifying Rules (Page 8):</span>
            <div className="flex items-center space-x-3 text-slate-600">
              <span>Theory Min: <strong className="text-blue-900">40%</strong></span>
              <span>•</span>
              <span>Practical Min: <strong className="text-blue-900">60%</strong></span>
            </div>
          </div>
        </div>

        {/* Live Score and Quality Alert Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Theory Score</span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {session.theory_percentage}%
            </div>
            <span className={`text-[11px] font-medium ${session.theory_percentage >= 40 ? 'text-emerald-700' : 'text-amber-600'}`}>
              {session.theory_percentage >= 40 ? '✓ Meets 40% target' : 'Under 40% threshold'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Practical Score</span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {session.practical_percentage}%
            </div>
            <span className={`text-[11px] font-medium ${session.practical_percentage >= 60 ? 'text-emerald-700' : 'text-amber-600'}`}>
              {session.practical_percentage >= 60 ? '✓ Meets 60% target' : 'Under 60% threshold'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Overall Score</span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {session.overall_percentage}%
            </div>
            <span className="text-[11px] text-slate-500">
              {session.provisional_recommendation}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Evidence & Checklist</span>
            <div className="text-xs font-medium text-slate-800 mt-1 space-y-0.5">
              {session.incomplete_criteria_count > 0 && (
                <div className="text-amber-700 flex items-center">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                  <span>{session.incomplete_criteria_count} unassessed criteria</span>
                </div>
              )}
              {session.missing_evidence_count > 0 && (
                <div className="text-red-700 flex items-center">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                  <span>{session.missing_evidence_count} missing mandatory video/ev.</span>
                </div>
              )}
              {session.incomplete_criteria_count === 0 && session.missing_evidence_count === 0 && (
                <div className="text-emerald-700 font-semibold flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ready for Sign-Off
                </div>
              )}
            </div>
          </div>
        </div>

        {statusMsg && (
          <div className={`p-3 rounded-lg text-sm border flex items-center space-x-2 ${
            statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            statusMsg.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
            'bg-blue-50 text-blue-800 border-blue-200'
          }`}>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
        )}
      </div>

      {/* NOS Module Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 p-2 flex flex-wrap gap-2">
          {qualification.occupational_standards?.map((nos) => (
            <button
              key={nos.id}
              onClick={() => setSelectedNosId(nos.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                selectedNosId === nos.id
                  ? 'bg-[#0b2545] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="font-mono mr-1.5 opacity-80">[{nos.nos_code}]</span>
              <span>{nos.title.slice(0, 32)}...</span>
            </button>
          ))}
        </div>

        {/* Selected NOS Details */}
        {selectedNos && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {selectedNos.title}
                </h2>
                <div className="text-xs text-slate-500 mt-0.5">
                  Type: {selectedNos.nos_type} • Theory Marks: {selectedNos.theory_marks} • Practical Marks: {selectedNos.practical_marks}
                </div>
              </div>

              {isAssessor && !isFinalized && (
                <button
                  onClick={handleSaveScores}
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#0b2545] hover:bg-[#133e7c] text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center space-x-1.5 self-start sm:self-auto"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Calculating...' : 'Save & Recalculate Scores'}</span>
                </button>
              )}
            </div>

            {/* Performance Criteria Checklist Items */}
            <div className="space-y-4">
              {selectedNos.performance_criteria.map((pc, idx) => {
                const currentScore = localScores[pc.id] || { rubric_level: 0, assessor_notes: '' };
                const hasEvidence = session.evidence_files?.some((ev) => ev.criterion_id === pc.id);

                return (
                  <div
                    key={pc.id}
                    className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3.5 hover:border-slate-300 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-[#0b2545] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {pc.criterion_code}
                          </span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            pc.criterion_type === 'Theory' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {pc.criterion_type}
                          </span>
                          {pc.is_score_inferred && (
                            <span className="text-[10px] text-slate-400 italic">
                              (Curriculum 10pt scale)
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-800 pt-1 leading-snug">
                          {pc.criterion_text}
                        </p>
                      </div>

                      {/* Evidence Button & AI Inspector Indicator */}
                      <div className="flex flex-wrap items-center gap-2">
                        {hasEvidence ? (
                          <>
                            {(() => {
                              const evItem = session.evidence_files?.find((ev) => ev.criterion_id === pc.id);
                              const ai = evItem?.ai_analysis;
                              if (!ai) return null;
                              return (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border shadow-2xs ${
                                  ai.status === 'FLAGGED_ANOMALY'
                                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                                    : 'bg-blue-50 text-blue-900 border-blue-200'
                                }`}>
                                  <Sparkles className="w-3 h-3 mr-1 text-amber-500" />
                                  <span>AI Inspected ({Math.round(ai.confidence_score * 100)}%)</span>
                                </span>
                              );
                            })()}
                            <button
                              type="button"
                              onClick={() => setEvidenceModalCritId(pc.id)}
                              className="inline-flex items-center px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-md border border-emerald-300 transition shadow-xs"
                              title="Click to review AI vision analysis or add more evidence files"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Evidence Attached (View/Add)
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEvidenceModalCritId(pc.id)}
                            className="inline-flex items-center px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-md border border-slate-300 transition shadow-xs"
                          >
                            <Upload className="w-3 h-3 mr-1 text-slate-500" /> Attach Evidence
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Standardized 4-Level Rubric Buttons */}
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Assessor Rubric Evaluation:
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { level: 4, label: '4 - Exceeds (100%)', bg: 'bg-emerald-600', activeBg: 'bg-emerald-50 text-emerald-800 border-emerald-500' },
                          { level: 3, label: '3 - Competent (75%)', bg: 'bg-[#133e7c]', activeBg: 'bg-blue-50 text-blue-900 border-[#133e7c]' },
                          { level: 2, label: '2 - Developing (50%)', bg: 'bg-amber-600', activeBg: 'bg-amber-50 text-amber-800 border-amber-500' },
                          { level: 1, label: '1 - Not Demonstrated (0%)', bg: 'bg-red-600', activeBg: 'bg-red-50 text-red-800 border-red-500' },
                        ].map((btn) => (
                          <button
                            key={btn.level}
                            type="button"
                            disabled={!isAssessor || isFinalized}
                            onClick={() => updateCriterionScore(pc.id, btn.level)}
                            className={`py-2 px-2.5 rounded-lg text-xs font-semibold border text-center transition ${
                              currentScore.rubric_level === btn.level
                                ? `${btn.activeBg} ring-2 ring-blue-700`
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-60'
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Assessor observation notes */}
                    {isAssessor && (
                      <div className="pt-1">
                        <input
                          type="text"
                          disabled={isFinalized}
                          placeholder="Assessor observation notes / viva remarks..."
                          value={currentScore.assessor_notes || ''}
                          onChange={(e) => updateCriterionScore(pc.id, currentScore.rubric_level, e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:border-blue-700"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Human Assessor Final Sign-Off Portal */}
      {isAssessor && !isFinalized && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Lock className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              Official Assessor Sign-Off & Governance
            </h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            As an authorized human assessor, you hold exclusive authority to certify or defer candidate credentials. 
            All final decisions generate an immutable cryptographic audit signature logged to the permanent audit trail.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Final Assessment Decision
              </label>
              <select
                value={finalDecision}
                onChange={(e) => setFinalDecision(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-amber-500"
              >
                <option value="CERTIFIED">CERTIFIED (Meets NSQF Competencies)</option>
                <option value="NOT_YET_COMPETENT">NOT YET COMPETENT</option>
                <option value="DEFERRED">DEFERRED (Requires Additional Evidence)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Official Assessor Remarks
              </label>
              <input
                type="text"
                required
                value={finalRemarks}
                onChange={(e) => setFinalRemarks(e.target.value)}
                placeholder="e.g. Demonstrated practical mastery on all core programming tasks."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-amber-500"
              />
            </div>
          </div>

          {(() => {
            const totalCriteria = qualification.occupational_standards?.reduce(
              (acc, nos) => acc + (nos.performance_criteria?.length || 0), 0
            ) || 0;
            const assessedCount = Object.values(localScores).filter((s) => s.rubric_level > 0).length;
            const pendingCriteriaCount = Math.max(0, totalCriteria - assessedCount);
            const isCertifyBlocked = finalDecision === 'CERTIFIED' && pendingCriteriaCount > 0;

            return (
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                {isCertifyBlocked ? (
                  <div className="text-xs text-amber-400 flex items-center space-x-1.5 self-start sm:self-auto">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{pendingCriteriaCount} criteria remain unassessed. Score all criteria to Certify, or select "NOT YET COMPETENT" / "DEFERRED".</span>
                  </div>
                ) : (
                  <div className="text-xs text-emerald-400 flex items-center space-x-1.5 self-start sm:self-auto">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Evaluation ready for official binding sign-off.</span>
                  </div>
                )}

                <button
                  onClick={handleFinalize}
                  disabled={isCertifyBlocked || isSaving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm shadow-md transition flex items-center space-x-2 self-end sm:self-auto"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSaving ? 'Synchronizing & Signing...' : 'Sign & Finalize Certification Decision'}</span>
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* Attach Evidence Modal */}
      {evidenceModalCritId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Upload className="w-5 h-5 text-[#0b2545]" />
              <span>Attach Permitted Practical Evidence & AI Vision Audit</span>
            </h3>
            <p className="text-xs text-slate-500">
              Per NCVET mandate, practical video recordings and artifacts are subject to AI Computer Vision audit telemetry.
            </p>

            {/* List any already attached evidence with full AI Vision Inspector card */}
            {(() => {
              const attached = session.evidence_files?.filter((ev) => ev.criterion_id === evidenceModalCritId) || [];
              if (attached.length === 0) return null;
              return (
                <div className="space-y-3">
                  <span className="text-[11px] font-bold uppercase text-slate-600 block">
                    Verified Evidence on File ({attached.length}):
                  </span>
                  <div className="space-y-3">
                    {attached.map((ev) => (
                      <div key={ev.id} className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-900 truncate">
                            [{ev.evidence_type.toUpperCase()}] {ev.title}
                          </span>
                          {ev.external_url ? (
                            <a
                              href={ev.external_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-800 hover:text-blue-950 underline font-medium text-[11px] flex items-center space-x-1"
                            >
                              <span>View Media</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Saved</span>
                          )}
                        </div>

                        {/* AI Evidence Inspector Widget Card */}
                        <AiEvidenceInspector
                          evidence={ev}
                          onApplyRubric={(lvl) => updateCriterionScore(evidenceModalCritId!, lvl)}
                          onEvidenceUpdated={handleEvidenceUpdated}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <form onSubmit={handleAddEvidence} className="space-y-3 border-t border-slate-200 pt-3">
              <span className="text-xs font-bold text-slate-800 block">Upload / Link Additional Evidence File:</span>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Evidence Type</label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="video">Mandatory Practical Video Recording</option>
                  <option value="code_repo">Code Repository Link (GitHub/GitLab)</option>
                  <option value="photo">Photograph of Assembled Hardware / Circuit</option>
                  <option value="viva_audio">Viva Voice Recording</option>
                  <option value="document">Execution Log / Test Report Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Evidence Title</label>
                <input
                  type="text"
                  required
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                  placeholder="e.g. Docker Deployment Screen Capture"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">File URL / Storage Link</label>
                <input
                  type="text"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://storage.rpl.gov.in/evidence/session_video.mp4"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEvidenceModalCritId(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0b2545] hover:bg-[#133e7c] text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Save Evidence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
