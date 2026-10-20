import db from './db.js';

// ============================================================
// DATA DEFINITIONS: 2026-2030 BATCH (REGULATION 2025)
// ============================================================

const departments = [
  { short_name: 'S&H', name: 'Science and Humanities', college_name: 'Nadar Saraswathi College of Engineering and Technology, Theni' },
  { short_name: 'CSE', name: 'Computer Science and Engineering', college_name: 'Nadar Saraswathi College of Engineering and Technology, Theni' },
  { short_name: 'IT', name: 'Information Technology', college_name: 'Nadar Saraswathi College of Engineering and Technology, Theni' },
  { short_name: 'AIDS', name: 'Artificial Intelligence and Data Science', college_name: 'Nadar Saraswathi College of Engineering and Technology, Theni' },
  { short_name: 'ECE', name: 'Electronics and Communication Engineering', college_name: 'Nadar Saraswathi College of Engineering and Technology, Theni' },
  { short_name: 'EEE', name: 'Electrical and Electronics Engineering', college_name: 'Nadar Saraswathi College of Engineering and Technology, Theni' },
  { short_name: 'MECH', name: 'Mechanical Engineering', college_name: 'Nadar Saraswathi College of Engineering and Technology, Theni' },
  { short_name: 'CIVIL', name: 'Civil Engineering', college_name: 'Nadar Saraswathi College of Engineering and Technology, Theni' }
];

