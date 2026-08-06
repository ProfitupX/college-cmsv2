USE college_cms;

-- ============================================================
-- COLLEGE CMS DUMP FOR ECE III & IV YEAR (NEW DATA)
-- ============================================================

-- ─────────────────────────────────────────
-- TABLE: CLASSES
-- ─────────────────────────────────────────
INSERT IGNORE INTO classes (id, name, department, semester, year_label, section, room_no, academic_year, batch, class_coordinator, asst_coordinator) VALUES
('CL_ECE_III', 'ECE - III Year - V Sem', 'Electronics and Communication Engineering', 5, 'III', 'A', 'Class Room 05', '2026-2027', '2024-2028', 'Mrs. P. Shantha Devi', 'Mr. K. Bharathi Kannan'),
('CL_ECE_IV', 'ECE - IV Year - VII Sem', 'Electronics and Communication Engineering', 7, 'IV', 'A', 'Class Room 06', '2026-2027', '2023-2027', 'Mrs. S. Kalaivani', 'Mr. S. Prathap');

-- ─────────────────────────────────────────
-- TABLE: STAFFS (Adding specific staffs for these classes)
-- ─────────────────────────────────────────
INSERT IGNORE INTO staffs (id, name, short_name, designation, role, email, employee_id, password, class_role, department) VALUES
('FAC_ECE_101', 'Mrs. P. Shantha Devi', 'P. Shantha Devi', 'AP/ECE', 'faculty', 'shanthadevi.ece@nscet.edu.in', 'NSCET-ECE-101', 'faculty123', 'Class Coordinator', 'Electronics and Communication Engineering'),
('FAC_ECE_102', 'Mr. K. Bharathi Kannan', 'K. Bharathi Kannan', 'AP/ECE', 'faculty', 'bharathikannan.ece@nscet.edu.in', 'NSCET-ECE-102', 'faculty123', 'Assistant Coordinator', 'Electronics and Communication Engineering'),
('FAC_ECE_103', 'Mr. M. Idhayachandran', 'M. Idhayachandran', 'AP/ECE', 'faculty', 'idhayachandran.ece@nscet.edu.in', 'NSCET-ECE-103', 'faculty123', NULL, 'Electronics and Communication Engineering'),
('FAC_ECE_104', 'Mr. S. Prathap', 'S. Prathap', 'AP/ECE', 'faculty', 'prathap.ece@nscet.edu.in', 'NSCET-ECE-104', 'faculty123', 'Assistant Coordinator', 'Electronics and Communication Engineering'),
('FAC_ECE_105', 'Mrs. P. Gowthami', 'P. Gowthami', 'AP/ECE', 'faculty', 'gowthami.ece@nscet.edu.in', 'NSCET-ECE-105', 'faculty123', NULL, 'Electronics and Communication Engineering');

-- ─────────────────────────────────────────
-- TABLE: SUBJECTS
-- ─────────────────────────────────────────
INSERT IGNORE INTO subjects (id, code, name, acronym, type, department, semester, faculty_id, class_id, ltpc, total_hours, l, t, p, c) VALUES
-- ECE III Year (V Sem)
('SUB_ECE_3_1', 'EC3501', 'Wireless Communication (Theory Cum Lab)', 'WC LAB', 'Theory-cum-Lab', 'Electronics and Communication Engineering', 5, 'FAC042', 'CL_ECE_III', '3-0-2-4', 75, 3, 0, 2, 4),
('SUB_ECE_3_2', 'EC3551', 'Transmission Lines and RF Systems', 'TLRF', 'Theory', 'Electronics and Communication Engineering', 5, 'FAC_ECE_102', 'CL_ECE_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_ECE_3_3', 'EC3552', 'VLSI and Chip Design', 'VLSI', 'Theory', 'Electronics and Communication Engineering', 5, 'FAC_ECE_103', 'CL_ECE_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_ECE_3_4', 'CEC331', '4G/ 5G Communication Networks (Theory Cum Lab)', '4G/5G CN', 'Theory-cum-Lab', 'Electronics and Communication Engineering', 5, 'FAC044', 'CL_ECE_III', '3-0-2-4', 75, 3, 0, 2, 4),
('SUB_ECE_3_5', 'CEC334', 'Analog IC Design (Theory Cum Lab)', 'AIC LAB', 'Theory-cum-Lab', 'Electronics and Communication Engineering', 5, 'FAC_ECE_101', 'CL_ECE_III', '3-0-2-4', 75, 3, 0, 2, 4),
('SUB_ECE_3_6', 'CBM370', 'Wearable Devices', 'WD', 'Theory', 'Electronics and Communication Engineering', 5, 'FAC048', 'CL_ECE_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_ECE_3_7', 'MX3081', 'Introduction to Women and General Studies', 'IW & GS', 'Theory', 'Electronics and Communication Engineering', 5, 'FAC043', 'CL_ECE_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_ECE_3_8', 'EC3561', 'VLSI Laboratory', 'VLSI LAB', 'Practical', 'Electronics and Communication Engineering', 5, 'FAC_ECE_103', 'CL_ECE_III', '0-0-4-2', 60, 0, 0, 4, 2),
('SUB_ECE_3_9', 'NM', 'Naan Mudhalvan', 'NM', 'Skill', 'Electronics and Communication Engineering', 5, 'FAC_ECE_101', 'CL_ECE_III', '0-0-2-1', 30, 0, 0, 2, 1),

