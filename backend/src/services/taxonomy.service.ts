import { db } from '../db/database';
import { ClassificationEngine } from './classification.service';

export interface CategoryNode {
  categoryId: string;
  name: string;
  slug: string;
  parentCategoryId: string | null;
  description: string | null;
  keywords: string[];
  displayOrder: number;
  isActive: boolean;
  eventCount: number;
  subcategories?: CategoryNode[];
}

export interface ProposalRecord {
  proposalId: string;
  suggestedName: string;
  suggestedSlug: string;
  description: string | null;
  parentCandidateId: string | null;
  sourceQueries: string[];
  searchFrequency: number;
  eventMatchesCount: number;
  status: 'NEEDS_REVIEW' | 'APPROVED' | 'MERGED' | 'REJECTED';
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export class TaxonomyService {
  /**
   * Get all categories as a flat list or hierarchical tree with live event counts
   */
  static getCategoryTree(): CategoryNode[] {
    const rawCategories = db.prepare(`
      SELECT 
        c.category_id,
        c.name,
        c.slug,
        c.parent_category_id,
        c.description,
        c.keywords,
        c.display_order,
        c.is_active,
        (
          SELECT COUNT(*) 
          FROM event_classifications ec 
          WHERE ec.primary_category_id = c.category_id
        ) as event_count
      FROM categories c
      WHERE c.is_active = 1
      ORDER BY c.display_order ASC, c.name ASC
    `).all() as Array<{
      category_id: string;
      name: string;
      slug: string;
      parent_category_id: string | null;
      description: string | null;
      keywords: string;
      display_order: number;
      is_active: number;
      event_count: number;
    }>;

    const nodes: CategoryNode[] = rawCategories.map(r => ({
      categoryId: r.category_id,
      name: r.name,
      slug: r.slug,
      parentCategoryId: r.parent_category_id,
      description: r.description,
      keywords: JSON.parse(r.keywords || '[]'),
      displayOrder: r.display_order,
      isActive: r.is_active === 1,
      eventCount: r.event_count,
      subcategories: []
    }));

    // Build hierarchy
    const nodeMap = new Map<string, CategoryNode>();
    nodes.forEach(n => nodeMap.set(n.categoryId, n));

    const rootNodes: CategoryNode[] = [];
    nodes.forEach(n => {
      if (n.parentCategoryId && nodeMap.has(n.parentCategoryId)) {
        nodeMap.get(n.parentCategoryId)!.subcategories!.push(n);
      } else {
        rootNodes.push(n);
      }
    });

    return rootNodes;
  }

  /**
   * Process a search query:
   * 1. Match against existing categories or aliases
   * 2. Log query in category_search_queries
   * 3. If unmapped and appears to be a domain/track query, generate/update a category_proposal
   */
  static processSearchQuery(queryText: string): {
    matchedCategoryId: string | null;
    matchedCategoryName: string | null;
    isMapped: boolean;
    normalizedQuery: string;
  } {
    if (!queryText || queryText.trim().length === 0) {
      return { matchedCategoryId: null, matchedCategoryName: null, isMapped: false, normalizedQuery: '' };
    }

    const norm = queryText.trim().toLowerCase();
    const now = new Date().toISOString();

    // 1. Direct Category Name or Slug match
    const directCat = db.prepare(`
      SELECT category_id, name FROM categories 
      WHERE LOWER(name) = ? OR LOWER(slug) = ?
    `).get(norm, norm) as { category_id: string; name: string } | undefined;

    if (directCat) {
      this.recordQueryLog(queryText, norm, directCat.category_id, 1, now);
      return {
        matchedCategoryId: directCat.category_id,
        matchedCategoryName: directCat.name,
        isMapped: true,
        normalizedQuery: norm
      };
    }

    // 2. Alias match (e.g. "cybersecurity hackathons" -> ctf-cybersecurity)
    const aliasMatch = db.prepare(`
      SELECT ca.category_id, c.name 
      FROM category_aliases ca
      JOIN categories c ON ca.category_id = c.category_id
      WHERE LOWER(ca.alias) = ? OR ? LIKE '%' || LOWER(ca.alias) || '%'
      ORDER BY LENGTH(ca.alias) DESC
      LIMIT 1
    `).get(norm, norm) as { category_id: string; name: string } | undefined;

    if (aliasMatch) {
      this.recordQueryLog(queryText, norm, aliasMatch.category_id, 1, now);
      return {
        matchedCategoryId: aliasMatch.category_id,
        matchedCategoryName: aliasMatch.name,
        isMapped: true,
        normalizedQuery: norm
      };
    }

    // 3. Unmapped Query: Record and detect if it looks like a track/category request
    this.recordQueryLog(queryText, norm, null, 0, now);

    // If query has technical or hackathon-like keywords, generate a proposal for weekly review
    const isDomainQuery = /hackathon|contest|competition|challenge|design|security|computing|system|robot|quantum|fpga|bio|hardware|game/i.test(norm);
    if (isDomainQuery && norm.length >= 4) {
      this.recordProposalCandidate(norm, now);
    }

    return {
      matchedCategoryId: null,
      matchedCategoryName: null,
      isMapped: false,
      normalizedQuery: norm
    };
  }

  private static recordQueryLog(queryText: string, norm: string, resolvedCatId: string | null, isMapped: number, now: string) {
    const existing = db.prepare(`
      SELECT id, search_count FROM category_search_queries WHERE normalized_query = ?
    `).get(norm) as { id: string; search_count: number } | undefined;

    if (existing) {
      db.prepare(`
        UPDATE category_search_queries 
        SET search_count = search_count + 1, last_searched_at = ?, resolved_category_id = COALESCE(?, resolved_category_id)
        WHERE id = ?
      `).run(now, resolvedCatId, existing.id);
    } else {
      db.prepare(`
        INSERT INTO category_search_queries (id, query_text, normalized_query, resolved_category_id, is_mapped, search_count, first_searched_at, last_searched_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      `).run(`sq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, queryText, norm, resolvedCatId, isMapped, now, now);
    }
  }

  private static recordProposalCandidate(norm: string, now: string) {
    // Slugify candidate
    const slug = norm
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const name = norm
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const existing = db.prepare(`
      SELECT proposal_id, search_frequency, source_queries FROM category_proposals WHERE suggested_slug = ?
    `).get(slug) as { proposal_id: string; search_frequency: number; source_queries: string } | undefined;

    if (existing) {
      const queries = JSON.parse(existing.source_queries || '[]');
      if (!queries.includes(norm)) queries.push(norm);

      db.prepare(`
        UPDATE category_proposals
        SET search_frequency = search_frequency + 1, source_queries = ?, updated_at = ?
        WHERE proposal_id = ?
      `).run(JSON.stringify(queries), now, existing.proposal_id);
    } else {
      // Find matching events in DB that contain this term in title or description
      const matchingEvents = db.prepare(`
        SELECT event_id FROM events 
        WHERE LOWER(canonical_title) LIKE ? OR LOWER(description) LIKE ?
        LIMIT 10
      `).all(`%${norm}%`, `%${norm}%`) as Array<{ event_id: string }>;

      db.prepare(`
        INSERT INTO category_proposals (
          proposal_id, suggested_name, suggested_slug, description, parent_candidate_id,
          source_queries, sample_event_ids, search_frequency, event_matches_count,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, ?, ?, 1, ?, 'NEEDS_REVIEW', ?, ?)
      `).run(
        `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name,
        slug,
        `Discovered from frequent user search terms: "${norm}"`,
        JSON.stringify([norm]),
        JSON.stringify(matchingEvents.map(e => e.event_id)),
        matchingEvents.length,
        now,
        now
      );
    }
  }

  /**
   * Admin: Get all category proposals
   */
  static getProposals(status?: string): ProposalRecord[] {
    let sql = `SELECT * FROM category_proposals`;
    const params: any[] = [];
    if (status) {
      sql += ` WHERE status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY search_frequency DESC, created_at DESC`;

    const rows = db.prepare(sql).all(...params) as Array<any>;
    return rows.map(r => ({
      proposalId: r.proposal_id,
      suggestedName: r.suggested_name,
      suggestedSlug: r.suggested_slug,
      description: r.description,
      parentCandidateId: r.parent_candidate_id,
      sourceQueries: JSON.parse(r.source_queries || '[]'),
      searchFrequency: r.search_frequency,
      eventMatchesCount: r.event_matches_count,
      status: r.status,
      reviewedBy: r.reviewed_by,
      reviewedAt: r.reviewed_at,
      reviewNotes: r.review_notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  /**
   * Admin: Review and apply proposal action
   */
  static reviewProposal(
    proposalId: string,
    action: 'APPROVE_NEW' | 'APPROVE_SUB' | 'MERGE' | 'REJECT',
    options: {
      targetCategoryId?: string;
      parentCategoryId?: string;
      customName?: string;
      adminNotes?: string;
      reviewer?: string;
    } = {}
  ): { success: boolean; message: string; categoryId?: string } {
    const proposal = db.prepare(`SELECT * FROM category_proposals WHERE proposal_id = ?`).get(proposalId) as any;
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    const now = new Date().toISOString();
    const reviewer = options.reviewer || 'system_admin';
    const notes = options.adminNotes || '';

    if (action === 'APPROVE_NEW' || action === 'APPROVE_SUB') {
      const catId = options.targetCategoryId || proposal.suggested_slug;
      const catName = options.customName || proposal.suggested_name;
      const parentId = action === 'APPROVE_SUB' ? (options.parentCategoryId || proposal.parent_candidate_id) : null;

      // Insert into categories table
      db.prepare(`
        INSERT OR REPLACE INTO categories (
          category_id, name, slug, parent_category_id, description, keywords, display_order, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 99, 1, ?)
      `).run(
        catId,
        catName,
        catId,
        parentId,
        proposal.description || `Approved from proposal ${proposal.suggested_name}`,
        proposal.source_queries,
        now
      );

      // Add aliases from source queries
      const sourceQueries = JSON.parse(proposal.source_queries || '[]');
      const insertAlias = db.prepare(`INSERT OR IGNORE INTO category_aliases (id, alias, category_id, confidence) VALUES (?, ?, ?, 1.0)`);
      for (const q of sourceQueries) {
        insertAlias.run(`alias-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, q.toLowerCase(), catId);
      }

      // Update proposal status
      db.prepare(`
        UPDATE category_proposals
        SET status = 'APPROVED', reviewed_by = ?, reviewed_at = ?, review_notes = ?, updated_at = ?
        WHERE proposal_id = ?
      `).run(reviewer, now, notes, now, proposalId);

      // Record in history
      db.prepare(`
        INSERT INTO category_review_history (history_id, proposal_id, action, target_category_id, admin_notes, applied_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(`hist-${Date.now()}`, proposalId, action, catId, notes, now);

      return { success: true, message: `Category ${catName} created successfully`, categoryId: catId };
    } else if (action === 'MERGE') {
      if (!options.targetCategoryId) {
        throw new Error('Target category ID is required for MERGE action');
      }

      // Add proposal source queries as aliases to the target category
      const sourceQueries = JSON.parse(proposal.source_queries || '[]');
      const insertAlias = db.prepare(`INSERT OR IGNORE INTO category_aliases (id, alias, category_id, confidence) VALUES (?, ?, ?, 0.95)`);
      for (const q of sourceQueries) {
        insertAlias.run(`alias-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, q.toLowerCase(), options.targetCategoryId);
      }

      // Update query logs to point to merged category
      for (const q of sourceQueries) {
        db.prepare(`
          UPDATE category_search_queries 
          SET resolved_category_id = ?, is_mapped = 1 
          WHERE normalized_query = ?
        `).run(options.targetCategoryId, q.toLowerCase());
      }

      // Update proposal status
      db.prepare(`
        UPDATE category_proposals
        SET status = 'MERGED', reviewed_by = ?, reviewed_at = ?, review_notes = ?, updated_at = ?
        WHERE proposal_id = ?
      `).run(reviewer, now, notes, now, proposalId);

      // Record in history
      db.prepare(`
        INSERT INTO category_review_history (history_id, proposal_id, action, target_category_id, admin_notes, applied_at)
        VALUES (?, ?, 'MERGE', ?, ?, ?)
      `).run(`hist-${Date.now()}`, proposalId, options.targetCategoryId, notes, now);

      return { success: true, message: `Merged proposal into category ${options.targetCategoryId}`, categoryId: options.targetCategoryId };
    } else {
      // REJECT
      db.prepare(`
        UPDATE category_proposals
        SET status = 'REJECTED', reviewed_by = ?, reviewed_at = ?, review_notes = ?, updated_at = ?
        WHERE proposal_id = ?
      `).run(reviewer, now, notes, now, proposalId);

      db.prepare(`
        INSERT INTO category_review_history (history_id, proposal_id, action, target_category_id, admin_notes, applied_at)
        VALUES (?, ?, 'REJECT', NULL, ?, ?)
      `).run(`hist-${Date.now()}`, proposalId, notes, now);

      return { success: true, message: 'Proposal rejected' };
    }
  }

  /**
   * Weekly discovery report for admin dashboard
   */
  static getWeeklyReport(): {
    totalSearches: number;
    unmappedQueriesCount: number;
    pendingProposalsCount: number;
    topUnmappedQueries: Array<{ query: string; count: number }>;
    recentProposals: ProposalRecord[];
    categoryDistribution: Array<{ name: string; eventCount: number }>;
  } {
    const totalSearches = (db.prepare(`SELECT SUM(search_count) as total FROM category_search_queries`).get() as any)?.total || 0;
    const unmappedQueriesCount = (db.prepare(`SELECT COUNT(*) as count FROM category_search_queries WHERE is_mapped = 0`).get() as any)?.count || 0;
    const pendingProposalsCount = (db.prepare(`SELECT COUNT(*) as count FROM category_proposals WHERE status = 'NEEDS_REVIEW'`).get() as any)?.count || 0;

    const topUnmapped = db.prepare(`
      SELECT query_text as query, search_count as count 
      FROM category_search_queries 
      WHERE is_mapped = 0 
      ORDER BY search_count DESC 
      LIMIT 10
    `).all() as Array<{ query: string; count: number }>;

    const recentProposals = this.getProposals();

    const categoryDistribution = db.prepare(`
      SELECT c.name, COUNT(ec.event_id) as eventCount
      FROM categories c
      LEFT JOIN event_classifications ec ON c.category_id = ec.primary_category_id
      GROUP BY c.category_id, c.name
      ORDER BY eventCount DESC
    `).all() as Array<{ name: string; eventCount: number }>;

    return {
      totalSearches,
      unmappedQueriesCount,
      pendingProposalsCount,
      topUnmappedQueries: topUnmapped,
      recentProposals,
      categoryDistribution
    };
  }
}

