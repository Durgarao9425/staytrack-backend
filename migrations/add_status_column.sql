-- Migration: Add status column to students table
-- Date: 2025-11-08
-- Description: Adds the missing status column for student status tracking

ALTER TABLE students
ADD COLUMN status ENUM('Active', 'Inactive') DEFAULT 'Active'
AFTER due_date;
