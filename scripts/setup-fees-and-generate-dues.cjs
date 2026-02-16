const mysql = require('mysql2/promise');

async function setupAndGenerateDues() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    console.log('=== STEP 1: SETUP FEE STRUCTURE FOR HOSTEL 5 ===\n');

    // Check if fee structure exists for hostel 5
    const [existingFees] = await connection.query(
      'SELECT * FROM fee_structure WHERE hostel_id = 5'
    );

    if (existingFees.length === 0) {
      console.log('Creating default fee structures for Hostel 5...\n');

      // Insert default fee structures
      await connection.query(`
        INSERT INTO fee_structure (hostel_id, fee_type, frequency, amount, is_active)
        VALUES
        (5, 'Monthly Rent', 'Monthly', 5000, 1),
        (5, 'Admission Fee', 'One-Time', 2000, 1),
        (5, 'Security Deposit', 'One-Time', 5000, 1)
      `);

      console.log('✅ Created 3 fee structures:');
      console.log('   1. Monthly Rent - ₹5000 (Monthly)');
      console.log('   2. Admission Fee - ₹2000 (One-Time)');
      console.log('   3. Security Deposit - ₹5000 (One-Time)');
    } else {
      console.log(`ℹ️  Fee structures already exist (${existingFees.length} records)`);
      existingFees.forEach((fee, index) => {
        console.log(`   ${index + 1}. ${fee.fee_type} - ₹${fee.amount} (${fee.frequency})`);
      });
    }

    console.log('\n=== STEP 2: GENERATE DUES FOR SWAMI RAJ ===\n');

    // Get swami raj details
    const [student] = await connection.query(`
      SELECT s.*, ra.monthly_rent, ra.room_id
      FROM students s
      LEFT JOIN room_allocations ra ON s.student_id = ra.student_id AND ra.is_active = 1
      WHERE s.first_name LIKE '%swami%'
      LIMIT 1
    `);

    if (student.length === 0) {
      console.log('❌ Student not found');
      return;
    }

    const studentData = student[0];
    console.log(`Found: ${studentData.first_name} ${studentData.last_name || ''}`);
    console.log(`Student ID: ${studentData.student_id}`);
    console.log(`Hostel ID: ${studentData.hostel_id}`);
    console.log(`Monthly Rent: ₹${studentData.monthly_rent}`);

    // Get current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 15); // 15th of current month

    // Check if dues already exist
    const [existingDues] = await connection.query(
      'SELECT * FROM student_dues WHERE student_id = ?',
      [studentData.student_id]
    );

    if (existingDues.length > 0) {
      console.log(`\nℹ️  Dues already exist (${existingDues.length} records). Deleting old dues...`);
      await connection.query('DELETE FROM student_dues WHERE student_id = ?', [studentData.student_id]);
      console.log('✅ Old dues deleted');
    }

    console.log(`\n=== CREATING DUES FOR ${currentMonth} ===\n`);

    // Get active fee structures for this hostel
    const [feeStructures] = await connection.query(
      'SELECT * FROM fee_structure WHERE hostel_id = ? AND is_active = 1',
      [studentData.hostel_id]
    );

    let duesCreated = 0;

    for (const feeStructure of feeStructures) {
      let dueAmount = feeStructure.amount;

      // For Monthly Rent, use the room's monthly_rent instead of fee_structure amount
      if (feeStructure.fee_type === 'Monthly Rent' && studentData.monthly_rent) {
        dueAmount = studentData.monthly_rent;
      }

      console.log(`Creating due: ${feeStructure.fee_type} - ₹${dueAmount}`);

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
        studentData.student_id,
        studentData.hostel_id,
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

    console.log(`\n✅ Created ${duesCreated} dues records!`);

    // Verify
    console.log('\n=== VERIFICATION ===\n');
    const [newDues] = await connection.query(`
      SELECT sd.*, fs.fee_type
      FROM student_dues sd
      LEFT JOIN fee_structure fs ON sd.fee_category_id = fs.fee_structure_id
      WHERE sd.student_id = ?
    `, [studentData.student_id]);

    console.log(`Total Dues for Swami Raj: ${newDues.length}`);
    newDues.forEach((due, index) => {
      console.log(`${index + 1}. ${due.fee_type} - ₹${due.due_amount} (Balance: ₹${due.balance_amount})`);
    });

    const totalDue = newDues.reduce((sum, due) => sum + parseFloat(due.balance_amount), 0);
    console.log(`\nTotal Outstanding: ₹${totalDue}`);

    console.log('\n✅ DUES GENERATION COMPLETE!');
    console.log('\nNow check Fee Management page - Swami Raj should show:');
    console.log(`  - Status: Pending`);
    console.log(`  - Balance: ₹${totalDue}`);
    console.log(`  - Action: Pay button`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

setupAndGenerateDues();
