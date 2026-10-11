import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });

async function seedMechStudents() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'college_cms',
  });

  const students = [
    { s_no: 1, roll_no: '921026114001', name: 'AADARSH V' },
    { s_no: 2, roll_no: '921026114002', name: 'ARJUN M S' },
    { s_no: 3, roll_no: '921026114003', name: 'BALAJI KUMARN V' },
    { s_no: 4, roll_no: '921026114004', name: 'DHARSHAN A' },
    { s_no: 5, roll_no: '921026114005', name: 'GOKULAKANNAN K' },
    { s_no: 6, roll_no: '921026114006', name: 'GOWTHAM GOWSIT M' },
    { s_no: 7, roll_no: '921026114007', name: 'JANARTHAN M' },
    { s_no: 8, roll_no: '921026114008', name: 'JEEVA S' },
    { s_no: 9, roll_no: '921026114009', name: 'KABILAN K' },
    { s_no: 10, roll_no: '921026114010', name: 'KARTHI P' },
    { s_no: 11, roll_no: '921026114011', name: 'KARTHIKEYAN J' },
    { s_no: 12, roll_no: '921026114012', name: 'KESAVAN N' },
    { s_no: 13, roll_no: '921026114013', name: 'LALITH RAM N' },
    { s_no: 14, roll_no: '921026114014', name: 'LOGESH S' },
    { s_no: 15, roll_no: '921026114015', name: 'MATHANRAJ B' },
    { s_no: 16, roll_no: '921026114016', name: 'MAHESH KUMAR N' },
    { s_no: 17, roll_no: '921026114017', name: 'MATHIVATHANAN P' },
    { s_no: 18, roll_no: '921026114018', name: 'MOHAMMED SHAIFUR RAHUMAN S' },
    { s_no: 19, roll_no: '921026114019', name: 'MUTHUKOWSICK S' },
    { s_no: 20, roll_no: '921026114020', name: 'NAGARAJAPANDIAN K' },
    { s_no: 21, roll_no: '921026114021', name: 'NAVAMEERA S' },
    { s_no: 22, roll_no: '921026114022', name: 'NAVEEN KUMAR T' },
    { s_no: 23, roll_no: '921026114023', name: 'PANDI GIRI S' },
    { s_no: 24, roll_no: '921026114024', name: 'PARASURAM R' },
    { s_no: 25, roll_no: '921026114025', name: 'PRAVINKUMAR R' },
    { s_no: 26, roll_no: '921026114026', name: 'PUGALENTHI K' },
    { s_no: 27, roll_no: '921026114027', name: 'RIYAJ R' },
    { s_no: 28, roll_no: '921026114028', name: 'ROHITH S' },
    { s_no: 29, roll_no: '921026114029', name: 'SETHUPATHY S' },
    { s_no: 30, roll_no: '921026114030', name: 'SIVANESWARAN K S' },
    { s_no: 31, roll_no: '921026114031', name: 'SRIHARIHARAN M' },
    { s_no: 32, roll_no: '921026114032', name: 'SURIYAPRAKASH K' },
    { s_no: 33, roll_no: '921026114033', name: 'SURYA A' },
    { s_no: 34, roll_no: '921026114034', name: 'TEJA RATHINAVEL R' },
    { s_no: 35, roll_no: '921026114035', name: 'VIJAYARAGAVAN S' },
    { s_no: 36, roll_no: '921026114035', name: 'VIKASH A' },
    { s_no: 37, roll_no: '921026114036', name: 'VIKRUDHAA SRI K R' },
    { s_no: 38, roll_no: '921026114037', name: 'VISHAKAN M' },
    { s_no: 39, roll_no: '921026114038', name: 'VISHAL B' },
    { s_no: 40, roll_no: '921026114039', name: 'YOGESHWARAN P' }
  ];

  try {
    // Delete any previous dummy student for Mech
    await pool.query('DELETE FROM students WHERE id = ? OR roll_no = ?', ['STU_MECH_1', '26MECH001']);

    // Delete any existing students for C_SH_MECH_1 to allow clean idempotent re-run
    await pool.query('DELETE FROM students WHERE class_id = ?', ['C_SH_MECH_1']);

    const classId = 'C_SH_MECH_1';
    for (const stu of students) {
      const id = `STU_MECH_${stu.s_no}`;
      await pool.query(
        `INSERT INTO students (id, s_no, roll_no, name, class_id, department)
         VALUES (?, ?, ?, ?, ?, 'Science and Humanities')`,
        [id, stu.s_no, stu.roll_no, stu.name, classId]
      );
    }
    
    console.log(`Successfully added all ${students.length} students for I Year Mechanical!`);
  } catch (err) {
    console.error('Error seeding Mechanical students:', err);
  } finally {
    await pool.end();
  }
}

seedMechStudents();
