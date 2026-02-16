-- ============================================
-- Monthly Fees and Payments Tables
-- ============================================
-- Purpose: Create tables for monthly fee tracking and payment recording
-- Date: 2025-12-07
-- ============================================

-- Create monthly_fees table
CREATE TABLE IF NOT EXISTS monthly_fees (
  fee_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  hostel_id INT NOT NULL,
  fee_month VARCHAR(20) NOT NULL COMMENT 'Format: YYYY-MM (e.g., 2026-01)',
  fee_date INT NOT NULL COMMENT 'Month (1-12)',
  monthly_rent DECIMAL(10, 2) NOT NULL,
  carry_forward DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Balance from previous month',
  total_due DECIMAL(10, 2) NOT NULL COMMENT 'carry_forward + monthly_rent',
  paid_amount DECIMAL(10, 2) DEFAULT 0.00,
  balance DECIMAL(10, 2) NOT NULL COMMENT 'total_due - paid_amount',
  fee_status ENUM('Pending', 'Partially Paid', 'Fully Paid', 'Overdue') DEFAULT 'Pending',
  due_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student_month (student_id, fee_month, fee_date),
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE,
  INDEX idx_student_id (student_id),
  INDEX idx_hostel_id (hostel_id),
  INDEX idx_fee_month (fee_month),
  INDEX idx_fee_status (fee_status),
  INDEX idx_due_date (due_date)
);

-- Create fee_payments table
CREATE TABLE IF NOT EXISTS fee_payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  fee_id INT NOT NULL,
  student_id INT NOT NULL,
  hostel_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method ENUM('Cash', 'Cheque', 'Online', 'Other') DEFAULT 'Cash',
  transaction_id VARCHAR(100) NULL COMMENT 'For online payments',
  receipt_number VARCHAR(100) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (fee_id) REFERENCES monthly_fees(fee_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE,
  INDEX idx_fee_id (fee_id),
  INDEX idx_student_id (student_id),
  INDEX idx_payment_date (payment_date),
  INDEX idx_hostel_id (hostel_id)
);

-- Create fee_history table for audit logging
CREATE TABLE IF NOT EXISTS fee_history (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  fee_id INT NOT NULL,
  student_id INT NOT NULL,
  action VARCHAR(50) NOT NULL COMMENT 'created, updated, paid, etc',
  old_values JSON NULL,
  new_values JSON NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fee_id) REFERENCES monthly_fees(fee_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  INDEX idx_fee_id (fee_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
);
