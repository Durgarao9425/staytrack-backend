-- ============================================
-- Student Registration Enhancement Migration
-- ============================================
-- Purpose: Add new fields for complete student registration
-- Date: 2025-11-08
-- ============================================

-- Add new columns to students table
ALTER TABLE students
ADD COLUMN admission_fee DECIMAL(10, 2) DEFAULT 0.00 AFTER admission_date,
ADD COLUMN admission_status ENUM('Paid', 'Unpaid') DEFAULT 'Unpaid' AFTER admission_fee,
ADD COLUMN due_date DATE NULL AFTER admission_status,
ADD COLUMN status ENUM('Active', 'Inactive') DEFAULT 'Active' AFTER is_active,
ADD COLUMN id_proof_status ENUM('Submitted', 'Not Submitted') DEFAULT 'Not Submitted' AFTER id_proof_number;

-- Fix typo in column name
ALTER TABLE students
CHANGE COLUMN persent_working_address present_working_address TEXT;

-- Remove bed_number from room_allocations (we'll use floor from rooms table)
ALTER TABLE room_allocations
DROP COLUMN IF EXISTS bed_number;

-- Verify the changes
DESCRIBE students;
DESCRIBE room_allocations;

-- ============================================
-- Sample data update (optional)
-- ============================================
-- Update existing students to have default values
UPDATE students
SET admission_fee = 0.00
WHERE admission_fee IS NULL;

UPDATE students
SET admission_status = 'Unpaid'
WHERE admission_status IS NULL;

UPDATE students
SET status = 'Active'
WHERE status IS NULL;

UPDATE students
SET id_proof_status = 'Not Submitted'
WHERE id_proof_status IS NULL;