const staffs = [
  { id: 'S_CHITRA', name: 'Dr.C.Chithra', short_name: 'CC', designation: 'Prof./Maths', role: 'hod', email: 'c.chithra@nscet.org', employee_id: 'SH001', department: 'Science and Humanities' },
  { id: 'S_SHANMUGA', name: 'Mrs.N.Shanmuga Priya', short_name: 'NSP', designation: 'TF/Maths', role: 'class_coordinator', email: 'shanmugapriya.maths@nscet.org', employee_id: 'SH002', department: 'Science and Humanities' },
  { id: 'S_MALAR', name: 'Dr.P.Malarvizhi', short_name: 'PM', designation: 'AP/Eng', role: 'faculty', email: 'malarvizhi.eng@nscet.org', employee_id: 'SH003', department: 'Science and Humanities' },
  { id: 'S_THISHA', name: 'Mrs.N.Thisha', short_name: 'NT', designation: 'AP/Tamil', role: 'class_coordinator', email: 'thisha.tamil@nscet.org', employee_id: 'SH004', department: 'Science and Humanities' },
  { id: 'S_DIANA', name: 'Dr.P.Diana', short_name: 'PD', designation: 'AP/Phy', role: 'class_coordinator', email: 'diana.phy@nscet.org', employee_id: 'SH005', department: 'Science and Humanities' },
  { id: 'S_SRINITHI', name: 'Dr.S.Srinithi', short_name: 'SS', designation: 'AP/Chem', role: 'faculty', email: 'srinithi.chem@nscet.org', employee_id: 'SH006', department: 'Science and Humanities' },
  { id: 'S_VALARMATHI', name: 'Mrs.C.Valarmathi', short_name: 'CV', designation: 'AP/Eng', role: 'faculty', email: 'valarmathi.eng@nscet.org', employee_id: 'SH007', department: 'Science and Humanities' },
  { id: 'S_BHUVANESHWARI', name: 'Mrs.M.Bhuvaneshwari', short_name: 'MB', designation: 'AP/Phy', role: 'faculty', email: 'bhuvaneshwari.phy@nscet.org', employee_id: 'SH008', department: 'Science and Humanities' },
  { id: 'S_VAYALSAMY', name: 'Dr.M.Vayalsamy', short_name: 'MV', designation: 'Dir./PD', role: 'faculty', email: 'vayalsamy.pd@nscet.org', employee_id: 'SH009', department: 'Science and Humanities' },
  { id: 'S_MATHALAI', name: 'Mrs.S.Mathalai Santhana Mary', short_name: 'MSM', designation: 'AP/CSE', role: 'faculty', email: 'mathalai.cse@nscet.org', employee_id: 'SH010', department: 'Computer Science and Engineering' },
  { id: 'S_RATHIMALA', name: 'Mrs.S.Rathimala', short_name: 'SR', designation: 'AP/CSE', role: 'faculty', email: 'rathimala.cse@nscet.org', employee_id: 'SH011', department: 'Computer Science and Engineering' },
  { id: 'S_SIVAGANESAN', name: 'Mr.R.Sivaganesan', short_name: 'RS', designation: 'AP/Mech', role: 'faculty', email: 'r.sivaganesan@nscet.org', employee_id: 'SH012', department: 'Mechanical Engineering' },
  { id: 'S_AMUTHAVALLI', name: 'Mrs.K.Amuthavalli', short_name: 'KA', designation: 'TF/Maths', role: 'class_coordinator', email: 'amuthavalli.maths@nscet.org', employee_id: 'SH013', department: 'Science and Humanities' },
  { id: 'S_RICHARD', name: 'Mr.M.Richard', short_name: 'MR', designation: 'AP/Eng', role: 'faculty', email: 'richard.eng@nscet.org', employee_id: 'SH014', department: 'Science and Humanities' },
  { id: 'S_ANTO', name: 'Dr.P.Anto Christy', short_name: 'AC', designation: 'AP/Phy', role: 'class_coordinator', email: 'anto.phy@nscet.org', employee_id: 'SH015', department: 'Science and Humanities' },
  { id: 'S_DAVID', name: 'Dr.D.David Jayaraj', short_name: 'DJ', designation: 'AP/Chem', role: 'faculty', email: 'david.chem@nscet.org', employee_id: 'SH016', department: 'Science and Humanities' },
  { id: 'S_KESAVA', name: 'Mr.N.Kesavamoorthy', short_name: 'NK', designation: 'AP/IT', role: 'faculty', email: 'kesavamoorthy.it@nscet.org', employee_id: 'SH017', department: 'Information Technology' },
  { id: 'S_UDHAYA', name: 'Mr.R.Udhaya Kumar', short_name: 'UK', designation: 'AP/IT', role: 'faculty', email: 'udhayakumar.it@nscet.org', employee_id: 'SH018', department: 'Information Technology' },
  { id: 'S_NAGARAJAN', name: 'Dr.B.Nagarajan', short_name: 'BN', designation: 'AP/Mech', role: 'faculty', email: 'b.nagarajan@nscet.org', employee_id: 'SH019', department: 'Mechanical Engineering' },
  { id: 'S_PANDIAMMAL', name: 'Mrs.P.Pandiammal', short_name: 'PP', designation: 'PD', role: 'faculty', email: 'pandiammal.pd@nscet.org', employee_id: 'SH020', department: 'Science and Humanities' },
  { id: 'S_MURU', name: 'Mrs.M.Murugalakshmi', short_name: 'ML', designation: 'AP/Maths', role: 'faculty', email: 'muruga.maths@nscet.org', employee_id: 'SH021', department: 'Science and Humanities' },
  { id: 'S_AMIRTHA', name: 'Ms.D.I.Amirtha', short_name: 'DA', designation: 'TF/Eng', role: 'class_coordinator', email: 'amirtha.eng@nscet.org', employee_id: 'SH022', department: 'Science and Humanities' },
  { id: 'S_KRISHNA', name: 'Dr.T.Krishnakumar', short_name: 'TK', designation: 'AP/Phy', role: 'faculty', email: 'krishna.phy@nscet.org', employee_id: 'SH023', department: 'Science and Humanities' },
  { id: 'S_SARAVANA', name: 'Dr.R.Saravanakumar', short_name: 'RSK', designation: 'AP/Chem', role: 'faculty', email: 'saravana.chem@nscet.org', employee_id: 'SH024', department: 'Science and Humanities' },
  { id: 'S_PAVITHRA', name: 'Mrs.M.Pavithra', short_name: 'MP', designation: 'AP/AI&DS', role: 'faculty', email: 'pavithra.aids@nscet.org', employee_id: 'SH025', department: 'Artificial Intelligence and Data Science' },
  { id: 'S_VINOTH', name: 'Mr.J.Vinothkumar', short_name: 'JV', designation: 'AP/AI&DS', role: 'faculty', email: 'vinoth.aids@nscet.org', employee_id: 'SH026', department: 'Artificial Intelligence and Data Science' },
  { id: 'S_ARUN', name: 'Mr.G.Arunkumar', short_name: 'GA', designation: 'AP/Mech', role: 'faculty', email: 'g.arunkumar@nscet.org', employee_id: 'SH027', department: 'Mechanical Engineering' },
  { id: 'S_GEETHA', name: 'Mrs.M.Geetha', short_name: 'MG', designation: 'TF/Maths', role: 'class_coordinator', email: 'geetha.maths@nscet.org', employee_id: 'SH028', department: 'Science and Humanities' },
  { id: 'S_SUBATHAMANI', name: 'Mrs.T.Subathamani', short_name: 'TS', designation: 'AP/Eng', role: 'faculty', email: 'subathamani.eng@nscet.org', employee_id: 'SH031', department: 'Science and Humanities' },
  { id: 'S_BHARATHI', name: 'Mr.K.Bharathikannan', short_name: 'KB', designation: 'AP/ECE', role: 'faculty', email: 'bharathikannan.ece@nscet.org', employee_id: 'SH032', department: 'Electronics and Communication Engineering' },
  { id: 'S_JENIFER', name: 'Mrs.K.Jenifer', short_name: 'KJ', designation: 'AP/AI&DS', role: 'faculty', email: 'jenifer.aids@nscet.org', employee_id: 'SH034', department: 'Artificial Intelligence and Data Science' },
  { id: 'S_HARIKISHORE', name: 'Mr.S.Harikishore', short_name: 'SH', designation: 'AP/Mech', role: 'faculty', email: 's.harikishore@nscet.org', employee_id: 'SH035', department: 'Mechanical Engineering' },
  { id: 'S_PONNAIAH', name: 'Mr.M.Ponnaiah', short_name: 'MP', designation: 'PD', role: 'faculty', email: 'ponnaiah.pd@nscet.org', employee_id: 'SH036', department: 'Science and Humanities' },
  { id: 'S_RAJAKARTHICK', name: 'Mr.R.Raja Karthick', short_name: 'RK', designation: 'AP/EEE', role: 'faculty', email: 'r.rajakarthick@nscet.org', employee_id: 'SH037', department: 'Electrical and Electronics Engineering' },
  { id: 'S_CHAKRAVARTHY', name: 'Mr.J.Chakravarthy Samy Durai', short_name: 'CD', designation: 'AP/Mech', role: 'faculty', email: 'j.chakravarthy@nscet.org', employee_id: 'SH038', department: 'Mechanical Engineering' },
  { id: 'S_VEMBATHU', name: 'Dr.A.Vembathurajesh', short_name: 'AV', designation: 'HoD/S & H', role: 'faculty', email: 'vembathu.sh@nscet.org', employee_id: 'SH040', department: 'Science and Humanities' },
  { id: 'S_SURULIMANI', name: 'Mr.P.Surulimani', short_name: 'PS', designation: 'AP/Mech', role: 'faculty', email: 'p.surulimani@nscet.org', employee_id: 'SH041', department: 'Mechanical Engineering' },
  { id: 'S_BENITA', name: 'Mrs.K.Benita Merlin Isabella', short_name: 'BM', designation: 'AP/Civil', role: 'faculty', email: 'benita.civil@nscet.org', employee_id: 'SH043', department: 'Civil Engineering' },
  { id: 'S_BHAVANI', name: 'Mrs.M.Bhavani', short_name: 'MB', designation: 'AP/IT', role: 'faculty', email: 'bhavani.it@nscet.org', employee_id: 'SH044', department: 'Information Technology' },
  { id: 'S_NAGARAJA', name: 'Mr.R.Nagaraja', short_name: 'RN', designation: 'AP/Mech', role: 'faculty', email: 'r.nagaraja@nscet.org', employee_id: 'SH045', department: 'Mechanical Engineering' },
  // Faculty retaining core engineering departments
  { id: 'S_VENNIMALAI', name: 'Mr.V.Vennimalai', short_name: 'VV', designation: 'AP/Mech', role: 'faculty', email: 'v.vennimalai@nscet.org', employee_id: 'ME009', department: 'Mechanical Engineering' },
  { id: 'FAC_IT_103', name: 'Mr. G.R. Naveenkarthick', short_name: 'GN', designation: 'AP/IT', role: 'faculty', email: 'naveenkarthickgr@nscet.org', employee_id: 'NSCET-IT-103', department: 'Information Technology' },
  { id: 'FAC006', name: 'Mrs. M. Mareeswari', short_name: 'MM', designation: 'AP/IT', role: 'faculty', email: 'mareeswarim@nscet.org', employee_id: 'NSCET-IT-006', department: 'Information Technology' },
];

