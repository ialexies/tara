CREATE TABLE "device_tokens" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_uid"   text NOT NULL,
  "token"      text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "device_tokens_uid_token_unique" UNIQUE ("user_uid", "token")
);
CREATE INDEX "device_tokens_user_uid_idx" ON "device_tokens" ("user_uid");
