import fs from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'college_cms',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

async function runSeed() {
  try {
    const seedPath = path.resolve('../database/seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    
    console.log('Running database/seed.sql...');
    await pool.query(seedSql);
    console.log('Successfully initialized database with seed.sql!');
  } catch (err) {
    console.error('Error running seed script:', err);
  } finally {
    await pool.end();
  }
}

runSeed();
