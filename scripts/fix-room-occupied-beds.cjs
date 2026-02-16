const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixRoomOccupiedBeds() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'Hostel'
  });

  try {
    console.log('=== FIXING ROOM OCCUPIED_BEDS COUNT ===\n');

    // Get all rooms
    const [rooms] = await connection.query(`
      SELECT room_id, room_number, hostel_id, occupied_beds
      FROM rooms
      ORDER BY hostel_id, room_number
    `);

    console.log(`Found ${rooms.length} rooms to check\n`);

    let fixedCount = 0;
    let totalFixed = 0;

    for (const room of rooms) {
      // Count actual active allocations for this room
      // Active allocation = is_current = 1 AND student status = 'Active'
      const [actualCount] = await connection.query(`
        SELECT COUNT(*) as count
        FROM room_allocations ra
        INNER JOIN students s ON ra.student_id = s.student_id
        WHERE ra.room_id = ?
          AND ra.is_current = 1
          AND s.status = 'Active'
      `, [room.room_id]);

      const actualOccupied = actualCount[0]?.count || 0;
      const currentOccupied = room.occupied_beds || 0;

      if (actualOccupied !== currentOccupied) {
        console.log(`Room ${room.room_number} (ID: ${room.room_id}):`);
        console.log(`  Current occupied_beds: ${currentOccupied}`);
        console.log(`  Actual active allocations: ${actualOccupied}`);
        console.log(`  Difference: ${actualOccupied - currentOccupied}`);
        
        // Update the room
        await connection.query(`
          UPDATE rooms
          SET occupied_beds = ?
          WHERE room_id = ?
        `, [actualOccupied, room.room_id]);

        console.log(`  ✓ Fixed: Updated to ${actualOccupied}\n`);
        fixedCount++;
        totalFixed += Math.abs(actualOccupied - currentOccupied);
      }
    }

    console.log('='.repeat(60));
    console.log(`Summary:`);
    console.log(`  Rooms checked: ${rooms.length}`);
    console.log(`  Rooms fixed: ${fixedCount}`);
    console.log(`  Total bed count corrections: ${totalFixed}`);
    console.log('='.repeat(60));

    // Show summary by hostel
    const [hostelSummary] = await connection.query(`
      SELECT 
        h.hostel_id,
        h.hostel_name,
        COUNT(DISTINCT r.room_id) as total_rooms,
        SUM(r.occupied_beds) as total_occupied_beds,
        (
          SELECT COUNT(*)
          FROM room_allocations ra
          INNER JOIN students s ON ra.student_id = s.student_id
          WHERE ra.room_id IN (SELECT room_id FROM rooms WHERE hostel_id = h.hostel_id)
            AND ra.is_current = 1
            AND s.status = 'Active'
        ) as actual_active_allocations
      FROM hostel_master h
      LEFT JOIN rooms r ON h.hostel_id = r.hostel_id
      GROUP BY h.hostel_id, h.hostel_name
      ORDER BY h.hostel_id
    `);

    console.log('\nHostel Summary:');
    console.log('-'.repeat(60));
    hostelSummary.forEach(h => {
      const match = h.total_occupied_beds == h.actual_active_allocations ? '✓' : '✗';
      console.log(`${match} ${h.hostel_name} (ID: ${h.hostel_id}):`);
      console.log(`    Rooms: ${h.total_rooms || 0}`);
      console.log(`    Stored occupied_beds: ${h.total_occupied_beds || 0}`);
      console.log(`    Actual active allocations: ${h.actual_active_allocations || 0}`);
    });

  } catch (error) {
    console.error('Error fixing room occupied_beds:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

fixRoomOccupiedBeds()
  .then(() => {
    console.log('\n✅ Room occupied_beds fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });








