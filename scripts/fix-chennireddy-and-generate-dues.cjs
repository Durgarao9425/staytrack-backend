const mysql = require('mysql2/promise');

async function fixAndGenerateDues() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    console.log('=== FIXING CHENNIREDDY DATA ===\n');

    const studentId = 21;

    // Fix hostel_id in room_allocations
    await connection.query(`
      UPDATE room_allocations
      SET hostel_id = 5
      WHERE student_id = ? AND hostel_id IS NULL
    `, [studentId]);
    console.log('✓ Fixed hostel_id in room_allocations\n');

    // Generate November 2025 due
    const dueMonth = '2025-11';
    const monthlyRent = 4800;
    const dueDate = '2025-11-17'; // Student's due_date from students table

    // Check if due already exists
    const [existing] = await connection.query(`
      SELECT due_id FROM student_dues
      WHERE student_id = ? AND due_month = ?
    `, [studentId, dueMonth]);

    if (existing.length > 0) {
      console.log('✓ November 2025 due already exists');
    } else {
      // Insert the due
      await connection.query(`
        INSERT INTO student_dues (
          student_id, hostel_id, fee_category_id,
          due_month, due_amount, paid_amount, balance_amount,
          due_date, is_paid
        ) VALUES (?, ?, NULL, ?, ?, 0, ?, ?, 0)
      `, [studentId, 5, dueMonth, monthlyRent, monthlyRent, dueDate]);
      console.log('✓ Generated November 2025 monthly due\n');
    }

    // Verify
    const [result] = await connection.query(`
      SELECT sd.*, CONCAT(s.first_name, ' ', s.last_name) as student_name, r.room_number
      FROM student_dues sd
      JOIN students s ON sd.student_id = s.student_id
      LEFT JOIN room_allocations ra ON sd.student_id = ra.student_id AND ra.is_active = 1
      LEFT JOIN rooms r ON ra.room_id = r.room_id
      WHERE sd.student_id = ? AND sd.due_month = ?
    `, [studentId, dueMonth]);

    console.log('=== VERIFICATION ===');
    if (result.length > 0) {
      const d = result[0];
      console.log('Student:', d.student_name);
      console.log('Room:', d.room_number);
      console.log('Month:', d.due_month);
      console.log('Due Amount: Rs.' + d.due_amount);
      console.log('Paid Amount: Rs.' + d.paid_amount);
      console.log('Balance: Rs.' + d.balance_amount);
      console.log('Due Date:', d.due_date);
      console.log('Status:', d.is_paid ? 'Paid' : 'Pending');
      console.log('\n✅ Chennireddy now has proper monthly due for November 2025!');
      console.log('   Fee Management page will show: Status = Pending, Balance = Rs.4800');
    }

  } finally {
    await connection.end();
  }
}

fixAndGenerateDues();
