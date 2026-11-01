import { db } from '../db/database';

export interface LocationResolution {
  cityId: string | null;
  stateId: string | null;
  cityName: string | null;
  stateName: string | null;
  isOnline: boolean;
  confidence: number;
  matchedAlias?: string;
}

export interface CityRecord {
  city_id: string;
  state_id: string;
  country_id: string;
  name: string;
  canonical_name: string;
  state_name: string;
  country_name: string;
  aliases: string[];
  event_count?: number;
}

export interface StateRecord {
  state_id: string;
  country_id: string;
  name: string;
  code: string;
  country_name: string;
  city_count?: number;
  event_count?: number;
}

export class LocationService {
  private static cachedCities: Array<{
    city_id: string;
    state_id: string;
    name: string;
    canonical_name: string;
    aliases: string[];
  }> | null = null;

  private static cachedStates: Array<{
    state_id: string;
    name: string;
    code: string;
  }> | null = null;

  private static reloadCache() {
    const rawCities = db.prepare(`
      SELECT city_id, state_id, name, canonical_name, aliases
      FROM cities
    `).all() as Array<{
      city_id: string;
      state_id: string;
      name: string;
      canonical_name: string;
      aliases: string;
    }>;

    this.cachedCities = rawCities.map(c => ({
      ...c,
      aliases: JSON.parse(c.aliases || '[]')
    }));

    this.cachedStates = db.prepare(`
      SELECT state_id, name, code
      FROM states
    `).all() as Array<{
      state_id: string;
      name: string;
      code: string;
    }>;
  }

  /**
   * Resolves raw text (location name, address, description hints) to canonical city, state, or online
   */
  static resolveLocation(rawText: string = '', isExplicitOnline = false): LocationResolution {
    if (!this.cachedCities || !this.cachedStates) {
      this.reloadCache();
    }

    const clean = (rawText || '').trim().toLowerCase();

    // 1. Check for purely online signals
    const onlineKeywords = ['online', 'virtual', 'remote', 'zoom', 'google meet', 'discord', 'gather.town'];
    const isOnlineText = onlineKeywords.some(kw => clean.includes(kw));
    
    if (isExplicitOnline || (isOnlineText && !this.cachedCities?.some(c => c.aliases.some(a => clean.includes(a))))) {
      return {
        cityId: null,
        stateId: null,
        cityName: null,
        stateName: null,
        isOnline: true,
        confidence: 1.0,
        matchedAlias: 'online'
      };
    }

    // 2. Check City Aliases (prioritize specific city over generic state)
    for (const city of this.cachedCities!) {
      // Check full word match or alias inclusion
      for (const alias of city.aliases) {
        // Regex word boundary matching so "in" doesn't match "india", "blr" matches "\bblr\b"
        const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(clean) || clean === alias) {
          const state = this.cachedStates!.find(s => s.state_id === city.state_id);
          return {
            cityId: city.city_id,
            stateId: city.state_id,
            cityName: city.canonical_name,
            stateName: state ? state.name : null,
            isOnline: isExplicitOnline,
            confidence: 0.95,
            matchedAlias: alias
          };
        }
      }
    }

    // 3. Check State Names (if only state is specified, e.g. "Karnataka, India")
    for (const state of this.cachedStates!) {
      const stateRegex = new RegExp(`\\b${state.name.toLowerCase()}\\b`, 'i');
      if (stateRegex.test(clean)) {
        return {
          cityId: null,
          stateId: state.state_id,
          cityName: null,
          stateName: state.name,
          isOnline: isExplicitOnline,
          confidence: 0.85,
          matchedAlias: state.name
        };
      }
    }

