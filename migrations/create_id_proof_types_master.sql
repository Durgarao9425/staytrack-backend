-- Create id_proof_types master table
CREATE TABLE IF NOT EXISTS id_proof_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  regex_pattern VARCHAR(255) NOT NULL,
  min_length INT NOT NULL,
  max_length INT NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default ID proof types
INSERT INTO id_proof_types (code, name, regex_pattern, min_length, max_length, display_order) VALUES
('AADHAR', 'Aadhar Card', '^[0-9]{12}$', 12, 12, 1),
('PAN', 'PAN Card', '^[A-Z]{5}[0-9]{4}[A-Z]{1}$', 10, 10, 2),
('VOTER', 'Voter ID', '^[A-Z0-9]{10}$', 10, 10, 3),
('DL', 'Driving License', '^[A-Z0-9]{13,16}$', 13, 16, 4),
('PASSPORT', 'Passport', '^[A-Z][0-9]{7}$', 8, 8, 5)
ON DUPLICATE KEY UPDATE display_order = VALUES(display_order);
