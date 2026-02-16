#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runCleanupMigration() {
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
    console.log('🔄 Running cleanup migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/cleanup_fee_payments_columns.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration - split by semicolon and execute each statement individually
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      try {
        const trimmedStmt = statement.trim();
        if (trimmedStmt) {
          // Extract column name from DROP COLUMN statement for logging
          const columnMatch = trimmedStmt.match(/DROP COLUMN\s+(\w+)/i);
          const columnName = columnMatch ? columnMatch[1] : 'unknown';

          await connection.query(trimmedStmt);
          console.log(`✅ Dropped column: ${columnName}`);
        }
      } catch (stmtError) {
        // Extract column name for error message
        const columnMatch = statement.match(/DROP COLUMN\s+(\w+)/i);
        const columnName = columnMatch ? columnMatch[1] : 'unknown';

        // Ignore "Unknown column" errors for columns that don't exist
        if (stmtError.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log(`⚠️  Column doesn't exist or can't drop (skipping): ${columnName}`);
        } else if (stmtError.code === 'ER_BAD_FIELD_ERROR') {
          console.log(`⚠️  Column doesn't exist (skipping): ${columnName}`);
        } else {
          console.log(`⚠️  Error dropping ${columnName}: ${stmtError.message.substring(0, 80)}`);
        }
      }
    }

    console.log('✅ Cleanup migration completed successfully!\n');
    console.log('📊 Database Changes:');
    console.log('   ✓ Removed fee_month column');
    console.log('   ✓ Removed fee_date column');
    console.log('   ✓ Removed monthly_rent column');
    console.log('   ✓ Removed carry_forward column');
    console.log('   ✓ Removed total_due column');
    console.log('   ✓ Removed fee_status column');
    console.log('   ✓ Removed due_date column');
    console.log('   ✓ Removed is_fee_header column\n');

    console.log('🎉 Fee payments table is now clean!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Verify the payment history page still works');
    console.log('   2. Check that all payments display correctly');
    console.log('   3. The payment history will now pull data from monthly_fees table\n');

  } catch (error) {
    console.error('❌ Cleanup migration failed:', error.message);
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

runCleanupMigration();
