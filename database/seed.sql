-- ============================================================
-- College CMS — Seed Data (Real Data)
-- Run this AFTER schema.sql
-- ============================================================

-- USE college_cms;

-- ─────────────────────────────────────────
-- DEPARTMENTS
-- ─────────────────────────────────────────
INSERT INTO departments (short_name, name, college_name) VALUES
('IT', 'Information Technology',
 'Nadar Saraswathi College of Engineering and Technology, Theni');

-- ─────────────────────────────────────────
-- CLASSES
-- ─────────────────────────────────────────
INSERT INTO classes
  (id, name, department, semester, year_label, section, room_no,
   academic_year, batch, class_coordinator, asst_coordinator)
VALUES
  ('CL001', 'IT - II Year - III Sem', 'Information Technology',
   3, 'II', 'A', 'CR-16', '2025-2026', '2024-2028',
   'Mr. N. Kesavamoorthy', 'Mrs. P. Jasmine Jose');

-- ─────────────────────────────────────────
-- STAFFS  (password = 'faculty123' for all)
-- ─────────────────────────────────────────
INSERT INTO staffs
  (id, name, short_name, designation, role, email, employee_id, password, class_role)
VALUES
  ('FAC001', 'Mr. C. Prathap',        'C. Prathap',        'AP, HOD IT', 'hod',     'prathap.it@nscet.edu.in',      'NSCET-IT-001', 'faculty123', NULL),
  ('FAC002', 'Dr. C. Chithra',        'C. Chithra',        'AP',         'faculty', 'chithra.it@nscet.edu.in',      'NSCET-IT-002', 'faculty123', NULL),
  ('FAC003', 'Mrs. P. Jasmine Jose',  'P. Jasmine Jose',   'AP',         'faculty', 'jasminejose.it@nscet.edu.in',  'NSCET-IT-003', 'faculty123', 'Assistant Coordinator'),
  ('FAC004', 'Mr. R. Udhaya Kumar',   'R. Udhaya Kumar',   'AP',         'faculty', 'udhayakumar.it@nscet.edu.in',  'NSCET-IT-004', 'faculty123', NULL),
  ('FAC005', 'Mr. N. Kesavamoorthy',  'N. Kesavamoorthy',  'AP',         'faculty', 'kesavamoorthy.it@nscet.edu.in','NSCET-IT-005', 'faculty123', 'Class Coordinator'),
  ('FAC006', 'Mrs. M. Mareeswari',    'M. Mareeswari',     'AP',         'faculty', 'mareeswari.it@nscet.edu.in',   'NSCET-IT-006', 'faculty123', NULL);

-- ─────────────────────────────────────────
-- SUBJECTS (IT III Sem 2025-26)
-- ─────────────────────────────────────────
INSERT INTO subjects
  (id, code, name, acronym, type, department, semester, faculty_id, class_id)
VALUES
  ('SUB001', 'MA25C08', 'Discrete Mathematics',                   'DM',  'Theory', 'Information Technology', 3, 'FAC002', 'CL001'),
  ('SUB002', 'CW25201', 'Computer Organization and Architecture', 'COA', 'Theory', 'Information Technology', 3, 'FAC003', 'CL001'),
  ('SUB003', 'CS25C08', 'Data Structures',                        'DS',  'Theory', 'Information Technology', 3, 'FAC004', 'CL001'),
  ('SUB004', 'CS25C07', 'Object Oriented Programming',            'OOP', 'Theory', 'Information Technology', 3, 'FAC001', 'CL001'),
  ('SUB005', 'IT25301', 'Web Technologies',                       'WT',  'Theory', 'Information Technology', 3, 'FAC005', 'CL001'),
  ('SUB006', 'SD',      'Skill Development Course - I',           'SD',  'Skill',  'Information Technology', 3, 'FAC006', 'CL001');

-- ─────────────────────────────────────────
-- STUDENTS (60 real students from Stdlist.docx)
-- ─────────────────────────────────────────
INSERT INTO students (id, s_no, roll_no, name, class_id) VALUES
  ('ST001',  1,  '921025205001', 'Abarna M',                  'CL001'),
  ('ST002',  2,  '921025205002', 'Abirami R',                 'CL001'),
  ('ST003',  3,  '921025205003', 'Aishwarya Lakshmi S',       'CL001'),
  ('ST004',  4,  '921025205004', 'Akshaya S',                 'CL001'),
  ('ST005',  5,  '921025205005', 'Aravindhан K',              'CL001'),
  ('ST006',  6,  '921025205006', 'Archana P',                 'CL001'),
  ('ST007',  7,  '921025205007', 'Bhuvana Sri G',             'CL001'),
  ('ST008',  8,  '921025205008', 'Deena P',                   'CL001'),
  ('ST009',  9,  '921025205009', 'Dhanalakshmi R',            'CL001'),
  ('ST010', 10,  '921025205010', 'Dharshini M',               'CL001'),
  ('ST011', 11,  '921025205011', 'Divya Sri S',               'CL001'),
  ('ST012', 12,  '921025205012', 'Elakkiya M',                'CL001'),
  ('ST013', 13,  '921025205013', 'Gobika Sri S',              'CL001'),
  ('ST014', 14,  '921025205014', 'Gowthamkumar M',            'CL001'),
  ('ST015', 15,  '921025205015', 'Guru K',                    'CL001'),
  ('ST016', 16,  '921025205016', 'Hari Priya R',              'CL001'),
  ('ST017', 17,  '921025205017', 'Janarthanan M',             'CL001'),
  ('ST018', 18,  '921025205018', 'Jeyakrishnan P',            'CL001'),
  ('ST019', 19,  '921025205019', 'Jeysree S',                 'CL001'),
  ('ST020', 20,  '921025205020', 'Karthiga M',                'CL001'),
  ('ST021', 21,  '921025205021', 'Kiruthika S',               'CL001'),
  ('ST022', 22,  '921025205022', 'Lakxman Hari K M',          'CL001'),
  ('ST023', 23,  '921025205023', 'Logasri K',                 'CL001'),
  ('ST024', 24,  '921025205024', 'Mahalakshmi R',             'CL001'),
  ('ST025', 25,  '921025205025', 'Maharajan K',               'CL001'),
  ('ST026', 26,  '921025205026', 'Mahima Grace G',            'CL001'),
  ('ST027', 27,  '921025205027', 'Mohamed Irfan P',           'CL001'),
  ('ST028', 28,  '921025205028', 'Mohamedsyatharafath A',     'CL001'),
  ('ST029', 29,  '921025205029', 'Muthu Vetha Varshini M',    'CL001'),
  ('ST030', 30,  '921025205030', 'Nafilafathima R',           'CL001'),
  ('ST031', 31,  '921025205031', 'Niroshkumar R',             'CL001'),
  ('ST032', 32,  '921025205032', 'Nishanthini R',             'CL001'),
  ('ST033', 33,  '921025205033', 'Pavithra R',                'CL001'),
  ('ST034', 34,  '921025205034', 'Pratibha Shivaranjani P',   'CL001'),
  ('ST035', 35,  '921025205035', 'Prathisha Arasi S',         'CL001'),
  ('ST036', 36,  '921025205036', 'Praveena M',                'CL001'),
  ('ST037', 37,  '921025205037', 'Preetha M',                 'CL001'),
  ('ST038', 38,  '921025205038', 'Priyadharshini M',          'CL001'),
  ('ST039', 39,  '921025205039', 'Rajaneswaran N',            'CL001'),
  ('ST040', 40,  '921025205040', 'Rajiya Priya K',            'CL001'),
  ('ST041', 41,  '921025205041', 'Renuga K',                  'CL001'),
  ('ST042', 42,  '921025205042', 'Rinisha M',                 'CL001'),
  ('ST043', 43,  '921025205043', 'Rohith Balaji M',           'CL001'),
  ('ST044', 44,  '921025205044', 'Roshini M',                 'CL001'),
  ('ST045', 45,  '921025205045', 'Sabana Banu K',             'CL001'),
  ('ST046', 46,  '921025205046', 'Sanjaykumar B',             'CL001'),
  ('ST047', 47,  '921025205047', 'Santhosh P',                'CL001'),
  ('ST048', 48,  '921025205048', 'Saravanakumar A',           'CL001'),
  ('ST049', 49,  '921025205049', 'Sarushela G',               'CL001'),
  ('ST050', 50,  '921025205050', 'Shanmugavalli K',           'CL001'),
  ('ST051', 51,  '921025205051', 'Sharunethra V',             'CL001'),
  ('ST052', 52,  '921025205052', 'Shivani B',                 'CL001'),
  ('ST053', 53,  '921025205053', 'Shoba M',                   'CL001'),
  ('ST054', 54,  '921025205054', 'Sujithram S',               'CL001'),
  ('ST055', 55,  '921025205055', 'Swetha T',                  'CL001'),
  ('ST056', 56,  '921025205056', 'Thanisha S',                'CL001'),
  ('ST057', 57,  '921025205057', 'Thejini P',                 'CL001'),
  ('ST058', 58,  '921025205058', 'Veerujothi P',              'CL001'),
  ('ST059', 59,  '921025205059', 'Velmurugan J',              'CL001'),
  ('ST060', 60,  '921025205060', 'Yuga Shri S',               'CL001');

