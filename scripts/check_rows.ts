
import db from '../src/config/database.js';

async function checkRows() {
    try {
        const studentsRes = await db.raw('DESCRIBE students');
        console.log('Students Table Columns:', studentsRes[0].map(c => c.Field));

        process.exit(0);
    } catch (error) {
        console.error('Error checking schema:', error);
        process.exit(1);
    }
}

checkRows();
