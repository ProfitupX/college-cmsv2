USE college_cms;

-- ============================================================
-- COLLEGE CMS DUMP FOR AI&DS III & IV YEAR (NEW DATA)
-- ============================================================

-- ─────────────────────────────────────────
-- TABLE: CLASSES
-- ─────────────────────────────────────────
INSERT IGNORE INTO classes (id, name, department, semester, year_label, section, room_no, academic_year, batch, class_coordinator, asst_coordinator) VALUES
('CL_AIDS_III', 'AD - III Year - V Sem', 'Artificial Intelligence and Data Science', 5, 'III', 'A', 'CR-24', '2026-2027', '2024-2028', 'Mrs.M.PAVITHRA', 'Mrs. S.SUNITHA'),
('CL_AIDS_IV', 'AD - IV Year - VII Sem', 'Artificial Intelligence and Data Science', 7, 'IV', 'A', 'CR-23', '2026-2027', '2023-2027', 'Mr. J.VINOTHKUMAR', 'Ms. G.GEERTHIGA');

-- ─────────────────────────────────────────
-- TABLE: STAFFS (Adding specific staffs for these classes)
-- ─────────────────────────────────────────
INSERT IGNORE INTO staffs (id, name, short_name, designation, role, email, employee_id, password, class_role, department) VALUES
('FAC_AIDS_101', 'Mr. L.S. Vignesh', 'L.S. Vignesh', 'AP/HOD', 'hod', 'vignesh.aids@nscet.edu.in', 'NSCET-AIDS-101', 'faculty123', NULL, 'Artificial Intelligence and Data Science'),
('FAC_AIDS_102', 'Mrs. M. Pavithra', 'M. Pavithra', 'AP', 'faculty', 'pavithra.aids@nscet.edu.in', 'NSCET-AIDS-102', 'faculty123', 'Class Coordinator', 'Artificial Intelligence and Data Science'),
('FAC_AIDS_103', 'Mrs. P. Aadhitya', 'P. Aadhitya', 'AP/CIVIL', 'faculty', 'aadhitya.civil@nscet.edu.in', 'NSCET-CIVIL-103', 'faculty123', NULL, 'Civil Engineering'),
('FAC_AIDS_104', 'Mrs. R. Nathirun Sabinash', 'R. Nathirun Sabinash', 'AP/CE', 'faculty', 'sabinash.ce@nscet.edu.in', 'NSCET-CE-104', 'faculty123', NULL, 'Civil Engineering'),
('FAC_AIDS_105', 'Dr. S. Premkumar', 'S. Premkumar', 'AP/CE', 'faculty', 'premkumar.ce@nscet.edu.in', 'NSCET-CE-105', 'faculty123', NULL, 'Civil Engineering'),
('FAC_AIDS_106', 'Mr. A. Vembathurajesh', 'A. Vembathurajesh', 'AP', 'faculty', 'vembathurajesh.aids@nscet.edu.in', 'NSCET-AIDS-106', 'faculty123', NULL, 'Artificial Intelligence and Data Science'),
('FAC_AIDS_107', 'Mr. J. Vinothkumar', 'J. Vinothkumar', 'AP', 'faculty', 'vinothkumar.aids@nscet.edu.in', 'NSCET-AIDS-107', 'faculty123', 'Class Coordinator', 'Artificial Intelligence and Data Science');

