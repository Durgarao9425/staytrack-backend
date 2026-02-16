-- Migration: Add floor_number column to students table
-- Date: 2025-11-08
-- Description: Adds floor_number column to store the floor assignment for each student

ALTER TABLE students
ADD COLUMN floor_number INT NULL
AFTER room_id;
