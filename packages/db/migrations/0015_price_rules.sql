CREATE TABLE "price_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "room_id" uuid REFERENCES "rooms"("id") ON DELETE CASCADE,
  "tenant_id" text NOT NULL,
  "name" text NOT NULL,
  "start_date" text NOT NULL,
  "end_date" text NOT NULL,
  "min_nights" integer,
  "rate_override_minor" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "price_rules_property_id_idx" ON "price_rules"("property_id");
CREATE INDEX "price_rules_room_id_idx" ON "price_rules"("room_id");
