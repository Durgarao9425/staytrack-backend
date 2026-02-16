-- ============================================
-- Add Missing Columns to fee_payments Table
-- ============================================
-- Purpose: Add fee_month, fee_date and other columns needed for payment history
-- Date: 2026-01-11
-- ============================================

-- Step 1: Add missing columns to fee_payments table
-- Add columns that don't exist yet
ALTER TABLE fee_payments
ADD COLUMN IF NOT EXISTS fee_month VARCHAR(20) NULL COMMENT 'Format: YYYY-MM (e.g., 2026-01)' AFTER payment_id,
ADD COLUMN IF NOT EXISTS fee_date INT NULL COMMENT 'Day of month' AFTER fee_month,
ADD COLUMN IF NOT EXISTS monthly_rent DECIMAL(10, 2) NULL AFTER fee_date,
ADD COLUMN IF NOT EXISTS carry_forward DECIMAL(10, 2) DEFAULT 0.00 AFTER monthly_rent,
ADD COLUMN IF NOT EXISTS total_due DECIMAL(10, 2) NULL AFTER carry_forward,
ADD COLUMN IF NOT EXISTS fee_status ENUM('Pending', 'Partially Paid', 'Fully Paid', 'Overdue') DEFAULT 'Pending' AFTER total_due,
ADD COLUMN IF NOT EXISTS due_date DATE NULL AFTER fee_status,
ADD COLUMN IF NOT EXISTS is_fee_header TINYINT(1) DEFAULT 0 COMMENT '1 = fee header record, 0 = payment record' AFTER due_date;

-- Step 2: Add payment_mode_id if it doesn't exist (add at the end if payment_method doesn't exist)
ALTER TABLE fee_payments
ADD COLUMN IF NOT EXISTS payment_mode_id INT NULL COMMENT 'Reference to payment_modes table';

-- Step 3: Add transaction_type if it doesn't exist
ALTER TABLE fee_payments
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(50) DEFAULT 'PAYMENT' COMMENT 'PAYMENT, ADJUSTMENT, REFUND';

-- Step 4: Populate fee_month for existing payments (derive from payment_date)
UPDATE fee_payments fp
SET fp.fee_month = CONCAT(YEAR(fp.payment_date), '-', LPAD(MONTH(fp.payment_date), 2, '0'))
WHERE fp.fee_month IS NULL;

-- Step 5: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_student_id ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_month ON fee_payments(fee_month);
CREATE INDEX IF NOT EXISTS idx_is_fee_header ON fee_payments(is_fee_header);
CREATE INDEX IF NOT EXISTS idx_payment_date ON fee_payments(payment_date);

-- Step 6: Verify the changes
SELECT 'fee_payments table structure updated successfully!' as status;
SELECT COUNT(*) as total_payments,
       COUNT(CASE WHEN fee_month IS NOT NULL THEN 1 END) as payments_with_fee_month,
       COUNT(CASE WHEN is_fee_header = 0 THEN 1 END) as payment_records,
       COUNT(CASE WHEN is_fee_header = 1 THEN 1 END) as fee_header_records
FROM fee_payments;
