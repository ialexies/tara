# Admin Dashboards & CMS

How Tara organizes its non-public surfaces: the owner dashboard, the founder/superadmin dashboard, and content management.

> Touches: [ADR-0002](../adr/0002-modular-monolith-and-multi-tenancy.md) (multi-tenancy + RBAC enforcement), [`diagrams.md`](diagrams.md) section 9 (owner dashboard sitemap), [`trust-and-safety.md`](../business/trust-and-safety.md) (founder dispute UI lives here), [`owner-onboarding.md`](../business/owner-onboarding.md).

This doc answers: **what UI surfaces does Tara need beyond the guest-facing site, where do they live in the codebase, who can see what, and when do we build each?**

---

## The 3 surfaces

| Surface                  | Audience                  | Visibility                  | Mobile-first?            | Phase to ship               |
| ------------------------ | ------------------------- | --------------------------- | ------------------------ | --------------------------- |
| **Owner dashboard**      | Property owners           | Their tenant only           | ✅ Yes                   | Phase A (basic), B (full)   |
| **Superadmin dashboard** | Founder + ops team        | All tenants (bypass filter) | ❌ Desktop-first         | Phase A (basic), B-C (full) |
| **Marketing CMS**        | Founder + content writers | N/A — content edits         | ✅ (edits from phone OK) | Phase A (markdown), C+ (UI) |

These look related but have different audiences, different data access patterns, different urgency. Treat them as separate things that happen to share infrastructure.

---

## Architectural decision: one app or many?

Three options. Picked option B.

### Option A — Single Next.js app, route groups (Tara starts here)

```
apps/web/
  app/
    [locale]/
      (public)/          ← guest-facing site
        page.tsx
        properties/...
      admin/             ← owner dashboard
        layout.tsx
        page.tsx
        properties/...
        bookings/...
      superadmin/        ← founder dashboard
        layout.tsx
        page.tsx
        owners/...
        disputes/...
```

- **Pros:** simplest deploy, shared types/components, single auth, one repo to develop. Easy iteration in Phase A-B.
- **Cons:** all bundles ship the same code (mitigated by Next.js route-group code splitting). Less clean separation between very-different audiences.

### Option B — Same monorepo, separate Next.js apps for admin (RECOMMENDED FOR PHASE C+)

```
apps/
  web/        ← public guest site only
  admin/      ← owner dashboard (mobile-first, owner-focused UX)
  superadmin/ ← founder + ops dashboard (desktop-first, dense data)
```

- **Pros:** different UX patterns per audience without conditional everywhere; smaller bundle per app; can deploy/scale independently; cleaner permissions (per-app auth scopes).
- **Cons:** more deployments to manage; some duplication of code (mitigated by `packages/ui`).
- **Recommended when:** owner dashboard becomes complex enough that mixing it with guest-facing routes hurts UX or bundle size.

### Option C — Separate Vue/React/Whatever apps

- Different framework per audience. Rejected: no benefit; tons of duplication.

### The plan

**Phase A-B:** Option A. Get something shipping. Use route groups + RBAC checks at layout level.

**Phase C (when owner dashboard becomes complex):** Migrate to Option B. By that time, you'll know exactly what shape each app needs. Migration is mostly file moves + per-app `package.json`.

This is a "premature optimization is the root of all evil" play. Don't split early; do split when the seams become obvious.

---

## Owner dashboard — what's on it

Already mapped in [`diagrams.md` section 9](diagrams.md). Quick summary + additions:

