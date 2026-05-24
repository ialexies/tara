# Customer Discovery Framework

How to systematically learn from owners and guests so the platform actually solves their problems. **Talking to customers is the highest-leverage activity for a solo founder** — and most do it badly because they don't have a system.

> Companion to [`operations.md`](operations.md). Wednesdays are customer days (per the weekly rhythm).

This doc covers: interview scripts, note templates, tagging system, weekly synthesis, insight-to-action pipeline.

---

## The premise

You can talk to 50 owners over a year. Without a system:

- You forget what each one said
- You can't see patterns across them
- You over-weight the loudest voice
- You build features for the customer you talked to last week instead of all of them

With a system:

- Every conversation captured the same way
- Patterns surface in weekly review
- Real insights drive the roadmap
- You're the _most informed_ founder in your category

The system has 4 parts: **scripts → notes → tagging → synthesis**.

---

## Owner interview script

**Use case:** sitting with a Zambales hostel owner for 30-45 min during a property visit (Phase B).

**Goal:** understand their business, what's hard, what they wish for. **NOT to sell them on Tara.** That comes later (or never — sometimes the right outcome is "this owner won't be a fit").

### Setup (2 min)

- "Thanks for letting me visit. I'm building a platform for PH hostels and trying to learn how things actually work before I build the wrong thing. Mind if I take notes? Some of these questions might feel basic — that's the point."
- Sit somewhere they're comfortable (the bar, the lobby, the deck).
- Order coffee. Yours, theirs.

### Questions (in order — but flow naturally)

**About them and the property:**

1. "How did you get into running a hostel here?"
2. "How long have you been doing this?"
3. "Walk me through your typical week."

