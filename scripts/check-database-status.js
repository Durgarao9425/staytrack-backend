/**
 * Database Status Checker
 * Run this script to check if your database is ready for the fee management system
 *
 * Usage: node scripts/check-database-status.js
 */

import db from '../src/config/database.js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const checkIcon = `${colors.green}✓${colors.reset}`;
const errorIcon = `${colors.red}✗${colors.reset}`;
const warningIcon = `${colors.yellow}⚠${colors.reset}`;

async function checkDatabaseStatus() {
  console.log(`\n${colors.cyan}=== Database Status Check ===${colors.reset}\n`);

  try {
    // Check 1: Can we connect to database?
    console.log(`${colors.blue}1. Checking database connection...${colors.reset}`);
    await db.raw('SELECT 1');
    console.log(`   ${checkIcon} Database connection successful\n`);

    // Check 2: Does student_dues table have new columns?
    console.log(`${colors.blue}2. Checking student_dues table structure...${colors.reset}`);
    const columns = await db.raw('DESCRIBE student_dues');
    const columnNames = columns[0].map(col => col.Field);

    const requiredColumns = [
      'fee_category_id',
      'is_carried_forward',
      'carried_from_month',
      'paid_date'
    ];

    let migrationApplied = true;
    for (const col of requiredColumns) {
      if (columnNames.includes(col)) {
        console.log(`   ${checkIcon} Column '${col}' exists`);
      } else {
        console.log(`   ${errorIcon} Column '${col}' MISSING`);
        migrationApplied = false;
      }
    }

    if (!migrationApplied) {
      console.log(`\n   ${errorIcon} ${colors.red}MIGRATION NOT APPLIED!${colors.reset}`);
      console.log(`   ${colors.yellow}Action Required: Run the migration SQL file${colors.reset}`);
      console.log(`   ${colors.yellow}File: backend/migrations/add_fee_categories_support.sql${colors.reset}\n`);
    } else {
      console.log(`   ${checkIcon} ${colors.green}Migration applied successfully!${colors.reset}\n`);
    }

    // Check 3: Does fee_structure table exist?
    console.log(`${colors.blue}3. Checking fee_structure table...${colors.reset}`);
    try {
      const feeCategories = await db('fee_structure').where('is_active', 1);
      console.log(`   ${checkIcon} Table exists`);
      console.log(`   ${checkIcon} Active fee categories: ${feeCategories.length}`);

      if (feeCategories.length === 0) {
        console.log(`   ${warningIcon} ${colors.yellow}No fee categories found!${colors.reset}`);
        console.log(`   ${colors.yellow}You need to create fee categories before generating dues${colors.reset}\n`);
      } else {
        console.log(`\n   Fee Categories:`);
        feeCategories.forEach(cat => {
          console.log(`   - ${cat.fee_type}: ₹${cat.amount} (${cat.frequency})`);
        });
        console.log();
      }
    } catch (err) {
      console.log(`   ${errorIcon} Table doesn't exist or has errors`);
      console.log(`   ${colors.red}Error: ${err.message}${colors.reset}\n`);
    }

    // Check 4: Check payment_modes table
    console.log(`${colors.blue}4. Checking payment_modes table...${colors.reset}`);
    try {
      const paymentModes = await db('payment_modes').where('is_active', 1);
      console.log(`   ${checkIcon} Table exists`);
      console.log(`   ${checkIcon} Active payment modes: ${paymentModes.length}`);

      if (paymentModes.length > 0) {
        console.log(`\n   Payment Modes:`);
        paymentModes.forEach(mode => {
          console.log(`   - ${mode.payment_mode_name || mode.mode_name}`);
        });
      }
      console.log();
    } catch (err) {
      console.log(`   ${warningIcon} Table doesn't exist or has errors`);
      console.log(`   ${colors.yellow}This is optional but recommended${colors.reset}\n`);
    }

    // Check 5: Check for active students
    console.log(`${colors.blue}5. Checking students...${colors.reset}`);
    const students = await db('students').where('status', 'Active');
    console.log(`   ${checkIcon} Active students: ${students.length}`);

    if (students.length === 0) {
      console.log(`   ${warningIcon} ${colors.yellow}No active students found!${colors.reset}`);
      console.log(`   ${colors.yellow}Add students before using the fee management system${colors.reset}\n`);
    } else {
      console.log(`   ${checkIcon} ${colors.green}Ready to generate dues for ${students.length} students${colors.reset}\n`);
    }

    // Check 6: Check existing dues
    console.log(`${colors.blue}6. Checking existing dues...${colors.reset}`);
    const allDues = await db('student_dues');
    const paidDues = await db('student_dues').where('is_paid', 1);
    const unpaidDues = await db('student_dues').where('is_paid', 0);

    console.log(`   Total dues records: ${allDues.length}`);
    console.log(`   Paid: ${paidDues.length}`);
    console.log(`   Unpaid: ${unpaidDues.length}`);

    if (allDues.length === 0) {
      console.log(`   ${warningIcon} ${colors.yellow}No dues generated yet${colors.reset}`);
      console.log(`   ${colors.yellow}Use the API or cron job to generate monthly dues${colors.reset}\n`);
    } else {
      console.log(`   ${checkIcon} ${colors.green}Dues exist in system${colors.reset}\n`);
    }

    // Summary
    console.log(`${colors.cyan}=== Summary ===${colors.reset}\n`);

    if (!migrationApplied) {
      console.log(`${errorIcon} ${colors.red}CRITICAL: Database migration not applied${colors.reset}`);
      console.log(`   Run this command:`);
      console.log(`   ${colors.cyan}mysql -u root -p hostel_management < backend/migrations/add_fee_categories_support.sql${colors.reset}\n`);
    } else if (students.length === 0) {
      console.log(`${warningIcon} ${colors.yellow}Add students to start using the fee management system${colors.reset}\n`);
    } else if (feeCategories.length === 0) {
      console.log(`${warningIcon} ${colors.yellow}Create fee categories before generating dues${colors.reset}\n`);
    } else if (allDues.length === 0) {
      console.log(`${checkIcon} ${colors.green}System ready! Generate monthly dues to start.${colors.reset}\n`);
    } else {
      console.log(`${checkIcon} ${colors.green}System fully operational!${colors.reset}\n`);
    }

  } catch (error) {
    console.error(`${errorIcon} ${colors.red}Fatal error:${colors.reset}`, error.message);
    console.error(error);
  } finally {
    await db.destroy();
  }
}

// Run the check
checkDatabaseStatus();
