-- Migration: Add Fee Categories Support
-- Description: Enables multiple fee categories per student and carry-forward tracking
-- Date: 2025-01-XX

-- ============================================
-- STEP 1: Modify student_dues table
-- ============================================

-- Add fee_category_id column (nullable for backward compatibility)
ALTER TABLE student_dues
ADD COLUMN fee_category_id INT NULL AFTER hostel_id,
ADD COLUMN is_carried_forward BOOLEAN DEFAULT FALSE AFTER balance_amount,
ADD COLUMN carried_from_month VARCHAR(20) NULL AFTER is_carried_forward,
ADD CONSTRAINT fk_student_dues_fee_category
    FOREIGN KEY (fee_category_id) REFERENCES fee_structure(fee_structure_id) ON DELETE SET NULL;

-- Add index for faster queries
CREATE INDEX idx_student_dues_category ON student_dues(fee_category_id);
CREATE INDEX idx_student_dues_month ON student_dues(due_month);
CREATE INDEX idx_student_dues_student_month ON student_dues(student_id, due_month);

-- ============================================
-- STEP 2: Populate fee_structure with default categories
-- ============================================

-- Insert default fee categories for existing hostels
-- You'll need to replace hostel_id values based on your actual data

-- For demonstration, inserting common categories
-- Admin should customize these through the UI later

INSERT INTO fee_structure (hostel_id, fee_type, amount, frequency, is_active) VALUES
-- Hostel ID 1 (replace with actual IDs)
(1, 'Monthly Rent', 5000.00, 'Monthly', TRUE),
(1, 'Electricity', 500.00, 'Monthly', TRUE),
(1, 'Maintenance', 300.00, 'Monthly', TRUE),
(1, 'Mess Fee', 3000.00, 'Monthly', TRUE),
(1, 'Water Charges', 200.00, 'Monthly', TRUE);

-- Note: Add more INSERT statements for other hostels as needed
-- Or use a dynamic script to populate based on existing hostel_master records

-- ============================================
-- STEP 3: Migrate existing dues to use categories
-- ============================================

-- For existing student_dues records without category,
-- link them to the "Monthly Rent" category

UPDATE student_dues sd
SET sd.fee_category_id = (
    SELECT fs.fee_structure_id
    FROM fee_structure fs
    WHERE fs.hostel_id = sd.hostel_id
    AND fs.fee_type = 'Monthly Rent'
    LIMIT 1
)
WHERE sd.fee_category_id IS NULL;

-- ============================================
-- STEP 4: Add paid_date column
-- ============================================

-- Add paid_date column which was missing in original schema
-- This fixes the issue where paid_date was referenced but didn't exist

ALTER TABLE student_dues
ADD COLUMN paid_date DATE NULL AFTER is_paid;

-- ============================================
-- VERIFICATION QUERIES (Run these to verify)
-- ============================================

-- Verify fee_structure has categories
-- SELECT * FROM fee_structure;

-- Verify student_dues has fee_category_id populated
-- SELECT sd.due_id, sd.student_id, sd.due_month, sd.fee_category_id, fs.fee_type
-- FROM student_dues sd
-- LEFT JOIN fee_structure fs ON sd.fee_category_id = fs.fee_structure_id
-- LIMIT 10;

-- Verify indexes are created
-- SHOW INDEXES FROM student_dues;
