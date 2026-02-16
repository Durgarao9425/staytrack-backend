import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables for database
const validateDatabaseConfig = () => {
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please set these variables before starting the server');
    process.exit(1);
  }
};

validateDatabaseConfig();

export const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    ...(process.env.DB_SOCKET_PATH ? { socketPath: process.env.DB_SOCKET_PATH } : {}),
  },
  pool: {
    min: 5,
    max: 20,
  },
  acquireConnectionTimeout: 30000,
});

// Test database connection
db.raw('SELECT 1')
  .then(() => {
    console.log('✅ Database connected successfully');
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });

export default db;