```
/admin (logged in as owner)
│
├── 🏠 Dashboard (default landing)
│       Today's arrivals · departures · occupancy
│       Recent bookings (5) · Pending action items
│       Quick monthly stats
│
├── 📅 Calendar
│       Multi-room timeline
│       Drag-and-drop · block dates
│
├── 📋 Bookings
│       List · detail · modify · cancel · refund · message guest
│       Print guest registration form (PH compliance)
│
├── 🛏️ Properties & Inventory
│       Profile · rooms · beds · bulk import
│
├── 💵 Pricing & Rates
│       Base rates · rate plans · seasonal · calendar view
│       AI suggestions
│
├── 🎯 Tours / Add-ons    (Phase 2)
│
├── 💸 Payouts
│       Earnings · payout schedule · history · bank/GCash/Maya
│
├── ⭐ Reviews
│       List · public reply · stats
│
├── 🔔 Inbox    (Phase 2 native chat)
│
├── 📊 Insights    (NEW — Phase C+)
│       Conversion rate, search appearance, recommendations
│
└── ⚙️ Settings
        Profile · notifications · team members · account
```

### Owner dashboard UX principles

1. **Mobile-first.** Real owners use phones; design first for narrow viewport.
2. **Low-density UI.** Owners are not data analysts. Spacing, large tap targets, plain language.
3. **Action-oriented.** Top of dashboard = "do this now" items (verify booking, respond to guest, etc.). Information lower.
4. **Empty states do work.** Each section has a helpful empty state, not a blank screen.
5. **Tagalog/English toggle** prominent (per ADR-0007).
6. **No jargon.** "Cancellation policy" yes; "refund flow state machine" never.
7. **Visible progress.** Onboarding completion bar. Daily/weekly streak counters.
8. **In-app help everywhere.** "?" tooltips link to docs.

### Owner dashboard navigation pattern (mobile)

Bottom tab bar (most common mobile pattern):

```
🏠 Home   📅 Calendar   📋 Bookings   ⋯ More
```

Settings, payouts, properties, reviews, tours, etc. live under "More."

Desktop: left sidebar with all sections visible.

---

## Superadmin dashboard — what's on it (NEW)

This is what's missing. The founder needs visibility into the entire platform.

```
/superadmin (logged in as admin/ops)
│
├── 📊 Overview
│       Platform-wide KPIs:
│       • Bookings today / week / month
│       • Gross Booking Value (GBV) trend
│       • Net commission revenue
│       • Active properties / pending verification
│       • Active owners / churned this week
│       • Activation funnel (L1 → L7 conversion)
│       • Notifications health (delivery rate)
│       • System health (API uptime, DB lag)
│
├── 👥 Owners
│       List all owners (filter, search, sort)
│       Owner detail page:
│       • Profile, contact, joined date
│       • Properties owned
│       • Booking history
│       • Earnings + payouts
│       • Verification status + override
│       • Suspension actions
│       • Notes (founder customer-discovery notes inline)
│       • Audit log of actions on this owner
│       • "Impersonate owner" button (with audit logged)
│
├── 🏠 Properties
│       List all properties (filter by region, status, verification level)
│       Property detail:
│       • Listing preview as guest sees it
│       • All photos with quality scores
│       • Reviews (with founder override capability)
│       • Booking history
│       • Verification badge management (manually grant/revoke)
│       • Flag/unflag listing
│       • Suspend property
│       • Notes
│
├── ✅ Verification queue
│       Properties awaiting Tara verification
│       Each item: photos, owner submission, AI-flagged issues
│       Actions: approve, request changes, reject
│
├── 📋 Bookings
│       Cross-tenant booking view
│       Filter: state, region, date range, payment mode, owner
│       Booking detail with full event log
│       Manual actions: force cancel, refund, override status
│
├── ⚖️ Disputes
│       Active dispute queue (SLA timers visible)
│       Per dispute: both sides' evidence, timeline, recommended action
│       Resolve interface: pick outcome + notes (audit logged)
│       Closed dispute archive
│
├── 💳 Finance
│       Stripe platform balance + payouts due
│       Per-owner earnings + payout schedule
│       Refund queue (manual approvals if needed)
│       Commission reports (this month / YTD)
│       BIR-ready revenue reports (Phase C+)
│
├── ⭐ Reviews & content moderation
│       Flagged reviews queue
│       Flagged photos queue (AI flags + guest reports)
│       Actions: approve / remove / hide / reply on behalf
│
├── 🎯 Promotions    (Phase C+)
│       Create / pause / expire platform promo codes
│       Performance per campaign (per `09-discounts-and-promotions.md`)
│       Referral overview (top referrers, attribution)
│
├── 📈 Analytics deep-dive
│       Cohort retention (booking #2, #3, #4 per signup cohort)
│       Search performance (top queries, zero-result rate)
│       Channel attribution (UTM breakdown)
│       Funnel diagnostics (where do guests drop off in checkout)
│       Owner activation funnel detail
│
├── 🔧 Operations
│       Feature flags (toggle features live)
│       Kill switches (disable new owner signups, etc.)
│       System health dashboard (links to Grafana)
│       Job queue health (BullMQ status)
│       Notification audit log
│       Backup health
│
├── 📝 Audit log
│       Every action by every admin user
│       Filter / search / export
│       Required for compliance + dispute history
│
├── 👤 Admin team    (Phase D when hiring)
│       List of admin/ops users
│       Role assignment
│       Activity log per admin
│
└── ⚙️ Platform settings
        Brand assets
        Email templates
        T&C / Privacy versions
        Currency / tax defaults per region
```

