import db from './src/config/database.js';
import fs from 'fs';
import path from 'path';

const runMissingMigrations = async () => {
    try {
        const migrationPath = path.join(process.cwd(), 'migrations', 'create_monthly_fees_tables.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Split SQL by semicolons, but be careful with comments and strings
        // A simple split is usually enough for these migration files
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Found ${statements.length} SQL statements to run...`);

        for (const statement of statements) {
            await db.raw(statement);
        }

        console.log('✅ Missing tables created successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error running migrations:', error);
        process.exit(1);
    }
};

runMissingMigrations();
