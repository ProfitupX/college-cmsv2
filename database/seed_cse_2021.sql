USE college_cms;

-- ============================================================
-- COLLEGE CMS DUMP FOR CSE III & IV YEAR (NEW DATA)
-- ============================================================

-- ─────────────────────────────────────────
-- TABLE: CLASSES
-- ─────────────────────────────────────────
INSERT IGNORE INTO classes (id, name, department, semester, year_label, section, room_no, academic_year, batch, class_coordinator, asst_coordinator) VALUES
('CL_CSE_III', 'CSE - III Year - V Sem', 'Computer Science and Engineering', 5, 'III', 'A', 'CR-10', '2026-2027', '2024-2028', 'Mrs.M.Venkata Lakshmi', 'Mrs.V.Vinothini'),
('CL_CSE_IV', 'CSE - IV Year - VII Sem', 'Computer Science and Engineering', 7, 'IV', 'A', 'CR-9', '2026-2027', '2023-2027', 'Ms.S.Abirami Kayathri', 'Mr.K.Velkumar');

-- ─────────────────────────────────────────
-- TABLE: STAFFS
-- ─────────────────────────────────────────
INSERT IGNORE INTO staffs (id, name, short_name, designation, role, email, employee_id, password, class_role, department) VALUES
('FAC_CSE_101', 'Mr. K. Velkumar', 'K. Velkumar', 'AP', 'faculty', 'velkumar.cse@nscet.edu.in', 'NSCET-CSE-101', 'faculty123', 'Assistant Coordinator', 'Computer Science and Engineering'),
('FAC_CSE_102', 'Ms. S. Abirami Kayathri', 'S. Abirami Kayathri', 'AP', 'faculty', 'abiramikayathri.cse@nscet.edu.in', 'NSCET-CSE-102', 'faculty123', 'Class Coordinator', 'Computer Science and Engineering'),
('FAC_CSE_103', 'Mrs. K. Benita Merlin Isabella', 'K. Benita', 'AP/CIVIL', 'faculty', 'benita.civil@nscet.edu.in', 'NSCET-CIVIL-103', 'faculty123', NULL, 'Civil Engineering'),
('FAC_CSE_104', 'Dr. M. Sathya', 'M. Sathya', 'PROF./CSE', 'faculty', 'sathya.cse@nscet.edu.in', 'NSCET-CSE-104', 'faculty123', NULL, 'Computer Science and Engineering');

-- ─────────────────────────────────────────
-- TABLE: SUBJECTS
-- ─────────────────────────────────────────
INSERT IGNORE INTO subjects (id, code, name, acronym, type, department, semester, faculty_id, class_id, ltpc, total_hours, l, t, p, c) VALUES
-- CSE III Year (V Sem) - 2021 Regulation
('SUB_CSE_3_1', 'CS3591', 'Computer Networks', 'CN', 'Theory cum Lab', 'Computer Science and Engineering', 5, 'FAC012', 'CL_CSE_III', '3-0-2-4', 75, 3, 0, 2, 4),
('SUB_CSE_3_2', 'CS3501', 'Compiler Design', 'CD', 'Theory cum Lab', 'Computer Science and Engineering', 5, 'FAC011', 'CL_CSE_III', '3-0-2-4', 75, 3, 0, 2, 4),
('SUB_CSE_3_3', 'CB3491', 'Cryptography and Cyber Security', 'CCS', 'Theory', 'Computer Science and Engineering', 5, 'FAC013', 'CL_CSE_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_CSE_3_4', 'CS3551', 'Distributed Computing', 'DC', 'Theory', 'Computer Science and Engineering', 5, 'FAC015', 'CL_CSE_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_CSE_3_5', 'CCS335', 'Cloud Computing', 'CC', 'Theory cum Lab', 'Computer Science and Engineering', 5, 'FAC_CSE_101', 'CL_CSE_III', '3-0-2-4', 75, 3, 0, 2, 4),
('SUB_CSE_3_6', 'CCS332', 'App Development', 'APP', 'Theory cum Lab', 'Computer Science and Engineering', 5, 'FAC_CSE_102', 'CL_CSE_III', '3-0-2-4', 75, 3, 0, 2, 4),
('SUB_CSE_3_7', 'MX3084', 'Disaster Risk Reduction and Management', 'DRRM', 'Theory', 'Computer Science and Engineering', 5, 'FAC_CSE_103', 'CL_CSE_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_CSE_3_8', 'NM', 'Naan Mudhalvan Course', 'NM', 'Skill', 'Computer Science and Engineering', 5, 'FAC013', 'CL_CSE_III', '0-0-2-1', 30, 0, 0, 2, 1),
('SUB_CSE_3_9', 'COMM', 'Communication Activity', 'COMM.', 'Skill', 'Computer Science and Engineering', 5, 'FAC016', 'CL_CSE_III', '0-0-2-1', 30, 0, 0, 2, 1),

