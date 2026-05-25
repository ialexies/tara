# SEO Strategy

How Tara wins organic search traffic. **The most underrated growth lever for a bootstrapped travel platform** — and one where we have a genuine advantage over Hostelworld and Klook.

> Related: `memory/content_strategy.md` (founder content rhythm), [`ai-features.md`](../architecture/ai-features.md) (AI-assisted content production), [ADR-0007](../adr/0007-internationalization.md) (i18n affects URL structure), [`analytics.md`](../architecture/analytics.md) (measurement).

This doc is the strategy. Implementation details (Next.js setup, structured data) are at the bottom.

---

## Why SEO matters disproportionately for Tara

Travel is the rare category where SEO traffic = high-intent buyers. Someone Googling "hostel in San Antonio Zambales" is _seconds away_ from spending money. Compare to typical SaaS where "best CRM" searchers are months from purchase.

Specifically for Tara:

| Channel                    | What it costs               | Quality                               |
| -------------------------- | --------------------------- | ------------------------------------- |
| Google Ads                 | ₱8-30/click                 | Good intent, but bidding war forever  |
| Meta Ads                   | ₱1-5/click                  | Lower intent, retargeting only useful |
| SEO (organic)              | Time (compounds over years) | Highest intent, free, durable         |
| Social (TikTok/IG organic) | Time                        | Discovery, awareness, vibes           |
| OTAs (Booking/Hostelworld) | 15% commission              | Theirs, not ours                      |

**SEO is the only channel where the asset is yours.** Every article that ranks brings free traffic for years. Every ad you pause stops working immediately.

### The Zambales opportunity (genuinely undervalued)

Search "hostels in San Antonio Zambales" right now (2026). What you see:

- 1 Hostelworld page (decent but generic)
- 1 Booking.com page (paid placement)
- 2-3 outdated travel blogs (from 2019)
- Zero Tara-quality local content

This is an **underserved SERP**. With 6 months of disciplined content, Tara can own page 1 for hundreds of long-tail Zambales queries.

Most local destinations in PH are like this. We can replicate the Zambales playbook in Siargao, Coron, El Nido, Cebu as we expand.

---

## The 3-layer content strategy

### Layer 1: Property pages (the SKUs)

Every property is a page. These rank for:

- `<property name> zambales`
- `<property name> reviews`
- `<property name> booking`
- Long-tail: `<property name> with surf lessons`

**Requirements per property page:**

- Server-rendered (Next.js App Router RSC) — no client-side rendering for SEO content
- Rich photos (per `image-pipeline.md`)
- Substantial description (300+ words minimum, AI-assisted via `ai-features.md`)
- Real reviews displayed
- Schema.org `LodgingBusiness` + `Review` + `BreadcrumbList` markup
- Clear pricing visible
- Map embed
- "Near you" section linking to other properties (internal links)
- Mobile-perfect (most discovery happens on phones)

### Layer 2: Destination pages (the categories)

`/en/zambales`, `/en/zambales/san-antonio`, `/en/zambales/pundaquit`, etc.

These rank for the high-volume queries:

- `hostels in zambales`
- `where to stay in pundaquit`
- `best hostels san antonio zambales`

**Structure of a destination page:**

1. Hero (location photo, brief vibe description)
2. List of properties in this destination (sortable, filterable)
3. "Things to do" section (links to tours per `05-tours.md`)
4. "When to visit" (seasonal info)
5. "How to get there" (transport from Manila)
6. "FAQ for travelers" (5-10 common questions)
7. Schema.org `TouristDestination` + `ItemList` of properties

Generated programmatically. Each one is a real page with real depth, not a thin SEO doorway.

### Layer 3: Guide content (the funnel top)

Long-form articles that bring travelers who don't yet know exactly where they want to go:

- `Best time to surf Zambales`
- `Anawangin vs. Capones: which to visit first?`
- `A weekend in Zambales — full itinerary`
- `How to get to Zambales from Manila (2026 guide)`
- `Zambales packing list for surfers`
- `5 day Zambales itinerary for first-timers`
- `Pundaquit vs. San Antonio: where to stay?`

These rank for top-of-funnel searches and convert readers into bookers months later. **Highest long-term ROI.**

**Founder writes 2 articles/month** (per `memory/content_strategy.md`). AI-assisted drafts, founder edits, publishes.

### Internal linking strategy

Every page links to the others in a deliberate web:

- Guides link to relevant destinations
- Destinations link to relevant properties
- Properties link to nearby tours
- Tours link to recommended accommodation
- Articles link to related articles ("you might also enjoy...")

