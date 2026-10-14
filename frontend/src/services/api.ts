import { User, WorkerProfile, Qualification, MatchingResult, AssessmentSession, CompetencyReport, AssessmentEvidence, AiEvidenceAnalysis } from '../types';

const API_BASE = '/api/v1';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('rpl_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  auth: {
    register: (payload: { email: string; password: string; role: string; full_name: string; phone?: string; aadhaar_last_four?: string; state?: string }) =>
      request<{ user: User; token: string; message: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    login: (credentials: { email: string; password: string }) =>
      request<{ user: User; token: string; message: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    me: () => request<{ user: User }>('/auth/me'),
  },

  // Worker
  worker: {
    getProfile: (workerId?: string) => {
      const q = workerId ? `?worker_id=${encodeURIComponent(workerId)}` : '';
      return request<{ profile: WorkerProfile | null }>(`/worker/profile${q}`);
    },
    saveProfile: (profile: Partial<WorkerProfile>, workerId?: string) => {
      const q = workerId ? `?worker_id=${encodeURIComponent(workerId)}` : '';
      return request<{ profile: WorkerProfile; message: string }>(`/worker/profile${q}`, {
        method: 'POST',
        body: JSON.stringify(profile),
      });
    },
    triggerMatching: (minThreshold: number = 20.0, workerId?: string) =>
      request<MatchingResult>('/worker/match-qualifications', {
        method: 'POST',
        body: JSON.stringify({ min_threshold: minThreshold, worker_id: workerId }),
      }),
    getMatches: (workerId?: string) => {
      const q = workerId ? `?worker_id=${encodeURIComponent(workerId)}` : '';
      return request<{ matches: any[] }>(`/worker/matches${q}`);
    },
  },

  // Qualifications
  qualifications: {
    list: (params: { q?: string; sector?: string; level?: string; page?: number; per_page?: number } = {}) => {
      const searchParams = new URLSearchParams();
      if (params.q) searchParams.set('q', params.q);
      if (params.sector) searchParams.set('sector', params.sector);
      if (params.level) searchParams.set('level', params.level);
      if (params.page) searchParams.set('page', params.page.toString());
      if (params.per_page) searchParams.set('per_page', params.per_page.toString());
      return request<{ total: number; page: number; per_page: number; qualifications: Qualification[] }>(
        `/qualifications?${searchParams.toString()}`
      );
    },
    getDetail: (id: string) =>
      request<{ qualification: Qualification }>(`/qualifications/${encodeURIComponent(id)}`),
    sectors: () => request<{ sectors: string[] }>('/qualifications/sectors'),
  },

  // Assessments
  assessments: {
    createSession: (payload: { qualification_id: string; worker_id?: string; location?: string; session_date?: string }) =>
      request<{ session: AssessmentSession; message: string }>('/assessments/sessions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    listSessions: (status?: string) => {
      const q = status ? `?status=${encodeURIComponent(status)}` : '';
      return request<{ sessions: AssessmentSession[] }>(`/assessments/sessions${q}`);
    },
    getSession: (sessionId: string) =>
      request<{ session: AssessmentSession }>(`/assessments/sessions/${encodeURIComponent(sessionId)}`),
    saveScores: (sessionId: string, scores: Array<{ criterion_id: string; rubric_level: number; assessor_notes?: string }>) =>
      request<{ session: AssessmentSession; calculation: any; message: string }>(
        `/assessments/sessions/${encodeURIComponent(sessionId)}/scores`,
        {
          method: 'POST',
          body: JSON.stringify({ scores }),
        }
      ),
    addEvidence: (sessionId: string, payload: { evidence_type: string; title: string; external_url?: string; criterion_id?: string }) =>
      request<{ evidence: AssessmentEvidence; message: string; ai_inspection?: AiEvidenceAnalysis }>(
        `/assessments/sessions/${encodeURIComponent(sessionId)}/evidence`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      ),
    inspectEvidence: (evidenceId: string) =>
      request<{ evidence: AssessmentEvidence; message: string; ai_inspection: AiEvidenceAnalysis }>(
        `/assessments/evidence/${encodeURIComponent(evidenceId)}/inspect`,
        {
          method: 'POST',
        }
      ),
    calculate: (sessionId: string) =>
      request<{ calculation: any }>(`/assessments/sessions/${encodeURIComponent(sessionId)}/calculate`, {
        method: 'POST',
      }),
    finalize: (sessionId: string, payload: { decision: string; remarks: string }) =>
      request<{ session: AssessmentSession; result: any; message: string }>(
        `/assessments/sessions/${encodeURIComponent(sessionId)}/finalize`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      ),
    getReport: (sessionId: string) =>
      request<{ report: CompetencyReport }>(`/assessments/sessions/${encodeURIComponent(sessionId)}/report`),
    verifyCertificate: (signatureHash: string) =>
      request<{
        is_valid: boolean;
        verification_status: string;
        certificate_id: string;
        message?: string;
        candidate?: { name: string; masked_aadhaar: string; state: string };
        qualification?: { title: string; nqr_code: string; nsqf_level: number; sector: string; awarding_body: string; credits: number };
        assessment_outcome?: {
          final_decision: string;
          theory_percentage: number;
          practical_percentage: number;
          overall_percentage: number;
          certified_date?: string;
          assessor_name?: string;
          signature_hash?: string;
        };
        verification_timestamp: string;
      }>(`/assessments/verify/${encodeURIComponent(signatureHash)}`),
    getAuditDossier: (format: 'json' | 'markdown' = 'json') =>
      request<{ dossier: any; markdown?: string }>(`/assessments/audit/dossier?format=${format}`),
  },
};
