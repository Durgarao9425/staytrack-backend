const mysql = require('mysql2/promise');

async function fixFeeStructureTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    console.log('=== FIXING FEE_STRUCTURE TABLE ===\n');

    // Add missing columns
    console.log('1. Adding hostel_id column...');
    try {
      await connection.query(`
        ALTER TABLE fee_structure
        ADD COLUMN hostel_id INT NULL AFTER fee_structure_id
      `);
      console.log('   ✅ hostel_id added');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('   ℹ️  hostel_id already exists');
      } else {
        throw err;
      }
    }

    console.log('2. Adding amount column...');
    try {
      await connection.query(`
        ALTER TABLE fee_structure
        ADD COLUMN amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER frequency
      `);
      console.log('   ✅ amount added');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('   ℹ️  amount already exists');
      } else {
        throw err;
      }
    }

    // Add foreign key
    console.log('3. Adding foreign key constraint...');
    try {
      await connection.query(`
        ALTER TABLE fee_structure
        ADD CONSTRAINT fk_fee_hostel
        FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id)
        ON DELETE CASCADE
      `);
      console.log('   ✅ Foreign key added');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('   ℹ️  Foreign key already exists');
      } else {
        throw err;
      }
    }

    // Verify changes
    console.log('\n=== VERIFYING CHANGES ===\n');
    const [columns] = await connection.query('DESCRIBE fee_structure');
    console.log('Columns after fix:');
    columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col.Field} - ${col.Type}`);
    });

    console.log('\n✅ FEE_STRUCTURE TABLE FIXED!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

fixFeeStructureTable();