### Superadmin UX principles

1. **Information density welcome.** This is a power-user tool. Tables with sortable columns are fine.
2. **Keyboard shortcuts.** `g + o` go to owners, `g + p` go to properties, `/` search.
3. **Command palette (Phase D).** Cmd+K to jump anywhere. Cmd+K → search "Maria" → owners filtered.
4. **Bulk actions.** Select multiple owners → suspend / message / export.
5. **Confirmation for destructive ops.** Always. Never one-click delete.
6. **Audit everything.** Every action writes a row in audit log. Visible to user.
7. **Export anything.** CSV download on every list view.
8. **Dark mode.** Founder works late at night sometimes.

---

## RBAC model

Roles (extend per ADR-0002):

```
Roles:
  guest         — books stays, leaves reviews
  owner         — manages own properties (tenant_id scope)
  ops           — Phase D+ ops team member (limited admin)
  admin         — founder, Tara-level access
  superadmin    — same as admin + can manage other admins (Phase D+)

Permissions (RBAC):
  guest.*       — book, review, edit own profile
  owner.read    — read tenant data (properties, bookings, etc.)
  owner.write   — modify tenant data
  ops.read      — read all tenants (no PII fields like passport)
  ops.action    — actions: verify property, mediate dispute, issue refund (rate-limited)
  admin.*       — full read/write across tenants
  superadmin.*  — admin + manage roles
```

### Access by surface

| Surface                              | Required role                      |
| ------------------------------------ | ---------------------------------- |
| `/admin/*`                           | `owner` (own tenant only)          |
| `/superadmin/*`                      | `ops` or `admin` (full visibility) |
| `/superadmin/admin-team/*`           | `superadmin`                       |
| `/api/superadmin/*` (API equivalent) | matched role required at endpoint  |

### Multi-tenancy enforcement (recap from ADR-0002)

- `owner` requests: `AsyncLocalStorage` carries `tenant_id`; `withTenant()` filter applied automatically
- `admin`/`ops`/`superadmin` requests: explicit `withoutTenant()` opt-in for cross-tenant queries (logged + tested)
- **Impersonation:** admin can impersonate an owner for support. Original admin user_id logged on every action; UI shows "Impersonating Maria as Founder" banner.

---

## Where these surfaces live in the codebase (Phase A-B)

Single Next.js app, route groups:

