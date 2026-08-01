-- ============================================================
-- College CMS — Seed Data for AI&DS Department
-- ============================================================

-- USE college_cms;

-- ─────────────────────────────────────────
-- DEPARTMENTS
-- ─────────────────────────────────────────
INSERT INTO departments (short_name, name, college_name) 
VALUES ('AIDS', 'Artificial Intelligence and Data Science', 'Nadar Saraswathi College of Engineering and Technology, Theni')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ─────────────────────────────────────────
-- CLASSES
-- ─────────────────────────────────────────
INSERT IGNORE INTO classes
  (id, name, department, semester, year_label, section, room_no, academic_year, batch, class_coordinator, asst_coordinator)
VALUES
  ('CL003', 'AI&DS - II Year - III Sem', 'Artificial Intelligence and Data Science', 3, 'II', 'A', 'CR-25', '2026-2027', '2025-2029', 'Mr. S. Kodeeswaran', 'Mrs. K. Jenifer');

-- ─────────────────────────────────────────
-- STAFFS  (password = 'faculty123' for all)
-- ─────────────────────────────────────────
INSERT IGNORE INTO staffs
  (id, name, short_name, designation, role, email, employee_id, password, class_role, department)
VALUES
  ('FAC021', 'Mrs. K. Jenifer', 'K. Jenifer', 'AP', 'faculty', 'jenifer.aids@nscet.edu.in', 'NSCET-AIDS-021', 'faculty123', 'Assistant Coordinator', 'Artificial Intelligence and Data Science'),
  ('FAC022', 'Mrs. S. Sunitha', 'S. Sunitha', 'AP', 'faculty', 'sunitha.aids@nscet.edu.in', 'NSCET-AIDS-022', 'faculty123', NULL, 'Artificial Intelligence and Data Science'),
  ('FAC023', 'Mr. S. Kodeeswaran', 'S. Kodeeswaran', 'AP', 'faculty', 'kodeeswaran.aids@nscet.edu.in', 'NSCET-AIDS-023', 'faculty123', 'Class Coordinator', 'Artificial Intelligence and Data Science'),
  ('FAC024', 'Mrs. V. Nithiyapriya', 'V. Nithiyapriya', 'AP', 'faculty', 'nithiyapriya.aids@nscet.edu.in', 'NSCET-AIDS-024', 'faculty123', NULL, 'Artificial Intelligence and Data Science'),
  ('FAC025', 'Mrs. G. Geerthiga', 'G. Geerthiga', 'AP', 'faculty', 'geerthiga.aids@nscet.edu.in', 'NSCET-AIDS-025', 'faculty123', NULL, 'Artificial Intelligence and Data Science');

-- ─────────────────────────────────────────
-- SUBJECTS (AI&DS III Sem 2026-27)
-- ─────────────────────────────────────────
INSERT IGNORE INTO subjects
  (id, code, name, acronym, type, department, semester, faculty_id, class_id)
VALUES
  ('SUB020', 'MA25C08', 'Discrete Mathematics', 'DM', 'Theory', 'Artificial Intelligence and Data Science', 3, 'FAC010', 'CL003'),
  ('SUB021', 'CS25C08', 'Data Structures', 'DS', 'Theory-cum-Lab', 'Artificial Intelligence and Data Science', 3, 'FAC021', 'CL003'),
  ('SUB022', 'CS25C09', 'Java Programming', 'JP', 'Theory-cum-Lab', 'Artificial Intelligence and Data Science', 3, 'FAC022', 'CL003'),
  ('SUB023', 'AD25C01', 'Exploratory Data Analysis', 'EDA', 'Theory-cum-Lab', 'Artificial Intelligence and Data Science', 3, 'FAC023', 'CL003'),
  ('SUB024', 'CS25C11', 'Operating Systems', 'OS', 'Theory', 'Artificial Intelligence and Data Science', 3, 'FAC024', 'CL003'),
  ('SUB025', 'SD', 'Skill Development Course - I', 'SD', 'Skill', 'Artificial Intelligence and Data Science', 3, 'FAC025', 'CL003'),
  ('SUB026', 'NM', 'Naan Mudhalvan Course', 'NM', 'Skill', 'Artificial Intelligence and Data Science', 3, 'FAC023', 'CL003');

