# Image Pipeline Architecture

How Tara handles photos — from owner upload to guest display. **Photos ARE the product** for hostels. A property with bad photos doesn't get booked, no matter how good the listing copy.

> Read [`01-inventory.md`](../domain/01-inventory.md) (Decision 5 on per-room vs per-property photos) and [ADR-0001](../adr/0001-tech-stack.md) (Cloudflare R2 for storage).

This doc covers: upload, processing, storage, delivery, optimization, quality gates, fraud detection.

---

## Why this matters more than people realize

Airbnb's early growth hack: they hired professional photographers to shoot host listings for free. Listings with pro photos earned 2-3× more bookings than ones with bad phone photos. Same property — completely different conversion rate.

For Tara, we can't hire photographers (Phase B budget). But we **CAN** build software that:

1. Helps owners take/upload better photos
2. Rejects clearly bad uploads before they go live
3. Detects stock photos / Hostelworld scrapes (fraud)
4. Delivers photos blazingly fast on every device (better than Hostelworld's app)
5. Reduces image weight for slow PH mobile networks

That's the wedge: **better photos than the incumbents, automated.**

---

## The pipeline at a glance

```
   Owner phone/desktop
         │
         │  Upload (max 10MB per image)
         ▼
   ┌──────────────────────────┐
   │  apps/api  /upload-photo │
   │  - Validate type/size    │
   │  - Generate signed URL   │
   └────────────┬─────────────┘
                │  Direct upload to R2 (PUT signed URL)
                ▼
   ┌──────────────────────────┐
   │  Cloudflare R2 bucket    │  <  original.jpg
   │  /property/{id}/orig/    │
   └────────────┬─────────────┘
                │  R2 event (or BullMQ webhook)
                ▼
   ┌──────────────────────────┐
   │  apps/jobs               │
   │  ProcessUploadedPhoto:   │
   │  - Read EXIF             │
   │  - Strip GPS/PII         │
   │  - Generate hash         │
   │  - AI quality check      │
   │  - Reverse image search  │
   │  - INSERT photo row      │
   └────────────┬─────────────┘
                │
                ▼
   ┌──────────────────────────────────────────┐
   │  Approved? → publishes to listing        │
   │  Rejected? → owner sees reason in dash   │
   └──────────────────────────────────────────┘

   Guest request
         │
         │ <img src="https://images.tarastays.com/property/{id}/abc.jpg?w=800&format=webp">
         ▼
   ┌──────────────────────────────────────────┐
   │  Cloudflare Image Resizing (CDN)         │
   │  - Reads original from R2 once           │
   │  - Resizes to requested dimensions       │
   │  - Converts to WebP/AVIF if browser supports│
   │  - Caches at edge globally               │
   └──────────────────────────────────────────┘
```

---

## Storage — Cloudflare R2

**Bucket layout:**

```
tara-photos-prod/
├── property/
│   └── {property_id}/
│       ├── orig/                        # untouched originals (private)
│       │   ├── {photo_id}.jpg
│       │   └── ...
│       └── derived/                     # processed variants (public via CDN)
│           ├── {photo_id}-hero.webp
│           ├── {photo_id}-1600.webp
│           ├── {photo_id}-800.webp
│           └── {photo_id}-thumb.webp
├── room/
│   └── {room_id}/...
├── activity/
│   └── {activity_id}/...
└── user-avatar/
    └── {user_id}/...
```

**Why R2 over S3:**

- Zero egress fees (S3 charges ~$0.09/GB outbound; that's the killer for image-heavy sites)
- S3-compatible API (use AWS SDK)
- Cloudflare-native — pairs cleanly with their Image Resizing
- Storage cost: ~$0.015/GB/month (cheaper than S3 standard)

**Phase B cost estimate:** 50 properties × ~30 photos each × ~2MB original = 3GB. Storage: $0.05/mo. Negligible.

**Encryption:** R2 encrypts at rest by default. We don't add client-side encryption (photos aren't sensitive enough to justify the complexity).

---

## The `photos` table

```sql
CREATE TABLE photos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       text NOT NULL,
  uploader_id     uuid NOT NULL REFERENCES users(id),

  -- Polymorphic owner: exactly one of these
  property_id     uuid REFERENCES properties(id) ON DELETE CASCADE,
  room_id         uuid REFERENCES rooms(id) ON DELETE CASCADE,
  activity_id     uuid REFERENCES activities(id) ON DELETE CASCADE,

  -- File metadata
  original_path   text NOT NULL,            -- 'property/abc123/orig/photo456.jpg'
  mime_type       text NOT NULL,            -- 'image/jpeg' | 'image/png' | 'image/webp'
  size_bytes      int NOT NULL,
  width           int NOT NULL,
  height          int NOT NULL,
  hash_sha256     text NOT NULL,            -- for dedup + fraud detection

  -- Display
  alt_text        text,                     -- AI-generated, owner-editable, i18n via separate table later
  caption         text,
  position        int NOT NULL DEFAULT 0,   -- ordering within listing
  is_hero         bool NOT NULL DEFAULT false, -- one per property/room
  tags            text[],                   -- AI-derived: 'bedroom', 'beach', 'food', 'common-area'

  -- Status
  status          text NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected' | 'flagged'
  rejection_reason text,
  quality_score   int,                       -- AI: 0-100
  flagged_for     text[],                    -- ['stock-photo-suspected', 'low-resolution', 'inappropriate']

  -- Audit
  created_at      timestamptz NOT NULL DEFAULT now(),
  approved_at     timestamptz,
  deleted_at      timestamptz,
  is_mock         bool NOT NULL DEFAULT false,

  CHECK (
    (property_id IS NOT NULL)::int +
    (room_id IS NOT NULL)::int +
    (activity_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX photos_property_idx ON photos(property_id, position) WHERE deleted_at IS NULL;
CREATE INDEX photos_room_idx ON photos(room_id, position) WHERE deleted_at IS NULL;
CREATE INDEX photos_activity_idx ON photos(activity_id, position) WHERE deleted_at IS NULL;
CREATE INDEX photos_hash_idx ON photos(hash_sha256);  -- for dedup detection
CREATE UNIQUE INDEX photos_hero_property_idx ON photos(property_id) WHERE is_hero = true AND deleted_at IS NULL;
CREATE UNIQUE INDEX photos_hero_room_idx ON photos(room_id) WHERE is_hero = true AND deleted_at IS NULL;
```

**Polymorphic owner:** photo belongs to exactly one of {property, room, activity}. CHECK constraint enforces. Three separate FKs (with CASCADE delete) keeps the relationship explicit and queryable.

**One hero per property/room:** unique partial index. UI ensures setting a new hero unsets the old.

---

## Upload flow — signed URLs (the secure pattern)

We do NOT proxy the file upload through our API server. That would:

- Double the bandwidth (in + out)
- Block API workers during upload
- Limit file size to our API's body parser settings

Instead: **direct upload to R2 with signed URLs.**

```
1. Owner clicks "Upload photo" on dashboard
2. Frontend POSTs to apps/api: /photos/upload-intent
   Body: { mime_type: 'image/jpeg', size_bytes: 2400000, owner_entity: 'property:abc123' }
3. API validates:
   - mime_type in allowed list
   - size_bytes <= 10MB
   - User has write permission on the target entity
   - Daily upload quota not exceeded (anti-abuse: 100 photos/day/user)
4. API generates:
   - photo_id (uuid)
   - signed PUT URL to R2 (expires 10 min)
   - Returns these to frontend
5. Frontend uploads file directly to R2 via the signed URL
6. R2 confirms upload; frontend POSTs to apps/api: /photos/upload-complete
   Body: { photo_id, etag }
7. API enqueues BullMQ job: ProcessUploadedPhoto
8. API returns immediately; frontend shows "processing..." in UI
9. Worker processes (next section) → photo becomes 'approved' or 'rejected'
10. Owner sees result in dashboard (polling or WebSocket update)
```

**Why client → R2 directly:** the API server never sees the bytes. Faster for owner, cheaper for us, more secure (signed URL is scope-limited).

---

## The processing worker

`apps/jobs` runs a BullMQ worker that handles uploaded photos:

```ts
// apps/jobs/src/photos/process-uploaded-photo.ts

export const processUploadedPhoto = async (job: Job<{ photoId: string }>) => {
  const photo = await db.photos.findFirstOrThrow({ id: job.data.photoId });
  const file = await r2.getObject(photo.original_path);

  // 1. Validate it's actually an image (defense against renamed exe etc.)
  const probed = await sharp(file.body).metadata();
  if (!probed.format || !['jpeg', 'png', 'webp'].includes(probed.format)) {
    return reject(photo, 'invalid-format');
  }

  // 2. Strip EXIF GPS + camera serial (PII)
  const cleaned = await sharp(file.body).withMetadata({ exif: {} }).toBuffer();

  // 3. Hash for dedup + fraud
  const hash = sha256(cleaned);

  // 4. Check for duplicate uploads (same hash anywhere in our system)
  const duplicate = await db.photos.findFirst({
    where: { hash_sha256: hash, deleted_at: null },
  });
  if (duplicate && duplicate.id !== photo.id) {
    return reject(photo, 'duplicate-photo');
  }

  // 5. Resolution check
  if (probed.width < 1024 || probed.height < 768) {
    return reject(photo, 'resolution-too-low');
  }

  // 6. AI quality check (Ollama + Llava locally, or Claude API)
  const quality = await aiQualityCheck(cleaned);
  if (quality.score < 30) {
    return reject(photo, `low-quality: ${quality.reason}`);
  }

  // 7. AI content check
  const content = await aiContentCheck(cleaned);
  if (content.is_stock_photo) {
    return flag(photo, 'stock-photo-suspected');
  }
  if (content.contains_text_overlay) {
    return flag(photo, 'watermark-or-text');
  }
  if (content.is_inappropriate) {
    return reject(photo, 'inappropriate');
  }

  // 8. AI alt-text + tags
  const description = await aiDescribe(cleaned);
  await db.photos.update({
    id: photo.id,
    alt_text: description.alt_text,
    tags: description.tags,
    quality_score: quality.score,
    status: 'approved',
    approved_at: new Date(),
  });

  // 9. Pre-generate common-size variants for CDN warm-up (optional)
  // Cloudflare Image Resizing will generate on demand, but pre-warming the
  // hero size saves first-visitor latency.
  await prewarmVariant(photo, { width: 800, format: 'webp' });

  // 10. Notify owner: photo approved
  await notifyOwner(photo.uploader_id, 'photo-approved', { photo_id: photo.id });
};
```

This worker has retries (3×) with exponential backoff. Failures over the limit go to a dead-letter queue + Discord alert to the founder.

---

## AI quality + content checks

**Approach:** use local Ollama models (free, no API cost) for batch processing. Acceptable latency since uploads are async.

### Quality check (resolution, sharpness, exposure)

Use **Llava** (multimodal LLM via Ollama). Prompt:

```
Analyze this photo of a hostel property. Rate 0-100 based on:
- Is it sharp / in focus?
- Is the exposure reasonable (not too dark or blown out)?
- Does it show a useful view (room, common area, exterior)?
- Is it likely a phone photo or stock image?

Return JSON: { score: number, reason: string, photo_type: 'room'|'common'|'exterior'|'detail'|'unclear' }
```

Score < 30: reject. Score 30-60: flag for owner review. Score > 60: approve.

### Stock photo detection

Two layers:

1. **Reverse image search** via SerpAPI free tier OR TinEye API → if the photo appears on >5 other sites, likely stock. Flag.

2. **Llava prompt**: "Does this image look like a professional stock photo (overly polished, generic, no specific identifying details)? Return JSON: { is_stock_photo: bool, confidence: number }"

Phase B: founder reviews flags manually. Phase C: auto-reject if reverse-search confidence is high.

### Inappropriate content

Llava prompt: "Does this image contain nudity, violence, drugs, or anything inappropriate for a travel platform? Return JSON: { is_inappropriate: bool, reason: string }"

Tara doesn't run a content moderation team. We rely on:

1. AI screening at upload
2. Guest report button
3. Founder reviews flagged items manually

### Alt text + tagging

Llava prompt: "Describe this photo in one sentence (for blind users / SEO alt text). Then list 3-5 tags from: bedroom, dorm, common-area, kitchen, bathroom, exterior, beach, food, sunset, group-of-people, detail."

Output goes into `photos.alt_text` and `photos.tags`. Owner can edit alt text. Tags drive UI filtering ("show me bathroom photos").

---

## Delivery — Cloudflare Image Resizing

Original lives in R2. We never serve originals directly. Instead, requests go through Cloudflare's image transformation CDN.

**URL pattern:**

```
https://images.tarastays.com/cdn-cgi/image/width=800,format=auto,quality=80/property/abc123/orig/photo456.jpg
```

Or, prettier (via Cloudflare Worker rewriter):

```
https://images.tarastays.com/property/abc123/photo456.webp?w=800
```

Cloudflare resizes on demand, caches the variant at the edge. First visitor pays the resize cost (~200ms); every other visitor gets cached (<10ms).

**Standard variants we generate:**

| Variant  | Width    | Use case                        |
| -------- | -------- | ------------------------------- |
| `thumb`  | 200      | Grid thumbnails, search results |
| `small`  | 400      | Mobile cards                    |
| `medium` | 800      | Listing page main view          |
| `large`  | 1600     | Hero on desktop                 |
| `xlarge` | 2400     | Lightbox full-screen            |
| `og`     | 1200×630 | OpenGraph social shares         |

**Format:** `format=auto` lets Cloudflare pick WebP/AVIF based on browser support, falling back to JPEG.

**Quality:** 80 by default. Hero/lightbox = 85. Saves ~30% bytes vs default 95.

**Cost:** Cloudflare Image Resizing free tier = 5,000 transforms/mo. Pro plan ($20/mo) = 100,000/mo. We won't hit this for years.

---

## Performance optimizations on the client

```tsx
// apps/web/components/PropertyPhoto.tsx
import Image from 'next/image';

<Image
  src={`https://images.tarastays.com/property/${id}/${photoId}.jpg`}
  alt={photo.alt_text}
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, 800px"
  loading={isHero ? 'eager' : 'lazy'}
  placeholder="blur"
  blurDataURL={photo.blur_data_url} // base64-encoded 8×8 px LQIP
/>;
```

**Techniques:**

- **`loading="lazy"`** — only hero loads immediately, rest load when scrolled near
- **`sizes` attribute** — browser picks right size for viewport
- **`placeholder="blur"`** — generated 8×8 base64 LQIP shown while loading, prevents layout shift
- **`fetchpriority="high"`** — on the hero image, hint to browser to prioritize
- **Next.js Image component** — handles `srcset` generation, `<picture>` for WebP fallback

**Result:** Hero LCP under 1.5s on 4G mobile. Standard for the category is 3-5s. Real competitive advantage.

---

## Owner upload UX

The actual UI for owners (Phase B v0 sketch):

```
┌─────────────────────────────────────────────────────────┐
│  Photos for "Maria's Surf Hostel"                       │
│                                                          │
│  💡 Tips for better photos:                              │
│     - Shoot during day, near windows                     │
│     - Show clean rooms, not just exterior                │
│     - Include common areas, not only bedrooms            │
│     - Avoid people's faces (privacy)                     │
│                                                          │
│  [⬆ Upload photos]                                       │
│                                                          │
│  Hero (drag to reorder)                                  │
│  ┌────────┐                                              │
│  │ 🌊 ⭐  │ ← currently set as hero                       │
│  └────────┘                                              │
│                                                          │
│  Other photos                                            │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                      │
│  │ 🛏 │ │ 🏖 │ │ 🍳 │ │ 🚿 │ │ ⏳ │ ← processing         │
│  └────┘ └────┘ └────┘ └────┘ └────┘                      │
│                                                          │
│  ⚠ "IMG_2841.jpg" rejected: low resolution.              │
│    Suggested: shoot in landscape, full HD or higher.    │
└─────────────────────────────────────────────────────────┘
```

Owner sees:

- Pre-upload tips
- Progress for in-flight uploads
- Clear rejection reasons with actionable suggestions
- Easy drag-to-reorder
- One-click set-hero

---

## Fraud / abuse vectors

Things malicious owners might try:

| Vector                                        | Mitigation                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| Upload stock photos from Hostelworld          | Reverse image search at upload time                                           |
| Upload someone else's property photos         | Hash-based dedup, manual review for flagged                                   |
| Upload misleading photos (renovated long ago) | Owner agreement requires "honest representation"; guest reports if mismatched |
| Watermark photos with another brand           | AI watermark detection (Llava prompt)                                         |
| DMCA: someone else owns the photo             | DMCA takedown form in T&C, founder responds within 48h                        |
| Resource exhaustion (huge files)              | 10MB hard limit, daily quota per user                                         |
| Path traversal in upload                      | Generated paths only; never accept user-supplied paths                        |

---

## Backup / disaster recovery

Photos in R2 are durable (11 nines per Cloudflare). For DR:

- **Original photos:** kept indefinitely (storage is cheap, photos compound brand value)
- **Backup strategy:** Cloudflare R2 → weekly snapshot to Backblaze B2 cold storage (~$0.005/GB/mo)
- **Restore drill:** quarterly — pick 10 random photos, verify they can be re-fetched from backup

If a property is deleted, photos soft-delete for 90 days (in case of accidental deletion), then hard-delete from R2.

---

## Testing

| Test                                    | What it verifies                                                  |
| --------------------------------------- | ----------------------------------------------------------------- |
| Upload 100×10MB files concurrently      | API doesn't OOM (signed-URL pattern means it doesn't touch bytes) |
| Upload 11MB file                        | Rejected with clear error                                         |
| Upload renamed .exe with .jpg extension | Rejected at probe step                                            |
| Upload same image to 2 properties       | First succeeds, second flagged as duplicate                       |
| Quality score on known-bad photos       | Rejected                                                          |
| Quality score on known-good photos      | Approved                                                          |
| Stock photo from Pexels uploaded        | Flagged via reverse-search                                        |
| Hero uniqueness                         | Setting new hero unsets old; only one hero per property/room      |
| Soft-delete cascade                     | Property soft-delete → photos soft-delete with same `deleted_at`  |

---

## What's deliberately deferred

| Feature                                                                     | Phase | Why                                              |
| --------------------------------------------------------------------------- | ----- | ------------------------------------------------ |
| Video uploads                                                               | C+    | Phase B is photos only                           |
| 360° / panorama                                                             | D     | Complex viewer, low ROI for Phase B              |
| Auto-tagging in multiple languages                                          | D     | English alt text in Phase B; AI translates later |
| Owner-side bulk re-tag                                                      | C     | Manual edit per photo for Phase B                |
| Watermarking Tara's photos                                                  | E     | Once brand has equity                            |
| User uploads (review photos from guests)                                    | C     | Phase B: photos = owners only                    |
| Professional photographer marketplace ("Hire someone to shoot your hostel") | E     | Cool feature, much later                         |

---

## Cost summary at Phase B scale

- 50 properties × 30 photos × 2MB = 3GB R2 storage = **$0.05/mo**
- ~10k image transforms/mo on Cloudflare = within free tier = **$0**
- Backblaze B2 backup = **$0.05/mo**
- Ollama AI processing = free (local, on home server)
- **Total: <$1/mo for the entire image pipeline**

At Phase C with 500 properties × 50 photos: ~$2/mo. Still negligible.

---

## When this doc changes

- New variant size added → update standard variants table + frontend Image components
- AI provider swapped → update worker code
- New fraud vector discovered → add to mitigation table + tests
- Cost shape changes (e.g., Cloudflare changes pricing) → update cost summary
