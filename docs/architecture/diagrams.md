# System Diagrams

Mermaid diagrams of Tara's architecture. Renders natively in GitHub and in VS Code (install the **Markdown Preview Mermaid Support** extension).

If you ever need to share these with someone who can't render Mermaid, paste the code into <https://mermaid.live/> for a PNG/SVG export.

---

## 1. High-level system architecture

```mermaid
flowchart TB
  subgraph Users["👥 Users"]
    G["Guests<br/>(browser/mobile)"]
    O["Property Owners<br/>(/admin dashboard)"]
    T["Tour Operators<br/>(/admin dashboard)"]
  end

  subgraph Edge["🌐 Cloudflare Edge"]
    CF["DNS · WAF · CDN · Tunnel<br/>R2 storage · Turnstile"]
  end

  subgraph Frontend["💻 Frontend (apps/web — Next.js 15)"]
    Site["Public site"]
    Book["Booking flow"]
    Admin["/admin dashboard"]
  end

  subgraph Backend["⚙️ Backend (apps/api — NestJS)"]
    Inv["Inventory"]
    Pri["Pricing"]
    Bkg["Booking"]
    Tour["Tours"]
    Auth["Auth/RBAC"]
    Pay["Payment"]
    Ch["Channel"]
    Em["Email"]
  end

  subgraph Data["🗄️ Data Layer"]
    PG[("PostgreSQL 16<br/>Drizzle ORM")]
    RD[("Redis 7<br/>holds · queue · cache")]
  end

  subgraph Jobs["🔁 Background Jobs (apps/jobs)"]
    BMQ["BullMQ Workers<br/>email · notifs · sync · sweep"]
  end

  subgraph External["☁️ External Services"]
    Stripe["Stripe<br/>(payments + Connect)"]
    Resend["Resend<br/>(email)"]
    PostHog["PostHog<br/>(analytics)"]
    Sentry["Sentry<br/>(errors)"]
  end

  G --> CF
  O --> CF
  T --> CF
  CF --> Frontend
  Frontend -->|tRPC / REST| Backend
  Backend --> PG
  Backend --> RD
  RD --> Jobs
  Jobs --> PG
  Backend --> Stripe
  Backend --> Resend
  Backend --> PostHog
  Backend --> Sentry
  Backend -.images.-> CF
```

---

## 2. Multi-tenancy / core entity model

```mermaid
erDiagram
  USER ||--o{ ROLE_ASSIGNMENT : has
  USER {
    uuid id PK
    string email UK
    string password_hash
    timestamp created_at
  }
  ROLE_ASSIGNMENT {
    uuid user_id FK
    enum role "guest|owner|admin|ops"
  }
  USER ||--o| GUEST_PROFILE : "if guest"
  USER ||--o| OWNER : "if owner"

  OWNER ||--o{ PROPERTY : owns
  OWNER {
    uuid id PK
    uuid user_id FK
    string display_name
    string tenant_id "isolation key"
  }

  PROPERTY ||--o{ ROOM : has
  PROPERTY {
    uuid id PK
    uuid owner_id FK
    string tenant_id "tenant filter"
    string name
    string region
    point location
    bool is_mock "soft kill switch"
  }

  ROOM ||--o{ BED : "for dorms"
  ROOM ||--o{ UNIT : "for private"
  ROOM {
    uuid id PK
    uuid property_id FK
    enum type "dorm|private"
    int capacity
  }

  BED {
    uuid id PK
    uuid room_id FK
    string label
  }

  UNIT {
    uuid id PK
    uuid room_id FK
    string label
  }

  BED ||--o{ BOOKING_ITEM : "may book"
  UNIT ||--o{ BOOKING_ITEM : "may book"

  BOOKING ||--|{ BOOKING_ITEM : contains
  BOOKING {
    uuid id PK
    uuid guest_id FK
    enum status "hold|confirmed|cancelled|refunded|failed|expired"
    date check_in
    date check_out
    money total
    string currency
  }

  BOOKING_ITEM {
    uuid id PK
    uuid booking_id FK
    uuid bed_or_unit_id FK
    date night
  }

  BOOKING ||--o{ PAYMENT : has
  PAYMENT {
    uuid id PK
    uuid booking_id FK
    enum status
    string stripe_intent_id
    money amount
  }

  GUEST_PROFILE ||--o{ BOOKING : makes
  GUEST_PROFILE {
    uuid id PK
    uuid user_id FK
    string name
    string country
  }
```

