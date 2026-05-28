CREATE TABLE IF NOT EXISTS "property_staff" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "owner_uid" text NOT NULL,
  "staff_email" text NOT NULL,
  "staff_uid" text,
  "role" text NOT NULL DEFAULT 'cohost',
  "created_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE("property_id", "staff_email")
);
CREATE INDEX "property_staff_property_idx" ON "property_staff" ("property_id");
CREATE INDEX "property_staff_uid_idx" ON "property_staff" ("staff_uid");
