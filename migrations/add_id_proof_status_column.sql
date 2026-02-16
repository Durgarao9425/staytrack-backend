-- Migration: Add id_proof_status column to students table
-- Date: 2025-11-08
-- Description: Adds the missing id_proof_status column that is required by the application

ALTER TABLE students
ADD COLUMN id_proof_status ENUM('Submitted', 'Not Submitted') DEFAULT 'Not Submitted'
AFTER id_proof_document_url;
