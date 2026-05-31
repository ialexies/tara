# Tara — Claude Guidelines

## Project

Booking marketplace for Philippine hostels. Two-sided: guests book, owners list.
Monorepo: `apps/web` (Next.js 16), `apps/api` (NestJS), shared `packages/`.

## Mobile first — always

The majority of Tara's users are on mobile. Every UI decision must start from mobile.

- **Write mobile styles first**, then use `sm:` / `md:` / `lg:` to scale up. Never the reverse.
- **Tap targets** must be at least 44×44px (Apple/Google guideline).
- **Use `dvh`** not `vh` — iOS Safari's 100vh bug is real.
- **Safe areas**: use `.pb-safe`, `.pt-safe`, `.pl-safe`, `.pr-safe` for any fixed bars that overlap the home indicator or notch.
- **Test at 375px wide** (iPhone SE) as the minimum viewport. If it breaks there, it's broken.
- **No hover-only interactions** — anything interactive must work on touch.
- **Font sizes**: minimum `text-sm` (14px) for body copy on mobile.
- When reviewing or writing any frontend code, always ask: _does this work on a 375px screen?_

## Architecture

- `packages/schemas` — Zod schemas, source of truth for all data shapes
- `packages/db` — Drizzle ORM, postgres client
- Shared types flow: schema → API → web (never web → API)

### Key API modules

| Module            | Responsibility                                                        |
| ----------------- | --------------------------------------------------------------------- |
| `auth`            | Firebase token verification, user sync, custom claims, referral codes |
| `properties`      | Listings, approval flow, revenue summary, server-side filters         |
| `rooms`           | Room + unit management                                                |
| `bookings`        | Booking lifecycle, payments, check-in/out, ID verification            |
| `messages`        | Guest↔owner thread per booking (`messages` table)                     |
| `reviews`         | Post-checkout guest reviews                                           |
| `price-rules`     | Seasonal / date-range pricing overrides                               |
| `promo-codes`     | Owner creates discount codes; guests validate + apply at checkout     |
| `guest-blacklist` | Owner blocks guest emails from booking a property                     |
| `waitlist`        | Guests join queue; notified by email on cancellation                  |
| `search-alerts`   | Saved search filters; daily cron emails matching new properties       |
| `webhooks`        | Owner-registered HTTPS endpoints with HMAC signing                    |
| `property-staff`  | Co-host / manager roles per property                                  |
| `stripe`          | Checkout sessions, webhook, refunds                                   |
| `scheduler`       | Daily cron jobs — booking reminders + search alerts                   |
| `email`           | Transactional emails via Resend                                       |
| `uploads`         | R2 presigned upload URLs                                              |

### Property status flow

```
draft → pending (owner submits) → active (admin approves)
                                 → suspended (admin rejects)
active → draft (owner unpublishes)
```

Owners see a **"Submit for review"** button; admin approves in `/admin`. Email is sent on approval or rejection.

### Messaging

- Table: `messages(id, booking_id, sender_uid, sender_name, body, is_read, created_at)`
- Endpoints: `GET /bookings/:id/messages`, `POST /bookings/:id/messages`
- UI: message thread on guest booking page + owner booking card. Polls every 15 s.
- `@SkipThrottle()` on `MessagesController` — auth-gated, IP throttle adds nothing here.

### Booking rules

- **Minimum stay**: `rooms.min_nights` (default 1). Enforced at booking creation. Separate from price-rule `minNights`.
- **Cancellation policy**: `properties.free_cancel_days` (default 3) + `properties.partial_refund_percent` (default 50). Guest cancel page shows refund eligibility. API returns `refundPercent` on cancel.
- **Auto-expiry**: `manual_pending` bookings older than 24h are auto-cancelled by hourly cron. Guest receives cancellation email + WhatsApp.

### Notifications

| Event                           | Email         | WhatsApp                                   |
| ------------------------------- | ------------- | ------------------------------------------ |
| Booking created                 | Guest + owner | Guest (if phone) + owner (if contactPhone) |
| Booking confirmed               | Guest         | Guest                                      |
| Booking cancelled               | Guest         | Guest                                      |
| 24h check-in reminder           | Guest         | Guest                                      |
| 24h post-checkout review prompt | Guest         | Guest                                      |

