-- ============================================
-- Add transaction_type to fee_payments table
-- ============================================
-- Purpose: Support PAYMENT, ADJUSTMENT, REFUND transactions
-- Enables payment corrections without editing/deleting
-- Date: 2026-01-03
-- ============================================

-- Step 1: Add transaction_type column
ALTER TABLE fee_payments
ADD COLUMN transaction_type ENUM('PAYMENT', 'ADJUSTMENT', 'REFUND') NOT NULL DEFAULT 'PAYMENT' AFTER payment_mode_id;

-- Step 2: Add reason column for adjustments/refunds (required for audit trail)
ALTER TABLE fee_payments
ADD COLUMN reason VARCHAR(255) NULL AFTER notes;

-- Step 3: Modify amount column to allow negative values (for adjustments/refunds)
-- Note: DECIMAL already supports negative values, so no change needed

-- Step 4: Add index for transaction_type
ALTER TABLE fee_payments
ADD INDEX idx_transaction_type (transaction_type);

-- All existing payments will be marked as 'PAYMENT' by default
