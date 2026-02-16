-- Migration: Fix owners without hostel_id
-- This script helps assign hostel_id to owners who don't have one yet
-- 
-- IMPORTANT: Review and modify the assignments below based on your actual data
-- Run this script after ensuring all hostels have been created

-- Step 1: Check which owners don't have a hostel_id
-- SELECT u.user_id, u.full_name, u.email, u.hostel_id, h.hostel_id as assigned_hostel_id, h.hostel_name
-- FROM users u
-- LEFT JOIN hostel_master h ON h.owner_id = u.user_id AND h.is_active = 1
-- WHERE u.role_id = 2 AND u.is_active = 1 AND u.hostel_id IS NULL;

-- Step 2: Assign hostel_id to owners based on their owner_id in hostel_master
-- This will link owners to hostels where they are listed as the owner
UPDATE users u
INNER JOIN hostel_master h ON h.owner_id = u.user_id AND h.is_active = 1
SET u.hostel_id = h.hostel_id
WHERE u.role_id = 2 
  AND u.is_active = 1 
  AND u.hostel_id IS NULL
  AND h.hostel_id IS NOT NULL;

-- Step 3: For owners who still don't have a hostel_id (no hostel created yet)
-- You'll need to either:
-- A) Create a hostel for them (which will now automatically set their hostel_id)
-- B) Manually assign them to an existing hostel using the query below:
-- 
-- Example: Assign user_id 7 to hostel_id 1
-- UPDATE users SET hostel_id = 1 WHERE user_id = 7 AND role_id = 2;

-- Step 4: Verify the assignments
-- SELECT u.user_id, u.full_name, u.email, u.hostel_id, h.hostel_name
-- FROM users u
-- LEFT JOIN hostel_master h ON u.hostel_id = h.hostel_id
-- WHERE u.role_id = 2 AND u.is_active = 1
-- ORDER BY u.user_id;









