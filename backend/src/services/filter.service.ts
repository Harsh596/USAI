import { db } from '../db/database';
import { CanonicalEvent, SavedFilter, StructuredFilterCriteria } from '../models/types';
import { ingestionService } from './ingestion.service';
import { LocationService } from './location.service';
import { TaxonomyService } from './taxonomy.service';
import { v4 as uuidv4 } from 'uuid';

export interface EnrichedEvent extends CanonicalEvent {
  primary_category_id?: string;
  primary_category_name?: string;
  secondary_category_ids?: string[];
  classification_confidence?: number;
  classification_status?: 'CLASSIFIED' | 'NEEDS_REVIEW' | 'UNCLASSIFIED';
  reasoning_summary?: string;
  city_id?: string | null;
  state_id?: string | null;
  canonical_city?: string | null;
  canonical_state?: string | null;
  relevance_score?: number;
  match_reasons?: string[];
  is_relaxed_match?: boolean;
}

export interface FilterOptions extends StructuredFilterCriteria {
  city_ids?: string[];
  state_id?: string;
  category_ids?: string[];
  only_online?: boolean;
  include_online?: boolean;
  experience_levels?: string[];
}

export class FilterService {
  /**
   * Applies validated structured criteria to the shared canonical events in SQLite
   * with two-stage semantic relevance scoring and zero-dead-end relaxation.
   */
  applyFilter(criteria: FilterOptions, baseSearchText?: string): EnrichedEvent[] {
    const results = this.executeFilterQuery(criteria, baseSearchText);

    // If strict filter yielded results, return ranked
    if (results.length > 0) {
      return results;
    }

    // Smart Relaxation Fallback:
    // If strict filter returned 0 events (e.g. strict city + strict category),
    // intelligently relax the most restrictive constraint so user gets meaningful alternatives.
    return this.executeRelaxedFallback(criteria, baseSearchText);
  }

