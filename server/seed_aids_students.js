import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });

async function seedAIDSStudents() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'college_cms',
  });

  const students = [
    { s_no: 1, roll_no: '921026243001', name: 'AARTHI M' },
    { s_no: 2, roll_no: '921026243002', name: 'AKSHAYA V' },
    { s_no: 3, roll_no: '921026243003', name: 'ASMITHA R' },
    { s_no: 4, roll_no: '921026243004', name: 'BARATH M' },
    { s_no: 5, roll_no: '921026243005', name: 'BEENAMOLE R' },
    { s_no: 6, roll_no: '921026243006', name: 'DHANYASRI G' },
    { s_no: 7, roll_no: '921026243007', name: 'DHARSHINI S' },
    { s_no: 8, roll_no: '921026243008', name: 'GAYASHREE B' },
    { s_no: 9, roll_no: '921026243009', name: 'HARI PREETHI V' },
    { s_no: 10, roll_no: '921026243010', name: 'HARSHITHA S' },
    { s_no: 11, roll_no: '921026243011', name: 'HAWISHA R' },
    { s_no: 12, roll_no: '921026243012', name: 'HEMALATHA K' },
    { s_no: 13, roll_no: '921026243013', name: 'ISHWARIYA R' },
    { s_no: 14, roll_no: '921026243014', name: 'JANA B' },
    { s_no: 15, roll_no: '921026243015', name: 'JANU CINTRALA E' },
    { s_no: 16, roll_no: '921026243016', name: 'JEEVANA G' },
    { s_no: 17, roll_no: '921026243017', name: 'JEGADHEES RAJA J M' },
    { s_no: 18, roll_no: '921026243018', name: 'JENITHA KUMARI T' },
    { s_no: 19, roll_no: '921026243019', name: 'JEYA SURYA N' },
    { s_no: 20, roll_no: '921026243020', name: 'KALAISELVI J' },
    { s_no: 21, roll_no: '921026243021', name: 'KALANITHI MARAN.K' },
    { s_no: 22, roll_no: '921026243022', name: 'KANEESHAR S' },
    { s_no: 23, roll_no: '921026243023', name: 'KARISHMA M' },
    { s_no: 24, roll_no: '921026243024', name: 'KARISHMA P' },
    { s_no: 25, roll_no: '921026243025', name: 'KARTHICKRAJA M' },
    { s_no: 26, roll_no: '921026243026', name: 'KARTHISSRI S' },
    { s_no: 27, roll_no: '921026243027', name: 'KARUN SURIYA P S' },
    { s_no: 28, roll_no: '921026243028', name: 'KIRUTHIKA M' },
    { s_no: 29, roll_no: '921026243029', name: 'KISHOR S' },
    { s_no: 30, roll_no: '921026243030', name: 'MADHU NISHA R' },
    { s_no: 31, roll_no: '921026243031', name: 'MAHALAXMI K' },
    { s_no: 32, roll_no: '921026243032', name: 'MAREESHWARI S' },
    { s_no: 33, roll_no: '921026243033', name: 'MATHUBALA M' },
    { s_no: 34, roll_no: '921026243034', name: 'MUTHUKRISHNAN S' },
    { s_no: 35, roll_no: '921026243035', name: 'PARAMESWARI M' },
    { s_no: 36, roll_no: '921026243036', name: 'PONKARTHIKA K' },
    { s_no: 37, roll_no: '921026243037', name: 'PRATHISHA R' },
    { s_no: 38, roll_no: '921026243038', name: 'PRAVEEN G' },
    { s_no: 39, roll_no: '921026243039', name: 'PREETHIKA R' },
    { s_no: 40, roll_no: '921026243040', name: 'RAVINA P' },
    { s_no: 41, roll_no: '921026243041', name: 'RITHEESH M' },
    { s_no: 42, roll_no: '921026243042', name: 'SAKTHIVEL M' },
    { s_no: 43, roll_no: '921026243043', name: 'SANMUGA PRIYAN R' },
    { s_no: 44, roll_no: '921026243044', name: 'SRISANJAISARAN P' },
    { s_no: 45, roll_no: '921026243045', name: 'SUBASRI V' },
    { s_no: 46, roll_no: '921026243046', name: 'THASLEEMA PARVEEN T' },
    { s_no: 47, roll_no: '921026243047', name: 'UMA B' },
    { s_no: 48, roll_no: '921026243048', name: 'VISHALINI M' },
    { s_no: 49, roll_no: '921026243049', name: 'YUVANESH V' }
  ];

  try {
    // Delete the dummy student we added earlier for AI&DS
    await pool.query('DELETE FROM students WHERE id = ?', ['STU_AIDS_1']);
    
    // Insert the 49 actual students
    for (const stu of students) {
      const id = `STU_AIDS_1_${stu.s_no}`;
      await pool.query(
        `INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department)
         VALUES (?, ?, ?, ?, 'C_SH_AIDS_1', 'Science and Humanities')`,
        [id, stu.s_no, stu.roll_no, stu.name]
      );
    }
    
    console.log(`Successfully added all 49 students for I Year AI & DS!`);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

seedAIDSStudents();