-- ─────────────────────────────────────────
-- TABLE: SUBJECTS
-- ─────────────────────────────────────────
INSERT IGNORE INTO subjects (id, code, name, acronym, type, department, semester, faculty_id, class_id, ltpc, total_hours, l, t, p, c) VALUES
-- AI&DS III Year (V Sem)
('SUB_AIDS_3_1', 'AD3501', 'DEEP LEARNING', 'DL', 'Theory', 'Artificial Intelligence and Data Science', 5, 'FAC023', 'CL_AIDS_III', '4-0-0-4', 60, 4, 0, 0, 4),
('SUB_AIDS_3_2', 'CW3551', 'DATA AND INFORMATION SECURITY', 'DIS', 'Theory', 'Artificial Intelligence and Data Science', 5, 'FAC_AIDS_101', 'CL_AIDS_III', '4-0-0-4', 60, 4, 0, 0, 4),
('SUB_AIDS_3_3', 'CS3551', 'DISTRIBUTED COMPUTING', 'DC', 'Theory', 'Artificial Intelligence and Data Science', 5, 'FAC025', 'CL_AIDS_III', '4-0-0-4', 60, 4, 0, 0, 4),
('SUB_AIDS_3_4', 'CCS334', 'BIG DATA ANALYTICS', 'BDA', 'Theory', 'Artificial Intelligence and Data Science', 5, 'FAC024', 'CL_AIDS_III', '4-0-0-4', 60, 4, 0, 0, 4),
('SUB_AIDS_3_5', 'CCS335', 'CLOUD COMPUTING', 'CC', 'Theory', 'Artificial Intelligence and Data Science', 5, 'FAC022', 'CL_AIDS_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_AIDS_3_6', 'CCS370', 'UI AND UX DESIGN', 'UI&UX', 'Theory', 'Artificial Intelligence and Data Science', 5, 'FAC_AIDS_102', 'CL_AIDS_III', '4-0-0-4', 60, 4, 0, 0, 4),
('SUB_AIDS_3_7', 'MX3084', 'DISASTER RISK REDUCTION AND MANAGEMENT', 'DRM', 'Theory', 'Artificial Intelligence and Data Science', 5, 'FAC_AIDS_103', 'CL_AIDS_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_AIDS_3_8', 'AD3511', 'DEEP LEARNING LABORATORY', 'DL LAB', 'Practical', 'Artificial Intelligence and Data Science', 5, 'FAC023', 'CL_AIDS_III', '0-0-6-3', 90, 0, 0, 6, 3),
('SUB_AIDS_3_9', 'CCS335', 'CLOUD COMPUTING LABORATORY', 'CC LAB', 'Practical', 'Artificial Intelligence and Data Science', 5, 'FAC022', 'CL_AIDS_III', '0-0-4-2', 60, 0, 0, 4, 2),
('SUB_AIDS_3_10', 'CCS370', 'UI AND UX DESIGN LABORATORY', 'UI&UX LAB', 'Practical', 'Artificial Intelligence and Data Science', 5, 'FAC_AIDS_102', 'CL_AIDS_III', '0-0-8-4', 120, 0, 0, 8, 4),
('SUB_AIDS_3_11', 'CCS334', 'BIG DATA ANALYTICS LABORATORY', 'BDA LAB', 'Practical', 'Artificial Intelligence and Data Science', 5, 'FAC024', 'CL_AIDS_III', '0-0-8-4', 120, 0, 0, 8, 4),
('SUB_AIDS_3_12', 'NM', 'NAAN MUDHALVAN', 'NM', 'Skill', 'Artificial Intelligence and Data Science', 5, 'FAC023', 'CL_AIDS_III', '0-0-14-7', 210, 0, 0, 14, 7),

-- AI&DS IV Year (VII Sem)
('SUB_AIDS_4_1', 'GE3791', 'HUMAN VALUES AND ETHICS', 'HVE', 'Theory', 'Artificial Intelligence and Data Science', 7, 'FAC_AIDS_104', 'CL_AIDS_IV', '12-0-0-12', 180, 12, 0, 0, 12),
('SUB_AIDS_4_2', 'CME365', 'Renewable Energy Technologies', 'RET', 'Theory', 'Artificial Intelligence and Data Science', 7, 'FAC_AIDS_105', 'CL_AIDS_IV', '8-0-0-8', 120, 8, 0, 0, 8),
('SUB_AIDS_4_3', 'GE3751', 'PRINCIPLES OF MANAGEMENT', 'POM', 'Theory', 'Artificial Intelligence and Data Science', 7, 'FAC_AIDS_106', 'CL_AIDS_IV', '7-0-0-7', 105, 7, 0, 0, 7),
('SUB_AIDS_4_4', 'OGI352', 'GEOGRAPHICAL INFORMATION SYSTEM', 'GIS', 'Theory', 'Artificial Intelligence and Data Science', 7, 'FAC_AIDS_107', 'CL_AIDS_IV', '12-0-0-12', 180, 12, 0, 0, 12),
('SUB_AIDS_4_5', 'NM', 'NAAN MUDHALVAN', 'NM', 'Skill', 'Artificial Intelligence and Data Science', 7, 'FAC_AIDS_107', 'CL_AIDS_IV', '0-0-8-4', 120, 0, 0, 8, 4);

