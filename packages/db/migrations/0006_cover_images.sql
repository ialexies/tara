ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "cover_image_url" text;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "cover_image_url" text;
