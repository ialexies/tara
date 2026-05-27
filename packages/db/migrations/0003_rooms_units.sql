CREATE TYPE "public"."room_type" AS ENUM('dorm', 'private');--> statement-breakpoint
CREATE TYPE "public"."bathroom_type" AS ENUM('shared', 'private', 'ensuite');--> statement-breakpoint
CREATE TYPE "public"."gender_policy" AS ENUM('mixed', 'female', 'male');--> statement-breakpoint

CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"room_type" "room_type" NOT NULL,
	"bathroom_type" "bathroom_type",
	"capacity" integer NOT NULL,
	"max_occupancy" integer,
	"gender" "gender_policy",
	"has_aircon" boolean DEFAULT false NOT NULL,
	"has_window" boolean DEFAULT false NOT NULL,
	"has_locker" boolean DEFAULT false NOT NULL,
	"has_outlet_per_bed" boolean DEFAULT false NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_mock" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"tenant_id" text NOT NULL,
	"label" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"is_mock" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rooms_property_idx" ON "rooms" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "rooms_tenant_idx" ON "rooms" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "units_room_idx" ON "units" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "units_tenant_idx" ON "units" USING btree ("tenant_id");
