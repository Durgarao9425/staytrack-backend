/**
 * Verify Owner Students - Show breakdown of what owner sees
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

async function verifyOwnerStudents() {
  console.log(`\n${colors.cyan}=== Owner Students Breakdown ===${colors.reset}\n`);

  try {
    // Get owner with user_id = 2
    const owner = await db('users').where('user_id', 2).first();

    if (!owner) {
      console.log(`${colors.red}Owner with user_id = 2 not found!${colors.reset}\n`);
      return;
    }

    console.log(`${colors.blue}Owner Details:${colors.reset}`);
    console.log(`User ID: ${owner.user_id}`);
    console.log(`Username: ${colors.cyan}${owner.username}${colors.reset}`);
    console.log(`Email: ${owner.email}`);
    console.log(`Role: ${owner.role_id === 2 ? 'Hostel Owner' : 'Other'}`);
    console.log();

    // Get hostels owned by this user
    const ownerHostels = await db('hostel_master')
      .where({ owner_id: owner.user_id })
      .select('hostel_id', 'hostel_name', 'is_active');

    console.log(`${colors.blue}Hostels Owned by ${owner.username}:${colors.reset}`);
    console.log(`Total: ${colors.green}${ownerHostels.length}${colors.reset} hostels\n`);

    const hostelIds = ownerHostels.map(h => h.hostel_id);

    ownerHostels.forEach((h, i) => {
      const activeStatus = h.is_active ? colors.green + 'Active' : colors.yellow + 'Inactive';
      console.log(`${i + 1}. Hostel ${h.hostel_id}: ${colors.cyan}${h.hostel_name}${colors.reset} - ${activeStatus}${colors.reset}`);
    });
    console.log();

    // Get all active students for these hostels
    const studentsQuery = await db('students as s')
      .leftJoin('hostel_master as h', 's.hostel_id', 'h.hostel_id')
      .leftJoin('room_allocations as ra', function() {
        this.on('s.student_id', '=', 'ra.student_id')
          .andOn('ra.is_active', '=', db.raw('1'));
      })
      .leftJoin('rooms as r', 'ra.room_id', 'r.room_id')
      .select(
        's.student_id',
        's.first_name',
        's.last_name',
        's.phone',
        's.hostel_id',
        'h.hostel_name',
        'r.room_number'
      )
      .where('s.status', 'Active')
      .whereIn('s.hostel_id', hostelIds);

    console.log(`${colors.blue}Students in Owner's Hostels:${colors.reset}`);
    console.log(`Total: ${colors.green}${studentsQuery.length}${colors.reset} students (with room allocations)\n`);

    // Group by hostel
    const byHostel = {};
    studentsQuery.forEach(s => {
      if (!byHostel[s.hostel_id]) {
        byHostel[s.hostel_id] = [];
      }
      byHostel[s.hostel_id].push(s);
    });

    console.log(`${colors.cyan}Breakdown by hostel:${colors.reset}\n`);

    ownerHostels.forEach(h => {
      const students = byHostel[h.hostel_id] || [];
      const uniqueStudents = [...new Set(students.map(s => s.student_id))];

      console.log(`${colors.cyan}${h.hostel_name}${colors.reset} (Hostel ${h.hostel_id}):`);
      console.log(`  Unique students: ${colors.blue}${uniqueStudents.length}${colors.reset}`);
      console.log(`  Total allocations: ${students.length}`);

      if (students.length > 0) {
        // Show unique students
        const seen = new Set();
        students.forEach(s => {
          if (!seen.has(s.student_id)) {
            seen.add(s.student_id);
            console.log(`  - ${s.first_name} ${s.last_name} (${s.phone || 'No phone'})`);
          }
        });
      }
      console.log();
    });

    // Count unique students across all hostels
    const allStudentIds = new Set(studentsQuery.map(s => s.student_id));
    const uniqueCount = allStudentIds.size;

    console.log(`${colors.cyan}=== SUMMARY ===${colors.reset}\n`);
    console.log(`Owner: ${colors.cyan}${owner.username}${colors.reset} (User ID: ${owner.user_id})`);
    console.log(`Owns: ${colors.blue}${ownerHostels.length}${colors.reset} hostels (IDs: ${hostelIds.join(', ')})`);
    console.log(`Total unique students: ${colors.green}${uniqueCount}${colors.reset}`);
    console.log(`Total allocations: ${studentsQuery.length} (some students have multiple rooms)`);
    console.log();

    console.log(`${colors.yellow}What the Fee Page Shows:${colors.reset}`);
    console.log(`  - The API returns students from ALL ${ownerHostels.length} hostels owned by this user`);
    console.log(`  - Hostel 1: ~10 students`);
    console.log(`  - Hostel 3: ~0 students (no rooms)`);
    console.log(`  - Hostel 5: ~3 students (5 allocations due to duplicates)`);
    console.log(`  - Total shown: ${colors.red}15 students${colors.reset} (actually ${uniqueCount} unique)`);
    console.log();

    console.log(`${colors.cyan}To Show ONLY Hostel 5:${colors.reset}`);
    console.log(`  Option 1: Add hostel selector dropdown in the frontend`);
    console.log(`  Option 2: Frontend should pass ?hostelId=5 in API request`);
    console.log(`  Option 3: Show all but group by hostel with filters`);
    console.log();

  } catch (error) {
    console.error(`\n${colors.red}✗ Error:${colors.reset}`, error.message);
    console.error(error.stack);
  } finally {
    await db.destroy();
  }
}

verifyOwnerStudents();
