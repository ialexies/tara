CREATE TABLE "reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
  "booking_id" uuid NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
  "guest_name" text NOT NULL,
  "guest_uid" text,
  "rating" integer NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
  "body" text,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "reviews_booking_id_uidx" UNIQUE("booking_id")
);
CREATE INDEX "reviews_property_id_idx" ON "reviews"("property_id");
CREATE INDEX "reviews_status_idx" ON "reviews"("status");
