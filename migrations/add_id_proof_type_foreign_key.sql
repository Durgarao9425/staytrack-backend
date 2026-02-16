-- Add foreign key relationship for id_proof_type
-- This migration adds id_proof_type_id column and creates a foreign key relationship with id_proof_types table

-- First, add the new id_proof_type_id column if it doesn't exist
ALTER TABLE students
ADD COLUMN IF NOT EXISTS id_proof_type_id INT,
ADD CONSTRAINT fk_id_proof_type_id
FOREIGN KEY (id_proof_type_id)
REFERENCES id_proof_types(id)
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Create index on the foreign key for better performance
CREATE INDEX IF NOT EXISTS idx_id_proof_type_id ON students(id_proof_type_id);
