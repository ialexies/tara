ALTER TABLE reviews ADD COLUMN IF NOT EXISTS owner_reply text;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS owner_replied_at timestamptz;