> **Multi-tenancy rule:** every query touching `PROPERTY` and its descendants MUST filter by `tenant_id`. Enforced at the ORM layer via a `withTenant()` wrapper. See ADR-0002.

---

## 3. Booking lifecycle (state machine)

```mermaid
stateDiagram-v2
  [*] --> Search
  Search --> Quote: pick dates + property
  Quote --> Hold: click "Book"<br/>(15-min Redis + DB lock)
  Hold --> Confirmed: payment succeeds
  Hold --> Failed: payment fails
  Hold --> Expired: 15 min, no payment<br/>(BullMQ sweeper)
  Confirmed --> Cancelled: guest or owner cancels
  Cancelled --> Refunded: refund issued
  Confirmed --> CheckedIn: arrival day
  CheckedIn --> CheckedOut: departure day
  CheckedOut --> [*]
  Refunded --> [*]
  Failed --> [*]
  Expired --> [*]
```

> Every state transition is logged to an append-only `booking_events` table for audit, debugging, and replays.

---

## 4. Deploy pipeline (Windows dev → Ubuntu staging)

```mermaid
flowchart TB
  Dev["💻 You on Windows<br/>(WSL2 Ubuntu)"]
  GH["📦 GitHub repo"]
  Runner["🤖 GitHub Actions<br/>(self-hosted runner<br/>ON home server)"]
  Reg["📚 Local Docker registry"]
  Port["🎛️ Portainer API"]
  Stage["🌐 staging.tara-stays.com<br/>(Cloudflare Tunnel)"]
  Smoke["🧪 Smoke tests"]
  Disc["💬 Discord notify"]

  Dev -->|"git push"| GH
  GH -->|"trigger workflow"| Runner
  Runner -->|"PR: lint, test, build only"| GH
  Runner -->|"on merge to main:<br/>build + push images"| Reg
  Reg -->|"pull image"| Port
  Port -->|"rolling restart<br/>health checks"| Stage
  Stage --> Smoke
  Smoke --> Disc
```

---

## 5. Home server services topology

```mermaid
flowchart TB
  subgraph CFEdge["🌐 Cloudflare Tunnel"]
    T1["staging.tara-stays.com"]
    T2["api.staging.tara-stays.com"]
    T3["status.tara-stays.com"]
  end

  subgraph App["⚙️ Application Tier"]
    Web["apps/web :3000<br/>Next.js"]
    API["apps/api :4000<br/>NestJS"]
    Jobs["apps/jobs :4001<br/>BullMQ"]
  end

  subgraph Data["🗄️ Data Tier"]
    PG[("Postgres 16 :5432")]
    RD[("Redis 7 :6379")]
    MS[("Meilisearch :7700<br/>(Phase 2)")]
  end

  subgraph AI["🤖 Automation + AI"]
    N8N["n8n :5678"]
    FW["Flowise :3002"]
    OL["Ollama :11434"]
  end

  subgraph Obs["📊 Observability"]
    UK["Uptime Kuma :3001"]
    GR["Grafana :3030"]
    PR["Prometheus :9090"]
    LO["Loki :3100"]
    PH["PostHog :8000"]
    MB["Metabase :3033"]
  end

  subgraph Sec["🛡️ Security"]
    WZ["Wazuh<br/>manager + indexer + dashboard"]
  end

  subgraph DevOps["🔧 Dev / Ops"]
    PT["Portainer :9443"]
    MP["Mailpit :8025"]
    AD["Adminer :8081"]
    WT["Watchtower (daemon)"]
    GAR["GH Actions Runner (daemon)"]
    BR["pgBackRest (cron) → Backblaze B2"]
  end

  T1 --> Web
  T2 --> API
  T3 --> UK

  Web --> API
  API --> PG
  API --> RD
  RD --> Jobs
  Jobs --> PG
  Jobs --> N8N
  API -.optional.-> FW
  FW -.local LLM.-> OL

  API --> PH
  Jobs --> PH
  MB --> PG

  WZ -.monitors.-> App
  WZ -.monitors.-> Data
  GR --> PR
  GR --> LO
  PR -.scrapes.-> App
```

