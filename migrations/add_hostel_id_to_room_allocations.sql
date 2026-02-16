-- Migration to add hostel_id column to room_allocations table
ALTER TABLE room_allocations
ADD COLUMN hostel_id INT NOT NULL AFTER room_id;

-- Add foreign key constraint
ALTER TABLE room_allocations
ADD CONSTRAINT fk_room_allocations_hostel
FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE;

-- Populate hostel_id for existing records based on room_id
UPDATE room_allocations ra
INNER JOIN rooms r ON ra.room_id = r.room_id
SET ra.hostel_id = r.hostel_id;









