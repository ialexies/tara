CREATE TABLE IF NOT EXISTS messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_uid  text NOT NULL,
  sender_name text NOT NULL DEFAULT '',
  body        text NOT NULL,
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_booking_idx ON messages (booking_id, created_at);
