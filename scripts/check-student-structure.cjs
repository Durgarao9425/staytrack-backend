const mysql = require('mysql2/promise');

async function checkStructure() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    const [columns] = await connection.query('SHOW COLUMNS FROM students');
    console.log('Students table columns:');
    columns.forEach(col => {
      console.log(`  ${col.Field}`);
    });
  } finally {
    await connection.end();
  }
}

checkStructure();