-- Confirm
SELECT CONCAT('Seeded: ', COUNT(*), ' students') AS status FROM students;
SELECT CONCAT('Seeded: ', COUNT(*), ' staffs')   AS status FROM staffs;
SELECT CONCAT('Seeded: ', COUNT(*), ' subjects')  AS status FROM subjects;
\n\n-- ─────────────────────────────────────────
-- 1. DEPARTMENTS
-- ─────────────────────────────────────────
INSERT INTO departments (short_name, name, college_name) 
VALUES ('EEE', 'Electrical and Electronics Engineering', 'Nadar Saraswathi College of Engineering and Technology, Theni')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ─────────────────────────────────────────
-- 2. CLASSES
-- ─────────────────────────────────────────
INSERT IGNORE INTO classes
  (id, name, department, semester, year_label, section, room_no, academic_year, batch, class_coordinator, asst_coordinator)
VALUES
  ('CL004', 'EEE - II Year - III Sem', 'Electrical and Electronics Engineering', 3, 'II', 'A', 'CR-8', '2026-2027', '2025-2029', 'Mrs. H. Juriya Banu', 'Mrs. R. Chitra');

-- ─────────────────────────────────────────
-- 3. STAFFS  (password = 'faculty123' for all)
-- ─────────────────────────────────────────
INSERT IGNORE INTO staffs
  (id, name, short_name, designation, role, email, employee_id, password, class_role, department)
VALUES
  ('FAC031', 'Dr. B. Mallaiyasamy', 'B. Mallaiyasamy', 'ASP/S&H', 'faculty', 'mallaiyasamy.sh@nscet.edu.in', 'NSCET-SH-031', 'faculty123', NULL, 'Electrical and Electronics Engineering'),
  ('FAC032', 'Mrs. A. Nishetha Jeflin Nixon', 'A. Nishetha Jeflin Nixon', 'AP/EEE', 'faculty', 'nishetha.eee@nscet.edu.in', 'NSCET-EEE-032', 'faculty123', NULL, 'Electrical and Electronics Engineering'),
  ('FAC033', 'Mrs. R. Chitra', 'R. Chitra', 'AP/EEE', 'faculty', 'chitra.eee@nscet.edu.in', 'NSCET-EEE-033', 'faculty123', 'Assistant Coordinator', 'Electrical and Electronics Engineering'),
  ('FAC034', 'Dr. R. Athilingam', 'R. Athilingam', 'ASP/EEE', 'faculty', 'athilingam.eee@nscet.edu.in', 'NSCET-EEE-034', 'faculty123', NULL, 'Electrical and Electronics Engineering'),
  ('FAC035', 'Mrs. M. Vijayalakshmi', 'M. Vijayalakshmi', 'AP/EEE', 'faculty', 'vijayalakshmi.eee@nscet.edu.in', 'NSCET-EEE-035', 'faculty123', NULL, 'Electrical and Electronics Engineering'),
  ('FAC036', 'Mrs. H. Juriya Banu', 'H. Juriya Banu', 'AP/EEE', 'faculty', 'juriyabanu.eee@nscet.edu.in', 'NSCET-EEE-036', 'faculty123', 'Class Coordinator', 'Electrical and Electronics Engineering'),
  ('FAC037', 'Dr. N. Pandi Selvi', 'N. Pandi Selvi', 'AP/EEE', 'faculty', 'pandiselvi.eee@nscet.edu.in', 'NSCET-EEE-037', 'faculty123', NULL, 'Electrical and Electronics Engineering'),
  ('FAC038', 'Dr. P. Malarvizhi', 'P. Malarvizhi', 'ASP/S&H', 'faculty', 'malarvizhi.sh@nscet.edu.in', 'NSCET-SH-038', 'faculty123', NULL, 'Electrical and Electronics Engineering'),
  ('FAC039', 'NEW STAFF', 'NEW STAFF', 'AP', 'faculty', 'newstaff.eee@nscet.edu.in', 'NSCET-EEE-039', 'faculty123', NULL, 'Electrical and Electronics Engineering'),
  ('FAC040', 'HOD EEE', 'HOD', 'HOD/EEE', 'hod', 'hod_eee@nscet.edu.in', 'NSCET-EEE-HOD', 'faculty123', NULL, 'Electrical and Electronics Engineering');

-- ─────────────────────────────────────────
-- 4. SUBJECTS (EEE III Sem 2026-27)
-- ─────────────────────────────────────────
INSERT IGNORE INTO subjects
  (id, code, name, acronym, type, department, semester, faculty_id, class_id)