WhatsApp uses Twilio — set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` in env to activate. Safe no-op when not set.
Owner's WhatsApp number is `properties.contact_phone` — set in Dashboard → Edit property.

### Analytics & monitoring

- **Plausible**: set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=tara-stays.com` (web build arg + runtime) to activate the `<Script>` tag.
- **Service worker**: `public/sw.js` registered via layout. Shows `public/offline.html` when navigation fails offline.
- **Audit log**: all money mutations and auth events go to `audit_log` table. Viewable in Admin → Audit tab.

### Rate limiting

`UserThrottlerGuard` (replaces `ThrottlerGuard`) keys by Firebase UID for authenticated requests, IP for unauthenticated. Prevents noisy clients on shared WiFi from throttling other users on the same IP.

**Three named throttlers** — always use the full name set when decorating:

```typescript
@SkipThrottle({ global: true, auth: true, guest_action: true })
```

`@SkipThrottle()` alone defaults to `{ default: true }` in Throttler v6, which does **not** match our named throttlers and silently has no effect.

**Public SSR endpoints** (`GET /properties`, `GET /properties/slug/:slug`, `GET /:id/images`, `GET /*/reviews`, `GET /*/reviews/stats`) are decorated with `@SkipThrottle({ global: true, auth: true, guest_action: true })`. Without this, Next.js SSR requests — which all share the same internal Docker/VPS IP — quickly exhaust the 120 req/min global bucket and trigger 429s that surface as 404s on the property page.

**Dev limit**: global throttler uses 2000 req/min when `NODE_ENV !== 'production'` to prevent the above during local development and E2E runs.

### Image domain allowlist (next.config.ts)

`images.remotePatterns` allows:

- `*.r2.dev` — Cloudflare R2 public URLs (all environments)
- Custom R2 hostname if `R2_PUBLIC_URL` is not `*.r2.dev` (production)
- `images.unsplash.com` — seed/test property images (all environments)
- `**` wildcard — development only (`NODE_ENV === 'development'`)

Adding a new image source for production: add a `{ protocol: 'https', hostname: '...' }` entry to `remotePatterns` in `next.config.ts` and rebuild the web image (it's a build-time config).

### Next.js Server Components + event handlers

`<Image onLoad={...}>` (and any other event handler) **cannot be used in Server Components** — Next.js cannot serialize function props across the server/client boundary. You'll get:

> Error: Event handlers cannot be passed to Client Component props.

Fix: either remove the handler or extract the image element into a `'use client'` component. The property page gallery previously used `onLoad` for a shimmer effect; it was removed since images load correctly without it.

### NEXT*PUBLIC*\* env vars — build args, not runtime

`NEXT_PUBLIC_FIREBASE_*` and other `NEXT_PUBLIC_` vars are **baked into the bundle at `next build` time**. Setting them only as runtime env vars in the container has no effect on the client-side bundle.

When rebuilding the web Docker image locally, export them first:

```bash
export $(grep -v '^#' .env | grep "NEXT_PUBLIC_FIREBASE" | xargs)
docker compose -f infra/docker-compose.dev.yml build web
```

Or ensure they're available in the shell/CI environment before `docker compose build`. The `docker-compose.dev.yml` passes them as `args:`, so they must be in the environment at build time — not just at container start time.

## Code style

- No comments unless the WHY is non-obvious
- No premature abstractions
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)

## Logging (apps/api)

Structured logging via `nestjs-pino`. Every log line is JSON in production and auto-binds `reqId` for in-request correlation.

- **Log objects, never strings.** `this.logger.log({ event: 'booking.created', bookingId, userId })` — not `` `created booking ${id}` ``.
- **Event names**: `noun.verb` past tense, snake_case fields. Examples: `booking.created`, `payment.failed`, `auth.session.create_failed`. Match the analytics taxonomy in [docs/architecture/analytics.md](docs/architecture/analytics.md).
- **Log at boundaries, not internals.** Worth logging: external API calls (Stripe, Firebase, R2), money mutations, auth events, caught-and-swallowed errors. Skip: indexed reads, getters, pure transforms, loop iterations.
- **Inject via `new Logger(ClassName.name)`** from `@nestjs/common` for 95% of cases. Use `PinoLogger.assign(...)` only when you need request-scoped bound context.
- **No `console.log`.** It bypasses the structured stream and won't be queryable in Loki.
- Reference pattern: [apps/api/src/auth/auth.service.ts](apps/api/src/auth/auth.service.ts).

