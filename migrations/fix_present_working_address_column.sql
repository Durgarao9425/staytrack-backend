-- Migration: Fix typo in column name from persent_working_address to present_working_address
-- Date: 2025-11-08
-- Description: Renames the misspelled column name in students table

ALTER TABLE students
CHANGE COLUMN persent_working_address present_working_address TEXT;
