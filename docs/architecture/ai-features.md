# AI Features Integration

How Tara uses AI across the product. **Pragmatic, not hype-driven.** Each feature has a clear ROI, a fallback, and a defined cost ceiling.

> Touches: [ADR-0006](../adr/0006-notification-orchestration.md) (n8n is the orchestrator), [`image-pipeline.md`](image-pipeline.md) (image quality + tagging covered there), [`07-money.md`](../domain/07-money.md) (cost discipline applies to AI calls too).

The user already has **Ollama + Flowise + n8n** running on the home server. This doc maps product features to those tools (free, local) vs. cloud APIs (Claude / GPT, paid but more capable).

---

## Core principle: local-first, cloud where it matters

| Use case shape                              | Run on...                      | Why                             |
| ------------------------------------------- | ------------------------------ | ------------------------------- |
| Batch, async, internal                      | **Ollama (local)**             | Free, no rate limits, privacy   |
| Real-time, guest-facing, high quality bar   | **Claude Haiku / GPT-4o-mini** | Speed + quality matter for UX   |
| Anything sensitive (passport scans if ever) | **Ollama (local)**             | Never send PII to a 3rd party   |
| Volume-heavy generation (article drafts)    | **Ollama overnight**           | Cost zero                       |
| User-perceived latency < 2s                 | **Claude Haiku via API**       | Local inference too slow on CPU |

**Default:** Ollama. Justify each cloud-API use case.

---

## Feature catalog (Phase B → C ordering)

### 1. Property description generator (Phase A, batch)

**Problem:** owners write bad descriptions ("Nice hostel, walk to beach"). Listings with rich descriptions convert ~30% better.

**Input:** structured property data (name, type, rooms, amenities, location, owner notes)
**Output:** 2-3 paragraphs of engaging copy + 3 headline variations

**Implementation:**

- Triggered on property publish or owner-clicks "Regenerate description"
- Flowise workflow: structured input → Llama 3.1 8B (via Ollama) → output
- Owner reviews, edits, accepts (always editable; AI suggests)
- Stored in `properties.description` (markdown)

**Why local:** batch, async, no latency concerns. Cost zero.

**Fallback:** if Ollama unavailable, owner writes own description. Not blocking.

**Prompt template:**

```
You are writing a friendly, honest description for a Philippines hostel listing.

Property details:
- Name: {name}
- Type: {property_type}
- Location: {city}, {region}
- Rooms: {room_summary}
- Amenities: {amenities}
- Owner notes: {owner_notes}

Write 2-3 paragraphs of warm, backpacker-friendly copy.
DO NOT exaggerate or make things up. Focus on what travelers will actually experience.
Mention the location and one specific thing about the property.
Avoid clichés like "hidden gem" or "home away from home".

Also generate 3 headline variations (under 80 chars each), each highlighting
a different angle (location, vibe, value).
```

---

### 2. AI photo quality + tagging (Phase A)

Covered in [`image-pipeline.md`](image-pipeline.md). Summary:

- **Llava (multimodal via Ollama)** rates each uploaded photo (quality, composition, type)
- Rejects clearly-bad uploads (low res, blurry, stock photos)
- Generates `alt_text` (accessibility + SEO)
- Auto-tags (bedroom/common/exterior/food)

All local, all batch, all free.

---

### 3. Translation (English ↔ Tagalog) (Phase B)

**Problem:** owners author content in Tagalog; guests browse in English (or vice versa). Manual translation doesn't scale.

**Where it runs:**

| Content                     | Approach                                                                 |
| --------------------------- | ------------------------------------------------------------------------ |
| Owner property descriptions | Ollama batch — auto-translate to all locales when owner saves            |
| Review text                 | On-demand via Claude Haiku ("[Translate this review]" button on listing) |
| UI strings                  | Human translation (with AI draft); committed to `messages/{locale}.json` |
| Email templates             | Human translation; React Email variants per locale                       |
| Owner support replies       | AI suggestion → founder edits                                            |

**Quality:** Llama 3.1 handles Tagalog reasonably well; Claude is noticeably better but costs money. For property descriptions (durable content) Llama is fine. For reviews (durable but viewed by many) Claude is worth $0.001/translation.

**Mark machine translations:** display with subtle "(auto-translated)" tag and a "show original" toggle.

---

### 4. Smart search (Phase C)

**Problem:** guests search in natural language ("beach hostel under ₱1500 with surf lessons"). Keyword search misses intent.

**Approach:**

```
Guest types query
   ↓
Claude Haiku (cheap, fast)
   ↓
{ region, max_price, must_have_amenities, vibe, activities }
   ↓
SQL query against properties + activities
   ↓
Results re-ranked by relevance
```

**Example translation:**

Input: "cheap surf hostel near pundaquit with private room and breakfast"
Output:

```json
{
  "region": "zambales",
  "city_or_area": ["pundaquit", "san-antonio"],
  "max_price_minor": 200000,
  "room_type_preference": "private",
  "amenities_required": ["breakfast_included"],
  "vibe_tags": ["surf"],
  "activities_nearby": ["surfing"]
}
```

