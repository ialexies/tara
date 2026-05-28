ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referral_code" text UNIQUE;