-- CSE IV Year (VII Sem) - 2021 Regulation
('SUB_CSE_4_1', 'GE3791', 'Human Values and Ethics', 'HV', 'Theory', 'Computer Science and Engineering', 7, 'FAC_CSE_104', 'CL_CSE_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_CSE_4_2', 'GE3752', 'Total Quality Management', 'TQM', 'Theory', 'Computer Science and Engineering', 7, 'FAC015', 'CL_CSE_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_CSE_4_3', 'A13021', 'IT in Agricultural System', 'IT', 'Theory', 'Computer Science and Engineering', 7, 'FAC_CSE_102', 'CL_CSE_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_CSE_4_4', 'OG1352', 'Geographical Information System', 'GIS', 'Theory', 'Computer Science and Engineering', 7, 'FAC_CSE_101', 'CL_CSE_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_CSE_4_5', 'CS3711', 'Summer Internship', 'SI', 'Practical', 'Computer Science and Engineering', 7, 'FAC015', 'CL_CSE_IV', '0-0-0-2', 30, 0, 0, 0, 2),
('SUB_CSE_4_6', 'NM', 'NAAN MUDHALVAN COURSE', 'NM', 'Skill', 'Computer Science and Engineering', 7, 'FAC_CSE_102', 'CL_CSE_IV', '0-0-2-1', 30, 0, 0, 2, 1),
('SUB_CSE_4_7', 'COMM', 'Communication Activity', 'COMM.', 'Skill', 'Computer Science and Engineering', 7, 'FAC016', 'CL_CSE_IV', '0-0-2-1', 30, 0, 0, 2, 1),
('SUB_CSE_4_8', 'CODING', 'Coding Hours', 'Coding', 'Skill', 'Computer Science and Engineering', 7, 'FAC016', 'CL_CSE_IV', '0-0-2-1', 30, 0, 0, 2, 1);

-- ─────────────────────────────────────────
-- TABLE: STUDENTS (2024-2028 III Year CSE)
-- ─────────────────────────────────────────
INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
('ST_CSE3_1', 1, '921024104001', 'ADHITHIYA S', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_2', 2, '921024104003', 'ANU VIASHINI M', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_3', 3, '921024104004', 'ARCHANA B', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_4', 4, '921024104005', 'ASIFA SHEREEN S', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_5', 5, '921024104006', 'ASMATH NABILA A', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_6', 6, '921024104007', 'CHELLAMUTHUKUMAR P', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_7', 7, '921024104008', 'DIYASRI P', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_8', 8, '921024104009', 'DURGESHWARI R', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_9', 9, '921024104010', 'GNANASHREE K', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_10', 10, '921024104011', 'GNANASWETHA K', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_11', 11, '921024104012', 'GOKUL M', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_12', 12, '921024104013', 'GOWSALYA S', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_13', 13, '921024104014', 'GOYALD R', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_14', 14, '921024104015', 'HARINI K S', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_15', 15, '921024104016', 'HEMAPRIYA P', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_16', 16, '921024104017', 'JAISHREE D', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_17', 17, '921024104018', 'JASMIN FATHIMA M', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_18', 18, '921024104019', 'JESSICA K', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_19', 19, '921024104020', 'JOTHIKA P', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_20', 20, '921024104021', 'KALPANA S', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_21', 21, '921024104022', 'KARTHIK C', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_22', 22, '921024104023', 'KARTHIKEYAN M', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_23', 23, '921024104024', 'LATHIKA K', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_24', 24, '921024104025', 'LOGESHWARI E', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_25', 25, '921024104026', 'MAHALAKSHMI M', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_26', 26, '921024104027', 'MALAVIKA P', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_27', 27, '921024104028', 'MITHILESH R', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_28', 28, '921024104029', 'MUFASIRA FARVEEN S', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_29', 29, '921024104030', 'MUTHUKAMATCHI M', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_30', 30, '921024104031', 'NITHISH M', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_31', 31, '921024104032', 'NIVETHA P', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_32', 32, '921024104033', 'PANDICHELVI M', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_33', 33, '921024104034', 'PON HARIPRASATH R', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_34', 34, '921024104035', 'PRAGATHI P', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_35', 35, '921024104036', 'PRAVIN K', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_36', 36, '921024104037', 'RIHANA B', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_37', 37, '921024104038', 'SABARI J', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_38', 38, '921024104039', 'SAFIYATHUL JABURA I', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_39', 39, '921024104040', 'SANGEETHA V', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_40', 40, '921024104041', 'SANJAY RAJ G', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_41', 41, '921024104042', 'SANMATHI V', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_42', 42, '921024104043', 'SHASVANDH R', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_43', 43, '921024104044', 'SHRILAYA K K', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_44', 44, '921024104045', 'SOWMIYA G', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_45', 45, '921024104046', 'SRI HARINI A', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_46', 46, '921024104047', 'SUBIKSHA S', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_47', 47, '921024104048', 'SUGANYA P', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_48', 48, '921024104049', 'SWETHA E', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_49', 49, '921024104050', 'SYED ALI FATHIMA M', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_50', 50, '921024104051', 'SYED MASOOD A', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_51', 51, '921024104052', 'THAARANI R K', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_52', 52, '921024104053', 'VASANTHAKUMAR M', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_53', 53, '921024104054', 'VEDHA DHARSHINI P', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_54', 54, '921024104055', 'VIBISH P T', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_55', 55, '921024104056', 'VIJAY PRASATH T', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_56', 56, '921024104057', 'YAZHINI K', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_57', 57, '921024104301', 'GOKULAPRIYAN J', 'CL_CSE_III', 'Computer Science and Engineering'),
('ST_CSE3_58', 58, '921024104302', 'SUKASHINIE P M', 'CL_CSE_III', 'Computer Science and Engineering');

