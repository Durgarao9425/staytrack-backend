-- ============================================
-- Add due_date column to fee_payments table
-- ============================================
-- Purpose: Store due_date for each payment record
-- Date: 2026-01-12
-- ============================================

-- Add due_date column to fee_payments table
ALTER TABLE fee_payments
ADD COLUMN due_date DATE NULL AFTER payment_date;

-- Add index for due_date
ALTER TABLE fee_payments
ADD INDEX idx_due_date (due_date);
