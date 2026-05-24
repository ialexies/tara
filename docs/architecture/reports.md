# Reports Strategy

How Tara generates, delivers, and exports reports — for owners, founders, regulators, and accountants. **Distinct from `analytics.md`** (which is about real-time dashboards). Reports are **scheduled, formal, often exported, often legally required.**

> Related: [`analytics.md`](analytics.md) (real-time / interactive metrics), [`admin-dashboards.md`](admin-dashboards.md) (reports embedded in superadmin), [`07-money.md`](../domain/07-money.md) (the underlying money math).

---

## Three audiences, three report types

| Audience             | Examples                                         | Format                   | Cadence                   | Phase |
| -------------------- | ------------------------------------------------ | ------------------------ | ------------------------- | ----- |
| **Property owner**   | Monthly earnings, booking history, occupancy     | In-app + email + CSV     | On-demand + monthly auto  | A→B   |
| **Founder / ops**    | Platform KPIs, financial summary, audit log      | In-app + scheduled email | Weekly + monthly + ad-hoc | A→B   |
| **Regulatory / tax** | BIR-compliant revenue reports, official receipts | PDF + CSV                | Quarterly + annually      | C     |

These three have different requirements. Don't try to serve all with one report builder.

---

## Owner reports

Owners need to understand their business at a glance. Reports = owner self-service.

### Built-in reports (owner dashboard)

| Report                     | What it shows                                                                      | Available                 |
| -------------------------- | ---------------------------------------------------------------------------------- | ------------------------- |
| **This month at a glance** | Bookings, GBV, net (after Tara fee), occupancy %, top guest origin                 | Always (dashboard home)   |
| **Earnings statement**     | Bookings + their commission breakdown + payouts due                                | Per month, last 12 months |
| **Booking history**        | All bookings with status, guest, dates, amount                                     | Filter + export CSV       |
| **Property performance**   | Per-property: occupancy, ADR (avg daily rate), RevPAR (revenue per available room) | Per month                 |
| **Reviews summary**        | Stars trend, response rate, recent feedback themes                                 | Always                    |
| **Tax statement**          | Total revenue + Tara commission + VAT collected (if registered)                    | Per quarter, per year     |
| **Payout history**         | Each payout with date, amount, included bookings, transfer ref                     | All time                  |
| **Guest origin map**       | Where guests come from (city/country)                                              | Always                    |

### Owner report formats

| Format            | Use case                                                                      |
| ----------------- | ----------------------------------------------------------------------------- |
| **In-app view**   | Daily glances, drill-down exploration                                         |
| **Email summary** | Weekly "Here's how you did" digest (Mondays)                                  |
| **CSV export**    | Owner shares with their accountant / does their own analysis                  |
| **PDF**           | Official-looking statement (Phase C+, e.g. for visa applications, loans, BIR) |

### Sample weekly email

```
Subject: Maria's Surf Hostel — Week ending May 24

Hi Maria,

Here's your week:
  📅 7 nights of bookings (4 bed-nights, 3 private-nights)
  💰 ₱6,400 in bookings (₱5,760 to you after Tara's 10%)
  ⭐ 1 new review: 5 stars from Jane D.
  📊 65% occupancy (up from 52% last week)

Coming up:
  Today: 2 arrivals (Pedro M., Sarah K.)
  Tomorrow: 1 arrival
  This week: 4 more bookings expected

[View full dashboard →]

Quick wins this week:
  • Your photo of the sunset deck has 3x more views than your other photos.
    Want to make it your hero? [One-click here]
  • You haven't responded to Sarah's message yet (2 days ago).
    [Reply now]

Have a great week,
Tara
```

Notice: ends with **specific action items**, not just numbers. That's what makes a report useful instead of forgettable.

### Owner report frequency rules

