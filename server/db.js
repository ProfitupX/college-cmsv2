import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'college_cms',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  decimalNumbers:     true,   // return DECIMAL as JS number, not string
});

// Test connection on startup
pool.getConnection()
  .then((conn) => {
    console.log('✅ MySQL connected — college_cms database ready');
    conn.release();
  })
  .catch((err) => {
    console.error('❌ MySQL connection failed:', err.message);
    console.error('   Check your .env password and that MySQL is running.');
  });

export default pool;
