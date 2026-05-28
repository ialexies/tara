CREATE TABLE "booking_date_changes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "booking_id" uuid NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
  "requested_check_in" text NOT NULL,
  "requested_check_out" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "guest_message" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone
);
CREATE INDEX "booking_date_changes_booking_id_idx" ON "booking_date_changes"("booking_id");
