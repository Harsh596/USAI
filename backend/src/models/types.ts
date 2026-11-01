export type AttendanceFormat = 'IN_PERSON' | 'ONLINE' | 'HYBRID';
export type EventType = 'HACKATHON' | 'COMPETITION' | 'WORKSHOP' | 'CONFERENCE' | 'MEETUP' | 'CTF';
export type RegistrationStatus = 'OPEN' | 'CLOSING_SOON' | 'CLOSED' | 'INVITE_ONLY' | 'UPCOMING';
export type EventStatus = 'SCHEDULED' | 'HAPPENING_NOW' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';

export interface CanonicalEvent {
  event_id: string;
  canonical_title: string;
  description: string;
  short_summary: string;
  organizer_name: string;
  source_platform: string; // 'Luma' | 'Unstop' | 'Devfolio' | 'Devpost' | 'MLH' | etc.
  source_url: string;
  registration_url: string;
  event_type: EventType;
  categories: string[];
  tags: string[];
  technologies: string[];
  themes: string[];
  start_datetime: string; // ISO 8601
  end_datetime: string;   // ISO 8601
  timezone: string;
  registration_open_datetime: string | null;
  registration_deadline: string | null;
  location_name: string;
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  online_or_in_person: 'ONLINE' | 'IN_PERSON' | 'HYBRID';
  attendance_format: AttendanceFormat;
  price: number; // 0 = free
  currency: string;
  prize_pool: string | null; // null if unverified
  prize_pool_numeric: number | null;
  eligibility: string[];
  target_audience: string[];
  student_only: boolean;
  experience_level: string; // 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL'
  team_size_min: number | null;
  team_size_max: number | null;
  required_skills: string[];
  deliverables: string[];
  submission_requirements: string[];
  event_schedule: Array<{ time: string; activity: string }>;
  sponsors: string[];
  organizer_information: string | null;
  registration_status: RegistrationStatus;
  event_status: EventStatus;
  last_verified_at: string;
  last_changed_at: string;
  content_hash: string;
  extraction_confidence: number; // 0.0 - 1.0
  field_verification_status: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  college_or_company: string;
  degree_or_role: string;
  skills: string[];
  experience_years: number;
  github_url: string;
  linkedin_url: string;
  portfolio_url: string;
  bio: string;
  resume_text: string;
  created_at: string;
  updated_at: string;
}

export interface StructuredFilterCriteria {
  categories?: string[];
  topics?: string[];
  technologies?: string[];
  locations?: {
    cities?: string[];
    states?: string[];
    countries?: string[];
    include_online?: boolean;
    only_online?: boolean;
  };
  date_range?: {
    start_after?: string;
    end_before?: string;
    deadline_before?: string;
  };
  price?: {
    free_only?: boolean;
    max?: number;
    currency?: string;
  };
  team_size?: {
    min?: number;
    max?: number;
  };
  eligibility?: string[]; // e.g. ["Students"]
  has_prize_money?: boolean;
  registration_open_only?: boolean;
  exclusions?: string[];
}

export interface SavedFilter {
  filter_id: string;
  user_id: string;
  name: string;
  natural_query: string;
  structured_criteria: StructuredFilterCriteria;
  created_at: string;
}

export interface EventContentChunk {
  chunk_id: string;
  event_id: string;
  section_name: string; // 'rules' | 'prizes' | 'eligibility' | 'submission' | 'faq' | 'overview'
  content: string;
  embedding?: number[];
  source_url: string;
  last_verified_at: string;
  content_hash: string;
}

export interface EventRelationship {
  id: string;
  source_event_id: string;
  target_event_id: string;
  relationship_type: 'SAME_ORGANIZER' | 'SAME_THEME' | 'SHARED_SPONSORS' | 'SUBSEQUENT_EDITION' | 'SIMILAR_STACK';
  confidence: number;
  evidence: string;
}

export interface IdeaValidationResult {
  overall_score: number; // 0-100
  criteria_scores: {
    problem_clarity: number;
    target_users: number;
    problem_significance: number;
    proposed_solution: number;
    originality: number;
    technical_feasibility: number;
    innovation: number;
    theme_alignment: number;
    evaluation_criteria_match: number;
    team_capacity_and_time: number;
    required_technologies: number;
    risks_and_mitigations: number;
    mvp_scope: number;
    potential_impact: number;
  };
  strengths: string[];
  weaknesses: string[];
  comparable_solutions: string[];
  recommendations: string[];
  brief: {
    one_paragraph_pitch: string;
    problem_statement: string;
    proposed_solution: string;
    target_audience: string;
    core_features: string[];
    user_journey: string[];
    technical_architecture: string;
    suggested_tech_stack: string[];
    mvp_implementation_plan: Array<{ phase: string; description: string; duration: string }>;
    differentiation: string;
    risks_and_mitigations: Array<{ risk: string; mitigation: string }>;
    impact_model: string;
    hackathon_submission_summary: string;
    slide_outline: Array<{ slide_num: number; title: string; bullets: string[] }>;
  };
}

export interface MonitoringSubscription {
  id: string;
  user_id: string;
  event_id: string;
  notify_email: boolean;
  reminder_intervals_days: number[]; // e.g. [7, 3, 1, 0]
  last_checked_at: string;
  active: boolean;
}

export interface EventChangeRecord {
  id: string;
  event_id: string;
  field_name: string;
  old_value: string;
  new_value: string;
  detected_at: string;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  event_id: string | null;
  notification_type: 'DEADLINE_REMINDER' | 'EVENT_CHANGED' | 'REGISTRATION_OPENED' | 'EVENT_CANCELLED';
  title: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  delivery_timestamp: string;
}

