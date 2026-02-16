
import mysql from 'mysql2/promise';

const checkSchema = async () => {
    let connection;
    try {
        console.log('Connecting to port 3000...');
        connection = await mysql.createConnection({
            host: '127.0.0.1',
            port: 3000,
            user: 'root',
            password: 'Root@123',
            database: 'Hostel'
        });

        const [results] = await connection.execute("SHOW COLUMNS FROM monthly_fees WHERE Field = 'fee_date'");
        console.log('fee_date Column Details:', results);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (connection) await connection.end();
    }
};

checkSchema();
