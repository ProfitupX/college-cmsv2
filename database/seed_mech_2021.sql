USE college_cms;

-- ============================================================
-- COLLEGE CMS DUMP FOR MECH III & IV YEAR (NEW DATA)
-- ============================================================

-- ─────────────────────────────────────────
-- TABLE: CLASSES
-- ─────────────────────────────────────────
INSERT IGNORE INTO classes (id, name, department, semester, year_label, section, room_no, academic_year, batch, class_coordinator, asst_coordinator) VALUES
('CL_MECH_III', 'MECH - III Year - V Sem', 'Mechanical Engineering', 5, 'III', 'A', 'Class Room 14', '2026-2027', '2024-2028', 'Mr.P.Surulimani', 'Mr.G.Arunkumar'),
('CL_MECH_IV', 'MECH - IV Year - VII Sem', 'Mechanical Engineering', 7, 'IV', 'A', 'Class Room 13', '2026-2027', '2023-2027', 'Dr. A. Vennimalai Rajan', 'Mr.J.Chakravarthy Samy Durai');

-- ─────────────────────────────────────────
-- TABLE: STAFFS (Adding specific staffs for these classes)
-- ─────────────────────────────────────────
INSERT IGNORE INTO staffs (id, name, short_name, designation, role, email, employee_id, password, class_role, department) VALUES
('FAC_MECH_101', 'Mr. P. Surulimani', 'P. Surulimani', 'AP/MECH', 'faculty', 'surulimani.mech@nscet.edu.in', 'NSCET-MECH-101', 'faculty123', 'Class Coordinator', 'Mechanical Engineering'),
('FAC_MECH_102', 'Mr. J. Chakravarthy Samy Durai', 'J. Chakravarthy', 'AP/MECH', 'faculty', 'chakravarthy.mech@nscet.edu.in', 'NSCET-MECH-102', 'faculty123', 'Assistant Coordinator', 'Mechanical Engineering'),
('FAC_MECH_103', 'Mr. G. Arunkumar', 'G. Arunkumar', 'AP/MECH', 'faculty', 'arunkumar.mech@nscet.edu.in', 'NSCET-MECH-103', 'faculty123', 'Assistant Coordinator', 'Mechanical Engineering'),
('FAC_MECH_104', 'Mr. V. Sivaganesan', 'V. Sivaganesan', 'AP/MECH', 'faculty', 'sivaganesan.mech@nscet.edu.in', 'NSCET-MECH-104', 'faculty123', NULL, 'Mechanical Engineering');

