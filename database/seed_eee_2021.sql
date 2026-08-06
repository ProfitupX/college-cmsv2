USE college_cms;

-- ============================================================
-- COLLEGE CMS DUMP FOR EEE III & IV YEAR (2021 REGULATION)
-- ============================================================

-- ─────────────────────────────────────────
-- TABLE: CLASSES
-- ─────────────────────────────────────────
INSERT IGNORE INTO classes (id, name, department, semester, year_label, section, room_no, academic_year, batch, class_coordinator, asst_coordinator) VALUES
('CL_EEE_III', 'EEE - III Year - V Sem', 'Electrical and Electronics Engineering', 5, 'III', 'A', 'CR-2', '2026-2027', '2024-2028', 'Mrs.M.Vijayalakshmi', 'Dr.N.Pandi Selvi'),
('CL_EEE_IV', 'EEE - IV Year - VII Sem', 'Electrical and Electronics Engineering', 7, 'IV', 'A', 'CR-3', '2026-2027', '2023-2027', 'Mrs.A.Nishetha Jeflin Nixon', 'Mr.C.Shiva');

-- ─────────────────────────────────────────
-- TABLE: STAFFS
-- ─────────────────────────────────────────
INSERT IGNORE INTO staffs (id, name, short_name, designation, role, email, employee_id, password, class_role, department) VALUES
('FAC_EEE_101', 'Mr. K. Ganesh', 'K. Ganesh', 'AP/EEE', 'faculty', 'ganesh.eee@nscet.edu.in', 'NSCET-EEE-101', 'faculty123', NULL, 'Electrical and Electronics Engineering'),
('FAC_EEE_102', 'Mr. C. Shiva', 'C. Shiva', 'AP/EEE', 'faculty', 'shiva.eee@nscet.edu.in', 'NSCET-EEE-102', 'faculty123', 'Assistant Coordinator', 'Electrical and Electronics Engineering'),
('FAC_EEE_103', 'Mr. R. Rajakarthick', 'R. Rajakarthick', 'AP/EEE', 'faculty', 'rajakarthick.eee@nscet.edu.in', 'NSCET-EEE-103', 'faculty123', NULL, 'Electrical and Electronics Engineering');

-- ─────────────────────────────────────────
-- TABLE: SUBJECTS
-- ─────────────────────────────────────────
INSERT IGNORE INTO subjects (id, code, name, acronym, type, department, semester, faculty_id, class_id, ltpc, total_hours, l, t, p, c) VALUES
-- EEE III Year (V Sem) - 2021 Regulation
('SUB_EEE_3_1', 'EE3501', 'Power System Analysis', 'PSA', 'Theory', 'Electrical and Electronics Engineering', 5, 'FAC036', 'CL_EEE_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_EEE_3_2', 'EE3591', 'Power Electronics', 'PE', 'Theory', 'Electrical and Electronics Engineering', 5, 'FAC_EEE_101', 'CL_EEE_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_EEE_3_3', 'EE3503', 'Control Systems', 'CS', 'Theory', 'Electrical and Electronics Engineering', 5, 'FAC037', 'CL_EEE_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_EEE_3_4', 'EE3001', 'Utilization and Conservation of Electrical Energy', 'UCEE', 'Theory', 'Electrical and Electronics Engineering', 5, 'FAC035', 'CL_EEE_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_EEE_3_5', 'EE3007', 'Smart Grid', 'SG', 'Theory', 'Electrical and Electronics Engineering', 5, 'FAC_EEE_102', 'CL_EEE_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_EEE_3_6', 'EE3013', 'SMPS and UPS', 'SMPS', 'Theory', 'Electrical and Electronics Engineering', 5, 'FAC033', 'CL_EEE_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_EEE_3_7', 'MX3084', 'Disaster Risk Reduction and Management', 'DRRM', 'Theory', 'Electrical and Electronics Engineering', 5, 'FAC037', 'CL_EEE_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_EEE_3_8', 'LIB', 'Library', 'LIB', 'Practical', 'Electrical and Electronics Engineering', 5, 'FAC035', 'CL_EEE_III', '0-0-0-1', 15, 0, 0, 0, 1),
('SUB_EEE_3_9', 'EE3511', 'Power Electronics Laboratory', 'PE LAB', 'Practical', 'Electrical and Electronics Engineering', 5, 'FAC_EEE_101', 'CL_EEE_III', '0-0-4-2', 60, 0, 0, 4, 2),
('SUB_EEE_3_10', 'EE3512', 'Control and Instrumentation Laboratory', 'C&I LAB', 'Practical', 'Electrical and Electronics Engineering', 5, 'FAC037', 'CL_EEE_III', '0-0-4-2', 60, 0, 0, 4, 2),
('SUB_EEE_3_11', 'EE3513', 'SMPS and UPS LAB', 'SMPS LAB', 'Practical', 'Electrical and Electronics Engineering', 5, 'FAC036', 'CL_EEE_III', '0-0-4-2', 60, 0, 0, 4, 2),
('SUB_EEE_3_12', 'NM', 'Naan Mudalvan', 'NM', 'Skill', 'Electrical and Electronics Engineering', 5, 'FAC035', 'CL_EEE_III', '0-0-2-1', 30, 0, 0, 2, 1),

