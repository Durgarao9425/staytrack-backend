const mysql = require('mysql2/promise');

async function testAnjiPaymentHistory() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    console.log('=== TESTING ANJI PAYMENT HISTORY (Student ID: 19) ===\n');

    // This is the exact query used in the API
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
      WHERE sfp.student_id = 19
        AND sfp.hostel_id = 5
      ORDER BY sfp.payment_date DESC
    `);

    console.log(`✅ Query successful!`);
    console.log(`Payments found: ${payments.length}\n`);

    if (payments.length > 0) {
      console.log('Payment History:');
      payments.forEach((payment, index) => {
        console.log(`\n${index + 1}. Payment ID: ${payment.payment_id}`);
        console.log(`   Date: ${payment.payment_date}`);
        console.log(`   Amount: ₹${payment.amount_paid}`);
        console.log(`   Mode: ${payment.payment_mode || 'N/A'}`);
        console.log(`   Receipt: ${payment.receipt_number}`);
        console.log(`   Month: ${payment.payment_for_month}`);
        console.log(`   Reference: ${payment.transaction_reference || 'N/A'}`);
        console.log(`   Remarks: ${payment.remarks || 'N/A'}`);
      });

      console.log(`\n\nTotal Amount Paid: ₹${payments.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0)}`);
    } else {
      console.log('❌ No payments found for anji');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

testAnjiPaymentHistory();