  private executeFilterQuery(criteria: FilterOptions, baseSearchText?: string): EnrichedEvent[] {
    let baseSql = `
      SELECT 
        e.*,
        ec.primary_category_id,
        ec.secondary_category_ids,
        ec.confidence as classification_confidence,
        ec.classification_status,
        ec.reasoning_summary,
        c.name as primary_category_name,
        ci.canonical_name as canonical_city,
        s.name as canonical_state
      FROM events e
      LEFT JOIN event_classifications ec ON e.event_id = ec.event_id
      LEFT JOIN categories c ON ec.primary_category_id = c.category_id
      LEFT JOIN cities ci ON e.city_id = ci.city_id
      LEFT JOIN states s ON e.state_id = s.state_id
      WHERE 1=1
    `;
    const params: any[] = [];

    // 1. Price constraint
    if (criteria.price) {
      if (criteria.price.free_only || criteria.price.max === 0) {
        baseSql += ` AND e.price = 0`;
      } else if (criteria.price.max !== undefined) {
        baseSql += ` AND e.price <= ?`;
        params.push(criteria.price.max);
      }
    }

    // 2. Registration status
    if (criteria.registration_open_only) {
      baseSql += ` AND (e.registration_status = 'OPEN' OR e.registration_status = 'CLOSING_SOON')`;
    }

    // 3. Prize money
    if (criteria.has_prize_money) {
      baseSql += ` AND (e.prize_pool IS NOT NULL OR e.prize_pool_numeric > 0)`;
    }

    // 4. Team size
    if (criteria.team_size?.min !== undefined) {
      baseSql += ` AND (e.team_size_max IS NULL OR e.team_size_max >= ?)`;
      params.push(criteria.team_size.min);
    }
    if (criteria.team_size?.max !== undefined) {
      baseSql += ` AND (e.team_size_min IS NULL OR e.team_size_min <= ?)`;
      params.push(criteria.team_size.max);
    }

    // 5. Locations (Accurate multi-city, state, and separate online filtering)
    const isOnlyOnline = criteria.only_online || criteria.locations?.only_online;
    const isIncludeOnline = criteria.include_online || criteria.locations?.include_online;
    const cityIds = criteria.city_ids || [];
    const stateId = criteria.state_id;
    const citiesFromCriteria = criteria.locations?.cities || [];
    const statesFromCriteria = criteria.locations?.states || [];

    if (isOnlyOnline) {
      baseSql += ` AND (e.attendance_format = 'ONLINE' OR e.online_or_in_person = 'ONLINE')`;
    } else {
      const locConditions: string[] = [];

      if (isIncludeOnline) {
        locConditions.push(`(e.attendance_format = 'ONLINE' OR e.online_or_in_person = 'ONLINE')`);
      }

      // Check explicit city IDs or city names
      if (cityIds.length > 0) {
        for (const cid of cityIds) {
          const resolved = LocationService.resolveLocation(cid);
          if (resolved.cityId) {
            locConditions.push(`(e.city_id = ? OR lower(e.city) LIKE ?)`);
            params.push(resolved.cityId, `%${cid.toLowerCase()}%`);
          } else {
            locConditions.push(`(e.city_id = ? OR lower(e.city) LIKE ?)`);
            params.push(cid, `%${cid.toLowerCase()}%`);
          }
        }
      }

      // Check named cities (from natural query or legacy criteria)
      for (const cityName of citiesFromCriteria) {
        const resolved = LocationService.resolveLocation(cityName);
        if (resolved.cityId) {
          locConditions.push(`e.city_id = ?`);
          params.push(resolved.cityId);
        } else {
          locConditions.push(`lower(e.city) LIKE ?`);
          params.push(`%${cityName.toLowerCase()}%`);
        }
      }

      // Check state ID or names
      if (stateId) {
        locConditions.push(`e.state_id = ?`);
        params.push(stateId);
      }
      for (const st of statesFromCriteria) {
        const resolved = LocationService.resolveLocation(st);
        if (resolved.stateId) {
          locConditions.push(`e.state_id = ?`);
          params.push(resolved.stateId);
        } else {
          locConditions.push(`lower(e.state) LIKE ?`);
          params.push(`%${st.toLowerCase()}%`);
        }
      }

      if (locConditions.length > 0) {
        baseSql += ` AND (${locConditions.join(' OR ')})`;
      }
    }

    // 6. Category Filtering (by category_id or multi-category selection or event_type)
    const categoryIds = criteria.category_ids || [];
    if (categoryIds.length > 0) {
      const catConditions: string[] = [];
      for (const catId of categoryIds) {
        const lower = catId.toLowerCase().trim();
        if (lower === 'all' || lower === 'all categories' || lower === '') {
          continue;
        }
        if (lower === 'hackathons' || lower === 'hackathon') {
          catConditions.push(`(lower(e.event_type) LIKE '%hackathon%' OR lower(e.categories) LIKE '%hackathon%')`);
          continue;
        }

        const queryAnalysis = TaxonomyService.processSearchQuery(catId);
        const targetId = queryAnalysis.matchedCategoryId || catId;
        catConditions.push(`(
          ec.primary_category_id = ? OR 
          ec.secondary_category_ids LIKE ? OR 
          lower(COALESCE(c.name, '')) LIKE ? OR 
          lower(e.categories) LIKE ?
        )`);
        params.push(targetId, `%"${targetId}"%`, `%${lower}%`, `%${lower}%`);
      }
      if (catConditions.length > 0) {
        baseSql += ` AND (${catConditions.join(' OR ')})`;
      }
    }

    // 7. Base text search & Search Intent Logging
    if (baseSearchText && baseSearchText.trim().length > 0) {
      const queryAnalysis = TaxonomyService.processSearchQuery(baseSearchText);
      const tokens = baseSearchText.toLowerCase().split(/\s+/).filter(t => t.length > 2);

      if (tokens.length > 0) {
        // Use OR disjunction across tokens so minor synonym differences don't eliminate valid events
        const textConditions = tokens.map(() => `(
          lower(e.canonical_title) LIKE ? OR 
          lower(e.description) LIKE ? OR 
          lower(e.tags) LIKE ? OR
          lower(e.categories) LIKE ? OR
          lower(COALESCE(c.name, '')) LIKE ?
        )`).join(' OR ');

        // If taxonomy resolved to a specific category, allow matching that category
        if (queryAnalysis.isMapped && queryAnalysis.matchedCategoryId) {
          baseSql += ` AND ((${textConditions}) OR ec.primary_category_id = ?)`;
          for (const token of tokens) {
            params.push(`%${token}%`, `%${token}%`, `%${token}%`, `%${token}%`, `%${token}%`);
          }
          params.push(queryAnalysis.matchedCategoryId);
        } else {
          baseSql += ` AND (${textConditions})`;
          for (const token of tokens) {
            params.push(`%${token}%`, `%${token}%`, `%${token}%`, `%${token}%`, `%${token}%`);
          }
        }
      }
    }

    baseSql += ` ORDER BY e.start_datetime ASC`;

    const rows = db.prepare(baseSql).all(...params) as any[];
    return this.scoreAndEnrichEvents(rows, criteria, baseSearchText);
  }

