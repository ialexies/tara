ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referral_code" text UNIQUE;
CREATE TABLE IF NOT EXISTS "referrals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "referrer_uid" text NOT NULL,
  "referred_email" text NOT NULL,
  "booking_id" uuid REFERENCES "bookings"("id") ON DELETE SET NULL,
  "discount_applied" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "referrals_referrer_idx" ON "referrals" ("referrer_uid");
