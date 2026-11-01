import { db } from '../db/database';
import { CanonicalEvent, SavedFilter, StructuredFilterCriteria } from '../models/types';
import { ingestionService } from './ingestion.service';
import { v4 as uuidv4 } from 'uuid';

export class FilterService {
  /**
   * Applies validated structured criteria to the shared canonical events in SQLite
   */
  applyFilter(criteria: StructuredFilterCriteria, baseSearchText?: string): CanonicalEvent[] {
    let baseSql = `SELECT * FROM events WHERE 1=1`;
    const params: any[] = [];

    // 1. Price constraint
    if (criteria.price) {
      if (criteria.price.free_only || criteria.price.max === 0) {
        baseSql += ` AND price = 0`;
      } else if (criteria.price.max !== undefined) {
        baseSql += ` AND price <= ?`;
        params.push(criteria.price.max);
      }
    }

    // 2. Registration status
    if (criteria.registration_open_only) {
      baseSql += ` AND (registration_status = 'OPEN' OR registration_status = 'CLOSING_SOON')`;
    }

    // 3. Prize money
    if (criteria.has_prize_money) {
      baseSql += ` AND (prize_pool IS NOT NULL OR prize_pool_numeric > 0)`;
    }

    // 4. Team size
    if (criteria.team_size?.min !== undefined) {
      baseSql += ` AND (team_size_max IS NULL OR team_size_max >= ?)`;
      params.push(criteria.team_size.min);
    }
    if (criteria.team_size?.max !== undefined) {
      baseSql += ` AND (team_size_min IS NULL OR team_size_min <= ?)`;
      params.push(criteria.team_size.max);
    }

    // 5. Locations
    if (criteria.locations) {
      const locConditions: string[] = [];

      if (criteria.locations.only_online) {
        locConditions.push(`online_or_in_person = 'ONLINE'`);
      } else {
        if (criteria.locations.include_online) {
          locConditions.push(`online_or_in_person = 'ONLINE'`);
        }
        if (criteria.locations.cities && criteria.locations.cities.length > 0) {
          for (const city of criteria.locations.cities) {
            locConditions.push(`lower(city) LIKE ?`);
            params.push(`%${city.toLowerCase()}%`);
          }
        }
        if (criteria.locations.states && criteria.locations.states.length > 0) {
          for (const state of criteria.locations.states) {
            locConditions.push(`lower(state) LIKE ?`);
            params.push(`%${state.toLowerCase()}%`);
          }
        }
      }

      if (locConditions.length > 0) {
        baseSql += ` AND (${locConditions.join(' OR ')})`;
      }
    }

    // 6. Base text search (typo-tolerant / keyword match)
    if (baseSearchText && baseSearchText.trim().length > 0) {
      const tokens = baseSearchText.toLowerCase().split(/\s+/).filter(t => t.length > 2);
      if (tokens.length > 0) {
        const textConditions = tokens.map(() => `(lower(canonical_title) LIKE ? OR lower(description) LIKE ? OR lower(tags) LIKE ?)`).join(' AND ');
        baseSql += ` AND (${textConditions})`;
        for (const token of tokens) {
          params.push(`%${token}%`, `%${token}%`, `%${token}%`);
        }
      }
    }

    baseSql += ` ORDER BY start_datetime ASC`;

    const rows = db.prepare(baseSql).all(...params) as any[];
    let events = rows.map(r => ingestionService.deserializeEvent(r));

    // Post-filter for topics/technologies if specified
    if (criteria.topics && criteria.topics.length > 0) {
      const requiredTopics = criteria.topics.map(t => t.toLowerCase());
      events = events.filter(e => {
        const combined = `${e.canonical_title} ${e.description} ${e.technologies.join(' ')} ${e.categories.join(' ')}`.toLowerCase();
        return requiredTopics.some(topic => combined.includes(topic));
      });
    }

    // Post-filter for categories if specified
    if (criteria.categories && criteria.categories.length > 0) {
      const cats = criteria.categories.map(c => c.toLowerCase());
      events = events.filter(e => {
        return cats.some(c => e.event_type.toLowerCase() === c || e.categories.some(ec => ec.toLowerCase().includes(c)));
      });
    }

    return events;
  }

  /**
   * Save a personalized filter for a user
   */
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

  /**
   * Get all saved filters for a user
   */
  getUserFilters(userId: string): SavedFilter[] {
    const rows = db.prepare('SELECT * FROM custom_filters WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
    return rows.map(r => ({
      filter_id: r.filter_id,
      user_id: r.user_id,
      name: r.name,
      natural_query: r.natural_query,
      structured_criteria: JSON.parse(r.structured_criteria || '{}'),
      created_at: r.created_at
    }));
  }

  /**
   * Delete a saved filter
   */
  deleteUserFilter(userId: string, filterId: string): boolean {
    const res = db.prepare('DELETE FROM custom_filters WHERE filter_id = ? AND user_id = ?').run(filterId, userId);
    return res.changes > 0;
  }
}

export const filterService = new FilterService();

