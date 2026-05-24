# Analytics Architecture

How Tara measures what's happening across product, business, infrastructure, and SEO. **Promotes and expands the strategy living in `memory/analytics_and_ads_strategy.md`.**

> Related: [`ai-features.md`](ai-features.md) (cost discipline applies to analytics too), [`admin-dashboards.md`](admin-dashboards.md) (superadmin embeds dashboards), [`seo-strategy.md`](../business/seo-strategy.md) (the marketing side).

This doc is the engineering spec. Implementation reference for every line of code that fires an event.

---

## The premise: vanity vs. actionable metrics

Before tools, the most important concept.

| Type           | Description                                     | Examples                                                                      |
| -------------- | ----------------------------------------------- | ----------------------------------------------------------------------------- |
| **Vanity**     | Goes up, makes you feel good, tells you nothing | page views, social followers, total signups                                   |
| **Actionable** | Each value suggests a next step                 | booking conversion %, repeat-booking rate, owner activation rate, refund rate |

**Engineering metaphor:** vanity metrics are like CPU usage (informative but not actionable). Actionable metrics are like p95 latency + error rate (tell you what to fix).

Tara tracks ONLY actionable metrics. Vanity metrics get computed for narrative when needed but never drive decisions.

---

## The 4 analytics types (each answers a different question)

| Type                   | Tool                                   | Question it answers                                      | Phase |
| ---------------------- | -------------------------------------- | -------------------------------------------------------- | ----- |
| **Product analytics**  | PostHog (self-hosted)                  | "What do users do in my app? Where do they drop off?"    | A→B   |
| **Business analytics** | Metabase (self-hosted)                 | "How's the business doing? MRR, GBV, take rate?"         | A→B   |
| **Web analytics**      | Plausible OR PostHog Web               | "Where does traffic come from? Which pages are popular?" | A     |
| **SEO analytics**      | Google Search Console + Bing Webmaster | "What are people searching that I rank for?"             | A     |
| **Error/performance**  | Sentry                                 | "What's broken in production?"                           | A     |

Each gets its own section below.

---

## Product analytics — PostHog

### Why PostHog (vs Mixpanel, Amplitude, etc.)

- Self-hostable on home server — zero per-event cost
- Combined toolset: events + feature flags + session replay + A/B testing + heatmaps
- Open source, generous free cloud tier if we ever move
- Server-side AND client-side SDKs (server-side bypasses adblockers)
- TypeScript-native

### Architecture

```
   Browser (apps/web)
        │
        │  posthog-js (client-side)
        │  Forwards via: /ph/* (Cloudflare Worker proxy)
        │  Bypass adblockers (looks like first-party)
        ▼
   Cloudflare Worker (free)
        │ proxy to:
        ▼
   PostHog (self-hosted on home server, :8000)
        ▲
        │  posthog-node (server-side, more reliable)
        │
   apps/api (NestJS)  + apps/jobs (BullMQ)
```

**Why a Cloudflare Worker proxy:**

- PostHog domain (`*.posthog.com` or our self-hosted) is blocked by ~30% of adblockers
- Cloudflare Worker routes `tarastays.com/ph/*` → home server PostHog
- To the browser, it looks like first-party requests to our own domain
- Free (within Cloudflare Worker free tier)

**Why server-side too:**

- Critical events (booking_confirmed, payment_received) MUST be captured
- Don't trust client-side: user can block JS, leave page, etc.
- Server-side via `posthog-node` is 100% reliable
- Pattern: fire server-side for important events; client-side for browse-only

### Event taxonomy — THE spec

**Convention (non-negotiable):**

- Format: `noun_verb` past tense snake_case
- Examples: `property_viewed`, `booking_created`, `payment_failed`
- ❌ Not: `view_property`, `BookingCreated`, `viewedProperty`

**Required properties on EVERY event:**

```ts
{
  distinct_id: string,           // user_id if logged in, anon_id if not
  $current_url: string,          // automatic with posthog-js
  $referrer: string,             // automatic
  $browser: string,              // automatic
  $device_type: 'mobile' | 'desktop' | 'tablet',
  $os: string,
  locale: 'en' | 'tl',           // from i18n context
  tenant_id?: string,            // when applicable
  is_mock?: boolean,             // exclude mock data from analytics
  app_version: string,           // e.g. 'web@0.2.1'
}
```