-- ─────────────────────────────────────────
-- TABLE: STUDENTS (2023-2027 IV Year CSE)
-- ─────────────────────────────────────────
INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
('ST_CSE4_1', 1, '921023104001', 'ABI R', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_2', 2, '921023104002', 'AHAMED ATHIL KHAN M V', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_3', 3, '921023104003', 'AKSHAYA G', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_4', 4, '921023104004', 'AKSHAYA R', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_5', 5, '921023104005', 'AKSHAYA SHRI K', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_6', 6, '921023104006', 'BALADINESH K', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_7', 7, '921023104007', 'BRINDHA A', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_8', 8, '921023104008', 'DEEBA DHARSHINIE G K', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_9', 9, '921023104009', 'DHANUJA P', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_10', 10, '921023104010', 'HARINI M', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_11', 11, '921023104011', 'HARINI VISHVA R', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_12', 12, '921023104012', 'HARSHINI K', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_13', 13, '921023104013', 'JEFFIN JOSH P', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_14', 14, '921023104014', 'JEEVITHA M', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_15', 15, '921023104015', 'KAMALI T', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_16', 16, '921023104016', 'KARPAGAM M', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_17', 17, '921023104018', 'KAVIN S', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_18', 18, '921023104019', 'KAWSALYA C', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_19', 19, '921023104020', 'KEERTHIKA R', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_20', 20, '921023104021', 'LAKSHITHA K R', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_21', 21, '921023104022', 'MOHAMMED RAYAN J', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_22', 22, '921023104023', 'MOULIKA R', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_23', 23, '921023104024', 'MUTHUKUMAR S', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_24', 24, '921023104025', 'NANDHINI P', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_25', 25, '921023104026', 'NIGIL S S', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_26', 26, '921023104027', 'NISHALINI K', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_27', 27, '921023104028', 'NITHIKSHA L', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_28', 28, '921023104029', 'NITHISHKUMAR R', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_29', 29, '921023104030', 'OVIYA M', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_30', 30, '921023104031', 'PONMUGIL V N', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_31', 31, '921023104032', 'PRAMOTH J', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_32', 32, '921023104033', 'RASIKA D', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_33', 33, '921023104034', 'RISHIVANTH V K', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_34', 34, '921023104035', 'SABITHA T', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_35', 35, '921023104036', 'SAI BAVADHARANI M M', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_36', 36, '921023104037', 'SATHIYA SRI M', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_37', 37, '921023104038', 'SATHIYASRI J', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_38', 38, '921023104039', 'SHIVADHARSHINI S', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_39', 39, '921023104040', 'SIVANITHY P', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_40', 40, '921023104041', 'SRIHARI M', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_41', 41, '921023104042', 'SUWETHA B', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_42', 42, '921023104043', 'THIYAGU G', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_43', 43, '921023104044', 'VANISRI M', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_44', 44, '921023104045', 'VELMURUGAN G', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_45', 45, '921023104046', 'VENGATESH T', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_46', 46, '921023104047', 'VIDHYASHRI M', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_47', 47, '921023104048', 'VIJAY T K P', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_48', 48, '921023104049', 'VISHAL J', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_49', 49, '921023104301', 'ARJUN T', 'CL_CSE_IV', 'Computer Science and Engineering'),
('ST_CSE4_50', 50, '921023104302', 'SAKTHIVEL S', 'CL_CSE_IV', 'Computer Science and Engineering');
