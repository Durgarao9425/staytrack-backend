const mysql = require('mysql2/promise');

async function checkAllPaymentsByHostel() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    console.log('=== CHECKING ALL PAYMENTS GROUPED BY HOSTEL_ID ===\n');

    // Get all payments grouped by hostel_id
    const [hostels] = await connection.query(`
      SELECT DISTINCT hostel_id
      FROM student_fee_payments
      ORDER BY hostel_id
    `);

    for (const hostel of hostels) {
      console.log(`\n=== HOSTEL ID: ${hostel.hostel_id} ===`);

      const [payments] = await connection.query(`
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
        WHERE sfp.hostel_id = ?
        ORDER BY sfp.student_id, sfp.payment_date
      `, [hostel.hostel_id]);

      console.log(`Found ${payments.length} payment(s):\n`);

      payments.forEach(p => {
        const match = p.student_hostel_id === p.payment_hostel_id ? '✅' : '❌';
        console.log(`Payment ${p.payment_id}: Student ${p.first_name} (ID: ${p.student_id})`);
        console.log(`  Student Hostel: ${p.student_hostel_id}, Payment Hostel: ${p.payment_hostel_id} ${match}`);
        console.log(`  Amount: ₹${p.amount_paid}, Date: ${new Date(p.payment_date).toLocaleDateString()}`);
        console.log('');
      });
    }

    // Summary
    console.log('\n=== SUMMARY ===');
    const [summary] = await connection.query(`
      SELECT
        sfp.hostel_id,
        COUNT(*) as payment_count,
        SUM(sfp.amount_paid) as total_amount
      FROM student_fee_payments sfp
      GROUP BY sfp.hostel_id
      ORDER BY sfp.hostel_id
    `);

    summary.forEach(s => {
      console.log(`Hostel ${s.hostel_id}: ${s.payment_count} payments, Total: ₹${s.total_amount}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

checkAllPaymentsByHostel();
