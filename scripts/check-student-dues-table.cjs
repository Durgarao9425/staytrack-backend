const mysql = require('mysql2/promise');

async function checkStudentDuesTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mahi@0712',
    database: 'Hostel'
  });

  try {
    // Get table structure
    const [columns] = await connection.query('DESCRIBE student_dues');

    console.log('=== STUDENT_DUES TABLE STRUCTURE ===\n');
    console.log('Total Columns:', columns.length);
    console.log('\nColumn Details:\n');

    columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col.Field}`);
      console.log(`   Type: ${col.Type}`);
      console.log(`   Null: ${col.Null}`);
      console.log(`   Key: ${col.Key || 'None'}`);
      console.log(`   Default: ${col.Default || 'NULL'}`);
      console.log(`   Extra: ${col.Extra || 'None'}`);
      console.log('');
    });

    // Get row count
    const [countResult] = await connection.query('SELECT COUNT(*) as total FROM student_dues');
    console.log('Total Rows in Table:', countResult[0].total);

    // Get sample data
    console.log('\n=== SAMPLE DATA (First 3 rows) ===\n');
    const [sampleData] = await connection.query('SELECT * FROM student_dues LIMIT 3');

    if (sampleData.length > 0) {
      sampleData.forEach((row, index) => {
        console.log(`\nRow ${index + 1}:`);
        Object.keys(row).forEach(key => {
          console.log(`  ${key}: ${row[key]}`);
        });
      });
    } else {
      console.log('No data found in table');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkStudentDuesTable();
