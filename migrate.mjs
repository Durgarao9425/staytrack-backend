import db from './dist/config/database.js';
import fs from 'fs';

async function runMigration() {
  try {
    console.log('🔄 Starting migration...\n');

    const sql = fs.readFileSync('migrations/add_hostel_id_to_users.sql', 'utf8');
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s.length > 5);

    for (const stmt of statements) {
      try {
        await db.raw(stmt);
        console.log('✅ Executed:', stmt.substring(0, 80).replace(/\n/g, ' ') + '...');
      } catch (e) {
        if (e.message.includes('Duplicate column')) {
          console.log('ℹ️  Column already exists, skipping...');
        } else {
          console.error('❌ Error:', e.message);
        }
      }
    }

    console.log('\n✅ Migration completed!\n');

    // Verify the changes
    const result = await db.raw(`
      SELECT u.user_id, u.username, u.email, u.hostel_id, h.hostel_name
      FROM users u
      LEFT JOIN hostel_master h ON u.hostel_id = h.hostel_id
      WHERE u.role_id = 2
    `);

    console.log('Updated Users with Hostel Links:');
    console.table(result[0]);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
