# Stripe Connect End-to-End Test Runbook

Run this once per environment (local dev → staging) before signing off the Phase A→B gate.
Takes ~15 minutes total.

## Prerequisites

- Stripe test mode keys set (`STRIPE_SECRET_KEY=sk_test_...`, `STRIPE_WEBHOOK_SECRET=whsec_test_...`)
- API running locally or staging accessible
- Owner test account: `owner@test.tara-stays.com` / `Test1234!`
- Stripe CLI installed (`brew install stripe/stripe-tools/stripe`)

---

## Step 1 — Start the Stripe webhook listener (local dev only)

Open a terminal:

```bash
stripe listen --forward-to http://localhost:4000/stripe/webhook
```

Copy the webhook signing secret it prints (`whsec_...`) and set it as `STRIPE_WEBHOOK_SECRET` in your `.env`, then restart the API.

For staging, the webhook is already registered at `https://api-staging.tara-stays.com/stripe/webhook` in the Stripe dashboard.

---

## Step 2 — Owner onboarding

1. Log in as `owner@test.tara-stays.com`
2. Go to **Dashboard → Properties → [any property] → Rooms**
3. Find the amber "Connect Stripe to receive card payments" banner
4. Click **Connect Stripe account →**
5. You should be redirected to `https://connect.stripe.com/...`
6. Fill in the Express onboarding with **test data**:
   - Business type: Individual
   - Country: Philippines
   - Use any valid-looking test details (real name/address not required in test mode)
   - Bank: use the test routing/account numbers Stripe provides on the form
7. Complete all steps and click **Done**
8. You are redirected back to `?connect=success` on the rooms page
9. The amber banner should be replaced with the green **"✓ Stripe payouts connected"** banner

**Expected:** `stripeConnectEnabled = true` on the property in the DB, `stripeConnectAccountId` set.

---

## Step 3 — Guest books with card payment

1. Open a private/incognito window
2. Go to the property page for the connected property
3. Pick dates, select a room, click **Book this room →**
4. On the book page, fill in guest details
5. Click **Confirm booking** (for Stripe properties this goes to Stripe Checkout)
6. Use test card `4242 4242 4242 4242`, any future date, any CVC
7. Complete payment

**Expected:** You are redirected back to Tara with the booking in `confirmed` status.

Check in the API logs:

```
{ event: 'booking.confirmed', bookingId: '...', ... }
{ event: 'stripe.session_completed', ... }
```

---

## Step 4 — Test a failed payment

1. Repeat Step 3 but use card `4000 0000 0000 9995` (insufficient funds)

**Expected:** Stripe Checkout shows a payment failure. The booking in Tara should remain in `stripe_pending` and eventually be auto-cancelled by the cron (or manually cancel it).

---

## Step 5 — Test a refund

1. Go to Dashboard → Bookings
2. Find the confirmed booking from Step 3
3. Click **Cancel booking**

**Expected:**

- Booking status changes to `cancelled`
- In Stripe Dashboard → Payments, a refund appears for the session
- Guest receives cancellation email

---

## Step 6 — Clean up

1. In Stripe Dashboard → Connect → Accounts, find the test account created in Step 2
2. Click the account → More → Delete test account
3. Verify the property's rooms page shows the amber "Connect Stripe" banner again

---

## Checklist

- [ ] Owner onboarding completed → green banner shown
- [ ] Guest booked with card → booking confirmed automatically via webhook
- [ ] Failed payment handled gracefully
- [ ] Cancellation triggers refund in Stripe
- [ ] Test Connect account deleted after drill

When all boxes are checked, mark the "Stripe Connect PH onboarding tested end-to-end" gate as ✅ in `docs/founder/checklist.md`.
