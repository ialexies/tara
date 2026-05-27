import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUid: text('actor_uid'),
    actorEmail: text('actor_email'),
    event: text('event').notNull(),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    metadata: jsonb('metadata'),
    requestId: text('request_id'),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_log_created_at_idx').on(t.createdAt),
    index('audit_log_actor_uid_idx').on(t.actorUid),
    index('audit_log_entity_idx').on(t.entityType, t.entityId),
    index('audit_log_event_idx').on(t.event),
  ],
);
