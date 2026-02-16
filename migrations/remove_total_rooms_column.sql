-- Migration to remove total_rooms column from hostel_master table
-- Room count will now be calculated dynamically from rooms table

ALTER TABLE hostel_master
DROP COLUMN total_rooms;









