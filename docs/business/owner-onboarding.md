# Owner Onboarding Playbook

How Tara turns a curious hostel owner into an active, productive, loyal partner. **This is the single most important growth lever for the supply side of the marketplace.**

> Touches: [`trust-and-safety.md`](trust-and-safety.md), [`notifications-and-chat`](../../../C--Users-alexi/memory/notifications_and_chat.md) (memory), [`05-tours.md`](../domain/05-tours.md), [`payment_modes.md`](../../../C--Users-alexi/memory/payment_modes.md), Owner journey diagram (section 8 in [`architecture/diagrams.md`](../architecture/diagrams.md)).

This doc is the operational play for Phase B (high-touch) and Phase C+ (self-service). It's a living document — update it as you learn what works.

---

## The premise

**Activation > acquisition.** You can spend ₱5,000 on Facebook ads to bring 50 new owner signups — but if only 3 finish the listing and get a booking, you've wasted ₱4,800. Better to spend zero on ads and convert 9 of 10 founder-introduced owners.

For Tara specifically:

- Phase B target: **30-50% high-touch conversion** (founder onboards 20 owners → 8 active)
- Phase C target: **20-25% self-service completion** (industry baseline)
- Phase D target: **35%+ self-service** (after optimizing the onboarding flow with real data)

These numbers are achievable. Most marketplaces hit 5-15% because they don't design onboarding properly.

---

## The activation funnel — 7 stages

```
L1  Signed up                  → email + phone verified
L2  Profile started            → at least 1 property created
L3  Listing complete           → property meets minimum publishable bar
L4  Listing live               → visible in guest search
L5  First booking received     → the AHA MOMENT
L6  First booking completed    → trust loop closed
L7  Habit formed (5+ bookings) → here forever
```

Each stage has a target time and a drop-off cost.

| Stage | What unlocks it                                      | Phase B target time           | Phase C target time         | If they fail to advance...                 |
| ----- | ---------------------------------------------------- | ----------------------------- | --------------------------- | ------------------------------------------ |
| L1    | Email + SMS verification                             | 5 min                         | 5 min                       | 30% never return                           |
| L2    | Property created with name + location                | 15 min                        | 1 hour                      | 40% abandon                                |
| L3    | 5+ photos, all rooms, base rate, cancellation policy | 1 hour (founder-assisted)     | 24-48 hours (self)          | 50% never go live                          |
| L4    | Listing review passed                                | 1 hour (founder approves)     | 24-48 hours (Tara verifies) | 20% give up waiting                        |
| L5    | First booking received                               | 1-30 days (depends on market) | 1-30 days                   | THIS is the moment that decides everything |
| L6    | Guest checks in, payment received                    | 7-60 days                     | 7-60 days                   | Churn risk if delayed                      |
| L7    | 5 bookings completed                                 | 3-6 months                    | 3-6 months                  | Stickiness sets in                         |

**The single most important metric: % of L1 owners who reach L5.** This is your activation rate. Watch it weekly.

---

## Time-to-first-value (TTFV)

The clock starts at L1 (signup) and stops at L5 (first booking).

| Phase                 | TTFV target | Why                                                                          |
| --------------------- | ----------- | ---------------------------------------------------------------------------- |
| Phase B (founder-led) | < 14 days   | Founder controls listing quality + can hand-walk a guest from search to book |
| Phase C early         | < 30 days   | Self-service onboarding adds friction                                        |
| Phase C+              | < 14 days   | After optimization based on real data                                        |

If TTFV exceeds 60 days, the owner usually churns. They forget about you, lose trust, or move on. **Aggressive TTFV reduction is the #1 retention investment.**

---

## Mode A: Founder-led onboarding (Phase B)

The high-touch playbook. Founder is physically present or on a video call.

### Pre-visit (founder side)

- [ ] Confirm appointment with owner via WhatsApp
- [ ] Bring: phone with Tara dashboard open, business cards (if you have them), pen + notebook
- [ ] Review property: look at their FB page, walk around outside if you can beforehand
- [ ] Prepare: 5 questions tailored to their property (per `customer-discovery.md`)

### On-site visit (60-90 min)

