const mysql = require('mysql2/promise');

async function checkAllExpenses() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    const [expenses] = await connection.query(`
      SELECT * FROM expenses ORDER BY hostel_id, expense_date DESC
    `);

    console.log('=== ALL EXPENSES IN DATABASE ===\n');
    console.log('Total:', expenses.length, '\n');

    expenses.forEach(e => {
      const dateStr = new Date(e.expense_date).toISOString().split('T')[0];
      const amount = Number(e.amount).toLocaleString('en-IN');
      console.log(`ID: ${e.expense_id}, Hostel: ${e.hostel_id}, Date: ${dateStr}, Amount: ₹${amount}, Desc: ${e.description}`);
    });

  } finally {
    await connection.end();
  }
}

checkAllExpenses();
