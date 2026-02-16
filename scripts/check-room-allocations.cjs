const mysql = require('mysql2/promise');

async function checkRoomAllocations() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    console.log('=== ROOM ALLOCATIONS TABLE ===\n');

    // Check structure
    const [columns] = await connection.query('SHOW COLUMNS FROM room_allocations');
    console.log('Columns:');
    columns.forEach(col => {
      console.log(`  ${col.Field} (${col.Type})`);
    });

    // Check allocations for hostel 5
    const [allocations] = await connection.query(`
      SELECT ra.*,
             CONCAT(s.first_name, ' ', s.last_name) as student_name,
             s.status as student_status,
             r.room_number
      FROM room_allocations ra
      LEFT JOIN students s ON ra.student_id = s.student_id
      LEFT JOIN rooms r ON ra.room_id = r.room_id
      WHERE r.hostel_id = 5
      ORDER BY r.room_number, ra.allocation_date DESC
    `);

    console.log('\nRoom Allocations for Hostel 5:');
    console.log('='.repeat(100));

    if (allocations.length === 0) {
      console.log('No room allocations found');
    } else {
      allocations.forEach(a => {
        console.log(`Student: ${a.student_name || 'Unknown'}`);
        console.log(`  Room: ${a.room_number}`);
        console.log(`  Status: ${a.student_status}`);
        console.log(`  Allocation Date: ${a.allocation_date}`);
        console.log(`  Checkout Date: ${a.checkout_date || 'Still allocated'}`);
        console.log('-'.repeat(100));
      });
    }

    // Count active allocations per room
    const [roomCounts] = await connection.query(`
      SELECT r.room_number, r.occupied_beds, r.capacity,
             COUNT(ra.allocation_id) as actual_allocations
      FROM rooms r
      LEFT JOIN room_allocations ra ON r.room_id = ra.room_id AND ra.checkout_date IS NULL
      LEFT JOIN students s ON ra.student_id = s.student_id AND s.status = 'Active'
      WHERE r.hostel_id = 5
      GROUP BY r.room_id, r.room_number, r.occupied_beds, r.capacity
      ORDER BY r.room_number
    `);

    console.log('\nRoom Occupancy Summary:');
    console.log('='.repeat(100));
    roomCounts.forEach(rc => {
      const match = rc.occupied_beds === rc.actual_allocations ? '✓' : '✗ MISMATCH';
      console.log(`Room ${rc.room_number}: Capacity=${rc.capacity}, occupied_beds=${rc.occupied_beds}, actual_allocations=${rc.actual_allocations} ${match}`);
    });

  } finally {
    await connection.end();
  }
}

checkRoomAllocations();
