import express, { Request, Response } from 'express';
import { db } from '../db/database';
import { ingestionService } from '../services/ingestion.service';
import { filterAgent } from '../agents/filterAgent';
import { filterService } from '../services/filter.service';
import { researchAgent } from '../agents/researchAgent';
import { registrationAgent } from '../agents/registrationAgent';
import { ideaAgent } from '../agents/ideaAgent';
import { monitoringAgent } from '../agents/monitoringAgent';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const router = express.Router();

// Mock / default user for development/demo
const DEFAULT_USER_ID = 'user_krishna_default';

// Seed default profile if not exists
function ensureDefaultProfile() {
  const existing = db.prepare('SELECT user_id FROM user_profiles WHERE user_id = ?').get(DEFAULT_USER_ID);
  if (!existing) {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO user_profiles (
        user_id, full_name, email, phone, college_or_company, degree_or_role,
        skills, experience_years, github_url, linkedin_url, portfolio_url,
        bio, resume_text, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      DEFAULT_USER_ID,
      'Krishna Bhatia',
      'krishna@example.com',
      '+91 98765 43210',
      'RV College of Engineering, Bengaluru',
      'B.Tech Computer Science (3rd Year)',
      JSON.stringify(['TypeScript', 'React', 'Node.js', 'Python', 'AI Agents', 'PostgreSQL', 'LangGraph']),
      2.5,
      'https://github.com/thekrishmellow',
      'https://linkedin.com/in/krishnabhatia',
      'https://krishnabhatia.dev',
      'Full-stack AI developer passionate about building agentic web systems, LLM automation, and distributed apps.',
      'Experienced in building agentic platforms with Next.js, FastAPI, Node.js, and TinyFish.',
      now,
      now
    );
  }
}
ensureDefaultProfile();

// ==========================================
// 1. HEALTH & MCP STATUS
// ==========================================
router.get('/health', (req: Request, res: Response) => {
  const totalEvents = db.prepare('SELECT count(*) as count FROM events').get() as any;
  res.json({
    status: 'OK',
    server_time: new Date().toISOString(),
    tinyfish_connected: !!process.env.TINYFISH_API_KEY,
    total_canonical_events: totalEvents ? totalEvents.count : 0
  });
});

// ==========================================
// 2. SHARED EVENTS DISCOVERY
// ==========================================
router.get('/events', async (req: Request, res: Response) => {
  try {
    const location = (req.query.location as string) || 'Bengaluru';
    const category = (req.query.category as string) || 'Hackathons';
    const forceRefresh = req.query.refresh === 'true';

    // Shared Ingestion Layer: coalesced and cached
    const events = await ingestionService.ingestLocationEvents(location, category, forceRefresh);
    res.json({
      location,
      category,
      count: events.length,
      events
    });
  } catch (err: any) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/events/:eventId', (req: Request, res: Response) => {
  const eventId = String(req.params.eventId);
  const eventRow = db.prepare('SELECT * FROM events WHERE event_id = ?').get(eventId) as any;
  if (!eventRow) {
    return res.status(404).json({ error: 'Event not found' });
  }
  const event = ingestionService.deserializeEvent(eventRow);
  res.json(event);
});

router.get('/events/:eventId/related', (req: Request, res: Response) => {
  const eventId = String(req.params.eventId);
  const rels = db.prepare(`
    SELECT r.*, e.canonical_title, e.location_name, e.start_datetime, e.source_platform
    FROM event_relationships r
    JOIN events e ON (e.event_id = r.target_event_id OR e.event_id = r.source_event_id)
    WHERE (r.source_event_id = ? OR r.target_event_id = ?) AND e.event_id != ?
  `).all(eventId, eventId, eventId);

  res.json({ related: rels });
});

