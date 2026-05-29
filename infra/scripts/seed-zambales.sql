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
-- 1. Anawangin Cove Backpackers  (San Antonio, hostel)
-- ============================================================
DO $$
DECLARE
  pid uuid;
  r1 uuid; r2 uuid;
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
    'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&q=80',
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
    pid, 'anawangin-backpackers', 'Pine Grove Dorm (Mixed)', 'anawangin-pine-grove-dorm',
    'dorm', 'shared', 8, false, true, true, true, 45000, true,
    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=80',
    '8-bed mixed dorm surrounded by agoho pine trees. Fall asleep to the sea breeze.', 1
  ) RETURNING id INTO r1;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (
    pid, 'anawangin-backpackers', 'Cove View Private', 'anawangin-cove-view-private',
    'private', 'shared', 2, false, true, false, true, 120000, true,
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80',
    'Private fan room with direct view of the cove. Perfect for couples.', 2
  ) RETURNING id INTO r2;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r1, 'anawangin-backpackers', 'Bed ' || gs, true FROM generate_series(1,8) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  VALUES (r2, 'anawangin-backpackers', 'Room 1', true);

  INSERT INTO property_images (property_id, tenant_id, url, position)
  VALUES
    (pid, 'anawangin-backpackers', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', 1),
    (pid, 'anawangin-backpackers', 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=800&q=80', 2),
    (pid, 'anawangin-backpackers', 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80', 3),
    (pid, 'anawangin-backpackers', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80', 4);
END $$;


-- ============================================================
-- 2. Liwliwa Surf House  (San Felipe, guesthouse)
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
    'liwliwa-surf-house', '93639fa3-6900-4760-bea5-ca173bc8191a',
    'Liwliwa Surf House', 'liwliwa-surf-house', 'guesthouse',
    'Zambales', 'San Felipe', 'Liwliwa Beach, San Felipe, Zambales',
    15.0632, 119.9118,
    'PHP', 'manual', '{"gcash":"09181234567"}',
    'active', now(), true,
    'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&q=80',
    'Liwliwa is Zambales'' crown jewel for surfing, and our surf house sits just 30 meters from the break. We offer board rentals, surf lessons with certified instructors, and a laid-back vibe that keeps guests coming back season after season. The restaurant serves fresh catches from the local fishermen daily.',
    '{"wifi":true,"parking":true,"pool":false,"aircon":false,"restaurant":true,"gym":false}',
    '1:00 PM', '11:00 AM',
    'Rinse your boards before bringing them in. No outside food in the restaurant. Quiet hours 11 PM.',
    3, 50
  ) RETURNING id INTO pid;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'liwliwa-surf-house', 'Surfer Dorm', 'liwliwa-surfer-dorm',
    'dorm', 'shared', 6, false, true, true, true, 55000, true,
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80',
    '6-bed dorm for the surf crowd. Board storage right outside.', 1)
  RETURNING id INTO r1;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'liwliwa-surf-house', 'Beachfront Kubo', 'liwliwa-beachfront-kubo',
    'private', 'private', 2, false, true, false, true, 180000, true,
    'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=600&q=80',
    'Nipa hut right on the sand. Sliding door opens to the beach.', 2)
  RETURNING id INTO r2;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'liwliwa-surf-house', 'Garden Twin', 'liwliwa-garden-twin',
    'private', 'shared', 2, false, true, false, false, 140000, true,
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80',
    'Twin beds in a quiet garden-facing room. Great for friends.', 1)
  RETURNING id INTO r3;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r1, 'liwliwa-surf-house', 'Bed ' || gs, true FROM generate_series(1,6) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r2, 'liwliwa-surf-house', 'Kubo ' || gs, true FROM generate_series(1,2) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r3, 'liwliwa-surf-house', 'Room ' || gs, true FROM generate_series(1,2) gs;

  INSERT INTO property_images (property_id, tenant_id, url, position)
  VALUES
    (pid, 'liwliwa-surf-house', 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&q=80', 1),
    (pid, 'liwliwa-surf-house', 'https://images.unsplash.com/photo-1455130624386-52f569c695e3?w=800&q=80', 2),
    (pid, 'liwliwa-surf-house', 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80', 3);
END $$;


-- ============================================================
-- 3. Subic Bay Dive & Stay  (Subic/Olongapo, hotel)
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
    'subic-dive-stay', '93639fa3-6900-4760-bea5-ca173bc8191a',
    'Subic Bay Dive & Stay', 'subic-bay-dive-stay', 'hotel',
    'Zambales', 'Olongapo', 'Waterfront Road, Subic Bay Freeport Zone, Olongapo',
    14.8027, 120.2729,
    'PHP', 'manual', '{"gcash":"09191234567","bank":"BDO 1234567890 Subic Dive Inc"}',
    'active', now(), true,
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
    'Subic Bay is famous for its WWII shipwreck dive sites and crystal-clear waters. Our dive center and guesthouse combination is perfect for PADI-certified divers and beginners alike. We run two dive trips daily to the USS New York wreck, El Capitan, and San Quentin reef. Gear rental and PADI Open Water courses available.',
    '{"wifi":true,"parking":true,"pool":true,"aircon":true,"restaurant":true,"gym":false}',
    '2:00 PM', '12:00 PM',
    'Dive certification required for advanced sites. No alcohol before diving. Equipment must be rinsed after use.',
    3, 75
  ) RETURNING id INTO pid;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'subic-dive-stay', 'Diver Dorm', 'subic-diver-dorm',
    'dorm', 'shared', 4, true, true, true, true, 75000, true,
    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=80',
    '4-bed A/C dorm with extra-large lockers for dive gear.', 1)
  RETURNING id INTO r1;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'subic-dive-stay', 'Bay View Double', 'subic-bay-view-double',
    'private', 'private', 2, true, true, false, true, 250000, true,
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&q=80',
    'Double room with A/C and a view of Subic Bay. Includes daily breakfast.', 1)
  RETURNING id INTO r2;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'subic-dive-stay', 'Family Suite', 'subic-family-suite',
    'private', 'private', 4, true, true, false, true, 380000, true,
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80',
    'Spacious suite with queen bed + two singles. Great for families exploring the bay.', 2)
  RETURNING id INTO r3;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r1, 'subic-dive-stay', 'Bed ' || gs, true FROM generate_series(1,4) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r2, 'subic-dive-stay', 'Room ' || gs, true FROM generate_series(1,3) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r3, 'subic-dive-stay', 'Suite ' || gs, true FROM generate_series(1,2) gs;

  INSERT INTO property_images (property_id, tenant_id, url, position)
  VALUES
    (pid, 'subic-dive-stay', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80', 1),
    (pid, 'subic-dive-stay', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', 2),
    (pid, 'subic-dive-stay', 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80', 3),
    (pid, 'subic-dive-stay', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80', 4);
END $$;


-- ============================================================
-- 4. Nagsasa Cove Eco Camp  (San Antonio, hostel, off-grid)
-- ============================================================
DO $$
DECLARE
  pid uuid; r1 uuid; r2 uuid;
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
    'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&q=80',
    'Nagsasa Cove is a secluded paradise accessible only by boat from Pundaquit. Our eco camp is built entirely from bamboo and reclaimed materials, with solar power and composting toilets. This is off-grid living at its finest — no electricity after 9 PM, just stars, waves, and agoho pines. Two-hour boat ride from Pundaquit included in your stay.',
    '{"wifi":false,"parking":false,"pool":false,"aircon":false,"restaurant":true,"gym":false}',
    '12:00 PM', '9:00 AM',
    'Leave no trace. All trash must be carried out. No generators. Solar lanterns provided after 9 PM.',
    1, 0
  ) RETURNING id INTO pid;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'nagsasa-eco-camp', 'Bamboo Dorm', 'nagsasa-bamboo-dorm',
    'dorm', 'shared', 10, false, true, false, false, 40000, true,
    'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=600&q=80',
    '10-bed bamboo bunkhouse with sea views from every bed. Mosquito nets provided.', 2)
  RETURNING id INTO r1;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'nagsasa-eco-camp', 'Glamping Tent', 'nagsasa-glamping-tent',
    'private', 'shared', 2, false, true, false, false, 160000, true,
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80',
    'Furnished safari tent on a raised platform, 10 meters from the waterline. Includes dinner and breakfast.', 2)
  RETURNING id INTO r2;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r1, 'nagsasa-eco-camp', 'Bed ' || gs, true FROM generate_series(1,10) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r2, 'nagsasa-eco-camp', 'Tent ' || gs, true FROM generate_series(1,4) gs;

  INSERT INTO property_images (property_id, tenant_id, url, position)
  VALUES
    (pid, 'nagsasa-eco-camp', 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&q=80', 1),
    (pid, 'nagsasa-eco-camp', 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80', 2),
    (pid, 'nagsasa-eco-camp', 'https://images.unsplash.com/photo-1532339142463-fd0a8979791a?w=800&q=80', 3);
END $$;


-- ============================================================
-- 5. Olongapo City Hostel  (Olongapo, urban hostel)
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
    'olongapo-city-hostel', '93639fa3-6900-4760-bea5-ca173bc8191a',
    'Olongapo City Hostel', 'olongapo-city-hostel', 'hostel',
    'Zambales', 'Olongapo', '15 Gordon Ave, Olongapo City, Zambales',
    14.8289, 120.2827,
    'PHP', 'manual', '{"gcash":"09211234567","maya":"09211234567"}',
    'active', now(), true,
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
    'Centrally located in Olongapo City, two minutes walk from the Subic Bay Freeport Zone entrance. Great jumping-off point for day trips to Zambales beaches and Subic historical sites. Our social common area and rooftop bar make it easy to meet fellow travelers.',
    '{"wifi":true,"parking":true,"pool":false,"aircon":true,"restaurant":false,"gym":true}',
    '2:00 PM', '11:00 AM',
    'Guest ID required at check-in. No visitors after midnight. Rooftop bar closes at 11 PM.',
    3, 50
  ) RETURNING id INTO pid;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'olongapo-city-hostel', 'A/C Mixed Dorm 6-Bed', 'olongapo-ac-mixed-6',
    'dorm', 'shared', 6, true, true, true, true, 65000, true,
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80',
    'Air-conditioned 6-bed mixed dorm with individual reading lights and power outlets.', 1)
  RETURNING id INTO r1;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'olongapo-city-hostel', 'Female Dorm 4-Bed', 'olongapo-female-4',
    'dorm', 'shared', 4, true, true, true, true, 70000, true,
    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=80',
    'Female-only A/C dorm with private bathroom and vanity area.', 1)
  RETURNING id INTO r2;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'olongapo-city-hostel', 'Private Double', 'olongapo-private-double',
    'private', 'private', 2, true, true, false, true, 200000, true,
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&q=80',
    'Private A/C double room with en-suite bathroom and city view.', 1)
  RETURNING id INTO r3;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r1, 'olongapo-city-hostel', 'Bed ' || gs, true FROM generate_series(1,12) gs; -- 2 dorm pods

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r2, 'olongapo-city-hostel', 'Bed ' || gs, true FROM generate_series(1,4) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r3, 'olongapo-city-hostel', 'Room ' || gs, true FROM generate_series(1,5) gs;

  INSERT INTO property_images (property_id, tenant_id, url, position)
  VALUES
    (pid, 'olongapo-city-hostel', 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80', 1),
    (pid, 'olongapo-city-hostel', 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80', 2),
    (pid, 'olongapo-city-hostel', 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80', 3),
    (pid, 'olongapo-city-hostel', 'https://images.unsplash.com/photo-1586611292717-f828b167408c?w=800&q=80', 4);
END $$;


-- ============================================================
-- 6. Pundaquit Beach Resort  (San Antonio, resort)
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
    'pundaquit-beach-resort', '93639fa3-6900-4760-bea5-ca173bc8191a',
    'Pundaquit Beach Resort', 'pundaquit-beach-resort', 'resort',
    'Zambales', 'San Antonio', 'Pundaquit, San Antonio, Zambales',
    15.1842, 119.8612,
    'PHP', 'manual', '{"gcash":"09221234567","maya":"09221234567","bank":"Metrobank 9876543210 Pundaquit Resort"}',
    'active', now(), true,
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
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
    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80',
    'Spacious A/C room directly on the beach with a private terrace. Sleeps 3.', 2)
  RETURNING id INTO r1;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'pundaquit-beach-resort', 'Family Cottage', 'pundaquit-family-cottage',
    'private', 'private', 6, true, true, false, true, 550000, true,
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80',
    'Stand-alone cottage with two bedrooms, living area, and kitchenette. Fits groups up to 6.', 2)
  RETURNING id INTO r2;

  INSERT INTO rooms (property_id, tenant_id, name, slug, room_type, bathroom_type, capacity,
    has_aircon, has_window, has_locker, has_outlet_per_bed, base_nightly_rate_minor,
    is_mock, cover_image_url, description, min_nights)
  VALUES (pid, 'pundaquit-beach-resort', 'Standard Room', 'pundaquit-standard-room',
    'private', 'private', 2, true, true, false, true, 220000, true,
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80',
    'Garden-facing A/C room with double bed. Budget-friendly with resort facilities access.', 1)
  RETURNING id INTO r3;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r1, 'pundaquit-beach-resort', 'Room ' || gs, true FROM generate_series(1,6) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r2, 'pundaquit-beach-resort', 'Cottage ' || gs, true FROM generate_series(1,3) gs;

  INSERT INTO units (room_id, tenant_id, label, is_mock)
  SELECT r3, 'pundaquit-beach-resort', 'Room ' || gs, true FROM generate_series(1,8) gs;

  INSERT INTO property_images (property_id, tenant_id, url, position)
  VALUES
    (pid, 'pundaquit-beach-resort', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80', 1),
    (pid, 'pundaquit-beach-resort', 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80', 2),
    (pid, 'pundaquit-beach-resort', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80', 3),
    (pid, 'pundaquit-beach-resort', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', 4),
    (pid, 'pundaquit-beach-resort', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80', 5);
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
