const mysql = require('mysql2/promise');

async function checkDates() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    // Check what dates we have in the database
    const [payments] = await connection.query(`
      SELECT payment_id, payment_date, amount_paid
      FROM student_fee_payments
      WHERE hostel_id = 5
      ORDER BY payment_date DESC
    `);
    
    console.log('=== FEE PAYMENTS ===');
    payments.forEach(p => {
      console.log(`ID: ${p.payment_id}, Date: ${p.payment_date}, Amount: ${p.amount_paid}`);
    });

    const [income] = await connection.query(`
      SELECT income_id, income_date, amount, source
      FROM income
      WHERE hostel_id = 5
      ORDER BY income_date DESC
    `);
    
    console.log('\n=== INCOME RECORDS ===');
    income.forEach(i => {
      console.log(`ID: ${i.income_id}, Date: ${i.income_date}, Amount: ${i.amount}, Source: ${i.source}`);
    });

    const [expenses] = await connection.query(`
      SELECT expense_id, expense_date, amount
      FROM expenses
      WHERE hostel_id = 5
      ORDER BY expense_date DESC
    `);
    
    console.log('\n=== EXPENSES ===');
    if (expenses.length === 0) {
      console.log('No expenses found');
    } else {
      expenses.forEach(e => {
        console.log(`ID: ${e.expense_id}, Date: ${e.expense_date}, Amount: ${e.amount}`);
      });
    }

  } finally {
    await connection.end();
  }
}

checkDates();
