const mysql = require('mysql2/promise');

async function checkStudentRooms() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    console.log('=== STUDENT ROOM ASSIGNMENTS ===\n');

    // Get all students with their room assignments
    const [students] = await connection.query(`
      SELECT s.student_id, s.student_name, s.status, r.room_number, r.capacity, r.occupied_beds
      FROM students s
      LEFT JOIN rooms r ON s.room_id = r.room_id
      WHERE s.hostel_id = 5
      ORDER BY s.status DESC, r.room_number
    `);

    console.log('Students in Hostel ID 5:');
    console.log('='.repeat(100));

    let activeCount = 0;
    const roomCounts = {};

    students.forEach(s => {
      console.log(`${s.student_name.padEnd(20)} | Status: ${s.status.padEnd(10)} | Room: ${s.room_number || 'None'}`);

      if (s.status === 'Active') {
        activeCount++;
        if (s.room_number) {
          roomCounts[s.room_number] = (roomCounts[s.room_number] || 0) + 1;
        }
      }
    });

    console.log('='.repeat(100));
    console.log('Total Active Students:', activeCount);

    console.log('\nActual Student Count Per Room:');
    for (const [room, count] of Object.entries(roomCounts)) {
      console.log(`  Room ${room}: ${count} student(s)`);
    }

    console.log('\nExpected occupied_beds by room (based on actual students):');
    const [rooms] = await connection.query(`
      SELECT room_number, occupied_beds,
             (SELECT COUNT(*) FROM students WHERE room_id = r.room_id AND status = 'Active') as actual_count
      FROM rooms r
      WHERE hostel_id = 5
      ORDER BY room_number
    `);

    rooms.forEach(r => {
      const match = r.occupied_beds === r.actual_count ? '✓' : '✗ MISMATCH';
      console.log(`  Room ${r.room_number}: occupied_beds=${r.occupied_beds}, actual=${r.actual_count} ${match}`);
    });

  } finally {
    await connection.end();
  }
}

checkStudentRooms();
