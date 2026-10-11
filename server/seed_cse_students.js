import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });

async function seedCSEStudents() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'college_cms',
  });

  const students = [
    { s_no: 1, roll_no: '921026104001', name: 'AARTHANA D' },
    { s_no: 2, roll_no: '921026104002', name: 'AASIS M' },
    { s_no: 3, roll_no: '921026104003', name: 'AATHIKESAN T THEVAR' },
    { s_no: 4, roll_no: '921026104004', name: 'ABINA N' },
    { s_no: 5, roll_no: '921026104005', name: 'AFRIN SANA S S' },
    { s_no: 6, roll_no: '921026104006', name: 'AKSHAYA SREE J' },
    { s_no: 7, roll_no: '921026104007', name: 'ARAVINDHAN K' },
    { s_no: 8, roll_no: '921026104008', name: 'ARUNA M' },
    { s_no: 9, roll_no: '921026104009', name: 'ATHISH VARSAN A P' },
    { s_no: 10, roll_no: '921026104010', name: 'BAVANA SRI E' },
    { s_no: 11, roll_no: '921026104011', name: 'BAVANI D' },
    { s_no: 12, roll_no: '921026104012', name: 'BHAVANA S' },
    { s_no: 13, roll_no: '921026104013', name: 'BHAVANA SRI C' },
    { s_no: 14, roll_no: '921026104014', name: 'CHAARU BALA K R' },
    { s_no: 15, roll_no: '921026104015', name: 'DEEPIKA G' },
    { s_no: 16, roll_no: '921026104016', name: 'DEEPIKA M' },
    { s_no: 17, roll_no: '921026104017', name: 'DEEPIKA P' },
    { s_no: 18, roll_no: '921026104018', name: 'DESHIKA A' },
    { s_no: 19, roll_no: '921026104019', name: 'DEVIPATHRAKALI S' },
    { s_no: 20, roll_no: '921026104020', name: 'DHANALAKSHMI M' },
    { s_no: 21, roll_no: '921026104021', name: 'DHARSHAN S' },
    { s_no: 22, roll_no: '921026104022', name: 'DHARSHIKA RAJI N' },
    { s_no: 23, roll_no: '921026104023', name: 'DHARSHINI N' },
    { s_no: 24, roll_no: '921026104024', name: 'DIVYASRI S' },
    { s_no: 25, roll_no: '921026104025', name: 'DIYA SHREE S' },
    { s_no: 26, roll_no: '921026104026', name: 'GAYATHRI M' },
    { s_no: 27, roll_no: '921026104027', name: 'GOBIKA SHREE S' },
    { s_no: 28, roll_no: '921026104028', name: 'GOPIKA P' },
    { s_no: 29, roll_no: '921026104029', name: 'HARIHARAN P R' },
    { s_no: 30, roll_no: '921026104030', name: 'HARIPRASATH B' },
    { s_no: 31, roll_no: '921026104031', name: 'HARRISH P N' },
    { s_no: 32, roll_no: '921026104032', name: 'HARSHAN S' },
    { s_no: 33, roll_no: '921026104033', name: 'HASANA HASEEN K' },
    { s_no: 34, roll_no: '921026104034', name: 'JAWAHARA SUBAHANA S' },
    { s_no: 35, roll_no: '921026104035', name: 'JEYA SRI B' },
    { s_no: 36, roll_no: '921026104036', name: 'JEYESHIREE S N' },
    { s_no: 37, roll_no: '921026104037', name: 'KALAIYARASAN A' },
    { s_no: 38, roll_no: '921026104038', name: 'KAMESHWARAN S' },
    { s_no: 39, roll_no: '921026104039', name: 'KARSHNA K S' },
    { s_no: 40, roll_no: '921026104040', name: 'KARTHICK S' },
    { s_no: 41, roll_no: '921026104041', name: 'KAVIPRIYA N' },
    { s_no: 42, roll_no: '921026104042', name: 'KAVIYA T' },
    { s_no: 43, roll_no: '921026104043', name: 'KEERTHANA K' },
    { s_no: 44, roll_no: '921026104044', name: 'KIRUBA A' },
    { s_no: 45, roll_no: '921026104045', name: 'KIRUBAA SRI K' },
    { s_no: 46, roll_no: '921026104046', name: 'MALAR P' },
    { s_no: 47, roll_no: '921026104047', name: 'MANOJ KUMAR K' },
    { s_no: 48, roll_no: '921026104048', name: 'MATHINISHA A' },
    { s_no: 49, roll_no: '921026104049', name: 'MEGADARRSHAN N' },
    { s_no: 50, roll_no: '921026104050', name: 'MURUGAPRIYA M' },
    { s_no: 51, roll_no: '921026104051', name: 'NADIN S' },
    { s_no: 52, roll_no: '921026104052', name: 'NANTHAKUMAR R' },
    { s_no: 53, roll_no: '921026104053', name: 'NEEMA SRI V' },
    { s_no: 54, roll_no: '921026104054', name: 'NEHA V' },
    { s_no: 55, roll_no: '921026104055', name: 'NESA VARSHINI S' },
    { s_no: 56, roll_no: '921026104056', name: 'NISHA M' },
    { s_no: 57, roll_no: '921026104057', name: 'NISHANTHI C J' },
    { s_no: 58, roll_no: '921026104058', name: 'NITHYA SRI S' },
    { s_no: 59, roll_no: '921026104059', name: 'NIVASHINISREE S' },
    { s_no: 60, roll_no: '921026104060', name: 'POORNI T' },
    { s_no: 61, roll_no: '921026104061', name: 'PRATHIBHA R' },
    { s_no: 62, roll_no: '921026104062', name: 'PRAVEENRAJ S' },
    { s_no: 63, roll_no: '921026104063', name: 'PRIYADHARSHINI K' },
    { s_no: 64, roll_no: '921026104064', name: 'PRIYADHARSHINI S' },
    { s_no: 65, roll_no: '921026104065', name: 'PRIYADHARSHINI V' },
    { s_no: 66, roll_no: '921026104066', name: 'PRIYATHARSHINI S' },
    { s_no: 67, roll_no: '921026104067', name: 'RUBESH S' },
    { s_no: 68, roll_no: '921026104068', name: 'SAKTHEESWARAN S' },
    { s_no: 69, roll_no: '921026104069', name: 'SAKTHI MANOHARI M' },
    { s_no: 70, roll_no: '921026104070', name: 'SANJANA R' },
    { s_no: 71, roll_no: '921026104071', name: 'SANTHOSHINI M' },
    { s_no: 72, roll_no: '921026104072', name: 'SANTHOSH KARTHICK M' },
    { s_no: 73, roll_no: '921026104073', name: 'SARITHA K' },
    { s_no: 74, roll_no: '921026104074', name: 'SHALINI S' },
    { s_no: 75, roll_no: '921026104075', name: 'SHAMRITHI V' },
    { s_no: 76, roll_no: '921026104076', name: 'SHARMILA M' },
    { s_no: 77, roll_no: '921026104077', name: 'SHIVAHARI NALAN B' },
    { s_no: 78, roll_no: '921026104078', name: 'SHIVANI M' },
    { s_no: 79, roll_no: '921026104079', name: 'SHIVANI S' },
    { s_no: 80, roll_no: '921026104080', name: 'SHIVANI S S' },
    { s_no: 81, roll_no: '921026104081', name: 'SIVASHREE R' },
    { s_no: 82, roll_no: '921026104082', name: 'SUBASRI M' },
    { s_no: 83, roll_no: '921026104083', name: 'SUDHAN T' },
    { s_no: 84, roll_no: '921026104084', name: 'SUDHIRSHNA D' },
    { s_no: 85, roll_no: '921026104085', name: 'SUMITHRA V' },
    { s_no: 86, roll_no: '921026104086', name: 'TEERTHA SREE B L' },
    { s_no: 87, roll_no: '921026104087', name: 'UMA MAHESHWARI R' },
    { s_no: 88, roll_no: '921026104088', name: 'VAISNAVI M' },
    { s_no: 89, roll_no: '921026104089', name: 'VICKNAVEL CHIRANJEEVI K' },
    { s_no: 90, roll_no: '921026104090', name: 'YAGAVI S' },
    { s_no: 91, roll_no: '921026104091', name: 'YAZHINI M' },
    { s_no: 92, roll_no: '921026104092', name: 'YOGESHWARI S' },
    { s_no: 93, roll_no: '921026104093', name: 'ZUMANA FATHIMA A' }
  ];

  try {
    // Delete all dummy students we added earlier
    const dummyIds = ['STU_CSEA_1', 'STU_IT_1', 'STU_AIDS_1', 'STU_ECE_1', 'STU_EEE_1', 'STU_MECH_1', 'STU_CIVIL_1', 'STU_CSEB_1'];
    for (const id of dummyIds) {
      await pool.query('DELETE FROM students WHERE id = ?', [id]);
    }
    console.log('Deleted all dummy students!');

    // Insert the 93 actual CSE students. Splitting at 60.
    for (const stu of students) {
      let classId = 'C_SH_CSE_A_1';
      if (stu.s_no > 60) {
        classId = 'C_SH_CSE_B_1';
      }
      
      const id = `STU_CSE_${stu.s_no}`;
      await pool.query(
        `INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department)
         VALUES (?, ?, ?, ?, ?, 'Science and Humanities')`,
        [id, stu.s_no, stu.roll_no, stu.name, classId]
      );
    }
    
    console.log('Successfully added all 93 students for I Year CSE!');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

seedCSEStudents();
