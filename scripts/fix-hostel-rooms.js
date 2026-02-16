/**
 * Fix Hostel Rooms - Update total_rooms in hostel_master to match actual room counts
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

async function fixHostelRooms() {
  console.log(`\n${colors.cyan}=== Fix Hostel Rooms Count ===${colors.reset}\n`);

  try {
    // Get all hostels
    const hostels = await db('hostel_master').select('*').orderBy('hostel_id');

    console.log(`${colors.blue}Found ${hostels.length} hostels${colors.reset}\n`);

    const updates = [];

    for (const hostel of hostels) {
      // Count actual rooms
      const roomCount = await db('rooms')
        .where('hostel_id', hostel.hostel_id)
        .count('* as count')
        .first();

      const actualRooms = parseInt(roomCount.count);
      const storedRooms = hostel.total_rooms || 0;

      if (actualRooms !== storedRooms) {
        updates.push({
          hostel_id: hostel.hostel_id,
          hostel_name: hostel.hostel_name,
          old_value: storedRooms,
          new_value: actualRooms
        });
      }
    }

    if (updates.length === 0) {
      console.log(`${colors.green}✓ All hostels already have correct total_rooms values!${colors.reset}\n`);
      return;
    }

    console.log(`${colors.yellow}Found ${updates.length} hostel(s) to update:${colors.reset}\n`);

    updates.forEach((update, i) => {
      console.log(`${i + 1}. ${colors.cyan}${update.hostel_name}${colors.reset} (ID: ${update.hostel_id})`);
      console.log(`   ${update.old_value} → ${colors.green}${update.new_value}${colors.reset} rooms`);
      console.log();
    });

    console.log(`${colors.blue}Applying updates...${colors.reset}\n`);

    // Apply updates
    for (const update of updates) {
      await db('hostel_master')
        .where('hostel_id', update.hostel_id)
        .update({
          total_rooms: update.new_value,
          updated_at: new Date()
        });

      console.log(`${colors.green}✓${colors.reset} Updated Hostel ${update.hostel_id}: ${update.hostel_name} → ${update.new_value} rooms`);
    }

    console.log(`\n${colors.green}=== ✓ All updates completed! ===${colors.reset}\n`);

    // Verify updates
    console.log(`${colors.blue}Verifying...${colors.reset}\n`);

    for (const update of updates) {
      const hostel = await db('hostel_master')
        .where('hostel_id', update.hostel_id)
        .first();

      const roomCount = await db('rooms')
        .where('hostel_id', update.hostel_id)
        .count('* as count')
        .first();

      const actualRooms = parseInt(roomCount.count);
      const storedRooms = hostel.total_rooms;

      if (actualRooms === storedRooms) {
        console.log(`${colors.green}✓${colors.reset} Hostel ${update.hostel_id}: Verified (${storedRooms} rooms)`);
      } else {
        console.log(`${colors.red}✗${colors.reset} Hostel ${update.hostel_id}: MISMATCH! Stored: ${storedRooms}, Actual: ${actualRooms}`);
      }
    }

    console.log(`\n${colors.cyan}=== Summary ===${colors.reset}\n`);
    console.log(`Total hostels updated: ${colors.green}${updates.length}${colors.reset}`);
    console.log(`All hostel_master.total_rooms values now match actual room counts!`);
    console.log();

  } catch (error) {
    console.error(`\n${colors.red}✗ Error:${colors.reset}`, error.message);
    console.error(error.stack);
  } finally {
    await db.destroy();
  }
}

fixHostelRooms();
