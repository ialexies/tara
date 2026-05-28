CREATE TABLE IF NOT EXISTS "guest_blacklist" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "owner_uid" text NOT NULL,
  "guest_email" text NOT NULL,
  "reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE("property_id", "guest_email")
);
CREATE INDEX "guest_blacklist_property_idx" ON "guest_blacklist" ("property_id");
CREATE INDEX "guest_blacklist_email_idx" ON "guest_blacklist" ("guest_email");
