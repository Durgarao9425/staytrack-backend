-- Create relations_master table for guardian relations
CREATE TABLE IF NOT EXISTS relations_master (
  relation_id INT AUTO_INCREMENT PRIMARY KEY,
  relation_name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  is_active TINYINT DEFAULT 1,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default relations
INSERT INTO relations_master (relation_name, display_order, description) VALUES
('Father', 1, 'Student\'s father'),
('Mother', 2, 'Student\'s mother'),
('Brother', 3, 'Student\'s brother'),
('Sister', 4, 'Student\'s sister'),
('Uncle', 5, 'Student\'s uncle'),
('Aunt', 6, 'Student\'s aunt'),
('Grandfather', 7, 'Student\'s grandfather'),
('Grandmother', 8, 'Student\'s grandmother'),
('Other', 9, 'Other relation')
ON DUPLICATE KEY UPDATE display_order = VALUES(display_order);