```
0:00-0:10  Coffee, intros, listen. NO PITCH yet.

0:10-0:30  Customer discovery questions (per customer-discovery.md script):
           - How do they currently get bookings?
           - What's their biggest pain?
           - What platforms do they use?

0:30-0:45  Light Tara intro:
           - "Here's what I'm building. Want me to set it up for you right now?"
           - Show on phone: existing listing of a similar property
           - Be honest about Phase B: free, small, growing

0:45-1:15  ONBOARD ON THE SPOT (if they say yes):
           - You drive the phone/laptop
           - Together: create account, fill in property details
           - YOU shoot 8-10 photos around the property (your phone, better camera than theirs)
           - Set base rate together
           - Choose cancellation policy together
           - Default to MANUAL PAYMENT MODE (per ADR-0005)

1:15-1:30  Wrap:
           - "Your listing is live. Here's the URL on my phone."
           - Save WhatsApp contact mutual
           - Explain: when a booking comes in, you'll get email + WhatsApp
           - Promise: "I'll text you when your first booking comes in. Probably within 2-3 weeks."

1:30+     Drive away. Send recap WhatsApp within 1 hour:
           "Hi Maria! Great meeting you today. Your Tara listing is live at <url>.
            I'll text you the moment your first booking comes in.
            Any questions in the meantime, I'm just a WhatsApp away."
```

### Post-visit (founder, that evening)

- Write notes in `customers/[property-name].md` per discovery framework
- Polish their listing if needed (better description, photo ordering)
- If you took photos: upload them through the system to publish
- Tag the owner record as `#founder-onboarded` `#high-touch` `#level-4-live`

### Founder conversion rate target

If founder visits 10 properties and 3-5 become active = 30-50%. That's excellent for Phase B.

If conversion is below 20%: rethink positioning. Maybe pitch is too long, or too soon, or product isn't ready.

---

## Mode B: Self-service onboarding (Phase C+)

Owner does it alone, from their phone, at 11pm after closing the hostel for the night.

### Critical UX requirements

1. **Mobile-first.** Most owners onboard from phone. Test EVERY screen on actual mobile.
2. **Progress indicator.** "Step 3 of 7" + visual progress bar. Knowing how much is left lowers abandonment.
3. **Resume anywhere.** If they close the tab, they can resume exactly where they left off.
4. **Empty states do work.** "Your dashboard will show bookings here. Add a property to get started." Not "No data."
5. **No required fields without payoff.** Don't ask for tax info on step 1; ask only when needed for payouts.
6. **AI assist EVERY input.** Description generator, photo tagger, alt-text — all per `ai-features.md`.
7. **Confirmation feedback after every save.** Toast or banner. "Saved." Owners get nervous when forms feel unresponsive.
8. **Tagalog UI option from day 1.** Per ADR-0007.

### The 7-step flow

**Step 1: Welcome (30 sec)**

```
Hi! Let's get your property listed on Tara.
This will take about 15-20 minutes.
You can save and continue later.

[Get started →]
```

**Step 2: Basic property info (3 min)**

- Property name
- Type (hostel / hotel / guesthouse / cottage)
- Address with map pin
- Number of rooms (rough count, will refine)

After this step: **show progress** — "Property profile started!"

**Step 3: Rooms (5-10 min)**

- For each room: name, type (dorm/private), capacity, photos
- Bulk-add helper for dorms ("4 identical bunk beds")
- AI suggestion: "Most 6-bed dorms have these amenities — turn on if applies?"

**Step 4: Photos (5 min)**

- Minimum 5 photos (1 hero + 4 others)
- AI quality check inline ("This photo looks blurry — re-shoot?")
- Drag-to-reorder
- AI auto-tags + caption suggestion

**Step 5: Pricing (3 min)**

- Base nightly rate per room
- Cancellation policy: flexible / moderate / strict (one-tap)
- "Advanced pricing rules" collapsed — defer Phase C

**Step 6: Payment setup (5 min)**

- Choose: Stripe Connect (recommended) OR Manual (GCash/Maya/Bank)
- If Stripe: redirect to Stripe Express onboarding (10 min on their side)
- If Manual: enter GCash/Maya/Bank details + understand the verification flow

**Step 7: Review & publish (1 min)**

