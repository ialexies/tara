ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "id_verified" boolean DEFAULT false NOT NULL;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "id_verified_at" timestamp;