VALUES
  ('SUB030', 'MA25C04', 'Matrices for Engineers', 'MFE', 'Theory', 'Electrical and Electronics Engineering', 3, 'FAC031', 'CL004'),
  ('SUB031', 'EE25C04', 'Electromagnetic Theory', 'EMT', 'Theory', 'Electrical and Electronics Engineering', 3, 'FAC032', 'CL004'),
  ('SUB032', 'EE25301', 'Digital Electronics', 'DE', 'Theory', 'Electrical and Electronics Engineering', 3, 'FAC033', 'CL004'),
  ('SUB033', 'EE25302', 'Electric Circuit Analysis', 'ECA', 'Theory', 'Electrical and Electronics Engineering', 3, 'FAC034', 'CL004'),
  ('SUB034', 'EE25C05', 'Electronic Devices and Circuits', 'EDC', 'Theory', 'Electrical and Electronics Engineering', 3, 'FAC035', 'CL004'),
  ('SUB035', 'EE3405', 'Skill Development Course - I', 'SDC-1', 'Skill', 'Electrical and Electronics Engineering', 3, 'FAC039', 'CL004'),
  ('SUB036', 'EE25303', 'Electric Circuit Laboratory', 'ECA LAB', 'Practical', 'Electrical and Electronics Engineering', 3, 'FAC034', 'CL004'),
  ('SUB037', 'EE25C06', 'Electronics Laboratory', 'EL LAB', 'Practical', 'Electrical and Electronics Engineering', 3, 'FAC035', 'CL004'),
  ('SUB038', 'EN25C03', 'English Communication Skills Laboratory - I', 'ECS LAB', 'Practical', 'Electrical and Electronics Engineering', 3, 'FAC038', 'CL004'),
  ('SUB039', 'NM', 'Naan Mudhalvan', 'NM', 'Skill', 'Electrical and Electronics Engineering', 3, 'FAC036', 'CL004');

-- ─────────────────────────────────────────
-- 5. STUDENTS (EEE II Year, 2025-2029 Batch)
-- ─────────────────────────────────────────
INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
('STU301', 1, '921025105001', 'AJAYPANDI P', 'CL004', 'Electrical and Electronics Engineering'),
('STU302', 2, '921025105002', 'ANISH FATHIMA A', 'CL004', 'Electrical and Electronics Engineering'),
('STU303', 3, '921025105003', 'ANU SRI A', 'CL004', 'Electrical and Electronics Engineering'),
('STU304', 4, '921025105004', 'ASHMA BARVIN P', 'CL004', 'Electrical and Electronics Engineering'),
('STU305', 5, '921025105005', 'ASIFA M', 'CL004', 'Electrical and Electronics Engineering'),
('STU306', 6, '921025105006', 'ATCHAYA KEERTHIKA D', 'CL004', 'Electrical and Electronics Engineering'),
('STU307', 7, '921025105007', 'BEAULAH JOILE S', 'CL004', 'Electrical and Electronics Engineering'),
('STU308', 8, '921025105008', 'CHENNAKRISHNAN K', 'CL004', 'Electrical and Electronics Engineering'),
('STU309', 9, '921025105009', 'DEEPIKA V', 'CL004', 'Electrical and Electronics Engineering'),
('STU310', 10, '921025105010', 'DHANISHA M', 'CL004', 'Electrical and Electronics Engineering'),
('STU311', 11, '921025105011', 'DHARSHAN N', 'CL004', 'Electrical and Electronics Engineering'),
('STU312', 12, '921025105012', 'GOWSIKA S', 'CL004', 'Electrical and Electronics Engineering'),
('STU313', 13, '921025105013', 'HARCHINI M', 'CL004', 'Electrical and Electronics Engineering'),
('STU314', 14, '921025105014', 'HARINI M', 'CL004', 'Electrical and Electronics Engineering'),
('STU315', 15, '921025105015', 'HARISH K', 'CL004', 'Electrical and Electronics Engineering'),
('STU316', 16, '921025105016', 'HARISH L', 'CL004', 'Electrical and Electronics Engineering'),
('STU317', 17, '921025105017', 'HARISH M', 'CL004', 'Electrical and Electronics Engineering'),
('STU318', 18, '921025105018', 'HARITHABANU K', 'CL004', 'Electrical and Electronics Engineering'),
('STU319', 19, '921025105019', 'HEMAPRIYA N', 'CL004', 'Electrical and Electronics Engineering'),
('STU320', 20, '921025105020', 'JANANI A V', 'CL004', 'Electrical and Electronics Engineering'),
('STU321', 21, '921025105021', 'KAMALESH V', 'CL004', 'Electrical and Electronics Engineering'),
('STU322', 22, '921025105023', 'KEERTHIKA.C', 'CL004', 'Electrical and Electronics Engineering'),
('STU323', 23, '921025105024', 'KIRUBA A', 'CL004', 'Electrical and Electronics Engineering'),
('STU324', 24, '921025105025', 'LINGESH S (15.05.2007)', 'CL004', 'Electrical and Electronics Engineering'),
('STU325', 25, '921025105026', 'LINGESH S (13.02.2008)', 'CL004', 'Electrical and Electronics Engineering'),
('STU326', 26, '921025105027', 'MADHU MIDHA M', 'CL004', 'Electrical and Electronics Engineering'),
('STU327', 27, '921025105028', 'MANOJ PRAVEEN M', 'CL004', 'Electrical and Electronics Engineering'),
('STU328', 28, '921025105029', 'MATHESH M', 'CL004', 'Electrical and Electronics Engineering'),
('STU329', 29, '921025105030', 'MUGESHKUMAR M', 'CL004', 'Electrical and Electronics Engineering'),
('STU330', 30, '921025105031', 'NANDHAKUMAR S', 'CL004', 'Electrical and Electronics Engineering'),
('STU331', 31, '921025105032', 'NAVEENA N', 'CL004', 'Electrical and Electronics Engineering'),
('STU332', 32, '921025105033', 'NIGITHA R', 'CL004', 'Electrical and Electronics Engineering'),
('STU333', 33, '921025105034', 'NITHISH G', 'CL004', 'Electrical and Electronics Engineering'),
('STU334', 34, '921025105035', 'NITHYA DHARSHINI S', 'CL004', 'Electrical and Electronics Engineering'),
('STU335', 35, '921025105036', 'NIVESH E', 'CL004', 'Electrical and Electronics Engineering'),
('STU336', 36, '921025105037', 'PADMASHRI P', 'CL004', 'Electrical and Electronics Engineering'),
('STU337', 37, '921025105038', 'PAVITHRA S', 'CL004', 'Electrical and Electronics Engineering'),
('STU338', 38, '921025105039', 'POOJA M', 'CL004', 'Electrical and Electronics Engineering'),
('STU339', 39, '921025105040', 'PRITHIKA J', 'CL004', 'Electrical and Electronics Engineering'),
('STU340', 40, '921025105041', 'RAGAVAN S', 'CL004', 'Electrical and Electronics Engineering'),
('STU341', 41, '921025105042', 'RUBINASRI L', 'CL004', 'Electrical and Electronics Engineering'),
('STU342', 42, '921025105043', 'SABARI BALAJI A', 'CL004', 'Electrical and Electronics Engineering'),
('STU343', 43, '921025105044', 'SANTHOSH C', 'CL004', 'Electrical and Electronics Engineering'),
('STU344', 44, '921025105045', 'SANTHOSH M', 'CL004', 'Electrical and Electronics Engineering'),
('STU345', 45, '921025105046', 'SARAVANA MUTHU G', 'CL004', 'Electrical and Electronics Engineering'),
('STU346', 46, '921025105047', 'SATHANA R', 'CL004', 'Electrical and Electronics Engineering'),
('STU347', 47, '921025105048', 'SATHYA PRIYA S', 'CL004', 'Electrical and Electronics Engineering'),
('STU348', 48, '921025105050', 'SHAPNADEVI P', 'CL004', 'Electrical and Electronics Engineering'),
('STU349', 49, '921025105051', 'SIVABALAN B', 'CL004', 'Electrical and Electronics Engineering'),
('STU350', 50, '921025105052', 'SIVASAKTHI J', 'CL004', 'Electrical and Electronics Engineering'),
('STU351', 51, '921025105053', 'SOUNDHAR RAJAN V', 'CL004', 'Electrical and Electronics Engineering'),
('STU352', 52, '921025105054', 'SRIDHARSHINI K', 'CL004', 'Electrical and Electronics Engineering'),
('STU353', 53, '921025105055', 'SUNDARAADHITHAN S', 'CL004', 'Electrical and Electronics Engineering'),
('STU354', 54, '921025105056', 'THARUN M', 'CL004', 'Electrical and Electronics Engineering'),
('STU355', 55, '921025105057', 'THIRUKUMARAN M', 'CL004', 'Electrical and Electronics Engineering'),
('STU356', 56, '921025105058', 'VIDHYA R', 'CL004', 'Electrical and Electronics Engineering'),
('STU357', 57, '921025105059', 'YOGITH S', 'CL004', 'Electrical and Electronics Engineering'),
('STU358', 58, '921025105060', 'YUVATHI SRI A', 'CL004', 'Electrical and Electronics Engineering');
\n\n-- ============================================================
-- College CMS — Seed Data for ECE Department
-- Extracted from Timetable & Excel (2026-2027, II Year, III Sem)
-- ============================================================

