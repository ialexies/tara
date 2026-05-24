# Founder Operations

How the solo founder structures their week, focus, and personal systems. **Solo founders fail more often from operational chaos than from technical chaos.** This doc is the discipline that protects against that.

> Companion to [`checklist.md`](checklist.md) (the recurring + phase-gate checks). This doc is about the **rhythm** of solo founding.

---

## The premise: you are a single-threaded process

You can only do one thing at a time, well. Trying to multitask = doing two things badly. A solo founder's biggest leverage isn't talent or hustle — it's **a calendar that protects deep work**.

Three failure modes to defend against:

1. **Reactive mode all day** — you spend the day responding to messages, never shipping
2. **Coding hermit mode** — you ship code but never talk to customers
3. **Hype mode** — you do "marketing" all week and ship nothing

The schedule below balances all three deliberately.

---

## The weekly rhythm

A 5-day work week, with explicit lanes. Adjust to your reality (energy windows, family obligations).

### Sample weekly template

| Day     | Mode                         | What you do                                                                                      |
| ------- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| **Mon** | Deep coding                  | One focused build session, 4-6h. No meetings. The biggest task of the week ships today.          |
| **Tue** | Code + ops                   | Coding 3-4h + admin/support catch-up + Renovate PRs + monitoring review                          |
| **Wed** | Customer day                 | Field trip: visit 1-2 properties in Zambales, OR 2-3 customer calls/WhatsApp chats. Write notes. |
| **Thu** | Deep coding                  | Second focused build session                                                                     |
| **Fri** | Content + review             | Write a blog post, post LinkedIn update, weekly review ritual (see below)                        |
| Sat-Sun | Off (or 1 day light content) | Real rest. Or one casual content shoot if you genuinely enjoy it.                                |

**Total:** ~25-30h focused work per week. You're not a "100h hustle" person; that's burnout fuel. **30 deliberate hours beat 60 reactive hours.**

### Calendar blocks (the actual time pieces)

Block these on Google Calendar, mark "busy":

```
Mon 09:00-13:00  DEEP CODE (no notifications, phone in drawer)
Mon 14:00-16:00  Review PRs / merge to main
Mon 16:00-17:00  Daily wrap

Tue 09:00-12:00  Code
Tue 13:00-14:00  Inbox triage (entire day's worth)
Tue 14:00-17:00  Code + ops

Wed 09:00-17:00  CUSTOMER (field or calls)
Wed 18:00-19:00  Write customer notes while fresh

Thu 09:00-13:00  DEEP CODE
Thu 14:00-17:00  Code

Fri 09:00-12:00  CONTENT (blog + social posts)
Fri 13:00-15:00  Weekly review ritual
Fri 15:00-17:00  Plan next week
```

**Sacred rules:**

- Deep code blocks have notifications OFF. Phone in another room.
- Inbox triage is once per day max. Email is not a real-time medium.
- Wednesday is customer day, period. No code emergencies overrule this except outages.

---

## The Friday weekly review (the most important hour)

Every Friday afternoon. 45-60 minutes. Solo. Notebook + computer.

### Template

```
WEEKLY REVIEW — Week of [date]

1. SHIPPED (what's actually merged / live)
   - ...

2. NOT SHIPPED (what I started but didn't finish, and why)
   - ...

3. LEARNED (one or two real insights from customers, code, or yourself)
   - ...

4. METRICS (numbers from this week)
   - Bookings: [X] (vs last week: [Y])
   - Active properties: [X]
   - Notifications sent: [X] (failure rate: [Y]%)
   - Github commits: [X]
   - Content posts published: [X]

5. ONE THING I'M PROUD OF
   - ...

6. ONE THING I'M FRUSTRATED ABOUT
   - ... (and what I'll do about it)

7. NEXT WEEK'S #1 PRIORITY (one specific outcome)
   - ...

8. ENERGY CHECK (1-10)
   - This week:  [X]/10
   - Trending:   ↑ steady ↓
   - If trending down → reduce scope next week
```

**Why this works:**

- Forces honest acknowledgment of what shipped vs. what didn't
- Surfaces patterns early (3 weeks of energy ↓ = burnout warning)
- The "one thing" prompts prevent vague "lots of stuff happened" non-reflection
- Numbers ground you in reality, not feels

Save these reviews. Read 3 months of them in one sitting → patterns become visible.

---

## Personal knowledge management

Pick ONE tool. Stick with it for at least a year.

**Recommended (in order):**

1. **Obsidian** — local files, markdown, owns your data, free. Default choice.
2. **Notion** — cloud-based, friendlier UI, free for individuals. If you prefer hosted.
3. **Plain markdown files in a git repo** — purest. Use if you live in editors.

**Folder structure (Obsidian/Notion both fit):**

```
tara-personal/
├── daily/             (daily notes — what happened today)
│   └── 2026-05-24.md
├── weekly-reviews/    (Friday templates filled in)
│   └── 2026-W21.md
├── customers/         (notes from owner/guest conversations)
│   ├── marias-surf-hostel.md
│   └── ...
├── decisions/         (personal decisions outside ADRs)
│   └── ...
├── ideas/             (random ideas to revisit later)
│   └── ...
├── reading/           (book/article notes)
│   └── ...
└── inbox.md           (where everything starts before it's filed)
```

Daily note template:

```
# 2026-05-24 Sat

## TODO today
- [ ] ...

## Done
- ...

## Notes / observations
- ...

## Tomorrow's #1
- ...
```

Pre-fill from yesterday's "Tomorrow's #1" → makes mornings frictionless.

---

## Inbox / notification discipline

Solo founders are notification magnets. Each ping is a small attention tax. Death by 1000 pings is real.

### Rules

**Phone:**