## Infra

- Staging: `staging.tara-stays.com` — auto-deploys on push to `main` via GitHub Actions self-hosted runner
- Home server: `ialexies@192.168.0.253` — Portainer manages Docker stacks
- Cloudflare Tunnel: routes `tara-stays.com` subdomains to home server

## Docker API build — tsbuildinfo gotcha

The API Dockerfile must delete `*.tsbuildinfo` files before running `nest build`. If these incremental cache files are copied from the local dev tree into the builder stage, TypeScript skips emission (thinks output is up to date) and the dist is never created, causing `Cannot find module '.../dist/main.js'` at container start.

Fixed in `apps/api/Dockerfile`:

```dockerfile
RUN find . -name "*.tsbuildinfo" -delete
RUN pnpm --filter @tara/api build
```

**If the API container fails to start with `Cannot find module dist/main.js`**: the tsbuildinfo fix is the first thing to check. Run `docker run --rm tara-dev-api:latest ls /app/apps/api/dist/` — if the directory is missing, rebuild with `--no-cache`.

## Image uploads (R2) — checklist every time

`UploadsService` throws `503 "Image uploads are not configured"` when `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, or `R2_SECRET_ACCESS_KEY` are missing from the API container's environment. This has bitten us on every image feature. Do all of the following before calling an image upload feature done:

### 1. Verify local dev

```bash
curl -si http://localhost:4000/properties/<id>/upload-url \
  -X POST -H "Content-Type: application/json" -d '{"contentType":"image/jpeg"}'
# Must return 401 (auth required), NOT 503 (service unavailable)
```

A `503` here means `.env` is missing `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`.

### 2. Add the API call to `api-client.ts`

Every new upload surface needs methods in both:

- `api.rooms.getImageUploadUrl` / `api.properties.getImageUploadUrl` — for cover images
- matching `getImageUploadUrl` variant for gallery images

### 3. How staging env vars work

The staging API reads credentials from `/home/ialexies/stacks/tara-staging/.env` on the home server. There are two deploy paths with different behaviour:

| Deploy path                        | Reads env from                            | R2 included?               |
| ---------------------------------- | ----------------------------------------- | -------------------------- |
| Push to `main` → GitHub Actions CI | `/home/ialexies/stacks/tara-staging/.env` | ✅ Always                  |
| Manual redeploy via Portainer UI   | Portainer's stored stack env vars         | ⚠️ Only if added there too |

**After any manual Portainer redeploy, check Portainer → tara-staging stack → Environment Variables and confirm `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` are present.** If they're missing, either add them in the Portainer UI or push to `main` to trigger CI.

### 4. Verify staging after deploy

```bash
# 401 = auth working, R2 configured. 503 = R2 missing.
curl -si https://api-staging.tara-stays.com/properties/<id>/upload-url \
  -X POST -H "Content-Type: application/json" -d '{"contentType":"image/jpeg"}' \
  | head -3
```

### 5. Required env vars (API)

| Var                    | Where it's set                                           |
| ---------------------- | -------------------------------------------------------- |
| `R2_ACCOUNT_ID`        | `/home/ialexies/stacks/tara-staging/.env` + Portainer UI |
| `R2_ACCESS_KEY_ID`     | same                                                     |
| `R2_SECRET_ACCESS_KEY` | same                                                     |
| `R2_BUCKET`            | same (default: `tara-dev` locally, `tara` on staging)    |
| `R2_PUBLIC_URL`        | same — must be `https://`, not `http://` (CORS)          |

`NEXT_PUBLIC_SENTRY_DSN` is a build arg for the web image — it must be in `.env` at project root and passed via `--build-arg` in the Dockerfile / `docker-compose.dev.yml`.

## Scheduler (booking reminders)

`SchedulerService` runs a daily cron at **08:00 PHT** (midnight UTC) via `@nestjs/schedule`. It queries bookings with `checkIn = tomorrow` and sends reminder emails to guests. No env var needed — fires automatically when the API starts.

`SearchAlertsService` also runs a daily cron at 08:00 PHT — it checks for properties created in the last 25 hours and emails matching saved-search subscribers.

To verify the scheduler is registered: check API startup logs for `SchedulerService` initialization. To test a reminder manually in dev, call `schedulerService.sendBookingReminders()` directly (not exposed as an HTTP endpoint by design).

