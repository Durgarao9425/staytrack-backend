const mysql = require('mysql2/promise');

async function createIncomeTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    console.log('=== CREATING INCOME TABLE ===\n');

    // Drop table if exists
    await connection.query(`DROP TABLE IF EXISTS income`);
    console.log('✓ Dropped existing income table (if any)\n');

    // Create income table
    const createTableQuery = `
      CREATE TABLE income (
        income_id INT PRIMARY KEY AUTO_INCREMENT,
        hostel_id INT NOT NULL,
        income_date DATE NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        source VARCHAR(255) NOT NULL,
        payment_mode_id INT NOT NULL,
        receipt_number VARCHAR(100),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE,
        FOREIGN KEY (payment_mode_id) REFERENCES payment_modes(payment_mode_id),
        INDEX idx_hostel_id (hostel_id),
        INDEX idx_income_date (income_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.query(createTableQuery);
    console.log('✅ Income table created successfully!\n');

    // Show table structure
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM income
    `);

    console.log('Table Structure:');
    console.log('================');
    columns.forEach(col => {
      console.log(`${col.Field.padEnd(20)} ${col.Type.padEnd(20)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n✅ INCOME TABLE SETUP COMPLETE!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

createIncomeTable();
