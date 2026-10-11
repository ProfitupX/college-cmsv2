import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });

async function seedEeeStudents() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'college_cms',
  });

  const students = [
    { s_no: 1, roll_no: '921026105001', name: 'ASWITHA BANU H' },
    { s_no: 2, roll_no: '921026105002', name: 'CHINNASAKTHI M' },
    { s_no: 3, roll_no: '921026105003', name: 'DEEPA M' },
    { s_no: 4, roll_no: '921026105004', name: 'DEVISRI G' },
    { s_no: 5, roll_no: '921026105005', name: 'DHIVYADHARSHINI P' },
    { s_no: 6, roll_no: '921026105006', name: 'ELAMARAN B' },
    { s_no: 7, roll_no: '921026105007', name: 'HARIJITH M' },
    { s_no: 8, roll_no: '921026105008', name: 'KAVIYA A' },
    { s_no: 9, roll_no: '921026105009', name: 'KIRUTHIKA K' },
    { s_no: 10, roll_no: '921026105010', name: 'LATHIGA SHREE R' },
    { s_no: 11, roll_no: '921026105011', name: 'LOGA PRIYA M' },
    { s_no: 12, roll_no: '921026105012', name: 'MADHESH K' },
    { s_no: 13, roll_no: '921026105013', name: 'MEGA P' },
    { s_no: 14, roll_no: '921026105014', name: 'MITHUL M' },
    { s_no: 15, roll_no: '921026105015', name: 'NAVAJEEVAN A' },
    { s_no: 16, roll_no: '921026105016', name: 'POORNIMADEVI S' },
    { s_no: 17, roll_no: '921026105017', name: 'RENUGA T' },
    { s_no: 18, roll_no: '921026105018', name: 'SIVANANDHINI E' },
    { s_no: 19, roll_no: '921026105019', name: 'SREEKANTH M K' },
    { s_no: 20, roll_no: '921026105020', name: 'SURESKANNAN A' },
    { s_no: 21, roll_no: '921026105021', name: 'VEERALAKSHMI D' },
    { s_no: 22, roll_no: '921026105022', name: 'VIJAYALAKSHMI P' },
    { s_no: 23, roll_no: '921026105023', name: 'YOGASRI V' }
  ];

  try {
    // Delete any previous dummy student for EEE
    await pool.query('DELETE FROM students WHERE id = ? OR roll_no = ?', ['STU_EEE_1', '26EEE001']);

    // Delete any existing students for C_SH_EEE_1 to allow clean idempotent re-run
    await pool.query('DELETE FROM students WHERE class_id = ?', ['C_SH_EEE_1']);

    const classId = 'C_SH_EEE_1';
    for (const stu of students) {
      const id = `STU_EEE_${stu.s_no}`;
      await pool.query(
        `INSERT INTO students (id, s_no, roll_no, name, class_id, department)
         VALUES (?, ?, ?, ?, ?, 'Science and Humanities')`,
        [id, stu.s_no, stu.roll_no, stu.name, classId]
      );
    }
    
    console.log(`Successfully added all ${students.length} students for I Year EEE!`);
  } catch (err) {
    console.error('Error seeding EEE students:', err);
  } finally {
    await pool.end();
  }
}

seedEeeStudents();
