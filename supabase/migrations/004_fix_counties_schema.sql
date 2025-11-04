-- Add fips_code column to counties table and update schema for UK
ALTER TABLE counties ADD COLUMN IF NOT EXISTS fips_code VARCHAR(10);
ALTER TABLE counties ADD COLUMN IF NOT EXISTS state VARCHAR(5);

-- Remove any existing county data (since we're switching from US to UK)
TRUNCATE counties;