This becomes a SQL query.

**Why Claude Haiku (cloud) here:** sub-second latency required, this is on the critical path. Costs ~₱0.05 per search. At 10k searches/mo = ₱500/mo. Acceptable in Phase C.

**Fallback:** if AI parse fails or unavailable, fall back to plain keyword search (Postgres FTS). Always works.

**Caching:** identical queries cached 1 hour. Reduces calls dramatically.

---

### 5. Property tagging / categorization (Phase B)

**Problem:** owners describe their properties differently. Hard to filter.

**Solution:** AI assigns canonical tags from a fixed taxonomy.

**Taxonomy (initial):**

- Vibe: `party`, `chill`, `family-friendly`, `digital-nomad`, `eco`, `budget`, `luxury`
- Activity-relevant: `surf`, `dive`, `hiking`, `beach`, `culture`, `city`, `nature`
- Crowd: `solo-travelers`, `couples`, `groups`, `families`, `lgbt-friendly`
- Property: `boutique`, `chain`, `family-run`, `women-owned`

**Implementation:** Llama 3.1 reads property description + photos (via Llava) → returns array of relevant tags.

Owner reviews, edits, approves. Tags drive filtering UI ("Surf hostels in Zambales").

---

### 6. Review summarizer (Phase B)

**Problem:** properties with 50+ reviews — guest can't read them all. Need a TL;DR.

**Output:**

- 3 "what guests loved" bullets
- 3 "what guests wish was better" bullets
- Average sentiment score (0-100)

**Implementation:** Llama 3.1 batch overnight. Stored on `properties.review_summary` jsonb column. Re-runs weekly (or on every 10 new reviews).

**Where shown:** above the review list on property page. Saves guests scrolling 30 reviews.

**Cost:** zero (local). Time: ~30 seconds per property. Daily cron handles all properties.

---

### 7. SEO meta description generator (Phase A)

**Problem:** Google search results show meta descriptions. Bad ones → low click-through.

**Solution:** Llama 3.1 generates 150-160 char descriptions optimized for the page topic.

- For property pages: focus on location + standout amenity
- For destination guides: focus on what travelers will learn
- For activity pages: focus on the experience + price

**Implementation:** triggered on content publish. Stored on the entity. Re-runs only if main content changes.

---

### 8. Owner support chatbot (Phase B, optional)

**Problem:** owners ask the same questions over and over ("how do I pause my listing?", "when do I get paid?", "how do I add another room?").

**Solution:** Flowise workflow with RAG (retrieval-augmented generation) over Tara's help docs.

**Architecture:**

```
Owner types question in dashboard widget
   ↓
Flowise: retrieve top-3 relevant docs from local vector DB (Chroma)
   ↓
Llama 3.1 + retrieved context → conversational answer
   ↓
Always includes "Still stuck? Contact founder" with WhatsApp link
```

**Why local:** owner data may surface (Q: "what's my Stripe ID?" — answer should fetch from DB). Better to keep AI local than send to OpenAI.

**Fallback:** if AI is unsure (confidence < 70%), direct user to WhatsApp founder.

**Phase to launch:** late B / early C. Phase B owners are friends — they WhatsApp the founder directly anyway.

---

### 9. Owner outreach personalization (Phase B founder tool)

**Problem:** founder is cold-outreaching Zambales hostels. Generic email = low response.

**Solution:** founder feeds hostel name + FB page URL → Llama 3.1 generates personalized email draft.

**Prompt:**

```
You are helping the founder of Tara reach out to a hostel owner.

Hostel: {name}
Location: {city}
FB page summary: {fb_page_text}  # scraped or pasted

Write a short, casual email (max 150 words) introducing Tara.
Be specific to what makes this hostel interesting (don't be generic).
Mention founder is a local in Zambales.
End with: "Want to grab a coffee in {city}? I can come by next week."
```

Founder edits, sends. Saves 10 minutes per outreach. At 50 outreaches → 8 hours saved.

**Phase B founder tool only**, in admin UI. Phase C automate further.

---

### 10. Dynamic pricing suggestions (Phase D — DEFER)

**Problem:** owners don't know whether to charge ₱600 or ₱800 for their dorm bed in shoulder season.

**Solution:** Llama 3.1 + booking data → suggest rate adjustments.

```
Input:
- Property historical pricing + occupancy
- Comparable nearby properties (scraped Booking.com — risky)
- Date range to suggest for
- Goal (maximize revenue / maximize occupancy / balanced)

Output:
- "Raise weekend rates +15% — competitors are 20% above you, you have 95% occupancy"
- Confidence score
```

**Why defer:** needs months of data to be useful. Phase D when we have it.

---

## Cost discipline

