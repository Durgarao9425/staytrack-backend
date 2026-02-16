/**
 * Test the Fees API endpoint without authentication
 * This helps identify if it's an auth issue or data issue
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

async function testFeesAPI() {
  console.log(`\n${colors.cyan}=== Testing Fees API Query ===${colors.reset}\n`);

  try {
    // This is the exact query from getAllStudentsWithDues in feeController.ts
    console.log(`${colors.blue}Running the same query as /api/fees/all-students...${colors.reset}\n`);

    const students = await db('students as s')
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
      .where('s.status', 'Active');

    console.log(`${colors.green}✓ Query successful!${colors.reset}`);
    console.log(`${colors.blue}Found ${students.length} active students${colors.reset}\n`);

    // For each student, get their dues (same as controller)
    console.log(`${colors.blue}Fetching dues for each student...${colors.reset}\n`);

    const studentsWithDues = await Promise.all(
      students.map(async (student) => {
        const dues = await db('student_dues as sd')
          .leftJoin('fee_structure as fs', 'sd.fee_category_id', 'fs.fee_structure_id')
          .select(
            'sd.due_id',
            'sd.due_month',
            'sd.due_amount',
            'sd.paid_amount',
            'sd.balance_amount',
            'sd.due_date',
            'sd.is_paid',
            'sd.is_carried_forward',
            'sd.carried_from_month',
            'fs.fee_type'
          )
          .where('sd.student_id', student.student_id)
          .orderBy('sd.due_date', 'asc');

        const total_dues = dues
          .filter(d => !d.is_paid)
          .reduce((sum, d) => sum + parseFloat(d.balance_amount || 0), 0);

        const total_paid = dues
          .reduce((sum, d) => sum + parseFloat(d.paid_amount || 0), 0);

        const unpaid_dues = dues.filter(d => !d.is_paid);
        const paid_dues = dues.filter(d => d.is_paid);

        return {
          student_id: student.student_id,
          student_name: `${student.first_name} ${student.last_name || ''}`.trim(),
          phone: student.phone,
          email: student.email,
          hostel_name: student.hostel_name,
          room_number: student.room_number,
          floor_number: student.floor_number,
          monthly_rent: student.monthly_rent,
          total_dues,
          total_paid,
          unpaid_count: unpaid_dues.length,
          paid_count: paid_dues.length,
          payment_status: total_dues === 0 ? (paid_dues.length > 0 ? 'Paid' : 'No Dues') : 'Pending',
          dues: unpaid_dues,
          paid_dues: paid_dues
        };
      })
    );

    console.log(`${colors.green}✓ Successfully processed all students${colors.reset}\n`);

    // Display sample results
    console.log(`${colors.cyan}Sample Results (first 3 students):${colors.reset}\n`);
    studentsWithDues.slice(0, 3).forEach((s, i) => {
      console.log(`${i + 1}. ${colors.blue}${s.student_name}${colors.reset}`);
      console.log(`   Phone: ${s.phone || 'N/A'}`);
      console.log(`   Room: ${s.room_number || 'N/A'} | Hostel: ${s.hostel_name || 'N/A'}`);
      console.log(`   Total Dues: ₹${s.total_dues} | Status: ${s.payment_status}`);
      console.log(`   Unpaid: ${s.unpaid_count} | Paid: ${s.paid_count}`);
      console.log();
    });

    // Summary
    const totalStudents = studentsWithDues.length;
    const studentsWithDues_count = studentsWithDues.filter(s => s.total_dues > 0).length;
    const fullyPaid = studentsWithDues.filter(s => s.payment_status === 'Paid').length;
    const totalPending = studentsWithDues.reduce((sum, s) => sum + s.total_dues, 0);
    const totalCollected = studentsWithDues.reduce((sum, s) => sum + s.total_paid, 0);

    console.log(`${colors.cyan}=== Summary (What frontend should show) ===${colors.reset}\n`);
    console.log(`Total Students: ${colors.blue}${totalStudents}${colors.reset}`);
    console.log(`With Pending Dues: ${colors.red}${studentsWithDues_count}${colors.reset}`);
    console.log(`Fully Paid: ${colors.green}${fullyPaid}${colors.reset}`);
    console.log(`Pending Amount: ${colors.red}₹${totalPending}${colors.reset}`);
    console.log(`Total Collected: ${colors.green}₹${totalCollected}${colors.reset}`);
    console.log();

    console.log(`${colors.green}=== ✓ API Query Works Perfectly! ===${colors.reset}\n`);
    console.log(`${colors.yellow}If frontend still shows error, it's likely:${colors.reset}`);
    console.log(`  1. ${colors.cyan}Authentication issue${colors.reset} - Check JWT token in localStorage`);
    console.log(`  2. ${colors.cyan}CORS issue${colors.reset} - Check browser console for CORS errors`);
    console.log(`  3. ${colors.cyan}Wrong API URL${colors.reset} - Verify VITE_API_URL in frontend/.env`);
    console.log(`  4. ${colors.cyan}Browser cache${colors.reset} - Try hard refresh (Ctrl+Shift+R)`);
    console.log();

    console.log(`${colors.blue}To test with curl:${colors.reset}`);
    console.log(`${colors.cyan}curl -X GET http://localhost:8081/api/fees/all-students -H "Authorization: Bearer YOUR_TOKEN"${colors.reset}`);
    console.log();

  } catch (error) {
    console.error(`\n${colors.red}✗ Error:${colors.reset}`, error.message);
    console.error(error.stack);
  } finally {
    await db.destroy();
  }
}

testFeesAPI();
