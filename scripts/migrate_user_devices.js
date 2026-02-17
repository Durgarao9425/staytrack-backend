import db from '../src/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
    try {
        const migrationPath = path.join(__dirname, '..', 'migrations', 'recreate_user_devices.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Split SQL by semicolons, but be careful with comments and strings
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Found ${statements.length} SQL statements to run...`);

        for (const statement of statements) {
            await db.raw(statement);
        }

        console.log('✅ user_devices table created successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error running migration:', error);
        process.exit(1);
    }
};

runMigration();
