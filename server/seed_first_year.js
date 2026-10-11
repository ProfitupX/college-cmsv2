import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'college_cms',
  });

  try {
    console.log('Seeding First Year Data...');

    const staffs = [
      { id: 'S_CHITRA', name: 'Dr.C.Chithra', short_name: 'CC', designation: 'Prof./Maths', role: 'hod', email: 'c.chithra@example.com', employee_id: 'SH001', department: 'Science and Humanities' },
      { id: 'S_SHANMUGA', name: 'Mrs.N.Shanmuga Priya', short_name: 'NSP', designation: 'TF/Maths', role: 'class_coordinator', email: 'shanmuga@example.com', employee_id: 'SH002', department: 'Science and Humanities' },
      { id: 'S_MALAR', name: 'Dr.P.Malarvizhi', short_name: 'PM', designation: 'AP/Eng', role: 'faculty', email: 'malarvizhi@example.com', employee_id: 'SH003', department: 'Science and Humanities' },
      { id: 'S_THISHA', name: 'Mrs.N.Thisha', short_name: 'NT', designation: 'AP/Tamil', role: 'class_coordinator', email: 'thisha@example.com', employee_id: 'SH004', department: 'Science and Humanities' },
      { id: 'S_DIANA', name: 'Dr.P.Diana', short_name: 'PD', designation: 'AP/Phy', role: 'class_coordinator', email: 'diana@example.com', employee_id: 'SH005', department: 'Science and Humanities' },
      { id: 'S_SRINITHI', name: 'Dr.S.Srinithi', short_name: 'SS', designation: 'AP/Chem', role: 'faculty', email: 'srinithi@example.com', employee_id: 'SH006', department: 'Science and Humanities' },
      { id: 'S_MATHALAI', name: 'Dr.J.Mathalai Raj', short_name: 'JMR', designation: 'HoD/CSE', role: 'faculty', email: 'mathalai@example.com', employee_id: 'SH007', department: 'Science and Humanities' },
      { id: 'S_RATHIMALA', name: 'Mrs.T.Rathimala', short_name: 'TR', designation: 'AP/CSE', role: 'faculty', email: 'rathimala@example.com', employee_id: 'SH008', department: 'Science and Humanities' },
      { id: 'S_SIVAGANESAN', name: 'Mr.V.Sivaganesan', short_name: 'VS', designation: 'AP/Mech', role: 'faculty', email: 'sivaganesan@example.com', employee_id: 'SH009', department: 'Science and Humanities' },
      { id: 'S_KALAIVANI', name: 'Mrs.S.Kalaivani', short_name: 'SK', designation: 'AP/ECE', role: 'faculty', email: 'kalaivani@example.com', employee_id: 'SH010', department: 'Science and Humanities' },
      { id: 'S_VAYALSAMY', name: 'Mr.M.Vayalsamy', short_name: 'MV', designation: 'PD', role: 'faculty', email: 'vayalsamy@example.com', employee_id: 'SH011', department: 'Science and Humanities' },
      { id: 'S_AMUTHAVALLI', name: 'Mrs.K.Amuthavalli', short_name: 'KA', designation: 'TF/Maths', role: 'class_coordinator', email: 'amuthavalli@example.com', employee_id: 'SH012', department: 'Science and Humanities' },
      { id: 'S_RICHARD', name: 'Mr.R.C.Richard Britto', short_name: 'RB', designation: 'AP/Eng', role: 'faculty', email: 'richard@example.com', employee_id: 'SH013', department: 'Science and Humanities' },
      { id: 'S_ANTO', name: 'Dr.P.Anto Christy', short_name: 'PAC', designation: 'AP/Phy', role: 'class_coordinator', email: 'anto@example.com', employee_id: 'SH014', department: 'Science and Humanities' },
      { id: 'S_DAVID', name: 'Dr.N.David Mathan', short_name: 'DM', designation: 'ASP/Chem', role: 'faculty', email: 'david@example.com', employee_id: 'SH015', department: 'Science and Humanities' },
      { id: 'S_KESAVA', name: 'Mr.N.Kesavamoorthy', short_name: 'NK', designation: 'AP/IT', role: 'faculty', email: 'kesava@example.com', employee_id: 'SH016', department: 'Science and Humanities' },
      { id: 'S_UDHAYA', name: 'Mr.R.Udhaya Kumar', short_name: 'UK', designation: 'AP/IT', role: 'faculty', email: 'udhaya@example.com', employee_id: 'SH017', department: 'Science and Humanities' },
      { id: 'S_NAGARAJAN', name: 'Dr.B.Nagarajan', short_name: 'BN', designation: 'AP/Mech', role: 'faculty', email: 'nagarajan@example.com', employee_id: 'SH018', department: 'Science and Humanities' },
      { id: 'S_RAJESHSHREE', name: 'Mrs.S.Rajeshshree', short_name: 'SR', designation: 'AP/ECE', role: 'faculty', email: 'rajeshshree@example.com', employee_id: 'SH019', department: 'Science and Humanities' },
      { id: 'S_BHUVANESHWARI', name: 'Ms.R.Bhuvaneshwari', short_name: 'RB', designation: 'TF/Phy', role: 'faculty', email: 'bhuvaneshwari@example.com', employee_id: 'SH020', department: 'Science and Humanities' },
      { id: 'S_PANDIAMMAL', name: 'Ms.P.Pandiammal', short_name: 'PP', designation: 'PD', role: 'faculty', email: 'pandiammal@example.com', employee_id: 'SH021', department: 'Science and Humanities' },
      { id: 'S_MURU', name: 'Mr.M.Murugan', short_name: 'MM', designation: 'AP/Maths', role: 'faculty', email: 'murugan@example.com', employee_id: 'SH022', department: 'Science and Humanities' },
      { id: 'S_AMIRTHA', name: 'Ms.D.I.Amirtha', short_name: 'DA', designation: 'TF/Eng', role: 'class_coordinator', email: 'amirtha@example.com', employee_id: 'SH023', department: 'Science and Humanities' },
      { id: 'S_KRISHNA', name: 'Dr.S.R.Krishnamoorthi', short_name: 'SRK', designation: 'ASP/Phy', role: 'faculty', email: 'krishna@example.com', employee_id: 'SH024', department: 'Science and Humanities' },
      { id: 'S_SARAVANA', name: 'Dr.R.Saravana Kumar', short_name: 'RSK', designation: 'AP/Chem', role: 'faculty', email: 'saravana@example.com', employee_id: 'SH025', department: 'Science and Humanities' },
      { id: 'S_PAVITHRA', name: 'Mrs.M.Pavithra', short_name: 'MP', designation: 'AP/AI&DS', role: 'faculty', email: 'pavithra@example.com', employee_id: 'SH026', department: 'Science and Humanities' },
      { id: 'S_VINOTH', name: 'Mr.J.Vinoth Kumar', short_name: 'VK', designation: 'AP/AI&DS', role: 'faculty', email: 'vinoth@example.com', employee_id: 'SH027', department: 'Science and Humanities' },
      { id: 'S_ARUN', name: 'Mr.G.Arun Kumar', short_name: 'AK', designation: 'AP/Mech', role: 'faculty', email: 'arun@example.com', employee_id: 'SH028', department: 'Science and Humanities' },
      { id: 'S_CHITRA2', name: 'Mrs.R.Chitra', short_name: 'RC', designation: 'AP/EEE', role: 'faculty', email: 'r.chitra@example.com', employee_id: 'SH029', department: 'Science and Humanities' },
      { id: 'S_GEETHA', name: 'Mrs.P.Geetha', short_name: 'PG', designation: 'TF/Maths', role: 'faculty', email: 'geetha@example.com', employee_id: 'SH030', department: 'Science and Humanities' },
      { id: 'S_SUBATHAMANI', name: 'Mrs.T.Subathamani', short_name: 'TS', designation: 'AP/Eng', role: 'faculty', email: 'subathamani@example.com', employee_id: 'SH031', department: 'Science and Humanities' },
      { id: 'S_BHARATHI', name: 'Mr.K.Bharathikannan', short_name: 'KB', designation: 'AP/ECE', role: 'faculty', email: 'bharathi@example.com', employee_id: 'SH032', department: 'Science and Humanities' },
      { id: 'S_ABINAYA', name: 'Ms.B.Abinaya', short_name: 'BA', designation: 'TF/Chem', role: 'faculty', email: 'abinaya@example.com', employee_id: 'SH033', department: 'Science and Humanities' },
      { id: 'S_JENIFER', name: 'Mrs.K.Jenifer', short_name: 'KJ', designation: 'AP/AI&DS', role: 'faculty', email: 'jenifer@example.com', employee_id: 'SH034', department: 'Science and Humanities' },
      { id: 'S_HARIKISHORE', name: 'Mr.S.Harikishore', short_name: 'SH', designation: 'AP/Mech', role: 'faculty', email: 'harikishore@example.com', employee_id: 'SH035', department: 'Science and Humanities' },
      { id: 'S_PONNAIAH', name: 'Mr.M.Ponnaiah', short_name: 'MP', designation: 'PD', role: 'faculty', email: 'ponnaiah@example.com', employee_id: 'SH036', department: 'Science and Humanities' },
      { id: 'S_RAJAKARTHICK', name: 'Mr.R.Raja Karthick', short_name: 'RK', designation: 'AP/EEE', role: 'faculty', email: 'rajakarthick@example.com', employee_id: 'SH037', department: 'Science and Humanities' },
      { id: 'S_CHAKRAVARTHY', name: 'Mr.J.Chakravarthy Samy Durai', short_name: 'CD', designation: 'AP/Mech', role: 'faculty', email: 'chakravarthy@example.com', employee_id: 'SH038', department: 'Science and Humanities' },
      { id: 'S_NISHETHA', name: 'Mrs.A.Nishetha Jeflin Nixon', short_name: 'NJ', designation: 'AP/EEE', role: 'faculty', email: 'nishetha@example.com', employee_id: 'SH039', department: 'Science and Humanities' },
      { id: 'S_VEMBATHU', name: 'Dr.A.Vembathurajesh', short_name: 'AV', designation: 'HoD/S & H', role: 'faculty', email: 'vembathu@example.com', employee_id: 'SH040', department: 'Science and Humanities' },
      { id: 'S_SURULIMANI', name: 'Mr.P.Surulimani', short_name: 'PS', designation: 'AP/Mech', role: 'faculty', email: 'surulimani@example.com', employee_id: 'SH041', department: 'Science and Humanities' },
      { id: 'S_JURIYA', name: 'Mrs.H. Juriya Banu', short_name: 'JB', designation: 'AP/EEE', role: 'faculty', email: 'juriya@example.com', employee_id: 'SH042', department: 'Science and Humanities' },
      { id: 'S_BENITA', name: 'Mrs.K.Benita Merlin Isabella', short_name: 'BM', designation: 'AP/Civil', role: 'faculty', email: 'benita@example.com', employee_id: 'SH043', department: 'Science and Humanities' },
      { id: 'S_BHAVANI', name: 'Mrs.M.Bhavani', short_name: 'MB', designation: 'AP/IT', role: 'faculty', email: 'bhavani@example.com', employee_id: 'SH044', department: 'Science and Humanities' },
      { id: 'S_SHIVA', name: 'Mr.C.Shiva', short_name: 'CS', designation: 'AP/EEE', role: 'faculty', email: 'shiva@example.com', employee_id: 'SH045', department: 'Science and Humanities' },
      { id: 'S_VALARMATHI', name: 'Dr.R.Valarmathi', short_name: 'RV', designation: 'AP/Eng', role: 'faculty', email: 'valarmathi@example.com', employee_id: 'SH046', department: 'Science and Humanities' },
      { id: 'S_NAVEENKARTHICK', name: 'Mr.G.R.Naveenkarthick', short_name: 'GN', designation: 'AP/IT', role: 'faculty', email: 'naveenkarthick@example.com', employee_id: 'SH047', department: 'Science and Humanities' },
      { id: 'S_MAREESWARI', name: 'Mrs.M.Mareeswari', short_name: 'MM', designation: 'AP/IT', role: 'faculty', email: 'mareeswari@example.com', employee_id: 'SH048', department: 'Science and Humanities' },
      { id: 'S_VENNIMALAI', name: 'Dr.A.Vennimalai Rajan', short_name: 'VR', designation: 'AP/Mech', role: 'faculty', email: 'vennimalai@example.com', employee_id: 'SH049', department: 'Science and Humanities' },
      { id: 'S_GOWTHAMI', name: 'Mrs.P.Gowthami', short_name: 'PG', designation: 'AP/ECE', role: 'faculty', email: 'gowthami@example.com', employee_id: 'SH050', department: 'Science and Humanities' }
    ];

    for (const st of staffs) {
      await pool.query(
        `INSERT IGNORE INTO staffs (id, name, short_name, designation, role, email, employee_id, password, department) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'faculty123', ?)`,
        [st.id, st.name, st.short_name, st.designation, st.role, st.email, st.employee_id, st.department]
      );
    }
    console.log('Inserted Staffs');

    const classes = [
      { id: 'C_SH_CSE_A_1', name: 'I Year CSE A', department: 'Science and Humanities', semester: 1, year_label: 'I', section: 'A', room_no: 'Class Room 25', batch: '2026-2030', class_coordinator: 'Mrs.N.Shanmuga Priya TF/Maths' },
      { id: 'C_SH_IT_1', name: 'I Year IT', department: 'Science and Humanities', semester: 1, year_label: 'I', section: 'A', room_no: 'Class Room 21', batch: '2026-2030', class_coordinator: 'Mrs.K.Amuthavalli TF/Maths' },
      { id: 'C_SH_AIDS_1', name: 'I Year AI & DS', department: 'Science and Humanities', semester: 1, year_label: 'I', section: 'A', room_no: 'Class Room 23', batch: '2026-2030', class_coordinator: 'Ms.D.I.Amirtha,TF/Eng' },
      { id: 'C_SH_ECE_1', name: 'I Year ECE', department: 'Science and Humanities', semester: 1, year_label: 'I', section: 'A', room_no: 'Class Room 22', batch: '2026-2030', class_coordinator: 'Dr.P.Anto Christy, AP/Phy' },
      { id: 'C_SH_EEE_1', name: 'I Year EEE', department: 'Science and Humanities', semester: 1, year_label: 'I', section: 'A', room_no: 'Class Room 21', batch: '2026-2030', class_coordinator: 'Mrs.K.Amuthavalli, TF/Maths' },
      { id: 'C_SH_MECH_1', name: 'I Year Mech', department: 'Science and Humanities', semester: 1, year_label: 'I', section: 'A', room_no: 'Mechanical Class room', batch: '2026-2030', class_coordinator: 'Mrs.N.Thisha, AP/Tamil' },
      { id: 'C_SH_CIVIL_1', name: 'I Year Civil', department: 'Science and Humanities', semester: 1, year_label: 'I', section: 'A', room_no: 'Drawing Hall', batch: '2026-2030', class_coordinator: 'Dr.P.Diana, AP/Phy' },
      { id: 'C_SH_CSE_B_1', name: 'I Year CSE B', department: 'Science and Humanities', semester: 1, year_label: 'I', section: 'B', room_no: 'Class Room 24', batch: '2026-2030', class_coordinator: 'Mrs.M.Geetha TF/Maths' },
    ];

    for (const cl of classes) {
      await pool.query(
        `INSERT IGNORE INTO classes (id, name, department, semester, year_label, section, room_no, batch, academic_year, class_coordinator)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, '2026-2027', ?)`,
        [cl.id, cl.name, cl.department, cl.semester, cl.year_label, cl.section, cl.room_no, cl.batch, cl.class_coordinator]
      );
    }
    console.log('Inserted Classes');

    const subjects = [
      // CSE A
      { id: 'SUB_MA25C01_CSEA', code: 'MA25C01', name: 'Applied Calculus', type: 'Theory', class_id: 'C_SH_CSE_A_1', faculty_id: 'S_SHANMUGA', acr: 'AC', total: 5 },
      { id: 'SUB_EN25C01_CSEA', code: 'EN25C01', name: 'English Essentials - I', type: 'Theory', class_id: 'C_SH_CSE_A_1', faculty_id: 'S_MALAR', acr: 'EE-I', total: 2 },
      { id: 'SUB_UC25H01_CSEA', code: 'UC25H01', name: 'Heritage of Tamils', type: 'Theory', class_id: 'C_SH_CSE_A_1', faculty_id: 'S_THISHA', acr: 'HT-I', total: 2 },
      { id: 'SUB_PH25C01_CSEA', code: 'PH25C01', name: 'Applied Physics - I', type: 'Theory Cum Lab', class_id: 'C_SH_CSE_A_1', faculty_id: 'S_DIANA', acr: 'AP-I', total: 3 },
      { id: 'SUB_CY25C01_CSEA', code: 'CY25C01', name: 'Applied Chemistry - I', type: 'Theory Cum Lab', class_id: 'C_SH_CSE_A_1', faculty_id: 'S_SRINITHI', acr: 'AC-I', total: 3 },
      { id: 'SUB_CS25C01_CSEA', code: 'CS25C01', name: 'Computer Programming: C', type: 'Theory Cum Lab', class_id: 'C_SH_CSE_A_1', faculty_id: 'S_MATHALAI', acr: 'CP: C', total: 4 },
      { id: 'SUB_CS25C03_CSEA', code: 'CS25C03', name: 'Essentials of Computing', type: 'Theory Cum Lab', class_id: 'C_SH_CSE_A_1', faculty_id: 'S_RATHIMALA', acr: 'EC', total: 4 },
      { id: 'SUB_ME25C16_CSEA', code: 'ME25C16', name: 'Makerspace: Group A - Mechanical', type: 'Practical', class_id: 'C_SH_CSE_A_1', faculty_id: 'S_SIVAGANESAN', acr: 'MS(Mech)', total: 4 },
      { id: 'SUB_UC25A01_CSEA', code: 'UC25A01', name: 'Life Skills for Engineering - I', type: 'Practical', class_id: 'C_SH_CSE_A_1', faculty_id: 'S_MALAR', acr: 'LSE-I', total: 3 },
      { id: 'SUB_UC25A02_CSEA', code: 'UC25A02', name: 'Physical Education - I', type: 'Practical', class_id: 'C_SH_CSE_A_1', faculty_id: 'S_VAYALSAMY', acr: 'PE-I', total: 4 },

      // IT
      { id: 'SUB_MA25C01_IT', code: 'MA25C01', name: 'Applied Calculus', type: 'Theory', class_id: 'C_SH_IT_1', faculty_id: 'S_AMUTHAVALLI', acr: 'AC', total: 5 },
      { id: 'SUB_EN25C01_IT', code: 'EN25C01', name: 'English Essentials - I', type: 'Theory', class_id: 'C_SH_IT_1', faculty_id: 'S_RICHARD', acr: 'EE-I', total: 2 },
      { id: 'SUB_UC25H01_IT', code: 'UC25H01', name: 'Heritage of Tamils', type: 'Theory', class_id: 'C_SH_IT_1', faculty_id: 'S_THISHA', acr: 'HT-I', total: 1 },
      { id: 'SUB_PH25C01_IT', code: 'PH25C01', name: 'Applied Physics - I', type: 'Theory Cum Lab', class_id: 'C_SH_IT_1', faculty_id: 'S_ANTO', acr: 'AP-I', total: 3 },
      { id: 'SUB_CY25C01_IT', code: 'CY25C01', name: 'Applied Chemistry - I', type: 'Theory Cum Lab', class_id: 'C_SH_IT_1', faculty_id: 'S_DAVID', acr: 'AC-I', total: 4 },
      { id: 'SUB_CS25C01_IT', code: 'CS25C01', name: 'Computer Programming: C', type: 'Theory Cum Lab', class_id: 'C_SH_IT_1', faculty_id: 'S_KESAVA', acr: 'CP: C', total: 4 },
      { id: 'SUB_CS25C03_IT', code: 'CS25C03', name: 'Essentials of Computing', type: 'Theory Cum Lab', class_id: 'C_SH_IT_1', faculty_id: 'S_UDHAYA', acr: 'EOC', total: 4 },
      { id: 'SUB_ME25C16_IT', code: 'ME25C16', name: 'Makerspace: Group A - Mechanical', type: 'Practical', class_id: 'C_SH_IT_1', faculty_id: 'S_NAGARAJAN', acr: 'MS(Mech)', total: 4 },
      { id: 'SUB_UC25A01_IT', code: 'UC25A01', name: 'Life Skills for Engineering - I', type: 'Practical', class_id: 'C_SH_IT_1', faculty_id: 'S_BHUVANESHWARI', acr: 'LSE-I', total: 3 },
      { id: 'SUB_UC25A02_IT', code: 'UC25A02', name: 'Physical Education - I', type: 'Practical', class_id: 'C_SH_IT_1', faculty_id: 'S_PANDIAMMAL', acr: 'PE-I', total: 4 },

      // AI & DS
      { id: 'SUB_MA25C01_AIDS', code: 'MA25C01', name: 'Applied Calculus', type: 'Theory', class_id: 'C_SH_AIDS_1', faculty_id: 'S_MURU', acr: 'AC', total: 5 },
      { id: 'SUB_EN25C01_AIDS', code: 'EN25C01', name: 'English Essentials - I', type: 'Theory', class_id: 'C_SH_AIDS_1', faculty_id: 'S_AMIRTHA', acr: 'EE-I', total: 2 },
      { id: 'SUB_UC25H01_AIDS', code: 'UC25H01', name: 'Heritage of Tamils', type: 'Theory', class_id: 'C_SH_AIDS_1', faculty_id: 'S_THISHA', acr: 'HT-I', total: 2 },
      { id: 'SUB_PH25C01_AIDS', code: 'PH25C01', name: 'Applied Physics - I', type: 'Theory Cum Lab', class_id: 'C_SH_AIDS_1', faculty_id: 'S_KRISHNA', acr: 'AP-I', total: 3 },
      { id: 'SUB_CY25C01_AIDS', code: 'CY25C01', name: 'Applied Chemistry - I', type: 'Theory Cum Lab', class_id: 'C_SH_AIDS_1', faculty_id: 'S_SARAVANA', acr: 'AC-I', total: 3 },
      { id: 'SUB_CS25C01_AIDS', code: 'CS25C01', name: 'Computer Programming: C', type: 'Theory Cum Lab', class_id: 'C_SH_AIDS_1', faculty_id: 'S_PAVITHRA', acr: 'CP: C', total: 4 },
      { id: 'SUB_CS25C03_AIDS', code: 'CS25C03', name: 'Essentials of Computing', type: 'Theory Cum Lab', class_id: 'C_SH_AIDS_1', faculty_id: 'S_VINOTH', acr: 'EOC', total: 4 },
      { id: 'SUB_ME25C16_AIDS', code: 'ME25C16', name: 'Makerspace: Group A - Mechanical', type: 'Practical', class_id: 'C_SH_AIDS_1', faculty_id: 'S_ARUN', acr: 'MS(Mech)', total: 4 },
      { id: 'SUB_UC25A01_AIDS', code: 'UC25A01', name: 'Life Skills for Engineering - I', type: 'Practical', class_id: 'C_SH_AIDS_1', faculty_id: 'S_AMIRTHA', acr: 'LSE-I', total: 3 },
      { id: 'SUB_UC25A02_AIDS', code: 'UC25A02', name: 'Physical Education - I', type: 'Practical', class_id: 'C_SH_AIDS_1', faculty_id: 'S_PANDIAMMAL', acr: 'PE-I', total: 4 },

      // ECE
      { id: 'SUB_MA25C01_ECE', code: 'MA25C01', name: 'Applied Calculus', type: 'Theory', class_id: 'C_SH_ECE_1', faculty_id: 'S_GEETHA', acr: 'AC', total: 6 },
      { id: 'SUB_EN25C01_ECE', code: 'EN25C01', name: 'English Essentials - I', type: 'Theory', class_id: 'C_SH_ECE_1', faculty_id: 'S_SUBATHAMANI', acr: 'EE-I', total: 2 },
      { id: 'SUB_UC25H01_ECE', code: 'UC25H01', name: 'Heritage of Tamils', type: 'Theory', class_id: 'C_SH_ECE_1', faculty_id: 'S_THISHA', acr: 'HT-I', total: 2 },
      { id: 'SUB_EE25C04_ECE', code: 'EE25C04', name: 'Basic Electronics and Electrical', type: 'Theory', class_id: 'C_SH_ECE_1', faculty_id: 'S_BHARATHI', acr: 'BEEE', total: 5 },
      { id: 'SUB_PH25C01_ECE', code: 'PH25C01', name: 'Applied Physics - I', type: 'Theory Cum Lab', class_id: 'C_SH_ECE_1', faculty_id: 'S_ANTO', acr: 'AP-I', total: 3 },
      { id: 'SUB_CY25C01_ECE', code: 'CY25C01', name: 'Applied Chemistry - I', type: 'Theory Cum Lab', class_id: 'C_SH_ECE_1', faculty_id: 'S_SRINITHI', acr: 'AC-I', total: 3 },
      { id: 'SUB_CS25C01_ECE', code: 'CS25C01', name: 'Computer Programming: C', type: 'Theory Cum Lab', class_id: 'C_SH_ECE_1', faculty_id: 'S_JENIFER', acr: 'CP: C', total: 4 },
      { id: 'SUB_ME25C16_ECE', code: 'ME25C16', name: 'Makerspace: Group A - Mechanical', type: 'Practical', class_id: 'C_SH_ECE_1', faculty_id: 'S_HARIKISHORE', acr: 'MS(Mech)', total: 4 },
      { id: 'SUB_UC25A01_ECE', code: 'UC25A01', name: 'Life Skills for Engineering - I', type: 'Practical', class_id: 'C_SH_ECE_1', faculty_id: 'S_BHUVANESHWARI', acr: 'LSE-I', total: 3 },
      { id: 'SUB_UC25A02_ECE', code: 'UC25A02', name: 'Physical Education - I', type: 'Practical', class_id: 'C_SH_ECE_1', faculty_id: 'S_PONNAIAH', acr: 'PE-I', total: 4 },

      // EEE
      { id: 'SUB_MA25C01_EEE', code: 'MA25C01', name: 'Applied Calculus', type: 'Theory', class_id: 'C_SH_EEE_1', faculty_id: 'S_AMUTHAVALLI', acr: 'AC', total: 6 },
      { id: 'SUB_EN25C01_EEE', code: 'EN25C01', name: 'English Essentials - I', type: 'Theory', class_id: 'C_SH_EEE_1', faculty_id: 'S_RICHARD', acr: 'EE-I', total: 2 },
      { id: 'SUB_UC25H01_EEE', code: 'UC25H01', name: 'Heritage of Tamils', type: 'Theory', class_id: 'C_SH_EEE_1', faculty_id: 'S_THISHA', acr: 'HT-I', total: 1 },
      { id: 'SUB_EE25C03_EEE', code: 'EE25C03', name: 'Fundamentals of Electrical', type: 'Theory', class_id: 'C_SH_EEE_1', faculty_id: 'S_RAJAKARTHICK', acr: 'FEEE', total: 5 },
      { id: 'SUB_PH25C01_EEE', code: 'PH25C01', name: 'Applied Physics - I', type: 'Theory Cum Lab', class_id: 'C_SH_EEE_1', faculty_id: 'S_ANTO', acr: 'AP-I', total: 3 },
      { id: 'SUB_CY25C01_EEE', code: 'CY25C01', name: 'Applied Chemistry - I', type: 'Theory Cum Lab', class_id: 'C_SH_EEE_1', faculty_id: 'S_DAVID', acr: 'AC-I', total: 4 },
      { id: 'SUB_CS25C01_EEE', code: 'CS25C01', name: 'Computer Programming: C', type: 'Theory Cum Lab', class_id: 'C_SH_EEE_1', faculty_id: 'S_KESAVA', acr: 'CP: C', total: 3 },
      { id: 'SUB_ME25C16_EEE', code: 'ME25C16', name: 'Makerspace: Group A - Mechanical', type: 'Practical', class_id: 'C_SH_EEE_1', faculty_id: 'S_CHAKRAVARTHY', acr: 'MS(Mech)', total: 4 },
      { id: 'SUB_UC25A01_EEE', code: 'UC25A01', name: 'Life Skills for Engineering - I', type: 'Practical', class_id: 'C_SH_EEE_1', faculty_id: 'S_BHUVANESHWARI', acr: 'LSE-I', total: 3 },
      { id: 'SUB_UC25A02_EEE', code: 'UC25A02', name: 'Physical Education - I', type: 'Practical', class_id: 'C_SH_EEE_1', faculty_id: 'S_PANDIAMMAL', acr: 'PE-I', total: 4 },

      // Mech
      { id: 'SUB_MA25C01_MECH', code: 'MA25C01', name: 'Applied Calculus', type: 'Theory', class_id: 'C_SH_MECH_1', faculty_id: 'S_CHITRA', acr: 'AC', total: 6 },
      { id: 'SUB_ME25C03_MECH', code: 'ME25C03', name: 'Introduction to Mechanical Engineering', type: 'Theory', class_id: 'C_SH_MECH_1', faculty_id: 'S_VEMBATHU', acr: 'IME', total: 4 },
      { id: 'SUB_EN25C01_MECH', code: 'EN25C01', name: 'English Essentials - I', type: 'Theory', class_id: 'C_SH_MECH_1', faculty_id: 'S_SUBATHAMANI', acr: 'EE-I', total: 2 },
      { id: 'SUB_UC25H01_MECH', code: 'UC25H01', name: 'Heritage of Tamils', type: 'Theory', class_id: 'C_SH_MECH_1', faculty_id: 'S_THISHA', acr: 'HT-I', total: 1 },
      { id: 'SUB_PH25C01_MECH', code: 'PH25C01', name: 'Applied Physics - I', type: 'Theory Cum Lab', class_id: 'C_SH_MECH_1', faculty_id: 'S_KRISHNA', acr: 'AP-I', total: 3 },
      { id: 'SUB_CY25C01_MECH', code: 'CY25C01', name: 'Applied Chemistry - I', type: 'Theory Cum Lab', class_id: 'C_SH_MECH_1', faculty_id: 'S_SARAVANA', acr: 'AC-I', total: 3 },
      { id: 'SUB_CS25C01_MECH', code: 'CS25C01', name: 'Computer Programming: Python', type: 'Theory Cum Lab', class_id: 'C_SH_MECH_1', faculty_id: 'S_RATHIMALA', acr: 'CP: Py', total: 4 },
      { id: 'SUB_CS25C03_MECH', code: 'CS25C03', name: 'Engineering Drawing Practice', type: 'Theory Cum Lab', class_id: 'C_SH_MECH_1', faculty_id: 'S_SIVAGANESAN', acr: 'ED', total: 6 },
      { id: 'SUB_ME25C16_MECH', code: 'ME25C16', name: 'Makerspace: Group A - Mechanical', type: 'Practical', class_id: 'C_SH_MECH_1', faculty_id: 'S_SURULIMANI', acr: 'MS(Mech)', total: 4 },
      { id: 'SUB_UC25A01_MECH', code: 'UC25A01', name: 'Life Skills for Engineering - I', type: 'Practical', class_id: 'C_SH_MECH_1', faculty_id: 'S_BHUVANESHWARI', acr: 'LSE-I', total: 3 },
      { id: 'SUB_UC25A02_MECH', code: 'UC25A02', name: 'Physical Education - I', type: 'Practical', class_id: 'C_SH_MECH_1', faculty_id: 'S_PONNAIAH', acr: 'PE-I', total: 4 },

      // Civil
      { id: 'SUB_MA25C01_CIVIL', code: 'MA25C01', name: 'Applied Calculus', type: 'Theory', class_id: 'C_SH_CIVIL_1', faculty_id: 'S_AMUTHAVALLI', acr: 'AC', total: 6 },
      { id: 'SUB_CE25C01_CIVIL', code: 'CE25C01', name: 'Introduction to Civil Engineering', type: 'Theory', class_id: 'C_SH_CIVIL_1', faculty_id: 'S_BENITA', acr: 'ICE', total: 4 },
      { id: 'SUB_EN25C01_CIVIL', code: 'EN25C01', name: 'English Essentials - I', type: 'Theory', class_id: 'C_SH_CIVIL_1', faculty_id: 'S_AMIRTHA', acr: 'EE-I', total: 2 },
      { id: 'SUB_UC25H01_CIVIL', code: 'UC25H01', name: 'Heritage of Tamils', type: 'Theory', class_id: 'C_SH_CIVIL_1', faculty_id: 'S_THISHA', acr: 'HT-I', total: 1 },
      { id: 'SUB_PH25C01_CIVIL', code: 'PH25C01', name: 'Applied Physics - I', type: 'Theory Cum Lab', class_id: 'C_SH_CIVIL_1', faculty_id: 'S_DIANA', acr: 'AP-I', total: 3 },
      { id: 'SUB_CY25C01_CIVIL', code: 'CY25C01', name: 'Applied Chemistry - I', type: 'Theory Cum Lab', class_id: 'C_SH_CIVIL_1', faculty_id: 'S_SARAVANA', acr: 'AC-I', total: 3 },
      { id: 'SUB_CS25C01_CIVIL', code: 'CS25C01', name: 'Computer Programming: Python', type: 'Theory Cum Lab', class_id: 'C_SH_CIVIL_1', faculty_id: 'S_BHAVANI', acr: 'CP: Py', total: 4 },
      { id: 'SUB_CS25C03_CIVIL', code: 'CS25C03', name: 'Engineering Drawing Practice', type: 'Theory Cum Lab', class_id: 'C_SH_CIVIL_1', faculty_id: 'S_ARUN', acr: 'ED', total: 6 },
      { id: 'SUB_ME25C16_CIVIL', code: 'ME25C16', name: 'Makerspace: Group A - Mechanical', type: 'Practical', class_id: 'C_SH_CIVIL_1', faculty_id: 'S_NAGARAJA', acr: 'MS(Mech)', total: 4 },
      { id: 'SUB_UC25A01_CIVIL', code: 'UC25A01', name: 'Life Skills for Engineering - I', type: 'Practical', class_id: 'C_SH_CIVIL_1', faculty_id: 'S_AMIRTHA', acr: 'LSE-I', total: 3 },
      { id: 'SUB_UC25A02_CIVIL', code: 'UC25A02', name: 'Physical Education - I', type: 'Practical', class_id: 'C_SH_CIVIL_1', faculty_id: 'S_PONNAIAH', acr: 'PE-I', total: 4 },

      // CSE B
      { id: 'SUB_MA25C01_CSEB', code: 'MA25C01', name: 'Applied Calculus', type: 'Theory', class_id: 'C_SH_CSE_B_1', faculty_id: 'S_GEETHA', acr: 'AC', total: 5 },
      { id: 'SUB_EN25C01_CSEB', code: 'EN25C01', name: 'English Essentials - I', type: 'Theory', class_id: 'C_SH_CSE_B_1', faculty_id: 'S_VALARMATHI', acr: 'EE-I', total: 2 },
      { id: 'SUB_UC25H01_CSEB', code: 'UC25H01', name: 'Heritage of Tamils', type: 'Theory', class_id: 'C_SH_CSE_B_1', faculty_id: 'S_THISHA', acr: 'HT-I', total: 2 },
      { id: 'SUB_PH25C01_CSEB', code: 'PH25C01', name: 'Applied Physics - I', type: 'Theory Cum Lab', class_id: 'C_SH_CSE_B_1', faculty_id: 'S_BHUVANESHWARI', acr: 'AP-I', total: 3 },
      { id: 'SUB_CY25C01_CSEB', code: 'CY25C01', name: 'Applied Chemistry - I', type: 'Theory Cum Lab', class_id: 'C_SH_CSE_B_1', faculty_id: 'S_SRINITHI', acr: 'AC-I', total: 3 },
      { id: 'SUB_CS25C01_CSEB', code: 'CS25C01', name: 'Computer Programming: C', type: 'Theory Cum Lab', class_id: 'C_SH_CSE_B_1', faculty_id: 'S_NAVEENKARTHICK', acr: 'CP: C', total: 4 },
      { id: 'SUB_CS25C03_CSEB', code: 'CS25C03', name: 'Essentials of Computing', type: 'Theory Cum Lab', class_id: 'C_SH_CSE_B_1', faculty_id: 'S_MAREESWARI', acr: 'EOC', total: 4 },
      { id: 'SUB_ME25C16_CSEB', code: 'ME25C16', name: 'Makerspace: Group A - Mechanical', type: 'Practical', class_id: 'C_SH_CSE_B_1', faculty_id: 'S_VENNIMALAI', acr: 'MS(Mech)', total: 4 },
      { id: 'SUB_UC25A01_CSEB', code: 'UC25A01', name: 'Life Skills for Engineering - I', type: 'Practical', class_id: 'C_SH_CSE_B_1', faculty_id: 'S_VALARMATHI', acr: 'LSE-I', total: 3 },
      { id: 'SUB_UC25A02_CSEB', code: 'UC25A02', name: 'Physical Education - I', type: 'Practical', class_id: 'C_SH_CSE_B_1', faculty_id: 'S_VAYALSAMY', acr: 'PE-I', total: 4 },
    ];

    for (const sub of subjects) {
      await pool.query(
        `INSERT IGNORE INTO subjects (id, code, name, acronym, type, department, semester, faculty_id, class_id, total_hours)
         VALUES (?, ?, ?, ?, ?, 'Science and Humanities', 1, ?, ?, ?)`,
        [sub.id, sub.code, sub.name, sub.acr, sub.type, sub.faculty_id, sub.class_id, sub.total]
      );
    }
    console.log('Inserted Subjects');

    // Create exactly 1 student for each class so they appear in reports and mark entry
    const sampleStudents = [
      { id: 'STU_CSEA_1', s_no: 1, roll_no: '26CSEA001', name: 'Aarav Kumar', class_id: 'C_SH_CSE_A_1', dept: 'Science and Humanities' },
      { id: 'STU_IT_1', s_no: 1, roll_no: '26IT001', name: 'Arjun Das', class_id: 'C_SH_IT_1', dept: 'Science and Humanities' },
      { id: 'STU_AIDS_1', s_no: 1, roll_no: '26AIDS001', name: 'Karthik Raja', class_id: 'C_SH_AIDS_1', dept: 'Science and Humanities' },
      { id: 'STU_ECE_1', s_no: 1, roll_no: '26ECE001', name: 'Mohamed Asif', class_id: 'C_SH_ECE_1', dept: 'Science and Humanities' },
      { id: 'STU_EEE_1', s_no: 1, roll_no: '26EEE001', name: 'Priya Raj', class_id: 'C_SH_EEE_1', dept: 'Science and Humanities' },
      { id: 'STU_MECH_1', s_no: 1, roll_no: '26MECH001', name: 'Sanjay Krish', class_id: 'C_SH_MECH_1', dept: 'Science and Humanities' },
      { id: 'STU_CIVIL_1', s_no: 1, roll_no: '26CIVIL001', name: 'Vignesh S', class_id: 'C_SH_CIVIL_1', dept: 'Science and Humanities' },
      { id: 'STU_CSEB_1', s_no: 1, roll_no: '26CSEB001', name: 'Ananya V', class_id: 'C_SH_CSE_B_1', dept: 'Science and Humanities' }
    ];

    for (const stu of sampleStudents) {
      await pool.query(
        `INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [stu.id, stu.s_no, stu.roll_no, stu.name, stu.class_id, stu.dept]
      );
    }
    console.log('Inserted Dummy Students');

    console.log('Successfully Seeded all 1st Year Data!');
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    await pool.end();
  }
}

seed();
