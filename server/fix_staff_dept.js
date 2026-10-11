import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });

async function fixStaffDepartments() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'college_cms',
  });

  try {
    const [staffs] = await pool.query(`SELECT id, designation FROM staffs WHERE employee_id LIKE 'SH0%'`);
    
    for (const staff of staffs) {
      let dept = 'Science and Humanities';
      const desig = (staff.designation || '').toUpperCase();
      
      if (desig.includes('CSE')) dept = 'Computer Science and Engineering';
      else if (desig.includes('MECH')) dept = 'Mechanical Engineering';
      else if (desig.includes('ECE')) dept = 'Electronics and Communication Engineering';
      else if (desig.includes('IT')) dept = 'Information Technology';
      else if (desig.includes('EEE')) dept = 'Electrical and Electronics Engineering';
      else if (desig.includes('AI') || desig.includes('DS')) dept = 'Artificial Intelligence and Data Science';
      else if (desig.includes('CIVIL')) dept = 'Civil Engineering';

      await pool.query('UPDATE staffs SET department = ? WHERE id = ?', [dept, staff.id]);
    }
    console.log('Successfully updated staff departments based on their designations!');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

fixStaffDepartments();