---

## 6. Request flow — a guest booking

```mermaid
sequenceDiagram
  actor Guest
  participant CF as Cloudflare
  participant Web as Next.js (web)
  participant API as NestJS (api)
  participant PG as Postgres
  participant RD as Redis
  participant Stripe
  participant Jobs as BullMQ Worker
  participant Resend

  Guest->>CF: GET /properties?location=zambales
  CF->>Web: forward (cached when possible)
  Web->>API: tRPC: searchProperties
  API->>PG: SELECT with availability filter
  PG-->>API: properties + prices
  API-->>Web: results
  Web-->>Guest: results page

  Guest->>Web: click "Book bed X for nights Y-Z"
  Web->>API: tRPC: createHold
  API->>RD: SET hold:bedX:nightY (NX, EX=900)
  API->>PG: BEGIN; SELECT ... FOR UPDATE bed X; INSERT booking (status=hold); COMMIT
  API-->>Web: hold_id, payment_intent_secret
  Web-->>Guest: payment form

  Guest->>Stripe: submit card details (via Stripe Elements)
  Stripe-->>Guest: 3DS challenge if needed
  Stripe->>API: webhook payment.succeeded
  API->>PG: UPDATE booking SET status=confirmed
  API->>RD: DEL hold:bedX:nightY
  API->>Jobs: enqueue sendConfirmationEmail
  Jobs->>Resend: send booking email
  Resend-->>Guest: 📧 confirmation

  Note over RD,Jobs: If 15 min pass and no payment,<br/>sweeper job releases hold and<br/>marks booking as expired.
```

---

## 7. Tenancy enforcement at the data layer

```mermaid
flowchart LR
  Req["Request hits API<br/>(JWT contains tenant_id)"] --> MW["Tenant middleware"]
  MW --> CTX["AsyncLocalStorage<br/>{ tenant_id }"]
  CTX --> Repo["Repository.query()"]
  Repo --> Wrap["withTenant(tenant_id)"]
  Wrap --> DZ["Drizzle query builder"]
  DZ --> SQL["SELECT ... WHERE tenant_id = $1"]
  SQL --> PG[("Postgres")]

  style Wrap fill:#fee,stroke:#f00
  style SQL fill:#fee,stroke:#f00
```

> The red boxes are the only place tenant isolation is enforced. Bypassing them is a P0 bug — covered by tests in `packages/auth/__tests__/tenancy.test.ts`.

---

## 8. Property owner — onboarding journey

```mermaid
flowchart TB
  D["🗣️ Discovery<br/>in-person · word-of-mouth · SEO · referral"] --> S
  S["📝 Signup<br/>email/password or OAuth<br/>+ phone SMS verification"] --> P
  P["🏠 Property Profile<br/>name · type · address · GPS<br/>description (AI-assisted) · photos · amenities"] --> R
  R["🛏️ Rooms & Beds<br/>room type · capacity · bed labels<br/>bathroom config · bulk-add for dorms"] --> Pr
  Pr["💵 Pricing<br/>base rate · currency · cancellation policy<br/>(advanced rules deferred)"] --> A
  A["📅 Availability<br/>default open · block dates as needed"] --> Po
  Po["💸 Payouts<br/>Stripe Connect onboarding<br/>govt ID · bank/GCash/Maya · TIN if applicable"] --> V
  V{"✅ Review & Publish<br/>Phase A-B: manual<br/>Phase C+: auto-verify"}
  V -->|Approved| L["🎉 LIVE<br/>property visible · dashboard active"]
  V -->|Needs changes| P

  classDef phase fill:#f0f9ff,stroke:#0369a1
  classDef live fill:#dcfce7,stroke:#16a34a
  class D,S,P,R,Pr,A,Po phase
  class L live
```

**Two execution paths in practice:**

