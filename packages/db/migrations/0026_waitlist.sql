CREATE TABLE IF NOT EXISTS "waitlist" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "room_id" uuid NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
  "property_id" uuid NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "guest_email" text NOT NULL,
  "guest_name" text NOT NULL,
  "check_in" date NOT NULL,
  "check_out" date NOT NULL,
  "notified_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE("room_id", "guest_email", "check_in")
);
CREATE INDEX "waitlist_room_idx" ON "waitlist" ("room_id");