**About bookings (the money):** 4. "Where do most of your bookings come from?" (probe: Booking, Hostelworld, Airbnb, Facebook, walk-ins, direct) 5. "What percentage roughly?" (don't expect precision; rough is fine) 6. "If you could change one thing about how bookings come in, what would it be?"

**About platforms they use:** 7. "What tools do you use for managing bookings, calendars, payments?" 8. "What do you love about them?" 9. "What drives you crazy about them?" 10. "What does Booking.com / Hostelworld charge you?"

**About problems:** 11. "When was the last time something went really wrong with a booking? Tell me what happened." 12. "What's the most annoying part of running this place?" 13. "What takes the most time that you wish it didn't?"

**About growth + dreams:** 14. "Where do you want to be in 2-3 years?" 15. "If a magic wand made one thing better for your business tomorrow, what would it be?"

**About Tara (only at the end, brief):** 16. "I'm building a platform that [one sentence pitch]. Does anything about that sound interesting to you? Anything sound off?"

### Anti-patterns (avoid)

- ❌ Pitching before listening
- ❌ Asking leading questions ("Wouldn't it be great if...")
- ❌ Asking what features they want (they don't know; they know problems)
- ❌ Explaining what Tara does at length (they don't care yet)
- ❌ Promising things you can't deliver
- ❌ Taking out a slide deck

### After the conversation

- 30 sec: thank them, get their contact (WhatsApp), promise follow-up
- 2 min: stop somewhere on the drive home and dictate / write quick voice notes while it's fresh
- That evening: write up structured notes (template below)

---

## Guest interview script

**Use case:** hostel guests in person (when you're at a property), or a follow-up WhatsApp/call after they stayed somewhere on Tara (Phase C+).

Shorter — 15-20 min. Guests are less invested.

### Questions

**About them:**

1. "Where are you from? What brought you to Zambales?"
2. "Is this your first time backpacking PH?"

**About this trip:** 3. "How did you decide where to stay?" 4. "What platforms did you check?" 5. "What made you pick this place specifically?" 6. "What almost made you not book it?"

**About the booking experience:** 7. "Walk me through the moment you booked. What was easy? What was annoying?" 8. "Did you book any tours / activities? How?" 9. "Any payment issues?"

**About the stay:** 10. "Anything about the property that surprised you (good or bad)?"

**Wishes:** 11. "If you could have known one thing before booking that you didn't, what would it be?"

That's it. Thank them, offer to send Tara info (only if relevant).

---

## Note template (after the conversation)

Use this exact template every time. Consistency is what makes patterns surface.

```markdown
# [Property name] / [Owner name] — [Date]

**Location:** San Antonio, Zambales
**Type:** 12-bed hostel, 2 private rooms, 1 dorm
**Owner:** Maria Santos, ~45, family-run
**Channel intro:** found via [how you got introduced]
**Visit length:** 1.5 hours

---

## What they said (raw, in their words)

- "Booking.com takes 15% and I don't even know who my guests are until they arrive."
- "Most of my bookings come from FB Messenger from groups in Manila."
- "The hardest part is when guests show up and the room isn't ready because housekeeping forgot."
- "I'd love to have a website but I'm not good with computers."
- ... (more verbatim quotes)

## What I observed (not what they said)

- Their booking calendar is a notebook + a wall calendar — no software at all
- 8/10 photos on their FB page were taken in 2018 (visibly dated)
- They get bookings via cousin who has Instagram following
- Property is clean and well-kept; food is excellent

## My interpretation (separate from above)

- They're tech-averse but not anti-tech — they'd use something simple
- Real pain point: hidden customer relationship (Booking.com keeps the guest)
- Secondary pain: photo refresh (could be solved by us)
- They likely won't onboard themselves; need high-touch onboarding (us doing it for them)

## Tags

#tech-averse #relationship-pain #booking-com-friction #high-touch-prospect #female-owned #family-business

## Follow-up

- [ ] Send WhatsApp thank-you
- [ ] Add to "interested for Phase B onboarding" list
- [ ] Revisit in 2 months with progress to share
```

**Why separate "said" / "observed" / "interpretation":**

- "Said" is data. Direct quotes don't drift.
- "Observed" is data. What you saw with your eyes.
- "Interpretation" is _yours_ — it can be wrong. Marking it separate keeps you honest later.

---

## Tagging system

Pre-defined tags so synthesis is easy. Add new tags sparingly; merge similar ones during quarterly review.

### Owner tags

- **Tech**: `#tech-savvy` `#tech-averse` `#tech-neutral`
- **Pain themes**: `#booking-com-friction` `#manual-double-bookings` `#payment-delays` `#empty-shoulder-season` `#bad-photos` `#staff-issues` `#relationship-pain` `#cancellation-disputes`
- **Onboarding readiness**: `#self-service-ready` `#high-touch-prospect` `#not-ready-yet`
- **Property type**: `#hostel` `#guesthouse` `#hotel-style` `#beach-cottage` `#surf-camp`
- **Owner profile**: `#female-owned` `#family-business` `#corporate` `#expat-owned` `#young-owner`
- **Status**: `#interested` `#onboarded` `#churned` `#not-fit`

### Guest tags

- **Pain themes**: `#hidden-fees` `#bad-search` `#payment-friction` `#no-tour-info` `#unclear-cancellation` `#fake-photos`
- **Persona**: `#backpacker` `#flashpacker` `#weekend-warrior` `#digital-nomad` `#group-traveler` `#solo-female`
- **Origin**: `#international` `#filipino-domestic` `#ofw-returning`

---

## The weekly synthesis (Friday, 15 min)

Friday weekly review (per `operations.md`) includes a customer section:

```
CUSTOMER LEARNINGS THIS WEEK

Conversations: [N]

Top 3 things I heard most:
1. ...
2. ...
3. ...

Surprises (something I didn't expect):
- ...

New tags I added:
- ...

Connections to existing roadmap:
- "Maria asked for [X]" → matches feature already in Phase B plan
- "Multiple guests confused by [Y]" → not in plan, consider adding

Anything that changes my thinking?
- ...

Anyone I owe a follow-up to?
- ...
```

Saved in `weekly-reviews/`. Reviewed monthly.

---

## Monthly insight roll-up

End of every month, 30 min. Read all weekly reviews from the month.

```
CUSTOMER INSIGHTS — [Month Year]

CONVERSATIONS: [N total, X owners, Y guests]

TOP PATTERNS (mentioned by 3+ people):
1. ...
2. ...

CONFIRMING what we already knew:
- ...

SURPRISING things we didn't know:
- ...

ASSUMPTIONS PROVEN WRONG:
- ...

NEW ROADMAP CANDIDATES (added to backlog):
- ...

NO LONGER PRIORITIES (heard zero times):
- ...

FOLLOWUPS DUE NEXT MONTH:
- ...
```

This is what informs roadmap decisions. **No feature ships into production without customer evidence backing it.** (Exception: foundational infrastructure work.)

---

## How insights become product

The pipeline:

```
Conversation → notes → tags → weekly synthesis → monthly roll-up
                                                       │
                                                       ▼
                                          backlog item with attribution
                                          ("3 owners said X" / "5 guests struggled with Y")
                                                       │
                                                       ▼
                                                  Prioritization
                                                  (by impact × frequency)
                                                       │
                                                       ▼
                                                 Roadmap inclusion
                                                       │
                                                       ▼
                                                    Build it
                                                       │
                                                       ▼
                                       Tell the customers who asked for it
                                       (shows you listened; builds loyalty)
```

Step 7 is the magic. When Maria gets a "remember when you said you wished X? we just shipped it" message — she's a customer for life and she tells her friends.

---

## The numbers to track

Per quarter, count:

- **Conversations conducted** (target: 15-30 in Phase B)
- **Unique customer types** (owner vs guest vs tour operator)
- **Tag distribution** — what themes dominate?
- **Insights → backlog items** (target: 3-5 per quarter)
- **Insights → shipped features** (target: 2-3 per quarter)

If you're talking to lots of people but shipping nothing from it, the pipeline is broken. If you're shipping lots but it's never tied to customer insight, you might be building the wrong things.

---

## Common mistakes to avoid

| Mistake                                         | Why bad                             | Better                                          |
| ----------------------------------------------- | ----------------------------------- | ----------------------------------------------- |
| Talking only to friendly / supportive customers | They tell you what you want to hear | Talk to skeptics too                            |
| Sticking to a script rigidly                    | Misses the unexpected gem           | Use script as backbone, follow tangents         |
| Forgetting to take notes during                 | Memory fades within hours           | Always notes; reconstruct same day              |
| Asking customers what to build                  | They suggest local maxima           | Ask about problems; you design solutions        |
| Confirming your hypothesis vs disconfirming     | Confirmation bias is real           | Look for evidence you're wrong                  |
| Talking to 50 of the same persona               | Skewed view                         | Vary: small/big, new/established, tech/non-tech |
| Never following up                              | Burns the relationship              | Send the "we built what you asked for" message  |

---

## Phase rollout

| Phase            | Focus                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| A (Months 0-6)   | Owner interviews while scouting Zambales. 2-3 per week. No product to show yet.                           |
| B (Months 6-12)  | Owner onboarding interviews + first guest interviews after they stay. 5-10 per week (mix).                |
| C (Months 12-24) | Structured cohort interviews (1st-week owner experience, 1st booking guest experience). Some via Cal.com. |
| D+               | Customer research function (dedicated person or ops team has it as part of role).                         |

---

## Templates folder

Create these files in your Obsidian / Notion:

```
customers/
├── _template-owner.md        (the note template above)
├── _template-guest.md
├── _template-monthly-rollup.md
├── prospects/                (people considering joining)
├── onboarded/                (active owners)
├── churned/                  (lost owners — read these regularly to prevent more)
└── synthesis/                (monthly roll-ups)
```

Pre-fill the template once. Every new conversation = duplicate the template. Friction = lower; rate = higher.

---

## What this doc isn't

- A market research methodology — that's a separate, longer discipline
- A sales process — though the lines blur in Phase B
- A user testing framework — that's for prototypes (different doc when relevant)
- A formal NPS / survey system — those come later when you have volume

---

## When this doc changes

- New tag commonly used → add to the canonical tag list
- New persona discovered → add a script
- Phase transition → revisit cadence
- You realize the system isn't producing insights → diagnose; maybe the issue is the questions, not the system
