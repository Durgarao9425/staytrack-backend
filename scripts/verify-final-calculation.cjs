const mysql = require('mysql2/promise');

async function verifyCalculation() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    const monthStart = '2025-11-01';
    const monthEnd = '2025-11-30';
    const hostelId = 5;

    console.log('=== FINAL DASHBOARD CALCULATION TEST ===');
    console.log('Date Range:', monthStart, 'to', monthEnd);
    console.log('Hostel ID:', hostelId, '\n');

    // Fee payments
    const [feeIncome] = await connection.query(`
      SELECT SUM(amount_paid) as total
      FROM student_fee_payments
      WHERE hostel_id = ?
        AND payment_date BETWEEN ? AND ?
    `, [hostelId, monthStart, monthEnd]);

    const feeTotal = Number(feeIncome[0].total || 0);
    console.log('1. Fee Payments:', feeTotal);

    // Income records
    const [otherIncome] = await connection.query(`
      SELECT SUM(amount) as total
      FROM income
      WHERE hostel_id = ?
        AND income_date BETWEEN ? AND ?
    `, [hostelId, monthStart, monthEnd]);

    const incomeTotal = Number(otherIncome[0].total || 0);
    console.log('2. Income Records:', incomeTotal);

    // Total income
    const totalIncome = feeTotal + incomeTotal;
    console.log('3. TOTAL MONTHLY INCOME:', totalIncome, '(₹' + totalIncome.toLocaleString('en-IN') + ')');

    // Expenses
    const [expenses] = await connection.query(`
      SELECT SUM(amount) as total
      FROM expenses
      WHERE hostel_id = ?
        AND expense_date BETWEEN ? AND ?
    `, [hostelId, monthStart, monthEnd]);

    const expensesTotal = Number(expenses[0].total || 0);
    console.log('4. Monthly Expenses:', expensesTotal, '(₹' + expensesTotal.toLocaleString('en-IN') + ')');

    // Net profit
    const netProfit = totalIncome - expensesTotal;
    console.log('5. NET PROFIT:', netProfit, '(₹' + netProfit.toLocaleString('en-IN') + ')');

    console.log('\n=== EXPECTED DASHBOARD DISPLAY ===');
    console.log('Monthly Income: ₹10,000');
    console.log('Monthly Expenses: ₹0');
    console.log('Net Profit: ₹10,000');

  } finally {
    await connection.end();
  }
}

verifyCalculation();
