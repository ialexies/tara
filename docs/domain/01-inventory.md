# 01 — Inventory Model

How Tara represents what's bookable. **Foundation for everything else** in the domain: availability queries (02), pricing (03), bookings (04). Get this wrong and you pay for years.

> **Read [`glossary.md`](glossary.md) first.** Words like "room", "bed", "unit", "bed-night" are precisely defined there.

---

## The shape of hostel inventory (reality check)

Before modeling, what does PH hostel inventory actually look like in the wild?

### Mixed dorm (the bread and butter of hostels)

- _Example:_ "8-bed Mixed Dorm" with 4 bunk beds (8 sleeping positions)
- Each bed is bookable independently by different guests
- Often: bunk top vs. bottom matters; some guests have preferences
- Photos are of the room, but the bookable unit is a bed

### Female-only dorm

- Same structure as mixed dorm but with a gender restriction
- _Example:_ "6-bed Female Dorm"
- Bed-level bookable

### Private double

- One room, sleeps 2, sold as a whole
- _Example:_ "Private Double with Sea View"
- Booked as one unit (not per-bed)

### Private with extra beds

- _Example:_ "Family Room — sleeps up to 4"
- Sold as a whole room, with extra-person fees possibly
- Booked as one unit; pricing varies by occupancy

### Casita / Cottage

- _Example:_ Beach hostels with separate cottages
- Same as private room conceptually — sold whole
- May have outdoor amenities the model needs to capture (pool, kitchen)

### Tents / Glamping (less common, future)

- Same model as private rooms
- Capacity matters, amenities differ

**Two universal truths:**

1. Some inventory is sold **per-bed** (dorms)
2. Some inventory is sold **per-whole-unit** (private rooms, cottages)

The model must elegantly handle both.

---

## The model — three layers

```
Property
   │
   ├──< Room                  (a named, physical space)
   │      │
   │      ├──< Bed            (for dorms — multiple bookable beds per room)
   │      │
   │      └──< Unit           (for privates — exactly one bookable unit per room)
   │
   └──< Amenities, Photos, Policies, etc.
```

**Where it gets opinionated:**

We use **`Unit` as the universal bookable abstraction.** For private rooms, a Room has exactly 1 Unit (the whole room). For dorms, a Room has N Units (one per bed). The booking system always operates on Units.

This means:

- One code path for availability queries
- One code path for pricing
- One code path for booking
- UI knows whether to say "you booked Bunk 3" (dorm) or "you booked Casita 2" (private) by checking room type

### Why not just have Beds for dorms and Rooms-as-bookable for privates?

Considered. Rejected because:

- Every booking-touching code path would need to branch on `room.type` to know what entity to operate on
- The state machine, availability check, pricing, locks — all duplicated
- Hard to extend (what about "I want to book the whole dorm room" — a possible future feature?)

Unifying on Unit:

- Booking always references `unit_id`
- "Booking the whole dorm" = booking all units in that room (trivial query)
- UI rendering decisions are isolated to the presentation layer
- New room types (tents, suites, etc.) plug in by creating Units appropriately

### Implementation in our current schema

Currently (Drizzle migration 0000) we have `properties` only — no `room`/`bed`/`unit` yet. Those come in the next migrations. The shape will be:

```
properties (already exists)
  id, tenant_id, owner_id, name, slug, property_type, region, ...

rooms (next migration)
  id, property_id (FK), tenant_id (denormalized)
  name, slug-within-property
  room_type: 'dorm' | 'private'
  bathroom_type: 'shared' | 'private' | 'ensuite'
  max_occupancy: int      -- for private rooms only
  capacity: int            -- total sleeping positions (8 for an 8-bed dorm)
  gender: 'mixed' | 'female' | 'male' | null
  has_aircon, has_window, has_locker, has_outlet_per_bed: bool

units (next migration)
  id, room_id (FK), tenant_id (denormalized)
  label: text            -- "Bunk A top", "Bed 3", "(whole room)"
  position: int          -- sort order within room
  is_active: bool        -- soft disable a bed without deleting bookings
```

**Why `tenant_id` is denormalized to rooms and units:**
We could JOIN through property to get tenant_id, but every availability query in the system touches units. Denormalizing makes the multi-tenancy filter index-friendly.

---

## Key modeling decisions worth your input

These are the calls where reasonable people disagree. **Flagging for your awareness — you can override.**

### Decision 1: Is "whole dorm bookable" a thing?

**Question:** Can a guest book a 6-bed dorm as a unit (effectively booking all 6 beds at once)? Some hostels offer this for groups/families.

**Recommendation:** Not in MVP. If groups want all 6 beds, they book 6 beds individually (or we offer it via a "group booking" feature in Phase 2). Keeps the model simple.

**Override if:** you've already heard from Zambales hostels that whole-dorm booking is common.

### Decision 2: How do we model "two adjacent beds"?

**Question:** Couples sharing a dorm sometimes want two specific beds together (lower bunks side-by-side). Model this?

**Recommendation:** Not in MVP. Beds are independent. UI can suggest "common preferences" but doesn't enforce. Phase 2 if demand emerges.

**Override if:** you want a "bed grouping" feature out of the gate.

### Decision 3: Extra-person pricing for private rooms

**Question:** "Private room sleeps 4 but base rate is for 2; +₱500 per extra person." Common in PH. Where does this live?

