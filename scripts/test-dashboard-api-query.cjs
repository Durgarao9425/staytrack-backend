const mysql = require('mysql2/promise');

async function testDashboardQuery() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    const hostelIds = [5]; // JWT hostel_id for owner
    const monthStart = '2025-11-01';
    const monthEnd = '2025-11-30';

    console.log('=== SIMULATING DASHBOARD API QUERY ===');
    console.log('User Hostel ID:', hostelIds[0]);
    console.log('Date Range:', monthStart, 'to', monthEnd, '\n');

    // This is exactly what the API does
    const [expenses] = await connection.query(`
      SELECT SUM(amount) as total
      FROM expenses
      WHERE hostel_id IN (?)
        AND expense_date BETWEEN ? AND ?
    `, [hostelIds, monthStart, monthEnd]);

    console.log('Query Result:');
    console.log('  Total Expenses:', expenses[0].total || 0);
    console.log('  (Should be 0 because expense is in hostel_id=1, not 5)');

    // Double check - what if we query hostel_id=1?
    const [wrongHostel] = await connection.query(`
      SELECT SUM(amount) as total
      FROM expenses
      WHERE hostel_id = 1
        AND expense_date BETWEEN ? AND ?
    `, [monthStart, monthEnd]);

    console.log('\nIf querying hostel_id=1 (wrong hostel):');
    console.log('  Total Expenses:', Number(wrongHostel[0].total || 0).toLocaleString('en-IN'));

  } finally {
    await connection.end();
  }
}

testDashboardQuery();