### The full event catalog (Phase B baseline)

**Guest-side**
| Event | Required properties |
|---|---|
| `page_viewed` | `path`, `page_type` (home/search/property/checkout/static) |
| `search_performed` | `query`, `region`, `check_in`, `check_out`, `sleeps`, `result_count` |
| `property_viewed` | `property_id`, `from` (search/direct/marketing) |
| `property_photo_lightbox_opened` | `property_id`, `photo_index` |
| `unit_selected` | `property_id`, `unit_id`, `room_type` |
| `checkout_started` | `property_id`, `unit_id(s)`, `check_in`, `check_out`, `nights`, `subtotal_minor`, `currency` |
| `checkout_step_completed` | `step` (details/payment), `time_on_step_ms` |
| `payment_method_selected` | `method` (stripe/manual_gcash/manual_bank/manual_maya), `is_first_booking` |
| `promo_code_entered` | `code`, `valid` (bool), `discount_minor?` |
| `booking_created` | `booking_id`, `property_id`, `total_minor`, `currency`, `payment_mode`, `nights` |
| `payment_succeeded` | `booking_id`, `amount_minor` |
| `payment_failed` | `booking_id`, `reason`, `error_code` |
| `booking_cancelled` | `booking_id`, `cancelled_by` (guest/owner/system), `refund_minor` |
| `review_submitted` | `booking_id`, `property_id`, `rating`, `has_photo` |
| `signup_completed` | `method` (email/google), `referral_code?`, `intent` (guest/owner) |
| `email_verified` | `time_since_signup_seconds` |
| `phone_verified` | `time_since_signup_seconds` |
| `login_succeeded` | `method` |
| `language_switched` | `from`, `to` |
| `currency_switched` | `from`, `to` |

**Owner-side (in /admin)**
| Event | Required properties |
|---|---|
| `owner_property_created` | `property_id`, `time_since_signup_seconds` |
| `owner_room_added` | `property_id`, `room_type` |
| `owner_photo_uploaded` | `property_id`, `photo_count_total`, `via` (drag/click) |
| `owner_property_published` | `property_id`, `time_since_property_created_seconds` |
| `owner_booking_verified` | `booking_id`, `payment_mode`, `time_since_received_seconds` |
| `owner_booking_disputed` | `booking_id`, `reason_category` |
| `owner_pricing_rule_added` | `property_id`, `rule_type` |
| `owner_message_replied` | `thread_id`, `response_time_minutes` |
| `owner_help_clicked` | `topic` |
| `owner_stripe_onboarding_started` | `property_id` |
| `owner_stripe_onboarding_completed` | `property_id`, `time_in_flow_minutes` |

**Founder/superadmin (audit + analytics)**
| Event | Required properties |
|---|---|
| `admin_property_verified` | `property_id`, `verification_level` |
| `admin_property_suspended` | `property_id`, `reason` |
| `admin_owner_suspended` | `owner_user_id`, `reason` |
| `admin_dispute_resolved` | `booking_id`, `outcome`, `resolution_time_hours` |
| `admin_impersonation_started` | `target_user_id` |
| `admin_impersonation_ended` | `target_user_id`, `duration_minutes` |

**System events**
| Event | Required properties |
|---|---|
| `notification_sent` | `type`, `channel`, `recipient_role`, `success`, `latency_ms` |
| `notification_failed` | `type`, `channel`, `recipient_role`, `error` |
| `webhook_received` | `provider` (stripe/whatsapp), `event_type`, `processed`, `latency_ms` |
| `ai_call` | `feature`, `provider`, `model`, `input_tokens`, `output_tokens`, `latency_ms`, `cost_usd`, `success` |
| `concurrency_lock_acquired` | `target` (unit/slot), `wait_ms` |
| `concurrency_lock_failed` | `target`, `reason` |
| `double_booking_index_violation` | `unit_id`, `night` (PAGES THE FOUNDER) |

### Living event catalog

Master spec lives at `packages/analytics/events.ts`:

