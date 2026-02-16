const knex = require('knex');
require('dotenv').config();

const db = knex({
    client: 'mysql2',
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    }
});

async function test() {
    try {
        const columns = await db.raw('SHOW COLUMNS FROM students');
        console.log('STUDENTS COLUMNS:', JSON.stringify(columns[0], null, 2));

        const relations = await db.raw('SHOW TABLES LIKE "relations%"');
        console.log('RELATION TABLES:', JSON.stringify(relations[0], null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

test();
