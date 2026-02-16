import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
};

async function testConnection() {
    console.log('Testing MySQL connection with config:', { ...config, password: '****' });

    try {
        const connection = await mysql.createConnection(config);
        console.log('✅ Connection successful!');

        // Check if database exists
        const [rows] = await connection.query(`SHOW DATABASES LIKE '${process.env.DB_NAME}'`);
        if ((rows as any[]).length === 0) {
            console.log(`ℹ️  Database '${process.env.DB_NAME}' does not exist. Creating it...`);
            await connection.query(`CREATE DATABASE \`${process.env.DB_NAME}\``);
            console.log(`✅ Database '${process.env.DB_NAME}' created.`);
        } else {
            console.log(`✅ Database '${process.env.DB_NAME}' already exists.`);
        }

        await connection.end();
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Connection failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('   Verify hostname and port are correct.');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('   Verify username and password are correct.');
        }
        process.exit(1);
    }
}

testConnection();
