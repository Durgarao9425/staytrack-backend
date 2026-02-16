
import mysql from 'mysql2/promise';

const checkData = async () => {
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

        const [results] = await connection.execute("SELECT fee_id, fee_date, fee_month FROM monthly_fees LIMIT 5");
        console.log('Sample data:', results);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (connection) await connection.end();
    }
};

checkData();
