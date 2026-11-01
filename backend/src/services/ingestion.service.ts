import { db } from '../db/database';
import { CanonicalEvent, EventContentChunk, EventRelationship } from '../models/types';
import { tinyFishService } from './tinyfish.service';
import { normalizationService } from './normalization.service';
import { SOURCE_REGISTRY } from '../config/sources';
import { v4 as uuidv4 } from 'uuid';

export class IngestionService {
  // In-memory request coalescing mutex to prevent duplicate concurrent scraping
  private activeJobs: Map<string, Promise<CanonicalEvent[]>> = new Map();

  /**
   * Generates a simple text embedding vector (32-dim normalized bag-of-words/character hash)
   * for zero-dependency semantic cosine similarity search in local runtime, fully upgradeable to OpenAI/Gemini embeddings.
   */
  generateEmbedding(text: string): number[] {
    const dim = 32;
    const vec = new Array(dim).fill(0);
    const words = text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
    if (words.length === 0) return vec;

    for (const w of words) {
      let hash = 0;
      for (let i = 0; i < w.length; i++) {
        hash = (hash << 5) - hash + w.charCodeAt(i);
        hash |= 0;
      }
      const idx = Math.abs(hash) % dim;
      vec[idx] += 1;
    }

    // L2 Normalize
    let norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < dim; i++) vec[i] /= norm;
    }
    return vec;
  }

  /**
   * Request Coalesced Ingestion: Ensures only ONE scraper runs per (location + category)
   */
  async ingestLocationEvents(location: string = 'Bengaluru', category: string = 'Hackathons', forceRefresh: boolean = false): Promise<CanonicalEvent[]> {
    const normalizedLoc = location.trim().toLowerCase();
    const normalizedCat = category.trim().toLowerCase();
    const cacheKey = `${normalizedLoc}:${normalizedCat}`;

    // 1. Check in-flight coalesced job
    if (this.activeJobs.has(cacheKey)) {
      console.log(`[IngestionService] Request coalescing hit: Reusing in-flight ingestion for ${cacheKey}`);
      return await this.activeJobs.get(cacheKey)!;
    }

    // 2. Check cached records in database if not forcing refresh
    if (!forceRefresh) {
      const cached = db.prepare(`
        SELECT * FROM ingestion_cache 
        WHERE cache_key = ? AND datetime(expires_at) > datetime('now')
      `).get(cacheKey) as any;

      if (cached) {
        console.log(`[IngestionService] Cache hit: Returning stored canonical events for ${cacheKey}`);
        return this.getStoredEventsForLocation(location);
      }
    }

    // 3. Launch single coordinated job
    const jobPromise = this.executeIngestion(location, category, cacheKey);
    this.activeJobs.set(cacheKey, jobPromise);

    try {
      const results = await jobPromise;
      return results;
    } finally {
      this.activeJobs.delete(cacheKey);
    }
  }

  /**
   * Core discovery & extraction workflow
   */
  private async executeIngestion(location: string, category: string, cacheKey: string): Promise<CanonicalEvent[]> {
    console.log(`[IngestionService] Starting live ingestion for location="${location}", category="${category}"`);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour shared cache TTL

    // Upsert cache record as IN_PROGRESS
    db.prepare(`
      INSERT INTO ingestion_cache (cache_key, source_platform, location, category, discovered_count, status, last_refreshed_at, expires_at)
      VALUES (?, ?, ?, ?, 0, 'IN_PROGRESS', ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET
        status = 'IN_PROGRESS',
        last_refreshed_at = excluded.last_refreshed_at,
        expires_at = excluded.expires_at
    `).run(cacheKey, 'multi-source', location, category, now.toISOString(), expiresAt.toISOString());

    const discoveredUrls: Array<{ url: string; platform: string }> = [];

    // Query active sources from registry
    for (const [sourceKey, source] of Object.entries(SOURCE_REGISTRY)) {
      if (!source.enabled) continue;

      const query = source.searchQueryTemplates[0].replace('{location}', location);
      const searchResults = await tinyFishService.search(query);

      for (const res of searchResults.slice(0, 3)) { // Top 3 per source
        // Filter out search directories or general tags
        if (res.url.includes('/explore/') || res.url.endsWith('.com/') || res.url.endsWith('.co/')) continue;
        discoveredUrls.push({ url: res.url, platform: source.name });
      }
    }

    console.log(`[IngestionService] Discovered ${discoveredUrls.length} candidate URLs for ${location}`);

    // Fetch batch URLs using TinyFish
    const urlsToFetch = Array.from(new Set(discoveredUrls.map(d => d.url))).slice(0, 8);
    const fetchResponse = await tinyFishService.fetchContent(urlsToFetch);

    const savedEvents: CanonicalEvent[] = [];

    for (const item of fetchResponse.results) {
      if (!item.text || item.text.length < 50) continue;

      const discoveredMeta = discoveredUrls.find(d => d.url === item.url || d.url === item.final_url);
      const platform = discoveredMeta ? discoveredMeta.platform : 'External';

      const canonicalEvent = normalizationService.normalizePage(item, platform, { location, category });
      this.saveEvent(canonicalEvent);
      savedEvents.push(canonicalEvent);

      // Create Knowledge Base Chunks
      this.createEventChunks(canonicalEvent, item.text);
    }

    // Build event relationships
    this.detectRelationships(savedEvents);

    // Update ingestion cache
    db.prepare(`
      UPDATE ingestion_cache 
      SET status = 'COMPLETED', discovered_count = ?
      WHERE cache_key = ?
    `).run(savedEvents.length, cacheKey);

    console.log(`[IngestionService] Successfully ingested and saved ${savedEvents.length} events for ${location}`);
    return this.getStoredEventsForLocation(location);
  }

  /**
   * Saves or updates a canonical event record (idempotent, tracks changes)
   */
  saveEvent(event: CanonicalEvent) {
    const existing = db.prepare('SELECT content_hash, last_changed_at FROM events WHERE event_id = ?').get(event.event_id) as any;

    if (existing) {
      // Content changed check
      if (existing.content_hash !== event.content_hash) {
        event.last_changed_at = new Date().toISOString();
        db.prepare(`
          INSERT INTO event_changes (id, event_id, field_name, old_value, new_value, detected_at)
          VALUES (?, ?, 'content_hash', ?, ?, ?)
        `).run(uuidv4(), event.event_id, existing.content_hash, event.content_hash, event.last_changed_at);
      } else {
        event.last_changed_at = existing.last_changed_at;
      }
    }

    const stmt = db.prepare(`
      INSERT INTO events (
        event_id, canonical_title, description, short_summary, organizer_name,
        source_platform, source_url, registration_url, event_type, categories,
        tags, technologies, themes, start_datetime, end_datetime, timezone,
        registration_open_datetime, registration_deadline, location_name, city,
        state, country, latitude, longitude, online_or_in_person, attendance_format,
        price, currency, prize_pool, prize_pool_numeric, eligibility, target_audience,
        student_only, experience_level, team_size_min, team_size_max, required_skills,
        deliverables, submission_requirements, event_schedule, sponsors,
        organizer_information, registration_status, event_status, last_verified_at,
        last_changed_at, content_hash, extraction_confidence, field_verification_status,
        created_at, updated_at
      ) VALUES (
        @event_id, @canonical_title, @description, @short_summary, @organizer_name,
        @source_platform, @source_url, @registration_url, @event_type, @categories,
        @tags, @technologies, @themes, @start_datetime, @end_datetime, @timezone,
        @registration_open_datetime, @registration_deadline, @location_name, @city,
        @state, @country, @latitude, @longitude, @online_or_in_person, @attendance_format,
        @price, @currency, @prize_pool, @prize_pool_numeric, @eligibility, @target_audience,
        @student_only, @experience_level, @team_size_min, @team_size_max, @required_skills,
        @deliverables, @submission_requirements, @event_schedule, @sponsors,
        @organizer_information, @registration_status, @event_status, @last_verified_at,
        @last_changed_at, @content_hash, @extraction_confidence, @field_verification_status,
        @created_at, @updated_at
      )
      ON CONFLICT(source_url) DO UPDATE SET
        canonical_title = excluded.canonical_title,
        description = excluded.description,
        short_summary = excluded.short_summary,
        registration_deadline = excluded.registration_deadline,
        price = excluded.price,
        prize_pool = excluded.prize_pool,
        prize_pool_numeric = excluded.prize_pool_numeric,
        registration_status = excluded.registration_status,
        last_verified_at = excluded.last_verified_at,
        last_changed_at = excluded.last_changed_at,
        content_hash = excluded.content_hash,
        field_verification_status = excluded.field_verification_status,
        updated_at = excluded.updated_at
    `);

    stmt.run({
      ...event,
      categories: JSON.stringify(event.categories),
      tags: JSON.stringify(event.tags),
      technologies: JSON.stringify(event.technologies),
      themes: JSON.stringify(event.themes),
      eligibility: JSON.stringify(event.eligibility),
      target_audience: JSON.stringify(event.target_audience),
      student_only: event.student_only ? 1 : 0,
      required_skills: JSON.stringify(event.required_skills),
      deliverables: JSON.stringify(event.deliverables),
      submission_requirements: JSON.stringify(event.submission_requirements),
      event_schedule: JSON.stringify(event.event_schedule),
      sponsors: JSON.stringify(event.sponsors),
      field_verification_status: JSON.stringify(event.field_verification_status)
    });
  }

  /**
   * Splits page into knowledge base chunks for vector & RAG search
   */
  private createEventChunks(event: CanonicalEvent, fullText: string) {
    const sections: Array<{ name: string; content: string }> = [
      { name: 'overview', content: `${event.canonical_title}. ${event.short_summary}` },
      { name: 'rules_and_eligibility', content: `Eligibility: ${event.eligibility.join(', ')}. Student only: ${event.student_only}. Team size: ${event.team_size_min || 1} to ${event.team_size_max || 4}` },
      { name: 'prizes', content: `Prizes: ${event.prize_pool || 'Prizes to be announced'}. Sponsors: ${event.sponsors.join(', ')}` },
      { name: 'submissions', content: `Submission requirements: ${event.submission_requirements.join(', ')}. Deliverables: ${event.deliverables.join(', ')}` }
    ];

    const insertChunk = db.prepare(`
      INSERT INTO event_content_chunks (chunk_id, event_id, section_name, content, embedding, source_url, last_verified_at, content_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(chunk_id) DO UPDATE SET
        content = excluded.content,
        embedding = excluded.embedding,
        last_verified_at = excluded.last_verified_at
    `);

    for (const sec of sections) {
      const chunkId = uuidv4();
      const embedding = this.generateEmbedding(sec.content);
      const hash = normalizationService.computeContentHash(sec.content);

      insertChunk.run(
        chunkId,
        event.event_id,
        sec.name,
        sec.content,
        JSON.stringify(embedding),
        event.source_url,
        event.last_verified_at,
        hash
      );
    }
  }

  /**
   * Discovers relationships across ingested events
   */
  private detectRelationships(events: CanonicalEvent[]) {
    const insertRel = db.prepare(`
      INSERT OR IGNORE INTO event_relationships (id, source_event_id, target_event_id, relationship_type, confidence, evidence)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i];
        const b = events[j];

        // Same organizer
        if (a.organizer_name && b.organizer_name && a.organizer_name.toLowerCase() === b.organizer_name.toLowerCase()) {
          insertRel.run(uuidv4(), a.event_id, b.event_id, 'SAME_ORGANIZER', 0.95, `Both events organized by ${a.organizer_name}`);
        }

        // Shared tech stack / theme
        const commonTech = a.technologies.filter(t => b.technologies.includes(t));
        if (commonTech.length >= 2) {
          insertRel.run(uuidv4(), a.event_id, b.event_id, 'SAME_THEME', 0.85, `Both events focus on ${commonTech.join(', ')}`);
        }
      }
    }
  }

  /**
   * Retrieves stored events for a given location or format
   */
  getStoredEventsForLocation(location?: string): CanonicalEvent[] {
    let rows: any[];
    if (location && location.toLowerCase() !== 'all') {
      rows = db.prepare(`
        SELECT * FROM events 
        WHERE lower(city) LIKE lower(?) OR lower(state) LIKE lower(?) OR online_or_in_person = 'ONLINE'
        ORDER BY start_datetime ASC
      `).all(`%${location}%`, `%${location}%`);
    } else {
      rows = db.prepare('SELECT * FROM events ORDER BY start_datetime ASC').all();
    }

    return rows.map(this.deserializeEvent);
  }

  deserializeEvent(row: any): CanonicalEvent {
    return {
      ...row,
      categories: JSON.parse(row.categories || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      technologies: JSON.parse(row.technologies || '[]'),
      themes: JSON.parse(row.themes || '[]'),
      eligibility: JSON.parse(row.eligibility || '[]'),
      target_audience: JSON.parse(row.target_audience || '[]'),
      student_only: Boolean(row.student_only),
      required_skills: JSON.parse(row.required_skills || '[]'),
      deliverables: JSON.parse(row.deliverables || '[]'),
      submission_requirements: JSON.parse(row.submission_requirements || '[]'),
      event_schedule: JSON.parse(row.event_schedule || '[]'),
      sponsors: JSON.parse(row.sponsors || '[]'),
      field_verification_status: JSON.parse(row.field_verification_status || '{}')
    };
  }
}

export const ingestionService = new IngestionService();
