-- Migration: Rename is_active column to status in students table
-- Date: 2025-11-08
-- Description: Renames is_active column to status and changes type to ENUM

-- Drop the status column that was added earlier (if exists)
ALTER TABLE students DROP COLUMN status;

-- Rename is_active to status and change its type from BOOLEAN to ENUM
ALTER TABLE students
CHANGE COLUMN is_active status ENUM('Active', 'Inactive') DEFAULT 'Active';