// ==========================================
// 3. EVENT RESEARCH AGENT (Q&A with Provenance)
// ==========================================
router.post('/events/:eventId/research', async (req: Request, res: Response) => {
  try {
    const eventId = String(req.params.eventId);
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const answer = await researchAgent.answerQuestion(eventId, question);
    res.json(answer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. NATURAL LANGUAGE CUSTOM FILTER AGENT
// ==========================================
router.post('/filters/interpret', (req: Request, res: Response) => {
  const { natural_query } = req.body;
  if (!natural_query) {
    return res.status(400).json({ error: 'natural_query is required' });
  }

  const result = filterAgent.interpretNaturalQuery(natural_query);
  res.json(result);
});

router.post('/filters/apply', (req: Request, res: Response) => {
  const { criteria, search_text } = req.body;
  const filteredEvents = filterService.applyFilter(criteria || {}, search_text);
  res.json({
    count: filteredEvents.length,
    events: filteredEvents
  });
});

router.get('/filters', (req: Request, res: Response) => {
  const userId = (req.query.user_id as string) || DEFAULT_USER_ID;
  const filters = filterService.getUserFilters(userId);
  res.json({ filters });
});

router.post('/filters', (req: Request, res: Response) => {
  const userId = req.body.user_id || DEFAULT_USER_ID;
  const { name, natural_query, structured_criteria } = req.body;
  if (!name || !natural_query || !structured_criteria) {
    return res.status(400).json({ error: 'name, natural_query, and structured_criteria required' });
  }

  const saved = filterService.saveUserFilter(userId, name, natural_query, structured_criteria);
  res.status(201).json(saved);
});

router.delete('/filters/:filterId', (req: Request, res: Response) => {
  const userId = (req.query.user_id as string) || DEFAULT_USER_ID;
  const filterId = String(req.params.filterId);
  const deleted = filterService.deleteUserFilter(userId, filterId);
  res.json({ success: deleted });
});

// ==========================================
// 5. USER PROFILE & SAVED EVENTS
// ==========================================
router.get('/profile', (req: Request, res: Response) => {
  const userId = (req.query.user_id as string) || DEFAULT_USER_ID;
  const profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId) as any;
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  res.json({
    ...profile,
    skills: JSON.parse(profile.skills || '[]')
  });
});

router.put('/profile', (req: Request, res: Response) => {
  const userId = req.body.user_id || DEFAULT_USER_ID;
  const { full_name, email, phone, college_or_company, degree_or_role, skills, experience_years, github_url, linkedin_url, portfolio_url, bio } = req.body;

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO user_profiles (
      user_id, full_name, email, phone, college_or_company, degree_or_role,
      skills, experience_years, github_url, linkedin_url, portfolio_url,
      bio, resume_text, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      full_name = excluded.full_name,
      email = excluded.email,
      phone = excluded.phone,
      college_or_company = excluded.college_or_company,
      degree_or_role = excluded.degree_or_role,
      skills = excluded.skills,
      experience_years = excluded.experience_years,
      github_url = excluded.github_url,
      linkedin_url = excluded.linkedin_url,
      portfolio_url = excluded.portfolio_url,
      bio = excluded.bio,
      updated_at = excluded.updated_at
  `).run(
    userId, full_name, email, phone, college_or_company, degree_or_role,
    JSON.stringify(skills || []), experience_years || 0, github_url, linkedin_url, portfolio_url,
    bio, now, now
  );

  res.json({ success: true });
});

router.get('/saved-events', (req: Request, res: Response) => {
  const userId = (req.query.user_id as string) || DEFAULT_USER_ID;
  const saved = db.prepare(`
    SELECT se.id as saved_id, se.notes, se.created_at as saved_at, e.*
    FROM saved_events se
    JOIN events e ON se.event_id = e.event_id
    WHERE se.user_id = ?
    ORDER BY se.created_at DESC
  `).all(userId) as any[];

  res.json({
    saved_events: saved.map(r => ({
      saved_id: r.saved_id,
      notes: r.notes,
      saved_at: r.saved_at,
      event: ingestionService.deserializeEvent(r)
    }))
  });
});

router.post('/saved-events', (req: Request, res: Response) => {
  const userId = req.body.user_id || DEFAULT_USER_ID;
  const { event_id, notes } = req.body;
  if (!event_id) return res.status(400).json({ error: 'event_id required' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO saved_events (id, user_id, event_id, notes, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, event_id) DO UPDATE SET notes = excluded.notes
  `).run(id, userId, event_id, notes || null, new Date().toISOString());

  res.status(201).json({ success: true, saved_id: id });
});

router.delete('/saved-events/:eventId', (req: Request, res: Response) => {
  const userId = (req.query.user_id as string) || DEFAULT_USER_ID;
  const eventId = String(req.params.eventId);
  db.prepare('DELETE FROM saved_events WHERE user_id = ? AND event_id = ?').run(userId, eventId);
  res.json({ success: true });
});

// ==========================================
// 6. REGISTRATION ASSISTANT AGENT
// ==========================================
router.post('/registrations/prepare', async (req: Request, res: Response) => {
  try {
    const userId = req.body.user_id || DEFAULT_USER_ID;
    const { event_id } = req.body;
    if (!event_id) return res.status(400).json({ error: 'event_id required' });

    const plan = await registrationAgent.prepareRegistration(userId, event_id);
    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/registrations/confirm', async (req: Request, res: Response) => {
  try {
    const userId = req.body.user_id || DEFAULT_USER_ID;
    const { audit_id } = req.body;
    if (!audit_id) return res.status(400).json({ error: 'audit_id required' });

    const result = await registrationAgent.confirmRegistration(audit_id, userId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. HACKATHON IDEA WORKSPACE & PPTX EXPORT
// ==========================================
router.post('/ideas/develop', async (req: Request, res: Response) => {
  try {
    const userId = req.body.user_id || DEFAULT_USER_ID;
    const { event_id, idea_concept } = req.body;
    if (!event_id || !idea_concept) {
      return res.status(400).json({ error: 'event_id and idea_concept are required' });
    }

    const validation = await ideaAgent.validateAndDevelopIdea(event_id, idea_concept, userId);
    res.json(validation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ideas/:workspaceId/presentation', async (req: Request, res: Response) => {
  try {
    const workspaceId = String(req.params.workspaceId);
    const filePath = await ideaAgent.generatePresentationFile(workspaceId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Presentation file not found' });
    }

    res.download(filePath, `hackathon-presentation-${workspaceId.slice(0, 8)}.pptx`);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. MONITORING & NOTIFICATIONS
// ==========================================
router.post('/monitoring/subscribe', (req: Request, res: Response) => {
  const userId = req.body.user_id || DEFAULT_USER_ID;
  const { event_id } = req.body;
  if (!event_id) return res.status(400).json({ error: 'event_id required' });

  const success = monitoringAgent.subscribe(userId, event_id);
  res.json({ success });
});

router.post('/monitoring/unsubscribe', (req: Request, res: Response) => {
  const userId = req.body.user_id || DEFAULT_USER_ID;
  const { event_id } = req.body;
  const success = monitoringAgent.unsubscribe(userId, event_id);
  res.json({ success });
});

router.post('/monitoring/run-cycle', async (req: Request, res: Response) => {
  try {
    const result = await monitoringAgent.runMonitoringCycle();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/notifications', (req: Request, res: Response) => {
  const userId = (req.query.user_id as string) || DEFAULT_USER_ID;
  const notifs = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY delivery_timestamp DESC').all(userId);
  res.json({ notifications: notifs });
});

export default router;