- Show preview of how the listing will look to guests
- Big "Publish" button
- After publish: confetti + "Your property is live! 🎉"
- Tara queues for verification (auto in Phase D, manual in Phase B-C)

### Anti-friction tactics

| Tactic                                                            | Why                                                   |
| ----------------------------------------------------------------- | ----------------------------------------------------- |
| **"Save and continue later"** in header always                    | Removes "I don't have time right now" objection       |
| **Estimated time per step**                                       | "Step 3 of 7 (~5 min)" — sets expectations            |
| **Skip non-essential** (e.g. cancellation policy → "use default") | Faster path to L3                                     |
| **Photo from phone camera with one tap**                          | Removes "I need to find photos" objection             |
| **Pre-filled smart defaults** based on property type              | "Hostels usually charge ₱600-1200/night — your rate?" |
| **Live preview alongside form**                                   | They see what they're building                        |
| **Encouraging language** ("Looking good!" "Almost done!")         | Maintains momentum                                    |

### Self-service drop-off recovery

Owner stops mid-flow:

| Time since drop-off | Action                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------ |
| 1 hour              | (silent — they might come right back)                                                      |
| 24 hours            | Email: "Hey [name], you're 60% done with your Tara listing. Want to finish? [Resume link]" |
| 3 days              | Email + WhatsApp: "Need help finishing your listing? I can hop on a quick call."           |
| 7 days              | Founder reaches out personally (WhatsApp from founder's number, not a template)            |
| 30 days             | Mark as inactive; clean up unused property record after 90 days                            |

---

## The L5 moment — first booking

This is the most important moment in the entire owner relationship. **Engineer it deliberately.**

### What happens when L5 fires

Booking confirmed → notification flow (per `notifications-and-chat` memory):

```
Within 30 seconds:
  ✉️ Email to owner: "You have a new booking!"
     Subject: "🎉 New booking: Jane Doe, Nov 14-17 (3 nights, ₱4,500)"
     Body: friendly, photos of guest if available, "Here's what to do next"

  📱 SMS or WhatsApp to owner (if first-time):
     "Maria — congrats on your first Tara booking! ₱4,500 from Jane Doe,
      checking in Nov 14. Email has the details. Reply STOP to mute SMS."

  💬 If founder is on WhatsApp with owner — founder personally messages:
     "🎉 Hey Maria! Saw your first booking just came in. So happy for you!
      Anything you need from me?"

After 1 hour (give them time to read):
  📧 Follow-up email: "Here's how to prepare for your guest's arrival"
     (Cleaning checklist, communication template, what to do at check-in)
```

The personal founder touch in Phase B is what makes L5 magical. It's not scaleable forever, but it builds an outsized loyalty that compounds when they tell other hostel owners.

### Track L5 metrics

- **Time from L4 → L5** (median, p90)
- **% of L4 owners reaching L5 within 30 days**
- **% within 14 days**
- **Notification delivery rate** (email opened, WhatsApp read)
- **Owner response time to first booking**

Dashboard in Metabase. Reviewed weekly.

---

## Lifecycle communication sequence

The default email/WhatsApp sequence for newly onboarded owners (Phase C+):

| Day                      | Channel                      | Purpose                                           | Notes                                     |
| ------------------------ | ---------------------------- | ------------------------------------------------- | ----------------------------------------- |
| 0 (signup)               | Email                        | Welcome + verify                                  | Standard                                  |
| 0 (after L2)             | Email                        | "Listing started — keep going!"                   | Encourages completion                     |
| 0 (after L4)             | Email                        | "You're live!" with shareable URL                 | Encourages owner-side promotion           |
| 1                        | Email                        | "5 tips for getting your first booking"           | Photos quality, description, share link   |
| 3                        | WhatsApp (if no booking yet) | "How's it going? Any questions?"                  | Founder-style, conversational             |
| 7                        | Email                        | Booking checklist before guests start             | Cleaning routine, communication templates |
| 14                       | Email                        | "Other Zambales hosts to follow" + community link | Community building                        |
| 30 (no booking yet)      | WhatsApp from founder        | "Let's chat — I want to help"                     | Personal intervention                     |
| First booking            | All channels                 | The L5 magic moment                               | (covered above)                           |
| Day after first checkout | Email                        | "How did it go?" survey                           | NPS + feedback                            |
| Monthly                  | Email                        | Performance summary                               | Bookings, revenue, what to optimize       |
| Quarterly                | WhatsApp                     | Personal check-in from founder                    | Relationship maintenance                  |

### Anti-spam discipline

- Critical notifications: always
- Educational/encouraging: opt-out anytime
- Marketing: separate opt-in
- Frequency cap: max 3 emails per week per owner (excluding booking-related)

PH RA 10173 compliance: explicit consent stored per channel.

---

## Owner education content plan

Built incrementally. Phase B: founder creates as questions come up. Phase C+: structured library.

### Must-have at Phase C launch

| Content                                    | Format                | Where                           |
| ------------------------------------------ | --------------------- | ------------------------------- |
| "Getting started on Tara"                  | 2-min video + written | Onboarding step 1 + help center |
| "How to take great property photos"        | Visual guide          | Linked from Step 4 photos       |
| "Pricing your hostel — a beginner's guide" | Article               | Linked from Step 5 pricing      |
| "Cancellation policies explained"          | Comparison table      | Linked from Step 5              |
| "Setting up Stripe Connect (step by step)" | Screenshot guide      | Linked from Step 6              |
| "Handling your first booking"              | Article               | Sent on L4                      |
| "Communicating with guests via Tara"       | Article               | Sent on L4                      |
| "Owner FAQ (50 most common Qs)"            | Searchable            | Help center                     |
| "Why Tara takes 10% (and how it compares)" | Article               | Pricing transparency page       |

### Format choices

- **Video for "show me how"** — 2-3 min max, mobile-friendly
- **Article for reference** — readable on phone, with screenshots
- **Tagalog version mandatory** — Filipino owners
- **One-pager PDF for in-person** — founder hands these out during visits

### Maintained by

- Phase B: founder writes 1 article/week, builds the library to ~20 by end of Phase B
- Phase C: hire content writer (₱5-10k/article) or founder-led with AI assist
- Phase D+: dedicated content/CS person

---

## Re-engagement for dormant or partial owners

Owner segments needing re-activation:

### Segment 1: Signed up but never completed (L1 stuck)

- Day 1: Welcome email
- Day 3: "Need help finishing?" with founder WhatsApp link
- Day 7: Final email — "Want me to do it for you? Reply here."
- Day 30: Stop emailing; mark inactive

### Segment 2: Listed but no bookings in 30 days (L4 stuck)

- Day 30: "Here's how to drive your first booking" email with practical tips
- Day 45: Audit their listing — is there a quality issue? (Bad photos, vague description, weird pricing?)
- Day 60: Personal founder WhatsApp — "I looked at your listing. Want some feedback?"
- Day 90: Offer founder-led photo shoot or copy rewrite (high-touch save)

### Segment 3: Active then dormant (L5-L7 then silent for 60+ days)

- Soft check-in WhatsApp: "Hey [name], haven't seen bookings on your listing recently. Everything OK?"
- Often the answer is: "Yeah I was just busy with X" — relationship survives
- Sometimes: "I closed the hostel" or "I moved to Booking only" — important data
- Sometimes: "Your platform stopped sending me guests" — investigate seriously

### Segment 4: Churned (paused or closed)

- Exit interview if they'll do one (founder, 10 min WhatsApp)
- Document reason in `customers/churned/`
- Read these monthly — they're the most honest feedback you'll ever get
- Don't take it personally; iterate

---

## Owner advocacy — turning users into salespeople

The compound interest of supply growth: **a happy owner tells 2-3 other owners.** That's organic supply growth at zero CAC.

### Mechanics

1. **Referral program** (Phase C+): owner refers another owner → both get reduced commission for X months OR cash bonus
2. **Stories/case studies**: shoot a 1-min video of a successful Tara owner, share on socials with their permission (they get pride + visibility)
3. **Owner community group** (WhatsApp / FB private): connect owners with each other — they help each other and you indirectly
4. **Annual owner award** ("Top Property of the Year — Zambales 2027"): cheap to do, builds emotional attachment
5. **Founder's public credit**: in your build-in-public content, name specific owners. They love being mentioned.

### Anti-patterns

- Forcing referrals (offering huge incentives that ring inauthentic)
- Public ranking of owners (creates resentment between owners)
- Asking owners to plug Tara on their own marketing (their channels = their relationships)

The right vibe: "We make you successful → you tell people because you want to, not because we asked."

---

## Success metrics — the dashboard

Track weekly in Metabase:

```
ACTIVATION FUNNEL (this week)
  L1 signups:            [N]
  L2 started listing:    [N]  ([%] of L1)
  L3 listing complete:   [N]  ([%])
  L4 listing LIVE:       [N]  ([%])
  L5 first booking:      [N]  ([%])
  L6 first completed:    [N]  ([%])
  L7 5+ bookings:        [N]  ([%])

ONBOARDING HEALTH
  Median TTFV (L1 → L5):     [days]
  P90 TTFV:                  [days]
  Drop-off concentration:    [stage with biggest %]
  % completed via mobile:    [%]
  Avg session count to L4:   [N]

LIFECYCLE
  Active owners:             [N]
  Dormant (no booking 30d):  [N]
  Churned (paused/closed):   [N]
  Net new this week:         [+/- N]

RELATIONSHIP HEALTH
  Owner NPS:                 [score]
  Avg response time owner→guest: [hours]
  Disputes per active owner: [N]
```

### What "healthy" looks like

| Metric             | Phase B target     | Phase C target     | Concerning |
| ------------------ | ------------------ | ------------------ | ---------- |
| L1 → L4 conversion | 80% (founder-led)  | 30% (self)         | <20% self  |
| L4 → L5 conversion | 70% within 30 days | 50% within 30 days | <30%       |
| Median TTFV        | <14 days           | <30 days           | >60 days   |
| Owner NPS          | N/A (too small)    | 30+                | <0         |
| Dormancy rate      | <10%               | <25%               | >40%       |

---

## Phase-specific play summary

| Phase               | Onboarding mode                                      | Volume             | Founder time per owner                                   |
| ------------------- | ---------------------------------------------------- | ------------------ | -------------------------------------------------------- |
| **A (0-6mo)**       | Founder is the owner                                 | 1-3 properties     | n/a                                                      |
| **B (6-12mo)**      | Founder-led, fully high-touch                        | 10-30 properties   | 2-4 hours upfront + ongoing WhatsApp                     |
| **C launch (12mo)** | Hybrid: self-service available + founder still helps | 30-100 properties  | 30 min upfront for self-service, 2hr for high-touch tier |
| **C+ (12-24mo)**    | Optimized self-service primary                       | 100-500 properties | ~10 min nudging per owner per month                      |
| **D+ (yr 2-3)**     | Self-service automated + CS team for premium         | 500+ properties    | ops team handles, founder focuses on strategy            |

---

## What we deliberately don't do

| Tactic                                        | Why not                                             |
| --------------------------------------------- | --------------------------------------------------- |
| Aggressive discounting for new owners         | Devalues platform; trains for race to bottom        |
| Hide commission until signup complete         | Trust killer; mention 10% on page 1                 |
| Require credit card to start onboarding       | Massive friction; we're not Stripe                  |
| 50-question pre-screening survey              | Friction; not worth the data                        |
| Force scheduling a sales call                 | Phase B founder is happy to chat but never required |
| Make property publish until 100% perfect      | Better to publish 80% perfect quickly + iterate     |
| Penalize slow-completing owners               | Counter-productive; nurture instead                 |
| Spam them with "complete your profile!" daily | Annoying; 3 nudges max                              |

---

## Implementation order (when we actually build this)

1. **Phase B (now-ish):** founder-led playbook exists; no software needed beyond what we have. Run it.
2. **Phase B mid:** simple "save and continue later" + email drip via n8n. Self-service flow exists but isn't optimized.
3. **Phase C launch:** full self-service flow polished, progress indicators, lifecycle emails wired up, education library at 20+ articles.
4. **Phase C+:** segmented re-engagement, A/B testing, AI-personalized onboarding paths.
5. **Phase D+:** referral system, owner community, automation.

---

## When this doc changes

- After every Phase B owner onboarded, log learnings + update what worked
- Quarterly review of metrics → adjust playbook
- Major drop-off discovered → diagnose + revise flow
- New onboarding mode (mobile app etc.) → write new section
