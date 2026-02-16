import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'Hostel',
  },
});

async function diagnose() {
  console.log('='.repeat(60));
  console.log('FEE MODULE DIAGNOSTICS');
  console.log('='.repeat(60));

  try {
    // 1. Check database connection
    console.log('\n[1] Testing database connection...');
    await db.raw('SELECT 1');
    console.log('✅ Database connected successfully');

    // 2. Check students table
    console.log('\n[2] Checking students table...');
    const students = await db('students').select('*');
    console.log(`   Total students in DB: ${students.length}`);

    const activeStudents = await db('students').where('status', 'Active').select('*');
    console.log(`   Active students: ${activeStudents.length}`);

    if (students.length === 0) {
      console.log('   ⚠️  WARNING: No students found in database!');
    } else {
      console.log('\n   Sample student data:');
      students.slice(0, 3).forEach((s, i) => {
        console.log(`   ${i + 1}. ID: ${s.student_id}, Name: ${s.first_name} ${s.last_name}, Status: ${s.status}, Hostel: ${s.hostel_id}`);
      });
    }

    // 3. Check student_dues table
    console.log('\n[3] Checking student_dues table...');
    const dues = await db('student_dues').select('*');
    console.log(`   Total dues records: ${dues.length}`);

    const unpaidDues = await db('student_dues').where('is_paid', 0).select('*');
    console.log(`   Unpaid dues: ${unpaidDues.length}`);

    // 4. Check fee_structure table
    console.log('\n[4] Checking fee_structure table...');
    const feeCategories = await db('fee_structure').select('*');
    console.log(`   Total fee categories: ${feeCategories.length}`);

    const activeFeeCategories = await db('fee_structure').where('is_active', 1).select('*');
    console.log(`   Active fee categories: ${activeFeeCategories.length}`);

    if (feeCategories.length > 0) {
      console.log('\n   Fee categories:');
      feeCategories.forEach((fc, i) => {
        console.log(`   ${i + 1}. ${fc.fee_type} - ₹${fc.amount} (${fc.frequency}) - Hostel: ${fc.hostel_id} - Active: ${fc.is_active}`);
      });
    } else {
      console.log('   ⚠️  WARNING: No fee categories found!');
    }

    // 5. Check room_allocations
    console.log('\n[5] Checking room_allocations...');
    const allocations = await db('room_allocations').select('*');
    console.log(`   Total room allocations: ${allocations.length}`);

    const activeAllocations = await db('room_allocations').where('is_active', 1).select('*');
    console.log(`   Active allocations: ${activeAllocations.length}`);

    // 6. Check hostel_master
    console.log('\n[6] Checking hostel_master...');
    const hostels = await db('hostel_master').select('*');
    console.log(`   Total hostels: ${hostels.length}`);

    if (hostels.length > 0) {
      console.log('\n   Hostels:');
      hostels.forEach((h, i) => {
        console.log(`   ${i + 1}. ID: ${h.hostel_id}, Name: ${h.hostel_name}, Active: ${h.is_active}`);
      });
    }

    // 7. Check required columns in student_dues
    console.log('\n[7] Checking student_dues table structure...');
    const columns = await db.raw(`
      SHOW COLUMNS FROM student_dues
    `);

    const columnNames = columns[0].map(c => c.Field);
    console.log(`   Columns: ${columnNames.join(', ')}`);

    const requiredColumns = ['fee_category_id', 'is_carried_forward', 'carried_from_month', 'paid_date'];
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));

    if (missingColumns.length > 0) {
      console.log(`\n   ❌ MISSING COLUMNS: ${missingColumns.join(', ')}`);
      console.log('   💡 Run migration: node scripts/apply-migration.js');
    } else {
      console.log('   ✅ All required columns present');
    }

    // 8. Test the API query
    console.log('\n[8] Testing the exact API query...');
    try {
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
        .where('s.status', 'Active');

      console.log(`   ✅ API query successful - Found ${studentsWithDues.length} active students`);

      if (studentsWithDues.length > 0) {
        console.log('\n   Sample query result:');
        studentsWithDues.slice(0, 2).forEach((s, i) => {
          console.log(`   ${i + 1}. ${s.first_name} ${s.last_name} - Room: ${s.room_number || 'N/A'} - Hostel: ${s.hostel_name || 'N/A'}`);
        });
      }
    } catch (error) {
      console.log(`   ❌ API query failed: ${error.message}`);
    }

    // 9. Summary
    console.log('\n' + '='.repeat(60));
    console.log('DIAGNOSIS SUMMARY');
    console.log('='.repeat(60));

    const issues = [];
    if (students.length === 0) issues.push('No students in database');
    if (feeCategories.length === 0) issues.push('No fee categories configured');
    if (missingColumns.length > 0) issues.push('Missing database columns - migration needed');
    if (activeStudents.length === 0 && students.length > 0) issues.push('No active students');

    if (issues.length === 0) {
      console.log('✅ No critical issues found!');
      console.log('\nPossible causes for "Failed to fetch data":');
      console.log('  1. Frontend not connected to correct API URL');
      console.log('  2. CORS issues');
      console.log('  3. Authentication token missing or invalid');
      console.log('  4. Check browser console for detailed error');
    } else {
      console.log('❌ Issues found:');
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    }

    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error during diagnosis:', error.message);
    console.error(error.stack);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

diagnose();
