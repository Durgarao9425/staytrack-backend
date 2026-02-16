const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateRoomAllocationsToStudents() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'Hostel'
  });

  try {
    console.log('=== MIGRATING ROOM ALLOCATIONS TO STUDENTS TABLE ===\n');

    // Step 1: Check if columns exist
    console.log('Step 1: Checking if room_id and monthly_rent columns exist...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'students' 
        AND COLUMN_NAME IN ('room_id', 'monthly_rent')
    `, [process.env.DB_NAME || 'Hostel']);

    if (columns.length < 2) {
      console.error('❌ Error: room_id and/or monthly_rent columns do not exist in students table!');
      console.error('Please run the migration: backend/migrations/add_room_fields_to_students.sql first');
      process.exit(1);
    }
    console.log('✓ Columns exist\n');

    // Step 2: Check if room_allocations table exists
    console.log('Step 2: Checking if room_allocations table exists...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'room_allocations'
    `, [process.env.DB_NAME || 'Hostel']);

    if (tables.length === 0) {
      console.log('⚠️  room_allocations table does not exist. Skipping data migration.\n');
      console.log('Checking if students already have room data...');
      const [studentsWithRooms] = await connection.query(`
        SELECT COUNT(*) as count 
        FROM students 
        WHERE room_id IS NOT NULL
      `);
      console.log(`Found ${studentsWithRooms[0].count} students with room_id already set.\n`);
      console.log('Proceeding to verification step...\n');
    } else {
      // Get all current active allocations
      console.log('Fetching current active room allocations...');
      const [activeAllocations] = await connection.query(`
        SELECT 
          ra.student_id,
          ra.room_id,
          ra.monthly_rent,
          s.status as student_status
        FROM room_allocations ra
        INNER JOIN students s ON ra.student_id = s.student_id
        WHERE ra.is_current = 1 OR (ra.is_active = 1 AND ra.check_out_date IS NULL)
      `);
      console.log(`Found ${activeAllocations.length} active allocations\n`);

      // Step 3: Migrate active allocations to students table
      console.log('Step 3: Migrating active allocations to students table...');
      let migratedCount = 0;
      let skippedCount = 0;

      for (const allocation of activeAllocations) {
        try {
          // Only migrate if student is Active
          if (allocation.student_status === 'Active') {
            await connection.query(`
              UPDATE students
              SET room_id = ?,
                  monthly_rent = ?
              WHERE student_id = ?
            `, [allocation.room_id, allocation.monthly_rent, allocation.student_id]);
            migratedCount++;
          } else {
            // Student is inactive, don't set room_id
            skippedCount++;
            console.log(`  Skipped student ${allocation.student_id} (status: ${allocation.student_status})`);
          }
        } catch (error) {
          console.error(`  Error migrating student ${allocation.student_id}:`, error.message);
        }
      }

      console.log(`✓ Migrated ${migratedCount} active allocations`);
      console.log(`  Skipped ${skippedCount} inactive students\n`);
    }

    // Step 3/4: Clear room_id for inactive students (if they have one set)
    const stepNum = tables.length === 0 ? 'Step 3' : 'Step 4';
    console.log(`${stepNum}: Clearing room_id for inactive students...`);
    const [clearResult] = await connection.query(`
      UPDATE students
      SET room_id = NULL,
          monthly_rent = NULL
      WHERE status = 'Inactive' 
        AND room_id IS NOT NULL
    `);
    console.log(`✓ Cleared room_id for ${clearResult.affectedRows} inactive students\n`);

    // Step 4/5: Verify migration
    const verifyStepNum = tables.length === 0 ? 'Step 4' : 'Step 5';
    console.log(`${verifyStepNum}: Verifying migration...`);
    const [verification] = await connection.query(`
      SELECT 
        COUNT(*) as total_students,
        COUNT(room_id) as students_with_rooms,
        COUNT(CASE WHEN status = 'Active' AND room_id IS NOT NULL THEN 1 END) as active_with_rooms,
        COUNT(CASE WHEN status = 'Inactive' AND room_id IS NOT NULL THEN 1 END) as inactive_with_rooms
      FROM students
    `);

    const stats = verification[0];
    console.log('Migration Statistics:');
    console.log(`  Total students: ${stats.total_students}`);
    console.log(`  Students with rooms: ${stats.students_with_rooms}`);
    console.log(`  Active students with rooms: ${stats.active_with_rooms}`);
    console.log(`  Inactive students with rooms: ${stats.inactive_with_rooms}`);

    if (stats.inactive_with_rooms > 0) {
      console.log(`\n⚠️  Warning: ${stats.inactive_with_rooms} inactive students still have room_id set!`);
    }

    // Step 5/6: Compare with room_allocations (if table exists)
    const compareStepNum = tables.length === 0 ? 'Step 5' : 'Step 6';
    if (tables.length > 0) {
      console.log(`\n${compareStepNum}: Comparing with room_allocations table...`);
      const [comparison] = await connection.query(`
        SELECT 
          (SELECT COUNT(*) FROM room_allocations WHERE is_current = 1 OR (is_active = 1 AND check_out_date IS NULL)) as allocations_count,
          (SELECT COUNT(*) FROM students WHERE status = 'Active' AND room_id IS NOT NULL) as students_with_rooms_count
      `);

      const comp = comparison[0];
      console.log(`  Active allocations in room_allocations: ${comp.allocations_count}`);
      console.log(`  Active students with room_id: ${comp.students_with_rooms_count}`);

      if (comp.allocations_count === comp.students_with_rooms_count) {
        console.log('  ✓ Counts match! Migration successful.\n');
      } else {
        console.log('  ⚠️  Warning: Counts do not match. Please review.\n');
      }
    } else {
      console.log(`\n${compareStepNum}: Skipping room_allocations comparison (table does not exist)\n`);
    }

    console.log('='.repeat(60));
    console.log('✅ Migration completed!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Review the migration results above');
    console.log('2. Update all backend code to use students.room_id');
    console.log('3. Test the application thoroughly');
    console.log('4. Run: backend/scripts/drop-room-allocations-table.cjs to drop the old table');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

migrateRoomAllocationsToStudents()
  .then(() => {
    console.log('\n✅ Migration script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

