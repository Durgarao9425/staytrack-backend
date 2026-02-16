#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  let connection;
  try {
    console.log('🔧 Connecting to database...');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });

    console.log('✅ Connected to database\n');
    console.log('🔄 Running migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/fix_fee_payments_columns.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration - split by semicolon and execute each statement individually
    // This allows us to handle errors per statement
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      try {
        const trimmedStmt = statement.trim();
        if (trimmedStmt) {
          await connection.query(trimmedStmt);
        }
      } catch (stmtError) {
        // Ignore "Duplicate column" errors, as columns may already exist
        if (stmtError.code === 'ER_DUP_FIELDNAME') {
          console.log(`ℹ️  Column already exists (skipping): ${stmtError.message.substring(0, 50)}...`);
        } else if (stmtError.code === 'ER_DUP_KEYNAME') {
          // Ignore "Duplicate key name" errors for indexes
          console.log(`ℹ️  Index already exists (skipping): ${stmtError.message.substring(0, 50)}...`);
        } else {
          // Re-throw other errors
          throw stmtError;
        }
      }
    }

    // Create indexes separately (ignore if they already exist)
    try {
      await connection.query('CREATE INDEX idx_student_id ON fee_payments(student_id)');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    }
    try {
      await connection.query('CREATE INDEX idx_fee_month ON fee_payments(fee_month)');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    }
    try {
      await connection.query('CREATE INDEX idx_is_fee_header ON fee_payments(is_fee_header)');
    } catch (e) {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Database Changes:');
    console.log('   ✓ Added fee_month column');
    console.log('   ✓ Added fee_date column');
    console.log('   ✓ Added monthly_rent column');
    console.log('   ✓ Added carry_forward column');
    console.log('   ✓ Added total_due column');
    console.log('   ✓ Added fee_status column');
    console.log('   ✓ Added due_date column');
    console.log('   ✓ Added is_fee_header column');
    console.log('   ✓ Added payment_mode_id column');
    console.log('   ✓ Added transaction_type column');
    console.log('   ✓ Created indexes for performance\n');

    console.log('🎉 Payment history feature is now ready!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Restart the backend: npm run dev');
    console.log('   2. Refresh your browser');
    console.log('   3. Click on a student in Monthly Fees');
    console.log('   4. Payment history should now display correctly\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.sqlMessage) {
      console.error('SQL Error:', error.sqlMessage);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