  /**
   * Two-Stage Semantic Scoring: Ranks candidates by match quality
   */
  private scoreAndEnrichEvents(rows: any[], criteria: FilterOptions, baseSearchText?: string): EnrichedEvent[] {
    const tokens = (baseSearchText || '').toLowerCase().split(/\s+/).filter(t => t.length > 2);

    const scored = rows.map(r => {
      const deserialized = ingestionService.deserializeEvent(r);
      let score = 50; // baseline
      const reasons: string[] = [];

      // Category relevance
      if (criteria.category_ids && criteria.category_ids.length > 0) {
        if (criteria.category_ids.includes(r.primary_category_id)) {
          score += 30;
          reasons.push(r.primary_category_name || 'Track Match');
        }
      }

      // Location relevance
      if (criteria.only_online) {
        if (r.attendance_format === 'ONLINE' || r.online_or_in_person === 'ONLINE') {
          score += 25;
          reasons.push('Online Event');
        }
      } else if (criteria.city_ids && criteria.city_ids.length > 0) {
        if (criteria.city_ids.includes(r.city_id)) {
          score += 25;
          reasons.push(r.canonical_city || 'City Match');
        } else if (r.attendance_format === 'ONLINE') {
          score += 15;
          reasons.push('Online Option');
        }
      }

      // Prize Pool relevance
      if (criteria.has_prize_money) {
        if (r.prize_pool || (r.prize_pool_numeric && r.prize_pool_numeric > 0)) {
          score += 20;
          reasons.push(r.prize_pool || 'Verified Prizes');
        }
      }

      // Free Entry relevance
      if (criteria.price?.free_only || criteria.price?.max === 0) {
        if (r.price === 0) {
          score += 15;
          reasons.push('Free Entry');
        }
      }

      // Beginner / Experience relevance
      if (criteria.experience_levels?.includes('BEGINNER') || tokens.some(t => t.includes('begin') || t.includes('student'))) {
        if (r.experience_level === 'BEGINNER' || r.experience_level === 'ALL' || r.student_only === 1) {
          score += 20;
          reasons.push('Beginner Friendly');
        }
      }

      // Text token match
      const textCorpus = `${r.canonical_title} ${r.description} ${r.tags} ${r.categories}`.toLowerCase();
      for (const t of tokens) {
        if (textCorpus.includes(t)) {
          score += 10;
        }
      }

      const cappedScore = Math.min(99, Math.max(50, score));

      const enriched: EnrichedEvent = {
        ...deserialized,
        primary_category_id: r.primary_category_id,
        primary_category_name: r.primary_category_name,
        secondary_category_ids: JSON.parse(r.secondary_category_ids || '[]'),
        classification_confidence: r.classification_confidence,
        classification_status: r.classification_status,
        reasoning_summary: r.reasoning_summary,
        city_id: r.city_id,
        state_id: r.state_id,
        canonical_city: r.canonical_city,
        canonical_state: r.canonical_state,
        relevance_score: cappedScore,
        match_reasons: Array.from(new Set(reasons))
      };

      return enriched;
    });

    // Sort by relevance score descending, then start date
    return scored.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  }

