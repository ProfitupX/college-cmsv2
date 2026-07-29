-- ============================================================
-- College CMS — Seed Data for CSE Department
-- ============================================================

USE college_cms;

-- ─────────────────────────────────────────
-- DEPARTMENTS
-- ─────────────────────────────────────────
INSERT INTO departments (short_name, name, college_name) 
VALUES ('CSE', 'Computer Science and Engineering', 'Nadar Saraswathi College of Engineering and Technology, Theni')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ─────────────────────────────────────────
-- CLASSES
-- ─────────────────────────────────────────
INSERT IGNORE INTO classes
  (id, name, department, semester, year_label, section, room_no, academic_year, batch, class_coordinator, asst_coordinator)
VALUES
  ('CL002', 'CSE - II Year - III Sem', 'Computer Science and Engineering', 3, 'II', 'A', 'CR-11', '2026-2027', '2025-2029', 'Mrs. R.Archana', 'Mrs.V.Anusuya');

-- ─────────────────────────────────────────
-- STAFFS  (password = 'faculty123' for all)
-- ─────────────────────────────────────────
INSERT IGNORE INTO staffs
  (id, name, short_name, designation, role, email, employee_id, password, class_role, department)
VALUES
  ('FAC010', 'Mrs. M. Karunyah', 'M. Karunyah', 'AP', 'faculty', 'karunyah.maths@nscet.edu.in', 'NSCET-MATHS-010', 'faculty123', NULL, 'Computer Science and Engineering'),
  ('FAC011', 'Mrs. V. Anusuya', 'V. Anusuya', 'AP', 'faculty', 'anusuya.cse@nscet.edu.in', 'NSCET-CSE-011', 'faculty123', 'Assistant Coordinator', 'Computer Science and Engineering'),
  ('FAC012', 'Mrs. R. Archana', 'R. Archana', 'AP', 'faculty', 'archana.cse@nscet.edu.in', 'NSCET-CSE-012', 'faculty123', 'Class Coordinator', 'Computer Science and Engineering'),
  ('FAC013', 'Mrs. M. Venkata Lakshmi', 'M. Venkata Lakshmi', 'AP', 'faculty', 'venkatalakshmi.cse@nscet.edu.in', 'NSCET-CSE-013', 'faculty123', NULL, 'Computer Science and Engineering'),
  ('FAC014', 'Dr. J. Mathalai Raj', 'J. Mathalai Raj', 'HOD CSE', 'hod', 'mathalairaj.cse@nscet.edu.in', 'NSCET-CSE-014', 'faculty123', NULL, 'Computer Science and Engineering'),
  ('FAC015', 'Mrs. V. Vinothini', 'V. Vinothini', 'AP', 'faculty', 'vinothini.cse@nscet.edu.in', 'NSCET-CSE-015', 'faculty123', NULL, 'Computer Science and Engineering'),
  ('FAC016', 'Mrs. T. Rathimala', 'T. Rathimala', 'AP', 'faculty', 'rathimala.cse@nscet.edu.in', 'NSCET-CSE-016', 'faculty123', NULL, 'Computer Science and Engineering'),
  ('FAC017', 'Mr. R. C. Richard Britto', 'R. C. Richard Britto', 'AP', 'faculty', 'richardbritto.eng@nscet.edu.in', 'NSCET-ENG-017', 'faculty123', NULL, 'Computer Science and Engineering');

-- ─────────────────────────────────────────
-- SUBJECTS (CSE III Sem 2026-27)
-- ─────────────────────────────────────────
INSERT IGNORE INTO subjects
  (id, code, name, acronym, type, department, semester, faculty_id, class_id)
