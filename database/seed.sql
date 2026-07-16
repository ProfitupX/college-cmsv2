-- ============================================================
-- College CMS — Seed Data (Real Data)
-- Run this AFTER schema.sql
-- ============================================================

USE college_cms;

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
