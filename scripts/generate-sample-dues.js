/**
 * Generate Sample Dues for Testing
 * Creates dues for current month for all active students
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

async function generateSampleDues() {
  console.log(`\n${colors.cyan}=== Generate Sample Dues ===${colors.reset}\n`);

  try {
    // Get current month in YYYY-MM format
    const now = new Date();
    const month_year = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    console.log(`${colors.blue}Generating dues for month: ${month_year}${colors.reset}\n`);

    // Check if dues already exist for this month
    const existing = await db('student_dues')
      .where('due_month', month_year)
      .count('* as count')
      .first();

    if (existing && parseInt(existing.count) > 0) {
      console.log(`${colors.yellow}⚠ Dues already exist for ${month_year}${colors.reset}`);
      console.log(`${colors.yellow}Found ${existing.count} existing dues records${colors.reset}\n`);

      const response = await askQuestion('Delete existing dues and regenerate? (yes/no): ');
      if (response.toLowerCase() !== 'yes') {
        console.log(`${colors.blue}Cancelled. Keeping existing dues.${colors.reset}\n`);
        return;
      }

      await db('student_dues').where('due_month', month_year).delete();
      console.log(`${colors.green}✓ Deleted existing dues${colors.reset}\n`);
    }

    // Get all active students with room allocations
    const students = await db('students as s')
      .join('room_allocations as ra', function() {
        this.on('s.student_id', '=', 'ra.student_id')
          .andOn('ra.is_active', '=', db.raw('1'));
      })
      .where('s.status', 'Active')
      .select(
        's.student_id',
        's.first_name',
        's.last_name',
        's.hostel_id',
        'ra.monthly_rent'
      );

    console.log(`${colors.blue}Found ${students.length} active students${colors.reset}\n`);

    if (students.length === 0) {
      console.log(`${colors.red}No active students with room allocations found!${colors.reset}\n`);
      return;
    }

    // Get all active monthly fee categories
    const feeCategories = await db('fee_structure')
      .where({ is_active: 1, frequency: 'Monthly' })
      .select('fee_structure_id', 'hostel_id', 'fee_type', 'amount');

    console.log(`${colors.blue}Found ${feeCategories.length} monthly fee categories${colors.reset}\n`);

    if (feeCategories.length === 0) {
      console.log(`${colors.red}No active monthly fee categories found!${colors.reset}\n`);
      return;
    }

    console.log(`${colors.cyan}Fee categories:${colors.reset}`);
    const categoriesByHostel = {};
    feeCategories.forEach(cat => {
      if (!categoriesByHostel[cat.hostel_id]) {
        categoriesByHostel[cat.hostel_id] = [];
      }
      categoriesByHostel[cat.hostel_id].push(cat);
      console.log(`  • ${cat.fee_type} - ₹${cat.amount} (Hostel ${cat.hostel_id})`);
    });
    console.log();

    // Calculate due date (15th of current month)
    const [year, month] = month_year.split('-');
    const dueDate = new Date(parseInt(year), parseInt(month) - 1, 15);

    console.log(`${colors.blue}Due date: ${dueDate.toLocaleDateString()}${colors.reset}\n`);

    // Generate dues
    const duesData = [];
    let totalDuesCreated = 0;

    for (const student of students) {
      const hostelCategories = categoriesByHostel[student.hostel_id] || [];

      if (hostelCategories.length === 0) {
        console.log(`${colors.yellow}⚠ No categories for hostel ${student.hostel_id} - skipping ${student.first_name}${colors.reset}`);
        continue;
      }

      for (const category of hostelCategories) {
        // For Monthly Rent, use student's room rent; otherwise use category amount
        const amount = category.fee_type === 'Monthly Rent' || category.fee_type === 'Room Rent'
          ? student.monthly_rent
          : category.amount;

        duesData.push({
          student_id: student.student_id,
          hostel_id: student.hostel_id,
          fee_category_id: category.fee_structure_id,
          due_month: month_year,
          due_amount: amount,
          paid_amount: 0,
          balance_amount: amount,
          due_date: dueDate,
          is_paid: 0,
          is_carried_forward: 0,
          carried_from_month: null,
          created_at: new Date()
        });
        totalDuesCreated++;
      }
    }

    // Insert dues
    if (duesData.length > 0) {
      console.log(`${colors.blue}Inserting ${duesData.length} dues records...${colors.reset}\n`);
      await db('student_dues').insert(duesData);
      console.log(`${colors.green}✓ Successfully created ${totalDuesCreated} dues records${colors.reset}\n`);
    }

    // Summary
    const summary = await db('student_dues as sd')
      .join('students as s', 'sd.student_id', 's.student_id')
      .join('fee_structure as fs', 'sd.fee_category_id', 'fs.fee_structure_id')
      .where('sd.due_month', month_year)
      .select(
        db.raw('COUNT(DISTINCT sd.student_id) as student_count'),
        db.raw('COUNT(*) as dues_count'),
        db.raw('SUM(sd.due_amount) as total_amount')
      )
      .first();

    console.log(`${colors.cyan}=== Summary ===${colors.reset}\n`);
    console.log(`Students with dues: ${colors.blue}${summary.student_count}${colors.reset}`);
    console.log(`Total dues records: ${colors.blue}${summary.dues_count}${colors.reset}`);
    console.log(`Total amount: ${colors.blue}₹${parseFloat(summary.total_amount).toFixed(2)}${colors.reset}`);
    console.log();

    // Sample dues
    const sampleDues = await db('student_dues as sd')
      .join('students as s', 'sd.student_id', 's.student_id')
      .join('fee_structure as fs', 'sd.fee_category_id', 'fs.fee_structure_id')
      .where('sd.due_month', month_year)
      .select(
        's.first_name',
        's.last_name',
        'fs.fee_type',
        'sd.due_amount'
      )
      .limit(5);

    console.log(`${colors.cyan}Sample dues created:${colors.reset}`);
    sampleDues.forEach((due, i) => {
      console.log(`  ${i + 1}. ${due.first_name} ${due.last_name} - ${due.fee_type}: ₹${due.due_amount}`);
    });
    console.log();

    console.log(`${colors.green}=== ✓ Dues generation completed! ===${colors.reset}\n`);
    console.log(`${colors.cyan}Next steps:${colors.reset}`);
    console.log(`  1. Refresh your browser on the Fees page`);
    console.log(`  2. You should now see students with pending dues`);
    console.log(`  3. Try recording a payment to test the payment feature`);
    console.log();

  } catch (error) {
    console.error(`\n${colors.red}✗ Error:${colors.reset}`, error.message);
    console.error(error.stack);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

// Simple question helper (for Node.js)
async function askQuestion(query) {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

generateSampleDues();
