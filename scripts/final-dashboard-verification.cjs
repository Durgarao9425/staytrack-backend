const mysql = require('mysql2/promise');

async function verifyDashboard() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    const hostelId = 5;
    const monthStart = '2025-11-01';
    const monthEnd = '2025-11-30';

    console.log('=== FINAL DASHBOARD VERIFICATION ===');
    console.log('Hostel ID:', hostelId);
    console.log('Period:', monthStart, 'to', monthEnd);
    console.log('='.repeat(60), '\n');

    // Fee Payments
    const [fees] = await connection.query(`
      SELECT SUM(amount_paid) as total, COUNT(*) as count
      FROM student_fee_payments
      WHERE hostel_id = ? AND payment_date BETWEEN ? AND ?
    `, [hostelId, monthStart, monthEnd]);

    const feeTotal = Number(fees[0].total || 0);
    console.log('1. Fee Payments:');
    console.log('   Count:', fees[0].count);
    console.log('   Total: ₹' + feeTotal.toLocaleString('en-IN'));

    // Income Records
    const [income] = await connection.query(`
      SELECT SUM(amount) as total, COUNT(*) as count
      FROM income
      WHERE hostel_id = ? AND income_date BETWEEN ? AND ?
    `, [hostelId, monthStart, monthEnd]);

    const incomeTotal = Number(income[0].total || 0);
    console.log('\n2. Other Income:');
    console.log('   Count:', income[0].count);
    console.log('   Total: ₹' + incomeTotal.toLocaleString('en-IN'));

    // Total Income
    const totalIncome = feeTotal + incomeTotal;
    console.log('\n3. TOTAL MONTHLY INCOME:');
    console.log('   ₹' + totalIncome.toLocaleString('en-IN'));

    // Expenses
    const [expenses] = await connection.query(`
      SELECT SUM(amount) as total, COUNT(*) as count
      FROM expenses
      WHERE hostel_id = ? AND expense_date BETWEEN ? AND ?
    `, [hostelId, monthStart, monthEnd]);

    const expenseTotal = Number(expenses[0].total || 0);
    console.log('\n4. Monthly Expenses:');
    console.log('   Count:', expenses[0].count);
    console.log('   Total: ₹' + expenseTotal.toLocaleString('en-IN'));

    // Net Profit
    const netProfit = totalIncome - expenseTotal;
    console.log('\n5. NET PROFIT:');
    console.log('   ₹' + netProfit.toLocaleString('en-IN'));
    console.log('   (' + (netProfit >= 0 ? 'PROFIT' : 'LOSS') + ')');

    console.log('\n' + '='.repeat(60));
    console.log('EXPECTED DASHBOARD DISPLAY:');
    console.log('Monthly Income:   ₹10,000');
    console.log('Monthly Expenses: ₹5,000');
    console.log('Net Profit:       ₹5,000');
    console.log('='.repeat(60));

  } finally {
    await connection.end();
  }
}

verifyDashboard();