```ts
// packages/analytics/events.ts
import { z } from 'zod';

export const BookingCreatedEvent = z.object({
  booking_id: z.string().uuid(),
  property_id: z.string().uuid(),
  total_minor: z.number().int(),
  currency: z.string().length(3),
  payment_mode: z.enum(['stripe', 'manual']),
  nights: z.number().int().positive(),
});

export type BookingCreatedEvent = z.infer<typeof BookingCreatedEvent>;

export function trackBookingCreated(payload: BookingCreatedEvent, user_id: string) {
  posthog.capture({
    distinctId: user_id,
    event: 'booking_created',
    properties: { ...payload, ...baseProperties() },
  });
}
```

Why a typed wrapper:

- Catches event-property typos at compile time
- One place to add common properties
- One place to update if PostHog API changes
- Lint rule: no raw `posthog.capture()` calls outside `packages/analytics/`

---

## The 5 funnels that matter

These are the only funnels we monitor weekly. Everything else is exploratory.

### 1. Guest acquisition funnel

```
page_viewed (home or search)
   ↓
search_performed
   ↓
property_viewed
   ↓
checkout_started
   ↓
booking_created
   ↓
payment_succeeded (or owner_booking_verified for manual)
```

**Metric: overall conversion = bookings / unique visitors.** Industry benchmark for travel: 1-3%. Below 1% means something is broken.

### 2. Repeat booking funnel

```
payment_succeeded (1st booking)
   ↓
returned_to_site (within 6 months)
   ↓
payment_succeeded (2nd booking)
```

**Metric: % of first-bookers who book again within 6 months.** Repeat rate is the leading indicator of long-term unit economics.

### 3. Owner activation funnel

The 7-stage funnel from [`owner-onboarding.md`](../business/owner-onboarding.md):

```
signup_completed (intent=owner)
   ↓
owner_property_created
   ↓
owner_property_published
   ↓
admin_property_verified
   ↓
booking_created (first one on this property)
   ↓
checked_out (first stay completed)
   ↓
5th booking_created
```

**Metric: L1 → L5 conversion within 30 days.** The single most important business metric.

### 4. Tour bundling funnel

```
unit_selected (accommodation)
   ↓
tour_offered (during checkout)
   ↓
tour_added_to_booking
   ↓
booking_created (with tour line item)
```

**Metric: % of accommodation bookings that include a tour.** This is our wedge (per `05-tours.md`). Target: 15%+ Phase C.

### 5. Search abandonment

```
search_performed
   ↓
(no property_viewed within session)
   ↓
session_ended
```

**Metric: zero-view-after-search rate.** High value = bad search UX or no inventory in their criteria. Drives where to add inventory next.

---

## Business analytics — Metabase

### Why Metabase

- Self-hosted on home server, free
- Connects directly to Postgres (no ETL needed)
- Founder writes SQL once, gets dashboards forever
- Embeds in superadmin dashboard via iframe
- Read-only replica recommended (Phase C+) to protect production DB

### Connection setup

Metabase runs in Docker (per `home-server-services.md`). Connects to Postgres via:

- **Phase A-B:** primary DB, read-only user `metabase_reader` (cannot modify data)
- **Phase C+:** read replica (zero query impact on production)

```sql
-- Create read-only user for Metabase
CREATE USER metabase_reader WITH PASSWORD '<from vault>';
GRANT CONNECT ON DATABASE tara_dev TO metabase_reader;
GRANT USAGE ON SCHEMA public TO metabase_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO metabase_reader;
```

### The morning dashboard (founder's homepage)

Save the Metabase URL as your browser homepage. Look at it every day.

Key questions answered:

```
TODAY
  bookings_today          (count from bookings WHERE DATE(created_at) = today)
  gbv_today_minor          (sum of total_minor)
  net_commission_today     (sum of commission_minor)
  new_properties_today     (count from properties)
  new_owner_signups_today  (count from users WHERE role='owner')

LAST 7 DAYS
  daily_bookings_chart     (line chart, daily count)
  daily_gbv_chart           (line chart, daily sum)
  cancellation_rate_7d     (cancelled / total)
  refund_rate_7d
  manual_mode_share        (% of bookings via manual)

OWNER ACTIVATION FUNNEL (this week's cohort)
  L1, L2, L3, L4, L5 counts + drop-off %

OPERATIONAL HEALTH
  api_p95_latency          (from Prometheus via embed)
  api_error_rate
  notification_failure_rate_24h
  bookings_awaiting_verification (manual mode, age > 12h)
  active_disputes          (open status)
  WAL_lag                  (backup health)

REVENUE — THIS MONTH
  gbv_mtd                  (gross booking value)
  net_commission_mtd
  payouts_due
  stripe_balance_remaining
```

