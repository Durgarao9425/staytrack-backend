const mysql = require('mysql2/promise');

async function deleteWrongExpense() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    console.log('=== DELETING INCORRECT EXPENSE ===\n');

    // First, show what we're deleting
    const [expense] = await connection.query(`
      SELECT * FROM expenses WHERE expense_id = 9
    `);

    if (expense.length === 0) {
      console.log('Expense ID 9 not found.');
      return;
    }

    console.log('Found expense to delete:');
    console.log('  ID:', expense[0].expense_id);
    console.log('  Hostel ID:', expense[0].hostel_id, '(WRONG - should be 5, not 1)');
    console.log('  Date:', new Date(expense[0].expense_date).toISOString().split('T')[0]);
    console.log('  Amount: ₹' + Number(expense[0].amount).toLocaleString('en-IN'));
    console.log('  Description:', expense[0].description);

    // Delete it
    await connection.query(`DELETE FROM expenses WHERE expense_id = 9`);
    console.log('\n✅ Expense deleted successfully!');

    // Verify deletion
    const [verify] = await connection.query(`
      SELECT COUNT(*) as count FROM expenses WHERE hostel_id = 1
    `);
    console.log('\nRemaining expenses for hostel_id=1:', verify[0].count);

  } finally {
    await connection.end();
  }
}

deleteWrongExpense();
