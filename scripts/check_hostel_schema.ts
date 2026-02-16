import db from '../src/config/database.js';

async function checkHostelSchema() {
    try {
        console.log('🔍 Checking `hostel_master` table columns...');

        // Use raw query to describe table
        const result = await db.raw('DESCRIBE hostel_master');
        const columns = result[0];

        console.log('---------------------------------------------------');
        console.log('FIELD                TYPE             NULL    KEY');
        console.log('---------------------------------------------------');

        let hasTotalFloors = false;

        columns.forEach((col: any) => {
            console.log(
                `${col.Field.padEnd(20)} ${col.Type.padEnd(16)} ${col.Null.padEnd(7)} ${col.Key}`
            );
            if (col.Field === 'total_floors') hasTotalFloors = true;
        });
        console.log('---------------------------------------------------');

        if (hasTotalFloors) {
            console.log('✅ total_floors column exists!');
        } else {
            console.error('❌ total_floors column is MISSING!');
            process.exit(1);
        }

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error checking table:', error.message);
        process.exit(1);
    }
}

checkHostelSchema();