**Recommendation:** Pricing rules layer (doc 03), not inventory. Room declares `max_occupancy` and `base_occupancy`; pricing rules apply per-extra-person uplift. Inventory stays clean.

**Override if:** you want a different approach (e.g., separate prices per occupancy stored on the room directly).

### Decision 4: Amenities — structured or freeform?

**Question:** Should amenities be a fixed enum (`wifi`, `aircon`, `pool`, ...) or freeform tags?

**Recommendation:** Both.

- A small **structured** set for the things guests filter by (`wifi`, `aircon`, `breakfast_included`, `parking`, `pool`, `kitchen`, `washer`, `locker`, `outlet_per_bed`)
- A freeform `tags` array on the property for the long tail (`"surf gear rental"`, `"motorbike rental"`, `"complimentary coffee"`)
- Tags are normalized/deduped via AI suggestion in Phase 2

**Override if:** you want pure structured (cleaner but rigid) or pure freeform (flexible but un-filterable).

### Decision 5: Photos — per-room or per-property?

**Question:** Hostels often have property-wide photos (lobby, beach, common area) AND room-specific photos (the bed shot, the bathroom). Model both?

**Recommendation:** Yes, two tables.

- `property_photos` — galleries on the listing page
- `room_photos` — shown when guest is selecting a specific room/bed
- Photos are heavy enough to warrant the split (see image pipeline doc 19)

**Override if:** you want to start simple with property-only photos.

---

## Data structure (the schema we'll generate next migration)

> Not yet in the DB — this is the plan. We'll generate the migration after you sign off on the Decision-1-through-5 questions above.

```sql
-- New tables to add in 0001_inventory.sql
-- (and the 0002_amenities.sql migration depending on Decision 4)

CREATE TABLE rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id text NOT NULL,                       -- denormalized
  name text NOT NULL,
  slug text NOT NULL,
  room_type room_type_enum NOT NULL,             -- 'dorm' | 'private'
  bathroom_type text,                            -- 'shared' | 'private' | 'ensuite'
  max_occupancy int,                             -- private rooms only
  capacity int NOT NULL,                          -- total sleeping positions
  gender text,                                    -- 'mixed' | 'female' | 'male' | null
  description text,
  position int NOT NULL DEFAULT 0,                -- display order
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  is_mock boolean NOT NULL DEFAULT false,
  UNIQUE (property_id, slug)
);

CREATE INDEX rooms_property_idx ON rooms(property_id);
CREATE INDEX rooms_tenant_idx ON rooms(tenant_id);


CREATE TABLE units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  tenant_id text NOT NULL,                       -- denormalized
  label text NOT NULL,                            -- "Bunk A top", "Bed 3", "(whole room)"
  position int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  is_mock boolean NOT NULL DEFAULT false
);

CREATE INDEX units_room_idx ON units(room_id);
CREATE INDEX units_tenant_idx ON units(tenant_id);
```

For private rooms, the application creates exactly one unit on room creation. For dorms, the application creates N units (one per bed slot the owner enters). This is enforced in the inventory service, not at DB level.

---

## Invariants to enforce (in service layer + tests)

These are non-negotiable rules the inventory service enforces. Each has a corresponding test.

1. **A private room has exactly 1 unit.** Creating a 2nd unit on a `private` room throws.
2. **A dorm room has between 1 and `capacity` units.** Can't have more beds than capacity declared.
3. **Deleting a room with active bookings is forbidden.** Use soft-delete; cancel/relocate bookings first.
4. **`tenant_id` on rooms must match the parent property's tenant_id.** Enforced via constraint check or trigger.
5. **`tenant_id` on units must match the parent room's tenant_id.** Same.
6. **`is_mock` is inherited:** if property.is_mock = true, all its rooms and units must also be mock.

---

## How this maps to the booking flow

```
Guest searches "Zambales, Nov 14-17, 2 people"
   │
   ▼
   Search returns Properties matching region
   │
   ▼
   For each Property, query rooms with availability + price
   │
   ▼
   Guest clicks Property → sees Rooms
   │
   ▼
   Guest picks a Room
   │
   ▼
   For Dorm: shows available Beds (Units) for the date range
   For Private: shows the single Unit + capacity message ("Sleeps 2, fits 4")
   │
   ▼
   Guest selects Unit(s) → goes to checkout
   │
   ▼
   Backend creates Booking + BookingItem(s) — one BookingItem per Unit per Night
```

**The hard query is the search-with-availability step.** That's the next doc (`02-availability.md`).

---

## What's deliberately deferred

| Feature                                     | Phase | Why deferred                                            |
| ------------------------------------------- | ----- | ------------------------------------------------------- |
| Whole-dorm booking                          | 2     | Phase B simplicity; reconsider with data                |
| Bed-grouping / "side by side"               | 2     | UX nice-to-have, complex impl                           |
| Property-level amenities normalization (AI) | 2     | We launch with structured + freeform; AI sorts it later |
| Multi-currency rooms                        | C+    | Phase B is all PHP                                      |
| Inventory imports (Booking.com CSV → us)    | C+    | Manual entry forced for Phase B                         |
| Channel-specific inventory pools            | 3     | Comes with channel manager                              |

---

## When this doc changes

1. Update glossary if terms shifted
2. Generate a new migration if the schema changes
3. Update tests for any new invariants
4. If a structural decision is reversed, write an ADR explaining why

The schema in this doc is the source of truth until the migration lands. Once landed, the Drizzle schema files become the source of truth and this doc references them.