-- EEE IV Year (VII Sem) - 2021 Regulation
('SUB_EEE_4_1', 'EE3701', 'High Voltage Engineering', 'HV', 'Theory', 'Electrical and Electronics Engineering', 7, 'FAC037', 'CL_EEE_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_EEE_4_2', 'GE3791', 'Human Values and Ethics', 'HVE', 'Theory', 'Electrical and Electronics Engineering', 7, 'FAC_EEE_102', 'CL_EEE_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_EEE_4_3', 'GE3751', 'Principles of Management', 'POM', 'Theory', 'Electrical and Electronics Engineering', 7, 'FAC032', 'CL_EEE_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_EEE_4_4', 'AU3791', 'Electric and Hybrid Vehicles', 'EHV', 'Theory', 'Electrical and Electronics Engineering', 7, 'FAC_EEE_101', 'CL_EEE_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_EEE_4_5', 'AU3008', 'Sensors and Actuators', 'S&A', 'Theory', 'Electrical and Electronics Engineering', 7, 'FAC_EEE_103', 'CL_EEE_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_EEE_4_6', 'EE3008', 'Restructured Power Market', 'RPM', 'Theory', 'Electrical and Electronics Engineering', 7, 'FAC036', 'CL_EEE_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_EEE_4_7', 'LIB', 'Library', 'LIB', 'Practical', 'Electrical and Electronics Engineering', 7, 'FAC032', 'CL_EEE_IV', '0-0-0-1', 15, 0, 0, 0, 1),
('SUB_EEE_4_8', 'EE3811', 'Project Work', 'PROJECT', 'Practical', 'Electrical and Electronics Engineering', 7, 'FAC032', 'CL_EEE_IV', '0-0-6-3', 90, 0, 0, 6, 3),
('SUB_EEE_4_9', 'NM', 'Naan Mudalvan', 'NM', 'Skill', 'Electrical and Electronics Engineering', 7, 'FAC_EEE_103', 'CL_EEE_IV', '0-0-2-1', 30, 0, 0, 2, 1);

