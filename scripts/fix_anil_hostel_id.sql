-- Quick fix script for user_id 7 (Anil)
-- This will automatically assign hostel_id if a hostel exists for this owner

-- Step 1: Check if a hostel exists for this owner
SELECT 
    hostel_id, 
    hostel_name, 
    owner_id, 
    is_active
FROM hostel_master 
WHERE owner_id = 7 AND is_active = 1;

-- Step 2: If a hostel exists, update the user's hostel_id automatically
UPDATE users 
SET hostel_id = (
    SELECT hostel_id 
    FROM hostel_master 
    WHERE owner_id = 7 
    AND is_active = 1 
    ORDER BY created_at DESC
    LIMIT 1
)
WHERE user_id = 7 
AND role_id = 2
AND hostel_id IS NULL;

-- Step 3: Verify the update
SELECT 
    u.user_id, 
    u.full_name, 
    u.email, 
    u.hostel_id, 
    h.hostel_name,
    h.hostel_id as hostel_id_from_hostel_master
FROM users u
LEFT JOIN hostel_master h ON u.hostel_id = h.hostel_id
WHERE u.user_id = 7;