```
apps/web/
├── app/
│   └── [locale]/
│       ├── (public)/              ← guest-facing
│       │   ├── page.tsx            ← home
│       │   ├── properties/...
│       │   └── checkout/...
│       │
│       ├── (auth)/                 ← auth flows
│       │   ├── login/page.tsx
│       │   └── signup/page.tsx
│       │
│       ├── admin/                  ← owner dashboard
│       │   ├── layout.tsx          ← auth guard: requires 'owner' role
│       │   ├── page.tsx            ← dashboard home
│       │   ├── calendar/page.tsx
│       │   ├── bookings/...
│       │   ├── properties/...
│       │   ├── pricing/...
│       │   ├── payouts/page.tsx
│       │   ├── reviews/page.tsx
│       │   └── settings/...
│       │
│       └── superadmin/             ← founder dashboard
│           ├── layout.tsx          ← auth guard: requires 'admin' role
│           ├── page.tsx
│           ├── owners/...
│           ├── properties/...
│           ├── verification-queue/page.tsx
│           ├── disputes/...
│           ├── finance/...
│           ├── moderation/...
│           ├── promotions/...
│           ├── analytics/...
│           ├── operations/...
│           └── audit-log/page.tsx
│
├── components/
│   ├── public/                     ← guest-only components
│   ├── admin/                      ← owner-only components
│   ├── superadmin/                 ← founder-only components
│   └── shared/                     ← layout, auth UI, design tokens
```

### Route group guards (`layout.tsx` pattern)

Each `admin/layout.tsx` and `superadmin/layout.tsx`:

```ts
// apps/web/app/[locale]/admin/layout.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { AdminNav } from '@/components/admin/AdminNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!session.user.roles.includes('owner')) redirect('/');

  return (
    <div className="flex h-dvh">
      <AdminNav user={session.user} />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
```

Server-side guard. Never trust client-side role checks for security.

---

## When to split into separate apps (Phase C+)

Signals to migrate from Option A (route groups) to Option B (separate apps):

- Owner dashboard JS bundle bloating guest-site page-load (Lighthouse drops)
- Superadmin UI growing complex enough that its components leak into the guest bundle
- Hiring an ops person and wanting to deploy admin changes without redeploying public site
- Different release cadences emerge

Migration playbook:

1. `pnpm create next-app apps/admin --typescript --tailwind --app`
2. Move all `app/[locale]/admin/**` to `apps/admin/app/[locale]/**`
3. Move `components/admin/**` to `apps/admin/components/**`
4. Share `packages/ui` for design tokens + primitives
5. Configure Cloudflare Tunnel to route `admin.tara-stays.com` → `apps/admin`
6. Update auth: same auth provider (Auth.js), same DB, different cookie scope
7. Same for `apps/superadmin` → `admin.tara-stays.com/founder` or `founder.tara-stays.com`

Estimated effort: 1-2 days at Phase C when seams are clear.

---

## CMS — three things, three answers

### 1. Property content CMS

**This IS the owner dashboard.** No separate CMS needed. Owners edit description, photos, pricing right there. AI assists per `ai-features.md`.

### 2. Marketing content CMS (blog, destination guides, "About Tara", FAQ)

**Phase A-B-C: markdown files in the repo, rendered by Next.js.**

```
apps/web/content/
├── blog/
│   ├── 2026-05-launching-in-zambales.md
│   └── ...
├── destinations/
│   ├── zambales/
│   │   ├── index.md
│   │   ├── san-antonio.md
│   │   └── pundaquit.md
├── guides/
│   ├── best-time-to-surf-zambales.md
│   └── ...
├── about.md
├── trust-promise.md
└── faq/
    ├── guests.md
    └── owners.md
```

Edit via VS Code, commit to git, deploys automatically. Pre-commit hooks ensure formatting.

**Why not a heavy CMS yet?**

- Only the founder writes content (Phase A-B-C). No need for a non-technical UI.
- Markdown is git-versioned, reviewable, rollback-friendly.
- Zero external dependencies, zero cost.
- Pairs with the content strategy memory.

**Phase D consideration:** when hiring a content writer or community manager who can't edit markdown:

- **Payload CMS** (self-host, free, headless, TypeScript-native) — best fit; collections become React components in Next.js
- **Decap CMS** (formerly Netlify CMS, free, git-based) — keeps markdown source of truth + adds a web editor
- **Sanity** (cloud, free tier for small) — popular but adds dependency

Defer the decision. Most likely: **Decap** when needed (preserves markdown-in-git workflow + adds UI).

