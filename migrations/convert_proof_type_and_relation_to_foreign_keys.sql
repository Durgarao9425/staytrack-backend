-- Migration: Convert id_proof_type and guardian_relation to Foreign Keys
-- Purpose: Implement proper relational database design with data integrity
-- Date: 2026-01-31
-- Master tables ALREADY EXIST: id_proof_types, relations_master

-- ============================================================================
-- STEP 1: Backup current data
-- ============================================================================

CREATE TABLE IF NOT EXISTS students_backup_before_foreign_keys AS
SELECT * FROM students;

-- ============================================================================
-- STEP 2: Convert id_proof_type (VARCHAR to INT with Foreign Key)
-- ============================================================================

-- Update students where id_proof_type matches id_proof_types.name or code
UPDATE students s
SET s.id_proof_type = (
    SELECT p.id
    FROM id_proof_types p
    WHERE (p.name = s.id_proof_type OR p.code = s.id_proof_type)
    LIMIT 1
)
WHERE s.id_proof_type IS NOT NULL
  AND s.id_proof_type != ''
  AND EXISTS (
    SELECT 1 FROM id_proof_types p
    WHERE (p.name = s.id_proof_type OR p.code = s.id_proof_type)
  );

-- Set unmapped values to NULL (safe approach)
UPDATE students
SET id_proof_type = NULL
WHERE id_proof_type IS NOT NULL
  AND id_proof_type != ''
  AND NOT EXISTS (
    SELECT 1 FROM id_proof_types p
    WHERE (p.name = students.id_proof_type OR p.code = students.id_proof_type)
  );

-- ============================================================================
-- STEP 3: Convert guardian_relation (VARCHAR to INT with Foreign Key)
-- ============================================================================

-- Update students where guardian_relation matches relations_master.relation_name
UPDATE students s
SET s.guardian_relation = (
    SELECT r.relation_id
    FROM relations_master r
    WHERE r.relation_name = s.guardian_relation
    LIMIT 1
)
WHERE s.guardian_relation IS NOT NULL
  AND s.guardian_relation != ''
  AND EXISTS (
    SELECT 1 FROM relations_master r
    WHERE r.relation_name = s.guardian_relation
  );

-- Set unmapped values to NULL (safe approach)
UPDATE students
SET guardian_relation = NULL
WHERE guardian_relation IS NOT NULL
  AND guardian_relation != ''
  AND NOT EXISTS (
    SELECT 1 FROM relations_master r
    WHERE r.relation_name = students.guardian_relation
  );

-- ============================================================================
-- STEP 4: Modify column types from VARCHAR to INT
-- ============================================================================

ALTER TABLE students MODIFY COLUMN id_proof_type INT NULL;
ALTER TABLE students MODIFY COLUMN guardian_relation INT NULL;

-- ============================================================================
-- STEP 5: Add Foreign Key Constraints to Master Tables
-- ============================================================================

-- Foreign key for id_proof_type → id_proof_types
ALTER TABLE students
ADD CONSTRAINT fk_id_proof_type
FOREIGN KEY (id_proof_type)
REFERENCES id_proof_types(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Foreign key for guardian_relation → relations_master
ALTER TABLE students
ADD CONSTRAINT fk_guardian_relation
FOREIGN KEY (guardian_relation)
REFERENCES relations_master(relation_id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- ============================================================================
-- STEP 6: Create indexes for performance
-- ============================================================================

CREATE INDEX idx_students_id_proof_type ON students(id_proof_type);
CREATE INDEX idx_students_guardian_relation ON students(guardian_relation);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of changes:
-- ✅ Converted id_proof_type from VARCHAR(50) to INT
-- ✅ Converted guardian_relation from VARCHAR(50) to INT
-- ✅ Added FOREIGN KEY constraint: id_proof_type → id_proof_types(id)
-- ✅ Added FOREIGN KEY constraint: guardian_relation → relations_master(relation_id)
-- ✅ Created indexes for query performance
-- ✅ Created backup table: students_backup_before_foreign_keys
--
-- Data integrity ensured:
-- - Only valid IDs from master tables can be inserted
-- - Database enforces referential integrity
-- - ON DELETE SET NULL: If master record deleted, student record set to NULL
-- - ON UPDATE CASCADE: If master ID changes, student records auto-update
--
-- Rollback (if needed):
-- 1. RESTORE students from students_backup_before_foreign_keys
-- 2. DROP FOREIGN KEYS
-- 3. ALTER TABLE students MODIFY id_proof_type VARCHAR(50);
-- 4. ALTER TABLE students MODIFY guardian_relation VARCHAR(50);