-- ─────────────────────────────────────────
-- TABLE: STUDENTS (2024-2028 III Year AI&DS)
-- ─────────────────────────────────────────
INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
('ST_AIDS3_1', 1, '921024243001', 'ABARNA K', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_2', 2, '921024243002', 'ABDUL RAHMAN U', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_3', 3, '921024243003', 'ANBU DHARSHINI V', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_4', 4, '921024243004', 'ANEESHA S', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_5', 5, '921024243005', 'ANUPRIYA R', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_6', 6, '921024243006', 'AYISHA ASMEE R', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_7', 7, '921024243007', 'BACKIYALAKSHMI G', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_8', 8, '921024243008', 'BACKYALAKSHMI M', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_9', 9, '921024243009', 'DEEPA J', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_10', 10, '921024243010', 'DEVIDHARSHINI. P', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_11', 11, '921024243011', 'DEVIKALA M', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_12', 12, '921024243012', 'DHARANI D', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_13', 13, '921024243013', 'DHIVYA M', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_14', 14, '921024243014', 'DINESHBABU', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_15', 15, '921024243015', 'DIVYAVARSHINI N', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_16', 16, '921024243016', 'GOBI P', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_17', 17, '921024243017', 'GOWTHAMAN N', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_18', 18, '921024243018', 'HARIPRIYA M', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_19', 19, '921024243019', 'HARIPRIYA S', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_20', 20, '921024243020', 'HARSANTHINI K', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_21', 21, '921024243021', 'HARSHINI A', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_22', 22, '921024243022', 'JANANI S', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_23', 23, '921024243023', 'JEEVITHA S', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_24', 24, '921024243024', 'JOYS KIRUBA J', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_25', 25, '921024243025', 'KABILAN I', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_26', 26, '921024243026', 'KEERTHAN A', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_27', 27, '921024243027', 'LAVANYA A', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_28', 28, '921024243028', 'LOGAPRIYA M', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_29', 29, '921024243029', 'MADHU VARSHINI J', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_30', 30, '921024243030', 'NAGESWARI S', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_31', 31, '921024243031', 'NITIN KARTHICK J', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_32', 32, '921024243032', 'POOBATHI RAJAN M', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_33', 33, '921024243033', 'PRAVEENKUMAR A', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_34', 34, '921024243034', 'PRIYADHARSHINI V', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_35', 35, '921024243035', 'RAJARAJESHWARI N', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_36', 36, '921024243036', 'RAMACHANDRAN M', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_37', 37, '921024243037', 'SAMIKSHA D', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_38', 38, '921024243038', 'SASI REGHA P', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_39', 39, '921024243039', 'SHAHANA FIRDAUS K', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_40', 40, '921024243040', 'SRI KAVI P M', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_41', 41, '921024243041', 'SUBASHINI M', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_42', 42, '921024243042', 'THANGA PRABHU A', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_43', 43, '921024243043', 'THARUN V', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_44', 44, '921024243044', 'THIRUNIKA V S', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_45', 45, '921024243045', 'VARSHINI S', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_46', 46, '921024243046', 'VIJAYALAKSHMI K', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_47', 47, '921024243047', 'YAVANASHREE R', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_48', 48, '921024243301', 'PANDEESWARAN P', 'CL_AIDS_III', 'Artificial Intelligence and Data Science'),
('ST_AIDS3_49', 49, '921024243302', 'VAISHNAVI V', 'CL_AIDS_III', 'Artificial Intelligence and Data Science');

-- ─────────────────────────────────────────
-- TABLE: STUDENTS (2023-2027 IV Year AI&DS)
-- ─────────────────────────────────────────
INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
('ST_AIDS4_1', 1, '921023243001', 'AJAY PRASATH K', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_2', 2, '921023243002', 'ANFIYAA M', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_3', 3, '921023243004', 'ASIM FATHIMA P', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_4', 4, '921023243005', 'BALAJI B', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_5', 5, '921023243006', 'DEVENDRAKUMAR P', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_6', 6, '921023243007', 'GOKUL M', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_7', 7, '921023243008', 'HARI PRABHA S', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_8', 8, '921023243009', 'KAVIYAMAHESHWARI J', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_9', 9, '921023243010', 'LOGESHKUMAR R', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_10', 10, '921023243011', 'MALARVIZHI S', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_11', 11, '921023243012', 'MUTHULAKSHMI P', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_12', 12, '921023243013', 'MUTHUMARI M', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_13', 13, '921023243014', 'PRITHIKA S', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_14', 14, '921023243015', 'RAJAPRABA R', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_15', 15, '921023243016', 'RUUBAN RAJ R', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_16', 16, '921023243017', 'SAFIKUL FARINAZ S', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_17', 17, '921023243018', 'SHRIMATHI R', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_18', 18, '921023243019', 'SRI HARINI PRIYA S', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_19', 19, '921023243020', 'SUSMITHA S', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_20', 20, '921023243021', 'VARUNI T', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_21', 21, '921023243022', 'VASUKI P', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_22', 22, '921023243023', 'VISHALINI K', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_23', 23, '921023243024', 'VISHNU PARAMESH B', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_24', 24, '921023243025', 'YOGESHKUMAR R', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_25', 25, '921023243026', 'YOKESH J', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science'),
('ST_AIDS4_26', 26, '921023243027', 'YUKTHA S', 'CL_AIDS_IV', 'Artificial Intelligence and Data Science');
