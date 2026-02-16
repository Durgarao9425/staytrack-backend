-- ============================================
-- Consolidate monthly_fees into fee_payments and drop monthly_fees table
-- ============================================
-- Purpose: Store all fee details in fee_payments table only
-- Date: 2026-01-04
-- ============================================
-- WARNING: This is a destructive migration. Backup your database first!
-- ============================================

-- Step 1: Add all columns from monthly_fees to fee_payments
ALTER TABLE fee_payments
ADD COLUMN fee_month VARCHAR(20) NULL COMMENT 'Format: YYYY-MM (e.g., 2026-01)' AFTER payment_id,
ADD COLUMN fee_date INT NULL COMMENT 'Month (1-12)' AFTER fee_month,
ADD COLUMN monthly_rent DECIMAL(10, 2) NULL AFTER fee_date,
ADD COLUMN carry_forward DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Balance from previous month' AFTER monthly_rent,
ADD COLUMN total_due DECIMAL(10, 2) NULL COMMENT 'carry_forward + monthly_rent' AFTER carry_forward,
ADD COLUMN fee_status ENUM('Pending', 'Partially Paid', 'Fully Paid', 'Overdue') DEFAULT 'Pending' AFTER total_due,
ADD COLUMN due_date DATE NULL AFTER fee_status,
ADD COLUMN is_fee_header TINYINT(1) DEFAULT 0 COMMENT '1 = fee header record, 0 = payment record' AFTER due_date;

-- Step 2: Make fee_id nullable (since we'll drop monthly_fees)
ALTER TABLE fee_payments
MODIFY COLUMN fee_id INT NULL;

-- Step 3: Migrate data from monthly_fees to fee_payments
-- For each monthly_fees record, create a fee header record in fee_payments
INSERT INTO fee_payments (
  fee_id,
  student_id,
  hostel_id,
  fee_month,
  fee_date,
  monthly_rent,
  carry_forward,
  total_due,
  fee_status,
  due_date,
  is_fee_header,
  amount,
  payment_date,
  payment_method,
  payment_mode_id,
  transaction_type,
  notes,
  created_at,
  updated_at
)
SELECT 
  mf.fee_id,
  mf.student_id,
  mf.hostel_id,
  mf.fee_month,
  mf.fee_date,
  mf.monthly_rent,
  mf.carry_forward,
  mf.total_due,
  mf.fee_status,
  mf.due_date,
  1 as is_fee_header, -- Mark as fee header record
  0.00 as amount, -- Fee header record with 0 amount
  mf.created_at as payment_date,
  'Cash' as payment_method,
  NULL as payment_mode_id,
  'PAYMENT' as transaction_type,
  COALESCE(mf.notes, CONCAT('Fee record for ', mf.fee_month)) as notes,
  mf.created_at,
  mf.updated_at
FROM monthly_fees mf
WHERE NOT EXISTS (
  SELECT 1 FROM fee_payments fp 
  WHERE fp.student_id = mf.student_id 
  AND fp.fee_month = mf.fee_month
  AND fp.is_fee_header = 1
);

-- Step 4: Update existing fee_payments records to include fee_month and other details from monthly_fees
UPDATE fee_payments fp
INNER JOIN monthly_fees mf ON fp.fee_id = mf.fee_id
SET 
  fp.fee_month = mf.fee_month,
  fp.fee_date = mf.fee_date,
  fp.monthly_rent = mf.monthly_rent,
  fp.carry_forward = mf.carry_forward,
  fp.total_due = mf.total_due,
  fp.fee_status = mf.fee_status,
  fp.due_date = mf.due_date
WHERE fp.fee_month IS NULL;

-- Step 5: Add indexes for new columns
ALTER TABLE fee_payments
ADD INDEX idx_fee_month (fee_month),
ADD INDEX idx_fee_status (fee_status),
ADD INDEX idx_student_month (student_id, fee_month),
ADD INDEX idx_is_fee_header (is_fee_header);

-- Step 6: Drop foreign key constraint to monthly_fees (if exists)
-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Find and drop the foreign key constraint dynamically
SET @constraint_name = (
  SELECT CONSTRAINT_NAME 
  FROM information_schema.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'fee_payments'
  AND REFERENCED_TABLE_NAME = 'monthly_fees'
  LIMIT 1
);

-- Drop the constraint if it exists
SET @sql = IF(@constraint_name IS NOT NULL, 
  CONCAT('ALTER TABLE fee_payments DROP FOREIGN KEY ', @constraint_name), 
  'SELECT "No foreign key constraint found" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;

-- Step 7: Drop fee_history table (depends on monthly_fees)
DROP TABLE IF EXISTS fee_history;

-- Step 8: Drop monthly_fees table
DROP TABLE IF EXISTS monthly_fees;

-- Step 9: Add unique constraint for fee header records (one per student per month)
-- Note: This ensures one fee header record per student per month
ALTER TABLE fee_payments
ADD UNIQUE KEY unique_fee_header (student_id, fee_month, is_fee_header);

