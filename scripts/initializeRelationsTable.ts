import db from '../src/config/database.js';

/**
 * Initialize the relations_master table
 * This script creates the table and inserts default relations
 */
async function initializeRelationsTable() {
  try {
    console.log('🔄 Creating relations_master table...');

    // Create table
    await db.raw('DROP TABLE IF EXISTS relations_master');
    await db.raw(`
      CREATE TABLE relations_master (
        relation_id INT AUTO_INCREMENT PRIMARY KEY,
        relation_name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255),
        is_active TINYINT DEFAULT 1,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Table created successfully');

    console.log('🔄 Inserting default relations...');

    // Insert default relations
    await db.raw(`
      INSERT INTO relations_master (relation_name, display_order, description) VALUES
      ('Father', 1, 'Student\\'s father'),
      ('Mother', 2, 'Student\\'s mother'),
      ('Brother', 3, 'Student\\'s brother'),
      ('Sister', 4, 'Student\\'s sister'),
      ('Uncle', 5, 'Student\\'s uncle'),
      ('Aunt', 6, 'Student\\'s aunt'),
      ('Grandfather', 7, 'Student\\'s grandfather'),
      ('Grandmother', 8, 'Student\\'s grandmother'),
      ('Other', 9, 'Other relation')
      ON DUPLICATE KEY UPDATE display_order = VALUES(display_order)
    `);

    console.log('✅ Default relations inserted successfully');

    // Verify the data
    const relations = await db('relations_master')
      .select('relation_id', 'relation_name', 'display_order')
      .where({ is_active: 1 })
      .orderBy('display_order', 'asc');

    console.log('\n📋 Relations in database:');
    relations.forEach((rel: any) => {
      console.log(`  - ${rel.relation_name} (ID: ${rel.relation_id})`);
    });

    console.log('\n✨ Relations table initialization completed successfully!');
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

initializeRelationsTable();