-- ─────────────────────────────────────────
-- TABLE: SUBJECTS
-- ─────────────────────────────────────────
INSERT IGNORE INTO subjects (id, code, name, acronym, type, department, semester, faculty_id, class_id, ltpc, total_hours, l, t, p, c) VALUES
-- MECH III Year (V Sem)
('SUB_MECH_3_1', 'ME3591', 'Design of Machine Elements', 'DME', 'Theory', 'Mechanical Engineering', 5, 'FAC_MECH_101', 'CL_MECH_III', '4-0-0-4', 60, 4, 0, 0, 4),
('SUB_MECH_3_2', 'ME3592', 'Metrology and Measurements', 'MM', 'Theory', 'Mechanical Engineering', 5, 'FAC_MECH_102', 'CL_MECH_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_MECH_3_3', 'CME338', 'Value Engineering', 'VE', 'Theory', 'Mechanical Engineering', 5, 'FAC_MECH_103', 'CL_MECH_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_MECH_3_4', 'CME347', 'Lean Manufacturing', 'LM', 'Theory', 'Mechanical Engineering', 5, 'FAC054', 'CL_MECH_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_MECH_3_5', 'CRA332', 'Drone Technologies', 'DT', 'Theory', 'Mechanical Engineering', 5, 'FAC053', 'CL_MECH_III', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_MECH_3_6', 'ME3581', 'Metrology and Dynamics Laboratory', 'M&D LAB', 'Practical', 'Mechanical Engineering', 5, 'FAC_MECH_102', 'CL_MECH_III', '0-0-4-2', 60, 0, 0, 4, 2),
('SUB_MECH_3_7', 'NM', 'NAAN MUDHALVAN (Pro-E_Creo Design)', 'NM', 'Skill', 'Mechanical Engineering', 5, 'FAC_MECH_103', 'CL_MECH_III', '0-0-4-2', 60, 0, 0, 4, 2),
('SUB_MECH_3_8', 'LIB', 'LIBRARY', 'LIBRARY', 'Other', 'Mechanical Engineering', 5, 'FAC058', 'CL_MECH_III', '0-0-0-1', 15, 0, 0, 0, 1),

-- MECH IV Year (VII Sem)
('SUB_MECH_4_1', 'ME3791', 'Mechatronics and IoT', 'M&IOT', 'Theory', 'Mechanical Engineering', 7, 'FAC055', 'CL_MECH_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_MECH_4_2', 'ME3792', 'Computer Integrated Manufacturing', 'CIM', 'Theory', 'Mechanical Engineering', 7, 'FAC052', 'CL_MECH_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_MECH_4_3', 'GE3791', 'Human Values and Ethics', 'HVE', 'Theory', 'Mechanical Engineering', 7, 'FAC_MECH_101', 'CL_MECH_IV', '2-0-0-2', 30, 2, 0, 0, 2),
('SUB_MECH_4_4', 'GE3792', 'Industrial Management', 'IM', 'Theory', 'Mechanical Engineering', 7, 'FAC_MECH_102', 'CL_MECH_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_MECH_4_5', 'OHS352', 'Project Report Writing', 'PRW', 'Theory', 'Mechanical Engineering', 7, 'FAC059', 'CL_MECH_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_MECH_4_6', 'OML351', 'Introduction to non-destructive testing', 'NDT', 'Theory', 'Mechanical Engineering', 7, 'FAC_MECH_104', 'CL_MECH_IV', '3-0-0-3', 45, 3, 0, 0, 3),
('SUB_MECH_4_7', 'ME3781', 'Mechatronics and IoT Laboratory', 'M&IOT LAB', 'Practical', 'Mechanical Engineering', 7, 'FAC055', 'CL_MECH_IV', '0-0-4-2', 60, 0, 0, 4, 2),
('SUB_MECH_4_8', 'NM', 'NAAN MUDHALVAN (Product Conceptualization and Prototyping)', 'NM', 'Skill', 'Mechanical Engineering', 7, 'FAC_MECH_104', 'CL_MECH_IV', '0-0-4-2', 60, 0, 0, 4, 2),
('SUB_MECH_4_9', 'LIB', 'LIBRARY', 'LIBRARY', 'Other', 'Mechanical Engineering', 7, 'FAC058', 'CL_MECH_IV', '0-0-0-1', 15, 0, 0, 0, 1);

-- ─────────────────────────────────────────
-- TABLE: STUDENTS (2024-2028 III Year MECH)
-- ─────────────────────────────────────────
INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
('ST_MECH3_1', 1, '921024114001', 'ABARNA B', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_2', 2, '921024114002', 'ABINESH T', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_3', 3, '921024114003', 'ABISHEK N', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_4', 4, '921024114005', 'BHARATHWAJ G', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_5', 5, '921024114006', 'BHUPESH G T', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_6', 6, '921024114007', 'CHANDRESHWAR G', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_7', 7, '921024114008', 'DHECHITH J', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_8', 8, '921024114009', 'JEEVA R', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_9', 9, '921024114010', 'KAVIRANJANI M', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_10', 10, '921024114011', 'LATHIKA R', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_11', 11, '921024114012', 'MANOJRAJ R', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_12', 12, '921024114013', 'MOHANRAJ P', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_13', 13, '921024114014', 'NAVINRAJ M', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_14', 14, '921024114015', 'RAHUL KRISHNA G', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_15', 15, '921024114016', 'RANJITH KUMAR K', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_16', 16, '921024114017', 'RIYAZ AHAMED S', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_17', 17, '921024114018', 'SAKTHIVEL PANDI K', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_18', 18, '921024114019', 'SANJAY RAMKUMAR M', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_19', 19, '921024114020', 'SANJAY THALAIKUMAR M', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_20', 20, '921024114021', 'SANTHOSH M', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_21', 21, '921024114022', 'SARATHI S', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_22', 22, '921024114023', 'SENTHIL MURUGAN K', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_23', 23, '921024114024', 'SIDDHARTHAN E', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_24', 24, '921024114025', 'SRINIVASAN R', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_25', 25, '921024114026', 'SUDHARSAN S', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_26', 26, '921024114027', 'SUMANKUMAR B', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_27', 27, '921024114028', 'VETRIVEL K', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_28', 28, '921024114029', 'VIGNESHKUMAR M', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_29', 29, '921024114030', 'VISHAL S', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_30', 30, '921024114031', 'YOGA ARJUN R S', 'CL_MECH_III', 'Mechanical Engineering'),
('ST_MECH3_31', 31, '921024114032', 'YUVASARAVANAKUMAR P', 'CL_MECH_III', 'Mechanical Engineering');

-- ─────────────────────────────────────────
-- TABLE: STUDENTS (2023-2027 IV Year MECH)
-- ─────────────────────────────────────────
INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
('ST_MECH4_1', 1, '921023114001', 'AJAY D', 'CL_MECH_IV', 'Mechanical Engineering'),
('ST_MECH4_2', 2, '921023114002', 'DHIYANESH K', 'CL_MECH_IV', 'Mechanical Engineering'),
('ST_MECH4_3', 3, '921023114003', 'HARI RAM R', 'CL_MECH_IV', 'Mechanical Engineering'),
('ST_MECH4_4', 4, '921023114004', 'KARUTHAPANDI E', 'CL_MECH_IV', 'Mechanical Engineering'),
('ST_MECH4_5', 5, '921023114005', 'PANDEESWARAN B', 'CL_MECH_IV', 'Mechanical Engineering'),
('ST_MECH4_6', 6, '921023114006', 'RAJESH KUMAR M', 'CL_MECH_IV', 'Mechanical Engineering'),
('ST_MECH4_7', 7, '921023114007', 'SANJAY K', 'CL_MECH_IV', 'Mechanical Engineering'),
('ST_MECH4_8', 8, '921023114008', 'SATHISH P', 'CL_MECH_IV', 'Mechanical Engineering'),
('ST_MECH4_9', 9, '921023114009', 'YOGESH G', 'CL_MECH_IV', 'Mechanical Engineering'),
('ST_MECH4_10', 10, '921023114301', 'DEEPAN RAJ E', 'CL_MECH_IV', 'Mechanical Engineering');
