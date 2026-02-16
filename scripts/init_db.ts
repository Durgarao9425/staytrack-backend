import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSchema() {
    try {
        console.log('🔄 Initializing database from schema...');

        // Calculate path to schema file
        // __dirname is .../backend/scripts
        // We want .../database_schema.sql (which is in root, so up 2 levels)
        const schemaPath = path.resolve(__dirname, '../../database_schema.sql');

        console.log(`Checking for schema file at: ${schemaPath}`);

        if (!fs.existsSync(schemaPath)) {
            console.error(`❌ Schema file not found at: ${schemaPath}`);
            process.exit(1);
        }

        const sql = fs.readFileSync(schemaPath, 'utf8');

        // Remove comments and split by semicolon
        // We handle standard SQL comments -- and /* */
        const statements = sql
            .replace(/--.*$/gm, '') // Remove single line comments
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Found ${statements.length} SQL statements to execute.`);

        for (const stmt of statements) {
            if (!stmt) continue;

            try {
                await db.raw(stmt);
            } catch (e: any) {
                // Ignore "Table already exists" or "Duplicate entry" errors
                if (e.code === 'ER_TABLE_EXISTS_ERROR') {
                    // completely ignore
                } else if (e.code === 'ER_DUP_ENTRY') {
                    // completely ignore
                } else if (e.message.includes('already exists')) {
                    // ignore
                } else {
                    console.error(`❌ Error executing statement: ${stmt.substring(0, 50)}...`);
                    console.error(e.message);
                }
            }
        }

        console.log('\n🔍 Verifying tables...');
        const result = await db.raw('SHOW TABLES');
        // Result structure depends on driver, usually [rows, fields]
        // rows is an array of objects
        const tables = result[0].map((r: any) => Object.values(r)[0]);

        console.log('Current tables in database:');
        console.log(tables.join(', '));

        console.log('\n✅ Database initialization completed!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    }
}

runSchema();