- **High-touch (Phase B):** Founder sits with the owner in person, drives the flow themselves. 1-2 hours total. Conversion 30-50%.
- **Self-service (Phase C+):** Owner does it alone on phone. Drop-off at every step. Target: 25% completion start-to-finish.

The entire flow must work on mobile — most PH hostel owners do not have a desktop.

---

## 9. Owner dashboard — information architecture

```mermaid
flowchart LR
  Root["/admin (owner logged in)"]

  Root --> Dash["🏠 Dashboard<br/>arrivals · departures · occupancy<br/>recent bookings · action items"]
  Root --> Cal["📅 Calendar<br/>multi-room timeline<br/>drag-drop · block dates"]
  Root --> Bk["📋 Bookings<br/>list · detail · modify · cancel<br/>refund · message guest"]
  Root --> Prop["🛏️ Properties & Inventory<br/>profile · rooms · beds<br/>bulk import"]
  Root --> Pri["💵 Pricing & Rates<br/>base · rate plans · seasonal<br/>calendar view"]
  Root --> Tours["🎯 Tours / Add-ons<br/>(Phase 2)"]
  Root --> Pay["💸 Payouts<br/>earnings · schedule · history<br/>bank/GCash/Maya"]
  Root --> Rev["⭐ Reviews<br/>list · reply · stats"]
  Root --> Inb["🔔 Inbox<br/>(Phase 2)"]
  Root --> Set["⚙️ Settings<br/>profile · notifications · team<br/>account · export"]

  classDef phase2 fill:#f3f4f6,stroke:#6b7280,stroke-dasharray:5 5
  class Tours,Inb phase2
```

> Dashed boxes are Phase 2. MVP ships everything else.

---

## 10. Owner — receiving a booking (sequence)

```mermaid
sequenceDiagram
  actor Guest
  participant API as NestJS (api)
  participant Jobs as BullMQ Worker
  participant Email as Resend
  participant SMS as Twilio
  participant WA as WhatsApp Cloud API
  actor Owner

  Guest->>API: pays + booking confirmed
  API->>Jobs: enqueue notifyOwner(bookingId)

  par fan-out across channels
    Jobs->>Email: send "new booking" email
    Email-->>Owner: 📧 booking summary + PDF
  and
    Jobs->>SMS: send SMS (if SMS enabled)
    SMS-->>Owner: 📱 "New booking from Jane, 3 nights, ₱4500"
  and
    Jobs->>WA: send WhatsApp template (Phase 2)
    WA-->>Owner: 💬 booking card
  end

  Owner->>API: opens /admin dashboard
  API-->>Owner: booking visible in calendar + action items
  Owner->>API: marks "checked in" on arrival day
  API->>Jobs: schedule payout (T+24h)
```

---

## 11. Payout flow (Stripe Connect)

```mermaid
sequenceDiagram
  actor Guest
  participant Stripe as Stripe (platform account)
  participant API as Tara API
  actor Owner
  participant Bank as Owner Bank / GCash / Maya

  Guest->>Stripe: pays ₱5,000 (Stripe Elements)
  Stripe->>API: webhook payment_intent.succeeded
  Note over Stripe: Funds held in Tara's<br/>platform account

  Owner->>API: marks guest checked-in
  API->>API: schedule payout for T+24h<br/>(BullMQ delayed job)

  Note over API,Stripe: After 24h holding period
  API->>Stripe: transfer ₱4,500 to connected account<br/>(minus ₱500 = 10% commission)
  Stripe->>Bank: payout to owner's bank/GCash<br/>(1-2 business days)
  Stripe-->>API: webhook transfer.created
  API-->>Owner: 📧 payout receipt

  alt Cancellation or no-show
    API->>Stripe: refund per cancellation policy
    Note over API,Owner: Partial payout if non-refundable<br/>portion exists
  end

  alt Dispute opened
    Stripe-->>API: webhook charge.dispute.created
    API->>API: freeze payout until resolved
    API-->>Owner: alert: dispute under review
  end
```

---

## 12. Owner lifecycle state machine

