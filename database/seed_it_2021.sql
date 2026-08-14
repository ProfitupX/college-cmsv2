USE college_cms;

-- ============================================================
-- COLLEGE CMS DUMP FOR IT III & IV YEAR (NEW DATA)
-- ============================================================

-- ─────────────────────────────────────────
-- TABLE: CLASSES
-- ─────────────────────────────────────────
INSERT IGNORE INTO classes (id, name, department, semester, year_label, section, room_no, academic_year, batch, class_coordinator, asst_coordinator) VALUES
('CL_IT_III', 'IT - III Year - V Sem', 'Information Technology', 5, 'III', 'A', 'CR-15', '2025-2026', '2024-2028', 'Mrs. M. Bhavani', 'Mr. R. Udhaya Kumar'),
('CL_IT_IV', 'IT - IV Year - VII Sem', 'Information Technology', 7, 'IV', 'A', 'CR-17', '2025-2026', '2023-2027', 'Mrs. B. Sai Suganya', 'Mr. G.R. Naveenkarthick');

-- ─────────────────────────────────────────
-- TABLE: STAFF
-- ─────────────────────────────────────────
INSERT IGNORE INTO staffs (id, name, short_name, designation, role, email, employee_id, password, class_role, department) VALUES
('FAC_IT_101', 'Mrs. M. Bhavani', 'M. Bhavani', 'AP', 'faculty', 'bhavani.it@nscet.edu.in', 'NSCET-IT-101', 'faculty123', 'Class Coordinator', 'Information Technology'),
('FAC_IT_102', 'Mrs. B. Sai Suganya', 'B. Sai Suganya', 'AP', 'faculty', 'saisuganya.it@nscet.edu.in', 'NSCET-IT-102', 'faculty123', 'Class Coordinator', 'Information Technology'),
('FAC_IT_103', 'Mr. G.R. Naveenkarthick', 'G.R. Naveenkarthick', 'AP', 'faculty', 'naveenkarthick.it@nscet.edu.in', 'NSCET-IT-103', 'faculty123', 'Assistant Coordinator', 'Information Technology'),
('FAC_IT_104', 'Mr. K. Ram Kumar', 'K. Ram Kumar', 'AP', 'faculty', 'ramkumar.it@nscet.edu.in', 'NSCET-IT-104', 'faculty123', NULL, 'Information Technology');

-- ─────────────────────────────────────────
-- TABLE: SUBJECTS
-- ─────────────────────────────────────────
INSERT IGNORE INTO subjects (id, code, name, acronym, type, department, semester, faculty_id, class_id, ltpc, total_hours, l, t, p, c) VALUES
-- III Year IT (V Sem)
('SUB_IT_III_1', 'CS3591', 'Computer Networks', 'CN', 'Theory', 'Information Technology', 5, 'FAC003', 'CL_IT_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_IT_III_2', 'IT3501', 'Full Stack Web Development', 'FSWD', 'Theory', 'Information Technology', 5, 'FAC_IT_102', 'CL_IT_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_IT_III_3', 'CS3551', 'Distributed Computing', 'DC', 'Theory', 'Information Technology', 5, 'FAC006', 'CL_IT_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_IT_III_4', 'CS3691', 'Embedded Systems and IoT', 'E&IOT', 'Theory', 'Information Technology', 5, 'FAC_ECE_104', 'CL_IT_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_IT_III_5', 'CCS332', 'App Development', 'APP', 'Theory', 'Information Technology', 5, 'FAC_IT_103', 'CL_IT_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_IT_III_6', 'CCS370', 'UI and UX Design', 'UI&UX', 'Theory', 'Information Technology', 5, 'FAC_IT_101', 'CL_IT_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_IT_III_7', 'MX3082', 'Elements of Literature', 'EOL', 'Theory', 'Information Technology', 5, 'FAC_IT_104', 'CL_IT_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_IT_III_8', 'IT3511', 'Full Stack Development Lab', 'FSWD LAB', 'Practical', 'Information Technology', 5, 'FAC_IT_102', 'CL_IT_III', '0-0-4-2', 60, 0, 0, 4, 2),
('SUB_IT_III_9', 'NA', 'Naan Mudhalvan', 'NM', 'Practical', 'Information Technology', 5, 'FAC_IT_103', 'CL_IT_III', '0-0-2-1', 30, 0, 0, 2, 1),
('SUB_IT_III_10', 'NA', 'Placement', 'PT', 'Practical', 'Information Technology', 5, 'FAC_IT_101', 'CL_IT_III', '0-0-2-1', 30, 0, 0, 2, 1),
('SUB_IT_III_11', 'NA', 'Coding Hours', 'CH', 'Practical', 'Information Technology', 5, 'FAC_IT_101', 'CL_IT_III', '0-0-2-1', 30, 0, 0, 2, 1),