-- ─────────────────────────────────────────
-- 1. DEPARTMENTS
-- ─────────────────────────────────────────
INSERT INTO departments (short_name, name, college_name) 
VALUES ('ECE', 'Electronics and Communication Engineering', 'Nadar Saraswathi College of Engineering and Technology, Theni')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ─────────────────────────────────────────
-- 2. CLASSES
-- ─────────────────────────────────────────
INSERT IGNORE INTO classes
  (id, name, department, semester, year_label, section, room_no, academic_year, batch, class_coordinator, asst_coordinator)
VALUES
  ('CL005', 'ECE - II Year - III Sem', 'Electronics and Communication Engineering', 3, 'II', 'A', 'Class Room 04', '2026-2027', '2025-2029', 'Mr. R. Pradeep Kumar', 'Mrs. S. Rajeshshree');

-- ─────────────────────────────────────────
-- 3. STAFFS  (password = 'faculty123' for all)
-- ─────────────────────────────────────────
INSERT IGNORE INTO staffs
  (id, name, short_name, designation, role, email, employee_id, password, class_role, department)
VALUES
  ('FAC041', 'Mr. Murugan', 'Mr. Murugan', 'AP/S&H', 'faculty', 'murugan.sh@nscet.edu.in', 'NSCET-SH-041', 'faculty123', NULL, 'Electronics and Communication Engineering'),
  ('FAC042', 'Mrs. T. Tamilselvi', 'T. Tamilselvi', 'AP/ECE', 'faculty', 'tamilselvi.ece@nscet.edu.in', 'NSCET-ECE-042', 'faculty123', NULL, 'Electronics and Communication Engineering'),
  ('FAC043', 'Mrs. S. Rajeshshree', 'S. Rajeshshree', 'AP/ECE', 'faculty', 'rajeshshree.ece@nscet.edu.in', 'NSCET-ECE-043', 'faculty123', 'Assistant Coordinator', 'Electronics and Communication Engineering'),
  ('FAC044', 'Dr. N. Mathavan', 'N. Mathavan', 'ASP/ECE', 'faculty', 'mathavan.ece@nscet.edu.in', 'NSCET-ECE-044', 'faculty123', NULL, 'Electronics and Communication Engineering'),
  ('FAC045', 'Dr. T. Venish Kumar', 'T. Venish Kumar', 'ASP/ECE', 'faculty', 'venishkumar.ece@nscet.edu.in', 'NSCET-ECE-045', 'faculty123', NULL, 'Electronics and Communication Engineering'),
  ('FAC046', 'Mr. R. Pradeep Kumar', 'R. Pradeep Kumar', 'AP/ECE', 'faculty', 'pradeepkumar.ece@nscet.edu.in', 'NSCET-ECE-046', 'faculty123', 'Class Coordinator', 'Electronics and Communication Engineering'),
  ('FAC047', 'S/H Staff', 'S/H Staff', 'AP/S&H', 'faculty', 'shstaff.eng@nscet.edu.in', 'NSCET-SH-047', 'faculty123', NULL, 'Electronics and Communication Engineering'),
  ('FAC048', 'Mrs. S. Kalaivani', 'S. Kalaivani', 'AP/ECE', 'faculty', 'kalaivani.ece@nscet.edu.in', 'NSCET-ECE-048', 'faculty123', NULL, 'Electronics and Communication Engineering'),
  ('FAC049', 'HOD ECE', 'HOD', 'HOD/ECE', 'hod', 'hod_ece@nscet.edu.in', 'NSCET-ECE-HOD', 'faculty123', NULL, 'Electronics and Communication Engineering');

-- ─────────────────────────────────────────
-- 4. SUBJECTS (ECE III Sem 2026-27)
-- ─────────────────────────────────────────
INSERT IGNORE INTO subjects
  (id, code, name, acronym, type, department, semester, faculty_id, class_id)
VALUES
  ('SUB040', 'MA25C05', 'Probability, Statistical and Random Process', 'PSRP', 'Theory', 'Electronics and Communication Engineering', 3, 'FAC041', 'CL005'),
  ('SUB041', 'EC25C04', 'Signals and Systems', 'SS', 'Theory', 'Electronics and Communication Engineering', 3, 'FAC042', 'CL005'),
  ('SUB042', 'EC25C05', 'Electronic Circuit Analysis', 'ECA', 'Theory', 'Electronics and Communication Engineering', 3, 'FAC043', 'CL005'),
  ('SUB043', 'EC25C06', 'Electro Magnetic Fields and Transmission Lines', 'EMF', 'Theory', 'Electronics and Communication Engineering', 3, 'FAC045', 'CL005'),
  ('SUB044', 'EC25C07', 'Digital System Design', 'DSD', 'Theory', 'Electronics and Communication Engineering', 3, 'FAC046', 'CL005'),
  ('SUB045', 'EC25C08', 'Digital System Design Laboratory', 'DSD LAB', 'Practical', 'Electronics and Communication Engineering', 3, 'FAC046', 'CL005'),
  ('SUB046', 'EC25C09', 'Electronic Circuits Laboratory', 'EC LAB', 'Practical', 'Electronics and Communication Engineering', 3, 'FAC044', 'CL005'),
  ('SUB047', 'EN25C03', 'English Communication Skill Laboratory-I', 'ENG LAB', 'Practical', 'Electronics and Communication Engineering', 3, 'FAC047', 'CL005'),
  ('SUB048', 'SD LAB', 'Skill Development Course', 'SD LAB', 'Skill', 'Electronics and Communication Engineering', 3, 'FAC047', 'CL005'),
  ('SUB049', 'NM', 'Naan Mudhalvan', 'NM', 'Skill', 'Electronics and Communication Engineering', 3, 'FAC048', 'CL005');

