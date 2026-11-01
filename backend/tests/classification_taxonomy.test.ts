import request from 'supertest';
import app from '../src/server';
import { ClassificationEngine } from '../src/services/classification.service';
import { TaxonomyService } from '../src/services/taxonomy.service';
import { db } from '../src/db/database';

describe('Multi-Signal Classification Engine & Dynamic Taxonomy Tests', () => {
  beforeAll(() => {
    // Clean up temporary test categories/proposals to ensure idempotency
    db.prepare(`DELETE FROM category_review_history`).run();
    db.prepare(`DELETE FROM category_aliases WHERE alias LIKE '%quantum%' OR alias LIKE '%neuromorphic%'`).run();
    db.prepare(`DELETE FROM category_search_queries WHERE query_text LIKE '%quantum%' OR query_text LIKE '%neuromorphic%'`).run();
    db.prepare(`DELETE FROM category_proposals WHERE suggested_slug LIKE '%quantum%' OR suggested_slug LIKE '%neuromorphic%'`).run();
    db.prepare(`DELETE FROM categories WHERE category_id LIKE 'test-%' OR category_id LIKE '%quantum%' OR category_id LIKE '%neuromorphic%'`).run();
    ClassificationEngine.reclassifyAllEvents();
  });

  test('Correctly classifies CTF / Cybersecurity hackathon with evidence', () => {
    const result = ClassificationEngine.classifyEvent({
      eventId: 'test-ctf',
      title: 'DEFCON India CTF 2026: Binary Exploitation & Reverse Engineering',
      description: 'Annual Capture The Flag competition. Challenges in pwn, web security, cryptography, and red team defense.',
      themes: ['Cybersecurity', 'Ethical Hacking'],
      deliverables: ['Flag submissions', 'Proof of Concept exploit writeup']
    });

    expect(result.primaryCategoryId).toBe('ctf-cybersecurity');
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.classificationStatus).toBe('CLASSIFIED');
    expect(result.signals.some(s => s.phrase.includes('capture the flag') || s.phrase.includes('ctf'))).toBe(true);
  });

  test('Correctly classifies Drone / UAV hackathon', () => {
    const result = ClassificationEngine.classifyEvent({
      eventId: 'test-drone',
      title: 'AeroHacks 2026: Autonomous Drone Challenge',
      description: 'Build autonomous flight controllers using PX4 and ArduPilot with computer vision for aerial survey.',
      themes: ['UAV', 'Aerial Robotics'],
      deliverables: ['Quadcopter waypoint flight demo']
    });

    expect(result.primaryCategoryId).toBe('drone-uav-hackathon');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  test('Correctly classifies CP Hackathon (Competitive Programming)', () => {
    const result = ClassificationEngine.classifyEvent({
      eventId: 'test-cp',
      title: 'CodeSprint National ICPC Qualifier',
      description: 'Algorithmic contest solving dynamic programming and graph problems under strict time and memory complexity limits.',
      themes: ['Competitive Programming', 'Data Structures & Algorithms']
    });

    expect(result.primaryCategoryId).toBe('cp-hackathon');
  });

  test('AI Research requires strict research signals, not merely calling an AI API', () => {
    // 1. Genuine AI research event
    const researchEv = ClassificationEngine.classifyEvent({
      eventId: 'test-ai-paper',
      title: 'Transformer Architecture Benchmark & Novel Loss Function Workshop',
      description: 'Submit an arXiv preprint reproduction, ablation studies on attention heads, and novel loss function gradients.',
      deliverables: ['Research paper PDF', 'Benchmark evaluation harness']
    });
    expect(researchEv.primaryCategoryId).toBe('ai-research');

    // 2. Generic app using an LLM API -> must NOT be classified as AI Research!
    const appEv = ClassificationEngine.classifyEvent({
      eventId: 'test-ai-app',
      title: 'DevHack: Build an app using OpenAI API',
      description: 'Build a full stack web application for student productivity. Use ChatGPT API to build a tool and ship an MVP on Vercel.',
      deliverables: ['GitHub repo', 'Live web deployment']
    });
    expect(appEv.primaryCategoryId).not.toBe('ai-research');
    expect(appEv.primaryCategoryId).toBe('engineer-hackathon');
  });

  test('Taxonomy search query understanding maps "cybersecurity hackathons" to ctf-cybersecurity', () => {
    const res = TaxonomyService.processSearchQuery('cybersecurity hackathons');
    expect(res.isMapped).toBe(true);
    expect(res.matchedCategoryId).toBe('ctf-cybersecurity');
    expect(res.matchedCategoryName).toBe('CTF Hackathon');
  });

  test('Unmapped technical query generates proposal for weekly admin review', () => {
    const unmapped = TaxonomyService.processSearchQuery('quantum computing challenge');
    expect(unmapped.isMapped).toBe(false);

    const proposals = TaxonomyService.getProposals('NEEDS_REVIEW');
    const quantum = proposals.find(p => p.suggestedSlug.includes('quantum'));
    expect(quantum).toBeDefined();
    expect(quantum!.searchFrequency).toBeGreaterThanOrEqual(1);
  });

  test('Admin review workflow: approve proposal and generate weekly report', async () => {
    // 1. Fetch weekly report
    const reportRes = await request(app).get('/api/v1/admin/weekly-report');
    expect(reportRes.status).toBe(200);
    expect(reportRes.body.categoryDistribution).toBeDefined();

    // 2. Find a proposal to approve
    const proposalsRes = await request(app).get('/api/v1/admin/proposals');
    expect(proposalsRes.status).toBe(200);
    const target = proposalsRes.body.proposals[0];
    if (target) {
      const reviewRes = await request(app)
        .post(`/api/v1/admin/proposals/${target.proposalId}/review`)
        .send({
          action: 'APPROVE_NEW',
          customName: 'Quantum Computing Track',
          adminNotes: 'Approved based on weekly user search interest.'
        });
      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.success).toBe(true);
    }
  });
});