| Feature                         | Provider        | Calls/mo (Phase B est)    | Cost/mo      |
| ------------------------------- | --------------- | ------------------------- | ------------ |
| Property description generator  | Ollama          | 50 (one per property)     | ₱0           |
| Photo quality + tag             | Ollama (Llava)  | ~1,500 (30/property × 50) | ₱0           |
| Translation (descriptions)      | Ollama          | 50                        | ₱0           |
| Translation (reviews on-demand) | Claude Haiku    | ~200                      | ~₱10         |
| Property tagging                | Ollama          | 50                        | ₱0           |
| Review summarizer               | Ollama batch    | weekly per property       | ₱0           |
| SEO meta generator              | Ollama          | once per content          | ₱0           |
| Owner support chatbot           | Ollama + Chroma | ~100 queries              | ₱0           |
| Owner outreach personalization  | Ollama          | ~50 (founder use)         | ₱0           |
| Smart search (Phase C)          | Claude Haiku    | ~1,000                    | ~₱50         |
| **Phase B total**               |                 |                           | **~₱10/mo**  |
| **Phase C estimated**           |                 |                           | **~₱200/mo** |

If costs ever spike unexpectedly, the safety net: every Claude/GPT call goes through a single wrapper that enforces a monthly budget. Exceed → degrade to Ollama or fall back to non-AI.

---

## Architecture — how AI plugs into the stack

```
┌─────────────────────────────────────────────────────────┐
│  apps/api  /  apps/jobs                                 │
│  (calls AI through unified interface)                   │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴─────────────┐
        │                          │
        ▼                          ▼
   ┌─────────────┐          ┌──────────────┐
   │ packages/   │          │  Cloud API   │
   │ ai/         │          │  client      │
   │             │          │              │
   │ - Ollama    │          │  - Claude    │
   │ - Flowise   │          │  - OpenAI    │
   │ - Local     │          │              │
   │   chroma    │          │              │
   └─────────────┘          └──────────────┘
```

`packages/ai/` exposes a single interface:

```ts
export type AiProvider = 'ollama' | 'claude-haiku' | 'claude-sonnet' | 'gpt-4o-mini';

export interface AiClient {
  generate(opts: {
    provider: AiProvider;
    prompt: string;
    system?: string;
    maxTokens?: number;
    temperature?: number;
    images?: Buffer[];
  }): Promise<{ text: string; cost_usd: number; latency_ms: number }>;
}
```

The choice of provider lives in the calling code (not deep in the package). Makes it grep-able: where does Tara spend AI money?

---

## Observability

Every AI call logs:

```ts
log.info('ai.call', {
  feature: 'property-description',
  provider: 'ollama',
  model: 'llama3.1:8b',
  input_tokens: 450,
  output_tokens: 280,
  latency_ms: 3200,
  cost_usd: 0,
  success: true,
});
```

Aggregated in Grafana:

- **Cost per feature, per day** — alert if any feature's cost doubles week-over-week
- **Latency p95 per provider** — alert if Ollama > 30s, Claude > 5s
- **Failure rate** — alert if > 5% over an hour

---

## Quality safeguards

AI outputs are reviewed by humans for these features:

| Feature                  | Review who     | When                                        |
| ------------------------ | -------------- | ------------------------------------------- |
| Property descriptions    | Owner          | Before publish                              |
| Photo tags               | Owner          | Optional re-tagging in dashboard            |
| Translations             | Optional       | Owner can override                          |
| Owner support chatbot    | Founder weekly | Read 20 random transcripts, fix bad answers |
| Smart search             | Aggregate      | Weekly review of low-conversion queries     |
| Outreach personalization | Founder        | Always edits before send                    |

AI is **augmentation**, never **automation** for anything customer-facing.

---

## What we deliberately don't use AI for

| Use case                                           | Why not                                                       |
| -------------------------------------------------- | ------------------------------------------------------------- |
| Pricing decisions                                  | High stakes; rules engine is more predictable + auditable     |
| Cancellation/refund decisions                      | Policy-driven, must be deterministic for trust                |
| Auto-responding to guest complaints                | Risk of saying the wrong thing publicly                       |
| Auto-approving photos with sensitive content       | Too high-stakes (e.g., something inappropriate slips through) |
| Fake review generation                             | Illegal in many jurisdictions; absolutely never               |
| Manipulating search results to favor paying owners | Trust killer; never                                           |
| Auto-generating fake property listings             | We're not Yelp                                                |

The line: AI assists humans. Humans make decisions with money or reputation impact.

---

## Implementation order (matches the phase plan)

**Phase A (Months 0-6):**

- Image pipeline AI (covered)
- Property description generator
- SEO meta generator
- Property tagging

**Phase B (Months 6-12):**

- Translation (descriptions)
- Review summarizer
- Owner outreach personalization (founder tool)
- Owner support chatbot (late B)

**Phase C (Months 12-24):**

- Smart search
- On-demand review translation (Claude)
- Improved owner support chatbot
- Cost guardrails enforced via wrapper

**Phase D+ (Year 2-3):**

- Dynamic pricing suggestions
- Demand forecasting
- Personalized recommendations for guests
- More sophisticated chatbot for guest support

---

## When this doc changes

- New AI feature → add to catalog with provider + cost estimate
- Provider swap (e.g., Llama 4 ships) → benchmark, update prompts
- Cost overruns → add to monthly cost summary, decide if Phase-C feature gets unlock
- New use case rejected → add to "what we don't use AI for"
