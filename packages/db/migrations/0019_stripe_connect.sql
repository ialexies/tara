-- Stripe Connect: store owner's connected account ID on their property
ALTER TABLE properties ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;

-- Track onboarding state so we can show owners what to do next
ALTER TABLE properties ADD COLUMN IF NOT EXISTS stripe_connect_enabled boolean NOT NULL DEFAULT false;
