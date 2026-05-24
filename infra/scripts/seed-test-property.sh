#!/usr/bin/env bash
# Insert one test owner + one test property to verify end-to-end
set -e
docker exec tara-postgres psql -U tara -d tara_dev <<'SQL'
-- Insert a mock test owner
INSERT INTO users (email, full_name, is_mock)
VALUES ('maria@example.test', 'Maria''s Hostel Owner', true)
RETURNING id, email;

-- Insert a mock test property for that owner
WITH owner AS (
  SELECT id FROM users WHERE email = 'maria@example.test'
)
INSERT INTO properties (
  tenant_id, owner_id, name, slug, property_type,
  region, city, currency, payment_mode, is_mock
)
SELECT
  'maria-hostel',
  owner.id,
  'Maria''s Surf Hostel',
  'marias-surf-hostel',
  'hostel',
  'zambales',
  'San Antonio',
  'PHP',
  'manual',
  true
FROM owner
RETURNING id, name, region, payment_mode, status;
SQL
