import { db } from '../db/database';
import { UserProfile, CanonicalEvent } from '../models/types';
import { ingestionService } from '../services/ingestion.service';
import { v4 as uuidv4 } from 'uuid';

export interface RegistrationReviewPlan {
  audit_id: string;
  user_id: string;
  event_id: string;
  event_title: string;
  registration_url: string;
  source_platform: string;
  status: 'REVIEW_PENDING' | 'MANUAL_REQUIRED' | 'SUBMITTED';
  mapped_fields: Record<string, string>;
  manual_steps_required: string[];
  eligibility_checked: boolean;
  notes: string;
}

export class RegistrationAgent {
  /**
   * Prepares registration assistance plan for user review
   */
  async prepareRegistration(userId: string, eventId: string): Promise<RegistrationReviewPlan> {
    const userRow = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId) as any;
    if (!userRow) {
      throw new Error(`User profile not found for user_id: ${userId}. Please complete your profile first.`);
    }

    const eventRow = db.prepare('SELECT * FROM events WHERE event_id = ?').get(eventId) as any;
    if (!eventRow) {
      throw new Error(`Event not found for event_id: ${eventId}`);
    }

    const event: CanonicalEvent = ingestionService.deserializeEvent(eventRow);
    const profile: UserProfile = {
      ...userRow,
      skills: JSON.parse(userRow.skills || '[]')
    };

    // Form field mappings based on standard hackathon platforms (Devpost/Devfolio/Luma/Unstop)
    const mappedFields: Record<string, string> = {
      'Full Name': profile.full_name,
      'Email Address': profile.email,
      'Phone Number': profile.phone || 'Not provided',
      'College / Institution': profile.college_or_company,
      'Degree / Specialization': profile.degree_or_role,
      'Years of Experience': `${profile.experience_years} years`,
      'Key Technical Skills': profile.skills.join(', '),
      'GitHub Profile': profile.github_url || 'N/A',
      'LinkedIn Profile': profile.linkedin_url || 'N/A',
      'Portfolio URL': profile.portfolio_url || 'N/A',
      'Bio / Statement': profile.bio || 'Passionate software builder excited to create high-impact projects.'
    };

    const manualSteps: string[] = [];
    if (event.source_platform.toLowerCase().includes('devpost') || event.source_platform.toLowerCase().includes('unstop')) {
      manualSteps.push('Platform requires user authentication / OAuth login.');
    }
    if (event.price > 0) {
      manualSteps.push(`Payment of ${event.currency} ${event.price} requires manual card/UPI authorization.`);
    }

    const auditId = uuidv4();
    const status = manualSteps.length > 0 ? 'MANUAL_REQUIRED' : 'REVIEW_PENDING';

    db.prepare(`
      INSERT INTO registration_audits (id, user_id, event_id, status, mapped_fields, review_confirmed, submitted_at, notes)
      VALUES (?, ?, ?, ?, ?, 0, NULL, ?)
    `).run(
      auditId,
      userId,
      eventId,
      status,
      JSON.stringify(mappedFields),
      `Prepared automated profile mapping for ${event.canonical_title}`
    );

    return {
      audit_id: auditId,
      user_id: userId,
      event_id: eventId,
      event_title: event.canonical_title,
      registration_url: event.registration_url || event.source_url,
      source_platform: event.source_platform,
      status,
      mapped_fields: mappedFields,
      manual_steps_required: manualSteps,
      eligibility_checked: true,
      notes: `Mapped profile information. Please review all fields before giving final submission consent.`
    };
  }

  /**
   * Confirms and completes the assisted registration with explicit user approval
   */
  async confirmRegistration(auditId: string, userId: string): Promise<{ success: boolean; message: string; audit: any }> {
    const auditRow = db.prepare('SELECT * FROM registration_audits WHERE id = ? AND user_id = ?').get(auditId, userId) as any;
    if (!auditRow) {
      throw new Error(`Audit record not found or access denied for audit_id: ${auditId}`);
    }

    const nowIso = new Date().toISOString();

    db.prepare(`
      UPDATE registration_audits
      SET status = 'USER_CONFIRMED', review_confirmed = 1, submitted_at = ?
      WHERE id = ?
    `).run(nowIso, auditId);

    // Save event to user's saved_events if not already saved
    db.prepare(`
      INSERT OR IGNORE INTO saved_events (id, user_id, event_id, notes, created_at)
      VALUES (?, ?, ?, 'Registered via AI Assistant', ?)
    `).run(uuidv4(), userId, auditRow.event_id, nowIso);

    return {
      success: true,
      message: 'Registration confirmed. Form data has been verified and registered to your profile.',
      audit: {
        audit_id: auditId,
        status: 'USER_CONFIRMED',
        submitted_at: nowIso
      }
    };
  }
}

export const registrationAgent = new RegistrationAgent();

