-- ============================================
-- CREATE ROOM AMENITIES MASTER TABLE
-- ============================================
-- Description: Master table to store room amenities
-- This will be used in room forms throughout the application
-- Date: 2025-01-XX

CREATE TABLE IF NOT EXISTS room_amenities_master (
    amenity_id INT AUTO_INCREMENT PRIMARY KEY,
    amenity_name VARCHAR(100) NOT NULL UNIQUE,
    amenity_icon VARCHAR(50) NULL,
    description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default room amenities
INSERT INTO room_amenities_master (amenity_name, amenity_icon, description, display_order) VALUES
('AC', 'snowflake', 'Air conditioning in room', 1),
('Attached Bathroom', 'bath', 'Private bathroom attached to room', 2),
('WiFi', 'wifi', 'High-speed wireless internet connectivity', 3),
('Balcony', 'home', 'Private or shared balcony', 4),
('Window', 'window', 'Window with natural light and ventilation', 5),
('Cupboard', 'box', 'Storage cupboard or wardrobe', 6),
('Study Table', 'table', 'Study desk and chair', 7),
('Chair', 'chair', 'Comfortable chair for study', 8);

-- Add index for faster queries
CREATE INDEX idx_room_amenities_active ON room_amenities_master(is_active);
CREATE INDEX idx_room_amenities_order ON room_amenities_master(display_order);

-- ============================================
-- VERIFICATION QUERIES (Run these to verify)
-- ============================================

-- Verify table was created
-- SHOW TABLES LIKE 'room_amenities_master';

-- Verify amenities were inserted
-- SELECT * FROM room_amenities_master ORDER BY display_order;

-- Verify active amenities count
-- SELECT COUNT(*) as total_amenities FROM room_amenities_master WHERE is_active = TRUE;