VALUES
  ('SUB010', 'MA25C08', 'Discrete Mathematics', 'DM', 'Theory', 'Computer Science and Engineering', 3, 'FAC010', 'CL002'),
  ('SUB011', 'CS25C11', 'Operating Systems', 'OS', 'Theory', 'Computer Science and Engineering', 3, 'FAC011', 'CL002'),
  ('SUB012', 'CS25C10', 'Object Oriented Software Engineering', 'OOSE', 'Theory', 'Computer Science and Engineering', 3, 'FAC012', 'CL002'),
  ('SUB013', 'CS25C08', 'Data Structures', 'DS', 'Theory-cum-Lab', 'Computer Science and Engineering', 3, 'FAC013', 'CL002'),
  ('SUB014', 'CS25C09', 'Java Programming', 'JAVA', 'Theory-cum-Lab', 'Computer Science and Engineering', 3, 'FAC014', 'CL002'),
  ('SUB015', 'NM', 'Naan Mudhalvan Course', 'NM', 'Skill', 'Computer Science and Engineering', 3, 'FAC012', 'CL002'),
  ('SUB016', 'SD', 'Skill Development Course-I', 'SD', 'Skill', 'Computer Science and Engineering', 3, 'FAC016', 'CL002'),
  ('SUB017', 'EN25C03', 'English Communication Skills Laboratory', 'ENG', 'Practical', 'Computer Science and Engineering', 3, 'FAC017', 'CL002');

