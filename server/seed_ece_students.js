import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });

async function seedEceStudents() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'college_cms',
  });

  const students = [
    { s_no: 1, roll_no: '921026106001', name: 'AATHISH KANNA S A' },
    { s_no: 2, roll_no: '921026106002', name: 'ABINAYAA DEVI P' },
    { s_no: 3, roll_no: '921026106003', name: 'ADRIKA S' },
    { s_no: 4, roll_no: '921026106004', name: 'ARCHANA J' },
    { s_no: 5, roll_no: '921026106005', name: 'AVINASH B' },
    { s_no: 6, roll_no: '921026106006', name: 'BAVANITHA M' },
    { s_no: 7, roll_no: '921026106007', name: 'DEEPARANJANI R' },
    { s_no: 8, roll_no: '921026106008', name: 'DEVI S' },
    { s_no: 9, roll_no: '921026106009', name: 'DHARSHINI M' },
    { s_no: 10, roll_no: '921026106010', name: 'DIVYALAKSHMI N' },
    { s_no: 11, roll_no: '921026106011', name: 'ELAKIYA J' },
    { s_no: 12, roll_no: '921026106012', name: 'ESAKKI SUBATHRAM M' },
    { s_no: 13, roll_no: '921026106013', name: 'GOKUL KANTH A B' },
    { s_no: 14, roll_no: '921026106014', name: 'GOKULNATH S' },
    { s_no: 15, roll_no: '921026106015', name: 'GOWSIK M' },
    { s_no: 16, roll_no: '921026106016', name: 'GOWSITHIKA M' },
    { s_no: 17, roll_no: '921026106017', name: 'GURU PRASATH K' },
    { s_no: 18, roll_no: '921026106018', name: 'HARINI P' },
    { s_no: 19, roll_no: '921026106019', name: 'HARISH M (25.10.2007)' },
    { s_no: 20, roll_no: '921026106020', name: 'HARISH M (27.08.2008)' },
    { s_no: 21, roll_no: '921026106021', name: 'JEEVITHA R' },
    { s_no: 22, roll_no: '921026106022', name: 'JELSIYA GLADISH J' },
    { s_no: 23, roll_no: '921026106023', name: 'KAMALESH M' },
    { s_no: 24, roll_no: '921026106024', name: 'KANISHKA M' },
    { s_no: 25, roll_no: '921026106025', name: 'KARAN S' },
    { s_no: 26, roll_no: '921026106026', name: 'KAUSHIK RAJ P' },
    { s_no: 27, roll_no: '921026106027', name: 'KEERTHANA P' },
    { s_no: 28, roll_no: '921026106028', name: 'KEVIN JOE S' },
    { s_no: 29, roll_no: '921026106029', name: 'MAHIMA SHREE A' },
    { s_no: 30, roll_no: '921026106030', name: 'MATHAN A' },
    { s_no: 31, roll_no: '921026106031', name: 'MOHAMED AHMED A' },
    { s_no: 32, roll_no: '921026106032', name: 'MONIKASRI A' },
    { s_no: 33, roll_no: '921026106033', name: 'NAGALAKSHMI P' },
    { s_no: 34, roll_no: '921026106034', name: 'NIKKISHA R' },
    { s_no: 35, roll_no: '921026106035', name: 'NIVETHITHA J' },
    { s_no: 36, roll_no: '921026106036', name: 'PANDISELVAN S' },
    { s_no: 37, roll_no: '921026106037', name: 'PAVITHRA R' },
    { s_no: 38, roll_no: '921026106038', name: 'PUVITHA SRI S' },
    { s_no: 39, roll_no: '921026106039', name: 'RAGHUL C' },
    { s_no: 40, roll_no: '921026106040', name: 'SANTHOSH B' },
    { s_no: 41, roll_no: '921026106041', name: 'SARAVANA RAM A' },
    { s_no: 42, roll_no: '921026106042', name: 'SASMEERA P' },
    { s_no: 43, roll_no: '921026106043', name: 'SELVA VISHALI J' },
    { s_no: 44, roll_no: '921026106044', name: 'SHARMILARANI M' },
    { s_no: 45, roll_no: '921026106045', name: 'SHREE NISHA M' },
    { s_no: 46, roll_no: '921026106046', name: 'SINDHU K' },
    { s_no: 47, roll_no: '921026106047', name: 'SIVAPERUMAL A' },
    { s_no: 48, roll_no: '921026106048', name: 'SRI HARINI C' },
    { s_no: 49, roll_no: '921026106049', name: 'SUJITHA V' },
    { s_no: 50, roll_no: '921026106050', name: 'THAMOTHARAN P' },
    { s_no: 51, roll_no: '921026106051', name: 'VISHALINI M' },
    { s_no: 52, roll_no: '921026106052', name: 'YAZHINI SHREE V' }
  ];

  try {
    // Delete any previous dummy student for ECE
    await pool.query('DELETE FROM students WHERE id = ? OR roll_no = ?', ['STU_ECE_1', '26ECE001']);

    // Delete any existing students for C_SH_ECE_1 to allow clean idempotent re-run
    await pool.query('DELETE FROM students WHERE class_id = ?', ['C_SH_ECE_1']);

    const classId = 'C_SH_ECE_1';
    for (const stu of students) {
      const id = `STU_ECE_${stu.s_no}`;
      await pool.query(
        `INSERT INTO students (id, s_no, roll_no, name, class_id, department)
         VALUES (?, ?, ?, ?, ?, 'Science and Humanities')`,
        [id, stu.s_no, stu.roll_no, stu.name, classId]
      );
    }
    
    console.log(`Successfully added all ${students.length} students for I Year ECE!`);
  } catch (err) {
    console.error('Error seeding ECE students:', err);
  } finally {
    await pool.end();
  }
}

seedEceStudents();