-- ECE IV Year (VII Sem)
('SUB_ECE_4_1', 'GE3791', 'Human Values and Ethics', 'HVE', 'Theory', 'Electronics and Communication Engineering', 7, 'FAC_ECE_105', 'CL_ECE_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_ECE_4_2', 'GE3751', 'Principles of Management', 'POM', 'Theory', 'Electronics and Communication Engineering', 7, 'FAC_ECE_101', 'CL_ECE_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_ECE_4_3', 'OEI352', 'Introduction to Control Engineering', 'ICE', 'Theory', 'Electronics and Communication Engineering', 7, 'FAC_ECE_104', 'CL_ECE_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_ECE_4_4', 'OMR353', 'Sensors', 'SEN', 'Theory', 'Electronics and Communication Engineering', 7, 'FAC048', 'CL_ECE_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_ECE_4_5', 'EC3711', 'Summer Internship/Value Added Course', 'SI/ VAC', 'Practical', 'Electronics and Communication Engineering', 7, 'FAC_ECE_105', 'CL_ECE_IV', '0-0-0-2', 30, 0, 0, 0, 2),
('SUB_ECE_4_6', 'NM', 'Naan Mudhalvan', 'NM', 'Skill', 'Electronics and Communication Engineering', 7, 'FAC046', 'CL_ECE_IV', '0-0-2-1', 30, 0, 0, 2, 1);

