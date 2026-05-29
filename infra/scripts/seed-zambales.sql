-- ============================================================
-- Zambales test properties seed
-- Owner: owner@test.tara-stays.com (93639fa3-6900-4760-bea5-ca173bc8191a)
-- Run: docker exec -i tara-postgres psql -U tara -d tara_dev < infra/scripts/seed-zambales.sql
-- ============================================================

-- Wipe existing mock properties owned by the test owner so this is idempotent
DELETE FROM properties
WHERE is_mock = true
  AND owner_id = '93639fa3-6900-4760-bea5-ca173bc8191a';

-- ============================================================
-- 1. Anawangin Cove Backpackers  (San Antonio, hostel) — 22 beds
-- ============================================================
DO $$
DECLARE
  pid uuid;
  r1 uuid; r2 uuid; r3 uuid;
BEGIN
  INSERT INTO properties (
    tenant_id, owner_id, name, slug, property_type,
    region, city, address_line, latitude, longitude,
    currency, payment_mode, manual_payment_methods,
    status, published_at, is_mock,
    cover_image_url, description,
    amenities, check_in_time, check_out_time, house_rules,
    free_cancel_days, partial_refund_percent
  ) VALUES (
    'anawangin-backpackers', '93639fa3-6900-4760-bea5-ca173bc8191a',
    'Anawangin Cove Backpackers', 'anawangin-cove-backpackers', 'hostel',
    'Zambales', 'San Antonio', 'Pundaquit, San Antonio, Zambales',
    15.1794, 119.8657,
    'PHP', 'manual', '{"gcash":"09171234567","maya":"09171234567"}',
    'active', now(), true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/654d6757-aea5-452d-bd0c-2a95a11911e0.jpg',
    'Wake up to the sound of waves at Anawangin Cove, one of Zambales'' most iconic destinations. Nestled between agoho pine trees and a white sand cove, our backpacker hostel is the perfect base camp for island-hopping, snorkeling, and trekking to nearby Capones Lighthouse. We run daily boat tours to Anawangin and Camara islands.',
    '{"wifi":false,"parking":true,"pool":false,"aircon":false,"restaurant":true,"gym":false}',
    '2:00 PM', '11:00 AM',
    'No loud music after 10 PM. Shoes off inside. Life jackets required for boat tours. Respect the pine trees.',
    2, 50
  ) RETURNING id INTO pid;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (
    pid, 'anawangin-backpackers', 'Pine Grove Dorm A (Mixed)', 'anawangin-pine-grove-dorm-a',
    'dorm', 'shared', 10, false, true, true, true, 45000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/f2d4084a-e78c-4e2c-81fb-1225e70f7595.jpg',
    '10-bed mixed dorm surrounded by agoho pine trees. Fall asleep to the sea breeze. Mosquito nets and reading lights included.', 1
  ) RETURNING id INTO r1;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (
    pid, 'anawangin-backpackers', 'Pine Grove Dorm B (Female)', 'anawangin-pine-grove-dorm-b',
    'dorm', 'shared', 8, false, true, true, true, 50000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/a0f5a067-25e1-40c6-aa66-9468b657052a.jpg',
    'Female-only 8-bed dorm with a dedicated bathroom and vanity corner.', 1
  ) RETURNING id INTO r2;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (
    pid, 'anawangin-backpackers', 'Cove View Private', 'anawangin-cove-view-private',
    'private', 'shared', 2, false, true, false, true, 120000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/a3a2dc8d-79f3-411d-8636-d3c49f0a76cf.jpg',
    'Private fan room with direct view of the cove. Perfect for couples.', 2
  ) RETURNING id INTO r3;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r1, 'anawangin-backpackers', 'Bed ' || gs, true FROM generate_series(1,10) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r2, 'anawangin-backpackers', 'Bed ' || gs, true FROM generate_series(1,8) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r3, 'anawangin-backpackers', 'Room ' || gs, true FROM generate_series(1,2) gs;

  INSERT INTO property_images (property_id, tenant_id, url, position)
  VALUES
    (pid, 'anawangin-backpackers', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/cd3b9562-45f7-41a6-8bb6-be76ce2ae5d1.jpg', 1),
    (pid, 'anawangin-backpackers', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/a0f5a067-25e1-40c6-aa66-9468b657052a.jpg', 2),
    (pid, 'anawangin-backpackers', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/07627cc2-6fbe-41d8-bf5b-2b2c8f51aee0.jpg', 3),
    (pid, 'anawangin-backpackers', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/f2d4084a-e78c-4e2c-81fb-1225e70f7595.jpg', 4);
END $$;


-- ============================================================
-- 2. Liwliwa Surf House  (San Felipe, guesthouse) — 18 beds
-- ============================================================
DO $$
DECLARE
  pid uuid; r1 uuid; r2 uuid; r3 uuid; r4 uuid;
BEGIN
  INSERT INTO properties (
    tenant_id, owner_id, name, slug, property_type,
    region, city, address_line, latitude, longitude,
    currency, payment_mode, manual_payment_methods,
    status, published_at, is_mock,
    cover_image_url, description,
    amenities, check_in_time, check_out_time, house_rules,
    free_cancel_days, partial_refund_percent
  ) VALUES (
    'liwliwa-surf-house', '93639fa3-6900-4760-bea5-ca173bc8191a',
    'Liwliwa Surf House', 'liwliwa-surf-house', 'guesthouse',
    'Zambales', 'San Felipe', 'Liwliwa Beach, San Felipe, Zambales',
    15.0632, 119.9118,
    'PHP', 'manual', '{"gcash":"09181234567"}',
    'active', now(), true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/83d8671e-d606-4ba3-be9c-b631088fe25f.jpg',
    'Liwliwa is Zambales'' crown jewel for surfing, and our surf house sits just 30 meters from the break. We offer board rentals, surf lessons with certified instructors, and a laid-back vibe that keeps guests coming back season after season. The restaurant serves fresh catches from the local fishermen daily.',
    '{"wifi":true,"parking":true,"pool":false,"aircon":false,"restaurant":true,"gym":false}',
    '1:00 PM', '11:00 AM',
    'Rinse your boards before bringing them in. No outside food in the restaurant. Quiet hours 11 PM.',
    3, 50
  ) RETURNING id INTO pid;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'liwliwa-surf-house', 'Surfer Dorm A', 'liwliwa-surfer-dorm-a',
    'dorm', 'shared', 8, false, true, true, true, 55000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/83a02164-1201-451d-8b58-8b1bd733aa3c.jpg',
    '8-bed mixed surf dorm. Board storage rack right outside the door. Outdoor showers.', 1)
  RETURNING id INTO r1;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'liwliwa-surf-house', 'Surfer Dorm B (Female)', 'liwliwa-surfer-dorm-b',
    'dorm', 'shared', 6, false, true, true, true, 60000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/f2d4084a-e78c-4e2c-81fb-1225e70f7595.jpg',
    'Female-only 6-bed dorm with private bathroom and sea-facing balcony.', 1)
  RETURNING id INTO r2;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'liwliwa-surf-house', 'Beachfront Kubo', 'liwliwa-beachfront-kubo',
    'private', 'private', 2, false, true, false, true, 180000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/73158bc9-00bd-4314-adae-3f386473abce.jpg',
    'Nipa hut right on the sand. Sliding door opens to the beach.', 2)
  RETURNING id INTO r3;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'liwliwa-surf-house', 'Garden Twin', 'liwliwa-garden-twin',
    'private', 'shared', 2, false, true, false, false, 140000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/ba63a65c-6f19-4fdf-ad27-50013c4ac7c1.jpg',
    'Twin beds in a quiet garden-facing room. Great for friends traveling together.', 1)
  RETURNING id INTO r4;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r1, 'liwliwa-surf-house', 'Bed ' || gs, true FROM generate_series(1,8) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r2, 'liwliwa-surf-house', 'Bed ' || gs, true FROM generate_series(1,6) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r3, 'liwliwa-surf-house', 'Kubo ' || gs, true FROM generate_series(1,3) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r4, 'liwliwa-surf-house', 'Room ' || gs, true FROM generate_series(1,4) gs;

  INSERT INTO property_images (property_id, tenant_id, url, position)
  VALUES
    (pid, 'liwliwa-surf-house', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/83d8671e-d606-4ba3-be9c-b631088fe25f.jpg', 1),
    (pid, 'liwliwa-surf-house', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/fc6861aa-2007-4556-aa72-2f248f1e9f00.jpg', 2),
    (pid, 'liwliwa-surf-house', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/ecd23c02-b5e1-4b0e-9e3a-84e8b41799b3.jpg', 3),
    (pid, 'liwliwa-surf-house', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/83a02164-1201-451d-8b58-8b1bd733aa3c.jpg', 4);
END $$;


-- ============================================================
-- 3. Subic Bay Dive & Stay  (Olongapo, hotel) — 22 units
-- ============================================================
DO $$
DECLARE
  pid uuid; r1 uuid; r2 uuid; r3 uuid; r4 uuid;
BEGIN
  INSERT INTO properties (
    tenant_id, owner_id, name, slug, property_type,
    region, city, address_line, latitude, longitude,
    currency, payment_mode, manual_payment_methods,
    status, published_at, is_mock,
    cover_image_url, description,
    amenities, check_in_time, check_out_time, house_rules,
    free_cancel_days, partial_refund_percent
  ) VALUES (
    'subic-dive-stay', '93639fa3-6900-4760-bea5-ca173bc8191a',
    'Subic Bay Dive & Stay', 'subic-bay-dive-stay', 'hotel',
    'Zambales', 'Olongapo', 'Waterfront Road, Subic Bay Freeport Zone, Olongapo',
    14.8027, 120.2729,
    'PHP', 'manual', '{"gcash":"09191234567","bank":"BDO 1234567890 Subic Dive Inc"}',
    'active', now(), true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/57cfd4f8-f594-4d82-9965-93e84255f7be.jpg',
    'Subic Bay is famous for its WWII shipwreck dive sites and crystal-clear waters. Our dive center and hotel combination is perfect for PADI-certified divers and beginners alike. We run two dive trips daily to the USS New York wreck, El Capitan, and San Quentin reef. Gear rental and PADI Open Water courses available.',
    '{"wifi":true,"parking":true,"pool":true,"aircon":true,"restaurant":true,"gym":false}',
    '2:00 PM', '12:00 PM',
    'Dive certification required for advanced sites. No alcohol before diving. Equipment must be rinsed after use.',
    3, 75
  ) RETURNING id INTO pid;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'subic-dive-stay', 'Diver Dorm (6-bed)', 'subic-diver-dorm',
    'dorm', 'shared', 6, true, true, true, true, 75000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/f2d4084a-e78c-4e2c-81fb-1225e70f7595.jpg',
    '6-bed A/C dorm with extra-large lockers for dive gear and a gear-rinse station outside.', 1)
  RETURNING id INTO r1;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'subic-dive-stay', 'Standard Double', 'subic-standard-double',
    'private', 'private', 2, true, true, false, true, 200000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/a3a2dc8d-79f3-411d-8636-d3c49f0a76cf.jpg',
    'A/C double room with en-suite bathroom. Includes daily breakfast.', 1)
  RETURNING id INTO r2;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'subic-dive-stay', 'Bay View Room', 'subic-bay-view-room',
    'private', 'private', 2, true, true, false, true, 280000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/922a399b-b515-441c-a8c8-c9129af12f28.jpg',
    'Premium room with direct view of Subic Bay. King bed, A/C, and daily breakfast included.', 1)
  RETURNING id INTO r3;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'subic-dive-stay', 'Family Suite', 'subic-family-suite',
    'private', 'private', 5, true, true, false, true, 420000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/ba63a65c-6f19-4fdf-ad27-50013c4ac7c1.jpg',
    'Spacious suite with king bed + two singles. Living area and kitchenette. Great for families.', 2)
  RETURNING id INTO r4;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r1, 'subic-dive-stay', 'Bed ' || gs, true FROM generate_series(1,6) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r2, 'subic-dive-stay', 'Room ' || gs, true FROM generate_series(1,6) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r3, 'subic-dive-stay', 'Room ' || gs, true FROM generate_series(1,4) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r4, 'subic-dive-stay', 'Suite ' || gs, true FROM generate_series(1,3) gs;

  INSERT INTO property_images (property_id, tenant_id, url, position)
  VALUES
    (pid, 'subic-dive-stay', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/57cfd4f8-f594-4d82-9965-93e84255f7be.jpg', 1),
    (pid, 'subic-dive-stay', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/cd3b9562-45f7-41a6-8bb6-be76ce2ae5d1.jpg', 2),
    (pid, 'subic-dive-stay', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/1571ad1c-d061-4a1a-8a54-c380c217c925.jpg', 3),
    (pid, 'subic-dive-stay', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/9fe64752-02f0-44b9-91cd-7a82a675b63f.jpg', 4);
END $$;


-- ============================================================
-- 4. Nagsasa Cove Eco Camp  (San Antonio, hostel) — 18 beds
-- ============================================================
DO $$
DECLARE
  pid uuid; r1 uuid; r2 uuid; r3 uuid;
BEGIN
  INSERT INTO properties (
    tenant_id, owner_id, name, slug, property_type,
    region, city, address_line, latitude, longitude,
    currency, payment_mode, manual_payment_methods,
    status, published_at, is_mock,
    cover_image_url, description,
    amenities, check_in_time, check_out_time, house_rules,
    free_cancel_days, partial_refund_percent
  ) VALUES (
    'nagsasa-eco-camp', '93639fa3-6900-4760-bea5-ca173bc8191a',
    'Nagsasa Cove Eco Camp', 'nagsasa-cove-eco-camp', 'hostel',
    'Zambales', 'San Antonio', 'Nagsasa Cove, San Antonio, Zambales',
    15.1950, 119.8420,
    'PHP', 'manual', '{"gcash":"09201234567"}',
    'active', now(), true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/f45c91bc-e602-4974-bf57-46939f87f78c.jpg',
    'Nagsasa Cove is a secluded paradise accessible only by boat from Pundaquit. Our eco camp is built entirely from bamboo and reclaimed materials, with solar power and composting toilets. This is off-grid living at its finest — no electricity after 9 PM, just stars, waves, and agoho pines. Two-hour boat ride from Pundaquit included in your stay.',
    '{"wifi":false,"parking":false,"pool":false,"aircon":false,"restaurant":true,"gym":false}',
    '12:00 PM', '9:00 AM',
    'Leave no trace. All trash must be carried out. No generators. Solar lanterns provided after 9 PM.',
    1, 0
  ) RETURNING id INTO pid;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'nagsasa-eco-camp', 'Bamboo Bunkhouse A', 'nagsasa-bamboo-bunkhouse-a',
    'dorm', 'shared', 10, false, true, false, false, 40000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/a0f5a067-25e1-40c6-aa66-9468b657052a.jpg',
    '10-bed bamboo bunkhouse with sea views from every bed. Mosquito nets and solar lanterns provided.', 2)
  RETURNING id INTO r1;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'nagsasa-eco-camp', 'Bamboo Bunkhouse B', 'nagsasa-bamboo-bunkhouse-b',
    'dorm', 'shared', 8, false, true, false, false, 40000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/cd3b9562-45f7-41a6-8bb6-be76ce2ae5d1.jpg',
    '8-bed bamboo bunkhouse nestled in the pine grove, 50 meters from the water.', 2)
  RETURNING id INTO r2;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'nagsasa-eco-camp', 'Glamping Tent', 'nagsasa-glamping-tent',
    'private', 'shared', 2, false, true, false, false, 160000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/a4bc93f1-42fa-428d-bbf2-3956d11debd9.jpg',
    'Furnished safari tent on a raised platform, 10 meters from the waterline. Includes dinner and breakfast.', 2)
  RETURNING id INTO r3;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r1, 'nagsasa-eco-camp', 'Bed ' || gs, true FROM generate_series(1,10) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r2, 'nagsasa-eco-camp', 'Bed ' || gs, true FROM generate_series(1,8) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r3, 'nagsasa-eco-camp', 'Tent ' || gs, true FROM generate_series(1,4) gs;

  INSERT INTO property_images (property_id, tenant_id, url, position)
  VALUES
    (pid, 'nagsasa-eco-camp', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/f45c91bc-e602-4974-bf57-46939f87f78c.jpg', 1),
    (pid, 'nagsasa-eco-camp', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/a4bc93f1-42fa-428d-bbf2-3956d11debd9.jpg', 2),
    (pid, 'nagsasa-eco-camp', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/6520c418-8c41-4984-8fd6-da76e3cab9a4.jpg', 3);
END $$;


-- ============================================================
-- 5. Olongapo City Hostel  (Olongapo, hostel) — 26 beds
-- ============================================================
DO $$
DECLARE
  pid uuid; r1 uuid; r2 uuid; r3 uuid; r4 uuid;
BEGIN
  INSERT INTO properties (
    tenant_id, owner_id, name, slug, property_type,
    region, city, address_line, latitude, longitude,
    currency, payment_mode, manual_payment_methods,
    status, published_at, is_mock,
    cover_image_url, description,
    amenities, check_in_time, check_out_time, house_rules,
    free_cancel_days, partial_refund_percent
  ) VALUES (
    'olongapo-city-hostel', '93639fa3-6900-4760-bea5-ca173bc8191a',
    'Olongapo City Hostel', 'olongapo-city-hostel', 'hostel',
    'Zambales', 'Olongapo', '15 Gordon Ave, Olongapo City, Zambales',
    14.8289, 120.2827,
    'PHP', 'manual', '{"gcash":"09211234567","maya":"09211234567"}',
    'active', now(), true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/07627cc2-6fbe-41d8-bf5b-2b2c8f51aee0.jpg',
    'Centrally located in Olongapo City, two minutes walk from the Subic Bay Freeport Zone entrance. Great jumping-off point for day trips to Zambales beaches and Subic historical sites. Our social common area and rooftop bar make it easy to meet fellow travelers.',
    '{"wifi":true,"parking":true,"pool":false,"aircon":true,"restaurant":false,"gym":true}',
    '2:00 PM', '11:00 AM',
    'Guest ID required at check-in. No visitors after midnight. Rooftop bar closes at 11 PM.',
    3, 50
  ) RETURNING id INTO pid;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'olongapo-city-hostel', 'A/C Mixed Dorm (8-Bed)', 'olongapo-ac-mixed-8',
    'dorm', 'shared', 8, true, true, true, true, 65000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/83a02164-1201-451d-8b58-8b1bd733aa3c.jpg',
    'Air-conditioned 8-bed mixed dorm with individual reading lights, power outlets, and personal lockers.', 1)
  RETURNING id INTO r1;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'olongapo-city-hostel', 'Female Dorm (6-Bed)', 'olongapo-female-6',
    'dorm', 'shared', 6, true, true, true, true, 70000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/f2d4084a-e78c-4e2c-81fb-1225e70f7595.jpg',
    'Female-only A/C dorm with private bathroom, vanity area, and hair dryer.', 1)
  RETURNING id INTO r2;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'olongapo-city-hostel', 'Budget Dorm (4-Bed)', 'olongapo-budget-4',
    'dorm', 'shared', 4, true, true, true, true, 55000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/a0f5a067-25e1-40c6-aa66-9468b657052a.jpg',
    'Compact 4-bed A/C dorm. Great value in the heart of Olongapo.', 1)
  RETURNING id INTO r3;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'olongapo-city-hostel', 'Private Double', 'olongapo-private-double',
    'private', 'private', 2, true, true, false, true, 200000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/922a399b-b515-441c-a8c8-c9129af12f28.jpg',
    'Private A/C double room with en-suite bathroom and city view.', 1)
  RETURNING id INTO r4;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r1, 'olongapo-city-hostel', 'Bed ' || gs, true FROM generate_series(1,8) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r2, 'olongapo-city-hostel', 'Bed ' || gs, true FROM generate_series(1,6) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r3, 'olongapo-city-hostel', 'Bed ' || gs, true FROM generate_series(1,4) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r4, 'olongapo-city-hostel', 'Room ' || gs, true FROM generate_series(1,6) gs;

  INSERT INTO property_images (property_id, tenant_id, url, position)
  VALUES
    (pid, 'olongapo-city-hostel', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/07627cc2-6fbe-41d8-bf5b-2b2c8f51aee0.jpg', 1),
    (pid, 'olongapo-city-hostel', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/a3a2dc8d-79f3-411d-8636-d3c49f0a76cf.jpg', 2),
    (pid, 'olongapo-city-hostel', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/ed038bbb-8d02-4f77-831c-7b5454b545c1.jpg', 3),
    (pid, 'olongapo-city-hostel', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/718659b9-f748-4d98-886b-9e06b5b1bda5.jpg', 4);
END $$;


-- ============================================================
-- 6. Pundaquit Beach Resort  (San Antonio, resort) — 24 units
-- ============================================================
DO $$
DECLARE
  pid uuid; r1 uuid; r2 uuid; r3 uuid; r4 uuid;
BEGIN
  INSERT INTO properties (
    tenant_id, owner_id, name, slug, property_type,
    region, city, address_line, latitude, longitude,
    currency, payment_mode, manual_payment_methods,
    status, published_at, is_mock,
    cover_image_url, description,
    amenities, check_in_time, check_out_time, house_rules,
    free_cancel_days, partial_refund_percent
  ) VALUES (
    'pundaquit-beach-resort', '93639fa3-6900-4760-bea5-ca173bc8191a',
    'Pundaquit Beach Resort', 'pundaquit-beach-resort', 'resort',
    'Zambales', 'San Antonio', 'Pundaquit, San Antonio, Zambales',
    15.1842, 119.8612,
    'PHP', 'manual', '{"gcash":"09221234567","maya":"09221234567","bank":"Metrobank 9876543210 Pundaquit Resort"}',
    'active', now(), true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/9fe64752-02f0-44b9-91cd-7a82a675b63f.jpg',
    'Pundaquit is the gateway to Zambales'' most beautiful island coves. Our resort offers beachfront accommodations, a swimming pool, and daily bangka boat tours to Anawangin, Nagsasa, and Camara islands. Ideal for families and groups looking for a comfortable base with easy island access.',
    '{"wifi":true,"parking":true,"pool":true,"aircon":true,"restaurant":true,"gym":false}',
    '2:00 PM', '12:00 PM',
    'Pool area closes at 9 PM. Children must be supervised at all times near the water. Day tours must be booked by 7 AM.',
    3, 50
  ) RETURNING id INTO pid;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'pundaquit-beach-resort', 'Deluxe Beachfront Room', 'pundaquit-deluxe-beachfront',
    'private', 'private', 3, true, true, false, true, 350000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/1571ad1c-d061-4a1a-8a54-c380c217c925.jpg',
    'Spacious A/C room directly on the beach with a private terrace. King bed plus daybed. Sleeps 3.', 2)
  RETURNING id INTO r1;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'pundaquit-beach-resort', 'Family Cottage', 'pundaquit-family-cottage',
    'private', 'private', 6, true, true, false, true, 550000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/a6c08aa6-7364-46cf-b683-83c76ed502d9.jpg',
    'Stand-alone cottage with two bedrooms, living area, and kitchenette. Fits groups up to 6.', 2)
  RETURNING id INTO r2;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'pundaquit-beach-resort', 'Standard Room', 'pundaquit-standard-room',
    'private', 'private', 2, true, true, false, true, 220000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/ba63a65c-6f19-4fdf-ad27-50013c4ac7c1.jpg',
    'Garden-facing A/C room with double bed. Budget-friendly with full resort facilities access.', 1)
  RETURNING id INTO r3;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'pundaquit-beach-resort', 'Pool Suite', 'pundaquit-pool-suite',
    'private', 'private', 4, true, true, false, true, 650000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/57cfd4f8-f594-4d82-9965-93e84255f7be.jpg',
    'Top-tier suite with private plunge pool, wrap-around balcony, and panoramic sea views.', 2)
  RETURNING id INTO r4;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r1, 'pundaquit-beach-resort', 'Room ' || gs, true FROM generate_series(1,6) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r2, 'pundaquit-beach-resort', 'Cottage ' || gs, true FROM generate_series(1,4) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r3, 'pundaquit-beach-resort', 'Room ' || gs, true FROM generate_series(1,10) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r4, 'pundaquit-beach-resort', 'Suite ' || gs, true FROM generate_series(1,3) gs;

  INSERT INTO property_images (property_id, tenant_id, url, position)
  VALUES
    (pid, 'pundaquit-beach-resort', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/9fe64752-02f0-44b9-91cd-7a82a675b63f.jpg', 1),
    (pid, 'pundaquit-beach-resort', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/1571ad1c-d061-4a1a-8a54-c380c217c925.jpg', 2),
    (pid, 'pundaquit-beach-resort', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/a6c08aa6-7364-46cf-b683-83c76ed502d9.jpg', 3),
    (pid, 'pundaquit-beach-resort', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/cd3b9562-45f7-41a6-8bb6-be76ce2ae5d1.jpg', 4),
    (pid, 'pundaquit-beach-resort', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/57cfd4f8-f594-4d82-9965-93e84255f7be.jpg', 5);
END $$;


-- ============================================================
-- 7. San Antonio Beach Apartments  (San Antonio, apartment) — 14 units
-- ============================================================
DO $$
DECLARE
  pid uuid; r1 uuid; r2 uuid; r3 uuid;
BEGIN
  INSERT INTO properties (
    tenant_id, owner_id, name, slug, property_type,
    region, city, address_line, latitude, longitude,
    currency, payment_mode, manual_payment_methods,
    status, published_at, is_mock,
    cover_image_url, description,
    amenities, check_in_time, check_out_time, house_rules,
    free_cancel_days, partial_refund_percent
  ) VALUES (
    'san-antonio-apartments', '93639fa3-6900-4760-bea5-ca173bc8191a',
    'San Antonio Beach Apartments', 'san-antonio-beach-apartments', 'apartment',
    'Zambales', 'San Antonio', 'National Highway, San Antonio, Zambales',
    15.1680, 119.8820,
    'PHP', 'manual', '{"gcash":"09231234567","bank":"UnionBank 1122334455 SA Apartments"}',
    'active', now(), true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/ed038bbb-8d02-4f77-831c-7b5454b545c1.jpg',
    'Modern self-contained apartments 10 minutes from the Pundaquit boat launch. Ideal for extended stays, remote workers, and families who want the comforts of home while exploring Zambales. Each unit has a full kitchen, fast WiFi, and a dedicated workspace. Weekly and monthly rates available.',
    '{"wifi":true,"parking":true,"pool":false,"aircon":true,"restaurant":false,"gym":false}',
    '3:00 PM', '11:00 AM',
    'No parties or events. Smoking on balconies only. Pets negotiable — enquire before booking.',
    5, 50
  ) RETURNING id INTO pid;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'san-antonio-apartments', 'Studio Unit', 'sa-studio-unit',
    'private', 'private', 2, true, true, false, true, 180000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/718659b9-f748-4d98-886b-9e06b5b1bda5.jpg',
    'Compact studio with queen bed, full kitchen, A/C, and fast WiFi. Great for couples or solo travelers on longer stays.', 2)
  RETURNING id INTO r1;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'san-antonio-apartments', '1-Bedroom Apartment', 'sa-1br-apartment',
    'private', 'private', 3, true, true, false, true, 280000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/ed038bbb-8d02-4f77-831c-7b5454b545c1.jpg',
    'Separate bedroom with queen bed, living room, full kitchen, dining area, and balcony with mountain view.', 2)
  RETURNING id INTO r2;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'san-antonio-apartments', '2-Bedroom Apartment', 'sa-2br-apartment',
    'private', 'private', 5, true, true, false, true, 450000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/a6c08aa6-7364-46cf-b683-83c76ed502d9.jpg',
    'Two bedrooms, two bathrooms, full kitchen with appliances, living/dining area, and a private garden terrace.', 3)
  RETURNING id INTO r3;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r1, 'san-antonio-apartments', 'Unit ' || gs, true FROM generate_series(1,6) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r2, 'san-antonio-apartments', 'Unit ' || gs, true FROM generate_series(1,5) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r3, 'san-antonio-apartments', 'Unit ' || gs, true FROM generate_series(1,3) gs;

  INSERT INTO property_images (property_id, tenant_id, url, position)
  VALUES
    (pid, 'san-antonio-apartments', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/ed038bbb-8d02-4f77-831c-7b5454b545c1.jpg', 1),
    (pid, 'san-antonio-apartments', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/718659b9-f748-4d98-886b-9e06b5b1bda5.jpg', 2),
    (pid, 'san-antonio-apartments', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/a6c08aa6-7364-46cf-b683-83c76ed502d9.jpg', 3);
END $$;


-- ============================================================
-- 8. Zambales Backpacker Inn  (San Felipe, inn) — 20 beds
-- ============================================================
DO $$
DECLARE
  pid uuid; r1 uuid; r2 uuid; r3 uuid;
BEGIN
  INSERT INTO properties (
    tenant_id, owner_id, name, slug, property_type,
    region, city, address_line, latitude, longitude,
    currency, payment_mode, manual_payment_methods,
    status, published_at, is_mock,
    cover_image_url, description,
    amenities, check_in_time, check_out_time, house_rules,
    free_cancel_days, partial_refund_percent
  ) VALUES (
    'zambales-backpacker-inn', '93639fa3-6900-4760-bea5-ca173bc8191a',
    'Zambales Backpacker Inn', 'zambales-backpacker-inn', 'inn',
    'Zambales', 'San Felipe', 'San Felipe Proper, San Felipe, Zambales',
    15.0510, 119.8980,
    'PHP', 'manual', '{"gcash":"09241234567","maya":"09241234567"}',
    'active', now(), true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/6520c418-8c41-4984-8fd6-da76e3cab9a4.jpg',
    'A no-frills, traveler-friendly inn in San Felipe town proper. Walking distance to the market, tricycle hub, and jeepney terminal. Budget beds with clean shared bathrooms, a fully-equipped guest kitchen, and a hammock garden. Perfect for backpackers using San Felipe as a base for Liwliwa surf sessions and Zambales road trips.',
    '{"wifi":true,"parking":false,"pool":false,"aircon":false,"restaurant":false,"gym":false}',
    '1:00 PM', '10:00 AM',
    'Curfew at 1 AM. Guest kitchen available 6 AM–10 PM. Quiet hours 11 PM. No cooking smell-intensive food inside.',
    2, 50
  ) RETURNING id INTO pid;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'zambales-backpacker-inn', 'Budget Dorm (10-Bed)', 'zbi-budget-dorm-10',
    'dorm', 'shared', 10, false, true, true, true, 35000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/83a02164-1201-451d-8b58-8b1bd733aa3c.jpg',
    'Fan-cooled 10-bed mixed dorm. Metal bunk beds with individual lockers, outlets, and curtain privacy.', 1)
  RETURNING id INTO r1;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'zambales-backpacker-inn', 'Budget Dorm (6-Bed)', 'zbi-budget-dorm-6',
    'dorm', 'shared', 6, false, true, true, true, 38000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/f2d4084a-e78c-4e2c-81fb-1225e70f7595.jpg',
    'Smaller 6-bed dorm — a bit quieter. Same facilities as the 10-bed with dedicated shared bathroom.', 1)
  RETURNING id INTO r2;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'zambales-backpacker-inn', 'Basic Private Room', 'zbi-basic-private',
    'private', 'shared', 2, false, true, false, true, 120000, true,
    'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/6520c418-8c41-4984-8fd6-da76e3cab9a4.jpg',
    'Simple fan room with double bed and shared bathroom. Best value private option in town.', 1)
  RETURNING id INTO r3;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r1, 'zambales-backpacker-inn', 'Bed ' || gs, true FROM generate_series(1,10) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r2, 'zambales-backpacker-inn', 'Bed ' || gs, true FROM generate_series(1,6) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r3, 'zambales-backpacker-inn', 'Room ' || gs, true FROM generate_series(1,4) gs;

  INSERT INTO property_images (property_id, tenant_id, url, position)
  VALUES
    (pid, 'zambales-backpacker-inn', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/6520c418-8c41-4984-8fd6-da76e3cab9a4.jpg', 1),
    (pid, 'zambales-backpacker-inn', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/83a02164-1201-451d-8b58-8b1bd733aa3c.jpg', 2),
    (pid, 'zambales-backpacker-inn', 'https://pub-9b3c6c52ef10449a887ad24b73985c83.r2.dev/seed/a4bc93f1-42fa-428d-bbf2-3956d11debd9.jpg', 3);
END $$;


-- ============================================================
-- Summary
-- ============================================================
SELECT
  p.name,
  p.city,
  p.property_type AS type,
  MIN(r.base_nightly_rate_minor) AS price_from_minor,
  COUNT(DISTINCT r.id) AS rooms,
  COUNT(DISTINCT u.id) AS units,
  COUNT(DISTINCT pi.id) AS images
FROM properties p
LEFT JOIN rooms r ON r.property_id = p.id
LEFT JOIN units u ON u.room_id = r.id
LEFT JOIN property_images pi ON pi.property_id = p.id
WHERE p.is_mock = true
  AND p.owner_id = '93639fa3-6900-4760-bea5-ca173bc8191a'
GROUP BY p.id, p.name, p.city, p.property_type
ORDER BY p.city, p.name;
