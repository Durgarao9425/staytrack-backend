-- Add amenities column to hostel_master table
ALTER TABLE hostel_master 
ADD COLUMN amenities TEXT AFTER total_rooms;

-- Update existing records with empty JSON array
UPDATE hostel_master 
SET amenities = '[]' 
WHERE amenities IS NULL;
