-- Script to fix hostel_id for a specific user
-- Replace user_id = 7 with the actual user_id you want to fix
-- Replace hostel_id = ? with the actual hostel_id you want to assign

-- Step 1: Check if user exists and their current hostel_id
SELECT 
    u.user_id, 
    u.full_name, 
    u.email, 
    u.hostel_id as current_hostel_id,
    h.hostel_id as hostel_from_hostel_master,
    h.hostel_name
FROM users u
LEFT JOIN hostel_master h ON h.owner_id = u.user_id AND h.is_active = 1
WHERE u.user_id = 7;

-- Step 2: Check all hostels owned by this user
SELECT 
    hostel_id, 
    hostel_name, 
    owner_id, 
    is_active
FROM hostel_master 
WHERE owner_id = 7;

-- Step 3: If a hostel exists for this owner, update the user's hostel_id
-- Replace 7 with the user_id and ? with the hostel_id from Step 2
UPDATE users 
SET hostel_id = (
    SELECT hostel_id 
    FROM hostel_master 
    WHERE owner_id = 7 
    AND is_active = 1 
    LIMIT 1
)
WHERE user_id = 7 
AND role_id = 2;

-- Step 4: Verify the update
SELECT 
    u.user_id, 
    u.full_name, 
    u.email, 
    u.hostel_id, 
    h.hostel_name
FROM users u
LEFT JOIN hostel_master h ON u.hostel_id = h.hostel_id
WHERE u.user_id = 7;









