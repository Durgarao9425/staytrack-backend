/**
 * Check Hostel Rooms - Verify total_rooms field in hostel_master (Fixed)
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
    // Step 1: Check rooms table structure first
    console.log(`${colors.blue}[1] Checking rooms table structure...${colors.reset}\n`);

    const roomColumns = await db.raw('DESCRIBE rooms');
    const roomColumnNames = roomColumns[0].map(c => c.Field);
    console.log(`Columns in rooms table: ${roomColumnNames.join(', ')}\n`);

    // Step 2: Get all hostels data
    console.log(`${colors.blue}[2] Analyzing all hostels...${colors.reset}\n`);

    const hostels = await db('hostel_master').select('*').orderBy('hostel_id');

    console.log(`Total hostels in database: ${hostels.length}\n`);

    // Step 3: For each hostel, count actual rooms
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
    console.log(`${colors.cyan}[3] Detailed info for Hostel ID = 5:${colors.reset}\n`);

    const hostel5 = await db('hostel_master')
      .where('hostel_id', 5)
      .first();

    if (!hostel5) {
      console.log(`${colors.red}✗ Hostel ID 5 not found!${colors.reset}\n`);
    } else {
      console.log(`Hostel Name: ${colors.cyan}${hostel5.hostel_name}${colors.reset}`);
      console.log(`Stored total_rooms: ${hostel5.total_rooms || 'NULL/0'}`);
      console.log(`Total floors: ${hostel5.total_floors || 'NULL'}`);
      console.log(`Is Active: ${hostel5.is_active ? 'Yes' : 'No'}`);
      console.log(`Address: ${hostel5.address}, ${hostel5.city}`);
      console.log();

      // Get actual rooms for hostel 5
      const rooms5 = await db('rooms')
        .where('hostel_id', 5)
        .select('*');

      console.log(`${colors.blue}Actual rooms in database: ${rooms5.length}${colors.reset}\n`);

      if (rooms5.length > 0) {
        console.log(`${colors.cyan}Rooms list for Hostel 5:${colors.reset}`);
        rooms5.forEach((room, i) => {
          console.log(`  ${i + 1}. Room ID: ${room.room_id}`);
          console.log(`     Room Number: ${room.room_number || 'N/A'}`);
          console.log(`     Floor: ${room.floor_number || 'N/A'}`);
          console.log(`     Total Beds: ${room.total_beds || 'N/A'}`);
          console.log(`     Available Beds: ${room.available_beds || 'N/A'}`);
          console.log();
        });
      } else {
        console.log(`${colors.yellow}⚠ No rooms found for Hostel ID 5${colors.reset}\n`);
      }

      // Check room allocations for hostel 5
      const allocations5 = await db('room_allocations as ra')
        .join('rooms as r', 'ra.room_id', 'r.room_id')
        .join('students as s', 'ra.student_id', 's.student_id')
        .where('r.hostel_id', 5)
        .select('ra.*', 'r.room_number', 's.first_name', 's.last_name');

      console.log(`${colors.blue}Room allocations for Hostel 5: ${allocations5.length}${colors.reset}`);

      const activeAllocations = allocations5.filter(a => a.is_active);
      console.log(`${colors.blue}Active allocations: ${activeAllocations.length}${colors.reset}\n`);

      if (activeAllocations.length > 0) {
        console.log(`${colors.cyan}Active allocations:${colors.reset}`);
        activeAllocations.forEach((alloc, i) => {
          console.log(`  ${i + 1}. ${alloc.first_name} ${alloc.last_name} → Room ${alloc.room_number}`);
        });
        console.log();
      }
    }

    // Step 5: Summary and fix recommendations
    console.log(`${colors.cyan}=== Summary ===${colors.reset}\n`);

    const mismatches = hostelRoomData.filter(h => !h.match);

    if (mismatches.length === 0) {
      console.log(`${colors.green}✓ All hostels have correct total_rooms values!${colors.reset}\n`);
    } else {
      console.log(`${colors.red}✗ Found ${mismatches.length} hostel(s) with incorrect total_rooms${colors.reset}\n`);
      console.log(`${colors.cyan}Hostels needing correction:${colors.reset}\n`);
      mismatches.forEach(h => {
        console.log(`  • Hostel ${h.hostel_id}: ${h.hostel_name}`);
        console.log(`    Current: ${h.stored_total_rooms} → Should be: ${colors.green}${h.actual_rooms_count}${colors.reset}`);
        console.log();
      });

      console.log(`${colors.yellow}Run fix script to update automatically...${colors.reset}\n`);
    }

    // Display complete table
    console.log(`${colors.cyan}=== Complete Hostel Rooms Table ===${colors.reset}\n`);
    console.log(`┌─────┬────────────────────────────────┬─────────┬────────┬──────────┐`);
    console.log(`│ ID  │ Hostel Name                    │ Stored  │ Actual │ Status   │`);
    console.log(`├─────┼────────────────────────────────┼─────────┼────────┼──────────┤`);

    hostelRoomData.forEach(h => {
      const id = String(h.hostel_id).padEnd(3);
      const name = h.hostel_name.substring(0, 30).padEnd(30);
      const stored = String(h.stored_total_rooms || 0).padStart(5);
      const actual = String(h.actual_rooms_count).padStart(4);
      const status = h.match ? colors.green + 'OK      ' + colors.reset : colors.red + 'MISMATCH' + colors.reset;
      console.log(`│ ${id} │ ${name} │  ${stored}  │  ${actual}  │ ${status} │`);
    });

    console.log(`└─────┴────────────────────────────────┴─────────┴────────┴──────────┘`);
    console.log();

    // Generate UPDATE SQL statements
    if (mismatches.length > 0) {
      console.log(`${colors.cyan}=== SQL to Fix (Copy & Run) ===${colors.reset}\n`);
      mismatches.forEach(h => {
        console.log(`UPDATE hostel_master SET total_rooms = ${h.actual_rooms_count} WHERE hostel_id = ${h.hostel_id}; -- ${h.hostel_name}`);
      });
      console.log();
    }

  } catch (error) {
    console.error(`\n${colors.red}✗ Error:${colors.reset}`, error.message);
    console.error(error.stack);
  } finally {
    await db.destroy();
  }
}

checkHostelRooms();
