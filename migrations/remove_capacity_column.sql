-- Migration to remove capacity column from rooms table
-- Capacity will no longer be stored, available_beds will be calculated from room_allocations

ALTER TABLE rooms
DROP COLUMN capacity;









