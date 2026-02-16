const mysql = require('mysql2/promise');
require('dotenv').config();

async function dropRoomAllocationsTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'Hostel'
  });

  try {
    console.log('=== DROPPING ROOM_ALLOCATIONS TABLE ===\n');

    // Step 1: Verify students table has room_id and monthly_rent columns
    console.log('Step 1: Verifying students table has required columns...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'students' 
        AND COLUMN_NAME IN ('room_id', 'monthly_rent')
    `, [process.env.DB_NAME || 'Hostel']);

    if (columns.length < 2) {
      console.error('❌ Error: room_id and/or monthly_rent columns do not exist in students table!');
      console.error('Please run the migration first: backend/migrations/add_room_fields_to_students.sql');
      process.exit(1);
    }
    console.log('✓ Required columns exist\n');

    // Step 2: Verify data migration was completed
    console.log('Step 2: Verifying data migration...');
    const [verification] = await connection.query(`
      SELECT 
        (SELECT COUNT(*) FROM room_allocations WHERE is_current = 1) as active_allocations,
        (SELECT COUNT(*) FROM students WHERE status = 'Active' AND room_id IS NOT NULL) as active_students_with_rooms
    `);

    const ver = verification[0];
    console.log(`  Active allocations in room_allocations: ${ver.active_allocations}`);
    console.log(`  Active students with room_id: ${ver.active_students_with_rooms}`);

    if (ver.active_allocations !== ver.active_students_with_rooms) {
      console.error('\n❌ Warning: Data migration may not be complete!');
      console.error('Please run: backend/scripts/migrate-room-allocations-to-students.cjs first');
      console.error('\nDo you want to continue anyway? (This will drop the table regardless)');
      // In production, you might want to add a confirmation prompt here
    } else {
      console.log('  ✓ Data migration verified\n');
    }

    // Step 3: Drop foreign key constraints first (if any)
    console.log('Step 3: Dropping foreign key constraints...');
    try {
      const [constraints] = await connection.query(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'room_allocations'
          AND REFERENCED_TABLE_NAME IS NOT NULL
      `, [process.env.DB_NAME || 'Hostel']);

      for (const constraint of constraints) {
        try {
          await connection.query(`
            ALTER TABLE room_allocations
            DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}
          `);
          console.log(`  ✓ Dropped constraint: ${constraint.CONSTRAINT_NAME}`);
        } catch (error) {
          console.warn(`  ⚠️  Could not drop constraint ${constraint.CONSTRAINT_NAME}:`, error.message);
        }
      }
    } catch (error) {
      console.warn('  ⚠️  Error checking constraints:', error.message);
    }
    console.log('');

    // Step 4: Drop the table
    console.log('Step 4: Dropping room_allocations table...');
    await connection.query('DROP TABLE IF EXISTS room_allocations');
    console.log('✓ Table dropped successfully\n');

    // Step 5: Final verification
    console.log('Step 5: Verifying table was dropped...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'room_allocations'
    `, [process.env.DB_NAME || 'Hostel']);

    if (tables.length === 0) {
      console.log('✓ Table successfully removed from database\n');
    } else {
      console.error('❌ Error: Table still exists!');
      process.exit(1);
    }

    console.log('='.repeat(60));
    console.log('✅ room_allocations table dropped successfully!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Test all application features thoroughly');
    console.log('2. Verify room assignments work correctly');
    console.log('3. Check that room bed counts are accurate');

  } catch (error) {
    console.error('❌ Error dropping table:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Add confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\n⚠️  WARNING: This will permanently delete the room_allocations table!\nAre you sure you want to continue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    dropRoomAllocationsTable()
      .then(() => {
        console.log('\n✅ Drop script completed successfully!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Drop failed:', error);
        process.exit(1);
      });
  } else {
    console.log('\n❌ Operation cancelled.');
    process.exit(0);
  }
  rl.close();
});