-- ─────────────────────────────────────────
-- 5. STUDENTS (ECE II Year, 2025-2029 Batch)
-- ─────────────────────────────────────────
INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
('STU401', 1, '921025106001', 'ABISHEK S', 'CL005', 'Electronics and Communication Engineering'),
('STU402', 2, '921025106002', 'AJAY SELVAM T', 'CL005', 'Electronics and Communication Engineering'),
('STU403', 3, '921025106003', 'ARAVINDH KUMAR D', 'CL005', 'Electronics and Communication Engineering'),
('STU404', 4, '921025106004', 'ARIVAZHAGAN G', 'CL005', 'Electronics and Communication Engineering'),
('STU405', 5, '921025106005', 'BARANIDHARAN R', 'CL005', 'Electronics and Communication Engineering'),
('STU406', 6, '921025106006', 'BALAJI B', 'CL005', 'Electronics and Communication Engineering'),
('STU407', 7, '921025106007', 'BHARANIDHARAN C', 'CL005', 'Electronics and Communication Engineering'),
('STU408', 8, '921025106008', 'DEEKSITHKASTHURIRAJAN R', 'CL005', 'Electronics and Communication Engineering'),
('STU409', 9, '921025106009', 'DEEPAKSRIRENGA D', 'CL005', 'Electronics and Communication Engineering'),
('STU410', 10, '921025106010', 'DHANUSREE M P', 'CL005', 'Electronics and Communication Engineering'),
('STU411', 11, '921025106011', 'DHARANI P', 'CL005', 'Electronics and Communication Engineering'),
('STU412', 12, '921025106012', 'DHARANI SHREE S', 'CL005', 'Electronics and Communication Engineering'),
('STU413', 13, '921025106013', 'DHIVASHINI M', 'CL005', 'Electronics and Communication Engineering'),
('STU414', 14, '921025106014', 'DHIYA M', 'CL005', 'Electronics and Communication Engineering'),
('STU415', 15, '921025106015', 'GIRIVASAN A', 'CL005', 'Electronics and Communication Engineering'),
('STU416', 16, '921025106016', 'GOWTHAM V', 'CL005', 'Electronics and Communication Engineering'),
('STU417', 17, '921025106017', 'HARINI K', 'CL005', 'Electronics and Communication Engineering'),
('STU418', 18, '921025106018', 'HEMA T', 'CL005', 'Electronics and Communication Engineering'),
('STU419', 19, '921025106019', 'HEMAVARSHINI A', 'CL005', 'Electronics and Communication Engineering'),
('STU420', 20, '921025106020', 'HIRUTHIKA S', 'CL005', 'Electronics and Communication Engineering'),
('STU421', 21, '921025106021', 'INUL ZAARIYA A', 'CL005', 'Electronics and Communication Engineering'),
('STU422', 22, '921025106022', 'JAMEER MOHAMED S', 'CL005', 'Electronics and Communication Engineering'),
('STU423', 23, '921025106023', 'JEEVADHARSHINI K', 'CL005', 'Electronics and Communication Engineering'),
('STU424', 24, '921025106024', 'JEEVADHARSINI B', 'CL005', 'Electronics and Communication Engineering'),
('STU425', 25, '921025106025', 'JEGATHEESWARI K', 'CL005', 'Electronics and Communication Engineering'),
('STU426', 26, '921025106026', 'KANAL AVINASH R', 'CL005', 'Electronics and Communication Engineering'),
('STU427', 27, '921025106027', 'KARTHICK S', 'CL005', 'Electronics and Communication Engineering'),
('STU428', 28, '921025106028', 'KARUNIYA K', 'CL005', 'Electronics and Communication Engineering'),
('STU429', 29, '921025106029', 'KAVIYA B', 'CL005', 'Electronics and Communication Engineering'),
('STU430', 30, '921025106030', 'KEERTHI SUKANYA S', 'CL005', 'Electronics and Communication Engineering'),
('STU431', 31, '921025106031', 'KIRUBASHREE S', 'CL005', 'Electronics and Communication Engineering'),
('STU432', 32, '921025106032', 'KIRUPAKARAN J', 'CL005', 'Electronics and Communication Engineering'),
('STU433', 33, '921025106033', 'KISHORE V', 'CL005', 'Electronics and Communication Engineering'),
('STU434', 34, '921025106034', 'LAUREL HAGI D', 'CL005', 'Electronics and Communication Engineering'),
('STU435', 35, '921025106035', 'LAVANYA M', 'CL005', 'Electronics and Communication Engineering'),
('STU436', 36, '921025106036', 'LEENA SHRI B', 'CL005', 'Electronics and Communication Engineering'),
('STU437', 37, '921025106037', 'LOGADHARSHINI R', 'CL005', 'Electronics and Communication Engineering'),
('STU438', 38, '921025106038', 'LOGAMMAL M', 'CL005', 'Electronics and Communication Engineering'),
('STU439', 39, '921025106039', 'MAHALAKSHMI P', 'CL005', 'Electronics and Communication Engineering'),
('STU440', 40, '921025106040', 'MANASA DEVI K', 'CL005', 'Electronics and Communication Engineering'),
('STU441', 41, '921025106041', 'MANISHA R', 'CL005', 'Electronics and Communication Engineering'),
('STU442', 42, '921025106042', 'MARLIYA FATHIMA S', 'CL005', 'Electronics and Communication Engineering'),
('STU443', 43, '921025106043', 'MEERA N', 'CL005', 'Electronics and Communication Engineering'),
('STU444', 44, '921025106044', 'MOHANAPRIYA S', 'CL005', 'Electronics and Communication Engineering'),
('STU445', 45, '921025106045', 'MONIGA R', 'CL005', 'Electronics and Communication Engineering'),
('STU446', 46, '921025106046', 'NAVTHEEB A', 'CL005', 'Electronics and Communication Engineering'),
('STU447', 47, '921025106047', 'NELAKSHI A B', 'CL005', 'Electronics and Communication Engineering'),
('STU448', 48, '921025106048', 'NISHANTHINI K', 'CL005', 'Electronics and Communication Engineering'),
('STU449', 49, '921025106049', 'NITHISH K T', 'CL005', 'Electronics and Communication Engineering'),
('STU450', 50, '921025106050', 'PANDEESWARI M', 'CL005', 'Electronics and Communication Engineering'),
('STU451', 51, '921025106052', 'PRAVEEN C', 'CL005', 'Electronics and Communication Engineering'),
('STU452', 52, '921025106053', 'SIVA E', 'CL005', 'Electronics and Communication Engineering'),
('STU453', 53, '921025106054', 'SIVAKAMI P', 'CL005', 'Electronics and Communication Engineering'),
('STU454', 54, '921025106055', 'SRILEKHA R', 'CL005', 'Electronics and Communication Engineering'),
('STU455', 55, '921025106056', 'SURIYAPRAKASH K', 'CL005', 'Electronics and Communication Engineering'),
('STU456', 56, '921025106057', 'THEEPTHIGA K', 'CL005', 'Electronics and Communication Engineering'),
('STU457', 57, '921025106058', 'VAISHNAVI S', 'CL005', 'Electronics and Communication Engineering'),
('STU458', 58, '921025106059', 'VIKRAM N', 'CL005', 'Electronics and Communication Engineering');
\n\n-- ============================================================
-- College CMS — Seed Data for Mechanical Engineering Department
-- Extracted from Timetable & Excel (2026-2027, II Year, III Sem)
-- ============================================================

