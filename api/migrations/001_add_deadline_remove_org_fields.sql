-- Grant Radar SG - Database Migration
-- Run this against AlloyDB to apply schema changes

-- 1. Add deadline column to grants table
ALTER TABLE grants ADD COLUMN IF NOT EXISTS deadline VARCHAR(100);

-- 2. Remove unused columns from organizations table
-- WARNING: This will delete existing data in these columns
ALTER TABLE organizations DROP COLUMN IF EXISTS registration_id;
ALTER TABLE organizations DROP COLUMN IF EXISTS organization_website;
ALTER TABLE organizations DROP COLUMN IF EXISTS mailing_address;


-- 3. Verify changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'grants' AND column_name = 'deadline';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'organizations';