### 3. Platform CMS — system content (T&C versions, email templates, system messages)

**Phase A-B:** Markdown files in repo + React Email components for emails.

**Phase C+:** Per-content-type approach:

- **T&C / Privacy / Cookies:** generated by Termly (per #25), embedded as iframe or copied as markdown
- **Email templates:** React Email components in `packages/email/`, committed to git
- **System messages** (banners, FAQ, in-app help): markdown files OR small DB table editable in superadmin → `platform_content` table

```sql
-- Phase C+ if needed
platform_content (
  id, key, locale, body_markdown, version, published, updated_by, updated_at
)
```

Founder edits in superadmin → preview → publish. Versioned for rollback.

Phase D+: rich editor (Tiptap or similar) inline.

---

## Component sharing strategy

All three surfaces share design language but differ in density + audience.

```
packages/ui/
├── primitives/          ← buttons, inputs, modals (shadcn/ui base)
├── tokens/              ← colors, spacing, type
├── nav/                 ← bottom nav (owner mobile), side nav (superadmin desktop)
├── data-table/          ← rich table (superadmin) — defer to lower-priority
├── empty-states/        ← reusable empty states
├── feature-flag/        ← FeatureFlag component
└── auth/                ← shared auth components (login, signup forms)
```

Owner-dashboard-specific UI lives in `apps/web/components/admin/`. Superadmin-specific in `apps/web/components/superadmin/`.

When apps split (Phase C+), `packages/ui` provides the shared base + each app brings its own composition.

---

## Phase rollout

| Phase                | Owner dashboard                                                     | Superadmin dashboard                                             | Marketing CMS                               |
| -------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| **A (Months 0-6)**   | Login + view own bookings + edit property basics                    | Login + view all owners + manual property approve                | Markdown files in repo                      |
| **B (Months 6-12)**  | Full sitemap shipped (calendar, bookings, payouts, etc.)            | Verification queue + dispute resolution + finance overview       | Markdown — founder writes blog              |
| **C (Months 12-24)** | Polish, mobile UX optimization, AI assists everywhere, insights tab | Analytics deep-dive, promotion management, audit log searchable  | Consider Decap if content writer hired      |
| **D+ (Year 2-3)**    | Multi-property switcher, team members, advanced reports             | Command palette, admin team management, ops playbooks integrated | Platform CMS for system content (if needed) |

---

## What we deliberately don't do (yet)

| Surface                                                              | Why not (yet)                                  |
| -------------------------------------------------------------------- | ---------------------------------------------- |
| Mobile-native owner app (iOS/Android)                                | Web is enough; revisit Year 2                  |
| Real-time dashboards with WebSockets                                 | Polling every 30s is fine for Phase A-C        |
| Custom permissioned owner team accounts                              | Phase D when owners have managers              |
| Embedded analytics SDK (PostHog widget inside owner dashboard)       | Owners aren't analysts; serve curated insights |
| Public API for owners (programmatic access)                          | Phase D — power users only                     |
| White-label per chain (Mad Monkey wants their own branded dashboard) | Phase D enterprise sales                       |
| Voice / AI chat in dashboards                                        | Phase E if at all                              |

---

## Concrete next steps when we actually build this

In order of implementation:

1. **Auth + role system** (Phase A) — Auth.js with roles array on user, server-side guards in layouts
2. **Owner dashboard MVP** (Phase A) — login, see own properties, see own bookings (read-only OK initially)
3. **Superadmin MVP** (Phase A) — login as admin, see list of owners, manually approve properties
4. **Owner dashboard full sitemap** (Phase B) — all sections from diagram 9
5. **Superadmin full** (Phase B-C) — verification queue, disputes, finance
6. **Polish + mobile** (Phase C)
7. **Split apps if needed** (late Phase C)

---

## When this doc changes

- New surface introduced (e.g., tour-operator dashboard) → add section + permissions
- Split apps decision triggered → update with migration learnings
- New role added → update RBAC matrix
- Marketing CMS swap → update CMS section