-- ─────────────────────────────────────────
-- STUDENTS (CSE II Year)
-- ─────────────────────────────────────────
INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
('STU101', 1, '921025104001', 'AATHISUNDARARAJAN N', 'CL002', 'Computer Science and Engineering'),
('STU102', 2, '921025104002', 'AZLINA M', 'CL002', 'Computer Science and Engineering'),
('STU103', 3, '921025104003', 'BHARATHI M', 'CL002', 'Computer Science and Engineering'),
('STU104', 4, '921025104004', 'BHAVADHARANI M', 'CL002', 'Computer Science and Engineering'),
('STU105', 5, '921025104005', 'DEVA GURU G', 'CL002', 'Computer Science and Engineering'),
('STU106', 6, '921025104006', 'DHANUSHA SRI J', 'CL002', 'Computer Science and Engineering'),
('STU107', 7, '921025104007', 'DHARSHINI S', 'CL002', 'Computer Science and Engineering'),
('STU108', 8, '921025104008', 'DHARSHITH R', 'CL002', 'Computer Science and Engineering'),
('STU109', 9, '921025104009', 'DIVYA K', 'CL002', 'Computer Science and Engineering'),
('STU110', 10, '921025104010', 'DURGALAKSHMI M', 'CL002', 'Computer Science and Engineering'),
('STU111', 11, '921025104011', 'GAYATHRI M', 'CL002', 'Computer Science and Engineering'),
('STU112', 12, '921025104012', 'GOKULA KANNAN P G', 'CL002', 'Computer Science and Engineering'),
('STU113', 13, '921025104013', 'HAASINI K', 'CL002', 'Computer Science and Engineering'),
('STU114', 14, '921025104014', 'HARIGARAN K', 'CL002', 'Computer Science and Engineering'),
('STU115', 15, '921025104015', 'HARINI K', 'CL002', 'Computer Science and Engineering'),
('STU116', 16, '921025104016', 'HARSHINI S', 'CL002', 'Computer Science and Engineering'),
('STU117', 17, '921025104017', 'HARSHITHA S', 'CL002', 'Computer Science and Engineering'),
('STU118', 18, '921025104018', 'IRFANA S', 'CL002', 'Computer Science and Engineering'),
('STU119', 19, '921025104019', 'JAYANTHRA K J', 'CL002', 'Computer Science and Engineering'),
('STU120', 20, '921025104020', 'JEYA SREE P', 'CL002', 'Computer Science and Engineering'),
('STU121', 21, '921025104021', 'JUHI NUSHRATH H', 'CL002', 'Computer Science and Engineering'),
('STU122', 22, '921025104022', 'KARTHIK OMSHAKTI K', 'CL002', 'Computer Science and Engineering'),
('STU123', 23, '921025104023', 'KAVIYA K', 'CL002', 'Computer Science and Engineering'),
('STU124', 24, '921025104024', 'LATHIKA K', 'CL002', 'Computer Science and Engineering'),
('STU125', 25, '921025104025', 'LISHANTHI S', 'CL002', 'Computer Science and Engineering'),
('STU126', 26, '921025104026', 'MAHIMA M', 'CL002', 'Computer Science and Engineering'),
('STU127', 27, '921025104027', 'MAHISHA S', 'CL002', 'Computer Science and Engineering'),
('STU128', 28, '921025104028', 'MANIKANDAN P', 'CL002', 'Computer Science and Engineering'),
('STU129', 29, '921025104029', 'MEGADHARSHINI S', 'CL002', 'Computer Science and Engineering'),
('STU130', 30, '921025104030', 'MOHAMED AFSAL K', 'CL002', 'Computer Science and Engineering'),
('STU131', 31, '921025104031', 'MOHANASANTHOSH V', 'CL002', 'Computer Science and Engineering'),
('STU132', 32, '921025104032', 'MONISHA S', 'CL002', 'Computer Science and Engineering'),
('STU133', 33, '921025104033', 'NETHRA V', 'CL002', 'Computer Science and Engineering'),
('STU134', 34, '921025104034', 'NISHA K', 'CL002', 'Computer Science and Engineering'),
('STU135', 35, '921025104035', 'NITHARSHANA S', 'CL002', 'Computer Science and Engineering'),
('STU136', 36, '921025104036', 'POOJA SRI P', 'CL002', 'Computer Science and Engineering'),
('STU137', 37, '921025104037', 'PRATHIKSHASRI S', 'CL002', 'Computer Science and Engineering'),
('STU138', 38, '921025104038', 'PRINCYMISPHA C', 'CL002', 'Computer Science and Engineering'),
('STU139', 39, '921025104039', 'PRIYADHARSHINI P', 'CL002', 'Computer Science and Engineering'),
('STU140', 40, '921025104040', 'PUGAZHENTHI G', 'CL002', 'Computer Science and Engineering'),
('STU141', 41, '921025104041', 'RAGASRI V', 'CL002', 'Computer Science and Engineering'),
('STU142', 42, '921025104042', 'RIYA R', 'CL002', 'Computer Science and Engineering'),
('STU143', 43, '921025104043', 'SAMRUTHA P', 'CL002', 'Computer Science and Engineering'),
('STU144', 44, '921025104044', 'SANTHANAGOWSHIKA.K', 'CL002', 'Computer Science and Engineering'),
('STU145', 45, '921025104045', 'SANTHIYA C', 'CL002', 'Computer Science and Engineering'),
('STU146', 46, '921025104046', 'SANTHOSI S', 'CL002', 'Computer Science and Engineering'),
('STU147', 47, '921025104047', 'SELVALAKSHMI M', 'CL002', 'Computer Science and Engineering'),
('STU148', 48, '921025104048', 'SHAHANA P', 'CL002', 'Computer Science and Engineering'),
('STU149', 49, '921025104049', 'SHAKTHI R', 'CL002', 'Computer Science and Engineering'),
('STU150', 50, '921025104050', 'SIVAKUMAR K', 'CL002', 'Computer Science and Engineering'),
('STU151', 51, '921025104051', 'SOWMIYA A', 'CL002', 'Computer Science and Engineering'),
('STU152', 52, '921025104052', 'SREEJA R', 'CL002', 'Computer Science and Engineering'),
('STU153', 53, '921025104053', 'SRIVAISHNAVI M', 'CL002', 'Computer Science and Engineering'),
('STU154', 54, '921025104054', 'SUBATHRA M', 'CL002', 'Computer Science and Engineering'),
('STU155', 55, '921025104055', 'SURIYA T', 'CL002', 'Computer Science and Engineering'),
('STU156', 56, '921025104056', 'VARSHINI K', 'CL002', 'Computer Science and Engineering'),
('STU157', 57, '921025104057', 'VISHAL R', 'CL002', 'Computer Science and Engineering'),
('STU158', 58, '921025104058', 'YASHIKAJAISHREE M', 'CL002', 'Computer Science and Engineering'),
('STU159', 59, '921025104059', 'YOKHITHA V', 'CL002', 'Computer Science and Engineering'),
('STU160', 60, '921025104060', 'YOSHITHA K', 'CL002', 'Computer Science and Engineering');
