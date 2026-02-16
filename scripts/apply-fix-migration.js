#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function applyMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    console.log('🔧 Applying fee_payments table migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/fix_fee_payments_columns.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await connection.query(sql);

    console.log('✅ Migration applied successfully!');
    console.log('📊 fee_payments table now has all required columns:');
    console.log('   - fee_month');
    console.log('   - fee_date');
    console.log('   - monthly_rent');
    console.log('   - carry_forward');
    console.log('   - total_due');
    console.log('   - fee_status');
    console.log('   - due_date');
    console.log('   - is_fee_header');
    console.log('   - payment_mode_id');
    console.log('   - transaction_type');
    console.log('\n💡 Payment history should now work correctly!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

applyMigration();