-- IV Year IT (VII Sem)
('SUB_IT_IV_1', 'GE3791', 'Human Values and Ethics', 'HVE', 'Theory', 'Information Technology', 7, 'FAC_AIDS_104', 'CL_IT_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_IT_IV_2', 'GE3751', 'Principles of Management', 'POM', 'Theory', 'Information Technology', 7, 'FAC062', 'CL_IT_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_IT_IV_3', 'AI3021', 'IT in Agricultural System', 'IT&AS', 'Theory', 'Information Technology', 7, 'FAC_IT_102', 'CL_IT_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_IT_IV_4', 'OME352', 'Additive Manufacturing', 'AM', 'Theory', 'Information Technology', 7, 'FAC064', 'CL_IT_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_IT_IV_5', 'IT3711', 'SUMMER INTERNSHIP', 'SI', 'Practical', 'Information Technology', 7, 'FAC_IT_102', 'CL_IT_IV', '0-0-4-2', 60, 0, 0, 4, 2),
('SUB_IT_IV_6', 'NA', 'NAAN MUDHALVAN', 'NM', 'Practical', 'Information Technology', 7, 'FAC005', 'CL_IT_IV', '0-0-2-1', 30, 0, 0, 2, 1),
('SUB_IT_IV_7', 'NA', 'PLACEMENT', 'PT', 'Practical', 'Information Technology', 7, 'FAC_IT_102', 'CL_IT_IV', '0-0-2-1', 30, 0, 0, 2, 1),
('SUB_IT_IV_8', 'NA', 'CODING HOURS', 'CH', 'Practical', 'Information Technology', 7, 'FAC_IT_102', 'CL_IT_IV', '0-0-2-1', 30, 0, 0, 2, 1);