-- ─────────────────────────────────────────
-- TABLE: STUDENTS (2024-2028 III Year ECE)
-- ─────────────────────────────────────────
INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
('ST_ECE3_1', 1, '921024106001', 'ABARNA A', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_2', 2, '921024106002', 'ANU SHREE R', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_3', 3, '921024106003', 'ASHWATHIKA G', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_4', 4, '921024106004', 'ASWANTHIKA R', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_5', 5, '921024106005', 'BHARATHI.M', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_6', 6, '921024106006', 'BHAVYASRI M', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_7', 7, '921024106007', 'BUVANESHWARI K', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_8', 8, '921024106008', 'DAKSHITHA R', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_9', 9, '921024106009', 'DEEPA S S', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_10', 10, '921024106010', 'DEEPAKRAJ S', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_11', 11, '921024106011', 'DEEPIKA S', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_12', 12, '921024106012', 'DHARSHINI K', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_13', 13, '921024106013', 'DHARSHINI PRIYA V', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_14', 14, '921024106014', 'DHEJESH KANNAN M', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_15', 15, '921024106015', 'DIVYA SHREE S R', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_16', 16, '921024106016', 'GIRIVISHNU M', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_17', 17, '921024106017', 'GOKILAVANI P', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_18', 18, '921024106018', 'GOKUL R', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_19', 19, '921024106019', 'GURUPRASATH M', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_20', 20, '921024106020', 'HARINANTHASRI S', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_21', 21, '921024106021', 'HARSHAVARDHINI P', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_22', 22, '921024106022', 'JANANI SRI T', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_23', 23, '921024106023', 'JENELIA S', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_24', 24, '921024106024', 'KALEP G', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_25', 25, '921024106026', 'KISHORE KANNAN S', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_26', 26, '921024106027', 'KUMUTHAVALLI S', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_27', 27, '921024106028', 'MUKILAN R', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_28', 28, '921024106029', 'NATHISHA R', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_29', 29, '921024106030', 'NIMAL K', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_30', 30, '921024106031', 'PAVITHRA S', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_31', 31, '921024106032', 'POOVITHA M', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_32', 32, '921024106033', 'PRADEEPA M', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_33', 33, '921024106034', 'PRAVEENA K', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_34', 34, '921024106035', 'PRIYANGA S', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_35', 35, '921024106036', 'RIDDHI SHREE P', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_36', 36, '921024106037', 'RISHI PRIYAN S', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_37', 37, '921024106038', 'SAKTHI DHARANI K', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_38', 38, '921024106039', 'SARANRAJ M', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_39', 39, '921024106040', 'SARMILI SHAKSHI S', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_40', 40, '921024106041', 'SRIDHARSHINI S', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_41', 41, '921024106042', 'SWATHY G', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_42', 42, '921024106043', 'THRISHA B', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_43', 43, '921024106044', 'UMA V', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_44', 44, '921024106045', 'VISHVA S', 'CL_ECE_III', 'Electronics and Communication Engineering'),
('ST_ECE3_45', 45, '921024106701', 'SRI SHARAN R', 'CL_ECE_III', 'Electronics and Communication Engineering');

-- ─────────────────────────────────────────
-- TABLE: STUDENTS (2023-2027 IV Year ECE)
-- ─────────────────────────────────────────
INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
('ST_ECE4_1', 1, '921023106001', 'AATHEESWARAN M', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_2', 2, '921023106002', 'ADITHYAN V', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_3', 3, '921023106003', 'ANANTHA RAM A', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_4', 4, '921023106004', 'ANTON MATTEW A', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_5', 5, '921023106005', 'ANUSHASRI D', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_6', 6, '921023106006', 'ASHVANI S', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_7', 7, '921023106007', 'ATCHAYAKAMALI V', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_8', 8, '921023106008', 'DEEPIKA SRI K', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_9', 9, '921023106009', 'DEVADHARSHINI K', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_10', 10, '921023106010', 'DHANALAKSHMI S', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_11', 11, '921023106011', 'DHASHINA S', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_12', 12, '921023106012', 'DURGASRI A', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_13', 13, '921023106014', 'GOBINATH M', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_14', 14, '921023106015', 'GOPIKA M', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_15', 15, '921023106016', 'HARIMURUGAN S', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_16', 16, '921023106018', 'JEEVANA M', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_17', 17, '921023106019', 'JEEVANANDHAM A', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_18', 18, '921023106020', 'JEEVETHA P', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_19', 19, '921023106021', 'JEYAHARINISHREE R', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_20', 20, '921023106022', 'JEYAPRIYA L M', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_21', 21, '921023106023', 'JEYA SRI K', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_22', 22, '921023106024', 'KARTHICK V', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_23', 23, '921023106025', 'KARTHIKRAJA V', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_24', 24, '921023106026', 'KAVIYA R', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_25', 25, '921023106027', 'KIRUTHIKA M', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_26', 26, '921023106028', 'MANIKANDAN M', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_27', 27, '921023106029', 'MAREESWARI B', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_28', 28, '921023106030', 'MOGANA PRIYA M', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_29', 29, '921023106031', 'MOHANAMITHRAA M', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_30', 30, '921023106032', 'NAGAJOTHI S', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_31', 31, '921023106033', 'NAGESHWARAN K', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_32', 32, '921023106034', 'NANDHINI R', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_33', 33, '921023106035', 'PIRIYA LAXMI E', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_34', 34, '921023106036', 'POOJA P', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_35', 35, '921023106037', 'RATHEESWARI P', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_36', 36, '921023106038', 'RESHMA K', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_37', 37, '921023106039', 'SABRIN FATHIMA Z', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_38', 38, '921023106040', 'SADHA SRI V', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_39', 39, '921023106041', 'SAMEENA BANU P', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_40', 40, '921023106042', 'SANKARA NARAYANAN S', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_41', 41, '921023106043', 'SANTHIYA G', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_42', 42, '921023106044', 'SHARVARI S', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_43', 43, '921023106045', 'SRINITHI C', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_44', 44, '921023106046', 'SUBASRI M', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_45', 45, '921023106047', 'SUGESHRAM R', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_46', 46, '921023106048', 'SWATHI K', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_47', 47, '921023106049', 'SWETHASREE P', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_48', 48, '921023106050', 'VIJAYARAGAVAN C', 'CL_ECE_IV', 'Electronics and Communication Engineering'),
('ST_ECE4_49', 49, '921023106701', 'KAVIYA SHREE B', 'CL_ECE_IV', 'Electronics and Communication Engineering');
