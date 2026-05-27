-- Audit log: immutable append-only record of every significant platform action.
-- Written to by the API at boundaries (auth events, money mutations, admin actions).
-- Never updated or deleted — the point is permanence.

CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Who did it (null for anonymous / system actions)
  actor_uid   text,
  actor_email text,
  -- What happened (noun.verb past-tense, e.g. booking.confirmed, property.approved)
  event       text NOT NULL,
  -- Resource the action affected
  entity_type text,
  entity_id   text,
  -- Arbitrary JSON context (before/after state, IPs, amounts, etc.)
  metadata    jsonb,
  -- Request tracing
  request_id  text,
  ip          text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Efficient time-range queries (most common access pattern)
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at DESC);
-- Lookup by actor (owner dashboard / support)
CREATE INDEX IF NOT EXISTS audit_log_actor_uid_idx  ON audit_log (actor_uid) WHERE actor_uid IS NOT NULL;
-- Lookup by entity (e.g. all events for booking X)
CREATE INDEX IF NOT EXISTS audit_log_entity_idx     ON audit_log (entity_type, entity_id) WHERE entity_type IS NOT NULL;
-- Event type queries
CREATE INDEX IF NOT EXISTS audit_log_event_idx      ON audit_log (event);
