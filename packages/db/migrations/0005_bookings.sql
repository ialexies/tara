CREATE TYPE "public"."booking_status" AS ENUM(
  'manual_pending',
  'awaiting_verification',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'refunded',
  'disputed'
);--> statement-breakpoint

CREATE TABLE "bookings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "property_id" uuid NOT NULL,
  "room_id" uuid NOT NULL,
  "tenant_id" text NOT NULL,
  "reference_code" text NOT NULL,
  "guest_uid" text,
  "guest_name" text NOT NULL,
  "guest_email" text NOT NULL,
  "guest_phone" text,
  "special_requests" text,
  "check_in" date NOT NULL,
  "check_out" date NOT NULL,
  "nights" integer NOT NULL,
  "status" "booking_status" NOT NULL DEFAULT 'manual_pending',
  "payment_mode" text NOT NULL DEFAULT 'manual',
  "total_minor" integer NOT NULL,
  "currency" text NOT NULL DEFAULT 'PHP',
  "owner_notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "bookings_reference_code_unique" UNIQUE("reference_code")
);--> statement-breakpoint

CREATE TABLE "booking_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "booking_id" uuid NOT NULL,
  "unit_id" uuid NOT NULL,
  "tenant_id" text NOT NULL,
  "night" date NOT NULL,
  "rate_minor" integer NOT NULL,
  "currency" text NOT NULL DEFAULT 'PHP',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

-- Prevents double-booking at the DB level — the real safety net.
CREATE UNIQUE INDEX "booking_items_unit_night_uidx" ON "booking_items" ("unit_id", "night");--> statement-breakpoint
CREATE INDEX "booking_items_booking_idx" ON "booking_items" ("booking_id");--> statement-breakpoint
CREATE INDEX "bookings_property_idx" ON "bookings" ("property_id");--> statement-breakpoint
CREATE INDEX "bookings_guest_email_idx" ON "bookings" ("guest_email");
