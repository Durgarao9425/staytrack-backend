const mysql = require('mysql2/promise');

async function checkStudent() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    console.log('=== CHECKING CHENNIREDDY DATA ===\n');

    // Student details
    const [student] = await connection.query(`
      SELECT student_id, CONCAT(first_name, ' ', last_name) as name,
             admission_fee, admission_status, status
      FROM students
      WHERE first_name LIKE '%chenn%' OR last_name LIKE '%chenn%'
    `);

    if (student.length === 0) {
      console.log('Student not found');
      return;
    }

    console.log('Student Info:');
    console.log('  ID:', student[0].student_id);
    console.log('  Name:', student[0].name);
    console.log('  Admission Fee:', student[0].admission_fee);
    console.log('  Admission Status:', student[0].admission_status);
    console.log('  Status:', student[0].status);

    const studentId = student[0].student_id;

    // Check payments
    const [payments] = await connection.query(`
      SELECT payment_id, payment_date, amount_paid, due_month
      FROM student_fee_payments
      WHERE student_id = ?
      ORDER BY payment_date DESC
    `, [studentId]);

    console.log('\nPayments (student_fee_payments table):');
    if (payments.length === 0) {
      console.log('  No payments found');
    } else {
      payments.forEach(p => {
        const dueMonth = p.due_month ? new Date(p.due_month).toISOString().split('T')[0] : 'N/A';
        console.log('  Date:', p.payment_date, ', Amount: Rs.' + p.amount_paid + ', For Month:', dueMonth);
      });
    }

    // Check dues
    const [dues] = await connection.query(`
      SELECT due_id, due_month, amount_due, paid_amount, balance_amount, is_paid
      FROM student_dues
      WHERE student_id = ?
      ORDER BY due_month DESC
    `, [studentId]);

    console.log('\nMonthly Dues:');
    if (dues.length === 0) {
      console.log('  No dues generated yet');
    } else {
      dues.forEach(d => {
        const month = new Date(d.due_month).toISOString().split('T')[0];
        const status = d.is_paid ? 'Paid' : 'Pending';
        console.log('  Month:', month, ', Due: Rs.' + d.amount_due + ', Paid: Rs.' + d.paid_amount + ', Balance: Rs.' + d.balance_amount + ', Status:', status);
      });
    }

  } finally {
    await connection.end();
  }
}

checkStudent();
