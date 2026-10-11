import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });

async function seedStudents() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'college_cms',
  });

  const students = [
    { s_no: 1, roll_no: '921026205001', name: 'AARTHI S' },
    { s_no: 2, roll_no: '921026205002', name: 'ANUNITHA B' },
    { s_no: 3, roll_no: '921026205003', name: 'ARUNA DEVI M' },
    { s_no: 4, roll_no: '921026205004', name: 'CHANDRU N' },
    { s_no: 5, roll_no: '921026205005', name: 'CHITHRA DEVI M' },
    { s_no: 6, roll_no: '921026205006', name: 'DEEPA M' },
    { s_no: 7, roll_no: '921026205007', name: 'DHAKSANAA K' },
    { s_no: 8, roll_no: '921026205008', name: 'DHANUSHREE K' },
    { s_no: 9, roll_no: '921026205009', name: 'DHARSHINI S' },
    { s_no: 10, roll_no: '921026205010', name: 'DHAYANITHI P' },
    { s_no: 11, roll_no: '921026205011', name: 'GAYATHRI S' },
    { s_no: 12, roll_no: '921026205012', name: 'GOKULA KRISHNAN A M' },
    { s_no: 13, roll_no: '921026205013', name: 'GOKULJI R' },
    { s_no: 14, roll_no: '921026205014', name: 'HARINI M' },
    { s_no: 15, roll_no: '921026205015', name: 'JONALIKA E' },
    { s_no: 16, roll_no: '921026205016', name: 'KISHANTHINI S' },
    { s_no: 17, roll_no: '921026205017', name: 'MADHUNISHA C M' },
    { s_no: 18, roll_no: '921026205018', name: 'MAIYAL NESAN N' },
    { s_no: 19, roll_no: '921026205019', name: 'MEENAKSHI A' },
    { s_no: 20, roll_no: '921026205020', name: 'MITHUNA D' },
    { s_no: 21, roll_no: '921026205021', name: 'NETHRA SRI V' },
    { s_no: 22, roll_no: '921026205022', name: 'NISHANTHINI M' },
    { s_no: 23, roll_no: '921026205023', name: 'NITHISAA SREE S R' },
    { s_no: 24, roll_no: '921026205024', name: 'PANDEESWARAN A' },
    { s_no: 25, roll_no: '921026205025', name: 'PRIYADHARSHANA S' },
    { s_no: 26, roll_no: '921026205026', name: 'PRIYADHARSHINI K' },
    { s_no: 27, roll_no: '921026205027', name: 'RAMYASHREE N' },
    { s_no: 28, roll_no: '921026205028', name: 'RITHISH S' },
    { s_no: 29, roll_no: '921026205029', name: 'SADHANA J' },
    { s_no: 30, roll_no: '921026205030', name: 'SAKTHIVEL P G' },
    { s_no: 31, roll_no: '921026205031', name: 'SANDHIYASRI M' },
    { s_no: 32, roll_no: '921026205032', name: 'SANJANA J' },
    { s_no: 33, roll_no: '921026205033', name: 'SANTHOSH S G' },
    { s_no: 34, roll_no: '921026205034', name: 'SARATHADEVI K' },
    { s_no: 35, roll_no: '921026205035', name: 'SARMILA P' },
    { s_no: 36, roll_no: '921026205036', name: 'SRIRITHISH A' },
    { s_no: 37, roll_no: '921026205037', name: 'SUBASH P' },
    { s_no: 38, roll_no: '921026205038', name: 'USHA KUMARI N' },
    { s_no: 39, roll_no: '921026205039', name: 'VARUNIKAA E' }
  ];

  try {
    // Delete the dummy student we added earlier for IT
    await pool.query('DELETE FROM students WHERE id = ?', ['STU_IT_1']);
    
    // Insert the 39 actual students
    for (const stu of students) {
      const id = `STU_IT_1_${stu.s_no}`;
      await pool.query(
        `INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department)
         VALUES (?, ?, ?, ?, 'C_SH_IT_1', 'Science and Humanities')`,
        [id, stu.s_no, stu.roll_no, stu.name]
      );
    }
    
    console.log(`Successfully added all 39 students for I Year IT!`);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

seedStudents();