## Promo codes

Owner-created discount codes. Two types: `percent` (1–100%) and `flat` (PHP amount in minor units).

- **Dashboard**: `/dashboard/promo-codes` — create, list, deactivate
- **Book page** (`/properties/[slug]/book`): guest enters code; validated live via `GET /promo-codes/validate?code=&propertyId=&amount=`
- **Apply at checkout**: `POST /bookings` accepts `promoCode` field; validation happens server-side
- **Schema**: `promo_codes` table — `discount_type`, `discount_value`, `max_uses`, `uses_count`, `valid_from`, `valid_to`, `is_active`
- Promo code usage auto-increments on booking creation

## Guest blacklist

Owner can block a guest email from booking any of their properties.

- **Dashboard**: `/dashboard/properties/[id]/blacklist` — add/remove blocked emails
- **Enforcement**: checked at `POST /bookings` creation — returns 403 for blocked emails
- **Schema**: `guest_blacklist(property_id, owner_uid, guest_email, reason)`
- Reason is private to the owner; never shown to guests

## Waitlist

Guests join a queue for a full room + date range. Auto-notified when a booking is cancelled.

- **Join**: `POST /waitlist` (public, no auth required)
- **Notification**: on booking cancellation, `WaitlistService.notifyOnCancellation()` fires and emails matching waitlist entries
- **Owner view**: `GET /waitlist/property/:propertyId` (owner-auth required)
- **Schema**: `waitlist(room_id, property_id, guest_email, guest_name, check_in, check_out, notified_at)`
- Unique constraint: one entry per `(room_id, guest_email, check_in)`

## Webhooks

Owner-registered HTTPS endpoints. Events dispatched fire-and-forget with HMAC-SHA256 signature.

- **Dashboard**: `/dashboard/webhooks` — register URL, select events, reveal signing secret
- **Events**: `booking.created`, `booking.confirmed`, `booking.cancelled`, `booking.checked_in`, `booking.checked_out`
- **Signature header**: `X-Tara-Signature: <sha256_hex>`; verify with `HMAC-SHA256(secret, body)`
- **Schema**: `webhooks(owner_uid, url, secret, events[], is_active)`
- Dispatch is async (fire-and-forget); webhook failures are logged but not retried
- Dispatch currently wired to `booking.created` only; extend `WebhooksService.dispatch()` + call sites for other events

## Staff / co-hosts

Owner invites staff with per-property roles.

- **Roles**: `cohost` (view bookings), `manager` (full access — same as owner for now)
- **Dashboard**: `/dashboard/properties/[id]/staff`
- **Schema**: `property_staff(property_id, owner_uid, staff_email, staff_uid, role)`
- `staffUid` is populated when the invited user logs in (future: link via Firebase lookup on sign-in)

## Referral program

Every authenticated user can get a unique 8-char referral code.

- **Endpoint**: `GET /auth/me/referral` — returns or creates the code
- **Dashboard**: `/dashboard/refer` — shows code + shareable link
- **Schema**: `users.referral_code` (nullable text, unique)
- Code is auto-generated on first request; never changes
- Redemption tracking (crediting the referrer) is not yet implemented — the code is for future promo integration

## Search alerts

Guests save their current search filters; emailed daily when matching new properties go live.

- **Create**: `POST /search-alerts` (public, no auth)
- **Delete**: `DELETE /search-alerts/:id?email=`
- **Cron**: runs daily at 08:00 PHT, checks properties created in the last 25 hours
- **Schema**: `search_alerts(guest_email, city, property_type, max_price_minor, amenities[], last_notified_at)`
- UI: "Save alert" button appears in the listing filter bar when any filter is active

## Bulk pricing

Owner can set the same nightly rate across multiple rooms at once.

- **UI**: "Bulk price" button appears in the Rooms page when a property has ≥2 rooms
- Implemented as a modal overlay; calls `PATCH /properties/:id/rooms/:roomId` for each selected room in parallel
- No new API endpoint — reuses existing room update

## Pricing calendar view

Visual month grid on the Pricing rules page showing which days have active rules.

- **Toggle**: List / Calendar view switcher in the Pricing page header
- Green cells = rate override active; amber = min-nights constraint; grey = no rule
- Hover tooltip shows rule names

## Performance comparison

Two-panel side-by-side view comparing any two property/month combinations.