    // Unresolved
    return {
      cityId: null,
      stateId: null,
      cityName: clean.length > 0 && !clean.includes('online') ? rawText.trim() : null,
      stateName: null,
      isOnline: isExplicitOnline || isOnlineText,
      confidence: 0.2
    };
  }

  /**
   * Get all states with city counts and live event counts
   */
  static getAllStates(): StateRecord[] {
    const states = db.prepare(`
      SELECT 
        s.state_id,
        s.country_id,
        s.name,
        s.code,
        c.name as country_name,
        (SELECT COUNT(*) FROM cities ci WHERE ci.state_id = s.state_id) as city_count,
        (SELECT COUNT(*) FROM events e WHERE e.state_id = s.state_id) as event_count
      FROM states s
      JOIN countries c ON s.country_id = c.country_id
      ORDER BY s.name ASC
    `).all() as StateRecord[];

    return states;
  }

  /**
   * Get cities, optionally filtered by state or autocomplete search query
   */
  static getCities(options: { stateId?: string; query?: string; limit?: number } = {}): CityRecord[] {
    const limit = options.limit || 50;
    let sql = `
      SELECT 
        ci.city_id,
        ci.state_id,
        ci.country_id,
        ci.name,
        ci.canonical_name,
        ci.aliases,
        s.name as state_name,
        co.name as country_name,
        (SELECT COUNT(*) FROM events e WHERE e.city_id = ci.city_id) as event_count
      FROM cities ci
      JOIN states s ON ci.state_id = s.state_id
      JOIN countries co ON ci.country_id = co.country_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (options.stateId) {
      sql += ` AND ci.state_id = ?`;
      params.push(options.stateId);
    }

    if (options.query && options.query.trim().length > 0) {
      const q = `%${options.query.trim().toLowerCase()}%`;
      sql += ` AND (LOWER(ci.name) LIKE ? OR LOWER(ci.aliases) LIKE ? OR LOWER(s.name) LIKE ?)`;
      params.push(q, q, q);
    }

    sql += ` ORDER BY event_count DESC, ci.name ASC LIMIT ?`;
    params.push(limit);

    const rows = db.prepare(sql).all(...params) as Array<any>;
    return rows.map(r => ({
      ...r,
      aliases: JSON.parse(r.aliases || '[]')
    }));
  }

  /**
   * Clean and re-normalize all event locations currently in database
   */
  static normalizeAllEvents(): { total: number; resolvedCity: number; online: number } {
    const events = db.prepare(`
      SELECT event_id, canonical_title, location_name, city, state, attendance_format, online_or_in_person
      FROM events
    `).all() as Array<{
      event_id: string;
      canonical_title: string;
      location_name: string | null;
      city: string | null;
      state: string | null;
      attendance_format: string;
      online_or_in_person: string;
    }>;

    let resolvedCity = 0;
    let onlineCount = 0;

    const updateStmt = db.prepare(`
      UPDATE events
      SET 
        city_id = ?,
        state_id = ?,
        city = ?,
        state = ?,
        attendance_format = ?,
        online_or_in_person = ?
      WHERE event_id = ?
    `);

    for (const ev of events) {
      const isFormatOnline = ev.attendance_format === 'ONLINE' || 
                             ev.online_or_in_person === 'ONLINE' || 
                             (ev.city && ev.city.toLowerCase() === 'online') ||
                             (ev.state && ev.state.toLowerCase() === 'online');

      // Test composite location text
      const locText = [ev.location_name, ev.city, ev.state, ev.canonical_title]
        .filter(Boolean)
        .join(' ');

      const isPhysicalVenue = Boolean(ev.location_name && (ev.location_name.includes('Campus') || ev.location_name.includes('Tech Park')));
      const resolution = this.resolveLocation(locText, Boolean(isFormatOnline && !isPhysicalVenue));

      let finalCity = resolution.cityName;
      let finalState = resolution.stateName;
      let finalAttendance = ev.attendance_format;
      let finalFormat = ev.online_or_in_person;

      if (resolution.isOnline && !resolution.cityId) {
        finalCity = null;
        finalState = null;
        finalAttendance = 'ONLINE';
        finalFormat = 'ONLINE';
        onlineCount++;
      } else {
        if (resolution.cityId) {
          resolvedCity++;
        }
        if (finalAttendance === 'ONLINE' && resolution.cityId) {
          finalAttendance = 'HYBRID';
          finalFormat = 'HYBRID';
        }
      }

      updateStmt.run(
        resolution.cityId,
        resolution.stateId,
        finalCity,
        finalState,
        finalAttendance,
        finalFormat,
        ev.event_id
      );
    }

    return { total: events.length, resolvedCity, online: onlineCount };
  }
}
