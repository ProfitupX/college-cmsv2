import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });

async function seedCivilStudents() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'college_cms',
  });

  const students = [
    { s_no: 1, roll_no: '921026103001', name: 'AATHILA S' },
    { s_no: 2, roll_no: '921026103002', name: 'AFREEN HIDAYAH H' },
    { s_no: 3, roll_no: '921026103003', name: 'ASADHULLAH K' },
    { s_no: 4, roll_no: '921026103004', name: 'FASILA FARHANA S' },
    { s_no: 5, roll_no: '921026103005', name: 'HARISH M' },
    { s_no: 6, roll_no: '921026103006', name: 'HASAANA BANU P' },
    { s_no: 7, roll_no: '921026103007', name: 'IDHAYA S' },
    { s_no: 8, roll_no: '921026103008', name: 'JANANI M' },
    { s_no: 9, roll_no: '921026103009', name: 'JANUSUTHAN S' },
    { s_no: 10, roll_no: '921026103010', name: 'KALI DHARSHINI A' },
    { s_no: 11, roll_no: '921026103011', name: 'KISHORE ANAND S' },
    { s_no: 12, roll_no: '921026103012', name: 'LATHIKA SRI K' },
    { s_no: 13, roll_no: '921026103013', name: 'MENAGA SRI P' },
    { s_no: 14, roll_no: '921026103014', name: 'NAVEEN ARASU D' },
    { s_no: 15, roll_no: '921026103015', name: 'NIRMALSASTHA K' },
    { s_no: 16, roll_no: '921026103016', name: 'NITHIYANANTHAN S' },
    { s_no: 17, roll_no: '921026103017', name: 'PANDISAMY B' },
    { s_no: 18, roll_no: '921026103018', name: 'POORNIMA DEVI S' },
    { s_no: 19, roll_no: '921026103019', name: 'PRANAVIJA R P' },
    { s_no: 20, roll_no: '921026103020', name: 'PRENISHA S' },
    { s_no: 21, roll_no: '921026103021', name: 'SACHIN S R' },
    { s_no: 22, roll_no: '921026103022', name: 'SANDHIYA.S' },
    { s_no: 23, roll_no: '921026103023', name: 'SANTHOSH M' },
    { s_no: 24, roll_no: '921026103024', name: 'SATHITHYASRI J' },
    { s_no: 25, roll_no: '921026103025', name: 'SHAKEEL P' },
    { s_no: 26, roll_no: '921026103026', name: 'SHANMUGAPRIYA R' },
    { s_no: 27, roll_no: '921026103027', name: 'SHANMUGHAM A' },
    { s_no: 28, roll_no: '921026103028', name: 'SIBINATH B' },
    { s_no: 29, roll_no: '921026103029', name: 'SOWBARNIKA S' },
    { s_no: 30, roll_no: '921026103030', name: 'SREE SARIKA S' },
    { s_no: 31, roll_no: '921026103031', name: 'THANYA SRI R M' },
    { s_no: 32, roll_no: '921026103032', name: 'THARANI M' },
    { s_no: 33, roll_no: '921026103033', name: 'VINEESH M' },
    { s_no: 34, roll_no: '921026103034', name: 'VISHAL K' },
    { s_no: 35, roll_no: '921026103035', name: 'VISHALBALA S' },
    { s_no: 36, roll_no: '921026103036', name: 'YUGA SREE M K' }
  ];

  try {
    // Insert the 36 actual Civil students.
    for (const stu of students) {
      const classId = 'C_SH_CIVIL_1';
      const id = `STU_CIVIL_${stu.s_no}`;
      await pool.query(
        `INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department)
         VALUES (?, ?, ?, ?, ?, 'Science and Humanities')`,
        [id, stu.s_no, stu.roll_no, stu.name, classId]
      );
    }
    
    console.log('Successfully added all 36 students for I Year Civil!');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

seedCivilStudents();