-- ─────────────────────────────────────────
-- STUDENTS (AI&DS II Year)
-- ─────────────────────────────────────────
INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
('STU201', 1, '921025243001', 'AATHESREE R', 'CL003', 'Artificial Intelligence and Data Science'),
('STU202', 2, '921025243002', 'AATHIGA FATIMA A', 'CL003', 'Artificial Intelligence and Data Science'),
('STU203', 3, '921025243003', 'ADHILA FATHIMA A', 'CL003', 'Artificial Intelligence and Data Science'),
('STU204', 4, '921025243004', 'AHAMED ATHIEF KHAN M V', 'CL003', 'Artificial Intelligence and Data Science'),
('STU205', 5, '921025243005', 'AKALYA J', 'CL003', 'Artificial Intelligence and Data Science'),
('STU206', 6, '921025243006', 'ALAGUMEENA S', 'CL003', 'Artificial Intelligence and Data Science'),
('STU207', 7, '921025243007', 'ASWATHA J S', 'CL003', 'Artificial Intelligence and Data Science'),
('STU208', 8, '921025243008', 'BAGHYALAKSHMI S', 'CL003', 'Artificial Intelligence and Data Science'),
('STU209', 9, '921025243009', 'DEEPAN M', 'CL003', 'Artificial Intelligence and Data Science'),
('STU210', 10, '921025243010', 'DEVADHARSHAN V', 'CL003', 'Artificial Intelligence and Data Science'),
('STU211', 11, '921025243011', 'DEVADHARSHINI M', 'CL003', 'Artificial Intelligence and Data Science'),
('STU212', 12, '921025243012', 'DEVIPRIYA T', 'CL003', 'Artificial Intelligence and Data Science'),
('STU213', 13, '921025243013', 'DHANU SRI B', 'CL003', 'Artificial Intelligence and Data Science'),
('STU214', 14, '921025243014', 'DHARSHAN BALA P', 'CL003', 'Artificial Intelligence and Data Science'),
('STU215', 15, '921025243015', 'DHARSHINI SARO SHREE S U', 'CL003', 'Artificial Intelligence and Data Science'),
('STU216', 16, '921025243016', 'DHIVYA SRI A', 'CL003', 'Artificial Intelligence and Data Science'),
('STU217', 17, '921025243017', 'DIVAGAR M K', 'CL003', 'Artificial Intelligence and Data Science'),
('STU218', 18, '921025243018', 'DIVYASHREE P', 'CL003', 'Artificial Intelligence and Data Science'),
('STU219', 19, '921025243019', 'GOKULA VANI K', 'CL003', 'Artificial Intelligence and Data Science'),
('STU220', 20, '921025243020', 'GOPAL KARTHICK S', 'CL003', 'Artificial Intelligence and Data Science'),
('STU221', 21, '921025243021', 'HARINI M', 'CL003', 'Artificial Intelligence and Data Science'),
('STU222', 22, '921025243022', 'HARINISRI M', 'CL003', 'Artificial Intelligence and Data Science'),
('STU223', 23, '921025243023', 'HARIPRIYA S', 'CL003', 'Artificial Intelligence and Data Science'),
('STU224', 24, '921025243024', 'HEMAN M', 'CL003', 'Artificial Intelligence and Data Science'),
('STU225', 25, '921025243025', 'JEEVITHA C', 'CL003', 'Artificial Intelligence and Data Science'),
('STU226', 26, '921025243026', 'JEYAVARSHAN B', 'CL003', 'Artificial Intelligence and Data Science'),
('STU227', 27, '921025243027', 'KANISHKA R', 'CL003', 'Artificial Intelligence and Data Science'),
('STU228', 28, '921025243028', 'KANISHKUMAR K', 'CL003', 'Artificial Intelligence and Data Science'),
('STU229', 29, '921025243029', 'KAVITHA S', 'CL003', 'Artificial Intelligence and Data Science'),
('STU230', 30, '921025243030', 'LAKSHANA S', 'CL003', 'Artificial Intelligence and Data Science'),
('STU231', 31, '921025243031', 'LAKSHMI DEVI S', 'CL003', 'Artificial Intelligence and Data Science'),
('STU232', 32, '921025243032', 'MATHUMITHA G', 'CL003', 'Artificial Intelligence and Data Science'),
('STU233', 33, '921025243033', 'MEERA S', 'CL003', 'Artificial Intelligence and Data Science'),
('STU234', 34, '921025243034', 'NANDHINI S', 'CL003', 'Artificial Intelligence and Data Science'),
('STU235', 35, '921025243035', 'NARMATHA R B', 'CL003', 'Artificial Intelligence and Data Science'),
('STU236', 36, '921025243036', 'NIVETHA S', 'CL003', 'Artificial Intelligence and Data Science'),
('STU237', 37, '921025243037', 'PANDEESWARI M', 'CL003', 'Artificial Intelligence and Data Science'),
('STU238', 38, '921025243038', 'POORVAJA S', 'CL003', 'Artificial Intelligence and Data Science'),
('STU239', 39, '921025243039', 'PRAVEENA M', 'CL003', 'Artificial Intelligence and Data Science'),
('STU240', 40, '921025243040', 'RAJARAJESWARI S', 'CL003', 'Artificial Intelligence and Data Science'),
('STU241', 41, '921025243041', 'RAJASRI M', 'CL003', 'Artificial Intelligence and Data Science'),
('STU242', 42, '921025243042', 'REENASRI S', 'CL003', 'Artificial Intelligence and Data Science'),
('STU243', 43, '921025243043', 'RITHIKA SRI A', 'CL003', 'Artificial Intelligence and Data Science'),
('STU244', 44, '921025243044', 'SAHANA C', 'CL003', 'Artificial Intelligence and Data Science'),
('STU245', 45, '921025243045', 'SANKARA NARAYANAN R', 'CL003', 'Artificial Intelligence and Data Science'),
('STU246', 46, '921025243047', 'SHARANYA M', 'CL003', 'Artificial Intelligence and Data Science'),
('STU247', 47, '921025243048', 'SIVA DHARANI R', 'CL003', 'Artificial Intelligence and Data Science'),
('STU248', 48, '921025243049', 'SRINIVASH T', 'CL003', 'Artificial Intelligence and Data Science'),
('STU249', 49, '921025243050', 'SRIRAM V', 'CL003', 'Artificial Intelligence and Data Science'),
('STU250', 50, '921025243051', 'SUGAPRIYA T', 'CL003', 'Artificial Intelligence and Data Science'),
('STU251', 51, '921025243052', 'SUPRIYA J S', 'CL003', 'Artificial Intelligence and Data Science'),
('STU252', 52, '921025243053', 'VETRISELVAM R', 'CL003', 'Artificial Intelligence and Data Science'),
('STU253', 53, '921025243054', 'VIJAYSHREE S', 'CL003', 'Artificial Intelligence and Data Science'),
('STU254', 54, '921025243055', 'YASHIKA K', 'CL003', 'Artificial Intelligence and Data Science'),
('STU255', 55, '921025243056', 'YAZHINI P', 'CL003', 'Artificial Intelligence and Data Science'),
('STU256', 56, '921025243057', 'YAZHINI P M', 'CL003', 'Artificial Intelligence and Data Science'),
('STU257', 57, '921025243058', 'YUGASRI I', 'CL003', 'Artificial Intelligence and Data Science');