This is the single most underrated SEO technique. Pages that are well-linked-to internally rank dramatically better than orphan pages.

---

## Technical SEO requirements

### Server-side rendering (non-negotiable)

Next.js 15+ App Router with React Server Components. All public pages render HTML on the server. Google indexes the rendered HTML, not a JS shell.

- Property pages: `force-static` with on-demand revalidation when owner edits
- Destination pages: ISR (revalidate every 24h)
- Guides: `force-static`
- Search results: dynamic (don't need to rank; they index destination pages instead)

### URL structure

Per [ADR-0007](../adr/0007-internationalization.md):

```
https://tara-stays.com/
  /en/                                    home (English)
  /tl/                                    home (Tagalog)
  /en/zambales                            destination
  /en/zambales/san-antonio                sub-destination
  /en/properties/marias-surf-hostel       property (canonical slug)
  /en/guides/best-time-surf-zambales      guide article
  /en/tours/anawangin-island-hopping      activity
  /en/search?...                          dynamic (noindex)
```

**Rules:**

- Lowercase, hyphen-separated slugs
- Locale ALWAYS in the path (`/en/`, `/tl/`)
- No trailing slash (consistent)
- Slugs are immutable — once published, never change (or 301 redirect)
- IDs not in URLs (`/properties/abc-123` not `/properties/uuid-456`)

### hreflang tags (mandatory for multilingual)

Every page declares its locale alternates:

```html
<link rel="alternate" hreflang="en" href="https://tara-stays.com/en/zambales" />
<link rel="alternate" hreflang="tl" href="https://tara-stays.com/tl/zambales" />
<link rel="alternate" hreflang="x-default" href="https://tara-stays.com/en/zambales" />
```

This tells Google "these are the same page in different languages." Prevents duplicate content penalties.

Auto-generated in `apps/web/app/[locale]/layout.tsx`.

### Schema.org structured data

This is the biggest SEO quick-win. Most travel sites don't do it well.

**Per property page:**

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "name": "Maria's Surf Hostel",
    "description": "...",
    "image": ["https://images.tara-stays.com/.../hero.jpg"],
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "...",
      "addressLocality": "San Antonio",
      "addressRegion": "Zambales",
      "addressCountry": "PH"
    },
    "geo": { "@type": "GeoCoordinates", "latitude": 14.93, "longitude": 120.06 },
    "telephone": "+63...",
    "priceRange": "₱600-1500",
    "starRating": { "@type": "Rating", "ratingValue": 4.7 },
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": 4.7, "reviewCount": 42 },
    "amenityFeature": [
      { "@type": "LocationFeatureSpecification", "name": "WiFi", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Air Conditioning", "value": true }
    ],
    "review": [
      {
        "@type": "Review",
        "author": { "@type": "Person", "name": "Jane D." },
        "datePublished": "2026-04-15",
        "reviewRating": { "@type": "Rating", "ratingValue": 5 },
        "reviewBody": "..."
      }
    ]
  }
</script>
```

**Per destination page:**

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    "name": "Zambales, Philippines",
    "description": "...",
    "image": "...",
    "containedInPlace": { "@type": "Country", "name": "Philippines" }
  }
</script>
```

**Per guide article:**

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Best Time to Surf Zambales",
  "datePublished": "2026-05-20",
  "dateModified": "2026-05-22",
  "author": { "@type": "Person", "name": "Tara Founder" },
  "publisher": { "@type": "Organization", "name": "Tara" },
  "image": "..."
}
```

**Breadcrumbs on every nested page:**

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://tara-stays.com/en" },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Zambales",
        "item": "https://tara-stays.com/en/zambales"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "San Antonio",
        "item": "https://tara-stays.com/en/zambales/san-antonio"
      }
    ]
  }
</script>
```

Implementation: helper `getStructuredData(type, entity)` in `packages/seo/`.

### Sitemap + robots.txt

**`apps/web/app/sitemap.ts`** (Next.js auto-generated):

- All public property pages
- All destination pages
- All published guide articles
- All published tour pages
- Locale variants for each
- Updated lastModified per row

