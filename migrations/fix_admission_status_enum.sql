-- Migration: Fix admission_status ENUM values
-- Date: 2025-11-08
-- Description: Changes admission_status ENUM from ('Paid','Pending') to ('Paid','Unpaid')

-- Step 1: Add 'Unpaid' to the ENUM
ALTER TABLE students
MODIFY COLUMN admission_status ENUM('Paid', 'Pending', 'Unpaid') DEFAULT 'Pending';

-- Step 2: Update existing 'Pending' values to 'Unpaid'
UPDATE students SET admission_status = 'Unpaid' WHERE admission_status = 'Pending';

-- Step 3: Remove 'Pending' from the ENUM
ALTER TABLE students
MODIFY COLUMN admission_status ENUM('Paid', 'Unpaid') DEFAULT 'Unpaid';
