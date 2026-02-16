const mysql = require('mysql2/promise');

async function checkExpenses() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    console.log('=== CHECKING EXPENSES TABLE ===\n');

    // Check all expenses
    const [allExpenses] = await connection.query(`
      SELECT e.*, ec.category_name, pm.payment_mode_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.category_id
      LEFT JOIN payment_modes pm ON e.payment_mode_id = pm.payment_mode_id
      ORDER BY e.expense_date DESC
    `);

    console.log(`Total Records: ${allExpenses.length}\n`);

    if (allExpenses.length === 0) {
      console.log('No expenses found in the table.');
    } else {
      console.log('All Expenses:');
      console.log('='.repeat(120));
      allExpenses.forEach(e => {
        const dateStr = new Date(e.expense_date).toISOString().split('T')[0];
        console.log(`ID: ${e.expense_id}`);
        console.log(`  Hostel ID: ${e.hostel_id}`);
        console.log(`  Date: ${dateStr}`);
        console.log(`  Category: ${e.category_name}`);
        console.log(`  Amount: ₹${Number(e.amount).toLocaleString('en-IN')}`);
        console.log(`  Payment Mode: ${e.payment_mode_name}`);
        console.log(`  Description: ${e.description || '-'}`);
        console.log('-'.repeat(120));
      });

      // Check for hostel_id = 5
      const [hostel5] = await connection.query(`
        SELECT COUNT(*) as count, SUM(amount) as total
        FROM expenses
        WHERE hostel_id = 5
      `);
      console.log(`\nExpenses for Hostel ID 5:`);
      console.log(`  Count: ${hostel5[0].count}`);
      console.log(`  Total: ₹${Number(hostel5[0].total || 0).toLocaleString('en-IN')}`);

      // Check for current month
      const monthStart = '2025-11-01';
      const monthEnd = '2025-11-30';
      const [currentMonth] = await connection.query(`
        SELECT COUNT(*) as count, SUM(amount) as total
        FROM expenses
        WHERE hostel_id = 5
          AND expense_date BETWEEN ? AND ?
      `, [monthStart, monthEnd]);
      console.log(`\nExpenses for Hostel 5 in November 2025:`);
      console.log(`  Count: ${currentMonth[0].count}`);
      console.log(`  Total: ₹${Number(currentMonth[0].total || 0).toLocaleString('en-IN')}`);
    }

  } finally {
    await connection.end();
  }
}

checkExpenses();
