-- ============================================
-- Student Applications Table
-- ============================================
-- Purpose: Store self-registration submissions before admin approval
-- Date: 2026-02-15
-- ============================================

CREATE TABLE IF NOT EXISTS student_applications (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    
    -- Basic Info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    email VARCHAR(100) NULL,
    date_of_birth DATE NULL,
    gender ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
    
    -- Address
    permanent_address TEXT NULL,
    
    -- Guardian Info
    guardian_name VARCHAR(100) NULL,
    guardian_phone VARCHAR(15) NULL,
    
    -- ID Proof
    id_proof_type_id INT NULL,
    id_proof_number VARCHAR(100) NULL,
    
    -- Status
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    rejection_reason TEXT NULL,
    
    -- Timestamps
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    reviewed_by INT NULL,
    
    -- Foreign Keys
    FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE,
    
    INDEX idx_hostel_id (hostel_id),
    INDEX idx_status (status),
    INDEX idx_submitted_at (submitted_at)
);
