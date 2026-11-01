import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_FILE || path.join(__dirname, '../../data/usai.db');

// Ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db: Database.Database = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    -- Shared Canonical Events Table
    CREATE TABLE IF NOT EXISTS events (
      event_id TEXT PRIMARY KEY,
      canonical_title TEXT NOT NULL,
      description TEXT,
      short_summary TEXT,
      organizer_name TEXT,
      source_platform TEXT NOT NULL,
      source_url TEXT NOT NULL UNIQUE,
      registration_url TEXT,
      event_type TEXT NOT NULL,
      categories TEXT, -- JSON array
      tags TEXT,       -- JSON array
      technologies TEXT, -- JSON array
      themes TEXT,     -- JSON array
      start_datetime TEXT NOT NULL,
      end_datetime TEXT NOT NULL,
      timezone TEXT DEFAULT 'Asia/Kolkata',
      registration_open_datetime TEXT,
      registration_deadline TEXT,
      location_name TEXT,
      city TEXT,
      state TEXT,
      country TEXT DEFAULT 'India',
      latitude REAL,
      longitude REAL,
      online_or_in_person TEXT NOT NULL,
      attendance_format TEXT NOT NULL,
      price REAL DEFAULT 0,
      currency TEXT DEFAULT 'INR',
      prize_pool TEXT,
      prize_pool_numeric REAL,
      eligibility TEXT, -- JSON array
      target_audience TEXT, -- JSON array
      student_only INTEGER DEFAULT 0,
      experience_level TEXT DEFAULT 'ALL',
      team_size_min INTEGER,
      team_size_max INTEGER,
      required_skills TEXT, -- JSON array
      deliverables TEXT, -- JSON array
      submission_requirements TEXT, -- JSON array
      event_schedule TEXT, -- JSON array of {time, activity}
      sponsors TEXT, -- JSON array
      organizer_information TEXT,
      registration_status TEXT NOT NULL,
      event_status TEXT NOT NULL,
      last_verified_at TEXT NOT NULL,
      last_changed_at TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      extraction_confidence REAL DEFAULT 1.0,
      field_verification_status TEXT, -- JSON object
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_events_city ON events (city);
    CREATE INDEX IF NOT EXISTS idx_events_format ON events (online_or_in_person);
    CREATE INDEX IF NOT EXISTS idx_events_deadline ON events (registration_deadline);
    CREATE INDEX IF NOT EXISTS idx_events_start ON events (start_datetime);
    CREATE INDEX IF NOT EXISTS idx_events_platform ON events (source_platform);

    -- User Profiles for Auto Registration & Customization
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      college_or_company TEXT,
      degree_or_role TEXT,
      skills TEXT, -- JSON array
      experience_years REAL DEFAULT 0,
      github_url TEXT,
      linkedin_url TEXT,
      portfolio_url TEXT,
      bio TEXT,
      resume_text TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Custom Saved Filters (Personalized Layer)
    CREATE TABLE IF NOT EXISTS custom_filters (
      filter_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      natural_query TEXT NOT NULL,
      structured_criteria TEXT NOT NULL, -- JSON
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_filters_user ON custom_filters (user_id);

    -- Saved Events
    CREATE TABLE IF NOT EXISTS saved_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, event_id),
      FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
    );

    -- Event Knowledge Base Chunks (for Q&A & Research Agent)
    CREATE TABLE IF NOT EXISTS event_content_chunks (
      chunk_id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      section_name TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding TEXT, -- JSON array of floats for cosine similarity
      source_url TEXT NOT NULL,
      last_verified_at TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_chunks_event ON event_content_chunks (event_id);

    -- Event Relationship Graph
    CREATE TABLE IF NOT EXISTS event_relationships (
      id TEXT PRIMARY KEY,
      source_event_id TEXT NOT NULL,
      target_event_id TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      confidence REAL DEFAULT 1.0,
      evidence TEXT,
      FOREIGN KEY (source_event_id) REFERENCES events(event_id) ON DELETE CASCADE,
      FOREIGN KEY (target_event_id) REFERENCES events(event_id) ON DELETE CASCADE
    );

    -- Monitoring Subscriptions
    CREATE TABLE IF NOT EXISTS monitoring_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      notify_email INTEGER DEFAULT 1,
      reminder_intervals_days TEXT DEFAULT '[7, 3, 1, 0]', -- JSON array
      last_checked_at TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      UNIQUE(user_id, event_id),
      FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
    );

    -- Event Change Log
    CREATE TABLE IF NOT EXISTS event_changes (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      field_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      detected_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_id TEXT,
      notification_type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      delivery_timestamp TEXT NOT NULL
    );

    -- Registration Assistant Audit Records
    CREATE TABLE IF NOT EXISTS registration_audits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      status TEXT NOT NULL, -- 'DRAFT' | 'REVIEW_PENDING' | 'USER_CONFIRMED' | 'SUBMITTED' | 'MANUAL_REQUIRED'
      mapped_fields TEXT NOT NULL, -- JSON
      review_confirmed INTEGER DEFAULT 0,
      submitted_at TEXT,
      notes TEXT,
      FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
    );

    -- Hackathon Idea Workspaces
    CREATE TABLE IF NOT EXISTS idea_workspaces (
      workspace_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      idea_concept TEXT NOT NULL,
      validation_score REAL DEFAULT 0,
      evaluation_details TEXT, -- JSON
      generated_brief TEXT,    -- JSON
      presentation_outline TEXT, -- JSON
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
    );

    -- Shared Ingestion Cache (Request Coalescing & Re-use)
    CREATE TABLE IF NOT EXISTS ingestion_cache (
      cache_key TEXT PRIMARY KEY,
      source_platform TEXT NOT NULL,
      location TEXT NOT NULL,
      category TEXT NOT NULL,
      discovered_count INTEGER DEFAULT 0,
      status TEXT NOT NULL, -- 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
      last_refreshed_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
  `);
}

// Initialize on module load
initDatabase();

