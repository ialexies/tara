ALTER TABLE "referrals"
  ADD CONSTRAINT "referrals_referred_email_unique" UNIQUE ("referred_email");
