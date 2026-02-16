/**
 * Migration Runner Script
 * Automatically applies the fee categories migration
 *
 * Usage: node scripts/apply-migration.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../dist/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function applyMigration() {
  console.log(`\n${colors.cyan}=== Fee Management Migration Runner ===${colors.reset}\n`);

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/add_fee_categories_support.sql');
    console.log(`${colors.blue}Reading migration file...${colors.reset}`);
    console.log(`Path: ${migrationPath}\n`);

    if (!fs.existsSync(migrationPath)) {
      console.error(`${colors.red}✗ Migration file not found!${colors.reset}`);
      console.error(`Expected location: ${migrationPath}\n`);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`${colors.green}✓ Migration file loaded${colors.reset}\n`);

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`${colors.blue}Executing ${statements.length} SQL statements...${colors.reset}\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const statementPreview = statement.substring(0, 80).replace(/\s+/g, ' ');

      try {
        console.log(`${colors.cyan}[${i + 1}/${statements.length}]${colors.reset} ${statementPreview}...`);
        await db.raw(statement);
        console.log(`${colors.green}✓ Success${colors.reset}\n`);
      } catch (err) {
        // Check if error is benign (column already exists, etc.)
        if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log(`${colors.yellow}⚠ Already exists (skipping)${colors.reset}\n`);
        } else if (err.code === 'ER_DUP_KEYNAME') {
          console.log(`${colors.yellow}⚠ Index already exists (skipping)${colors.reset}\n`);
        } else {
          console.error(`${colors.red}✗ Failed${colors.reset}`);
          console.error(`${colors.red}Error: ${err.message}${colors.reset}\n`);
          throw err;
        }
      }
    }

    console.log(`${colors.green}=== Migration completed successfully! ===${colors.reset}\n`);

    // Verify migration
    console.log(`${colors.blue}Verifying migration...${colors.reset}\n`);

    const columns = await db.raw('DESCRIBE student_dues');
    const columnNames = columns[0].map(col => col.Field);

    const requiredColumns = [
      'fee_category_id',
      'is_carried_forward',
      'carried_from_month',
      'paid_date'
    ];

    let allPresent = true;
    for (const col of requiredColumns) {
      if (columnNames.includes(col)) {
        console.log(`${colors.green}✓${colors.reset} Column '${col}' exists`);
      } else {
        console.log(`${colors.red}✗${colors.reset} Column '${col}' MISSING`);
        allPresent = false;
      }
    }

    if (allPresent) {
      console.log(`\n${colors.green}✓ All required columns present${colors.reset}`);
      console.log(`${colors.green}✓ Migration verified successfully!${colors.reset}\n`);

      // Check fee categories
      const feeCategories = await db('fee_structure').where('is_active', 1);
      console.log(`${colors.blue}Fee Categories Created: ${feeCategories.length}${colors.reset}\n`);

      if (feeCategories.length > 0) {
        console.log(`Fee categories available:`);
        feeCategories.forEach(cat => {
          console.log(`  - ${cat.fee_type}: ₹${cat.amount} (${cat.frequency})`);
        });
        console.log();
      }

      console.log(`${colors.cyan}=== Next Steps ===${colors.reset}\n`);
      console.log(`1. Restart your backend server: ${colors.cyan}npm run dev${colors.reset}`);
      console.log(`2. Refresh your frontend browser`);
      console.log(`3. Navigate to the Fees Management page`);
      console.log(`4. All students should now be visible!`);
      console.log();
    } else {
      console.log(`\n${colors.red}✗ Migration verification failed${colors.reset}`);
      console.log(`Some columns are missing. Please check the error messages above.\n`);
    }

  } catch (error) {
    console.error(`\n${colors.red}=== Migration Failed ===${colors.reset}\n`);
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    console.error(error);
    console.log();
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Run the migration
applyMigration();
