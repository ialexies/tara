CREATE TABLE IF NOT EXISTS property_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS property_enquiries_property_idx
  ON property_enquiries (property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS property_enquiries_tenant_idx
  ON property_enquiries (tenant_id);