- **Dashboard**: `/dashboard/compare`
- Uses existing `GET /properties/:id/occupancy?months=` endpoint
- Shows: occupancy %, booked days, revenue

## Multi-property calendar

Unified occupancy view across all owner properties.

- **Dashboard**: `/dashboard/calendar`
- Property toggle chips to show/hide individual properties
- Colour coding: red = full, amber = partial, grey = open

## Invoice / receipt

Printable receipt for confirmed and checked-out bookings.

- **UI**: "Download receipt" button on the guest booking detail page
- Opens a print dialog via `window.print()` — no server-side PDF generation
- Shown only for `confirmed` and `checked_out` status bookings

## Dark mode toggle

Explicit user preference stored in `localStorage`.

- **UI**: Light / System / Dark selector on the Profile page
- Applies immediately by toggling the `dark` class on `<html>`
- Persists across sessions via `localStorage.getItem('tara_theme')`

## ID verification

Two-step flow: guest uploads document, owner marks as verified.

- **Guest upload**: `POST /bookings/:id/id-upload-url` (email-verified, no Firebase auth) → R2 presigned URL → PUT file → `POST /bookings/:id/id-document` to save URL
- **Owner verify**: `POST /bookings/:id/verify-id` (owner-auth) — sets `id_verified = true`
- **Schema**: `bookings.id_verified`, `bookings.id_verified_at`, `bookings.id_document_url`
- **UI**: "Upload ID document" card shown on guest booking page for `confirmed` status bookings
- High-value booking prompts shown when `totalMinor > 500000` (₱5,000) — UI flag only, no automated block
- `UploadsService` accepts `application/pdf` in addition to image types for ID uploads

## Booking flow (two-step)

Booking is split across two pages:

1. **Property page** (`/properties/[slug]`) — date picker + "Check availability" → room list with availability badges → **"Book this room →"** button per room
2. **Book page** (`/properties/[slug]/book?roomId=&checkIn=&checkOut=&roomName=&rate=`) — full-screen confirm page with:
   - Booking summary card (property, room, dates, price breakdown)
   - Guest details form (pre-filled from saved profile)
   - Promo code input
   - Accurate cancellation policy from property data
   - Sticky green confirm button (always visible at bottom on mobile)
   - Inline email-verification banner for unverified users (send + confirm without leaving the page)

The `rate` param is `baseNightlyRateMinor` passed via URL for instant price display before any API call.

## User profile fields

`users` table has extended profile fields (migration `0033_user_profile_fields.sql`):

| Field           | Notes                                        |
| --------------- | -------------------------------------------- |
| `first_name`    | nullable text                                |
| `last_name`     | nullable text                                |
| `phone`         | nullable text (not in Firebase, stored here) |
| `date_of_birth` | nullable date                                |
| `nationality`   | nullable text                                |

- **Self-service update**: `PATCH /auth/me` — auth-gated, partial update (only sent fields are changed)
- **UI**: Profile page at `/bookings/profile` — "Personal information" card + "Account" card
- **Booking pre-fill**: booking form fetches `GET /auth/me` on mount and pre-fills name (first + last joined), email, phone. Falls back to Firebase `displayName`/`phoneNumber` if profile not yet filled.

## Property type badges (listing cards)

Each listing card shows a colored pill overlaid bottom-left on the cover image:

| Type       | Color    |
| ---------- | -------- |
| hostel     | emerald  |
| guesthouse | sky blue |
| hotel      | indigo   |
| resort     | amber    |
| apartment  | violet   |

Color map lives in `PropertyTypeBadge` in [apps/web/app/[locale]/property-listings.tsx](apps/web/app/[locale]/property-listings.tsx).

## Image lightbox (property gallery)

`GalleryLightbox` component ([apps/web/components/gallery-lightbox.tsx](apps/web/components/gallery-lightbox.tsx)) replaces the static hero + thumbnail strip on property pages.

- Tap cover or any thumbnail → full-screen black overlay with the image
- Prev/next arrow buttons + keyboard (← → Escape) + touch swipe
- Photo counter (e.g. "2 / 5")
- "⊞ N photos" badge on the hero image
- Body scroll locked while open

## Interactive map (listings page)

`PropertiesMap` component ([apps/web/components/properties-map.tsx](apps/web/components/properties-map.tsx)) — Leaflet.js map, `dynamic` imported with `ssr: false`.

