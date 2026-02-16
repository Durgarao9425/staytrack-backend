-- Add inactive_date column to students table
-- This column tracks when a student was marked as inactive
-- Used for auto-deletion of inactive students after 1 month

ALTER TABLE students
ADD COLUMN inactive_date DATE NULL AFTER status;

-- Add comment to the column
ALTER TABLE students
MODIFY COLUMN inactive_date DATE NULL
COMMENT 'Date when student was marked as inactive. Used for auto-cleanup after 1 month.';
