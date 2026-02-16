-- ============================================
-- Fix room_allocations field name inconsistency
-- ============================================
-- Issue: Schema shows 'is_current' but code uses 'is_active'
-- Solution: Standardize to 'is_current' as per schema design
-- ============================================

-- Check if is_active column exists (some databases might have it)
-- If it exists, migrate data to is_current and drop is_active

-- For MySQL/MariaDB:
-- Step 1: Ensure is_current column exists (it should be in schema)
-- ALTER TABLE room_allocations
-- MODIFY COLUMN is_current BOOLEAN DEFAULT TRUE;

-- Step 2: If you have an is_active column (check first), copy data and remove it
-- UPDATE room_allocations SET is_current = is_active WHERE is_active IS NOT NULL;
-- ALTER TABLE room_allocations DROP COLUMN IF EXISTS is_active;

-- Note: The schema already has is_current, so this migration is just for documentation
-- If your actual database has is_active instead, uncomment the lines above

-- Verify the column exists
DESCRIBE room_allocations;
