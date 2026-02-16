-- ============================================
-- Cleanup fee_payments Table - Remove Duplicate Columns
-- ============================================
-- Purpose: Remove redundant columns that duplicate data from monthly_fees table
-- Date: 2026-01-11
-- ============================================

-- Remove columns that are redundant and exist in monthly_fees table
-- These will be dropped one at a time
ALTER TABLE fee_payments DROP COLUMN fee_month;
ALTER TABLE fee_payments DROP COLUMN fee_date;
ALTER TABLE fee_payments DROP COLUMN monthly_rent;
ALTER TABLE fee_payments DROP COLUMN carry_forward;
ALTER TABLE fee_payments DROP COLUMN total_due;
ALTER TABLE fee_payments DROP COLUMN fee_status;
ALTER TABLE fee_payments DROP COLUMN due_date;
ALTER TABLE fee_payments DROP COLUMN is_fee_header;
