import { Injectable, Logger } from '@nestjs/common';
import { db } from '@tara/db';
import { auditLog } from '@tara/db/schema';
import { desc } from 'drizzle-orm';

export type AuditEvent =
  // Auth
  | 'auth.login'
  | 'auth.logout'
  | 'auth.register'
  // Bookings
  | 'booking.created'
  | 'booking.confirmed'
  | 'booking.cancelled'
  | 'booking.checked_in'
  | 'booking.checked_out'
  // Payments
  | 'payment.stripe_session.created'
  | 'payment.stripe_session.completed'
  | 'payment.stripe_session.expired'
  // Properties
  | 'property.created'
  | 'property.updated'
  | 'property.approved'
  | 'property.suspended'
  // Rooms
  | 'room.created'
  | 'room.updated'
  | 'room.deleted'
  // Uploads
  | 'upload.presigned_url.created';

export type AuditContext = {
  actorUid?: string | null;
  actorEmail?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
  ip?: string;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  async listRecent(limit = 100) {
    return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
  }

  async log(event: AuditEvent, ctx: AuditContext = {}): Promise<void> {
    try {
      await db.insert(auditLog).values({
        event,
        actorUid: ctx.actorUid ?? null,
        actorEmail: ctx.actorEmail ?? null,
        entityType: ctx.entityType ?? null,
        entityId: ctx.entityId ?? null,
        metadata: ctx.metadata ?? null,
        requestId: ctx.requestId ?? null,
        ip: ctx.ip ?? null,
      });
    } catch (err) {
      // Audit log failure must never break the main request path.
      this.logger.error({ event: 'audit.write_failed', auditEvent: event, error: String(err) });
    }
  }
}
