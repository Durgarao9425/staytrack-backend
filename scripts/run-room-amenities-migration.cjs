const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runRoomAmenitiesMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'Hostel',
    multipleStatements: true
  });

  try {
    console.log('=== RUNNING ROOM AMENITIES MIGRATION ===\n');
    console.log('Migration: create_room_amenities_master.sql\n');

    // Read the SQL file
    const sqlFile = path.join(__dirname, '../migrations/create_room_amenities_master.sql');
    
    if (!fs.existsSync(sqlFile)) {
      console.error('❌ Migration file not found:', sqlFile);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Remove comments and split by semicolons
    let cleanSql = sql
      .replace(/--.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments

    // Split by semicolons and filter empty statements
    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.toLowerCase().includes('verification'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await connection.query(statement);
          console.log(`✓ Statement ${i + 1} executed successfully\n`);
        } catch (error) {
          // Check if error is because table/index already exists
          if (error.code === 'ER_TABLE_EXISTS_ERROR' || 
              error.code === 'ER_DUP_KEYNAME' || 
              error.code === 'ER_DUP_ENTRY') {
            console.log(`⚠️  Statement ${i + 1} skipped (already exists): ${error.message}\n`);
          } else {
            throw error;
          }
        }
      }
    }

    // Verify table was created
    console.log('Verifying migration...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'room_amenities_master'
    `, [process.env.DB_NAME || 'Hostel']);

    if (tables.length > 0) {
      console.log('✓ Table room_amenities_master created successfully\n');
      
      // Check amenities count
      const [amenities] = await connection.query(`
        SELECT COUNT(*) as count FROM room_amenities_master WHERE is_active = TRUE
      `);
      
      console.log(`✓ Found ${amenities[0].count} active amenities in the table\n`);
      
      // Show all amenities
      const [allAmenities] = await connection.query(`
        SELECT amenity_id, amenity_name, display_order 
        FROM room_amenities_master 
        ORDER BY display_order
      `);
      
      console.log('Amenities in table:');
      allAmenities.forEach(amenity => {
        console.log(`  ${amenity.amenity_id}. ${amenity.amenity_name} (Order: ${amenity.display_order})`);
      });
    } else {
      console.error('❌ Migration incomplete. Table room_amenities_master not found.');
      process.exit(1);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Room Amenities Migration completed successfully!');
    console.log('='.repeat(60));
    console.log('\nYou can now add more amenities directly to the room_amenities_master table.');

  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    console.error(error);
    throw error;
  } finally {
    await connection.end();
  }
}

runRoomAmenitiesMigration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