These queries become saved Metabase "questions" → assembled into a "Daily" dashboard.

### Standard saved queries (templates)

```sql
-- Cohort retention: bookings per signup-month cohort
SELECT
  DATE_TRUNC('month', u.created_at) AS cohort_month,
  EXTRACT(MONTH FROM AGE(b.created_at, u.created_at)) AS months_since_signup,
  COUNT(DISTINCT u.id) AS users_in_cohort,
  COUNT(DISTINCT b.id) AS bookings_made
FROM users u
LEFT JOIN bookings b ON b.guest_id = u.id AND b.status IN ('confirmed','checked_in','checked_out')
WHERE u.created_at >= NOW() - INTERVAL '12 months'
GROUP BY 1, 2
ORDER BY 1 DESC, 2;
```

```sql
-- Channel attribution
SELECT
  attribution_source,
  COUNT(*) AS bookings,
  SUM(total_minor) / 100.0 AS gbv_php,
  ROUND(AVG(total_minor) / 100.0, 0) AS avg_booking_php
FROM bookings
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND status IN ('confirmed','checked_in','checked_out')
GROUP BY attribution_source
ORDER BY bookings DESC;
```

```sql
-- Owner ranking — last 30 days
SELECT
  o.display_name,
  COUNT(b.id) AS bookings,
  SUM(b.total_minor) / 100.0 AS revenue_php,
  ROUND(AVG(EXTRACT(EPOCH FROM (b.owner_verified_at - b.created_at)) / 3600)::numeric, 1) AS avg_verification_hours
FROM owners o
JOIN properties p ON p.owner_id = o.id
JOIN bookings b ON b.property_id = p.id
WHERE b.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.id, o.display_name
ORDER BY revenue_php DESC;
```

More query templates in `infra/metabase/queries/` (committed to git).

---

## Cohort analysis

A **cohort** = a group of users grouped by when they did something (usually signup).

Cohorts answer: "are we getting better over time, or are we just adding the same kinds of users?"

Standard cohort views in Metabase:

| Cohort dimension    | Metric tracked                             | Insight                           |
| ------------------- | ------------------------------------------ | --------------------------------- |
| Signup month        | % retained (booked again) at month 1, 2, 3 | Are we improving repeat rate?     |
| First booking month | Avg bookings per user at month 6           | LTV trajectory                    |
| Owner signup month  | % active at month 1, 3, 6                  | Onboarding quality over time      |
| First-touch channel | Conversion rate                            | Which acquisition source is best? |

If cohort 2026-Q1 retains 18% at 90 days and cohort 2026-Q3 retains 24% — we're improving. If it's the reverse, something is degrading and you need to investigate.

---

## Privacy + consent (PH RA 10173)

PH Data Privacy Act requires:

1. **Consent before tracking.** Cookie consent banner before non-essential analytics fires.
2. **Distinguish essential from non-essential.**
   - Essential (allowed without consent): error tracking, security logs, session for logged-in users
   - Non-essential (needs consent): PostHog product analytics, third-party pixels
3. **Right to opt out.** "Manage privacy" link in footer; user can disable analytics permanently
4. **No sale of data.** Explicit in T&C.
5. **Data export + deletion** rights (per ADR-0002 multi-tenancy notes)

### Implementation pattern

```tsx
// apps/web/components/ConsentBanner.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import posthog from 'posthog-js';

export function ConsentBanner() {
  const t = useTranslations('consent');
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('tara_consent')) setShown(true);
  }, []);

  function accept() {
    localStorage.setItem(
      'tara_consent',
      JSON.stringify({ analytics: true, timestamp: Date.now() }),
    );
    posthog.opt_in_capturing();
    setShown(false);
  }

  function reject() {
    localStorage.setItem(
      'tara_consent',
      JSON.stringify({ analytics: false, timestamp: Date.now() }),
    );
    posthog.opt_out_capturing();
    setShown(false);
  }

  if (!shown) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 ...">
      <p>{t('message')}</p>
      <button onClick={accept}>{t('accept')}</button>
      <button onClick={reject}>{t('reject')}</button>
    </div>
  );
}
```