- Shows all properties as colored **price pill pins** matching their property type color
- Auto-fits bounds to show all pins on load
- Hover a listing card in grid view → that pin enlarges (1.25×) and its popup opens
- Popup shows name, city, "From ₱X/night", and a "View property →" link
- Leaflet CSS imported in `app/[locale]/layout.tsx`; marker images in `apps/web/public/leaflet/`
- `hoveredId` state lives in `PropertyListings`; passed down to both the map and grid cards via `onMouseEnter`/`onMouseLeave`

**CSP**: `frame-src` in `apps/web/middleware.ts` must include `https://www.openstreetmap.org` for the property-page single-property OSM iframe (used on property detail pages, not the listings map).

## Date picker

`DateRangeCalendar` component ([apps/web/components/date-range-calendar.tsx](apps/web/components/date-range-calendar.tsx)):

- Single full-width month (mobile-first). `propertyId` prop is optional — omit for the listing page (no blocked-dates fetch).
- **Check-in / Check-out header** — two tappable panels showing selected dates, active panel highlighted in emerald.
- 48px day cells, 44px nav arrows, touch swipe left/right to navigate months.
- Emerald-filled circles for selected dates; light emerald background for range.
- Used on the property page booking panel (with `propertyId`) and the listings date-bar dropdown (without).

The **listings page** wraps it in a `DateBar` component — a single button showing `"Jun 23 → Jun 25 · 2 nights"` that opens the calendar as a dropdown. Replaces the previous native `<input type="date">`.

## Phone input

`PhoneInput` component ([apps/web/components/phone-input.tsx](apps/web/components/phone-input.tsx)):

- Shows `🇵🇭 +63` as a fixed prefix badge; user types only the 10 local digits.
- Formats digits live as `917 123 4567` (`inputMode="numeric"` triggers numeric keyboard on mobile).
- Stores E.164 format (`+639171234567`) in state.
- Used on the booking form (`/properties/[slug]/book`) and profile page (`/bookings/profile`).
- **Auto-save**: if a logged-in user enters a phone during booking and their profile had none, `PATCH /auth/me` is called after a successful booking to save it.

## Booking cancellation — booking_items must be deleted

When a booking is cancelled (owner via `transitionStatus` or guest via `cancelByGuest`), the associated `booking_items` rows **must be deleted** so those dates become bookable again. The unique constraint on `(unit_id, night)` will permanently block the dates otherwise — the unit-selection query correctly ignores cancelled bookings, but the INSERT into `booking_items` for a new booking will still hit the constraint.

Both cancel paths in `bookings.service.ts` now call:

```typescript
await db.delete(bookingItems).where(eq(bookingItems.bookingId, id));
```

If you find orphaned rows from old cancelled bookings blocking dates, clean them up with:

```sql
DELETE FROM booking_items
WHERE booking_id IN (SELECT id FROM bookings WHERE status IN ('cancelled', 'refunded'));
```

## Rate limiting — dashboard read endpoints skip throttle

Global throttler: **500 req/min** per Firebase UID in production (was 120).

The following owner/auth read endpoints are decorated `@SkipThrottle({ global: true, auth: true, guest_action: true })` because they're auth-gated (no security benefit from throttling) and the dashboard fires them in parallel on every load:

- `GET /properties/mine`, `GET /properties/revenue`
- `GET /properties/:id/blocked-dates`, `GET /properties/:id/availability`
- `GET /properties/:propertyId/bookings`, `GET /bookings/mine`
- All `WishlistController` routes

**`@SkipThrottle()` with no args** silently has no effect on our named throttlers — always pass all three: `{ global: true, auth: true, guest_action: true }`.

## Seed — tenant_id must equal owner UUID

