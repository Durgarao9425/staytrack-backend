-- Migration: Convert ENUM fields to BOOLEAN (0/1) format
-- Purpose: Standardize status fields to use 0/1 instead of text values
-- Date: 2026-01-31

-- ============================================================================
-- STEP 1: Backup current data
-- ============================================================================

CREATE TABLE IF NOT EXISTS students_backup_before_enum_conversion AS
SELECT * FROM students;

-- ============================================================================
-- STEP 2: Add temporary columns to store converted values
-- ============================================================================

ALTER TABLE students ADD COLUMN id_proof_status_new TINYINT DEFAULT 0;
ALTER TABLE students ADD COLUMN admission_status_new TINYINT DEFAULT 0;
ALTER TABLE students ADD COLUMN status_new TINYINT DEFAULT 1;

-- ============================================================================
-- STEP 3: Convert id_proof_status (Submitted/Not Submitted → 1/0)
-- ============================================================================

UPDATE students
SET id_proof_status_new = CASE
  WHEN id_proof_status = 'Submitted' THEN 1
  WHEN id_proof_status = 'Not Submitted' THEN 0
  ELSE 0
END;

-- ============================================================================
-- STEP 4: Convert admission_status (Paid/Unpaid → 1/0)
-- ============================================================================

UPDATE students
SET admission_status_new = CASE
  WHEN admission_status = 'Paid' THEN 1
  WHEN admission_status = 'Unpaid' THEN 0
  ELSE 0
END;

-- ============================================================================
-- STEP 5: Convert status (Active/Inactive → 1/0)
-- ============================================================================

UPDATE students
SET status_new = CASE
  WHEN status = 'Active' THEN 1
  WHEN status = 'Inactive' THEN 0
  ELSE 1
END;

-- ============================================================================
-- STEP 6: Drop old columns and rename new columns
-- ============================================================================

-- Drop old columns
ALTER TABLE students DROP COLUMN id_proof_status;
ALTER TABLE students DROP COLUMN admission_status;
ALTER TABLE students DROP COLUMN status;

-- Rename new columns to original names
ALTER TABLE students RENAME COLUMN id_proof_status_new TO id_proof_status;
ALTER TABLE students RENAME COLUMN admission_status_new TO admission_status;
ALTER TABLE students RENAME COLUMN status_new TO status;

-- ============================================================================
-- STEP 7: Create indexes for performance
-- ============================================================================

CREATE INDEX idx_students_id_proof_status ON students(id_proof_status);
CREATE INDEX idx_students_admission_status ON students(admission_status);
CREATE INDEX idx_students_status ON students(status);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of changes:
-- ✅ id_proof_status: ENUM → TINYINT (1=Submitted, 0=Not Submitted)
-- ✅ admission_status: ENUM → TINYINT (1=Paid, 0=Unpaid)
-- ✅ status: ENUM → TINYINT (1=Active, 0=Inactive)
-- ✅ Created indexes for performance
-- ✅ Created backup table: students_backup_before_enum_conversion
--
-- Value mapping:
-- id_proof_status:     Submitted=1, Not Submitted=0
-- admission_status:    Paid=1, Unpaid=0
-- status:              Active=1, Inactive=0
--
-- Benefits:
-- - Smaller storage (1 byte per field)
-- - Faster queries (integer comparison)
-- - Consistent boolean representation
-- - Easier API integration
--
-- Rollback (if needed):
-- 1. RESTORE students from students_backup_before_enum_conversion
