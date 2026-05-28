CREATE TABLE IF NOT EXISTS wishlists (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id  uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, property_id)
);
CREATE INDEX IF NOT EXISTS wishlists_user_idx ON wishlists (user_id);
