const mysql = require('mysql2/promise');

async function removeOneTimeFees() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    console.log('=== REMOVING ONE-TIME FEES (Admission & Security Deposit) ===\n');

    // Get current dues before deletion
    console.log('BEFORE deletion:');
    const [beforeDues] = await connection.query(`
      SELECT s.first_name, fs.fee_type, sd.due_amount, sd.balance_amount
      FROM student_dues sd
      LEFT JOIN students s ON sd.student_id = s.student_id
      LEFT JOIN fee_structure fs ON sd.fee_category_id = fs.fee_structure_id
      WHERE s.hostel_id = 5
      ORDER BY s.first_name, fs.fee_type
    `);

    let currentStudent = '';
    let studentTotal = 0;
    let grandTotal = 0;

    beforeDues.forEach(due => {
      if (currentStudent !== due.first_name) {
        if (currentStudent) {
          console.log(`  Subtotal: ₹${studentTotal}\n`);
        }
        currentStudent = due.first_name;
        studentTotal = 0;
        console.log(`${currentStudent}:`);
      }
      console.log(`  - ${due.fee_type}: ₹${due.balance_amount}`);
      studentTotal += parseFloat(due.balance_amount);
      grandTotal += parseFloat(due.balance_amount);
    });

    if (currentStudent) {
      console.log(`  Subtotal: ₹${studentTotal}\n`);
    }
    console.log(`Grand Total (Before): ₹${grandTotal}\n`);

    // Delete Admission Fee and Security Deposit dues
    console.log('Deleting one-time fees...\n');

    const [admissionResult] = await connection.query(`
      DELETE sd FROM student_dues sd
      LEFT JOIN fee_structure fs ON sd.fee_category_id = fs.fee_structure_id
      WHERE fs.fee_type = 'Admission Fee' AND sd.hostel_id = 5
    `);
    console.log(`✅ Deleted ${admissionResult.affectedRows} Admission Fee records`);

    const [securityResult] = await connection.query(`
      DELETE sd FROM student_dues sd
      LEFT JOIN fee_structure fs ON sd.fee_category_id = fs.fee_structure_id
      WHERE fs.fee_type = 'Security Deposit' AND sd.hostel_id = 5
    `);
    console.log(`✅ Deleted ${securityResult.affectedRows} Security Deposit records\n`);

    // Get current dues after deletion
    console.log('AFTER deletion:');
    const [afterDues] = await connection.query(`
      SELECT s.first_name, fs.fee_type, sd.due_amount, sd.balance_amount
      FROM student_dues sd
      LEFT JOIN students s ON sd.student_id = s.student_id
      LEFT JOIN fee_structure fs ON sd.fee_category_id = fs.fee_structure_id
      WHERE s.hostel_id = 5
      ORDER BY s.first_name, fs.fee_type
    `);

    currentStudent = '';
    studentTotal = 0;
    grandTotal = 0;

    afterDues.forEach(due => {
      if (currentStudent !== due.first_name) {
        if (currentStudent) {
          console.log(`  Subtotal: ₹${studentTotal}\n`);
        }
        currentStudent = due.first_name;
        studentTotal = 0;
        console.log(`${currentStudent}:`);
      }
      console.log(`  - ${due.fee_type}: ₹${due.balance_amount}`);
      studentTotal += parseFloat(due.balance_amount);
      grandTotal += parseFloat(due.balance_amount);
    });

    if (currentStudent) {
      console.log(`  Subtotal: ₹${studentTotal}\n`);
    }
    console.log(`Grand Total (After): ₹${grandTotal}\n`);

    console.log('=== SUMMARY ===');
    console.log(`Total fees deleted: ${admissionResult.affectedRows + securityResult.affectedRows}`);
    console.log(`Remaining dues: ${afterDues.length}`);
    console.log(`\n✅ ONE-TIME FEES REMOVED SUCCESSFULLY!`);
    console.log(`\nEach student now owes only Monthly Rent: ₹5,000`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

removeOneTimeFees();