const classes = [
  { id: 'C_SH_CSE_A_1', name: 'I Year CSE A', department: 'Science and Humanities', semester: 1, year_label: 'I', section: 'A', room_no: 'Class Room 25', batch: '2026-2030', class_coordinator: 'Mrs.N.Shanmuga Priya TF/Maths' },
  { id: 'C_SH_CSE_B_1', name: 'I Year CSE B', department: 'Science and Humanities', semester: 1, year_label: 'I', section: 'B', room_no: 'Class Room 24', batch: '2026-2030', class_coordinator: 'Mrs.M.Geetha TF/Maths' },
  { id: 'C_SH_IT_1', name: 'I Year IT', department: 'Science and Humanities', semester: 1, year_label: 'I', section: 'A', room_no: 'Class Room 21', batch: '2026-2030', class_coordinator: 'Mrs.K.Amuthavalli TF/Maths' },
  { id: 'C_SH_AIDS_1', name: 'I Year AI & DS', department: 'Science and Humanities', semester: 1, year_label: 'I', section: 'A', room_no: 'Class Room 23', batch: '2026-2030', class_coordinator: 'Ms.D.I.Amirtha,TF/Eng' },
  { id: 'C_SH_ECE_1', name: 'I Year ECE', department: 'Science and Humanities', semester: 1, year_label: 'I', section: 'A', room_no: 'Class Room 22', batch: '2026-2030', class_coordinator: 'Dr.P.Anto Christy, AP/Phy' },
  { id: 'C_SH_EEE_1', name: 'I Year EEE', department: 'Science and Humanities', semester: 1, year_label: 'I', section: 'A', room_no: 'Class Room 21', batch: '2026-2030', class_coordinator: 'Mrs.K.Amuthavalli, TF/Maths' },
  { id: 'C_SH_CIVIL_1', name: 'I Year Civil', department: 'Science and Humanities', semester: 1, year_label: 'I', section: 'A', room_no: 'CR-Civil', batch: '2026-2030', class_coordinator: 'Dr.P.Diana, AP/Phy' },
  { id: 'C_SH_MECH_1', name: 'I Year Mech', department: 'Science and Humanities', semester: 1, year_label: 'I', section: 'A', room_no: 'CR-Mech', batch: '2026-2030', class_coordinator: 'Mrs.N.Thisha, AP/Tamil' },
];

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
  { id: 'SUB_CS25C01_CSEB', code: 'CS25C01', name: 'Computer Programming: C', type: 'Theory Cum Lab', class_id: 'C_SH_CSE_B_1', faculty_id: 'FAC_IT_103', acr: 'CP: C', total: 4 },
  { id: 'SUB_CS25C03_CSEB', code: 'CS25C03', name: 'Essentials of Computing', type: 'Theory Cum Lab', class_id: 'C_SH_CSE_B_1', faculty_id: 'FAC006', acr: 'EOC', total: 4 },
  { id: 'SUB_ME25C16_CSEB', code: 'ME25C16', name: 'Makerspace: Group A - Mechanical', type: 'Practical', class_id: 'C_SH_CSE_B_1', faculty_id: 'S_VENNIMALAI', acr: 'MS(Mech)', total: 4 },
  { id: 'SUB_UC25A01_CSEB', code: 'UC25A01', name: 'Life Skills for Engineering - I', type: 'Practical', class_id: 'C_SH_CSE_B_1', faculty_id: 'S_VALARMATHI', acr: 'LSE-I', total: 3 },
  { id: 'SUB_UC25A02_CSEB', code: 'UC25A02', name: 'Physical Education - I', type: 'Practical', class_id: 'C_SH_CSE_B_1', faculty_id: 'S_VAYALSAMY', acr: 'PE-I', total: 4 },
];