```mermaid
stateDiagram-v2
  [*] --> Visitor: anonymous browse
  Visitor --> Registered: signup
  Registered --> Drafted: starts property
  Drafted --> Pending: submits for review
  Pending --> Active: approved
  Pending --> Drafted: requested changes
  Active --> Paused: owner pauses bookings
  Paused --> Active: owner resumes
  Active --> Suspended: policy violation<br/>(temp by admin)
  Suspended --> Active: resolved
  Suspended --> Banned: severe / repeat
  Active --> Closed: owner closes account
  Banned --> [*]
  Closed --> [*]
```

> States drive feature access. Only `Active` properties appear in search. `Paused` properties keep their data but go invisible to guests.

---

## 13. Guest vs Owner — side-by-side journey

```mermaid
flowchart LR
  subgraph GuestJourney["🎒 Guest journey (B2C)"]
    G1["Search"] --> G2["Compare"]
    G2 --> G3["Book + Pay"]
    G3 --> G4["Stay"]
    G4 --> G5["Review"]
    G5 --> G6["Re-book / Refer"]
  end

  subgraph OwnerJourney["🏠 Owner journey (B2B)"]
    O1["Discovery"] --> O2["Onboard"]
    O2 --> O3["Configure"]
    O3 --> O4["Receive Bookings"]
    O4 --> O5["Host Guests"]
    O5 --> O6["Get Paid"]
    O6 --> O7["Grow Inventory"]
  end

  G3 -.creates demand for.-> O4
  O4 -.creates supply for.-> G1
```

> The two journeys feed each other. This is the network effect — more guests attract more owners attract more guests. Both flywheels must spin or neither does.

---

## 14. Payments architecture — Stripe Connect (Express)

**Decision:** each property owner gets a Stripe **Connected Account** (Express type), managed under Tara's platform account. Tara uses **destination charges** so the platform holds funds during the holding period.

```mermaid
flowchart TB
  subgraph Tara["🏢 Tara — Stripe Platform Account"]
    PA["Platform Account<br/>(Tara's main Stripe account)<br/>Owns: brand, disputes, refunds, holding"]
    TB[("Platform Balance<br/>where commissions accumulate")]
  end

  subgraph Owner1["👤 Owner 1"]
    CA1["Connected Account (Express)<br/>acct_xxxxx1"]
    B1["Owner 1 bank / GCash / Maya"]
  end

  subgraph Owner2["👤 Owner 2"]
    CA2["Connected Account (Express)<br/>acct_xxxxx2"]
    B2["Owner 2 bank / GCash / Maya"]
  end

  Guest["🎒 Guest"] -->|"PaymentIntent ₱5,000"| PA
  PA -->|"holding period<br/>24h after check-in"| PA
  PA -->|"Transfer ₱4,500<br/>(after ₱500 commission)"| CA1
  PA -->|"Commission ₱500"| TB
  CA1 -->|"Stripe payout schedule"| B1

  Guest2["🎒 Guest"] -->|"PaymentIntent ₱3,000"| PA
  PA -->|"Transfer ₱2,700"| CA2
  PA -->|"Commission ₱300"| TB
  CA2 -->|"Stripe payout schedule"| B2

  classDef tara fill:#fef3c7,stroke:#d97706
  classDef owner fill:#dbeafe,stroke:#2563eb
  classDef guest fill:#dcfce7,stroke:#16a34a
  class PA,TB tara
  class CA1,CA2,B1,B2 owner
  class Guest,Guest2 guest
```

### Why this model

- **Legal:** Stripe is the money transmitter, not Tara. Without Connect, Tara might need money transmitter licenses (US: per state; PH: BSP OPS registration).
- **Holding period:** Tara holds funds 24h after check-in to protect against fraud/no-shows.
- **Disputes:** Centralized on Tara's account; owners aren't burdened with chargebacks.
- **Refunds:** Cancellation policy enforced unilaterally by Tara.
- **Lightweight onboarding:** Express KYC is faster than full Stripe — better completion rates for PH owners.
- **Brand consistency:** Card statements show "TARA" not the owner's business name.
- **Tax reporting:** Stripe handles per-owner 1099-like forms automatically.
- **PH supported:** PHP payouts to local banks/GCash via Stripe Connect since 2024.

### Onboarding flow

