-- Quick seed: one mock owner + one mock property in Zambales
INSERT INTO users (email, full_name, is_mock)
VALUES ('maria@example.test', 'Maria Test Owner', true)
ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
RETURNING id, email;

WITH owner_row AS (
  SELECT id FROM users WHERE email = 'maria@example.test'
)
INSERT INTO properties (
  tenant_id, owner_id, name, slug, property_type,
  region, city, currency, payment_mode, status, is_mock
)
SELECT
  'maria-hostel',
  owner_row.id,
  'Maria Surf Hostel',
  'maria-surf-hostel',
  'hostel',
  'zambales',
  'San Antonio',
  'PHP',
  'manual',
  'active',
  true
FROM owner_row
ON CONFLICT (slug) DO NOTHING
RETURNING id, name, region, payment_mode, status;