- **Daily:** none (overload — owners log in if they want today's view)
- **Weekly:** auto-summary email Monday 8am PHT (optional opt-out)
- **Monthly:** statement email 1st of month
- **Quarterly:** tax statement available for download
- **On-demand:** all reports queryable any time in dashboard

---

## Founder / ops reports

Founder needs platform-wide visibility. Most lives in Metabase (per `analytics.md`); reports are the scheduled snapshots.

### Daily morning summary (email to founder, 7am)

Cheap auto-generated digest before the day starts:

```
Subject: Tara Daily — May 24, 2026

Bookings yesterday:        12 (₱24,400 GBV)
Bookings this month:       189 (₱412,000 GBV)
Net commission MTD:        ₱41,200
Active properties:         34 (no change)
Pending verifications:     2 — review at [link]
Open disputes:             1 (Maria's Hostel — 16h old, action needed)
Notification health:       99.2% delivery (240/242 last 24h)
System health:             ✅ all green
Backup health:             ✅ last full backup 9h ago

Top alert: dispute aging
  Booking #abc123: AWAITING_VERIFICATION 48h, founder action required
  [Review and act →]
```

Built with a simple BullMQ scheduled job, Resend email, server-rendered HTML.

### Weekly founder dashboard (Friday review prep)

Larger report, sent Friday 4pm PHT, in time for the weekly review ritual (per `docs/founder/operations.md`):

```
Subject: Tara Week 21 — Friday review

This week's KPIs vs last week:
  Bookings: 78 (+12%)
  GBV: ₱156,000 (+8%)
  Net commission: ₱15,600 (+8%)
  New properties: +3 (vs +1)
  New owners: +5 (vs +4)
  Cancellation rate: 6% (down from 9%)
  Mock data still showing? No (correctly)

Activation funnel this week (signups → first booking):
  L1: 5  →  L2: 4 (80%)  →  L4: 2 (40%)  →  L5: 0 (0%)
  Note: 0 first-bookings this week. WATCH — usually 1-2.

Owner pipeline (high-touch outreach):
  Visits this week: 2 (Maria's Hostel, Pundaquit Surf Camp)
  Conversion rate (visits to listed): 50% (1 of 2 onboarded)

Customer interviews:
  Guests interviewed: 3
  Top theme: "wish I could see surfing conditions per day"
  → consideration for surf-forecast integration?

Operational health:
  System uptime: 100%
  Notification delivery: 99.1%
  Avg API p95 latency: 220ms (within budget)

Action items for next week:
  - 1 dispute still open (need to resolve today)
  - 2 verifications pending
  - 0 critical Renovate PRs

Articles published this week: 2 (Pundaquit surf guide, Anawangin packing list)

Energy check time. Have a good weekend.
```

Built as a Metabase scheduled report (Metabase supports email delivery natively).

### Monthly report (first weekday of month)

Bigger, with charts and trends. PDF format. Saved to `/founder/monthly-reports/2026-04.pdf` automatically. Reviewed at the monthly review per `docs/founder/checklist.md`.

Contents:

- Month-over-month KPIs
- Trend charts (bookings, GBV, owners)
- Activation funnel by cohort
- Top properties by revenue
- Owner churn analysis
- Notification health summary
- Backup drill confirmation
- Cost summary (infra + AI + services)
- Customer interview synthesis (themes that emerged)
- Risk register changes
- Open postmortems

### Ad-hoc reports

For when founder asks "what was the impact of last week's tiktok?":

- Metabase saved questions can be re-run with new parameters
- Export to CSV for further analysis
- For complex one-off: write a SQL query, save to `infra/metabase/queries/adhoc/`

---

## Regulatory / tax reports

The boring-but-mandatory category. Most painful if you skip it; cheap if done right.

### PH BIR-compliant reports (Phase C+)

When Tara starts charging real commission (Phase C), accountant + BIR requirements kick in:

| Report                            | Cadence   | Purpose                                              |
| --------------------------------- | --------- | ---------------------------------------------------- |
| **Sales (commission) journal**    | Monthly   | All Tara commission revenue with date, amount, party |
| **VAT computation**               | Monthly   | If VAT-registered                                    |
| **Income tax projection**         | Quarterly | For paying advance income tax                        |
| **Withholding tax remittance**    | Monthly   | If withholding from owner payouts                    |
| **Annual income tax return prep** | Annual    | For BIR filing (Q1 of following year)                |
| **Audit trail**                   | On-demand | Per BIR audit request                                |

Format: CSV (for accountant import to QuickBooks/Xero or PH-specific tools), PDF for filing.

### Owner-side regulatory reports

Each owner needs:

- **Annual income statement** (Tara-side revenue summary for their tax return)
- **Per-booking receipts** (PH OR — Official Receipt; required by BIR if guest requests)
- **Withholding tax certificate** if Tara withholds on their behalf

Built as templates; owner downloads from their dashboard.

### Data privacy / RA 10173 reports

Per Data Privacy Act:

- **Data inventory** (what we collect, why, how long, where stored) — annual review, published
- **Data breach report template** (24h prep, 72h regulatory submission ready)
- **Access requests** (DSAR — Data Subject Access Request — fulfilled within 30 days)
- **Deletion requests** (right to be forgotten — handled per policy)

These aren't "reports" in the traditional sense but get generated on demand.

---

## Architecture — how reports get built

### Three-layer approach

```
   Postgres (source of truth)
        │
        ▼
   Metabase (interactive + scheduled)
        │
        ├──► In-app dashboards (iframe in superadmin / owner)
        ├──► Email delivery (built-in)
        └──► CSV / PDF export
```

For most reports: Metabase does the job. No custom code.

For specialized exports (BIR-formatted, branded PDFs):

```
   Postgres → custom report generator (apps/jobs)
                ├──► HTML template (React Email or custom)
                ├──► PDF via puppeteer / playwright (headless Chrome)
                └──► Stored in R2 + linked in dashboard
```

PDF generation: lazy. Generated on-demand when owner clicks "Download PDF." Avoids storing thousands of PDFs nobody downloads.

### Tooling chosen

| Need                        | Tool                                     | Why                                            |
| --------------------------- | ---------------------------------------- | ---------------------------------------------- |
| Interactive dashboards      | Metabase (self-hosted)                   | Free, SQL-based, embedded                      |
| Scheduled emails            | Metabase + BullMQ                        | Metabase native for simple; BullMQ for complex |
| CSV export                  | Built into Metabase + custom for branded | Standard                                       |
| PDF generation              | Playwright + React template              | Reuses our existing Playwright install         |
| Real-time dashboards (rare) | Grafana                                  | Live metrics; cross-references logs            |

### Implementation pattern

```ts
// apps/jobs/src/reports/owner-monthly-statement.ts
export async function generateOwnerMonthlyStatement(
  ownerId: string,
  year: number,
  month: number,
): Promise<{ pdfUrl: string }> {
  // 1. Fetch data
  const data = await fetchMonthlyOwnerData(ownerId, year, month);

  // 2. Render HTML template (React-on-server)
  const html = await renderStatementHTML(data);

  // 3. Generate PDF via Playwright
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  const pdf = await page.pdf({ format: 'A4' });
  await browser.close();

  // 4. Upload to R2
  const key = `owners/${ownerId}/statements/${year}-${String(month).padStart(2, '0')}.pdf`;
  await r2.putObject(key, pdf);

  // 5. Return signed URL (24h expiry)
  return { pdfUrl: await r2.signedUrl(key, 24 * 60 * 60) };
}
```

Reusable for any branded PDF report.

---

## Report ownership + maintenance

Like dashboards, reports drift if no one watches them.

**Rule:** every report has an owner (a person) and a purpose. If the purpose isn't clear, delete the report.

Maintained in `docs/architecture/reports-catalog.md` (TBD when we have a real set):

```
Report: Monthly owner statement
  Owner: Founder
  Purpose: Owner monthly self-service review
  Built: 2026-Q3
  Last reviewed: 2026-Q4
  Sent to: All active owners on 1st of month
  Engagement: 78% opened (PostHog)

Report: Founder Friday digest
  Owner: Founder
  ...
```

Quarterly review: kill reports nobody reads.

---

## Phase rollout

| Phase           | Owner reports                                                                             | Founder reports                    | Regulatory reports                                    |
| --------------- | ----------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------- |
| **A (0-6mo)**   | Basic dashboard, no email                                                                 | Daily morning email summary        | None yet (no revenue)                                 |
| **B (6-12mo)**  | Weekly + monthly auto-emails. CSV export.                                                 | Friday weekly digest. Monthly PDF. | Founder generates manually if needed for personal tax |
| **C (12-24mo)** | Tax statement (Phase C launch — needed for paying owners). Per-booking ORs. Branded PDFs. | All formal. BIR-aligned.           | Full BIR compliance suite. Audit trail.               |
| **D+ (yr 2-3)** | Per-property breakdowns, comparison to similar properties.                                | Cohort reports, segment analysis.  | International tax reports if multi-region.            |

---

## What we deliberately don't do

| Tactic                                             | Why not                                                               |
| -------------------------------------------------- | --------------------------------------------------------------------- |
| Auto-send 50 weekly reports to every owner         | Email fatigue; opt-in cadence                                         |
| Custom-built BI tool                               | Metabase is better and free                                           |
| Real-time everything                               | Owners don't need second-precision; daily is enough                   |
| Build a "report builder" UI (drag-and-drop fields) | Engineering rabbit hole; people use Metabase if they want flexibility |
| Email PDFs unsolicited                             | Inbox burden; link from email to in-app PDF download                  |
| Store every generated PDF forever                  | Bloat. Lazy-generate on download. Cache 30 days.                      |
| Open APIs for owner data (Phase A-B)               | Premature; revisit Phase D for advanced owners                        |

---

## Specific implementation milestones

### Phase A (Months 0-6)

- [ ] Metabase running per `home-server-services.md`
- [ ] Read-only DB user for Metabase
- [ ] Founder's morning email scheduled via Metabase
- [ ] Owner dashboard has "this month" widget
- [ ] CSV export on owner bookings list

### Phase B (Months 6-12)

- [ ] Weekly owner summary email (template + scheduled)
- [ ] Monthly owner statement (HTML + PDF generation)
- [ ] Friday founder digest (Metabase scheduled report)
- [ ] Property performance dashboard for owners

### Phase C launch (Months 12-15)

- [ ] BIR sales journal monthly export
- [ ] Owner annual income statement
- [ ] Per-booking PDF receipt download
- [ ] Withholding tax remittance reports (if applicable)
- [ ] Data privacy DSAR fulfillment workflow

### Phase D+ (Year 2-3)

- [ ] Comparison reports ("you vs. similar properties")
- [ ] Cohort retention reports for founder
- [ ] Multi-region tax reports

---

## When this doc changes

- New report added → add to catalog with owner + purpose
- Cadence change → coordinate with notification preferences
- PH BIR requirement change → accountant brief + update affected reports
- Owner complaint about report → diagnose; usually means we're sending wrong content or wrong cadence