-- ─────────────────────────────────────────
-- TABLE: STUDENTS (2024-2028 III Year EEE)
-- ─────────────────────────────────────────
INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
('ST_EEE3_1', 1, '921024105001', 'ANUSRI S', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_2', 2, '921024105002', 'DEVADHARSHINI S', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_3', 3, '921024105003', 'DHANUSHKA P', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_4', 4, '921024105004', 'DHARANI R', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_5', 5, '921024105005', 'DHARANIKA R', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_6', 6, '921024105006', 'DHARANISRI K', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_7', 7, '921024105007', 'DINESHKUMAR S', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_8', 8, '921024105008', 'GAYATHRI DEVI B', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_9', 9, '921024105009', 'ISHANI K', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_10', 10, '921024105010', 'ISWARYA S', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_11', 11, '921024105011', 'KANISHKA J', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_12', 12, '921024105013', 'MOHAMED ANAS K', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_13', 13, '921024105014', 'NAGAJOTHI P', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_14', 14, '921024105015', 'PANDI SELVI S', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_15', 15, '921024105016', 'PRIYA S', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_16', 16, '921024105017', 'RAHINI S', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_17', 17, '921024105018', 'RAJIYA SULTHANA A', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_18', 18, '921024105019', 'RAKESHRAJA R', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_19', 19, '921024105020', 'RAMYA S', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_20', 20, '921024105021', 'SHAHANA V S', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_21', 21, '921024105023', 'SURYAH S', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_22', 22, '921024105024', 'TAMILSELVAN P', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_23', 23, '921024105025', 'THILAKKUMAR S', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_24', 24, '921024105026', 'THIRUMAL SELVAN M', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_25', 25, '921024105027', 'VAISHALI S', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_26', 26, '921024105028', 'VISHWA R', 'CL_EEE_III', 'Electrical and Electronics Engineering'),
('ST_EEE3_27', 27, '921024105301', 'KESAVA PERUMAL T', 'CL_EEE_III', 'Electrical and Electronics Engineering');

-- ─────────────────────────────────────────
-- TABLE: STUDENTS (2023-2027 IV Year EEE)
-- ─────────────────────────────────────────
INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
('ST_EEE4_1', 1, '921023105001', 'AKASH S', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_2', 2, '921023105003', 'BOOMIGA M', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_3', 3, '921023105004', 'BRINDHA K', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_4', 4, '921023105006', 'DARUNKUMAR K', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_5', 5, '921023105007', 'DEEPIKALAKSHAYA M', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_6', 6, '921023105008', 'DHARUNRAJ K', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_7', 7, '921023105009', 'DHARUNYASHREE S', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_8', 8, '921023105010', 'GANESHKUMAR K', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_9', 9, '921023105011', 'GAYATHRI S', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_10', 10, '921023105012', 'GURUPRASATH M', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_11', 11, '921023105013', 'HARINA S', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_12', 12, '921023105014', 'ISWARYA S', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_13', 13, '921023105015', 'JAYASRI P N', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_14', 14, '921023105016', 'KARTHICKRAJAN T', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_15', 15, '921023105017', 'KATHIRVELSAMY S', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_16', 16, '921023105018', 'KAVIN ASWATH S', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_17', 17, '921023105019', 'KRISHNAVENI P', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_18', 18, '921023105020', 'MARIMUTHU R', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_19', 19, '921023105021', 'MOHAMED NOWFIL A', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_20', 20, '921023105023', 'PRIYADHARSHINI S', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_21', 21, '921023105025', 'RAJESHWARAN G', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_22', 22, '921023105027', 'RIHANA AFRIN A', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_23', 23, '921023105028', 'SANTHOSH J', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_24', 24, '921023105029', 'SIVASURYAPRAKASH M', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_25', 25, '921023105030', 'SUBARAJASREE M', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_26', 26, '921023105031', 'SUBASHINI K', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_27', 27, '921023105033', 'VAISHNAVI K', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_28', 28, '921023105034', 'VIDHYA SAGAR P', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_29', 29, '921023105035', 'VINOTH G', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_30', 30, '921023105036', 'YUVARAJ M', 'CL_EEE_IV', 'Electrical and Electronics Engineering'),
('ST_EEE4_31', 31, '921023105037', 'YUVARAJ P', 'CL_EEE_IV', 'Electrical and Electronics Engineering');
