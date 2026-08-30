import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

let pool;

export function initPool() {
  if (pool) {
    pool.end().catch(err => console.error('Error closing old pool:', err));
  }
  
  dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });

  pool = mysql.createPool({
    host:               process.env.DB_HOST     || 'localhost',
    port:               parseInt(process.env.DB_PORT) || 3306,
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASSWORD || '',
    database:           process.env.DB_NAME     || 'college_cms',
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    decimalNumbers:     true,
  });

  pool.getConnection()
    .then((conn) => {
      console.log(`✅ MySQL connected — ${process.env.DB_NAME} database ready`);
      conn.release();
    })
    .catch((err) => {
      console.error('❌ MySQL connection failed:', err.message);
      console.error('   Check your .env credentials and that MySQL is running.');
    });
}

// Initialize on startup
initPool();

// Export a proxy object so existing routes (db.execute) still work seamlessly
const db = {
  execute: (...args) => pool.execute(...args),
  query: (...args) => pool.query(...args),
  getConnection: () => pool.getConnection(),
  end: () => pool.end(),
  reconnect: initPool,
};

export default db;
