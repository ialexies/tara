-- Cancellation policy per property
-- free_cancel_days: guest can cancel for free up to N days before check-in (0 = no free cancel)
-- partial_refund_percent: % refunded if cancelled after free period (0 = non-refundable)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS free_cancel_days integer NOT NULL DEFAULT 3;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS partial_refund_percent integer NOT NULL DEFAULT 50;

-- Minimum stay per room (nights)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS min_nights integer NOT NULL DEFAULT 1;
