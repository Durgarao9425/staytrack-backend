
import db from '../src/config/database.js';

async function checkSchema() {
    try {
        const studentsColumns = await db('students').columnInfo();
        console.log('Students Table Columns:', Object.keys(studentsColumns));

        const roomsColumns = await db('rooms').columnInfo();
        console.log('Rooms Table Columns:', Object.keys(roomsColumns));

        process.exit(0);
    } catch (error) {
        console.error('Error checking schema:', error);
        process.exit(1);
    }
}

checkSchema();
