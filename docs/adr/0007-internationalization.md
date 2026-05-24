# ADR-0007: Internationalization — English + Tagalog from day 1

- **Status:** Accepted
- **Date:** 2026-05-24
- **Deciders:** Founder

## Context

Tara launches in the Philippines. Both audiences need different language support:

- **Guests** are a mix of Filipino domestic travelers (Tagalog-comfortable, English-fluent), international backpackers (English-only), and OFW return-trips (English + their region's language). English is the lingua franca but Tagalog content increases trust + conversion for the Filipino market.
- **Owners** are PH small-business owners, often more comfortable in Tagalog than English. Forcing English-only dashboards loses a meaningful share of potential supply.

Future expansion: Cebuano (Visayas), Ilonggo (Iloilo), then possibly Bahasa Indonesia / Thai / Vietnamese as we expand SE Asia.

**The critical insight:** retrofitting i18n into a codebase that wasn't built for it is months of pain. Designing for it from day 1 costs almost nothing extra. So we decide now, before the apps are scaffolded.

## Decision

**Use `next-intl` as the i18n library, with locale-prefixed URLs, JSON files for UI strings, and database storage for content that owners author.**

### Locales at launch
- `en` (English) — default for international guests and as fallback
- `tl` (Tagalog/Filipino) — for owner dashboard + guest-facing Filipino market

### Future locales (architecture must support, not built yet)
- `ceb` (Cebuano)
- `hil` (Ilonggo)
- `id` (Bahasa Indonesia) — SE Asia expansion
- `th` (Thai), `vi` (Vietnamese) — further expansion

### URL strategy

Locale prefix in every URL:

```
https://tara.ph/en/zambales/san-antonio          ← English
https://tara.ph/tl/zambales/san-antonio          ← Tagalog
```

**Why prefix over subdomain or query param:**
- Good for SEO (each locale is a distinct indexable URL)
- Works with Next.js App Router built-in i18n routing
- Easy hreflang tags for search engine targeting
- Locale is visible in URL (good for sharing, debugging)

### Where translations live

| Content type | Storage | Edited by |
|---|---|---|
| UI strings (buttons, labels, errors) | JSON files in `packages/i18n/messages/{locale}.json` | Developer, committed to git |
| Marketing copy (homepage, about, guides) | DB table `content_translation` | Founder, via admin UI |
| Property descriptions | DB row, multilingual columns | Owner |
| Reviews | DB row in original language only | Guest |
| Email templates | React Email component with locale prop | Developer |

### Locale detection precedence

1. URL prefix (`/en/...`, `/tl/...`) — explicit wins
2. User preference in profile (logged-in users)
3. Cookie from previous visit
4. `Accept-Language` browser header
5. Fallback: `en`

### Translation strategy for content

- **UI strings:** human translation (or starting with machine, refined by user/native speakers later)
- **Marketing content:** founder writes in English, AI drafts Tagalog (via Ollama or Claude), founder reviews
- **Property descriptions:** owner writes in their language, AI translates on-demand to viewer's locale, marked as "auto-translated"
- **Reviews:** stored in original language. Display with optional "Translate this review" button (lazy)

### Money & date formatting

- **Currency:** PHP default; secondary USD display via toggle. Stored as integer minor units (cents) in DB. Format via `Intl.NumberFormat`.
- **Dates:** stored as UTC; rendered in property's local timezone (PH = UTC+8). Format via `Intl.DateTimeFormat` with locale.
- **Plural forms:** use ICU MessageFormat (next-intl supports it). Important for Tagalog noun handling.

## Alternatives considered

- **English-only at launch** — Rejected. Loses ~30-50% of potential PH owner-side conversion. Cost to add Tagalog later is much higher than now.
- **`react-i18next` instead of `next-intl`** — Mature, language-agnostic, but doesn't integrate as cleanly with App Router server components. Passed.
- **`@lingui/react` with extraction** — Good for large codebases with many translators. Overkill for a 2-locale start; can migrate later if needed.
- **Subdomain per locale (`en.tara.ph`, `tl.tara.ph`)** — Bigger SEO win for some setups but adds DNS/cert complexity and breaks "single brand" feel. Passed.
- **Query param locale (`?lang=tl`)** — Bad for SEO (often treated as duplicate content). Rejected.
- **Cloudflare auto-translate at the edge** — Too lossy and unreliable for production content. Rejected for primary use; keep as accessibility fallback for unsupported locales.
- **Storing all translations in DB** — Rejected for UI strings (versioning/diffing in git is critical for those). Accepted for owner-authored content (where versioning is per-row anyway).

## Consequences

**Positive**

- Adding new locales later = adding a JSON file + writing content. No code refactor needed.
- SEO benefits per locale (each `/tl/zambales` URL can rank in Filipino searches).
- Owner-facing dashboards in Tagalog significantly improve supply-side conversion.
- AI translation reduces friction for owner-authored content.
- App Router + RSC works cleanly with `next-intl` server-component support.

**Negative / trade-offs**

- Slight ceremony in every UI component: `t('button.save')` instead of `'Save'`.
- Build complexity: routes are duplicated per locale (App Router handles this).
- Translation maintenance burden grows linearly with locales.
- Content moderation in multiple languages is harder than English-only.

**Neutral / things to watch**

- Tagalog translation quality from machine models varies. Plan for human review of important strings.
- Currency display rules in PH: many sites show as "₱1,500" or "PHP 1,500" or "P1,500" — pick one and stick with it. Recommendation: `₱1,500` (symbol, comma separators).
- Right-to-left languages (Arabic, Hebrew) would require CSS support if ever expanded — not now.

## Implementation notes

### Package layout

```
packages/i18n/
├── package.json
├── src/
│   ├── index.ts                 # exports next-intl helpers
│   ├── config.ts                # locales, defaults
│   └── formatters.ts            # money, date, plural helpers
└── messages/
    ├── en.json                  # UI strings, English
    ├── tl.json                  # UI strings, Tagalog
    └── README.md                # contribution guide for translators
```

### Server component usage (Next.js)

```tsx
import { getTranslations } from 'next-intl/server';

export default async function PropertyPage() {
  const t = await getTranslations('property');
  return <h1>{t('book_now')}</h1>;
}
```

### Client component usage

```tsx
'use client';
import { useTranslations } from 'next-intl';

export function BookButton() {
  const t = useTranslations('property');
  return <button>{t('book_now')}</button>;
}
```

### Property description multilingual storage

```ts
property_description {
  property_id: uuid,
  locale: 'en' | 'tl' | 'ceb' | ...,
  content: text,
  source: 'authored' | 'machine_translated' | 'human_translated',
  updated_at: timestamp,
}
```

Display logic: prefer authored in viewer's locale → fall back to machine-translated in viewer's locale (with badge) → fall back to authored in any locale (with translate button).

### Translation extraction & tooling

- `next-intl` has VS Code extension for inline preview of keys
- Linter rule: no string literals in JSX (must go through `t()`)
- CI check: every key in `en.json` exists in `tl.json` (warn, don't fail — translations lag is OK)

## References

- [next-intl docs](https://next-intl-docs.vercel.app/)
- [Next.js App Router i18n](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [Unicode CLDR](https://cldr.unicode.org/) — locale data
- [ADR-0001 — Tech stack](0001-tech-stack.md)
- Memory: `project_hostel_booking_platform.md`