`listByOwner` filters by `properties.tenant_id = user.tenantId` (the user's DB UUID from Firebase custom claims). The seed SQL uses the owner's UUID for **both** `owner_id` and `tenant_id`. If you change the owner user account, update the UUID in the seed.

On staging: `tenant_id = owner_id = 4e737f48-27ca-4fef-adf0-b613b8af7ad0` (`owner@test.tara-stays.com`).

## Server Components + event handlers (recurring gotcha)

Any function (`onClick`, `onXxx`, `window.*`) used inside a Server Component file causes a runtime 500:

> Error: Event handlers cannot be passed to Client Component props.

**Fix**: extract the component to its own file with `'use client'` at the top. Past instances:

- `ReceiptButton` in `bookings/[id]/page.tsx` → moved to `receipt-button.tsx`
- Property gallery `<Image onLoad>` → removed

**Rule**: if a function in a `.tsx` file uses `window`, `document`, `useState`, `useEffect`, or any `onXxx` handler, that file must have `'use client'` or the function must be in a separate client component file.

## Stripe integration notes

- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are stored in Portainer's stack environment for the `tara-staging` stack.
- The `.env` file on disk (`/home/ialexies/stacks/tara-staging/.env`) is what SSH/CI deploys read. These two sources can get out of sync — after any manual Portainer "Update stack", the running containers have the Portainer vars; after an SSH deploy, they have the disk vars.
- To keep in sync: after a Portainer update that adds new vars, also add them to the disk `.env`.
- `StripeService.createCheckoutSession` accepts `guestEmail` and `guestName` — pass them when creating sessions so Stripe Checkout pre-fills the customer's details.

## Admin endpoints — @Roles decorator required

All `GET/POST /auth/admin/*` routes use `@Roles('admin')` + `@UseGuards(FirebaseGuard, RolesGuard)`. Do **not** use `throw new Error('Forbidden')` manually — it produces a 500 instead of 403 because NestJS doesn't recognize plain `Error` as an `HttpException`. Always use the `@Roles` decorator on the handler.

## Booking email — paymentInstructions must be a string

`EmailService.sendBookingReceived` calls `.replace(/\n/g, '<br>')` on `ctx.paymentInstructions`. Pass a pre-formatted string, not the raw `manualPaymentMethods` JSON object. The booking service formats it:

```typescript
Object.entries(manualPaymentMethods)
  .filter(([, v]) => v)
  .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
  .join('\n');
```

## Deploying to staging

CI runner is not in use. All deploys are done directly via SSH:

```bash
ssh ialexies@192.168.0.253 << 'ENDSSH'
cd /home/ialexies/projects/tara
git pull origin main -q

# Sync Portainer stack env vars → .env before every deploy (single source of truth = Portainer)
PORTAINER_API_TOKEN="<your-portainer-api-token>" python3 infra/scripts/sync-portainer-env.sh

read_env() { grep "^$1=" /home/ialexies/stacks/tara-staging/.env | cut -d= -f2-; }

# Build API
docker build -f apps/api/Dockerfile -t tara-api:staging .

# Build web (NEXT_PUBLIC_* must be baked in at build time)
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://api-staging.tara-stays.com \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="$(read_env NEXT_PUBLIC_FIREBASE_API_KEY)" \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$(read_env NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)" \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="$(read_env NEXT_PUBLIC_FIREBASE_PROJECT_ID)" \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$(read_env NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)" \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$(read_env NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID)" \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="$(read_env NEXT_PUBLIC_FIREBASE_APP_ID)" \
  --build-arg R2_PUBLIC_URL="$(read_env R2_PUBLIC_URL)" \
  --build-arg NEXT_PUBLIC_SENTRY_DSN="$(read_env NEXT_PUBLIC_SENTRY_DSN)" \
  -t tara-web:staging .

# Restart
cd /home/ialexies/stacks/tara-staging
docker compose -p tara-staging --env-file .env up -d --no-deps api web
ENDSSH
```

Web Firebase env vars live in `/home/ialexies/stacks/tara-staging/.env` on the home server. The web container also needs `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` at runtime for server actions (session cookie creation) — these are passed via the compose `--env-file`.

**Split-brain warning**: if two Compose projects are both running (e.g. old `stacks-*` stack alongside `tara-staging-*`), both cloudflared connectors register to the same tunnel and Cloudflare splits traffic between them. `docker ps | grep cloudflared` — only `tara-staging-cloudflared-1` should be running.

**Before a Portainer manual redeploy**, verify env vars are in sync:

```bash
ssh ialexies@192.168.0.253 'bash /home/ialexies/projects/tara/infra/scripts/check-staging-env.sh'
```

## DB backup

`infra/scripts/backup-db.sh` dumps the staging DB and prunes files older than 14 days. Run it daily via cron on the home server:

```bash
# On home server: crontab -e
0 2 * * * /home/ialexies/projects/tara/infra/scripts/backup-db.sh >> /home/ialexies/backups/tara/backup.log 2>&1
```

Backups land in `~/backups/tara/`. Before launch: do a restore drill — spin up a fresh postgres container, restore the latest `.sql.gz`, verify the app boots.

## Local dev seed data

Test properties for local development are in `infra/scripts/seed-zambales.sql`. Re-run anytime to reset mock data:

```bash
docker exec -i tara-postgres psql -U tara -d tara_dev < infra/scripts/seed-zambales.sql
```

The script deletes then re-inserts **8 properties** owned by `owner@test.tara-stays.com` (staging: `owner_id = 4e737f48-27ca-4fef-adf0-b613b8af7ad0`):

| Property                     | City        | Type       | Units | From         |
| ---------------------------- | ----------- | ---------- | ----- | ------------ |
| Anawangin Cove Backpackers   | San Antonio | Hostel     | 20    | ₱450/night   |
| Nagsasa Cove Eco Camp        | San Antonio | Hostel     | 22    | ₱400/night   |
| Pundaquit Beach Resort       | San Antonio | Resort     | 23    | ₱2,200/night |
| San Antonio Beach Apartments | San Antonio | Apartment  | 14    | ₱1,800/night |
| Olongapo City Hostel         | Olongapo    | Hostel     | 24    | ₱550/night   |
| Subic Bay Dive & Stay        | Olongapo    | Hotel      | 19    | ₱750/night   |
| Liwliwa Surf House           | San Felipe  | Guesthouse | 21    | ₱550/night   |
| Zambales Backpacker Inn      | San Felipe  | Hostel     | 20    | ₱350/night   |

All are `is_mock = true`. The delete step cascades through bookings → messages before removing properties. On staging, owner_id differs from local dev — the script uses a hardcoded UUID that must match `owner@test.tara-stays.com`'s actual `users.id` in the target DB.

## Owner check-in message

Owner sets a custom message sent to guests on booking confirmation.

- **Schema**: `properties.check_in_message` (text, nullable) — migration `0034_property_check_in_message.sql`
- **API**: included in `UpdatePropertySchema` (`checkInMessage`, max 1000 chars); `PATCH /properties/:id` accepts and persists it
- **Email**: `bookingConfirmedHtml` renders a green "Message from the property" block when present
- **Guest booking page**: shown inside the "Booking confirmed" banner when status is `confirmed`
- **Dashboard edit form**: "Check-in message" textarea below House rules

## Revenue chart

Monthly bar chart on the owner dashboard.

- **Endpoint**: `GET /properties/revenue/monthly` — returns last 6 months of revenue grouped by `date_trunc('month', check_in)` across all owner properties
- **Component**: `apps/web/components/revenue-chart.tsx` — pure SVG/CSS bar chart, no external library
- Rendered below the per-property revenue cards on the dashboard home page

## Reviews — owner dashboard

Owner can see and reply to all guest reviews across their properties.

- **Page**: `/dashboard/reviews` — lists reviews with star rating, guest name, property, date
- **Reply**: inline textarea per review; calls `POST /reviews/:id/reply` (already existed in backend)
- **Endpoint**: `GET /reviews/mine` (new) — owner-auth, joins reviews with properties on tenantId

## Waitlist — owner per-room counts

Owner sees how many guests are waiting per room.

- **Page**: `/dashboard/properties/[id]/waitlist` — table of rooms with waiting count badge
- **Endpoint**: `GET /waitlist/property/:id/counts` (new) — groups by roomId, joins room name, excludes already-notified entries
- Nav link added to the rooms page header

## Loading skeletons

Animated loading states replace blank flashes on slow page loads.

- **Component**: `apps/web/components/skeleton.tsx` exports `Skeleton`, `PropertyCardSkeleton`, `BookingCardSkeleton`, `TableRowSkeleton`
- `loading.tsx` files: `/app/[locale]/loading.tsx`, `/bookings/loading.tsx`, `/dashboard/loading.tsx` — Next.js route-level Suspense boundaries
- `PropertyCardSkeleton` also used inline in `PropertyListings` while the listings fetch is in-flight

## PWA service worker — CSP fix

`worker-src 'self'` must be explicit in the CSP. Without it, `strict-dynamic` in `script-src` propagates to `worker-src` and blocks SW registration — the offline page never gets cached and `/sw.js` silently fails. Added to `apps/web/middleware.ts` `buildCsp`.
