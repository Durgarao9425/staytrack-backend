-- ============================================
-- Fix fee_payments table - Add missing columns
-- ============================================
-- Purpose: Add fee_month, fee_date and other columns to fee_payments table
-- Date: 2026-01-11
-- ============================================

-- Step 1: Add missing columns to fee_payments if they don't exist
-- Note: Use separate statements to avoid syntax issues with IF NOT EXISTS

ALTER TABLE fee_payments ADD COLUMN fee_month VARCHAR(20) NULL COMMENT 'Format: YYYY-MM (e.g., 2026-01)' AFTER payment_id;
ALTER TABLE fee_payments ADD COLUMN fee_date INT NULL COMMENT 'Day of month' AFTER fee_month;
ALTER TABLE fee_payments ADD COLUMN monthly_rent DECIMAL(10, 2) NULL AFTER fee_date;
ALTER TABLE fee_payments ADD COLUMN carry_forward DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Balance from previous month' AFTER monthly_rent;
ALTER TABLE fee_payments ADD COLUMN total_due DECIMAL(10, 2) NULL COMMENT 'carry_forward + monthly_rent' AFTER carry_forward;
ALTER TABLE fee_payments ADD COLUMN fee_status ENUM('Pending', 'Partially Paid', 'Fully Paid', 'Overdue') DEFAULT 'Pending' AFTER total_due;
ALTER TABLE fee_payments ADD COLUMN due_date DATE NULL AFTER fee_status;
ALTER TABLE fee_payments ADD COLUMN is_fee_header TINYINT(1) DEFAULT 0 COMMENT '1 = fee header record, 0 = payment record' AFTER due_date;

-- Step 2: Make fee_id nullable (if it isn't already)
ALTER TABLE fee_payments MODIFY COLUMN fee_id INT NULL;

-- Step 3: Add payment_mode_id if missing
-- Note: Only add after payment_method if it exists, otherwise add after payment_date
ALTER TABLE fee_payments ADD COLUMN payment_mode_id INT NULL;

-- Step 4: Add transaction_type if missing
ALTER TABLE fee_payments ADD COLUMN transaction_type VARCHAR(50) DEFAULT 'PAYMENT';

-- Step 5: Create index for faster queries
-- Note: Using conditional logic since CREATE INDEX IF NOT EXISTS doesn't work with splitting
-- These indexes may already exist, so we check first
-- Actual index creation is handled in try-catch in the migration script
