const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runSQLMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'Hostel'
  });

  try {
    console.log('=== RUNNING SQL MIGRATION ===\n');
    console.log('Migration: add_room_fields_to_students.sql\n');

    // Read the SQL file
    const sqlFile = path.join(__dirname, '../migrations/add_room_fields_to_students.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Remove comments and split by semicolons
    let cleanSql = sql
      .replace(/--.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments

    // Split by semicolons and filter empty statements
    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await connection.query(statement);
          console.log(`✓ Statement ${i + 1} executed successfully\n`);
        } catch (error) {
          // Check if error is because column/index already exists
          if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_DUP_KEYNAME') {
            console.log(`⚠️  Statement ${i + 1} skipped (already exists): ${error.message}\n`);
          } else {
            throw error;
          }
        }
      }
    }

    // Verify columns were added
    console.log('Verifying migration...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'students' 
        AND COLUMN_NAME IN ('room_id', 'monthly_rent')
    `, [process.env.DB_NAME || 'Hostel']);

    if (columns.length === 2) {
      console.log('✓ Migration successful! Columns room_id and monthly_rent added to students table\n');
    } else {
      console.error(`❌ Migration incomplete. Found ${columns.length} of 2 required columns.`);
      process.exit(1);
    }

    console.log('='.repeat(60));
    console.log('✅ SQL Migration completed successfully!');
    console.log('='.repeat(60));
    console.log('\nNext step: Run data migration script');
    console.log('  node scripts/migrate-room-allocations-to-students.cjs');

  } catch (error) {
    console.error('❌ Error running migration:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

runSQLMigration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

