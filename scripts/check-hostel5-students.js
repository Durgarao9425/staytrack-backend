/**
 * Check Students for Hostel ID = 5
 * Verify why fee page shows wrong student count
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

async function checkHostel5Students() {
  console.log(`\n${colors.cyan}=== Hostel 5 Students Analysis ===${colors.reset}\n`);

  try {
    // 1. Check hostel 5 details
    console.log(`${colors.blue}[1] Hostel 5 Details:${colors.reset}\n`);

    const hostel5 = await db('hostel_master')
      .where('hostel_id', 5)
      .first();

    if (!hostel5) {
      console.log(`${colors.red}✗ Hostel 5 not found!${colors.reset}\n`);
      return;
    }

    console.log(`Hostel Name: ${colors.cyan}${hostel5.hostel_name}${colors.reset}`);
    console.log(`Owner ID: ${hostel5.owner_id}`);
    console.log(`Is Active: ${hostel5.is_active ? 'Yes' : 'No'}`);
    console.log();

    // 2. Check ALL students in database
    console.log(`${colors.blue}[2] All Students in Database:${colors.reset}\n`);

    const allStudents = await db('students').select('*');
    console.log(`Total students in database: ${colors.blue}${allStudents.length}${colors.reset}\n`);

    // Group by hostel_id
    const studentsByHostel = {};
    allStudents.forEach(s => {
      if (!studentsByHostel[s.hostel_id]) {
        studentsByHostel[s.hostel_id] = [];
      }
      studentsByHostel[s.hostel_id].push(s);
    });

    console.log(`${colors.cyan}Students grouped by hostel:${colors.reset}`);
    Object.keys(studentsByHostel).sort().forEach(hostelId => {
      const students = studentsByHostel[hostelId];
      const activeCount = students.filter(s => s.status === 'Active').length;
      const icon = hostelId === '5' ? colors.green + '→' : ' ';
      console.log(`${icon} Hostel ${hostelId}: ${students.length} total (${activeCount} active)${colors.reset}`);
    });
    console.log();

    // 3. Students specifically in hostel 5
    console.log(`${colors.blue}[3] Students in Hostel 5:${colors.reset}\n`);

    const hostel5Students = await db('students')
      .where('hostel_id', 5)
      .select('*');

    console.log(`Total students in Hostel 5: ${colors.green}${hostel5Students.length}${colors.reset}\n`);

    if (hostel5Students.length > 0) {
      console.log(`${colors.cyan}Student List:${colors.reset}`);
      hostel5Students.forEach((s, i) => {
        const status = s.status === 'Active' ? colors.green + 'Active' : colors.red + 'Inactive';
        console.log(`${i + 1}. ${colors.cyan}${s.first_name} ${s.last_name}${colors.reset}`);
        console.log(`   ID: ${s.student_id} | Status: ${status}${colors.reset}`);
        console.log(`   Phone: ${s.phone || 'N/A'} | Email: ${s.email || 'N/A'}`);
        console.log();
      });
    } else {
      console.log(`${colors.yellow}⚠ No students found for Hostel 5${colors.reset}\n`);
    }

    // 4. Active students in hostel 5
    const activeStudents5 = hostel5Students.filter(s => s.status === 'Active');
    console.log(`${colors.blue}Active students in Hostel 5: ${colors.green}${activeStudents5.length}${colors.reset}\n`);

    // 5. Check the exact API query that the fee page uses
    console.log(`${colors.blue}[4] Testing Fee API Query for Hostel 5:${colors.reset}\n`);

    const studentsWithDues = await db('students as s')
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
        's.email',
        's.hostel_id',
        's.floor_number',
        'h.hostel_name',
        'r.room_number',
        'ra.monthly_rent'
      )
      .where('s.status', 'Active')
      .where('s.hostel_id', 5); // Filter by hostel 5

    console.log(`${colors.cyan}Query Result (Hostel 5 only):${colors.reset}`);
    console.log(`Students returned: ${colors.green}${studentsWithDues.length}${colors.reset}\n`);

    if (studentsWithDues.length > 0) {
      console.log(`${colors.cyan}Students that should appear on fee page:${colors.reset}`);
      studentsWithDues.forEach((s, i) => {
        console.log(`${i + 1}. ${s.first_name} ${s.last_name}`);
        console.log(`   Room: ${s.room_number || 'Not allocated'} | Hostel: ${s.hostel_name}`);
        console.log(`   Phone: ${s.phone || 'N/A'}`);
        console.log();
      });
    }

    // 6. Check without hostel filter (what API might be returning)
    console.log(`${colors.blue}[5] Testing Query WITHOUT Hostel Filter:${colors.reset}\n`);

    const allActiveStudents = await db('students as s')
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
        's.hostel_id',
        'h.hostel_name'
      )
      .where('s.status', 'Active');

    console.log(`${colors.yellow}All active students (no filter): ${allActiveStudents.length}${colors.reset}\n`);

    // Group by hostel
    const byHostel = {};
    allActiveStudents.forEach(s => {
      if (!byHostel[s.hostel_id]) {
        byHostel[s.hostel_id] = [];
      }
      byHostel[s.hostel_id].push(s);
    });

    console.log(`${colors.cyan}Breakdown by hostel:${colors.reset}`);
    Object.keys(byHostel).sort().forEach(hostelId => {
      const students = byHostel[hostelId];
      const icon = hostelId === '5' ? colors.green + '→' : ' ';
      const hostelName = students[0].hostel_name || 'Unknown';
      console.log(`${icon} Hostel ${hostelId} (${hostelName}): ${colors.blue}${students.length}${colors.reset} students${colors.reset}`);
    });
    console.log();

    // 7. Check user and owner relationship
    console.log(`${colors.blue}[6] Checking Owner Authentication:${colors.reset}\n`);

    const users = await db('users').select('*');
    console.log(`Total users: ${users.length}\n`);

    const owners = users.filter(u => u.role_id === 2);
    console.log(`${colors.cyan}Hostel Owners:${colors.reset}`);

    for (const owner of owners) {
      const ownedHostels = await db('hostel_master')
        .where('owner_id', owner.user_id)
        .select('hostel_id', 'hostel_name');

      console.log(`\nUser ID ${owner.user_id}: ${owner.username} (${owner.email})`);
      console.log(`Role: Owner (role_id = 2)`);
      console.log(`Owns ${ownedHostels.length} hostel(s):`);
      ownedHostels.forEach(h => {
        const indicator = h.hostel_id === 5 ? colors.green + ' ← HOSTEL 5' : '';
        console.log(`  - Hostel ${h.hostel_id}: ${h.hostel_name}${indicator}${colors.reset}`);
      });
    }
    console.log();

    // 8. Summary
    console.log(`${colors.cyan}=== SUMMARY ===${colors.reset}\n`);
    console.log(`${colors.yellow}Expected Behavior:${colors.reset}`);
    console.log(`  - If logged in as Hostel 5 owner → Should see ${colors.green}${studentsWithDues.length} students${colors.reset}`);
    console.log(`  - If logged in as Admin → Should see all ${allActiveStudents.length} students`);
    console.log();

    console.log(`${colors.yellow}Current Issue:${colors.reset}`);
    console.log(`  - Fee page showing: ${colors.red}15 students${colors.reset}`);
    console.log(`  - Should show for Hostel 5: ${colors.green}${studentsWithDues.length} students${colors.reset}`);
    console.log();

    if (allActiveStudents.length === 15) {
      console.log(`${colors.red}⚠ PROBLEM IDENTIFIED:${colors.reset}`);
      console.log(`  The API is returning ALL active students (15) instead of filtering by hostel!`);
      console.log(`  ${colors.cyan}Likely cause:${colors.reset} User authentication not properly filtering by hostel_id`);
      console.log();
    }

    console.log(`${colors.cyan}Next Steps:${colors.reset}`);
    console.log(`  1. Check which user you're logged in as`);
    console.log(`  2. Verify JWT token contains correct user_id and role_id`);
    console.log(`  3. Check if feeController.ts properly filters by hostel ownership`);
    console.log();

  } catch (error) {
    console.error(`\n${colors.red}✗ Error:${colors.reset}`, error.message);
    console.error(error.stack);
  } finally {
    await db.destroy();
  }
}

checkHostel5Students();
