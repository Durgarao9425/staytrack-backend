const mysql = require('mysql2/promise');

async function testDashboardData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    console.log('=== TESTING DASHBOARD DATA FOR HOSTEL_ID = 5 ===\n');

    // Get current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    console.log('Current Month:', monthStart.toISOString().split('T')[0], 'to', monthEnd.toISOString().split('T')[0], '\n');

    // Check fee payments for current month
    const [feePayments] = await connection.query(`
      SELECT COUNT(*) as count, SUM(amount_paid) as total
      FROM student_fee_payments
      WHERE hostel_id = 5
        AND payment_date BETWEEN ? AND ?
    `, [monthStart, monthEnd]);
    console.log('Fee Payments (Current Month):');
    console.log('  Count:', feePayments[0].count);
    console.log('  Total:', feePayments[0].total || 0, '\n');

    // Check income records for current month
    const [incomeRecords] = await connection.query(`
      SELECT COUNT(*) as count, SUM(amount) as total
      FROM income
      WHERE hostel_id = 5
        AND income_date BETWEEN ? AND ?
    `, [monthStart, monthEnd]);
    console.log('Income Records (Current Month):');
    console.log('  Count:', incomeRecords[0].count);
    console.log('  Total:', incomeRecords[0].total || 0, '\n');

    // Check expenses for current month
    const [expenses] = await connection.query(`
      SELECT COUNT(*) as count, SUM(amount) as total
      FROM expenses
      WHERE hostel_id = 5
        AND expense_date BETWEEN ? AND ?
    `, [monthStart, monthEnd]);
    console.log('Expenses (Current Month):');
    console.log('  Count:', expenses[0].count);
    console.log('  Total:', expenses[0].total || 0, '\n');

    // Check all fee payments (any month)
    const [allFeePayments] = await connection.query(`
      SELECT COUNT(*) as count, SUM(amount_paid) as total
      FROM student_fee_payments
      WHERE hostel_id = 5
    `);
    console.log('All Fee Payments (Any Month):');
    console.log('  Count:', allFeePayments[0].count);
    console.log('  Total:', allFeePayments[0].total || 0, '\n');

    // Check all income records (any month)
    const [allIncome] = await connection.query(`
      SELECT COUNT(*) as count, SUM(amount) as total
      FROM income
      WHERE hostel_id = 5
    `);
    console.log('All Income Records (Any Month):');
    console.log('  Count:', allIncome[0].count);
    console.log('  Total:', allIncome[0].total || 0, '\n');

    // Check all expenses (any month)
    const [allExpenses] = await connection.query(`
      SELECT COUNT(*) as count, SUM(amount) as total
      FROM expenses
      WHERE hostel_id = 5
    `);
    console.log('All Expenses (Any Month):');
    console.log('  Count:', allExpenses[0].count);
    console.log('  Total:', allExpenses[0].total || 0, '\n');

    // Check rooms and students
    const [rooms] = await connection.query(`
      SELECT COUNT(*) as count, SUM(capacity) as total_beds, SUM(occupied_beds) as occupied_beds
      FROM rooms
      WHERE hostel_id = 5
    `);
    console.log('Rooms:');
    console.log('  Count:', rooms[0].count);
    console.log('  Total Beds:', rooms[0].total_beds || 0);
    console.log('  Occupied Beds:', rooms[0].occupied_beds || 0, '\n');

    const [students] = await connection.query(`
      SELECT COUNT(*) as count
      FROM students
      WHERE hostel_id = 5 AND status = 'Active'
    `);
    console.log('Active Students:', students[0].count, '\n');

    // Check pending dues
    const [dues] = await connection.query(`
      SELECT COUNT(*) as count, SUM(balance_amount) as total
      FROM student_dues
      WHERE hostel_id = 5 AND is_paid = 0
    `);
    console.log('Pending Dues:');
    console.log('  Count:', dues[0].count);
    console.log('  Total:', dues[0].total || 0, '\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

testDashboardData();
