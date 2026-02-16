const mysql = require('mysql2/promise');

async function testNewOccupancy() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    const hostelId = 5;

    console.log('=== TESTING NEW OCCUPANCY CALCULATION ===\n');

    // Total beds
    const [totalBeds] = await connection.query(`
      SELECT SUM(capacity) as total_beds
      FROM rooms
      WHERE hostel_id = ?
    `, [hostelId]);

    console.log('Total Beds:', totalBeds[0].total_beds);

    // Occupied beds from active allocations
    const [occupiedBeds] = await connection.query(`
      SELECT COUNT(*) as count
      FROM room_allocations ra
      JOIN students s ON ra.student_id = s.student_id
      JOIN rooms r ON ra.room_id = r.room_id
      WHERE s.status = 'Active'
        AND ra.is_active = 1
        AND ra.check_out_date IS NULL
        AND r.hostel_id = ?
    `, [hostelId]);

    console.log('Occupied Beds (Active Students):', occupiedBeds[0].count);

    // Calculate rate
    const total = Number(totalBeds[0].total_beds);
    const occupied = Number(occupiedBeds[0].count);
    const rate = total > 0 ? ((occupied / total) * 100).toFixed(2) : 0;

    console.log('\nOccupancy Rate:', rate + '%');
    console.log('Available Beds:', total - occupied);

    // Show which students are counted
    const [activeStudents] = await connection.query(`
      SELECT CONCAT(s.first_name, ' ', s.last_name) as name,
             r.room_number,
             ra.bed_number
      FROM room_allocations ra
      JOIN students s ON ra.student_id = s.student_id
      JOIN rooms r ON ra.room_id = r.room_id
      WHERE s.status = 'Active'
        AND ra.is_active = 1
        AND ra.check_out_date IS NULL
        AND r.hostel_id = ?
      ORDER BY r.room_number
    `, [hostelId]);

    console.log('\nActive Students with Allocations:');
    activeStudents.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name} - Room ${s.room_number}, Bed ${s.bed_number || 'N/A'}`);
    });

    console.log('\n✅ NEW CALCULATION: ' + rate + '%');
    console.log('   (Old calculation showed 58.06% based on outdated occupied_beds field)');

  } finally {
    await connection.end();
  }
}

testNewOccupancy();
