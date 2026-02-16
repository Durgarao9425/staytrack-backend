import db from '../src/config/database.js';

async function checkTableColumns() {
    try {
        console.log('🔍 Checking `users` table columns...');

        // Use raw query to describe table, works in MySQL
        const result = await db.raw('DESCRIBE users');

        // Result format for DESCRIBE in mysql2/knex usually is [rows, fields]
        // rows is an array of objects describing columns
        const columns = result[0];

        console.log('---------------------------------------------------');
        console.log('FIELD                TYPE             NULL    KEY');
        console.log('---------------------------------------------------');

        columns.forEach((col: any) => {
            console.log(
                `${col.Field.padEnd(20)} ${col.Type.padEnd(16)} ${col.Null.padEnd(7)} ${col.Key}`
            );
        });
        console.log('---------------------------------------------------');

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error checking table:', error.message);
        process.exit(1);
    }
}

checkTableColumns();
