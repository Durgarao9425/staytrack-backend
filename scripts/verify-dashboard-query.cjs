const mysql = require('mysql2/promise');

async function verifyQuery() {
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

    console.log('=== DASHBOARD DATA QUERY TEST ===');
    console.log('Date Range:', monthStart, 'to', monthEnd);
    console.log('Hostel ID:', hostelId, '\n');

    // Fee payments
    const [feeIncome] = await connection.query(`
      SELECT SUM(amount_paid) as total
      FROM student_fee_payments
      WHERE hostel_id = ?
        AND payment_date BETWEEN ? AND ?
    `, [hostelId, monthStart, monthEnd]);
    console.log('Fee Payments Total:', feeIncome[0].total || 0);

    // Income records
    const [otherIncome] = await connection.query(`
      SELECT SUM(amount) as total
      FROM income
      WHERE hostel_id = ?
        AND income_date BETWEEN ? AND ?
    `, [hostelId, monthStart, monthEnd]);
    console.log('Income Records Total:', otherIncome[0].total || 0);

    // Total income
    const totalIncome = (feeIncome[0].total || 0) + (otherIncome[0].total || 0);
    console.log('TOTAL MONTHLY INCOME:', totalIncome);

    // Expenses
    const [expenses] = await connection.query(`
      SELECT SUM(amount) as total
      FROM expenses
      WHERE hostel_id = ?
        AND expense_date BETWEEN ? AND ?
    `, [hostelId, monthStart, monthEnd]);
    console.log('Monthly Expenses:', expenses[0].total || 0);

    // Net profit
    const netProfit = totalIncome - (expenses[0].total || 0);
    console.log('NET PROFIT:', netProfit);

  } finally {
    await connection.end();
  }
}

verifyQuery();
