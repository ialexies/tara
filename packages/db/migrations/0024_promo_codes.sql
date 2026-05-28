CREATE TABLE IF NOT EXISTS promo_codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid REFERENCES properties(id) ON DELETE CASCADE,  -- NULL = platform-wide
  code            text NOT NULL,
  discount_type   text NOT NULL CHECK (discount_type IN ('percent', 'flat')),
  discount_value  integer NOT NULL,  -- percent 0-100 or flat amount in minor units
  max_uses        integer,           -- NULL = unlimited
  uses_count      integer NOT NULL DEFAULT 0,
  valid_from      date,
  valid_to        date,
  is_active       boolean NOT NULL DEFAULT true,
  created_by_uid  text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, property_id)
);
CREATE INDEX IF NOT EXISTS promo_codes_code_idx ON promo_codes (LOWER(code));

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promo_code_id uuid REFERENCES promo_codes(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_minor integer NOT NULL DEFAULT 0;
