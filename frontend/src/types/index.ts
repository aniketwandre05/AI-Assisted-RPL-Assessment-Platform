export type UserRole = 'worker' | 'assessor' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  aadhaar_last_four?: string;
  state?: string;
  created_at?: string;
}

export interface WorkerProfile {
  id: string;
  user_id: string;
  user_name?: string;
  occupation_title: string;
  experience_years: number;
  current_workplace?: string;
  education_level?: string;
  daily_tasks: string[];
  tools_used: string[];
  skills_declared: string[];
  informal_training_desc?: string;
  status: 'draft' | 'submitted';
  preferred_language: string;
  created_at?: string;
  updated_at?: string;
}

export interface CriterionCitation {
  criterion_code: string;
  nos_code: string;
  criterion_text: string;
  matching_terms: string[];
}

export interface MatchRationale {
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  score_percentage: number;
  matched_skills: string[];
  matched_tools: string[];
  matched_criteria: CriterionCitation[];
  reason_summary: string;
  eligibility?: CandidateEligibility;
}

export interface CandidateEligibility {
  eligibility_status: 'ELIGIBLE' | 'PROVISIONALLY_ELIGIBLE' | 'INSUFFICIENT_EXPERIENCE';
  target_nsqf_level: number;
  declared_experience_years: number;
  minimum_experience_required_years: number;
  declared_education: string;
  is_experience_sufficient: boolean;
  summary_assessment: string;
  ncvet_rule_reference: string;
}

export interface QualificationMatch {
  id?: string;
  qualification_id: string;
  title: string;
  nqr_code?: string;
  sector: string;
  trade: string;
  nsqf_level: number;
  is_synthetic: boolean;
  match_score: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  eligibility?: CandidateEligibility;
  rationale: MatchRationale;
}

export interface MatchingResult {
  is_match_found: boolean;
  total_matches?: number;
  top_match?: QualificationMatch;
  matches: QualificationMatch[];
  reason?: string;
}

export interface PerformanceCriterion {
  id: string;
  nos_id: string;
  criterion_code: string;
  criterion_text: string;
  criterion_type: 'Practical' | 'Theory' | string;
  sequence_order: number;
  max_score: number;
  is_score_inferred: boolean;
  guidance_notes?: string;
  tasks_rubrics?: Array<{
    rubric_level_4: string;
    rubric_level_3: string;
    rubric_level_2: string;
    rubric_level_1: string;
  }>;
  evidence_requirements?: Array<{
    evidence_type: string;
    is_mandatory: boolean;
    description: string;
  }>;
}

export interface NationalOccupationalStandard {
  id: string;
  qualification_id: string;
  nos_code: string;
  title: string;
  nos_type: 'Core' | 'Non-Core';
  nsqf_level?: number;
  theory_hours?: number;
  practical_hours?: number;
  theory_marks?: number;
  practical_marks?: number;
  total_marks?: number;
  weightage_pct?: number;
  credits?: number;
  performance_criteria: PerformanceCriterion[];
}

export interface ToolAndEquipment {
  id: string;
  tool_name: string;
  specification: string;
  learner_ratio: string;
  remarks?: string;
}

export interface PassingRule {
  id: string;
  rule_scope: string;
  theory_min_percentage: number;
  practical_min_percentage: number;
  source_citation?: string;
}

export interface AmbiguityFlag {
  id: string;
  field_name: string;
  source_location: string;
  source_raw_value?: string;
  ambiguity_type: string;
  explanation: string;
  remediation_strategy: string;
}

export interface Qualification {
  id: string;
  nqr_code?: string;
  title: string;
  trade: string;
  sector: string;
  sub_sector?: string;
  nsqf_level: number;
  nco_code?: string;
  awarding_body?: string;
  notional_hours_total?: number;
  theory_hours?: number;
  practical_hours?: number;
  ojt_hours?: number;
  employability_hours?: number;
  credits?: number;
  is_synthetic: boolean;
  is_verified: boolean;
  description?: string;
  occupational_standards?: NationalOccupationalStandard[];
  tools_and_equipment?: ToolAndEquipment[];
  passing_rules?: PassingRule[];
  ambiguity_flags?: AmbiguityFlag[];
}

