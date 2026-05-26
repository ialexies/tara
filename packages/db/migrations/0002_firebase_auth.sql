-- Switch users table to Firebase-managed auth.
-- Drop password_hash; add firebase_uid (unique, required for new rows).
ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";
ALTER TABLE "users" ADD COLUMN "firebase_uid" text;
-- Existing rows (if any) won't have a firebase_uid yet, but for dev DBs this is fine.
CREATE UNIQUE INDEX IF NOT EXISTS "users_firebase_uid_unique" ON "users" ("firebase_uid");
