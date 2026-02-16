-- ============================================
-- Add room allocation fields to students table
-- ============================================
-- Purpose: Move room allocation data from room_allocations table to students table
-- Date: 2026-01-03
-- ============================================

-- Add room_id column to students table
ALTER TABLE students
ADD COLUMN room_id INT NULL AFTER hostel_id;

-- Add foreign key constraint for room_id
ALTER TABLE students
ADD CONSTRAINT fk_students_room
FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE SET NULL;

-- Add monthly_rent column to students table
ALTER TABLE students
ADD COLUMN monthly_rent DECIMAL(10, 2) NULL AFTER room_id;

-- Add index on room_id for better query performance
CREATE INDEX idx_students_room_id ON students(room_id);

-- Add index on room_id and status for occupancy queries
CREATE INDEX idx_students_room_status ON students(room_id, status);








