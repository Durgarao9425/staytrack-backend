-- ============================================
-- Monthly Fee Management Enhancement
-- ============================================
-- Purpose: Add columns to students table for fee management
-- Date: 2025-12-07
-- ============================================

-- Add columns to students table for fee management
ALTER TABLE students
ADD COLUMN due_date_day INT NULL AFTER due_date,
ADD COLUMN fee_status ENUM('Active', 'Suspended', 'Hold') DEFAULT 'Active' AFTER status;

-- Create index for fee_status for faster queries
CREATE INDEX idx_fee_status ON students(fee_status);

-- Update existing students to have default due_date_day (15th)
UPDATE students
SET due_date_day = 15
WHERE due_date_day IS NULL;