**`apps/web/app/robots.ts`**:

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /superadmin
Disallow: /api
Disallow: /checkout
Disallow: /*?utm_*  # don't index UTM-tagged URLs

Sitemap: https://tara-stays.com/sitemap.xml
```

### Page speed targets (Core Web Vitals)

Aligns with performance budgets task (#28):

| Metric                          | Target  | Why                                |
| ------------------------------- | ------- | ---------------------------------- |
| LCP (Largest Contentful Paint)  | < 2.0s  | Google ranks by this directly      |
| INP (Interaction to Next Paint) | < 200ms | Replaced FID as Core Vital in 2024 |
| CLS (Cumulative Layout Shift)   | < 0.1   | Prevents annoying layout jumps     |

Measured via Lighthouse CI on every PR (Phase C). Failing PRs blocked from merge.

Tactics from `image-pipeline.md` (lazy loading, blur-up, srcset) directly serve these.

### Mobile-first indexing

Google's primary index is mobile-first. We test mobile first:

- Touch targets ≥ 44px
- No horizontal scroll
- Text ≥ 16px (browser doesn't zoom)
- Tap-friendly carousels (swipe, not arrows)

---

## Content production pipeline

### Cadence (per `memory/content_strategy.md`)

- **2 articles/month** on platform blog (founder + AI-assisted)
- **2-3 short videos/week** on TikTok + Instagram (cross-platform reuse)
- **2 LinkedIn posts/week** (building-in-public)
- **Destination pages**: generated as inventory expands (1 per city + 1 per sub-area)
- **Property pages**: generated as owners onboard

### Per-article workflow (founder, 2-3 hours)

1. **Choose topic** from backlog (informed by Search Console: what queries are showing impressions but no clicks?)
2. **Outline** with AI assist (Llama 3.1 batch)
3. **Write draft** (founder, with AI suggestions for phrasing)
4. **Find/create 4-8 images** (own photos preferred; stock + Unsplash backup)
5. **Add structured data** (Article schema auto-included via template)
6. **Internal links** (link to ≥ 3 other Tara pages)
7. **Meta description** (AI generated; founder approves; 150-160 chars)
8. **Publish** (markdown commit; auto-deploys)
9. **Share** (LinkedIn + Twitter + FB groups)
10. **Submit URL in Search Console** for faster indexing

### Article ideas backlog (Phase B starter set)

20 articles to write in Phase B (covers most high-volume Zambales queries):

```
Anawangin guides:
  - "Anawangin Island Hopping: complete 2026 guide"
  - "Camping at Anawangin: what to bring"
  - "How to get to Anawangin from Manila"

Surfing:
  - "Best time to surf Zambales (month-by-month)"
  - "Surf hostels in San Antonio Zambales"
  - "Beginner surf lessons in Zambales: where to go"
  - "Crystal Beach vs. Pundaquit for surfing"

San Antonio specific:
  - "Where to stay in San Antonio Zambales"
  - "Things to do in San Antonio Zambales (besides surfing)"

Pundaquit specific:
  - "Pundaquit travel guide 2026"
  - "Best hostels in Pundaquit"

Itineraries:
  - "Weekend in Zambales itinerary"
  - "3-day Zambales backpacker trip"
  - "Solo female travel in Zambales: a guide"

Practical:
  - "How to get from Manila to Zambales (bus, van, drive)"
  - "Zambales budget travel: costs breakdown 2026"
  - "Best beaches in Zambales (ranked)"
  - "Zambales packing list"

Adjacent:
  - "Mt. Pinatubo tour from Zambales: worth it?"
  - "Subic vs. Zambales: which to visit?"
```

That's a year of content if writing 2/month. Each one targets a real search query.

---

## Local SEO (for properties + Tara itself)

### Google Business Profile (per property)

Encourage every owner to claim their property's Google Business Profile. Tara's value-add:

- Helper article: "How to claim and optimize your Google Business Profile"
- AI-generated description suggestions
- Photo upload tool (reuses what they uploaded to Tara)
- Phase C: Tara can manage GBPs for premium-tier owners

Why this matters: GBP gets premium SERP placement (Google Maps integration). Properties without GBP lose to those with it, regardless of Tara presence.

### Tara's own Google Business Profile

- Register Tara as a tech company in Zambales
- Founder photo, contact info, business hours (founder availability)
- Builds Tara brand search authority

---

## Link building (the bootstrap version)

Backlinks are still the strongest ranking factor. We can't pay for them (and shouldn't). Strategies that work without budget:

### 1. Owner-side backlinks (highest ROI, near-free)

Every onboarded owner can link to their Tara page from:

- Their FB page
- Their Instagram bio
- Their email signature
- Their existing website (if any)

We make this easy:

- Tara provides a "share" button on every owner's property page
- Suggested copy: "Now booking on Tara. Direct link in bio."
- Bonus content: small badge image they can embed

20 active owners × 4 backlinks each = 80 backlinks. Real impact.

### 2. Press / blog mentions

PH travel bloggers (mid-tier, real audiences):

- Niche: surf, backpacker, weekend trip blogs
- Pitch: "Hi, I'm building a local platform for PH hostels. Want to write about Zambales? I can connect you with owners + arrange a free stay."
- 1 out of 10 says yes. Each placement = 1 high-quality backlink + readership.

Goal: 5-10 placements in Phase B.

### 3. PH startup/founder press

- TaraStays = relatable founder story
- Pitch to: Esquire PH, Rappler, Inc., Tech in Asia, PH Daily Inquirer business section
- Angle: "Filipino engineer builds homegrown Hostelworld alternative starting in Zambales"
- Long-tail; some bite over time

### 4. Community / forum presence

- FB groups: Backpacker Philippines, Surfers PH, Manila Weekend Trips, Zambales Locals
- Reddit: r/Philippines, r/PhilippineTravels (no spam — be helpful)
- TripAdvisor forums (answer questions about Zambales; subtle)

These aren't direct backlinks but build:

- Awareness (mentions get clicked even without links)
- Founder credibility
- Eventual direct links when value compounds

### 5. Tour operator partnerships

Per `05-tours.md`: when tour operators list with us, they often have small sites or FB pages. They link to Tara properties; Tara links back. Mutual.

### Anti-patterns

- ❌ **Buying backlinks** (PBN, Fiverr cheap links) — Google penalizes
- ❌ **Link exchanges with random sites** — Google sees these patterns
- ❌ **Comment spam** — wasted effort, looks scammy
- ❌ **Fake "guest posts" on low-quality sites** — devalues your domain

---

## SEO measurement

### Google Search Console (mandatory from day 1)

The single most important free tool. Track:

| Report                  | Watch for                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------- |
| **Performance**         | Impressions trending up? Click-through rate per query? Average position improving? |
| **Coverage / Indexing** | All pages indexed? Any errors?                                                     |
| **Core Web Vitals**     | Are we passing? Mobile + desktop?                                                  |
| **Mobile usability**    | Any issues?                                                                        |
| **Sitemaps**            | Submitted, processed correctly?                                                    |
| **Links**               | Who links to us? (backlink discovery)                                              |

Founder reviews monthly during the Friday weekly review ritual.

### Rank tracking

For top 30 keywords (per market), track weekly position:

```
KEYWORDS TO RANK (Zambales Phase B):
- "hostels in zambales"
- "where to stay in zambales"
- "surf hostel zambales"
- "pundaquit hostels"
- "san antonio zambales hostels"
- "anawangin tour"
- "anawangin camping"
- "zambales surfing"
- "best beach zambales"
- "manila to zambales"
- ... (20 more)
```

Tools (free → cheap):

- **Google Search Console** (free, official, gold standard)
- **Plausible Analytics** for SEO traffic share
- **Manual checks** monthly via incognito search
- **Ahrefs Webmaster Tools** (free for owned domains; backlink data)
- **Phase C+:** consider SE Ranking (~$30/mo) or Serpstat for daily rank tracking

### KPIs to watch

| Metric                       | Target Phase B | Target Phase C |
| ---------------------------- | -------------- | -------------- |
| Organic sessions/month       | 500            | 5,000          |
| Indexed pages                | 100+           | 1,000+         |
| Top-10 ranking keywords      | 10             | 100            |
| Backlinks (domains)          | 20             | 100            |
| Core Web Vitals: passing %   | 90%+           | 95%+           |
| Organic → booking conversion | 1-2%           | 2-3%           |

---

## SEO + AI = competitive moat

We can do things Hostelworld can't (because they're too big to invest in):

1. **AI-generated meta descriptions** per page (already in `ai-features.md`) — better CTR
2. **AI-generated alt text** for every photo — accessibility + image SEO
3. **AI-suggested internal links** when publishing new content
4. **AI-generated FAQ sections** per destination based on common questions
5. **AI-suggested article topics** based on Search Console "impressions but no clicks" queries

These are 80% of what an SEO consultant would do, automated, free. Compound advantage.

---

## What NOT to do (anti-patterns)

| Don't                                                                       | Why                                      |
| --------------------------------------------------------------------------- | ---------------------------------------- |
| Keyword stuff ("Zambales hostel Zambales beach Zambales cheap Zambales...") | Google penalizes; humans hate it         |
| Generate thin content (200-word articles)                                   | Won't rank; might hurt domain reputation |
| Auto-generate property pages with zero unique content                       | Same as above                            |
| Hide text in white-on-white                                                 | Cloaking; penalized                      |
| Use clickbait that doesn't match content                                    | High bounce → ranking drops              |
| Buy backlinks                                                               | Manual penalty; very hard to recover     |
| Copy descriptions from other sites                                          | Duplicate content; gets filtered         |
| Forget meta descriptions (let Google auto-pick)                             | Random snippets hurt CTR                 |
| Create separate pages for tiny query variations                             | Google sees them as duplicates anyway    |
| Spam Reddit / forums with links                                             | Banned + reputation damage               |
| Skip alt text on images                                                     | Accessibility + image SEO loss           |

---

## SEO sprints (Phase rollout)

### Pre-launch (Phase A)

- [ ] Domain registered (✅ done: tara-stays.com)
- [ ] Google Search Console + Bing Webmaster verified
- [ ] robots.txt + sitemap.xml generated
- [ ] Schema.org helper in `packages/seo/`
- [ ] hreflang implementation tested
- [ ] Core Web Vitals baseline measured (Lighthouse CI in #28)
- [ ] First 5 guide articles drafted

### Phase B launch (Months 6-12)

- [ ] 20 articles published (the backlog above)
- [ ] All onboarded properties have schema.org markup
- [ ] All destination pages live with proper structure
- [ ] Internal linking audit
- [ ] First 20 owner-side backlinks collected
- [ ] 5 press placements in PH travel media
- [ ] Founder personal LinkedIn brings traffic to brand

### Phase C (Months 12-24)

- [ ] Rank tracking tool (SE Ranking or similar)
- [ ] Article cadence sustained: 2/month, 24/year
- [ ] Outreach for 50 backlinks/year (sustainable)
- [ ] Expand destination pages beyond Zambales (Siargao, El Nido)
- [ ] FAQ content generated via AI per destination
- [ ] Internal linking automation (suggest links at publish time)

### Phase D+

- [ ] Multi-language content (Tagalog full translation of all guides)
- [ ] Local SEO push (Google Business Profile for every Tara property)
- [ ] Expand to international long-tail (backpacker.eu, etc. partnerships)
- [ ] Consider hiring part-time SEO writer

---

## The compounding magic

Most SEO articles take 3-6 months to start ranking. The first few feel useless. **Stay the course.** A consistent 2-articles-per-month schedule for 12 months = 24 articles, of which ~15 rank on page 1 within 6-18 months. Those 15 articles drive 80%+ of long-term organic traffic. Forever.

This is the bootstrapper's superpower. You can't buy the equivalent of 24 well-ranking articles for ₱100,000 in ad budget — it just doesn't work that way. **Time + discipline > money.**

---

## Implementation (Phase A bootstrap)

```ts
// packages/seo/structured-data.ts
export function propertyStructuredData(property: Property): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: property.name,
    description: property.description,
    image: property.photos.map((p) => p.url),
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.address,
      addressLocality: property.city,
      addressRegion: property.region,
      addressCountry: property.country_iso,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: property.lat,
      longitude: property.lng,
    },
    priceRange: `${currencySymbol(property.currency)}${property.min_rate}-${property.max_rate}`,
    aggregateRating:
      property.review_count > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: property.avg_rating,
            reviewCount: property.review_count,
          }
        : undefined,
  });
}
```

```tsx
// apps/web/app/[locale]/properties/[slug]/page.tsx
import { propertyStructuredData } from '@tara/seo';

export default async function PropertyPage({ params }) {
  const property = await fetchProperty(params.slug);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: propertyStructuredData(property),
        }}
      />
      <main>{/* render listing */}</main>
    </>
  );
}

export async function generateMetadata({ params }) {
  const property = await fetchProperty(params.slug);
  return {
    title: `${property.name} | ${property.city}, ${property.region} | Tara`,
    description: property.meta_description, // AI-generated
    alternates: {
      languages: { en: `/en/properties/${property.slug}`, tl: `/tl/properties/${property.slug}` },
    },
    openGraph: {
      type: 'website',
      title: property.name,
      description: property.meta_description,
      images: property.photos.slice(0, 1).map((p) => p.url_og),
      locale: params.locale,
    },
  };
}
```

This is the minimum for a single property page. Same pattern for destinations, guides, tours.

---

## When this doc changes

- New schema.org type adopted → add helper + example
- New ranking keyword emerges → add to tracking list
- Google algorithm major shift → revisit strategy
- New backlink source identified → add to playbook
- Anti-pattern discovered the hard way → add to list
