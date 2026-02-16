const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runMonthlyFeesMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'Hostel',
    multipleStatements: true
  });

  try {
    console.log('=== RUNNING MONTHLY FEES MIGRATION ===\n');

    // Read the SQL file
    const sqlFile = path.join(__dirname, '../migrations/create_monthly_fees_tables.sql');
    console.log(`Reading migration file: ${sqlFile}\n`);
    
    if (!fs.existsSync(sqlFile)) {
      console.error('❌ Migration file not found!');
      return;
    }

    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log('✓ Migration file loaded\n');

    // Remove comments and split by semicolons
    let cleanSql = sql
      .replace(/--.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .trim();

    // Split by semicolons and filter empty statements
    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`[${i + 1}/${statements.length}] Executing statement...`);
          console.log(`   ${statement.substring(0, 100).replace(/\n/g, ' ')}...`);
          
          await connection.query(statement + ';');
          
          console.log(`   ✓ Statement ${i + 1} executed successfully\n`);
        } catch (error) {
          // Check if error is because table/column/index already exists
          if (error.code === 'ER_DUP_FIELDNAME' || 
              error.code === 'ER_DUP_KEYNAME' || 
              error.code === 'ER_TABLE_EXISTS_ERROR' ||
              error.message.includes('already exists')) {
            console.log(`   ⚠️  Statement ${i + 1} skipped (already exists)\n`);
          } else {
            console.error(`   ❌ Error in statement ${i + 1}:`, error.message);
            console.error(`   SQL: ${statement.substring(0, 200)}\n`);
            throw error;
          }
        }
      }
    }

    // Verify tables were created
    console.log('=== VERIFYING MIGRATION ===\n');
    
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name IN ('monthly_fees', 'fee_payments', 'fee_history')
    `);

    console.log(`Found ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`  ✓ ${table.TABLE_NAME}`);
    });

    if (tables.length === 3) {
      console.log('\n✅ All tables created successfully!');
    } else {
      console.log(`\n⚠️  Expected 3 tables, found ${tables.length}`);
    }

    // Check monthly_fees table structure
    if (tables.some(t => t.TABLE_NAME === 'monthly_fees')) {
      console.log('\n=== MONTHLY_FEES TABLE STRUCTURE ===');
      const [columns] = await connection.query('DESCRIBE monthly_fees');
      console.table(columns);
    }

    console.log('\n=== MIGRATION COMPLETE ===\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMonthlyFeesMigration();








