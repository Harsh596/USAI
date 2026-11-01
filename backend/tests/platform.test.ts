import request from 'supertest';
import app from '../src/server';
import { db } from '../src/db/database';
import { filterAgent } from '../src/agents/filterAgent';
import { filterService } from '../src/services/filter.service';
import { ideaAgent } from '../src/agents/ideaAgent';
import fs from 'fs';

describe('USAI Platform Architectural Acceptance Tests', () => {
  jest.setTimeout(30000);

  test('Health check confirms server and TinyFish connectivity', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.tinyfish_connected).toBe(true);
    expect(res.body.total_canonical_events).toBeGreaterThanOrEqual(1);
  });

  test('Requirement 3: Shared Event Layer serves centralized canonical dataset', async () => {
    // User 1 requests Bengaluru events
    const res1 = await request(app).get('/api/v1/events?location=Bengaluru&category=Hackathons');
    expect(res1.status).toBe(200);
    expect(res1.body.events.length).toBeGreaterThan(0);

    // User 2 requests same location/category -> served from shared canonical database
    const res2 = await request(app).get('/api/v1/events?location=Bengaluru&category=Hackathons');
    expect(res2.status).toBe(200);
    expect(res2.body.count).toBe(res1.body.count);
    expect(res2.body.events[0].event_id).toBe(res1.body.events[0].event_id);
  });

  test('Requirement 8: Natural Language Custom Filter converts query to validated schema and does NOT modify shared data', async () => {
    const naturalQuery = 'I want free AI hackathons in Bengaluru with team size of at least 2 and prize money';
    
    // 1. Filter Agent interprets request
    const interpreted = filterAgent.interpretNaturalQuery(naturalQuery);
    expect(interpreted.structured_criteria.price?.free_only).toBe(true);
    expect(interpreted.structured_criteria.locations?.cities).toContain('Bengaluru');
    expect(interpreted.structured_criteria.team_size?.min).toBe(2);
    expect(interpreted.structured_criteria.has_prize_money).toBe(true);

    // 2. Applied to shared dataset
    const filteredEvents = filterService.applyFilter(interpreted.structured_criteria);
    expect(Array.isArray(filteredEvents)).toBe(true);
    for (const ev of filteredEvents) {
      expect(ev.price).toBe(0);
      expect(ev.city.toLowerCase()).toContain('bengaluru');
      if (ev.team_size_max !== null) {
        expect(ev.team_size_max).toBeGreaterThanOrEqual(2);
      }
    }

    // 3. User saves personalized filter
    const saveRes = await request(app)
      .post('/api/v1/filters')
      .send({
        user_id: 'test_user_1',
        name: 'My Bengaluru AI Hackathons',
        natural_query: naturalQuery,
        structured_criteria: interpreted.structured_criteria
      });
    expect(saveRes.status).toBe(201);
    expect(saveRes.body.filter_id).toBeDefined();

    // Verify User 2 does not have User 1's custom filters
    const user2Filters = await request(app).get('/api/v1/filters?user_id=test_user_2');
    expect(user2Filters.body.filters.length).toBe(0);
  });

  test('Requirement 13: Event Research Agent provides grounded answers with source citations', async () => {
    // Fetch an event ID
    const eventsRes = await request(app).get('/api/v1/events?location=Bengaluru');
    const event = eventsRes.body.events[0];

    const researchRes = await request(app)
      .post(`/api/v1/events/${event.event_id}/research`)
      .send({ question: 'What is this hackathon about and what prizes are offered?' });

    expect(researchRes.status).toBe(200);
    expect(researchRes.body.answer).toBeDefined();
    expect(researchRes.body.confidence).toBeGreaterThanOrEqual(0.8);
    expect(researchRes.body.verified_evidence.length).toBeGreaterThan(0);
    expect(researchRes.body.verified_evidence[0].source_url).toBe(event.source_url);
  });

  test('Requirement 14: Registration Assistant maps profile and enforces explicit confirmation checkpoint', async () => {
    const eventsRes = await request(app).get('/api/v1/events?location=Bengaluru');
    const event = eventsRes.body.events[0];

    // Step 1: Prepare registration
    const prepRes = await request(app)
      .post('/api/v1/registrations/prepare')
      .send({ event_id: event.event_id, user_id: 'user_krishna_default' });

    expect(prepRes.status).toBe(200);
    expect(prepRes.body.audit_id).toBeDefined();
    expect(prepRes.body.mapped_fields['Full Name']).toBe('Krishna Bhatia');
    expect(prepRes.body.mapped_fields['Email Address']).toBe('krishna@example.com');
    expect(prepRes.body.status).toMatch(/REVIEW_PENDING|MANUAL_REQUIRED/);

    // Step 2: Confirm registration explicitly
    const confirmRes = await request(app)
      .post('/api/v1/registrations/confirm')
      .send({ audit_id: prepRes.body.audit_id, user_id: 'user_krishna_default' });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.success).toBe(true);
    expect(confirmRes.body.audit.status).toBe('USER_CONFIRMED');
  });

  test('Requirement 15: Hackathon Idea Workspace validates against 14 points and exports PPTX file', async () => {
    const eventsRes = await request(app).get('/api/v1/events?location=Bengaluru');
    const event = eventsRes.body.events[0];

    // Develop Idea
    const ideaRes = await request(app)
      .post('/api/v1/ideas/develop')
      .send({
        event_id: event.event_id,
        idea_concept: 'Autonomous Agent Platform for automated multi-source hackathon discovery and team matching using TinyFish MCP'
      });

    expect(ideaRes.status).toBe(200);
    expect(ideaRes.body.workspace_id).toBeDefined();
    expect(ideaRes.body.overall_score).toBeGreaterThan(70);
    expect(ideaRes.body.criteria_scores.problem_clarity).toBeGreaterThan(0);
    expect(ideaRes.body.criteria_scores.technical_feasibility).toBeGreaterThan(0);
    expect(ideaRes.body.brief.core_features.length).toBeGreaterThan(0);
    expect(ideaRes.body.brief.slide_outline.length).toBeGreaterThan(0);

    // Generate and download PPTX
    const pptxRes = await request(app).get(`/api/v1/ideas/${ideaRes.body.workspace_id}/presentation`);
    expect(pptxRes.status).toBe(200);
    expect(pptxRes.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.presentationml.presentation');
  });

  test('Requirement 16: Event Monitoring subscription and cycle execution', async () => {
    const eventsRes = await request(app).get('/api/v1/events?location=Bengaluru');
    const event = eventsRes.body.events[0];

    // Subscribe
    const subRes = await request(app)
      .post('/api/v1/monitoring/subscribe')
      .send({ event_id: event.event_id, user_id: 'user_krishna_default' });

    expect(subRes.status).toBe(200);
    expect(subRes.body.success).toBe(true);

    // Run cycle
    const cycleRes = await request(app).post('/api/v1/monitoring/run-cycle');
    expect(cycleRes.status).toBe(200);
    expect(cycleRes.body.checked_count).toBeDefined();
  });
});
