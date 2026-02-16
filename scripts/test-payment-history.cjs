const mysql = require('mysql2/promise');

async function testPaymentHistory() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    console.log('=== TESTING PAYMENT HISTORY QUERY ===\n');

    const studentId = 20; // swami raj
    console.log(`Fetching payment history for student ID: ${studentId}\n`);

    const [payments] = await connection.query(`
      SELECT
        sfp.payment_id,
        sfp.student_id,
        sfp.payment_date,
        sfp.amount_paid,
        sfp.payment_for_month,
        sfp.receipt_number,
        sfp.transaction_reference,
        sfp.remarks,
        pm.payment_mode_name as payment_mode
      FROM student_fee_payments sfp
      LEFT JOIN payment_modes pm ON sfp.payment_mode_id = pm.payment_mode_id
      WHERE sfp.student_id = ?
      ORDER BY sfp.payment_date DESC
    `, [studentId]);

    console.log(`✅ Query successful!`);
    console.log(`Payments found: ${payments.length}\n`);

    if (payments.length > 0) {
      console.log('Payment Records:');
      payments.forEach((payment, index) => {
        console.log(`\n${index + 1}. Payment ID: ${payment.payment_id}`);
        console.log(`   Date: ${payment.payment_date}`);
        console.log(`   Amount: ₹${payment.amount_paid}`);
        console.log(`   Mode: ${payment.payment_mode || 'N/A'}`);
        console.log(`   Receipt: ${payment.receipt_number}`);
        console.log(`   Reference: ${payment.transaction_reference || 'N/A'}`);
        console.log(`   Remarks: ${payment.remarks || 'N/A'}`);
      });
    } else {
      console.log('❌ No payments found for this student');
    }

    // Check all students with payments
    console.log('\n\n=== ALL STUDENTS WITH PAYMENTS ===\n');
    const [allPayments] = await connection.query(`
      SELECT
        s.first_name,
        s.student_id,
        COUNT(sfp.payment_id) as payment_count,
        SUM(sfp.amount_paid) as total_paid
      FROM students s
      LEFT JOIN student_fee_payments sfp ON s.student_id = sfp.student_id
      WHERE s.hostel_id = 5
      GROUP BY s.student_id
      ORDER BY s.first_name
    `);

    allPayments.forEach(student => {
      console.log(`${student.first_name} (ID: ${student.student_id}): ${student.payment_count || 0} payments, Total: ₹${student.total_paid || 0}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

testPaymentHistory();