export interface CriterionScore {
  id: string;
  session_id: string;
  criterion_id: string;
  criterion_code?: string;
  criterion_text?: string;
  criterion_type?: string;
  rubric_level: number;
  score_awarded: number;
  max_score: number;
  is_competent: boolean;
  assessor_notes?: string;
  has_evidence: boolean;
}

export interface AssessmentEvidence {
  id: string;
  session_id: string;
  criterion_id?: string;
  uploaded_by_id: string;
  uploaded_by_name?: string;
  evidence_type: string;
  title: string;
  file_path?: string;
  external_url?: string;
  uploaded_at?: string;
}

export interface AssessmentSession {
  id: string;
  worker_id: string;
  worker_name?: string;
  worker_email?: string;
  assessor_id?: string;
  assessor_name?: string;
  qualification_id: string;
  qualification_title?: string;
  qualification_nsqf_level?: number;
  session_date?: string;
  location?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'finalized';
  theory_score_obtained: number;
  theory_score_max: number;
  theory_percentage: number;
  practical_score_obtained: number;
  practical_score_max: number;
  practical_percentage: number;
  overall_percentage: number;
  missing_evidence_count: number;
  incomplete_criteria_count: number;
  provisional_recommendation: 'RECOMMENDED_CERTIFIED' | 'NOT_YET_COMPETENT' | 'INCOMPLETE_ASSESSMENT' | string;
  assessor_final_decision?: 'CERTIFIED' | 'NOT_YET_COMPETENT' | 'DEFERRED' | null;
  assessor_remarks?: string;
  signed_off_at?: string;
  evidence_count?: number;
  criterion_scores?: CriterionScore[];
  evidence_files?: AssessmentEvidence[];
}

export interface CompetencyReport {
  report_id: string;
  session_id: string;
  candidate: {
    name: string;
    email: string;
    aadhaar_last_four?: string;
    state?: string;
  };
  qualification: {
    title: string;
    nqr_code?: string;
    nsqf_level: number;
    sector: string;
    trade: string;
    awarding_body?: string;
    credits?: number;
    notional_hours?: number;
  };
  assessment_details: {
    session_date?: string;
    location?: string;
    assessor_name?: string;
    status: string;
    signed_off_at?: string;
    signature_hash?: string;
  };
  score_summary: {
    theory: { obtained: number; max: number; percentage: number };
    practical: { obtained: number; max: number; percentage: number };
    overall: { obtained: number; max: number; percentage: number };
  };
  nos_breakdown: Array<{
    nos_code: string;
    nos_title: string;
    nos_type: string;
    theory_score: number;
    practical_score: number;
    max_theory: number;
    max_practical: number;
    criteria_count: number;
    assessed_count: number;
  }>;
  provisional_recommendation: string;
  orientation_and_bridge_plan?: {
    ncvet_mandate_reference: string;
    is_orientation_mandatory: boolean;
    standard_orientation_hours: number;
    orientation_modules: Array<{ module_name: string; hours: number }>;
    requires_bridge_course: boolean;
    bridge_modules: Array<{
      nos_code: string;
      nos_title: string;
      theory_percentage: number;
      practical_percentage: number;
      reasons: string[];
      recommended_bridge_hours: number;
      target_curriculum: string;
    }>;
    status: string;
    prescribed_action: string;
  };
  assessor_final_decision?: string;
  assessor_remarks?: string;
  evidence_manifest: AssessmentEvidence[];
  audit_verification: {
    is_tamper_evident: boolean;
    incomplete_criteria_count: number;
    missing_evidence_count: number;
    verification_url?: string;
    qr_code_data_uri?: string;
  };
}
