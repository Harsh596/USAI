import { db } from '../db/database';
import { CanonicalEvent, EventChangeRecord, NotificationRecord } from '../models/types';
import { ingestionService } from '../services/ingestion.service';
import { tinyFishService } from '../services/tinyfish.service';
import { normalizationService } from '../services/normalization.service';
import { v4 as uuidv4 } from 'uuid';

export class MonitoringAgent {
  /**
   * Rechecks active monitored events, detects field-level changes, and emits notifications
   */
  async runMonitoringCycle(): Promise<{ checked_count: number; changes_detected: number; notifications_sent: number }> {
    const subscriptions = db.prepare(`
      SELECT ms.*, e.source_url, e.source_platform, e.canonical_title, e.content_hash, e.registration_deadline, e.registration_status, e.prize_pool
      FROM monitoring_subscriptions ms
      JOIN events e ON ms.event_id = e.event_id
      WHERE ms.active = 1
    `).all() as any[];

    if (subscriptions.length === 0) {
      return { checked_count: 0, changes_detected: 0, notifications_sent: 0 };
    }

    let checkedCount = 0;
    let changesDetected = 0;
    let notificationsSent = 0;

    // Deduplicate event URLs to avoid repeated fetch
    const uniqueEvents = new Map<string, any>();
    for (const sub of subscriptions) {
      if (!uniqueEvents.has(sub.event_id)) {
        uniqueEvents.set(sub.event_id, sub);
      }
    }

    const eventList = Array.from(uniqueEvents.values());
    const urls = eventList.map(e => e.source_url);

    // Fetch refreshed pages via TinyFish
    const fetchResponse = await tinyFishService.fetchContent(urls);

    for (const item of fetchResponse.results) {
      const existing = eventList.find(e => e.source_url === item.url || e.source_url === item.final_url);
      if (!existing || !item.text) continue;

      checkedCount++;
      const newHash = normalizationService.computeContentHash(item.text);

      // Check if content hash changed
      if (newHash !== existing.content_hash) {
        const updatedEvent = normalizationService.normalizePage(item, existing.source_platform);
        const nowIso = new Date().toISOString();

        // Field-level comparison
        const detectedFieldChanges: Array<{ field: string; oldVal: string; newVal: string }> = [];

        if (existing.registration_status !== updatedEvent.registration_status) {
          detectedFieldChanges.push({ field: 'registration_status', oldVal: existing.registration_status, newVal: updatedEvent.registration_status });
        }
        if (existing.registration_deadline !== updatedEvent.registration_deadline) {
          detectedFieldChanges.push({ field: 'registration_deadline', oldVal: existing.registration_deadline || 'None', newVal: updatedEvent.registration_deadline || 'None' });
        }
        if (existing.prize_pool !== updatedEvent.prize_pool) {
          detectedFieldChanges.push({ field: 'prize_pool', oldVal: existing.prize_pool || 'None', newVal: updatedEvent.prize_pool || 'None' });
        }

        if (detectedFieldChanges.length > 0) {
          changesDetected++;

          // Record change in DB
          for (const change of detectedFieldChanges) {
            db.prepare(`
              INSERT INTO event_changes (id, event_id, field_name, old_value, new_value, detected_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(uuidv4(), existing.event_id, change.field, change.oldVal, change.newVal, nowIso);
          }

          // Ingestion update
          ingestionService.saveEvent(updatedEvent);

          // Find all subscribers for this event and send notifications
          const subs = subscriptions.filter(s => s.event_id === existing.event_id);
          for (const s of subs) {
            const notifId = uuidv4();
            const message = `Event update for "${existing.canonical_title}": ` +
              detectedFieldChanges.map(c => `${c.field.replace('_', ' ')} updated from "${c.oldVal}" to "${c.newVal}"`).join(', ');

            // Deduplication check: Do not send identical notification if sent in last 24h
            const exists = db.prepare(`
              SELECT id FROM notifications 
              WHERE user_id = ? AND event_id = ? AND notification_type = 'EVENT_CHANGED' 
              AND datetime(delivery_timestamp) > datetime('now', '-1 day')
            `).get(s.user_id, existing.event_id);

            if (!exists) {
              db.prepare(`
                INSERT INTO notifications (id, user_id, event_id, notification_type, title, message, status, delivery_timestamp)
                VALUES (?, ?, ?, 'EVENT_CHANGED', ?, ?, 'SENT', ?)
              `).run(notifId, s.user_id, existing.event_id, `Update: ${existing.canonical_title}`, message, nowIso);
              notificationsSent++;
            }
          }
        }
      }

      // Update last checked time
      db.prepare(`UPDATE monitoring_subscriptions SET last_checked_at = ? WHERE event_id = ?`).run(new Date().toISOString(), existing.event_id);
    }

    return { checked_count: checkedCount, changes_detected: changesDetected, notifications_sent: notificationsSent };
  }

  /**
   * Subscribe user to event monitoring
   */
  subscribe(userId: string, eventId: string): boolean {
    const now = new Date().toISOString();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO monitoring_subscriptions (id, user_id, event_id, notify_email, reminder_intervals_days, last_checked_at, active)
      VALUES (?, ?, ?, 1, '[7, 3, 1, 0]', ?, 1)
      ON CONFLICT(user_id, event_id) DO UPDATE SET active = 1
    `).run(id, userId, eventId, now);
    return true;
  }

  /**
   * Unsubscribe user
   */
  unsubscribe(userId: string, eventId: string): boolean {
    const res = db.prepare('UPDATE monitoring_subscriptions SET active = 0 WHERE user_id = ? AND event_id = ?').run(userId, eventId);
    return res.changes > 0;
  }
}

export const monitoringAgent = new MonitoringAgent();