-- ─────────────────────────────────────────
-- 1. DEPARTMENTS
-- ─────────────────────────────────────────
INSERT INTO departments (short_name, name, college_name) 
VALUES ('MECH', 'Mechanical Engineering', 'Nadar Saraswathi College of Engineering and Technology, Theni')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ─────────────────────────────────────────
-- 2. CLASSES
-- ─────────────────────────────────────────
INSERT IGNORE INTO classes
  (id, name, department, semester, year_label, section, room_no, academic_year, batch, class_coordinator, asst_coordinator)
VALUES
  ('CL006', 'MECH - II Year - III Sem', 'Mechanical Engineering', 3, 'II', 'A', 'Class Room 12', '2026-2027', '2025-2029', 'Dr. B. Nagarajan', 'Mr. R. Nagaraja');

-- ─────────────────────────────────────────
-- 3. STAFFS  (password = 'faculty123' for all)
-- ─────────────────────────────────────────
INSERT IGNORE INTO staffs
  (id, name, short_name, designation, role, email, employee_id, password, class_role, department)
VALUES
  ('FAC051', 'Dr. B. Mallaiyasamy', 'B. Mallaiyasamy', 'ASP/S&H', 'faculty', 'mallaiyasamy.sh@nscet.edu.in', 'NSCET-SH-051', 'faculty123', NULL, 'Mechanical Engineering'),
  ('FAC052', 'Dr. A. Vennimalai Rajan', 'A. Vennimalai Rajan', 'ASP/Mech', 'faculty', 'vennimalairajan.mech@nscet.edu.in', 'NSCET-MECH-052', 'faculty123', NULL, 'Mechanical Engineering'),
  ('FAC053', 'Dr. B. Nagarajan', 'B. Nagarajan', 'ASP/Mech', 'faculty', 'nagarajan.mech@nscet.edu.in', 'NSCET-MECH-053', 'faculty123', 'Class Coordinator', 'Mechanical Engineering'),
  ('FAC054', 'Mr. S. Harikishore', 'S. Harikishore', 'AP/Mech', 'faculty', 'harikishore.mech@nscet.edu.in', 'NSCET-MECH-054', 'faculty123', NULL, 'Mechanical Engineering'),
  ('FAC055', 'Mr. R. Nagaraja', 'R. Nagaraja', 'AP/Mech', 'faculty', 'nagaraja.mech@nscet.edu.in', 'NSCET-MECH-055', 'faculty123', 'Class Coordinator', 'Mechanical Engineering'),
  ('FAC056', 'Mr. R. Pradeep Kumar', 'R. Pradeep Kumar', 'AP/ECE', 'faculty', 'pradeepkumar.ece@nscet.edu.in', 'NSCET-ECE-056', 'faculty123', NULL, 'Mechanical Engineering'),
  ('FAC057', 'Mr. R.C. Richard Britto', 'R.C. Richard Britto', 'AP/Eng', 'faculty', 'richardbritto.eng@nscet.edu.in', 'NSCET-ENG-057', 'faculty123', NULL, 'Mechanical Engineering'),
  ('FAC058', 'Dr. S. Sinthan', 'S. Sinthan', 'Librarian', 'faculty', 'sinthan.lib@nscet.edu.in', 'NSCET-LIB-058', 'faculty123', NULL, 'Mechanical Engineering'),
  ('FAC059', 'HOD MECH', 'HOD', 'HOD/Mech', 'hod', 'hod_mech@nscet.edu.in', 'NSCET-MECH-HOD', 'faculty123', NULL, 'Mechanical Engineering');

-- ─────────────────────────────────────────
-- 4. SUBJECTS (MECH III Sem 2026-27)
-- ─────────────────────────────────────────
INSERT IGNORE INTO subjects
  (id, code, name, acronym, type, department, semester, faculty_id, class_id)
VALUES
  ('SUB050', 'MA25C03', 'Computational Differential Equations', 'CDE', 'Theory', 'Mechanical Engineering', 3, 'FAC051', 'CL006'),
  ('SUB051', 'ME25C07', 'Applied Engineering Mechanics', 'AEM', 'Theory', 'Mechanical Engineering', 3, 'FAC052', 'CL006'),
  ('SUB052', 'ME25301', 'Engineering Thermodynamics', 'ETD', 'Theory', 'Mechanical Engineering', 3, 'FAC053', 'CL006'),
  ('SUB053', 'CE25C11', 'Strength of Materials', 'SOM', 'Theory', 'Mechanical Engineering', 3, 'FAC054', 'CL006'),
  ('SUB054', 'ME25C08', 'Metallurgy and Materials Science', 'MMS', 'Theory', 'Mechanical Engineering', 3, 'FAC055', 'CL006'),
  ('SUB055', 'EC25C17', 'Embedded Systems', 'ES', 'Theory', 'Mechanical Engineering', 3, 'FAC056', 'CL006'),
  ('SUB056', 'CE25C11_LAB', 'Strength of Materials Laboratory', 'SOM (LAB)', 'Practical', 'Mechanical Engineering', 3, 'FAC054', 'CL006'),
  ('SUB057', 'EN25C03', 'English Communication Skills Laboratory - I', 'ECS - I (LAB)', 'Practical', 'Mechanical Engineering', 3, 'FAC057', 'CL006'),
  ('SUB058', 'SDC - I', 'Skill Development Course - I', 'SDC - I', 'Skill', 'Mechanical Engineering', 3, 'FAC054', 'CL006'),
  ('SUB059', 'NM', 'NAAN MUDHALVAN (Foundation Skills for Employability)', 'NM', 'Skill', 'Mechanical Engineering', 3, 'FAC054', 'CL006'),
  ('SUB060', 'LIB', 'LIBRARY', 'LIB', 'Other', 'Mechanical Engineering', 3, 'FAC058', 'CL006');

