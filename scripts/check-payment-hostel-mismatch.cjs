const mysql = require('mysql2/promise');

async function checkPaymentHostelMismatch() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    console.log('=== CHECKING PAYMENT HOSTEL ID MISMATCH ===\n');

    // Check payments where student's hostel_id doesn't match payment's hostel_id
    const [mismatches] = await connection.query(`
      SELECT
        sfp.payment_id,
        sfp.student_id,
        s.first_name,
        s.hostel_id as student_hostel_id,
        sfp.hostel_id as payment_hostel_id,
        sfp.amount_paid,
        sfp.payment_date
      FROM student_fee_payments sfp
      LEFT JOIN students s ON sfp.student_id = s.student_id
      WHERE s.hostel_id != sfp.hostel_id
      ORDER BY sfp.student_id, sfp.payment_date
    `);

    if (mismatches.length === 0) {
      console.log('✅ No mismatches found! All payments have correct hostel_id.');
    } else {
      console.log(`❌ Found ${mismatches.length} payment(s) with incorrect hostel_id:\n`);

      mismatches.forEach(payment => {
        console.log(`Payment ID: ${payment.payment_id}`);
        console.log(`  Student: ${payment.first_name} (ID: ${payment.student_id})`);
        console.log(`  Student's Hostel ID: ${payment.student_hostel_id}`);
        console.log(`  Payment's Hostel ID: ${payment.payment_hostel_id} ❌`);
        console.log(`  Amount: ₹${payment.amount_paid}`);
        console.log(`  Date: ${payment.payment_date}`);
        console.log('');
      });

      console.log('\n=== FIX QUERY ===');
      console.log('To fix these mismatches, run:\n');
      console.log(`UPDATE student_fee_payments sfp
JOIN students s ON sfp.student_id = s.student_id
SET sfp.hostel_id = s.hostel_id
WHERE sfp.hostel_id != s.hostel_id;`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

checkPaymentHostelMismatch();
