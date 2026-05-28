-- Owner contact phone for WhatsApp notifications and confirmed guest display
ALTER TABLE properties ADD COLUMN IF NOT EXISTS contact_phone text;