-- ─────────────────────────────────────────
-- 5. STUDENTS (MECH II Year, 2025-2029 Batch)
-- ─────────────────────────────────────────
INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
('STU501', 1, '921025114001', 'ABINESH P', 'CL006', 'Mechanical Engineering'),
('STU502', 2, '921025114002', 'AKASH K', 'CL006', 'Mechanical Engineering'),
('STU503', 3, '921025114003', 'AZHAGARRAJA P', 'CL006', 'Mechanical Engineering'),
('STU504', 4, '921025114004', 'BHUVANESHPANDI S', 'CL006', 'Mechanical Engineering'),
('STU505', 5, '921025114005', 'BUVANESWARAN S', 'CL006', 'Mechanical Engineering'),
('STU506', 6, '921025114006', 'DEEPAK A', 'CL006', 'Mechanical Engineering'),
('STU507', 7, '921025114007', 'DEEPAK KISHAN R', 'CL006', 'Mechanical Engineering'),
('STU508', 8, '921025114008', 'DESIKASRI S', 'CL006', 'Mechanical Engineering'),
('STU509', 9, '921025114009', 'DHIVYAJOTHI SREE K', 'CL006', 'Mechanical Engineering'),
('STU510', 10, '921025114010', 'DIVAHAR S', 'CL006', 'Mechanical Engineering'),
('STU511', 11, '921025114011', 'DURAISELVAN K', 'CL006', 'Mechanical Engineering'),
('STU512', 12, '921025114012', 'GOWMARIGAYATHRI R', 'CL006', 'Mechanical Engineering'),
('STU513', 13, '921025114013', 'HARISHMA SRI R', 'CL006', 'Mechanical Engineering'),
('STU514', 14, '921025114014', 'HARRYS R', 'CL006', 'Mechanical Engineering'),
('STU515', 15, '921025114015', 'JABARMYDEEN U', 'CL006', 'Mechanical Engineering'),
('STU516', 16, '921025114016', 'KABISH R', 'CL006', 'Mechanical Engineering'),
('STU517', 17, '921025114018', 'KAVIARASAN N', 'CL006', 'Mechanical Engineering'),
('STU518', 18, '921025114019', 'KAVIN G', 'CL006', 'Mechanical Engineering'),
('STU519', 19, '921025114020', 'KIRTHICK M', 'CL006', 'Mechanical Engineering'),
('STU520', 20, '921025114022', 'KISHOR KUMAR.V', 'CL006', 'Mechanical Engineering'),
('STU521', 21, '921025114023', 'KOWSHIK HEMA CHANDRAN M', 'CL006', 'Mechanical Engineering'),
('STU522', 22, '921025114024', 'MARIMUTHU S', 'CL006', 'Mechanical Engineering'),
('STU523', 23, '921025114025', 'MATHESH M', 'CL006', 'Mechanical Engineering'),
('STU524', 24, '921025114026', 'MOHAMED ASKAR M', 'CL006', 'Mechanical Engineering'),
('STU525', 25, '921025114027', 'MOHAMED THARIK A', 'CL006', 'Mechanical Engineering'),
('STU526', 26, '921025114028', 'MOHANARAJAN M', 'CL006', 'Mechanical Engineering'),
('STU527', 27, '921025114029', 'MONISH S', 'CL006', 'Mechanical Engineering'),
('STU528', 28, '921025114030', 'MUTHUPANDI G', 'CL006', 'Mechanical Engineering'),
('STU529', 29, '921025114031', 'NIKASH S', 'CL006', 'Mechanical Engineering'),
('STU530', 30, '921025114032', 'PERARASAN S', 'CL006', 'Mechanical Engineering'),
('STU531', 31, '921025114033', 'POOVESH M', 'CL006', 'Mechanical Engineering'),
('STU532', 32, '921025114034', 'RANJITH P', 'CL006', 'Mechanical Engineering'),
('STU533', 33, '921025114035', 'SANJAY PANDIAN G', 'CL006', 'Mechanical Engineering'),
('STU534', 34, '921025114036', 'SANTHOSH KUMAR B', 'CL006', 'Mechanical Engineering'),
('STU535', 35, '921025114037', 'SANTHOSH SRIRAM R', 'CL006', 'Mechanical Engineering'),
('STU536', 36, '921025114038', 'SURIYA PRAKASH J', 'CL006', 'Mechanical Engineering'),
('STU537', 37, '921025114039', 'THIRUNAVUKKARASU B', 'CL006', 'Mechanical Engineering'),
('STU538', 38, '921025114040', 'VIGNESHWARAN M', 'CL006', 'Mechanical Engineering'),
('STU539', 39, '921025114041', 'VIGNESHWARAN V', 'CL006', 'Mechanical Engineering'),
('STU540', 40, '921025114042', 'VISHNUVARATHAN', 'CL006', 'Mechanical Engineering'),
('STU541', 41, '921025114043', 'VISHWA V', 'CL006', 'Mechanical Engineering'),
('STU542', 42, '921025114044', 'YUVARAJ M', 'CL006', 'Mechanical Engineering');
\n\n-- ============================================================
-- College CMS — Seed Data for Civil Engineering Department
-- Extracted from Timetable & Excel (2026-2027, II Year, III Sem)
-- ============================================================

-- ─────────────────────────────────────────
-- 1. DEPARTMENTS
-- ─────────────────────────────────────────
INSERT INTO departments (short_name, name, college_name) 
VALUES ('CIVIL', 'Civil Engineering', 'Nadar Saraswathi College of Engineering and Technology, Theni')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ─────────────────────────────────────────
-- 2. CLASSES
-- ─────────────────────────────────────────
INSERT IGNORE INTO classes
  (id, name, department, semester, year_label, section, room_no, academic_year, batch, class_coordinator, asst_coordinator)
VALUES
  ('CL007', 'CIVIL - II Year - III Sem', 'Civil Engineering', 3, 'II', 'A', '19', '2026-2027', '2025-2029', 'Mrs. S. Gayathri', 'Mr. T. Hariprasath');

-- ─────────────────────────────────────────
-- 3. STAFFS  (password = 'faculty123' for all)
-- ─────────────────────────────────────────
INSERT IGNORE INTO staffs
  (id, name, short_name, designation, role, email, employee_id, password, class_role, department)
VALUES
  ('FAC061', 'Dr. B. Mallaiyasamy', 'B. Mallaiyasamy', 'ASP/S&H', 'faculty', 'mallaiyasamy.sh@nscet.edu.in', 'NSCET-SH-061', 'faculty123', NULL, 'Civil Engineering'),
  ('FAC062', 'Mrs. S. Gayathri', 'S. Gayathri', 'AP/Civil', 'faculty', 'gayathri.civil@nscet.edu.in', 'NSCET-CIVIL-062', 'faculty123', 'Class Coordinator', 'Civil Engineering'),
  ('FAC063', 'Mr. P. Arul Jebaraj', 'P. Arul Jebaraj', 'AP/Civil', 'faculty', 'aruljebaraj.civil@nscet.edu.in', 'NSCET-CIVIL-063', 'faculty123', NULL, 'Civil Engineering'),
  ('FAC064', 'Mr. R. Shanmugapriyan', 'R. Shanmugapriyan', 'AP/Civil', 'faculty', 'shanmugapriyan.civil@nscet.edu.in', 'NSCET-CIVIL-064', 'faculty123', NULL, 'Civil Engineering'),
  ('FAC065', 'Mr. T. Hariprasath', 'T. Hariprasath', 'AP/Civil', 'faculty', 'hariprasath.civil@nscet.edu.in', 'NSCET-CIVIL-065', 'faculty123', 'Assistant Coordinator', 'Civil Engineering'),
  ('FAC066', 'Mrs. M. Kanimozhi', 'M. Kanimozhi', 'AP/Civil', 'faculty', 'kanimozhi.civil@nscet.edu.in', 'NSCET-CIVIL-066', 'faculty123', NULL, 'Civil Engineering'),
  ('FAC067', 'Mrs. M. Sindhu', 'M. Sindhu', 'AP/Civil', 'faculty', 'sindhu.civil@nscet.edu.in', 'NSCET-CIVIL-067', 'faculty123', NULL, 'Civil Engineering'),
  ('FAC068', 'Mrs. P. Aadhitya', 'P. Aadhitya', 'AP/Civil', 'faculty', 'aadhitya.civil@nscet.edu.in', 'NSCET-CIVIL-068', 'faculty123', NULL, 'Civil Engineering'),
  ('FAC069', 'Mrs. K. Benita Merlin Isabella', 'K. Benita Merlin Isabella', 'AP/Civil', 'faculty', 'benita.civil@nscet.edu.in', 'NSCET-CIVIL-069', 'faculty123', NULL, 'Civil Engineering'),
  ('FAC070', 'Mrs. Devi Priya', 'Devi Priya', 'AP/Eng', 'faculty', 'devipriya.eng@nscet.edu.in', 'NSCET-ENG-070', 'faculty123', NULL, 'Civil Engineering'),
  ('FAC071', 'HOD CIVIL', 'HOD', 'HOD/Civil', 'hod', 'hod_civil@nscet.edu.in', 'NSCET-CIVIL-HOD', 'faculty123', NULL, 'Civil Engineering');

