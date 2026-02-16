import db from '../src/config/database.js';

/**
 * Initialize the id_proof_types master table
 * This script creates the table and inserts default ID proof types
 */
async function initializeIdProofTypes() {
  try {
    console.log('🔄 Creating id_proof_types table...');

    // Create table
    await db.raw('DROP TABLE IF EXISTS id_proof_types');
    await db.raw(`
      CREATE TABLE id_proof_types (
        id INT PRIMARY KEY AUTO_INCREMENT,
        code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        regex_pattern VARCHAR(255) NOT NULL,
        min_length INT NOT NULL,
        max_length INT NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Table created successfully');

    console.log('🔄 Inserting default ID proof types...');

    // Insert default ID proof types
    await db.raw(`
      INSERT INTO id_proof_types (code, name, regex_pattern, min_length, max_length, display_order) VALUES
      ('AADHAR', 'Aadhar Card', '^[0-9]{12}$', 12, 12, 1),
      ('PAN', 'PAN Card', '^[A-Z]{5}[0-9]{4}[A-Z]{1}$', 10, 10, 2),
      ('VOTER', 'Voter ID', '^[A-Z0-9]{10}$', 10, 10, 3),
      ('DL', 'Driving License', '^[A-Z0-9]{13,16}$', 13, 16, 4),
      ('PASSPORT', 'Passport', '^[A-Z][0-9]{7}$', 8, 8, 5)
      ON DUPLICATE KEY UPDATE display_order = VALUES(display_order)
    `);

    console.log('✅ Default ID proof types inserted successfully');

    // Verify the data
    const proofTypes = await db('id_proof_types')
      .select('id', 'code', 'name', 'display_order')
      .where({ is_active: 1 })
      .orderBy('display_order', 'asc');

    console.log('\n📋 ID Proof Types in database:');
    proofTypes.forEach((type: any) => {
      console.log(`  - ${type.name} (Code: ${type.code}, ID: ${type.id})`);
    });

    console.log('\n✨ ID Proof Types table initialization completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Initialization failed:', error.message);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      errno: error?.errno,
    });
    process.exit(1);
  }
}

initializeIdProofTypes();
