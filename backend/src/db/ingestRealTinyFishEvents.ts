import { db } from './database';
import { tinyFishService } from '../services/tinyfish.service';
import { normalizationService } from '../services/normalization.service';
import { LocationService } from '../services/location.service';
import { ClassificationEngine } from '../services/classification.service';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export async function ingestLiveTinyFishHackathons() {
  console.log('[TinyFish Ingestion] 🚀 Initiating 100% TinyFish live discovery across Luma, Unstop, Devpost...');

  const queries = [
    { query: 'site:lu.ma hackathon', platform: 'Luma', defaultFormat: 'HYBRID' },
    { query: 'site:unstop.com/hackathons', platform: 'Unstop', defaultFormat: 'ONLINE' },
    { query: 'site:devpost.com hackathons 2026', platform: 'Devpost', defaultFormat: 'ONLINE' }
  ];

  const discoveredItems: Array<{ url: string; platform: string; snippetTitle: string }> = [];

  for (const q of queries) {
    try {
      console.log(`[TinyFish] Searching: "${q.query}"...`);
      const results = await tinyFishService.search(q.query);
      console.log(`[TinyFish] "${q.query}" returned ${results.length} URLs`);

      for (const res of results.slice(0, 5)) {
        if (!res.url || res.url.endsWith('.com/') || res.url.includes('/explore/')) continue;
        discoveredItems.push({
          url: res.url,
          platform: q.platform,
          snippetTitle: res.title
        });
      }
    } catch (err: any) {
      console.error(`[TinyFish] Search error for ${q.query}:`, err.message);
    }
  }

  const uniqueUrls = Array.from(new Set(discoveredItems.map(d => d.url)));
  console.log(`[TinyFish Ingestion] Batch fetching ${uniqueUrls.length} live pages via TinyFish Content API...`);

  const fetchRes = await tinyFishService.fetchContent(uniqueUrls);
  console.log(`[TinyFish Ingestion] Received ${fetchRes.results.length} fetched web pages.`);

  // Clear previous sample/dummy events so only real live TinyFish events are displayed
  db.prepare(`DELETE FROM events WHERE source_url LIKE '%dummy%' OR source_url LIKE '%sample%'`).run();

  let ingestedCount = 0;

  for (const item of fetchRes.results) {
    if (!item.text || item.text.length < 40) continue;

    const meta = discoveredItems.find(d => d.url === item.url || d.url === item.final_url);
    const platform = meta ? meta.platform : (item.url.includes('lu.ma') ? 'Luma' : (item.url.includes('unstop') ? 'Unstop' : 'Devpost'));

    try {
      const canonical = normalizationService.normalizePage(item, platform);
      
      // Extract actual prize info if mentioned in text
      const lower = item.text.toLowerCase();
      if (!canonical.prize_pool) {
        const prizeMatch = item.text.match(/(\$[\d,]+|\b₹[\d,]+|\b[\d,]+(?:\s*k)?\s*(?:cash|prize|pool|credits))/i);
        if (prizeMatch) {
          canonical.prize_pool = prizeMatch[0];
          canonical.prize_pool_numeric = parseInt(prizeMatch[0].replace(/[^0-9]/g, '')) || 50000;
        }
      }

      // Upsert into SQLite
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
          prize_pool = excluded.prize_pool,
          updated_at = excluded.updated_at
      `);

      stmt.run({
        ...canonical,
        categories: JSON.stringify(canonical.categories),
        tags: JSON.stringify(canonical.tags),
        technologies: JSON.stringify(canonical.technologies),
        themes: JSON.stringify(canonical.themes),
        eligibility: JSON.stringify(canonical.eligibility),
        target_audience: JSON.stringify(canonical.target_audience),
        required_skills: JSON.stringify(canonical.required_skills),
        deliverables: JSON.stringify(canonical.deliverables),
        submission_requirements: JSON.stringify(canonical.submission_requirements),
        event_schedule: JSON.stringify(canonical.event_schedule),
        sponsors: JSON.stringify(canonical.sponsors),
        student_only: canonical.student_only ? 1 : 0,
        field_verification_status: JSON.stringify(canonical.field_verification_status)
      });

      ingestedCount++;
      console.log(`[TinyFish Ingestion] ✓ Saved real event: "${canonical.canonical_title}" (${platform})`);
    } catch (e: any) {
      console.error(`[TinyFish Ingestion] Error saving ${item.url}:`, e.message);
    }
  }

  // Normalize locations and run classification engine
  console.log('[TinyFish Ingestion] Normalizing locations and classifying tracks...');
  LocationService.normalizeAllEvents();
  ClassificationEngine.reclassifyAllEvents();

  console.log(`[TinyFish Ingestion] 🎉 Successfully ingested ${ingestedCount} live events directly via TinyFish!`);
}

// Execute if run directly
if (require.main === module) {
  ingestLiveTinyFishHackathons()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
