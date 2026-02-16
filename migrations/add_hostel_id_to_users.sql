-- Migration: Add hostel_id to users table
-- This changes the system from multi-hostel owners to single hostel per user

-- Step 1: Add hostel_id column to users table
ALTER TABLE users
ADD COLUMN hostel_id INT NULL AFTER role_id,
ADD CONSTRAINT fk_users_hostel FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE SET NULL;

-- Step 2: Update existing owner accounts to link to their primary hostel
-- For user_id = 2 (owner_mahendra), link to hostel_id = 5 (Risheek Boys Hostel)
UPDATE users SET hostel_id = 5 WHERE user_id = 2;

-- For user_id = 3 (owner_rajesh), link to hostel_id = 1 (Sunrise Boys Hostel)
UPDATE users SET hostel_id = 1 WHERE user_id = 3;

-- For user_id = 4 (rajareddy), link to hostel_id = 3 (TechPark Co-Ed Hostel)
UPDATE users SET hostel_id = 3 WHERE user_id = 4;

-- Step 3 (OPTIONAL): If you want to create separate accounts for each hostel
-- Create new user accounts for hostels that are currently shared by owner_mahendra

-- For hostel_id = 1 (Sunrise Boys Hostel) - if you want separate login
-- INSERT INTO users (username, email, password_hash, role_id, full_name, phone, hostel_id, is_active)
-- VALUES ('sunrise_admin', 'sunrise@hostelapp.com', '$2a$10$yourhashedpassword', 2, 'Sunrise Hostel Admin', '1234567890', 1, 1);

-- For hostel_id = 3 (TechPark Co-Ed Hostel) - if you want separate login
-- INSERT INTO users (username, email, password_hash, role_id, full_name, phone, hostel_id, is_active)
-- VALUES ('techpark_admin', 'techpark@hostelapp.com', '$2a$10$yourhashedpassword', 2, 'TechPark Hostel Admin', '1234567891', 3, 1);

-- Step 4: Create index for faster queries
CREATE INDEX idx_users_hostel_id ON users(hostel_id);

-- Verification queries
-- SELECT u.user_id, u.username, u.email, u.hostel_id, h.hostel_name
-- FROM users u
-- LEFT JOIN hostel_master h ON u.hostel_id = h.hostel_id
-- WHERE u.role_id = 2;
