CREATE TABLE "owner_blocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL REFERENCES "properties"("id"),
  "tenant_id" text NOT NULL,
  "date" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "owner_blocks_property_date_uidx" UNIQUE("property_id", "date")
);
CREATE INDEX "owner_blocks_property_id_idx" ON "owner_blocks"("property_id");