- Notifications OFF for: email, GitHub, Slack/Discord, Twitter, LinkedIn, news
- Notifications ON for: WhatsApp (founder support number) + SMS (critical alerts) + Discord #alerts only
- Phone in another room during deep code blocks

**Email:**

- 2 checks per day max: 13:00 and 17:30
- Use templates for repeat answers (paste from Obsidian)
- Unsubscribe ruthlessly

**Slack/Discord:**

- Only 2 channels you respond to live: #alerts + #support
- Everything else is async; check during inbox triage

**Twitter / LinkedIn:**

- Schedule posts via Buffer; don't open the apps to "post"
- One scroll session per day, 15 min max
- Reply to comments in batches, not in real-time

The goal: protect at least 8h/week of true uninterrupted deep work. That's where the product happens.

---

## Burnout watch — early warning signs

Burnout is silent until it's loud. Catch it early.

### Watch list (review weekly)

| Sign                                                       | Severity    | What to do                                                      |
| ---------------------------------------------------------- | ----------- | --------------------------------------------------------------- |
| You skip the Friday review                                 | 🟡 Warning  | Force yourself to do this week's. Pattern → real concern.       |
| Energy 4 or below for 2 weeks in a row                     | 🟡 Warning  | Take a full day off. Reduce next week's scope.                  |
| You stop talking to customers                              | 🟡 Warning  | Schedule 2 calls this week.                                     |
| Sleep < 6h / night for 5+ nights                           | 🔴 Critical | Stop. Sleep is non-negotiable.                                  |
| Resentment toward the project                              | 🔴 Critical | Take a week off. Talk to a peer founder.                        |
| Physical symptoms (chronic headache, GI issues, etc.)      | 🔴 Critical | See a doctor. Reduce hours.                                     |
| You're working but feeling like you're "behind" constantly | 🔴 Critical | Re-read your phase plan; you might be doing things wrong-phase. |
| You stop having non-work hobbies                           | 🟡 Warning  | Restart one this week. Even small.                              |
| You're irritable with family/partner                       | 🔴 Critical | Pause the project; relationships are higher priority.           |

### Recovery protocols

| Severity    | Action                                                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 🟡 Warning  | One full day off (no laptop). One walk per day this week. Reduce next week's task count 50%.                                  |
| 🔴 Critical | One full week off. Travel without laptop if possible. When back: cut scope ruthlessly; talk to a peer founder.                |
| Severe      | Pause for 4+ weeks. Get external help (therapy, mentor, advisor). The project will survive. You might not if you don't pause. |

**You are more valuable than the project.** Tara without you is dead. You without Tara is fine.

---

## Quarterly retros (longer review)

End of every quarter. Half a day. Solo or with a peer founder.

```
QUARTER RETRO — Q[X] [Year]

LOOKING BACK
1. What were the 3 biggest wins?
2. What were the 3 biggest mistakes?
3. What did I learn that surprised me?
4. Which assumptions did the quarter prove/disprove?
5. Which risks materialized (see risk register)?
6. Which risks didn't materialize but might next quarter?
7. Energy + health: was this quarter sustainable?

LOOKING FORWARD
1. What's the #1 outcome I want next quarter?
2. What's the bottleneck stopping that?
3. What can I stop doing? (this is the hardest, most important question)
4. What support do I need that I'm not asking for?
5. What's the next 90-day visible milestone?

PERSONAL
1. Hobbies / relationships / health — score 1-10
2. Anyone I owe a thank-you / apology to?
3. Anyone I haven't seen in a while who matters to me?
```

Save these. Compare quarter-over-quarter. Patterns emerge over 2-3 quarters that you couldn't see in a single Friday review.

---

## Tooling (the minimal stack)

| Need                         | Tool                                             | Why                                           |
| ---------------------------- | ------------------------------------------------ | --------------------------------------------- |
| Calendar                     | Google Calendar                                  | Free, syncs everywhere                        |
| Notes                        | Obsidian                                         | Local, markdown, free                         |
| Tasks (project)              | Tara's task list (Claude)                        | Already in use                                |
| Tasks (personal)             | Obsidian daily notes                             | Same place as notes                           |
| Focus blocking               | Cold Turkey / Freedom / OS notification settings | Blocks distractions during deep code          |
| Time tracking (optional)     | Toggl / RescueTime                               | Only if you suspect you're misallocating time |
| Scheduling (others book you) | Cal.com or Calendly                              | For customer calls                            |
| Reading                      | Pocket / Readwise                                | Save articles; review weekly                  |
| Habit tracking (optional)    | Streaks / Loop                                   | Sleep, exercise, walking                      |

**Skip these unless needed:** project management apps (Asana/Linear/etc.), CRM, complex dashboards. You're one person. Simple wins.

---

## Phase-specific operational shifts

| Phase            | What changes                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| A (Months 0-6)   | Pure build mode. Customer day is mostly research/observation. 30h/week.                                         |
| B (Months 6-12)  | Wednesday becomes high-energy sales day. You're driving to properties. Document everything.                     |
| C (Months 12-24) | First real customers + first real money. Support load increases. Consider hiring a part-time community manager. |
| D+               | First hire(s). Most of these solo-founder rules dissolve; new rules apply. Different doc.                       |

---

## What this doc deliberately doesn't include

- Productivity techniques du jour (pomodoro, "deep work", "essentialism"). Pick what works for you; this doc just sets the structure.
- Specific apps reviews — they change too fast
- Social media growth tactics — that's the content strategy doc
- Hiring playbook — irrelevant Phase A-B

---

## When this doc changes

- Hit burnout warning → tighten the rules; document what you learned
- Try a new system that works → write up what changed
- Phase transition → revise the rhythm
- Major life event → adjust + don't pretend nothing changed
