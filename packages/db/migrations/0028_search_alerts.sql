CREATE TABLE IF NOT EXISTS "search_alerts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "guest_email" text NOT NULL,
  "city" text,
  "property_type" text,
  "max_price_minor" integer,
  "amenities" text[],
  "last_notified_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "search_alerts_email_idx" ON "search_alerts" ("guest_email");
