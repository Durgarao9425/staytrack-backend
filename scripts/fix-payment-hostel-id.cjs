const mysql = require('mysql2/promise');

async function fixPaymentHostelId() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    console.log('=== FIXING PAYMENT HOSTEL_ID MISMATCHES ===\n');

    // Show before state
    console.log('BEFORE Fix:');
    const [beforePayments] = await connection.query(`
      SELECT
        sfp.payment_id,
        sfp.student_id,
        s.first_name,
        s.hostel_id as student_hostel_id,
        sfp.hostel_id as payment_hostel_id
      FROM student_fee_payments sfp
      LEFT JOIN students s ON sfp.student_id = s.student_id
      WHERE s.hostel_id != sfp.hostel_id
    `);

    if (beforePayments.length === 0) {
      console.log('✅ No mismatches found!\n');
      return;
    }

    beforePayments.forEach(p => {
      console.log(`  Payment ${p.payment_id}: Student ${p.first_name} (hostel ${p.student_hostel_id}) has payment with hostel_id=${p.payment_hostel_id}`);
    });

    // Fix the mismatches
    console.log('\nUpdating payments...');
    const [result] = await connection.query(`
      UPDATE student_fee_payments sfp
      JOIN students s ON sfp.student_id = s.student_id
      SET sfp.hostel_id = s.hostel_id
      WHERE sfp.hostel_id != s.hostel_id
    `);

    console.log(`✅ Updated ${result.affectedRows} payment(s)\n`);

    // Show after state
    console.log('AFTER Fix:');
    const [afterPayments] = await connection.query(`
      SELECT
        sfp.payment_id,
        sfp.student_id,
        s.first_name,
        s.hostel_id as student_hostel_id,
        sfp.hostel_id as payment_hostel_id
      FROM student_fee_payments sfp
      LEFT JOIN students s ON sfp.student_id = s.student_id
      WHERE s.hostel_id != sfp.hostel_id
    `);

    if (afterPayments.length === 0) {
      console.log('✅ All payments now have correct hostel_id!\n');
    } else {
      console.log(`❌ Still ${afterPayments.length} mismatch(es) remaining\n`);
    }

    // Verify anji's payments
    console.log('=== VERIFYING ANJI\'S PAYMENTS ===');
    const [anjiPayments] = await connection.query(`
      SELECT
        payment_id,
        hostel_id,
        amount_paid,
        payment_date
      FROM student_fee_payments
      WHERE student_id = 19
      ORDER BY payment_date
    `);

    console.log(`Found ${anjiPayments.length} payment(s) for anji:`);
    anjiPayments.forEach(p => {
      console.log(`  Payment ${p.payment_id}: ₹${p.amount_paid} - hostel_id=${p.hostel_id} ✅`);
    });

    console.log('\n✅ FIX COMPLETED!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

fixPaymentHostelId();
