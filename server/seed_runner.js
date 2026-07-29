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
    const csePath = path.resolve('../database/seed_cse.sql');
    const aidsPath = path.resolve('../database/seed_aids.sql');
    
    const cseSql = fs.readFileSync(csePath, 'utf8');
    const aidsSql = fs.readFileSync(aidsPath, 'utf8');
    
    console.log('Running seed_cse.sql...');
    await pool.query(cseSql);
    console.log('Successfully inserted CSE data!');
    
    console.log('Running seed_aids.sql...');
    await pool.query(aidsSql);
    console.log('Successfully inserted AI&DS data!');
    
  } catch (err) {
    console.error('Error running seed script:', err);
  } finally {
    await pool.end();
  }
}

runSeed();
