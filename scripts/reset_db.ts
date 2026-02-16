import db from '../src/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetDatabase() {
    try {
        console.log('⚠️  WARNING: This will DROP all tables and reset the database.');
        console.log('🔄 Dropping all tables...');

        // Disable foreign key checks to allow dropping tables in any order
        await db.raw('SET FOREIGN_KEY_CHECKS = 0');

        const [tables] = await db.raw('SHOW TABLES');
        const tableNames = tables.map((t: any) => Object.values(t)[0]);

        if (tableNames.length === 0) {
            console.log('ℹ️  No tables found to drop.');
        } else {
            for (const tableName of tableNames) {
                console.log(`   Dropping table: ${tableName}`);
                await db.raw(`DROP TABLE IF EXISTS \`${tableName}\``);
            }
        }

        await db.raw('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✅ All tables dropped.');

        // Now run the schema initialization
        console.log('🔄 Re-initializing database from schema...');

        const schemaPath = path.resolve(__dirname, '../../database_schema.sql');
        if (!fs.existsSync(schemaPath)) {
            console.error(`❌ Schema file not found at: ${schemaPath}`);
            process.exit(1);
        }

        const sql = fs.readFileSync(schemaPath, 'utf8');
        const statements = sql
            .replace(/--.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Found ${statements.length} SQL statements to execute.`);

        for (const stmt of statements) {
            if (!stmt) continue;
            try {
                await db.raw(stmt);
            } catch (e: any) {
                console.error(`❌ Error executing statement: ${stmt.substring(0, 50)}...`);
                console.error(e.message);
            }
        }

        console.log('\n✅ Database reset and initialized successfully!');
        process.exit(0);

    } catch (err: any) {
        console.error('❌ Fatal error:', err.message);
        process.exit(1);
    }
}

resetDatabase();
