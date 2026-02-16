
-- Update users table to add hostel_id column
ALTER TABLE users ADD COLUMN hostel_id INT;
ALTER TABLE users ADD FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id);

-- Update admin user with dummy password (if needed, but schema handles this)
-- The password 'Password123' hash needs to be valid if we are resetting
-- For now, just fixing the schema issue.