PostHog is initialized with `opt_out_capturing_by_default: true`. Tracking starts only after explicit consent.

### What we track for non-consenters

- Pageviews (counted in aggregate, no user identification)
- Error reports (Sentry — essential for service)
- Basic web analytics via Plausible (privacy-preserving, no cookies)

No PostHog product events fire without consent. No cross-page identification.

---

## A/B testing framework (Phase C+)

PostHog includes feature flags + experiments natively.

### Simple feature flag (Phase B already useful)

```ts
import { isFeatureEnabled } from 'posthog-node';

if (await isFeatureEnabled('new-checkout-flow', user_id)) {
  // show new flow
} else {
  // show current flow
}
```

### A/B experiment (Phase C+)

```
Experiment: "Sticky booking widget on listing page"
  Hypothesis: sticky widget on scroll increases CTR by ≥15%
  Metric: % of property_viewed → checkout_started within session
  Variants:
    control: current (widget scrolls with page)
    variant_a: sticky on scroll
  Allocation: 50/50
  Min sample size: 2000 (computed via power analysis)
  Duration: 2 weeks max OR until significance
```

PostHog handles allocation, tracking, statistical significance. Founder reads results in PostHog dashboard.

**Discipline:** never run more than 2 simultaneous experiments per surface. Confounds get unmanageable. Don't peek before significance.

---

## Anti-patterns

| Don't                                                 | Why                                                                                |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Track everything by default                           | Noise. Disk costs. Privacy risk. Each event must justify itself.                   |
| Use raw event names without taxonomy                  | Drift makes the data unanalyzable in 6 months                                      |
| Log PII (full name, email, phone) as event properties | Privacy + GDPR/RA10173 risk. Use IDs; resolve to PII only in-app when authorized.  |
| Track money as floating-point in events               | Already a sin in `07-money.md`; same here. Always minor units.                     |
| Build custom analytics infra                          | PostHog/Metabase do this better and free. Build only the wrappers.                 |
| Watch dashboards 10x a day                            | Looking at metrics ≠ improving them. Set a daily ritual; don't refresh constantly. |
| Optimize for vanity (more users! more pageviews!)     | These don't drive revenue. Optimize for actionable metrics.                        |
| Run 5 A/B tests at once on the same surface           | Statistically meaningless; can't isolate causes                                    |
| Stop a test early because it "looks good"             | Selection bias. Wait for the planned sample size.                                  |
| Track without consent                                 | Illegal + erodes trust                                                             |
| Send sensitive PII to PostHog                         | Privacy + data residency concerns                                                  |

---

## Pre-launch setup (Phase A) — cheap now, painful later

These should be in place BEFORE the first real owner is onboarded:

- [ ] `packages/analytics/events.ts` with typed event catalog
- [ ] `posthog-node` SDK in `apps/api` + `apps/jobs`
- [ ] `posthog-js` SDK in `apps/web` (gated by consent)
- [ ] Cloudflare Worker reverse proxy for `tarastays.com/ph/*`
- [ ] PostHog container in Portainer (per `home-server-services.md`)
- [ ] Metabase container + read-only DB user
- [ ] Google Search Console + Bing Webmaster verified
- [ ] Cookie consent banner (PH compliant)
- [ ] Sentry SDK in all apps
- [ ] UTM parameter naming convention documented
- [ ] Plausible (or PostHog Web) for cookieless pageviews
- [ ] "Don't track me" link in footer that flips consent off

Total setup time: ~2 days. Saves months of "we should have been measuring this from day 1" regret.

---

## Phase rollout

| Phase                | What's live                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| **A (Months 0-6)**   | Event catalog, PostHog + Metabase running, basic dashboards, consent banner, Sentry, Search Console |
| **B (Months 6-12)**  | 5 funnels actively monitored, cohort dashboards, weekly review ritual with metrics                  |
| **C (Months 12-24)** | A/B testing infra, channel attribution dashboards, conversion optimization based on real data       |
| **D+**               | Predictive models (churn prediction, demand forecasting), dedicated analytics/data role             |

---

## When this doc changes

- New event added to catalog → update spec + tests
- Provider swap (e.g., PostHog → Mixpanel) → rewrite implementation section
- New funnel discovered as important → add to "5 funnels" (probably replacing one)
- Privacy law change → update consent + compliance sections
- New dashboard added → add to Metabase template list