```mermaid
sequenceDiagram
  actor Owner
  participant Tara as Tara API
  participant Stripe as Stripe

  Owner->>Tara: clicks "Connect Stripe"
  Tara->>Stripe: POST /v1/accounts (type=express, country=PH)
  Stripe-->>Tara: account_id (acct_xxxxx)
  Tara->>Tara: store account_id on owner record<br/>status='incomplete'
  Tara->>Stripe: POST /v1/account_links (onboarding)
  Stripe-->>Tara: onboarding URL
  Tara-->>Owner: redirect to Stripe onboarding
  Owner->>Stripe: fills KYC, bank/GCash details
  Stripe-->>Owner: redirect to Tara success URL
  Stripe->>Tara: webhook account.updated<br/>(charges_enabled=true,<br/>payouts_enabled=true)
  Tara->>Tara: update status='active'
  Tara-->>Owner: 🎉 ready to receive bookings
```

### Fallback for owners who can't pass Stripe KYC (Phase B+)

Some informal PH hostels (no DTI registration, no business bank) won't onboard with Stripe Connect Express. Options:

- **PayMongo Connect** (PH local alternative to Stripe Connect — supports GCash payouts natively)
- **Manual payouts** (Tara holds funds, transfers manually via GCash/InstaPay — higher ops cost, less legally clean)
- **Block until ready** (clean architecture, lose some owners)

**MVP:** Stripe Connect Express only. Add PayMongo as a fallback if real demand materializes.

---

## 15. Notification orchestration (using existing n8n)

```mermaid
flowchart TB
  subgraph App["Tara API (NestJS)"]
    E1["Domain Event<br/>e.g. BookingConfirmed"]
    E2["Event Handler"]
    EM["Notification preferences<br/>lookup"]
  end

  subgraph N8N["n8n (home server, Phase B)"]
    WH["Webhook trigger"]
    TPL["Pick template + locale"]
    FAN["Fan-out by channel"]
  end

  subgraph Channels["Channel Adapters"]
    EM2["Resend (email)"]
    SMS["Semaphore (SMS, PH)"]
    WA["WhatsApp Cloud API"]
    PUSH["web-push"]
  end

  subgraph Recipients["Recipients"]
    U1["👤 User inbox"]
    U2["📱 User phone"]
    U3["💬 User WhatsApp"]
    U4["🔔 Browser push"]
  end

  AL[("notification<br/>audit log")]

  E1 --> E2
  E2 --> EM
  EM --> WH
  WH --> TPL
  TPL --> FAN
  FAN --> EM2 --> U1
  FAN --> SMS --> U2
  FAN --> WA --> U3
  FAN --> PUSH --> U4
  EM2 --> AL
  SMS --> AL
  WA --> AL
  PUSH --> AL
```

> **Phase B uses n8n** for orchestration — fast to iterate, no deploys. **Phase C/D migrates** to a proper NestJS NotificationModule with BullMQ for stronger guarantees.

---

## 16. Conversation surfaces (Phase B model)

```mermaid
flowchart LR
  G["🎒 Guest"] -- "browser" --> Web["Tara web app"]
  O["🏠 Owner"] -- "browser" --> Web

  Web -- "support widget" --> Tawk["Tawk.to web chat"]
  Tawk -- "messages" --> F["👤 Founder (phone)"]

  G -- "in Tara dashboard" --> Bridge["WhatsApp bridge<br/>(API webhook)"]
  Bridge -- "outbound" --> WAO["📱 Owner's WhatsApp"]
  WAO -- "reply" --> Bridge
  Bridge -- "appears in" --> Web

  O -- "support button" --> WAF["📱 Founder's WhatsApp"]
```

> In Phase B, **WhatsApp is the transport** for owner-side communication. Tara presents a unified inbox in the dashboard. Numbers are masked through Tara's WhatsApp Business number.

---

## Rendering tips

- **In VS Code:** install "Markdown Preview Mermaid Support" extension, then `Cmd/Ctrl+Shift+V` on this file.
- **On GitHub:** renders natively when this file is viewed in the web UI.
- **For exports:** paste any Mermaid block into <https://mermaid.live/> and download as PNG/SVG.

When the architecture changes, **update these diagrams in the same PR.** Diagrams that lie are worse than no diagrams.
