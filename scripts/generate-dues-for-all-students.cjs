const mysql = require('mysql2/promise');

async function generateDuesForAllStudents() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    console.log('=== GENERATING DUES FOR ALL STUDENTS IN HOSTEL 5 ===\n');

    // Get all active students in hostel 5 with their room allocations
    const [students] = await connection.query(`
      SELECT s.*, ra.monthly_rent, ra.room_id, r.room_number
      FROM students s
      LEFT JOIN room_allocations ra ON s.student_id = ra.student_id AND ra.is_active = 1
      LEFT JOIN rooms r ON ra.room_id = r.room_id
      WHERE s.hostel_id = 5 AND s.status = 'Active'
    `);

    console.log(`Found ${students.length} active students in Hostel 5\n`);

    // Get current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 15);

    // Get fee structures for hostel 5
    const [feeStructures] = await connection.query(
      'SELECT * FROM fee_structure WHERE hostel_id = 5 AND is_active = 1'
    );

    console.log(`Fee structures available: ${feeStructures.length}`);
    feeStructures.forEach((fee, index) => {
      console.log(`  ${index + 1}. ${fee.fee_type} - ₹${fee.amount} (${fee.frequency})`);
    });
    console.log('\n');

    let studentsProcessed = 0;
    let duesCreated = 0;
    let studentsSkipped = 0;

    for (const student of students) {
      console.log(`Processing: ${student.first_name} ${student.last_name || ''} (ID: ${student.student_id})`);
      console.log(`  Room: ${student.room_number || 'Not allocated'}`);
      console.log(`  Monthly Rent: ₹${student.monthly_rent || 0}`);

      // Check if dues already exist for this month
      const [existingDues] = await connection.query(
        'SELECT * FROM student_dues WHERE student_id = ? AND due_month = ?',
        [student.student_id, currentMonth]
      );

      if (existingDues.length > 0) {
        console.log(`  ℹ️  Dues already exist for ${currentMonth} (${existingDues.length} records) - skipping\n`);
        studentsSkipped++;
        continue;
      }

      // Create dues for each fee structure
      for (const feeStructure of feeStructures) {
        let dueAmount = feeStructure.amount;

        // For Monthly Rent, use the room's monthly_rent
        if (feeStructure.fee_type === 'Monthly Rent' && student.monthly_rent) {
          dueAmount = student.monthly_rent;
        }

        await connection.query(`
          INSERT INTO student_dues (
            student_id,
            hostel_id,
            fee_category_id,
            due_month,
            due_amount,
            paid_amount,
            balance_amount,
            due_date,
            is_paid,
            is_carried_forward,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          student.student_id,
          student.hostel_id,
          feeStructure.fee_structure_id,
          currentMonth,
          dueAmount,
          0,
          dueAmount,
          dueDate,
          0,
          0
        ]);

        duesCreated++;
      }

      console.log(`  ✅ Created ${feeStructures.length} dues\n`);
      studentsProcessed++;
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Total students: ${students.length}`);
    console.log(`Students processed: ${studentsProcessed}`);
    console.log(`Students skipped: ${studentsSkipped}`);
    console.log(`Dues created: ${duesCreated}`);

    console.log('\n=== VERIFICATION ===\n');
    const [allDues] = await connection.query(`
      SELECT s.first_name, s.last_name, fs.fee_type, sd.due_amount, sd.balance_amount, sd.is_paid
      FROM student_dues sd
      LEFT JOIN students s ON sd.student_id = s.student_id
      LEFT JOIN fee_structure fs ON sd.fee_category_id = fs.fee_structure_id
      WHERE sd.hostel_id = 5 AND sd.due_month = ?
      ORDER BY s.first_name, fs.fee_type
    `, [currentMonth]);

    console.log(`Total dues records for ${currentMonth}: ${allDues.length}\n`);

    let currentStudent = '';
    let studentTotal = 0;

    allDues.forEach((due) => {
      const studentName = `${due.first_name} ${due.last_name || ''}`;

      if (currentStudent !== studentName) {
        if (currentStudent) {
          console.log(`  Subtotal: ₹${studentTotal}\n`);
        }
        currentStudent = studentName;
        studentTotal = 0;
        console.log(`${studentName}:`);
      }

      console.log(`  - ${due.fee_type}: ₹${due.due_amount} (Balance: ₹${due.balance_amount})`);
      studentTotal += parseFloat(due.balance_amount);
    });

    if (currentStudent) {
      console.log(`  Subtotal: ₹${studentTotal}\n`);
    }

    const grandTotal = allDues.reduce((sum, due) => sum + parseFloat(due.balance_amount), 0);
    console.log(`Grand Total Outstanding: ₹${grandTotal}`);

    console.log('\n✅ DUES GENERATION COMPLETE!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

generateDuesForAllStudents();