-- ─────────────────────────────────────────
-- 4. SUBJECTS (CIVIL III Sem 2026-27)
-- ─────────────────────────────────────────
INSERT IGNORE INTO subjects
  (id, code, name, acronym, type, department, semester, faculty_id, class_id)
VALUES
  ('SUB070', 'MA25C03', 'Computational Differential Equations', 'CDE', 'Theory', 'Civil Engineering', 3, 'FAC061', 'CL007'),
  ('SUB071', 'CE25C02', 'Fluid Mechanics and Machinery', 'FMM', 'Theory', 'Civil Engineering', 3, 'FAC062', 'CL007'),
  ('SUB072', 'AG25C01', 'Engineering Geology', 'EG', 'Theory', 'Civil Engineering', 3, 'FAC063', 'CL007'),
  ('SUB073', 'CE25301', 'Strength of Materials I (L/T)', 'SOM I', 'Theory', 'Civil Engineering', 3, 'FAC064', 'CL007'),
  ('SUB074', 'CE25C03', 'Surveying and Geomatics', 'S&G', 'Theory', 'Civil Engineering', 3, 'FAC065', 'CL007'),
  ('SUB075', 'SDC I', 'Skill Development Course I (L/T)', 'SDC I', 'Skill', 'Civil Engineering', 3, 'FAC066', 'CL007'),
  ('SUB076', 'CE25302', 'Computer-aided Building Drawing', 'FMM LAB', 'Practical', 'Civil Engineering', 3, 'FAC067', 'CL007'),
  ('SUB077', 'CE25301_LAB', 'Strength of Materials I Laboratory', 'SOM I LAB', 'Practical', 'Civil Engineering', 3, 'FAC064', 'CL007'),
  ('SUB078', 'NM', 'Naan Mudhalvan', 'NM', 'Skill', 'Civil Engineering', 3, 'FAC066', 'CL007'),
  ('SUB079', 'CE25C04', 'Surveying and Geomatics Laboratory', 'S&G LAB', 'Practical', 'Civil Engineering', 3, 'FAC065', 'CL007'),
  ('SUB080', 'EN25C03', 'English Communication Skills Laboratory - II', 'ECS LAB', 'Practical', 'Civil Engineering', 3, 'FAC070', 'CL007');

-- ─────────────────────────────────────────
-- 5. STUDENTS (CIVIL II Year, 2025-2029 Batch)
-- ─────────────────────────────────────────
INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
('STU601', 1, '921025103001', 'AFREEN FATHIMA M', 'CL007', 'Civil Engineering'),
('STU602', 2, '921025103002', 'ANITHA A', 'CL007', 'Civil Engineering'),
('STU603', 3, '921025103003', 'ARAVINTHKUMAR T', 'CL007', 'Civil Engineering'),
('STU604', 4, '921025103004', 'ARO NIRANJAN S', 'CL007', 'Civil Engineering'),
('STU605', 5, '921025103005', 'ATCHAYA S', 'CL007', 'Civil Engineering'),
('STU606', 6, '921025103006', 'BOOMA P', 'CL007', 'Civil Engineering'),
('STU607', 7, '921025103007', 'DEEPIKA K', 'CL007', 'Civil Engineering'),
('STU608', 8, '921025103008', 'DHANYA SHREE K', 'CL007', 'Civil Engineering'),
('STU609', 9, '921025103009', 'ENIYA K', 'CL007', 'Civil Engineering'),
('STU610', 10, '921025103010', 'GIRI S P', 'CL007', 'Civil Engineering'),
('STU611', 11, '921025103011', 'HARSHA M', 'CL007', 'Civil Engineering'),
('STU612', 12, '921025103012', 'KAVIYADHARSHINI K', 'CL007', 'Civil Engineering'),
('STU613', 13, '921025103013', 'LOGESHWARI P', 'CL007', 'Civil Engineering'),
('STU614', 14, '921025103014', 'MAITHIRAN P', 'CL007', 'Civil Engineering'),
('STU615', 15, '921025103015', 'MENAKA DEVI K', 'CL007', 'Civil Engineering'),
('STU616', 16, '921025103016', 'NISHA GANDHI S', 'CL007', 'Civil Engineering'),
('STU617', 17, '921025103017', 'NIVEDHA MANI M', 'CL007', 'Civil Engineering'),
('STU618', 18, '921025103018', 'PADMASRI N', 'CL007', 'Civil Engineering'),
('STU619', 19, '921025103019', 'PRASANNA DEVI G', 'CL007', 'Civil Engineering'),
('STU620', 20, '921025103020', 'RAMAKRISHNAN M', 'CL007', 'Civil Engineering'),
('STU621', 21, '921025103021', 'RUBASREE K', 'CL007', 'Civil Engineering'),
('STU622', 22, '921025103022', 'RUTHREVANTH S', 'CL007', 'Civil Engineering'),
('STU623', 23, '921025103023', 'SANGEETHA M', 'CL007', 'Civil Engineering'),
('STU624', 24, '921025103024', 'SARANYA A', 'CL007', 'Civil Engineering'),
('STU625', 25, '921025103025', 'SARAVANAKUMAR P', 'CL007', 'Civil Engineering'),
('STU626', 26, '921025103026', 'SATHANA R', 'CL007', 'Civil Engineering'),
('STU627', 27, '921025103027', 'SHARMILADEVI M', 'CL007', 'Civil Engineering'),
('STU628', 28, '921025103028', 'SRI KANTH M', 'CL007', 'Civil Engineering'),
('STU629', 29, '921025103029', 'THARUNIMA S', 'CL007', 'Civil Engineering'),
('STU630', 30, '921025103030', 'VIJAYABHARATHI M', 'CL007', 'Civil Engineering'),
('STU631', 31, '921025103031', 'YAZHINI N', 'CL007', 'Civil Engineering'),
('STU632', 32, '921025103032', 'YUVASRI M', 'CL007', 'Civil Engineering');
