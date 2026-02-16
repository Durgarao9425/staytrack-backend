const mysql = require('mysql2/promise');

async function deleteDummyExpenses() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    console.log('=== DELETING DUMMY EXPENSE DATA ===\n');

    // Show expenses before deletion
    console.log('BEFORE Deletion:');
    const [beforeExpenses] = await connection.query(`
      SELECT
        expense_id,
        category_id,
        expense_date,
        amount,
        vendor_name,
        description
      FROM expenses
      ORDER BY expense_id
    `);

    console.log(`Total expenses: ${beforeExpenses.length}\n`);
    beforeExpenses.forEach(exp => {
      console.log(`  Expense ${exp.expense_id}: ${exp.description} - ₹${exp.amount}`);
    });

    // Delete all expenses
    console.log('\n\nDeleting all expenses...');
    const [result] = await connection.query(`DELETE FROM expenses`);
    console.log(`✅ Deleted ${result.affectedRows} expense(s)\n`);

    // Verify deletion
    console.log('AFTER Deletion:');
    const [afterExpenses] = await connection.query(`
      SELECT COUNT(*) as count FROM expenses
    `);

    console.log(`Total expenses: ${afterExpenses[0].count}`);

    if (afterExpenses[0].count === 0) {
      console.log('\n✅ ALL DUMMY EXPENSES DELETED SUCCESSFULLY!');
    } else {
      console.log(`\n⚠️  Still ${afterExpenses[0].count} expense(s) remaining`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

deleteDummyExpenses();
