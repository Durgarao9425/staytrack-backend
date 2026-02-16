/**
 * Fixed Migration Script
 * Applies each migration step separately
 */

import db from '../dist/config/database.js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function runMigration() {
  console.log(`\n${colors.cyan}=== Fee Categories Migration (Fixed) ===${colors.reset}\n`);

  try {
    // Step 1: Add columns to student_dues
    console.log(`${colors.blue}[Step 1] Adding columns to student_dues table...${colors.reset}\n`);

    const steps = [
      {
        name: 'Add fee_category_id column',
        sql: `ALTER TABLE student_dues ADD COLUMN fee_category_id INT NULL AFTER hostel_id`
      },
      {
        name: 'Add is_carried_forward column',
        sql: `ALTER TABLE student_dues ADD COLUMN is_carried_forward BOOLEAN DEFAULT FALSE AFTER balance_amount`
      },
      {
        name: 'Add carried_from_month column',
        sql: `ALTER TABLE student_dues ADD COLUMN carried_from_month VARCHAR(20) NULL AFTER is_carried_forward`
      },
      {
        name: 'Add paid_date column',
        sql: `ALTER TABLE student_dues ADD COLUMN paid_date DATE NULL AFTER is_paid`
      },
      {
        name: 'Add foreign key constraint',
        sql: `ALTER TABLE student_dues ADD CONSTRAINT fk_student_dues_fee_category FOREIGN KEY (fee_category_id) REFERENCES fee_structure(fee_structure_id) ON DELETE SET NULL`
      },
      {
        name: 'Create index on fee_category_id',
        sql: `CREATE INDEX idx_student_dues_category ON student_dues(fee_category_id)`
      },
      {
        name: 'Create index on due_month',
        sql: `CREATE INDEX idx_student_dues_month ON student_dues(due_month)`
      },
      {
        name: 'Create index on student_id and due_month',
        sql: `CREATE INDEX idx_student_dues_student_month ON student_dues(student_id, due_month)`
      }
    ];

    for (const step of steps) {
      try {
        console.log(`  ${colors.cyan}→${colors.reset} ${step.name}...`);
        await db.raw(step.sql);
        console.log(`    ${colors.green}✓ Success${colors.reset}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`    ${colors.yellow}⚠ Column already exists (skipping)${colors.reset}`);
        } else if (err.code === 'ER_DUP_KEYNAME') {
          console.log(`    ${colors.yellow}⚠ Index already exists (skipping)${colors.reset}`);
        } else if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log(`    ${colors.yellow}⚠ Already applied (skipping)${colors.reset}`);
        } else {
          console.log(`    ${colors.red}✗ Failed: ${err.message}${colors.reset}`);
          if (!err.message.includes('Duplicate')) {
            throw err;
          }
        }
      }
    }

    // Step 2: Check if fee categories exist, if not create default ones
    console.log(`\n${colors.blue}[Step 2] Checking fee categories...${colors.reset}\n`);

    const existingCategories = await db('fee_structure')
      .where({ hostel_id: 1 })
      .whereIn('fee_type', ['Monthly Rent', 'Electricity', 'Maintenance', 'Mess Fee', 'Water Charges']);

    if (existingCategories.length < 5) {
      console.log(`  ${colors.cyan}→${colors.reset} Adding default fee categories for Hostel 1...`);

      const categoriesToAdd = [
        { fee_type: 'Monthly Rent', amount: 5000.00 },
        { fee_type: 'Electricity', amount: 500.00 },
        { fee_type: 'Maintenance', amount: 300.00 },
        { fee_type: 'Mess Fee', amount: 3000.00 },
        { fee_type: 'Water Charges', amount: 200.00 }
      ];

      for (const cat of categoriesToAdd) {
        try {
          const exists = await db('fee_structure')
            .where({ hostel_id: 1, fee_type: cat.fee_type })
            .first();

          if (!exists) {
            await db('fee_structure').insert({
              hostel_id: 1,
              fee_type: cat.fee_type,
              amount: cat.amount,
              frequency: 'Monthly',
              is_active: 1
            });
            console.log(`    ${colors.green}✓${colors.reset} Added: ${cat.fee_type}`);
          } else {
            console.log(`    ${colors.yellow}⚠${colors.reset} Exists: ${cat.fee_type}`);
          }
        } catch (err) {
          console.log(`    ${colors.yellow}⚠${colors.reset} Skipping ${cat.fee_type}: ${err.message}`);
        }
      }
    } else {
      console.log(`  ${colors.green}✓${colors.reset} Fee categories already configured`);
    }

    // Step 3: Verify migration
    console.log(`\n${colors.blue}[Step 3] Verifying migration...${colors.reset}\n`);

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
        console.log(`  ${colors.green}✓${colors.reset} ${col}`);
      } else {
        console.log(`  ${colors.red}✗${colors.reset} ${col} MISSING`);
        allPresent = false;
      }
    }

    if (allPresent) {
      console.log(`\n${colors.green}=== ✓ Migration completed successfully! ===${colors.reset}\n`);

      const feeCategories = await db('fee_structure').where('is_active', 1);
      console.log(`${colors.blue}Fee categories available: ${feeCategories.length}${colors.reset}\n`);

      feeCategories.forEach(cat => {
        console.log(`  • ${cat.fee_type}: ₹${cat.amount} (${cat.frequency}) - Hostel ${cat.hostel_id}`);
      });

      console.log(`\n${colors.cyan}=== Next Steps ===${colors.reset}\n`);
      console.log(`1. ${colors.green}✓${colors.reset} Migration completed`);
      console.log(`2. Refresh your browser on the Fees page`);
      console.log(`3. All students should now be visible!`);
      console.log();
    } else {
      console.log(`\n${colors.red}✗ Migration incomplete - some columns missing${colors.reset}\n`);
      process.exit(1);
    }

  } catch (error) {
    console.error(`\n${colors.red}=== Migration Failed ===${colors.reset}\n`);
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runMigration();
