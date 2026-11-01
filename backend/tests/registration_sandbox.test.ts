import request from 'supertest';
import app from '../src/server';
import { db } from '../src/db/database';
import { registrationAgent } from '../src/agents/registrationAgent';

describe('Agentic Registration Sandbox & Dual Confirmation Suite', () => {
  const testUserId = 'user_krishna_default';
  let targetEvent: any;

  beforeAll(async () => {
    // Pick an active event from the database
    targetEvent = db.prepare('SELECT * FROM events WHERE canonical_title LIKE ? LIMIT 1').get('%Hack Days%') as any;
    if (!targetEvent) {
      targetEvent = db.prepare('SELECT * FROM events LIMIT 1').get() as any;
    }
  });

  test('1. Sandbox inspects form requirements and detects required vs optional fields', async () => {
    const res = await request(app)
      .post('/api/v1/registrations/prepare')
      .send({ event_id: targetEvent.event_id, user_id: testUserId });

    expect(res.status).toBe(200);
    const plan = res.body;

    expect(plan.audit_id).toBeDefined();
    expect(plan.event_id).toBe(targetEvent.event_id);
    expect(plan.readiness_percentage).toBeGreaterThan(0);
    expect(Array.isArray(plan.fields)).toBe(true);

    // Verify key fields exist in schema
    const fieldKeys = plan.fields.map((f: any) => f.field_key);
    expect(fieldKeys).toContain('full_name');
    expect(fieldKeys).toContain('email');
    expect(fieldKeys).toContain('phone');
    expect(fieldKeys).toContain('college_or_company');
    expect(fieldKeys).toContain('skills');
    expect(fieldKeys).toContain('github_url');

    console.log(`[Sandbox Test] Inspected ${plan.fields.length} form fields (${plan.provided_count}/${plan.required_count} required provided, ${plan.readiness_percentage}% readiness)`);
  });

  test('2. Step-by-step detail updates replace default profile and achieve 100% readiness', async () => {
    // Prepare
    const prepRes = await request(app)
      .post('/api/v1/registrations/prepare')
      .send({ event_id: targetEvent.event_id, user_id: testUserId });

    const auditId = prepRes.body.audit_id;

    // Update with custom details
    const customDetails = {
      full_name: 'Alex Rivera',
      email: 'alex.rivera@innovators.dev',
      phone: '+91 99887 76655',
      graduation_year: '2026',
      tshirt_size: 'XL',
      team_name: 'CloudSentinels',
      statement_of_purpose: 'Developing an AI pipeline for real-time edge processing.'
    };

    const updateRes = await request(app)
      .post('/api/v1/registrations/update-details')
      .send({
        audit_id: auditId,
        user_id: testUserId,
        updated_fields: customDetails,
        replace_profile: true
      });

    expect(updateRes.status).toBe(200);
    const updated = updateRes.body;
    expect(updated.readiness_percentage).toBe(100);
    expect(updated.missing_required_count).toBe(0);
    expect(updated.can_auto_submit).toBe(true);

    // Verify user_profiles table got updated with the user's provided details
    const userRow = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(testUserId) as any;
    expect(userRow.full_name).toBe('Alex Rivera');
    expect(userRow.email).toBe('alex.rivera@innovators.dev');

    console.log('[Sandbox Test] Profile successfully updated and synced with custom registration details');
  });

  test('3. Confirms registration, dispatches email to registered address, and generates hackathon proof', async () => {
    // Prepare & fill
    const prepRes = await request(app)
      .post('/api/v1/registrations/prepare')
      .send({ event_id: targetEvent.event_id, user_id: testUserId });

    const auditId = prepRes.body.audit_id;

    const confirmRes = await request(app)
      .post('/api/v1/registrations/confirm')
      .send({ audit_id: auditId, user_id: testUserId });

    expect(confirmRes.status).toBe(200);
    const result = confirmRes.body;

    expect(result.status).toBe('SUBMITTED_AND_CONFIRMED');
    expect(result.readiness_percentage).toBe(100);

    // Verify email confirmation receipt
    expect(result.email_confirmation).toBeDefined();
    expect(result.email_confirmation.sent_to).toBe('alex.rivera@innovators.dev');
    expect(['SENT', 'SENT_SANDBOX']).toContain(result.email_confirmation.status);
    expect(result.email_confirmation.message_id).toBeDefined();

    // Verify hackathon confirmation and redirect proof
    expect(result.hackathon_confirmation).toBeDefined();
    expect(result.hackathon_confirmation.status).toBe('CONFIRMED_ON_HACKATHON');
    expect(result.hackathon_confirmation.badge_id).toMatch(/USAI-HK-\d+/);
    expect(result.hackathon_confirmation.redirect_url).toContain(result.hackathon_confirmation.badge_id);

    // Verify audit record in database
    const auditRecord = db.prepare('SELECT * FROM registration_audits WHERE id = ?').get(auditId) as any;
    expect(auditRecord.email_sent_to).toBe('alex.rivera@innovators.dev');
    expect(auditRecord.hackathon_confirmation_status).toBe('CONFIRMED_ON_HACKATHON');
    expect(auditRecord.hackathon_badge_id).toBe(result.hackathon_confirmation.badge_id);

    console.log(`[Sandbox Test] Registration finalized: Email sent to ${auditRecord.email_sent_to}, Hackathon Badge: ${auditRecord.hackathon_badge_id}`);

    // Restore test profile name and email
    db.prepare('UPDATE user_profiles SET full_name = ?, email = ? WHERE user_id = ?')
      .run('Krishna Bhatia', 'krishna@example.com', testUserId);
  });
});
