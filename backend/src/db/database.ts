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
    -- Canonical Locations: Countries
    CREATE TABLE IF NOT EXISTS countries (
      country_id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    -- Canonical Locations: States / Provinces
    CREATE TABLE IF NOT EXISTS states (
      state_id TEXT PRIMARY KEY,
      country_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (country_id) REFERENCES countries(country_id)
    );
    CREATE INDEX IF NOT EXISTS idx_states_country ON states (country_id);

    -- Canonical Locations: Cities
    CREATE TABLE IF NOT EXISTS cities (
      city_id TEXT PRIMARY KEY,
      state_id TEXT NOT NULL,
      country_id TEXT NOT NULL,
      name TEXT NOT NULL,
      canonical_name TEXT NOT NULL,
      aliases TEXT, -- JSON array of strings
      latitude REAL,
      longitude REAL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (state_id) REFERENCES states(state_id),
      FOREIGN KEY (country_id) REFERENCES countries(country_id)
    );
    CREATE INDEX IF NOT EXISTS idx_cities_state ON cities (state_id);
    CREATE INDEX IF NOT EXISTS idx_cities_name ON cities (name);

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
      city_id TEXT,
      state_id TEXT,
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
      updated_at TEXT NOT NULL,
      FOREIGN KEY (city_id) REFERENCES cities(city_id),
      FOREIGN KEY (state_id) REFERENCES states(state_id)
    );

    CREATE INDEX IF NOT EXISTS idx_events_city ON events (city);
    CREATE INDEX IF NOT EXISTS idx_events_format ON events (online_or_in_person);
    CREATE INDEX IF NOT EXISTS idx_events_deadline ON events (registration_deadline);
    CREATE INDEX IF NOT EXISTS idx_events_start ON events (start_datetime);
    CREATE INDEX IF NOT EXISTS idx_events_platform ON events (source_platform);

    -- Taxonomy: Dynamic Event Categories
    CREATE TABLE IF NOT EXISTS categories (
      category_id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      parent_category_id TEXT,
      description TEXT,
      keywords TEXT, -- JSON array of key phrases
      signals TEXT,  -- JSON definition of signal weights
      display_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (parent_category_id) REFERENCES categories(category_id)
    );
    CREATE INDEX IF NOT EXISTS idx_cat_parent ON categories (parent_category_id);
    CREATE INDEX IF NOT EXISTS idx_cat_slug ON categories (slug);

    -- Category Synonyms and Aliases
    CREATE TABLE IF NOT EXISTS category_aliases (
      id TEXT PRIMARY KEY,
      alias TEXT NOT NULL UNIQUE,
      category_id TEXT NOT NULL,
      confidence REAL DEFAULT 1.0,
      FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_alias_text ON category_aliases (alias);

    -- Event Multi-Label Classifications & Evidence
    CREATE TABLE IF NOT EXISTS event_classifications (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL UNIQUE,
      primary_category_id TEXT NOT NULL,
      secondary_category_ids TEXT, -- JSON array of category_ids
      confidence REAL NOT NULL,
      signals TEXT,                -- JSON array of matched signals/evidence
      reasoning_summary TEXT,
      classification_status TEXT NOT NULL, -- 'CLASSIFIED' | 'NEEDS_REVIEW' | 'UNCLASSIFIED'
      classified_at TEXT NOT NULL,
      model_or_rule TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
      FOREIGN KEY (primary_category_id) REFERENCES categories(category_id)
    );
    CREATE INDEX IF NOT EXISTS idx_event_class_primary ON event_classifications (primary_category_id);
    CREATE INDEX IF NOT EXISTS idx_event_class_status ON event_classifications (classification_status);

    -- Tracked User Search Queries for Intent & Gap Detection
    CREATE TABLE IF NOT EXISTS category_search_queries (
      id TEXT PRIMARY KEY,
      query_text TEXT NOT NULL,
      normalized_query TEXT NOT NULL,
      resolved_category_id TEXT,
      is_mapped INTEGER DEFAULT 0,
      search_count INTEGER DEFAULT 1,
      first_searched_at TEXT NOT NULL,
      last_searched_at TEXT NOT NULL,
      FOREIGN KEY (resolved_category_id) REFERENCES categories(category_id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_search_query_norm ON category_search_queries (normalized_query);

    -- Category Proposals for Review & Discovery
    CREATE TABLE IF NOT EXISTS category_proposals (
      proposal_id TEXT PRIMARY KEY,
      suggested_name TEXT NOT NULL UNIQUE,
      suggested_slug TEXT NOT NULL UNIQUE,
      description TEXT,
      parent_candidate_id TEXT,
      source_queries TEXT, -- JSON array
      sample_event_ids TEXT, -- JSON array
      search_frequency INTEGER DEFAULT 1,
      event_matches_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'NEEDS_REVIEW', -- 'NEEDS_REVIEW' | 'APPROVED' | 'MERGED' | 'REJECTED'
      reviewed_by TEXT,
      reviewed_at TEXT,
      review_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Category Review & Migration History
    CREATE TABLE IF NOT EXISTS category_review_history (
      history_id TEXT PRIMARY KEY,
      proposal_id TEXT NOT NULL,
      action TEXT NOT NULL, -- 'APPROVE_NEW' | 'APPROVE_SUB' | 'MERGE' | 'REJECT'
      target_category_id TEXT,
      admin_notes TEXT,
      applied_at TEXT NOT NULL,
      FOREIGN KEY (proposal_id) REFERENCES category_proposals(proposal_id)
    );

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

  // Migration helper for existing events table columns & indexes
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(events)`).all() as Array<{ name: string }>;
    const columnNames = new Set(tableInfo.map(c => c.name));
    
    if (!columnNames.has('city_id')) {
      db.exec(`ALTER TABLE events ADD COLUMN city_id TEXT REFERENCES cities(city_id);`);
    }
    if (!columnNames.has('state_id')) {
      db.exec(`ALTER TABLE events ADD COLUMN state_id TEXT REFERENCES states(state_id);`);
    }

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_events_city_id ON events (city_id);
      CREATE INDEX IF NOT EXISTS idx_events_state_id ON events (state_id);
    `);

    // Migration helper for registration_audits table
    const auditTableInfo = db.prepare(`PRAGMA table_info(registration_audits)`).all() as Array<{ name: string }>;
    const auditColumns = new Set(auditTableInfo.map(c => c.name));

    if (!auditColumns.has('required_fields_schema')) {
      db.exec(`ALTER TABLE registration_audits ADD COLUMN required_fields_schema TEXT;`);
    }
    if (!auditColumns.has('missing_fields')) {
      db.exec(`ALTER TABLE registration_audits ADD COLUMN missing_fields TEXT;`);
    }
    if (!auditColumns.has('readiness_percentage')) {
      db.exec(`ALTER TABLE registration_audits ADD COLUMN readiness_percentage INTEGER DEFAULT 0;`);
    }
    if (!auditColumns.has('email_sent_to')) {
      db.exec(`ALTER TABLE registration_audits ADD COLUMN email_sent_to TEXT;`);
    }
    if (!auditColumns.has('email_delivery_status')) {
      db.exec(`ALTER TABLE registration_audits ADD COLUMN email_delivery_status TEXT;`);
    }
    if (!auditColumns.has('email_timestamp')) {
      db.exec(`ALTER TABLE registration_audits ADD COLUMN email_timestamp TEXT;`);
    }
    if (!auditColumns.has('hackathon_confirmation_url')) {
      db.exec(`ALTER TABLE registration_audits ADD COLUMN hackathon_confirmation_url TEXT;`);
    }
    if (!auditColumns.has('hackathon_confirmation_status')) {
      db.exec(`ALTER TABLE registration_audits ADD COLUMN hackathon_confirmation_status TEXT;`);
    }
    if (!auditColumns.has('hackathon_badge_id')) {
      db.exec(`ALTER TABLE registration_audits ADD COLUMN hackathon_badge_id TEXT;`);
    }
    if (!auditColumns.has('tinyfish_run_id')) {
      db.exec(`ALTER TABLE registration_audits ADD COLUMN tinyfish_run_id TEXT;`);
    }
    if (!auditColumns.has('tinyfish_result')) {
      db.exec(`ALTER TABLE registration_audits ADD COLUMN tinyfish_result TEXT;`);
    }
    if (!auditColumns.has('tinyfish_streaming_url')) {
      db.exec(`ALTER TABLE registration_audits ADD COLUMN tinyfish_streaming_url TEXT;`);
    }
  } catch (err) {
    console.warn('Migration column check warning:', err);
  }
}

// Initialize on module load
initDatabase();
