ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'stripe_pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_session_id text;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_stripe_session_idx ON bookings(stripe_session_id) WHERE stripe_session_id IS NOT NULL;