  /**
   * Smart Relaxation Fallback when strict filter yields 0 matches
   */
  private executeRelaxedFallback(criteria: FilterOptions, baseSearchText?: string): EnrichedEvent[] {
    console.log('[FilterService] Strict query returned 0 matches. Executing intelligent relaxation...');

    // 1. Try relaxing location to Online + National
    if (criteria.city_ids && criteria.city_ids.length > 0) {
      const relaxedLoc: FilterOptions = {
        ...criteria,
        city_ids: undefined,
        locations: undefined,
        include_online: true
      };
      const onlineMatches = this.executeFilterQuery(relaxedLoc, baseSearchText);
      if (onlineMatches.length > 0) {
        return onlineMatches.map(m => ({
          ...m,
          is_relaxed_match: true,
          match_reasons: ['Alternative: Available Online / National', ...(m.match_reasons || [])]
        }));
      }
    }

    // 2. Try relaxing specific category to broader Engineering Hackathons in the target location
    if (criteria.category_ids && criteria.category_ids.length > 0) {
      const relaxedCat: FilterOptions = {
        ...criteria,
        category_ids: undefined
      };
      const cityMatches = this.executeFilterQuery(relaxedCat);
      if (cityMatches.length > 0) {
        return cityMatches.map(m => ({
          ...m,
          is_relaxed_match: true,
          match_reasons: ['Alternative: Tech Hackathons in Target Location', ...(m.match_reasons || [])]
        }));
      }
    }

    // 3. Fallback to broad text search
    if (baseSearchText) {
      const textMatches = this.executeFilterQuery({}, baseSearchText);
      if (textMatches.length > 0) {
        return textMatches.map(m => ({
          ...m,
          is_relaxed_match: true,
          match_reasons: ['Keyword Match', ...(m.match_reasons || [])]
        }));
      }
    }

    // 4. Return top verified hackathons as smart recommendations
    const topRecommended = this.executeFilterQuery({});
    return topRecommended.slice(0, 6).map(m => ({
      ...m,
      is_relaxed_match: true,
      match_reasons: ['Recommended Alternative Hackathon', ...(m.match_reasons || [])]
    }));
  }

  saveUserFilter(userId: string, name: string, naturalQuery: string, criteria: StructuredFilterCriteria): SavedFilter {
    const filterId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO custom_filters (filter_id, user_id, name, natural_query, structured_criteria, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(filterId, userId, name, naturalQuery, JSON.stringify(criteria), now);

    return {
      filter_id: filterId,
      user_id: userId,
      name,
      natural_query: naturalQuery,
      structured_criteria: criteria,
      created_at: now
    };
  }

  getUserFilters(userId: string): SavedFilter[] {
    const rows = db.prepare('SELECT * FROM custom_filters WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
    return rows.map(r => ({
      filter_id: r.filter_id,
      user_id: r.user_id,
      name: r.name,
      natural_query: r.natural_query,
      structured_criteria: JSON.parse(r.structured_criteria),
      created_at: r.created_at
    }));
  }

  deleteUserFilter(userId: string, filterId: string): boolean {
    const res = db.prepare('DELETE FROM custom_filters WHERE filter_id = ? AND user_id = ?').run(filterId, userId);
    return res.changes > 0;
  }
}

export const filterService = new FilterService();