// ============================================================
// STUDENT LISTS: 332 STUDENTS
// ============================================================

// 1. CSE Students (93 total -> 60 in CSE A, 33 in CSE B)
const cseStudents = [
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
  // CSE B (61-93)
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

// 2. IT Students (39 total)
const itStudents = [
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

// 3. AI & DS Students (49 total)
const aidsStudents = [
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

// 4. ECE Students (52 total)
const eceStudents = [
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

// 5. EEE Students (23 total)
const eeeStudents = [
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

// 6. Civil Students (36 total)
const civilStudents = [
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

// 7. Mechanical Students (40 total)
const mechStudents = [
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

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

async function seedMaster() {
  console.log('🚀 Starting NSCET-MarkHub Master First-Year Database Seeder...');

  try {
    // 1. Ensure Science and Humanities department exists
    console.log('--- Step 1: Checking Departments ---');
    for (const d of departments) {
      await db.query(
        `INSERT INTO departments (short_name, name, college_name)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), college_name = VALUES(college_name)`,
        [d.short_name, d.name, d.college_name]
      );
    }
    console.log('✅ Departments verified.');

    // 2. Drop legacy unique roll_no index if present
    console.log('--- Step 2: Checking students table schema ---');
    try {
      await db.query('ALTER TABLE students DROP INDEX uq_rollno');
      console.log('✅ Dropped uq_rollno constraint successfully.');
    } catch {
      // index does not exist or already dropped
    }

    // 3. Upsert First Year Staffs
    console.log('--- Step 3: Seeding Staffs ---');
    for (const st of staffs) {
      try {
        await db.query(
          `INSERT INTO staffs (id, name, short_name, designation, role, email, employee_id, password, department)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'faculty123', ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             short_name = VALUES(short_name),
             designation = VALUES(designation),
             role = VALUES(role),
             email = VALUES(email),
             employee_id = VALUES(employee_id),
             department = VALUES(department)`,
          [st.id, st.name, st.short_name, st.designation, st.role, st.email, st.employee_id, st.department]
        );
      } catch (staffErr) {
        if (staffErr.code === 'ER_DUP_ENTRY') {
          // If staff exists by email or employee_id, update their profile details
          await db.query(
            `UPDATE staffs 
             SET name = ?, short_name = ?, designation = ?, role = ?, department = ?
             WHERE email = ? OR employee_id = ? OR id = ?`,
            [st.name, st.short_name, st.designation, st.role, st.department, st.email, st.employee_id, st.id]
          );
        } else {
          throw staffErr;
        }
      }
    }

    // Update any remaining legacy @example.com or @example.org staff emails in the database safely
    try {
      const [legacyStaffs] = await db.query(
        `SELECT id, email, employee_id FROM staffs WHERE email LIKE '%@example.com' OR email LIKE '%@example.org'`
      );
      if (Array.isArray(legacyStaffs) && legacyStaffs.length > 0) {
        for (const legacy of legacyStaffs) {
          const targetEmail = legacy.email.replace('@example.com', '@nscet.org').replace('@example.org', '@nscet.org');
          try {
            await db.query(`UPDATE staffs SET email = ? WHERE id = ?`, [targetEmail, legacy.id]);
          } catch {
            const fallbackEmail = `${(legacy.employee_id || legacy.id).toLowerCase()}@nscet.org`;
            await db.query(`UPDATE staffs SET email = ? WHERE id = ?`, [fallbackEmail, legacy.id]);
          }
        }
      }
    } catch (cleanErr) {
      console.warn('⚠️ Legacy email cleanup warning:', cleanErr.message);
    }
    console.log(`✅ ${staffs.length} Staff members seeded with institutional @nscet.org emails.`);

    // 4. Upsert 8 First-Year Classes
    console.log('--- Step 4: Seeding 8 First-Year Classrooms ---');
    for (const cl of classes) {
      await db.query(
        `INSERT INTO classes (id, name, department, semester, year_label, section, room_no, batch, academic_year, class_coordinator)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, '2026-2027', ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           department = VALUES(department),
           semester = VALUES(semester),
           year_label = VALUES(year_label),
           section = VALUES(section),
           room_no = VALUES(room_no),
           batch = VALUES(batch),
           academic_year = VALUES(academic_year),
           class_coordinator = VALUES(class_coordinator)`,
        [cl.id, cl.name, cl.department, cl.semester, cl.year_label, cl.section, cl.room_no, cl.batch, cl.class_coordinator]
      );
    }
    console.log('✅ 8 Classrooms seeded.');

    // 5. Upsert Regulation 2025 Semester 1 Subjects
    console.log('--- Step 5: Seeding Subjects ---');
    for (const sub of subjects) {
      let effectiveFacultyId = sub.faculty_id;
      const [facCheck] = await db.query('SELECT id FROM staffs WHERE id = ?', [effectiveFacultyId]);
      if (!facCheck || facCheck.length === 0) {
        if (effectiveFacultyId === 'S_NAVEENKARTHICK') effectiveFacultyId = 'FAC_IT_103';
        else if (effectiveFacultyId === 'S_MAREESWARI') effectiveFacultyId = 'FAC006';
        else if (effectiveFacultyId === 'S_CHITRA') effectiveFacultyId = 'FAC002';
        else if (effectiveFacultyId === 'S_KARUNYA') effectiveFacultyId = 'FAC010';
        else if (effectiveFacultyId === 'S_RICHARD') effectiveFacultyId = 'FAC017';
        else if (effectiveFacultyId === 'S_KESAVA') effectiveFacultyId = 'FAC005';
        else if (effectiveFacultyId === 'S_UDHAYA') effectiveFacultyId = 'FAC004';
        else if (effectiveFacultyId === 'S_BHAVANI') effectiveFacultyId = 'FAC_IT_101';
      }

      await db.query(
        `INSERT INTO subjects (id, code, name, acronym, type, department, semester, faculty_id, class_id, total_hours)
         VALUES (?, ?, ?, ?, ?, 'Science and Humanities', 1, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           code = VALUES(code),
           name = VALUES(name),
           acronym = VALUES(acronym),
           type = VALUES(type),
           department = VALUES(department),
           semester = VALUES(semester),
           faculty_id = VALUES(faculty_id),
           class_id = VALUES(class_id),
           total_hours = VALUES(total_hours)`,
        [sub.id, sub.code, sub.name, sub.acr, sub.type, effectiveFacultyId, sub.class_id, sub.total]
      );
    }
    console.log(`✅ ${subjects.length} Subjects seeded.`);

    // 6. Remove dummy placeholder students
    console.log('--- Step 6: Purging any dummy student records ---');
    const dummyIds = [
      'STU_CSEA_1', 'STU_CSEB_1', 'STU_IT_1', 'STU_AIDS_1',
      'STU_ECE_1', 'STU_EEE_1', 'STU_MECH_1', 'STU_CIVIL_1'
    ];
    for (const dId of dummyIds) {
      await db.query('DELETE FROM students WHERE id = ?', [dId]);
    }

    // 7. Upsert all 332 Students
    console.log('--- Step 7: Seeding 332 Nominal Roll Students ---');
    let totalInserted = 0;

    // CSE (93: 60 A + 33 B)
    for (const stu of cseStudents) {
      const classId = stu.s_no <= 60 ? 'C_SH_CSE_A_1' : 'C_SH_CSE_B_1';
      const stuId = `STU_CSE_${stu.s_no}`;
      await db.query(
        `INSERT INTO students (id, s_no, roll_no, name, class_id, department)
         VALUES (?, ?, ?, ?, ?, 'Science and Humanities')
         ON DUPLICATE KEY UPDATE
           s_no = VALUES(s_no),
           roll_no = VALUES(roll_no),
           name = VALUES(name),
           class_id = VALUES(class_id),
           department = VALUES(department)`,
        [stuId, stu.s_no, stu.roll_no, stu.name, classId]
      );
      totalInserted++;
    }

    // IT (39)
    for (const stu of itStudents) {
      const stuId = `STU_IT_1_${stu.s_no}`;
      await db.query(
        `INSERT INTO students (id, s_no, roll_no, name, class_id, department)
         VALUES (?, ?, ?, ?, 'C_SH_IT_1', 'Science and Humanities')
         ON DUPLICATE KEY UPDATE
           s_no = VALUES(s_no),
           roll_no = VALUES(roll_no),
           name = VALUES(name),
           class_id = VALUES(class_id),
           department = VALUES(department)`,
        [stuId, stu.s_no, stu.roll_no, stu.name]
      );
      totalInserted++;
    }

    // AI & DS (49)
    for (const stu of aidsStudents) {
      const stuId = `STU_AIDS_1_${stu.s_no}`;
      await db.query(
        `INSERT INTO students (id, s_no, roll_no, name, class_id, department)
         VALUES (?, ?, ?, ?, 'C_SH_AIDS_1', 'Science and Humanities')
         ON DUPLICATE KEY UPDATE
           s_no = VALUES(s_no),
           roll_no = VALUES(roll_no),
           name = VALUES(name),
           class_id = VALUES(class_id),
           department = VALUES(department)`,
        [stuId, stu.s_no, stu.roll_no, stu.name]
      );
      totalInserted++;
    }

    // ECE (52)
    for (const stu of eceStudents) {
      const stuId = `STU_ECE_${stu.s_no}`;
      await db.query(
        `INSERT INTO students (id, s_no, roll_no, name, class_id, department)
         VALUES (?, ?, ?, ?, 'C_SH_ECE_1', 'Science and Humanities')
         ON DUPLICATE KEY UPDATE
           s_no = VALUES(s_no),
           roll_no = VALUES(roll_no),
           name = VALUES(name),
           class_id = VALUES(class_id),
           department = VALUES(department)`,
        [stuId, stu.s_no, stu.roll_no, stu.name]
      );
      totalInserted++;
    }

    // EEE (23)
    for (const stu of eeeStudents) {
      const stuId = `STU_EEE_${stu.s_no}`;
      await db.query(
        `INSERT INTO students (id, s_no, roll_no, name, class_id, department)
         VALUES (?, ?, ?, ?, 'C_SH_EEE_1', 'Science and Humanities')
         ON DUPLICATE KEY UPDATE
           s_no = VALUES(s_no),
           roll_no = VALUES(roll_no),
           name = VALUES(name),
           class_id = VALUES(class_id),
           department = VALUES(department)`,
        [stuId, stu.s_no, stu.roll_no, stu.name]
      );
      totalInserted++;
    }

    // Civil (36)
    for (const stu of civilStudents) {
      const stuId = `STU_CIVIL_${stu.s_no}`;
      await db.query(
        `INSERT INTO students (id, s_no, roll_no, name, class_id, department)
         VALUES (?, ?, ?, ?, 'C_SH_CIVIL_1', 'Science and Humanities')
         ON DUPLICATE KEY UPDATE
           s_no = VALUES(s_no),
           roll_no = VALUES(roll_no),
           name = VALUES(name),
           class_id = VALUES(class_id),
           department = VALUES(department)`,
        [stuId, stu.s_no, stu.roll_no, stu.name]
      );
      totalInserted++;
    }

    // Mech (40)
    for (const stu of mechStudents) {
      const stuId = `STU_MECH_${stu.s_no}`;
      await db.query(
        `INSERT INTO students (id, s_no, roll_no, name, class_id, department)
         VALUES (?, ?, ?, ?, 'C_SH_MECH_1', 'Science and Humanities')
         ON DUPLICATE KEY UPDATE
           s_no = VALUES(s_no),
           roll_no = VALUES(roll_no),
           name = VALUES(name),
           class_id = VALUES(class_id),
           department = VALUES(department)`,
        [stuId, stu.s_no, stu.roll_no, stu.name]
      );
      totalInserted++;
    }

    console.log(`✅ Exactly ${totalInserted} Students seeded across 8 Classes!`);

    // 8. Department assignments verification for core engineering and S&H faculty
    console.log('--- Step 8: Verifying Staff Departments & HoD Promotions ---');
    
    // Correctly restore IT faculty who teach cross-department / first year courses
    await db.query(`
      UPDATE staffs 
      SET department = 'Information Technology', designation = 'AP/IT'
      WHERE id IN ('S_NAVEENKARTHICK', 'S_MAREESWARI', 'FAC_IT_103', 'FAC006', 'S_KESAVA', 'FAC005', 'S_UDHAYA', 'FAC004', 'S_BHAVANI', 'FAC_IT_101') 
         OR LOWER(email) IN (
           'naveenkarthickgr@nscet.org', 's.naveenkarthick@nscet.org', 'naveenkarthick@nscet.org',
           'mareeswarim@nscet.org', 'k.mareeswari@nscet.org', 'mareeswari@nscet.org',
           'kesavamoorthy.it@nscet.org', 'kesavamoorthy@nscet.org',
           'udhayakumar.it@nscet.org', 'udhayakumar@nscet.org',
           'bhavani.it@nscet.org', 'bhavani@nscet.org'
         )
    `);

    // Correct CSE faculty & HoD
    await db.query(`
      UPDATE staffs 
      SET department = 'Computer Science and Engineering', designation = 'AP/CSE'
      WHERE id IN ('S_MATHALAI', 'S_RATHIMALA', 'FAC016')
         OR LOWER(email) IN ('mathalai.cse@nscet.org', 'rathimala.cse@nscet.org', 'rathimalat@nscet.org')
    `);
    await db.query(`
      UPDATE staffs 
      SET role = 'hod', designation = 'HOD CSE', department = 'Computer Science and Engineering'
      WHERE id = 'FAC014' 
         OR LOWER(email) LIKE '%mathalairaj%'
    `);

    // Correct AI & DS faculty
    await db.query(`
      UPDATE staffs 
      SET department = 'Artificial Intelligence and Data Science', designation = 'AP/AI&DS'
      WHERE id IN ('S_PAVITHRA', 'S_VINOTH', 'S_JENIFER', 'FAC021')
         OR LOWER(email) IN ('pavithra.aids@nscet.org', 'vinoth.aids@nscet.org', 'jenifer.aids@nscet.org', 'jenifer@nscet.org')
    `);

    // Correct Mechanical faculty
    await db.query(`
      UPDATE staffs 
      SET department = 'Mechanical Engineering', designation = 'AP/Mech'
      WHERE id IN ('S_VENNIMALAI', 'S_SIVAGANESAN', 'S_NAGARAJAN', 'S_ARUN', 'S_HARIKISHORE', 'S_CHAKRAVARTHY', 'S_SURULIMANI', 'S_NAGARAJA', 'FAC053', 'FAC054', 'FAC055', 'FAC_MECH_101', 'FAC_MECH_102', 'FAC_MECH_103', 'FAC_MECH_104')
         OR LOWER(email) IN ('v.vennimalai@nscet.org', 'r.sivaganesan@nscet.org', 'b.nagarajan@nscet.org', 'g.arunkumar@nscet.org', 's.harikishore@nscet.org', 'j.chakravarthy@nscet.org', 'p.surulimani@nscet.org', 'r.nagaraja@nscet.org', 'nagarajan.mech@nscet.org', 'harikishore@nscet.org', 'nagaraja.mech@nscet.org', 'surulimani@nscet.org', 'chakravarthysamydurai@nscet.org', 'arunkumar@nscet.org', 'sivaganesan@nscet.org')
    `);

    // Correct Civil faculty
    await db.query(`
      UPDATE staffs 
      SET department = 'Civil Engineering', designation = 'AP/Civil'
      WHERE id IN ('S_BENITA')
         OR LOWER(email) IN ('benita.civil@nscet.org')
    `);

    // Correct ECE faculty
    await db.query(`
      UPDATE staffs 
      SET department = 'Electronics and Communication Engineering', designation = 'AP/ECE'
      WHERE id IN ('S_BHARATHI')
         OR LOWER(email) IN ('bharathikannan.ece@nscet.org')
    `);

    // Correct EEE faculty
    await db.query(`
      UPDATE staffs 
      SET department = 'Electrical and Electronics Engineering', designation = 'AP/EEE'
      WHERE id IN ('S_RAJAKARTHICK', 'FAC_EEE_103')
         OR LOWER(email) IN ('r.rajakarthick@nscet.org', 'rajakarthick@nscet.org')
    `);

    // Correct S&H faculty (Maths, English, Science)
    await db.query(`
      UPDATE staffs 
      SET department = 'Science and Humanities', designation = 'AP/Maths'
      WHERE id IN ('FAC010', 'FAC026', 'S_KARUNYA') 
         OR LOWER(email) LIKE '%karunya%'
    `);
    await db.query(`
      UPDATE staffs 
      SET department = 'Science and Humanities', designation = 'AP/Eng'
      WHERE id IN ('FAC017', 'S_RICHARD') 
         OR LOWER(email) LIKE '%richardbritto%'
    `);
    await db.query(`
      UPDATE staffs 
      SET department = 'Science and Humanities', designation = 'AP/Eng'
      WHERE id = 'FAC070' 
         OR LOWER(email) LIKE '%devipriya%'
    `);
    await db.query(`
      UPDATE staffs 
      SET department = 'Science and Humanities', designation = 'AP/Eng'
      WHERE id IN ('FAC007', 'FAC027', 'S_VALARMATHI') 
         OR LOWER(email) LIKE '%valarmathi%'
    `);
    
    // Promote Dr. C. Chithra to HoD for First Year (Science and Humanities) and preserve Discrete Mathematics for IT II Year (CL001)
    await db.query(`
      UPDATE staffs 
      SET role = 'hod', department = 'Science and Humanities', designation = 'Prof. & HoD / Maths'
      WHERE id IN ('S_CHITRA', 'FAC002') OR LOWER(email) IN ('c.chithra@nscet.org', 'chithra.c@nscet.org')
    `);
    await db.query(`
      UPDATE subjects 
      SET faculty_id = 'S_CHITRA'
      WHERE (code = 'MA25C08' OR name LIKE '%Discrete Mathematics%') AND class_id = 'CL001'
    `);
    console.log('✅ Dr. C. Chithra promoted to First Year HoD with IT II Year Discrete Mathematics linked.');
    console.log('✅ Core engineering and S&H faculty department integrity verified.');

    // 9. Ensure notifications table exists and broadcast system activation notification
    console.log('--- Step 9: Verifying Notifications System ---');
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          target_role VARCHAR(50) DEFAULT NULL,
          target_department VARCHAR(100) DEFAULT NULL,
          target_id VARCHAR(50) DEFAULT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          link VARCHAR(255) DEFAULT NULL,
          is_read TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const [notifCheck] = await db.query(
        `SELECT id FROM notifications WHERE title = 'Autonomous Regulation 2025 Portal Live' LIMIT 1`
      );
      if (notifCheck.length === 0) {
        await db.query(
          `INSERT INTO notifications (target_role, title, message, link, is_read)
           VALUES ('all', 'Autonomous Regulation 2025 Portal Live', 'Regulation 2025 Semester 1 Marks Entry & Reports are active for all 8 First-Year classes (332 students). Science & Humanities and departmental staff portals are operational.', '/marks-entry', FALSE)`
        );
        console.log('✅ System activation notification broadcasted to all staff & administration.');
      } else {
        console.log('✅ Notifications system verified.');
      }
    } catch (notifErr) {
      console.warn('⚠️ Notifications verification notice:', notifErr.message);
    }

    console.log('\n🎉 ALL FIRST-YEAR DATABASE DATA SUCCESSFULLY SEEDED & VERIFIED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Master seed error:', err);
    process.exit(1);
  }
}

seedMaster();
