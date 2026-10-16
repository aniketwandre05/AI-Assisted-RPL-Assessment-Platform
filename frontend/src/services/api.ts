import { User, WorkerProfile, Qualification, MatchingResult, AssessmentSession, CompetencyReport, AssessmentEvidence, AiEvidenceAnalysis } from '../types';

function getApiBase(): string {
  if (typeof window !== 'undefined') {
    // If opened via file:// or dev server (port not 5000)
    if (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '5000')) {
      const hostname = window.location.hostname === 'localhost' ? '127.0.0.1' : (window.location.hostname || '127.0.0.1');
      return `http://${hostname}:5000/api/v1`;
    }
  }
  return '/api/v1';
}

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
  const apiBase = getApiBase();
  const url = `${apiBase}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(),
        ...(options.headers || {}),
      },
    });
  } catch (netErr) {
    // If direct backend request failed, try relative /api/v1 fallback
    if (apiBase !== '/api/v1') {
      try {
        response = await fetch(`/api/v1${path}`, {
          ...options,
          headers: {
            ...getHeaders(),
            ...(options.headers || {}),
          },
        });
      } catch {
        throw new Error('SAKSHAM backend server is offline (port 5000). Please start the backend with: python run.py');
      }
    } else {
      throw new Error('SAKSHAM backend server is offline (port 5000). Please start the backend with: python run.py');
    }
  }

  // If dev server returned 404 for a relative proxy call, retry against direct backend port 5000
  if (response.status === 404 && apiBase === '/api/v1' && typeof window !== 'undefined' && window.location.port !== '5000') {
    try {
      const fallbackUrl = `http://127.0.0.1:5000/api/v1${path}`;
      const fallbackResp = await fetch(fallbackUrl, {
        ...options,
        headers: {
          ...getHeaders(),
          ...(options.headers || {}),
        },
      });
      if (fallbackResp.ok) {
        return (await fallbackResp.json()) as T;
      }
    } catch {
      // Ignore fallback failure and continue with original response handling
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 404 || response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error(data.error || 'SAKSHAM backend server is offline (port 5000). Please start the backend with: python run.py');
    }
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
