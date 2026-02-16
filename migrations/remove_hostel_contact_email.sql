-- Migration: Remove contact_number and email columns from hostel_master table
-- Date: 2024
-- Description: These columns are no longer needed as contact details come from the owner (users table)

-- Drop contact_number column
ALTER TABLE hostel_master DROP COLUMN IF EXISTS contact_number;

-- Drop email column
ALTER TABLE hostel_master DROP COLUMN IF EXISTS email;









