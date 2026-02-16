/**
 * Check Hostel Rooms - Verify total_rooms field in hostel_master
 */

import db from '../dist/config/database.js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function checkHostelRooms() {
  console.log(`\n${colors.cyan}=== Hostel Rooms Analysis ===${colors.reset}\n`);

  try {
    // Step 1: Check hostel_master table structure
    console.log(`${colors.blue}[1] Checking hostel_master table structure...${colors.reset}\n`);

    const columns = await db.raw('DESCRIBE hostel_master');
    const columnNames = columns[0].map(c => c.Field);

    console.log(`Columns in hostel_master: ${columnNames.join(', ')}\n`);

    if (!columnNames.includes('total_rooms')) {
      console.log(`${colors.yellow}⚠ Warning: 'total_rooms' column does NOT exist in hostel_master table${colors.reset}\n`);
    } else {
      console.log(`${colors.green}✓ 'total_rooms' column exists${colors.reset}\n`);
    }

    // Step 2: Get all hostels data
    console.log(`${colors.blue}[2] Fetching all hostels...${colors.reset}\n`);

    const hostels = await db('hostel_master').select('*');

    console.log(`Total hostels in database: ${hostels.length}\n`);

    // Step 3: For each hostel, count actual rooms
    console.log(`${colors.blue}[3] Counting actual rooms for each hostel...${colors.reset}\n`);

    const hostelRoomData = [];

    for (const hostel of hostels) {
      // Count rooms from rooms table
      const roomCount = await db('rooms')
        .where('hostel_id', hostel.hostel_id)
        .count('* as count')
        .first();

      const actualRooms = parseInt(roomCount.count);
      const storedRooms = hostel.total_rooms || 0;
      const match = actualRooms === storedRooms;

      hostelRoomData.push({
        hostel_id: hostel.hostel_id,
        hostel_name: hostel.hostel_name,
        stored_total_rooms: storedRooms,
        actual_rooms_count: actualRooms,
        match: match,
        is_active: hostel.is_active
      });

      const icon = match ? colors.green + '✓' : colors.red + '✗';
      const status = hostel.is_active ? colors.green + 'Active' : colors.yellow + 'Inactive';

      console.log(`${icon}${colors.reset} Hostel ${hostel.hostel_id}: ${colors.cyan}${hostel.hostel_name}${colors.reset}`);
      console.log(`   Stored: ${storedRooms} rooms | Actual: ${colors.blue}${actualRooms}${colors.reset} rooms | Status: ${status}${colors.reset}`);

      if (!match) {
        console.log(`   ${colors.red}MISMATCH: Should be ${actualRooms} but stored as ${storedRooms}${colors.reset}`);
      }
      console.log();
    }

    // Step 4: Detailed info for hostel_id = 5
    console.log(`${colors.cyan}[4] Detailed info for Hostel ID = 5:${colors.reset}\n`);

    const hostel5 = await db('hostel_master')
      .where('hostel_id', 5)
      .first();

    if (!hostel5) {
      console.log(`${colors.red}✗ Hostel ID 5 not found!${colors.reset}\n`);
    } else {
      console.log(`Hostel Name: ${colors.cyan}${hostel5.hostel_name}${colors.reset}`);
      console.log(`Stored total_rooms: ${hostel5.total_rooms || 'NULL'}`);
      console.log(`Is Active: ${hostel5.is_active ? 'Yes' : 'No'}`);
      console.log();

      // Get actual rooms for hostel 5
      const rooms5 = await db('rooms')
        .where('hostel_id', 5)
        .select('room_id', 'room_number', 'room_type', 'capacity', 'is_available');

      console.log(`${colors.blue}Actual rooms in database: ${rooms5.length}${colors.reset}\n`);

      if (rooms5.length > 0) {
        console.log(`${colors.cyan}Rooms list:${colors.reset}`);
        rooms5.forEach((room, i) => {
          const status = room.is_available ? colors.green + 'Available' : colors.yellow + 'Occupied';
          console.log(`  ${i + 1}. Room ${room.room_number} (${room.room_type}) - Capacity: ${room.capacity} - ${status}${colors.reset}`);
        });
        console.log();
      } else {
        console.log(`${colors.yellow}⚠ No rooms found for Hostel ID 5${colors.reset}\n`);
      }

      // Check room allocations
      const allocations5 = await db('room_allocations as ra')
        .join('rooms as r', 'ra.room_id', 'r.room_id')
        .where('r.hostel_id', 5)
        .select('ra.*', 'r.room_number');

      console.log(`${colors.blue}Room allocations: ${allocations5.length}${colors.reset}`);

      const activeAllocations = allocations5.filter(a => a.is_active);
      console.log(`${colors.blue}Active allocations: ${activeAllocations.length}${colors.reset}\n`);
    }

    // Step 5: Summary and recommendations
    console.log(`${colors.cyan}=== Summary ===${colors.reset}\n`);

    const mismatches = hostelRoomData.filter(h => !h.match);

    if (mismatches.length === 0) {
      console.log(`${colors.green}✓ All hostels have correct total_rooms values!${colors.reset}\n`);
    } else {
      console.log(`${colors.red}✗ Found ${mismatches.length} hostel(s) with incorrect total_rooms${colors.reset}\n`);
      console.log(`${colors.cyan}Hostels needing correction:${colors.reset}`);
      mismatches.forEach(h => {
        console.log(`  • Hostel ${h.hostel_id}: ${h.hostel_name}`);
        console.log(`    Update: ${h.stored_total_rooms} → ${h.actual_rooms_count}`);
      });
      console.log();

      console.log(`${colors.yellow}Would you like to fix these automatically? (Run fix-hostel-rooms.js)${colors.reset}\n`);
    }

    // Display table format
    console.log(`${colors.cyan}=== Complete Table ===${colors.reset}\n`);
    console.log(`${'ID'.padEnd(5)} ${'Hostel Name'.padEnd(30)} ${'Stored'.padEnd(8)} ${'Actual'.padEnd(8)} ${'Status'.padEnd(10)}`);
    console.log('─'.repeat(70));
    hostelRoomData.forEach(h => {
      const stored = String(h.stored_total_rooms || 0).padEnd(8);
      const actual = String(h.actual_rooms_count).padEnd(8);
      const status = h.match ? colors.green + 'OK' + colors.reset : colors.red + 'MISMATCH' + colors.reset;
      console.log(`${String(h.hostel_id).padEnd(5)} ${h.hostel_name.padEnd(30)} ${stored} ${actual} ${status}`);
    });
    console.log();

  } catch (error) {
    console.error(`\n${colors.red}✗ Error:${colors.reset}`, error.message);
    console.error(error.stack);
  } finally {
    await db.destroy();
  }
}

checkHostelRooms();
