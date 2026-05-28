-- Property check-in/out times and house rules
ALTER TABLE properties ADD COLUMN IF NOT EXISTS check_in_time text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS check_out_time text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS house_rules text;
