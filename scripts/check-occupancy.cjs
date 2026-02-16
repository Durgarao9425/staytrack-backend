const mysql = require('mysql2/promise');

async function checkOccupancy() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    console.log('=== CHECKING OCCUPANCY DATA ===\n');

    // Check rooms for hostel_id = 5
    const [rooms] = await connection.query(`
      SELECT room_id, room_number, capacity, occupied_beds
      FROM rooms
      WHERE hostel_id = 5
      ORDER BY room_number
    `);

    console.log('Rooms for Hostel ID 5:');
    console.log('='.repeat(80));

    let totalCapacity = 0;
    let totalOccupied = 0;

    rooms.forEach(r => {
      console.log(`Room ${r.room_number}: Capacity=${r.capacity}, Occupied=${r.occupied_beds}`);
      totalCapacity += r.capacity;
      totalOccupied += r.occupied_beds;
    });

    console.log('='.repeat(80));
    console.log('Total Beds:', totalCapacity);
    console.log('Occupied Beds:', totalOccupied);
    console.log('Available Beds:', totalCapacity - totalOccupied);

    const occupancyRate = totalCapacity > 0 ? ((totalOccupied / totalCapacity) * 100).toFixed(2) : 0;
    console.log('Occupancy Rate:', occupancyRate + '%');

    // Check active students
    const [students] = await connection.query(`
      SELECT COUNT(*) as count
      FROM students
      WHERE hostel_id = 5 AND status = 'Active'
    `);

    console.log('\nActive Students:', students[0].count);
    console.log('Note: Occupied beds (' + totalOccupied + ') should match active students (' + students[0].count + ')');

    if (totalOccupied !== students[0].count) {
      console.log('\n⚠️  MISMATCH DETECTED!');
      console.log('The occupied_beds count does not match the number of active students.');
      console.log('This may need to be fixed.');
    }

  } finally {
    await connection.end();
  }
}

checkOccupancy();
