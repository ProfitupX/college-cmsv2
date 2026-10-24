import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

let pool = null;
let readyPromise = null;

export async function initPool() {
  if (pool) {
    try {
      await pool.end();
    } catch (err) {
      console.error('Error closing old pool:', err.message);
    }
  }

  dotenv.config();
  dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
  dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
  dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env.local'), override: true });

  const candidates = [
    // 1. Primary from environment variables
    {
      label: 'Environment Config',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'markhub_user',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'markhub_db',
    },
    // 2. Production College VPS database
    {
      label: 'College Production VPS',
      host: 'localhost',
      port: 3306,
      user: 'markhub_user',
      password: 'Nscet@123',
      database: 'markhub_db',
    },
    // 3. Local Development (with password)
    {
      label: 'Local Dev (sharves@2007)',
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'sharves@2007',
      database: 'college_cms',
    },
    // 4. Local Development (without password)
    {
      label: 'Local Dev (empty password)',
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'college_cms',
    },
  ];

  for (const cfg of candidates) {
    try {
      const candidatePool = mysql.createPool({
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        decimalNumbers: true,
      });

      const conn = await candidatePool.getConnection();
      conn.release();

      pool = candidatePool;
      console.log(`✅ MySQL connected (${cfg.label}) — ${cfg.database} database ready as ${cfg.user}`);
      return pool;
    } catch (err) {
      // try next candidate
    }
  }

  console.error('❌ All MySQL connection candidates failed. Please verify MySQL service status.');
  return null;
}

// Kick off connection on startup
readyPromise = initPool();

// Export proxy object so existing routes and scripts work seamlessly
const db = {
  execute: async (...args) => {
    await readyPromise;
    if (!pool) throw new Error('Database pool is not initialized');
    return pool.execute(...args);
  },
  query: async (...args) => {
    await readyPromise;
    if (!pool) throw new Error('Database pool is not initialized');
    return pool.query(...args);
  },
  getConnection: async () => {
    await readyPromise;
    if (!pool) throw new Error('Database pool is not initialized');
    return pool.getConnection();
  },
  end: async () => {
    await readyPromise;
    if (pool) return pool.end();
  },
  reconnect: () => {
    readyPromise = initPool();
    return readyPromise;
  },
  getPool: async () => {
    await readyPromise;
    return pool;
  },
};

export default db;
