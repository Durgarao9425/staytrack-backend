const mysql = require('mysql2/promise');

async function checkFeeTables() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    console.log('=== FEE_STRUCTURE TABLE ===\n');

    // Get table structure
    const [feeStructure] = await connection.query('DESCRIBE fee_structure');
    console.log('Columns:', feeStructure.length);
    feeStructure.forEach((col, index) => {
      console.log(`${index + 1}. ${col.Field} (${col.Type})`);
    });

    // Get data
    console.log('\n=== FEE_STRUCTURE DATA ===\n');
    const [feeData] = await connection.query('SELECT * FROM fee_structure');
    console.log('Total Records:', feeData.length);
    console.log('\n');
    feeData.forEach((row, index) => {
      console.log(`${index + 1}. ${row.fee_type} - ₹${row.amount} (${row.frequency}) - Active: ${row.is_active}`);
    });

    console.log('\n\n=== PAYMENT_MODES TABLE ===\n');

    // Get table structure
    const [paymentModes] = await connection.query('DESCRIBE payment_modes');
    console.log('Columns:', paymentModes.length);
    paymentModes.forEach((col, index) => {
      console.log(`${index + 1}. ${col.Field} (${col.Type})`);
    });

    // Get data
    console.log('\n=== PAYMENT_MODES DATA ===\n');
    const [modesData] = await connection.query('SELECT * FROM payment_modes ORDER BY order_index');
    console.log('Total Records:', modesData.length);
    console.log('\n');
    modesData.forEach((row, index) => {
      console.log(`${index + 1}. ${row.payment_mode_name} (Order: ${row.order_index || 'N/A'})`);
    });

    console.log('\n\n=== CHECKING SWAMI RAJ ===\n');

    // Check if swami raj exists in students
    const [student] = await connection.query(
      'SELECT * FROM students WHERE first_name LIKE "%swami%"'
    );

    if (student.length > 0) {
      console.log('Student Found:');
      console.log(`ID: ${student[0].student_id}`);
      console.log(`Name: ${student[0].first_name} ${student[0].last_name || ''}`);
      console.log(`Hostel ID: ${student[0].hostel_id}`);
      console.log(`Status: ${student[0].status}`);

      // Check room allocation
      const [allocation] = await connection.query(
        'SELECT ra.*, r.room_number FROM room_allocations ra LEFT JOIN rooms r ON ra.room_id = r.room_id WHERE ra.student_id = ? AND ra.is_active = 1',
        [student[0].student_id]
      );

      if (allocation.length > 0) {
        console.log(`Room: ${allocation[0].room_number}`);
        console.log(`Monthly Rent: ₹${allocation[0].monthly_rent}`);
      }

      // Check if dues exist
      const [dues] = await connection.query(
        'SELECT * FROM student_dues WHERE student_id = ?',
        [student[0].student_id]
      );

      console.log(`\nDues Records: ${dues.length}`);
      if (dues.length === 0) {
        console.log('❌ NO DUES FOUND - This is the problem!');
      }
    } else {
      console.log('❌ Student "swami raj" not found');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkFeeTables();