-- ─────────────────────────────────────────
-- TABLE: STUDENTS
-- ─────────────────────────────────────────
INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
-- IT IV-Year (Class: CL_IT_IV)
('ST_IT4_1', 1, '921023205001', 'ABI S', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_2', 2, '921023205002', 'ANUDARSHNI A', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_3', 3, '921023205003', 'ARCHANA DEVI C', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_4', 4, '921023205004', 'DHIVYA DHARSHINI S', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_5', 5, '921023205005', 'DIVYASRI P', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_6', 6, '921023205006', 'HARINI P', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_7', 7, '921023205007', 'ISMATH FATHIMA J', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_8', 8, '921023205008', 'JEBANIKITHA N', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_9', 9, '921023205009', 'LOGESHWARI S', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_10', 10, '921023205010', 'MONIKA B', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_11', 11, '921023205011', 'NAVEENA G', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_12', 12, '921023205012', 'NITHYASRI M', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_13', 13, '921023205013', 'NOORULNAFEELA A', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_14', 14, '921023205014', 'PANDIYARAJAN K', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_15', 15, '921023205015', 'RISHIKESH K', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_16', 16, '921023205016', 'SAFRIN T', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_17', 17, '921023205017', 'SAHANA G', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_18', 18, '921023205018', 'SHAHANA V', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_19', 19, '921023205019', 'SINDHU S', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_20', 20, '921023205020', 'SIVAYOGA K', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_21', 21, '921023205021', 'SONI P', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_22', 22, '921023205022', 'SOWMIYA K', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_23', 23, '921023205023', 'SUJITHA B', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_24', 24, '921023205024', 'THANUSHKUMAR P', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_25', 25, '921023205025', 'VAITHEESHWARI R', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_26', 26, '921023205026', 'VANI SRI M', 'CL_IT_IV', 'Information Technology'),
('ST_IT4_27', 27, '921023205027', 'YOKESH KUMAR R', 'CL_IT_IV', 'Information Technology'),

-- IT III-Year (Class: CL_IT_III)
('ST_IT3_1', 1, '921024205001', 'ABBAS MANTHIRI A', 'CL_IT_III', 'Information Technology'),
('ST_IT3_2', 2, '921024205002', 'ABIKCHANA M', 'CL_IT_III', 'Information Technology'),
('ST_IT3_3', 3, '921024205003', 'ABINAYA V', 'CL_IT_III', 'Information Technology'),
('ST_IT3_4', 4, '921024205004', 'AISHWARYA S', 'CL_IT_III', 'Information Technology'),
('ST_IT3_5', 5, '921024205005', 'AKSHARA M', 'CL_IT_III', 'Information Technology'),
('ST_IT3_6', 6, '921024205006', 'ANITHA S', 'CL_IT_III', 'Information Technology'),
('ST_IT3_7', 7, '921024205007', 'DEVA DHARSHINI S', 'CL_IT_III', 'Information Technology'),
('ST_IT3_8', 8, '921024205008', 'DHARSHINI K', 'CL_IT_III', 'Information Technology'),
('ST_IT3_9', 9, '921024205009', 'DHINESHKUMAR V', 'CL_IT_III', 'Information Technology'),
('ST_IT3_10', 10, '921024205010', 'GANESH BABU P', 'CL_IT_III', 'Information Technology'),
('ST_IT3_11', 11, '921024205011', 'GAYATHRI P', 'CL_IT_III', 'Information Technology'),
('ST_IT3_12', 12, '921024205012', 'GOBINATH G', 'CL_IT_III', 'Information Technology'),
('ST_IT3_13', 13, '921024205013', 'HARISH K', 'CL_IT_III', 'Information Technology'),
('ST_IT3_14', 14, '921024205014', 'HEMA M', 'CL_IT_III', 'Information Technology'),
('ST_IT3_15', 15, '921024205015', 'JEYASIVA S', 'CL_IT_III', 'Information Technology'),
('ST_IT3_16', 16, '921024205016', 'KARUNYA SHRI M', 'CL_IT_III', 'Information Technology'),
('ST_IT3_17', 17, '921024205017', 'KEERTHANA S', 'CL_IT_III', 'Information Technology'),
('ST_IT3_18', 18, '921024205018', 'KRISHNA VENI V', 'CL_IT_III', 'Information Technology'),
('ST_IT3_19', 19, '921024205019', 'LAKSHMIPRIYA G', 'CL_IT_III', 'Information Technology'),
('ST_IT3_20', 20, '921024205020', 'MAHESHWARI M', 'CL_IT_III', 'Information Technology'),
('ST_IT3_21', 21, '921024205021', 'MANISHVARMA S', 'CL_IT_III', 'Information Technology'),
('ST_IT3_22', 22, '921024205022', 'MANJULA S', 'CL_IT_III', 'Information Technology'),
('ST_IT3_23', 23, '921024205023', 'NIVETHA J', 'CL_IT_III', 'Information Technology'),
('ST_IT3_24', 24, '921024205024', 'PAVITHRA M', 'CL_IT_III', 'Information Technology'),
('ST_IT3_25', 25, '921024205026', 'PRAVEENA N', 'CL_IT_III', 'Information Technology'),
('ST_IT3_26', 26, '921024205027', 'PRIYADHARSHINI M', 'CL_IT_III', 'Information Technology'),
('ST_IT3_27', 27, '921024205028', 'PRIYANGA G', 'CL_IT_III', 'Information Technology'),
('ST_IT3_28', 28, '921024205029', 'RAJESHWARI V', 'CL_IT_III', 'Information Technology'),
('ST_IT3_29', 29, '921024205030', 'RESHMA S', 'CL_IT_III', 'Information Technology'),
('ST_IT3_30', 30, '921024205032', 'SAHANA S', 'CL_IT_III', 'Information Technology'),
('ST_IT3_31', 31, '921024205033', 'SARAN SANJAI M', 'CL_IT_III', 'Information Technology'),
('ST_IT3_32', 32, '921024205034', 'SATHYABAMA G', 'CL_IT_III', 'Information Technology'),
('ST_IT3_33', 33, '921024205035', 'SHANMUGAPRIYA N', 'CL_IT_III', 'Information Technology'),
('ST_IT3_34', 34, '921024205036', 'SHARVESWARAN S P', 'CL_IT_III', 'Information Technology'),
('ST_IT3_35', 35, '921024205037', 'SIVA PRADEEP M', 'CL_IT_III', 'Information Technology'),
('ST_IT3_36', 36, '921024205038', 'SIVASANDHYA K', 'CL_IT_III', 'Information Technology'),
('ST_IT3_37', 37, '921024205039', 'SRINITHI A', 'CL_IT_III', 'Information Technology'),
('ST_IT3_38', 38, '921024205040', 'SRI SAI NIVASHINI S', 'CL_IT_III', 'Information Technology'),
('ST_IT3_39', 39, '921024205041', 'SWEETY R', 'CL_IT_III', 'Information Technology'),
('ST_IT3_40', 40, '921024205042', 'SWEETY V', 'CL_IT_III', 'Information Technology'),
('ST_IT3_41', 41, '921024205043', 'THANGA RAJA VARSHINI S', 'CL_IT_III', 'Information Technology'),
('ST_IT3_42', 42, '921024205044', 'THARICK AHAMED A', 'CL_IT_III', 'Information Technology'),
('ST_IT3_43', 43, '921024205045', 'VISHALINI V', 'CL_IT_III', 'Information Technology');
