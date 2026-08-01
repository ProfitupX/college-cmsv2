-- ============================================================
-- College CMS — MySQL Schema
-- College: Nadar Saraswathi College of Engineering & Technology
-- Department: Information Technology | II Year III Sem | 2025-26
-- ============================================================
-- HOW TO USE:
--   1. Open MySQL Workbench → File → Open SQL Script → select this file
--   2. Press Ctrl+Shift+Enter (Execute All)
--   3. Then run seed.sql the same way
-- ============================================================

CREATE DATABASE IF NOT EXISTS college_cms
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE college_cms;

-- ─────────────────────────────────────────
-- 1. DEPARTMENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id           INT          NOT NULL AUTO_INCREMENT,
  short_name   VARCHAR(20)  NOT NULL,
  name         VARCHAR(150) NOT NULL,
  college_name VARCHAR(250),
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- 2. CLASSES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id                  VARCHAR(20)  NOT NULL,
  name                VARCHAR(100) NOT NULL,
  department          VARCHAR(150),
  semester            INT,
  year_label          VARCHAR(10)  COMMENT 'e.g. II',
  section             VARCHAR(5),
  room_no             VARCHAR(20),
  academic_year       VARCHAR(20),
  batch               VARCHAR(20),
  class_coordinator   VARCHAR(100),
  asst_coordinator    VARCHAR(100),
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- 3. STUDENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id        VARCHAR(20)  NOT NULL,
  s_no      INT          NOT NULL,
  roll_no   VARCHAR(30)  NOT NULL,
  name      VARCHAR(100) NOT NULL,
  class_id  VARCHAR(20)  NOT NULL,
  department VARCHAR(150),
  PRIMARY KEY (id),
  UNIQUE KEY uq_rollno (roll_no),
  CONSTRAINT fk_student_class FOREIGN KEY (class_id) REFERENCES classes(id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- 4. STAFFS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staffs (
  id            VARCHAR(20)  NOT NULL,
  name          VARCHAR(100) NOT NULL,
  short_name    VARCHAR(100),
  designation   VARCHAR(100),
  role          VARCHAR(30)  DEFAULT 'faculty',
  email         VARCHAR(150) NOT NULL,
  employee_id   VARCHAR(50),
  password      VARCHAR(255) DEFAULT 'faculty123',
  class_role    VARCHAR(50),
  department    VARCHAR(150),
  PRIMARY KEY (id),
  UNIQUE KEY uq_email (email)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- 5. SUBJECTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id          VARCHAR(20)  NOT NULL,
  code        VARCHAR(30)  NOT NULL,
  name        VARCHAR(200) NOT NULL,
  acronym     VARCHAR(20),
  type        VARCHAR(50)  DEFAULT 'Theory',
  department  VARCHAR(150),
  semester    INT,
  l           INT          DEFAULT 0,
  t           INT          DEFAULT 0,
  p           INT          DEFAULT 0,
  c           INT          DEFAULT 0,
  total_hours INT,
  faculty_id  VARCHAR(20),
  class_id    VARCHAR(20),
  PRIMARY KEY (id),
  CONSTRAINT fk_subject_faculty FOREIGN KEY (faculty_id) REFERENCES staffs(id),
  CONSTRAINT fk_subject_class   FOREIGN KEY (class_id)   REFERENCES classes(id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- 6. MARKS SESSIONS
--    One row per "Submit Marks" action
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marks_sessions (
  id            INT           NOT NULL AUTO_INCREMENT,
  subject_id    VARCHAR(20)   NOT NULL,
  class_id      VARCHAR(20)   NOT NULL,
  staff_id      VARCHAR(20),
  session_label VARCHAR(100),
  total_max     DECIMAL(6,2)  NOT NULL COMMENT 'Will be max 95 based on staff components',
  total_hours   INT,
  internal2_total_hours INT,
  status        VARCHAR(20)   DEFAULT 'locked',
  avg_score     DECIMAL(5,2)  DEFAULT 0.00,
  student_count INT           DEFAULT 0,
  remedial_action TEXT,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_session_sub FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT fk_session_cls FOREIGN KEY (class_id)   REFERENCES classes(id)  ON DELETE CASCADE,
  CONSTRAINT fk_session_stf FOREIGN KEY (staff_id)   REFERENCES staffs(id)   ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- 4c. session_attendance
--    Stores hours attended per student for a session
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_attendance (
  session_id         INT NOT NULL,
  student_id         VARCHAR(20) NOT NULL,
  hours_attended     INT,
  internal_exam_mark DECIMAL(6,2),
  lab_attendance     INT,
  lab_mark           DECIMAL(6,2),
  PRIMARY KEY (session_id, student_id),
  CONSTRAINT fk_att_session FOREIGN KEY (session_id) REFERENCES marks_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_att_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- 7. ASSESSMENT COMPONENTS
--    Dynamic components staff add per session
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessment_components (
  id            INT           NOT NULL AUTO_INCREMENT,
  session_id    INT           NOT NULL,
  type_id       VARCHAR(30)   COMMENT 'test | assignment | quiz | ...',
  label         VARCHAR(100)  NOT NULL COMMENT 'Custom name e.g. Test 1',
  conducted_max DECIMAL(6,2)  DEFAULT 100 COMMENT 'Marks the exam was written for',
  max_marks     DECIMAL(6,2)  NOT NULL COMMENT 'Weight % out of 100 final total',
  icon          VARCHAR(10),
  color         VARCHAR(20),
  sort_order    INT           DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT fk_comp_session FOREIGN KEY (session_id)
    REFERENCES marks_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- 8. MARKS
--    One row per student per component
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marks (
  id              INT           NOT NULL AUTO_INCREMENT,
  session_id      INT           NOT NULL,
  component_id    INT           NOT NULL,
  student_id      VARCHAR(20)   NOT NULL,
  marks_obtained  DECIMAL(6,2)  DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mark (session_id, component_id, student_id),
  CONSTRAINT fk_mark_session   FOREIGN KEY (session_id)   REFERENCES marks_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_mark_component FOREIGN KEY (component_id) REFERENCES assessment_components(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- 9. MARK UNLOCK REQUESTS
--    Requests sent by staff to HOD to edit locked marks
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mark_unlock_requests (
  id            INT           NOT NULL AUTO_INCREMENT,
  session_id    INT           NOT NULL,
  subject_id    VARCHAR(20)   NOT NULL,
  class_id      VARCHAR(20)   NOT NULL,
  staff_id      VARCHAR(20)   NOT NULL,
  reason        TEXT,
  status        VARCHAR(20)   DEFAULT 'pending', -- pending | approved | rejected
  requested_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  actioned_at   TIMESTAMP     NULL,
  actioned_by   VARCHAR(20)   NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_unlock_session FOREIGN KEY (session_id) REFERENCES marks_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_unlock_staff   FOREIGN KEY (staff_id)   REFERENCES staffs(id)   ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- 10. NOTIFICATIONS
--     System workflow messages for deadlines and freezing
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id            INT           NOT NULL AUTO_INCREMENT,
  target_role   VARCHAR(50)   COMMENT 'e.g. hod, class_coordinator, or specific staff_id',
  target_id     VARCHAR(20)   COMMENT 'staff ID if targeted to a specific user',
  title         VARCHAR(150)  NOT NULL,
  message       TEXT          NOT NULL,
  link          VARCHAR(255)  COMMENT 'Deep link for interactive notifications',
  is_read       BOOLEAN       DEFAULT FALSE,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- 11. SYSTEM SETTINGS
--     Global configurations (e.g. HOD marks entry deadline)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  setting_key   VARCHAR(100)  NOT NULL,
  setting_value VARCHAR(255)  NOT NULL,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- 12. CLASS ANALYSIS REMARKS
--     Manual qualitative inputs from Class In-charge per session
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_analysis_remarks (
  id               INT           NOT NULL AUTO_INCREMENT,
  class_id         VARCHAR(20)   NOT NULL,
  session_label    VARCHAR(50)   NOT NULL,
  remarks          TEXT,
  improvement_plan TEXT,
  updated_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_class_session (class_id, session_label),
  CONSTRAINT fk_rem_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Confirm
SELECT 'Schema created successfully ✓' AS status;



-- ============================================================
-- SEED DATA DUMP
-- ============================================================

-- ─────────────────────────────────────────
-- TABLE: DEPARTMENTS
-- ─────────────────────────────────────────
INSERT IGNORE INTO departments (id, short_name, name, college_name) VALUES
(1, 'IT', 'Information Technology', 'Nadar Saraswathi College of Engineering and Technology, Theni'),
(2, 'CSE', 'Computer Science and Engineering', 'Nadar Saraswathi College of Engineering and Technology, Theni'),
(3, 'CSE', 'Computer Science and Engineering', 'Nadar Saraswathi College of Engineering and Technology, Theni'),
(4, 'AIDS', 'Artificial Intelligence and Data Science', 'Nadar Saraswathi College of Engineering and Technology, Theni'),
(5, 'EEE', 'Electrical and Electronics Engineering', 'Nadar Saraswathi College of Engineering and Technology, Theni'),
(6, 'ECE', 'Electronics and Communication Engineering', 'Nadar Saraswathi College of Engineering and Technology, Theni'),
(7, 'MECH', 'Mechanical Engineering', 'Nadar Saraswathi College of Engineering and Technology, Theni'),
(8, 'CIVIL', 'Civil Engineering', 'Nadar Saraswathi College of Engineering and Technology, Theni'),
(9, 'AIDS', 'Artificial Intelligence and Data Science', 'Nadar Saraswathi College of Engineering and Technology, Theni'),
(10, 'CSE', 'Computer Science and Engineering', 'Nadar Saraswathi College of Engineering and Technology, Theni'),
(11, 'S&H', 'Science and Humanities', 'Nadar Saraswathi College of Engineering and Technology, Theni');

-- ─────────────────────────────────────────
-- TABLE: CLASSES
-- ─────────────────────────────────────────
INSERT IGNORE INTO classes (id, name, department, semester, year_label, section, room_no, academic_year, batch, class_coordinator, asst_coordinator) VALUES
('CL001', 'IT - II Year - III Sem', 'Information Technology', 3, 'II', 'A', 'CR-16', '2025-2026', '2024-2028', 'Mr. N. Kesavamoorthy', 'Mrs. P. Jasmine Jose'),
('CL002', 'CSE - II Year - III Sem', 'Computer Science and Engineering', 3, 'II', 'A', 'CR-11', '2026-2027', '2025-2029', 'Mrs. R.Archana', 'Mrs.V.Anusuya'),
('CL003', 'AI&DS - II Year - III Sem', 'Artificial Intelligence and Data Science', 3, 'II', 'A', 'CR-25', '2026-2027', '2025-2029', 'Mr. S. Kodeeswaran', 'Mrs. K. Jenifer'),
('CL004', 'EEE - II Year - III Sem', 'Electrical and Electronics Engineering', 3, 'II', 'A', 'CR-8', '2026-2027', '2025-2029', 'Mrs. H. Juriya Banu', 'Mrs. R. Chitra'),
('CL005', 'ECE - II Year - III Sem', 'Electronics and Communication Engineering', 3, 'II', 'A', 'Class Room 04', '2026-2027', '2025-2029', 'Mr. R. Pradeep Kumar', 'Mrs. S. Rajeshshree'),
('CL006', 'MECH - II Year - III Sem', 'Mechanical Engineering', 3, 'II', 'A', 'Class Room 12', '2026-2027', '2025-2029', 'Dr. B. Nagarajan', 'Mr. R. Nagaraja'),
('CL007', 'CIVIL - II Year - III Sem', 'Civil Engineering', 3, 'II', 'A', '19', '2026-2027', '2025-2029', 'Mrs. S. Gayathri', 'Mr. T. Hariprasath');

-- ─────────────────────────────────────────
-- TABLE: STAFFS
-- ─────────────────────────────────────────
INSERT IGNORE INTO staffs (id, name, short_name, designation, role, email, employee_id, password, class_role, department) VALUES
('ADM001', 'Admin User', 'Admin', 'System Administrator', 'admin', 'admin@nscet.edu.in', 'ADMIN-001', 'admin123', NULL, 'Information Technology'),
('FAC001', 'Mr. C. Prathap', 'C. Prathap', 'AP, HOD IT', 'hod', 'prathap.it@nscet.edu.in', 'NSCET-IT-001', 'faculty123', NULL, 'Information Technology'),
('FAC002', 'Dr. C. Chithra', 'C. Chithra', 'AP', 'faculty', 'chithra.it@nscet.edu.in', 'NSCET-IT-002', 'faculty123', NULL, NULL),
('FAC003', 'Mrs. P. Jasmine Jose', 'P. Jasmine Jose', 'AP', 'faculty', 'jasminejose.it@nscet.edu.in', 'NSCET-IT-003', 'faculty123', 'Assistant Coordinator', 'Information Technology'),
('FAC004', 'Mr. R. Udhaya Kumar', 'R. Udhaya Kumar', 'AP', 'faculty', 'udhayakumar.it@nscet.edu.in', 'NSCET-IT-004', 'faculty123', NULL, 'Information Technology'),
('FAC005', 'Mr. N. Kesavamoorthy', 'N. Kesavamoorthy', 'AP', 'faculty', 'kesavamoorthy.it@nscet.edu.in', 'NSCET-IT-005', 'faculty123', 'Class Coordinator', 'Information Technology'),
('FAC006', 'Mrs. M. Mareeswari', 'M. Mareeswari', 'AP', 'faculty', 'mareeswari.it@nscet.edu.in', 'NSCET-IT-006', 'faculty123', NULL, 'Information Technology'),
('FAC007', 'Dr.R.Valarmathi', NULL, 'AP', 'faculty', 'valarmathi.@nscet.org', 'NSCET-S&H-007', 'faculty123', NULL, 'Other'),
('FAC010', 'Mrs. M. Karunyah', 'M. Karunyah', 'AP', 'faculty', 'karunyah.maths@nscet.edu.in', 'NSCET-MATHS-010', 'faculty123', NULL, 'Computer Science and Engineering'),
('FAC011', 'Mrs. V. Anusuya', 'V. Anusuya', 'AP', 'faculty', 'anusuya.cse@nscet.edu.in', 'NSCET-CSE-011', 'faculty123', 'Assistant Coordinator', 'Computer Science and Engineering'),
('FAC012', 'Mrs. R. Archana', 'R. Archana', 'AP', 'faculty', 'archana.cse@nscet.edu.in', 'NSCET-CSE-012', 'faculty123', 'Class Coordinator', 'Computer Science and Engineering'),
('FAC013', 'Mrs. M. Venkata Lakshmi', 'M. Venkata Lakshmi', 'AP', 'faculty', 'venkatalakshmi.cse@nscet.edu.in', 'NSCET-CSE-013', 'faculty123', NULL, 'Computer Science and Engineering'),
('FAC014', 'Dr. J. Mathalai Raj', 'J. Mathalai Raj', 'HOD CSE', 'hod', 'mathalairaj.cse@nscet.edu.in', 'NSCET-CSE-014', 'faculty123', NULL, 'Computer Science and Engineering'),
('FAC015', 'Mrs. V. Vinothini', 'V. Vinothini', 'AP', 'faculty', 'vinothini.cse@nscet.edu.in', 'NSCET-CSE-015', 'faculty123', NULL, 'Computer Science and Engineering'),
('FAC016', 'Mrs. T. Rathimala', 'T. Rathimala', 'AP', 'faculty', 'rathimala.cse@nscet.edu.in', 'NSCET-CSE-016', 'faculty123', NULL, 'Computer Science and Engineering'),
('FAC017', 'Mr. R. C. Richard Britto', 'R. C. Richard Britto', 'AP', 'faculty', 'richardbritto.eng@nscet.edu.in', 'NSCET-ENG-017', 'faculty123', NULL, 'Computer Science and Engineering'),
('FAC021', 'Mrs. K. Jenifer', 'K. Jenifer', 'AP', 'faculty', 'jenifer.aids@nscet.edu.in', 'NSCET-AIDS-021', 'faculty123', 'Assistant Coordinator', 'Artificial Intelligence and Data Science'),
('FAC022', 'Mrs. S. Sunitha', 'S. Sunitha', 'AP', 'faculty', 'sunitha.aids@nscet.edu.in', 'NSCET-AIDS-022', 'faculty123', NULL, 'Artificial Intelligence and Data Science'),
('FAC023', 'Mr. S. Kodeeswaran', 'S. Kodeeswaran', 'AP', 'faculty', 'kodeeswaran.aids@nscet.edu.in', 'NSCET-AIDS-023', 'faculty123', 'Class Coordinator', 'Artificial Intelligence and Data Science'),
('FAC024', 'Mrs. V. Nithiyapriya', 'V. Nithiyapriya', 'AP', 'faculty', 'nithiyapriya.aids@nscet.edu.in', 'NSCET-AIDS-024', 'faculty123', NULL, 'Artificial Intelligence and Data Science'),
('FAC025', 'Mrs. G. Geerthiga', 'G. Geerthiga', 'AP', 'faculty', 'geerthiga.aids@nscet.edu.in', 'NSCET-AIDS-025', 'faculty123', NULL, 'Artificial Intelligence and Data Science'),
('FAC026', 'Mrs. Karunya', 'Karunya', 'AP/S&H', 'faculty', 'karunya.sh@nscet.edu.in', 'NSCET-SH-026', 'faculty123', NULL, 'Science and Humanities'),
('FAC027', 'Dr. R. Valarmathi', 'R. Valarmathi', 'AP/S&H', 'faculty', 'valarmathi.sh@nscet.edu.in', 'NSCET-SH-027', 'faculty123', NULL, 'Science and Humanities'),
('FAC031', 'Dr. B. Mallaiyasamy', 'B. Mallaiyasamy', 'ASP/S&H', 'faculty', 'mallaiyasamy.sh@nscet.edu.in', 'NSCET-SH-031', 'faculty123', NULL, 'Science and Humanities'),
('FAC032', 'Mrs. A. Nishetha Jeflin Nixon', 'A. Nishetha Jeflin Nixon', 'AP/EEE', 'faculty', 'nishetha.eee@nscet.edu.in', 'NSCET-EEE-032', 'faculty123', NULL, 'Electrical and Electronics Engineering'),
('FAC033', 'Mrs. R. Chitra', 'R. Chitra', 'AP/EEE', 'faculty', 'chitra.eee@nscet.edu.in', 'NSCET-EEE-033', 'faculty123', 'Assistant Coordinator', 'Electrical and Electronics Engineering'),
('FAC034', 'Dr. R. Athilingam', 'R. Athilingam', 'HOD/EEE', 'hod', 'athilingam.eee@nscet.edu.in', 'NSCET-EEE-034', 'faculty123', NULL, 'Electrical and Electronics Engineering'),
('FAC035', 'Mrs. M. Vijayalakshmi', 'M. Vijayalakshmi', 'AP/EEE', 'faculty', 'vijayalakshmi.eee@nscet.edu.in', 'NSCET-EEE-035', 'faculty123', NULL, 'Electrical and Electronics Engineering'),
('FAC036', 'Mrs. H. Juriya Banu', 'H. Juriya Banu', 'AP/EEE', 'faculty', 'juriyabanu.eee@nscet.edu.in', 'NSCET-EEE-036', 'faculty123', 'Class Coordinator', 'Electrical and Electronics Engineering'),
('FAC037', 'Dr. N. Pandi Selvi', 'N. Pandi Selvi', 'AP/EEE', 'faculty', 'pandiselvi.eee@nscet.edu.in', 'NSCET-EEE-037', 'faculty123', NULL, 'Electrical and Electronics Engineering'),
('FAC038', 'Dr. P. Malarvizhi', 'P. Malarvizhi', 'ASP/S&H', 'faculty', 'malarvizhi.sh@nscet.edu.in', 'NSCET-SH-038', 'faculty123', NULL, 'Science and Humanities'),
('FAC041', 'Mr. Murugan', 'Mr. Murugan', 'AP/S&H', 'faculty', 'murugan.sh@nscet.edu.in', 'NSCET-SH-041', 'faculty123', NULL, 'Science and Humanities'),
('FAC042', 'Mrs. T. Tamilselvi', 'T. Tamilselvi', 'AP/ECE', 'faculty', 'tamilselvi.ece@nscet.edu.in', 'NSCET-ECE-042', 'faculty123', NULL, 'Electronics and Communication Engineering'),
('FAC043', 'Mrs. S. Rajeshshree', 'S. Rajeshshree', 'AP/ECE', 'faculty', 'rajeshshree.ece@nscet.edu.in', 'NSCET-ECE-043', 'faculty123', 'Assistant Coordinator', 'Electronics and Communication Engineering'),
('FAC044', 'Dr. N. Mathavan', 'N. Mathavan', 'ASP/ECE', 'faculty', 'mathavan.ece@nscet.edu.in', 'NSCET-ECE-044', 'faculty123', NULL, 'Electronics and Communication Engineering'),
('FAC045', 'Dr. T. Venish Kumar', 'T. Venish Kumar', 'ASP/ECE', 'faculty', 'venishkumar.ece@nscet.edu.in', 'NSCET-ECE-045', 'faculty123', NULL, 'Electronics and Communication Engineering'),
('FAC046', 'Mr. R. Pradeep Kumar', 'R. Pradeep Kumar', 'AP/ECE', 'faculty', 'pradeepkumar.ece@nscet.edu.in', 'NSCET-ECE-046', 'faculty123', 'Class Coordinator', 'Electronics and Communication Engineering'),
('FAC047', 'S/H Staff', 'S/H Staff', 'AP/S&H', 'faculty', 'shstaff.eng@nscet.edu.in', 'NSCET-SH-047', 'faculty123', NULL, 'Science and Humanities'),
('FAC048', 'Mrs. S. Kalaivani', 'S. Kalaivani', 'AP/ECE', 'faculty', 'kalaivani.ece@nscet.edu.in', 'NSCET-ECE-048', 'faculty123', NULL, 'Electronics and Communication Engineering'),
('FAC049', 'HOD ECE', 'HOD', 'HOD/ECE', 'hod', 'hod_ece@nscet.edu.in', 'NSCET-ECE-HOD', 'faculty123', NULL, 'Electronics and Communication Engineering'),
('FAC052', 'Dr. A. Vennimalai Rajan', 'A. Vennimalai Rajan', 'ASP/Mech', 'faculty', 'vennimalairajan.mech@nscet.edu.in', 'NSCET-MECH-052', 'faculty123', NULL, 'Mechanical Engineering'),
('FAC053', 'Dr. B. Nagarajan', 'B. Nagarajan', 'ASP/Mech', 'faculty', 'nagarajan.mech@nscet.edu.in', 'NSCET-MECH-053', 'faculty123', 'Class Coordinator', 'Mechanical Engineering'),
('FAC054', 'Mr. S. Harikishore', 'S. Harikishore', 'AP/Mech', 'faculty', 'harikishore.mech@nscet.edu.in', 'NSCET-MECH-054', 'faculty123', NULL, 'Mechanical Engineering'),
('FAC055', 'Mr. R. Nagaraja', 'R. Nagaraja', 'AP/Mech', 'faculty', 'nagaraja.mech@nscet.edu.in', 'NSCET-MECH-055', 'faculty123', 'Class Coordinator', 'Mechanical Engineering'),
('FAC058', 'Dr. S. Sinthan', 'S. Sinthan', 'Librarian', 'faculty', 'sinthan.lib@nscet.edu.in', 'NSCET-LIB-058', 'faculty123', NULL, 'Mechanical Engineering'),
('FAC059', 'Dr. B. Ratha Krishnan', 'B. Ratha Krishnan', 'HOD/Mech', 'hod', 'rathakrishnan.mech@nscet.edu.in', 'NSCET-MECH-HOD', 'faculty123', NULL, 'Mechanical Engineering'),
('FAC062', 'Mrs. S. Gayathri', 'S. Gayathri', 'AP/Civil', 'faculty', 'gayathri.civil@nscet.edu.in', 'NSCET-CIVIL-062', 'faculty123', 'Class Coordinator', 'Civil Engineering'),
('FAC063', 'Mr. P. Arul Jebaraj', 'P. Arul Jebaraj', 'AP/Civil', 'faculty', 'aruljebaraj.civil@nscet.edu.in', 'NSCET-CIVIL-063', 'faculty123', NULL, 'Civil Engineering'),
('FAC064', 'Mr. R. Shanmugapriyan', 'R. Shanmugapriyan', 'AP/Civil', 'faculty', 'shanmugapriyan.civil@nscet.edu.in', 'NSCET-CIVIL-064', 'faculty123', NULL, 'Civil Engineering'),
('FAC065', 'Mr. T. Hariprasath', 'T. Hariprasath', 'AP/Civil', 'faculty', 'hariprasath.civil@nscet.edu.in', 'NSCET-CIVIL-065', 'faculty123', 'Assistant Coordinator', 'Civil Engineering');

INSERT IGNORE INTO staffs (id, name, short_name, designation, role, email, employee_id, password, class_role, department) VALUES
('FAC066', 'Mrs. M. Kanimozhi', 'M. Kanimozhi', 'AP/Civil', 'faculty', 'kanimozhi.civil@nscet.edu.in', 'NSCET-CIVIL-066', 'faculty123', NULL, 'Civil Engineering'),
('FAC067', 'Mrs. M. Sindhu', 'M. Sindhu', 'AP/Civil', 'faculty', 'sindhu.civil@nscet.edu.in', 'NSCET-CIVIL-067', 'faculty123', NULL, 'Civil Engineering'),
('FAC068', 'Mrs. P. Aadhitya', 'P. Aadhitya', 'AP/Civil', 'faculty', 'aadhitya.civil@nscet.edu.in', 'NSCET-CIVIL-068', 'faculty123', NULL, 'Civil Engineering'),
('FAC069', 'Mrs. K. Benita Merlin Isabella', 'K. Benita Merlin Isabella', 'AP/Civil', 'faculty', 'benita.civil@nscet.edu.in', 'NSCET-CIVIL-069', 'faculty123', NULL, 'Civil Engineering'),
('FAC070', 'Mrs. Devi Priya', 'Devi Priya', 'AP/Eng', 'faculty', 'devipriya.eng@nscet.edu.in', 'NSCET-ENG-070', 'faculty123', NULL, 'Civil Engineering'),
('FAC071', 'Mr. N. Nagarathinam', 'N. Nagarathinam', 'HOD/Civil', 'hod', 'nagarathinam.civil@nscet.edu.in', 'NSCET-CIVIL-HOD', 'faculty123', NULL, 'Civil Engineering'),
('PRN001', 'Dr. C. Mathalai Sundaram', 'Principal', 'Principal & Executive Head', 'principal', 'principal@nscet.edu.in', 'EXE-001', 'principal123', NULL, 'College Administration'),
('VPN001', 'Dr. M. Sathya', 'Vice Principal', 'Vice Principal & Academic Head', 'vice_principal', 'viceprincipal@nscet.edu.in', 'EXE-002', 'vp123', NULL, 'Academic Administration');

-- ─────────────────────────────────────────
-- TABLE: SUBJECTS
-- ─────────────────────────────────────────
INSERT IGNORE INTO subjects (id, code, name, acronym, type, department, semester, faculty_id, class_id, ltpc, total_hours, l, t, p, c) VALUES
('SUB001', 'MA25C08', 'Discrete Mathematics', 'DM', 'Theory', 'Information Technology', 3, 'FAC002', 'CL001', '3104', 60, 0, 0, 0, 0),
('SUB002', 'CW25201', 'Computer Organization and Architecture', 'COA', 'Theory', 'Information Technology', 3, 'FAC003', 'CL001', '3104', 60, 0, 0, 0, 0),
('SUB003', 'CS25C08', 'Data Structures', 'DS', 'Lab-cum-Theory', 'Information Technology', 3, 'FAC004', 'CL001', '3045', 75, 0, 0, 0, 0),
('SUB004', 'CS25C07', 'Object Oriented Programming', 'OOP', 'Lab-cum-Theory', 'Information Technology', 3, 'FAC001', 'CL001', '3045', 75, 0, 0, 0, 0),
('SUB005', 'IT25301', 'Web Technologies', 'WT', 'Lab-cum-Theory', 'Information Technology', 3, 'FAC005', 'CL001', '3024', 60, 0, 0, 0, 0),
('SUB006', 'SD', 'Skill Development Course - I', 'SD', 'Lab-cum-Theory', 'Information Technology', 3, 'FAC006', 'CL001', '1022', 30, 0, 0, 0, 0),
('SUB010', 'MA25C08', 'Discrete Mathematics', 'DM', 'Theory', 'Computer Science and Engineering', 3, 'FAC010', 'CL002', NULL, NULL, 0, 0, 0, 0),
('SUB011', 'CS25C11', 'Operating Systems', 'OS', 'Theory-cum-Lab', 'Computer Science and Engineering', 3, 'FAC011', 'CL002', NULL, NULL, 0, 0, 0, 0),
('SUB012', 'CS25C10', 'Object Oriented Software Engineering', 'OOSE', 'Theory', 'Computer Science and Engineering', 3, 'FAC012', 'CL002', NULL, NULL, 0, 0, 0, 0),
('SUB013', 'CS25C08', 'Data Structures', 'DS', 'Theory-cum-Lab', 'Computer Science and Engineering', 3, 'FAC013', 'CL002', NULL, NULL, 0, 0, 0, 0),
('SUB014', 'CS25C09', 'Java Programming', 'JAVA', 'Theory-cum-Lab', 'Computer Science and Engineering', 3, 'FAC014', 'CL002', NULL, NULL, 0, 0, 0, 0),
('SUB015', 'NM', 'Naan Mudhalvan Course', 'NM', 'Skill', 'Computer Science and Engineering', 3, 'FAC012', 'CL002', NULL, NULL, 0, 0, 0, 0),
('SUB016', 'SD', 'Skill Development Course-I', 'SD', 'Theory-cum-Lab', 'Computer Science and Engineering', 3, 'FAC016', 'CL002', NULL, NULL, 0, 0, 0, 0),
('SUB017', 'EN25C03', 'English Communication Skills Laboratory', 'ECS LAB', 'Practical', 'Computer Science and Engineering', 3, 'FAC017', 'CL002', NULL, NULL, 0, 0, 0, 0),
('SUB020', 'MA25C08', 'Discrete Mathematics', 'DM', 'Theory', 'Artificial Intelligence and Data Science', 3, 'FAC026', 'CL003', NULL, NULL, 0, 0, 0, 0),
('SUB021', 'CS25C08', 'Data Structures', 'DS', 'Theory-cum-Lab', 'Artificial Intelligence and Data Science', 3, 'FAC021', 'CL003', NULL, NULL, 0, 0, 0, 0),
('SUB022', 'CS25C09', 'Java Programming', 'JP', 'Theory-cum-Lab', 'Artificial Intelligence and Data Science', 3, 'FAC022', 'CL003', NULL, NULL, 0, 0, 0, 0),
('SUB023', 'AD25C01', 'Exploratory Data Analysis', 'EDA', 'Theory-cum-Lab', 'Artificial Intelligence and Data Science', 3, 'FAC023', 'CL003', NULL, NULL, 0, 0, 0, 0),
('SUB024', 'CS25C11', 'Operating Systems', 'OS', 'Theory', 'Artificial Intelligence and Data Science', 3, 'FAC024', 'CL003', NULL, NULL, 0, 0, 0, 0),
('SUB025', 'SD', 'Skill Development Course - I', 'SD', 'Skill', 'Artificial Intelligence and Data Science', 3, 'FAC025', 'CL003', NULL, NULL, 0, 0, 0, 0),
('SUB026', 'NM', 'Naan Mudhalvan Course', 'NM', 'Skill', 'Artificial Intelligence and Data Science', 3, 'FAC021', 'CL003', NULL, NULL, 0, 0, 0, 0),
('SUB027', 'EN25C03', 'English Communication Skills Laboratory', 'ECS LAB', 'Practical', 'Artificial Intelligence and Data Science', 3, 'FAC027', 'CL003', NULL, NULL, 0, 0, 0, 0),
('SUB030', 'MA25C04', 'Matrices for Engineers', 'MFE', 'Theory', 'Electrical and Electronics Engineering', 3, 'FAC031', 'CL004', NULL, NULL, 0, 0, 0, 0),
('SUB031', 'EE25C04', 'Electromagnetic Theory', 'EMT', 'Theory', 'Electrical and Electronics Engineering', 3, 'FAC032', 'CL004', NULL, NULL, 0, 0, 0, 0),
('SUB032', 'EE25301', 'Digital Electronics', 'DE', 'Theory', 'Electrical and Electronics Engineering', 3, 'FAC033', 'CL004', NULL, NULL, 0, 0, 0, 0),
('SUB033', 'EE25302', 'Electric Circuit Analysis', 'ECA', 'Theory', 'Electrical and Electronics Engineering', 3, 'FAC034', 'CL004', NULL, NULL, 0, 0, 0, 0),
('SUB034', 'EE25C05', 'Electronic Devices and Circuits', 'EDC', 'Theory', 'Electrical and Electronics Engineering', 3, 'FAC035', 'CL004', NULL, NULL, 0, 0, 0, 0),
('SUB036', 'EE25303', 'Electric Circuit Laboratory', 'ECA LAB', 'Practical', 'Electrical and Electronics Engineering', 3, 'FAC034', 'CL004', NULL, NULL, 0, 0, 0, 0),
('SUB037', 'EE25C06', 'Electronics Laboratory', 'EL LAB', 'Practical', 'Electrical and Electronics Engineering', 3, 'FAC035', 'CL004', NULL, NULL, 0, 0, 0, 0),
('SUB038', 'EN25C03', 'English Communication Skills Laboratory - I', 'ECS LAB', 'Practical', 'Electrical and Electronics Engineering', 3, 'FAC038', 'CL004', NULL, NULL, 0, 0, 0, 0),
('SUB039', 'NM', 'Naan Mudhalvan', 'NM', 'Skill', 'Electrical and Electronics Engineering', 3, 'FAC036', 'CL004', NULL, NULL, 0, 0, 0, 0),
('SUB040', 'MA25C05', 'Probability, Statistical and Random Process', 'PSRP', 'Theory', 'Electronics and Communication Engineering', 3, 'FAC041', 'CL005', NULL, NULL, 0, 0, 0, 0),
('SUB041', 'EC25C04', 'Signals and Systems', 'SS', 'Theory', 'Electronics and Communication Engineering', 3, 'FAC042', 'CL005', NULL, NULL, 0, 0, 0, 0),
('SUB042', 'EC25C05', 'Electronic Circuit Analysis', 'ECA', 'Theory', 'Electronics and Communication Engineering', 3, 'FAC043', 'CL005', NULL, NULL, 0, 0, 0, 0),
('SUB043', 'EC25C06', 'Electro Magnetic Fields and Transmission Lines', 'EMF', 'Theory', 'Electronics and Communication Engineering', 3, 'FAC045', 'CL005', NULL, NULL, 0, 0, 0, 0),
('SUB044', 'EC25C07', 'Digital System Design', 'DSD', 'Theory', 'Electronics and Communication Engineering', 3, 'FAC046', 'CL005', NULL, NULL, 0, 0, 0, 0),
('SUB045', 'EC25C08', 'Digital System Design Laboratory', 'DSD LAB', 'Practical', 'Electronics and Communication Engineering', 3, 'FAC046', 'CL005', NULL, NULL, 0, 0, 0, 0),
('SUB046', 'EC25C09', 'Electronic Circuits Laboratory', 'EC LAB', 'Practical', 'Electronics and Communication Engineering', 3, 'FAC044', 'CL005', NULL, NULL, 0, 0, 0, 0),
('SUB047', 'EN25C03', 'English Communication Skill Laboratory-I', 'ENG LAB', 'Practical', 'Electronics and Communication Engineering', 3, 'FAC047', 'CL005', NULL, NULL, 0, 0, 0, 0),
('SUB048', 'SD LAB', 'Skill Development Course', 'SD LAB', 'Skill', 'Electronics and Communication Engineering', 3, 'FAC047', 'CL005', NULL, NULL, 0, 0, 0, 0),
('SUB049', 'NM', 'Naan Mudhalvan', 'NM', 'Skill', 'Electronics and Communication Engineering', 3, 'FAC048', 'CL005', NULL, NULL, 0, 0, 0, 0),
('SUB051', 'ME25C07', 'Applied Engineering Mechanics', 'AEM', 'Theory', 'Mechanical Engineering', 3, 'FAC052', 'CL006', NULL, NULL, 0, 0, 0, 0),
('SUB052', 'ME25301', 'Engineering Thermodynamics', 'ETD', 'Theory', 'Mechanical Engineering', 3, 'FAC053', 'CL006', NULL, NULL, 0, 0, 0, 0),
('SUB053', 'CE25C11', 'Strength of Materials', 'SOM', 'Theory-cum-Lab', 'Mechanical Engineering', 3, 'FAC054', 'CL006', NULL, NULL, 0, 0, 0, 0),
('SUB054', 'ME25C08', 'Metallurgy and Materials Science', 'MMS', 'Theory', 'Mechanical Engineering', 3, 'FAC055', 'CL006', NULL, NULL, 0, 0, 0, 0),
('SUB058', 'SDC - I', 'Skill Development Course - I', 'SDC - I', 'Skill', 'Mechanical Engineering', 3, 'FAC054', 'CL006', NULL, NULL, 0, 0, 0, 0),
('SUB059', 'NM', 'NAAN MUDHALVAN (Foundation Skills for Employability)', 'NM', 'Skill', 'Mechanical Engineering', 3, 'FAC054', 'CL006', NULL, NULL, 0, 0, 0, 0),
('SUB060', 'LIB', 'LIBRARY', 'LIB', 'Other', 'Mechanical Engineering', 3, 'FAC058', 'CL006', NULL, NULL, 0, 0, 0, 0),
('SUB071', 'CE25C02', 'Fluid Mechanics and Machinery', 'FMM', 'Theory', 'Civil Engineering', 3, 'FAC062', 'CL007', NULL, NULL, 0, 0, 0, 0),
('SUB072', 'AG25C01', 'Engineering Geology', 'EG', 'Theory', 'Civil Engineering', 3, 'FAC063', 'CL007', NULL, NULL, 0, 0, 0, 0);

INSERT IGNORE INTO subjects (id, code, name, acronym, type, department, semester, faculty_id, class_id, ltpc, total_hours, l, t, p, c) VALUES
('SUB073', 'CE25301', 'Strength of Materials I (L/T)', 'SOM I', 'Theory-cum-Lab', 'Civil Engineering', 3, 'FAC064', 'CL007', NULL, NULL, 0, 0, 0, 0),
('SUB074', 'CE25C03', 'Surveying and Geomatics', 'S&G', 'Theory', 'Civil Engineering', 3, 'FAC065', 'CL007', NULL, NULL, 0, 0, 0, 0),
('SUB075', 'SDC I', 'Skill Development Course I (L/T)', 'SDC I', 'Skill', 'Civil Engineering', 3, 'FAC066', 'CL007', NULL, NULL, 0, 0, 0, 0),
('SUB076', 'CE25302', 'Computer-aided Building Drawing', 'FMM LAB', 'Practical', 'Civil Engineering', 3, 'FAC067', 'CL007', NULL, NULL, 0, 0, 0, 0),
('SUB078', 'NM', 'Naan Mudhalvan', 'NM', 'Skill', 'Civil Engineering', 3, 'FAC066', 'CL007', NULL, NULL, 0, 0, 0, 0),
('SUB079', 'CE25C04', 'Surveying and Geomatics Laboratory', 'S&G LAB', 'Practical', 'Civil Engineering', 3, 'FAC065', 'CL007', NULL, NULL, 0, 0, 0, 0),
('SUB080', 'EN25C03', 'English Communication Skills Laboratory - II', 'ECS LAB', 'Practical', 'Civil Engineering', 3, 'FAC070', 'CL007', NULL, NULL, 0, 0, 0, 0),
('SUBEN02', 'EN25C03', 'English communication skills laboratory - II', NULL, 'Practical', NULL, NULL, 'FAC007', 'CL001', '0021', 15, 0, 0, 0, 0);

-- ─────────────────────────────────────────
-- TABLE: STUDENTS
-- ─────────────────────────────────────────
INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
('ST001', 1, '921025205001', 'Abarna M', 'CL001', NULL),
('ST002', 2, '921025205002', 'Abirami R', 'CL001', NULL),
('ST003', 3, '921025205003', 'Aishwarya Lakshmi S', 'CL001', NULL),
('ST004', 4, '921025205004', 'Akshaya S', 'CL001', NULL),
('ST005', 5, '921025205005', 'Aravindhан K', 'CL001', NULL),
('ST006', 6, '921025205006', 'Archana P', 'CL001', NULL),
('ST007', 7, '921025205007', 'Bhuvana Sri G', 'CL001', NULL),
('ST008', 8, '921025205008', 'Deena P', 'CL001', NULL),
('ST009', 9, '921025205009', 'Dhanalakshmi R', 'CL001', NULL),
('ST010', 10, '921025205010', 'Dharshini M', 'CL001', NULL),
('ST011', 11, '921025205011', 'Divya Sri S', 'CL001', NULL),
('ST012', 12, '921025205012', 'Elakkiya M', 'CL001', NULL),
('ST013', 13, '921025205013', 'Gobika Sri S', 'CL001', NULL),
('ST014', 14, '921025205014', 'Gowthamkumar M', 'CL001', NULL),
('ST015', 15, '921025205015', 'Guru K', 'CL001', NULL),
('ST016', 16, '921025205016', 'Hari Priya R', 'CL001', NULL),
('ST017', 17, '921025205017', 'Janarthanan M', 'CL001', NULL),
('ST018', 18, '921025205018', 'Jeyakrishnan P', 'CL001', NULL),
('ST019', 19, '921025205019', 'Jeysree S', 'CL001', NULL),
('ST020', 20, '921025205020', 'Karthiga M', 'CL001', NULL),
('ST021', 21, '921025205021', 'Kiruthika S', 'CL001', NULL),
('ST022', 22, '921025205022', 'Lakxman Hari K M', 'CL001', NULL),
('ST023', 23, '921025205023', 'Logasri K', 'CL001', NULL),
('ST024', 24, '921025205024', 'Mahalakshmi R', 'CL001', NULL),
('ST025', 25, '921025205025', 'Maharajan K', 'CL001', NULL),
('ST026', 26, '921025205026', 'Mahima Grace G', 'CL001', NULL),
('ST027', 27, '921025205027', 'Mohamed Irfan P', 'CL001', NULL),
('ST028', 28, '921025205028', 'Mohamedsyatharafath A', 'CL001', NULL),
('ST029', 29, '921025205029', 'Muthu Vetha Varshini M', 'CL001', NULL),
('ST030', 30, '921025205030', 'Nafilafathima R', 'CL001', NULL),
('ST031', 31, '921025205031', 'Niroshkumar R', 'CL001', NULL),
('ST032', 32, '921025205032', 'Nishanthini R', 'CL001', NULL),
('ST033', 33, '921025205033', 'Pavithra R', 'CL001', NULL),
('ST034', 34, '921025205034', 'Pratibha Shivaranjani P', 'CL001', NULL),
('ST035', 35, '921025205035', 'Prathisha Arasi S', 'CL001', NULL),
('ST036', 36, '921025205036', 'Praveena M', 'CL001', NULL),
('ST037', 37, '921025205037', 'Preetha M', 'CL001', NULL),
('ST038', 38, '921025205038', 'Priyadharshini M', 'CL001', NULL),
('ST039', 39, '921025205039', 'Rajaneswaran N', 'CL001', NULL),
('ST040', 40, '921025205040', 'Rajiya Priya K', 'CL001', NULL),
('ST041', 41, '921025205041', 'Renuga K', 'CL001', NULL),
('ST042', 42, '921025205042', 'Rinisha M', 'CL001', NULL),
('ST043', 43, '921025205043', 'Rohith Balaji M', 'CL001', NULL),
('ST044', 44, '921025205044', 'Roshini M', 'CL001', NULL),
('ST045', 45, '921025205045', 'Sabana Banu K', 'CL001', NULL),
('ST046', 46, '921025205046', 'Sanjaykumar B', 'CL001', NULL),
('ST047', 47, '921025205047', 'Santhosh P', 'CL001', NULL),
('ST048', 48, '921025205048', 'Saravanakumar A', 'CL001', NULL),
('ST049', 49, '921025205049', 'Sarushela G', 'CL001', NULL),
('ST050', 50, '921025205050', 'Shanmugavalli K', 'CL001', NULL);

INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
('ST051', 51, '921025205051', 'Sharunethra V', 'CL001', NULL),
('ST052', 52, '921025205052', 'Shivani B', 'CL001', NULL),
('ST053', 53, '921025205053', 'Shoba M', 'CL001', NULL),
('ST054', 54, '921025205054', 'Sujithram S', 'CL001', NULL),
('ST055', 55, '921025205055', 'Swetha T', 'CL001', NULL),
('ST056', 56, '921025205056', 'Thanisha S', 'CL001', NULL),
('ST057', 57, '921025205057', 'Thejini P', 'CL001', NULL),
('ST058', 58, '921025205058', 'Veerujothi P', 'CL001', NULL),
('ST059', 59, '921025205059', 'Velmurugan J', 'CL001', NULL),
('ST060', 60, '921025205060', 'Yuga Shri S', 'CL001', NULL),
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
('STU140', 40, '921025104040', 'PUGAZHENTHI G', 'CL002', 'Computer Science and Engineering');

INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
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
('STU160', 60, '921025104060', 'YOSHITHA K', 'CL002', 'Computer Science and Engineering'),
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
('STU230', 30, '921025243030', 'LAKSHANA S', 'CL003', 'Artificial Intelligence and Data Science');

INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
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
('STU257', 57, '921025243058', 'YUGASRI I', 'CL003', 'Artificial Intelligence and Data Science'),
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
('STU323', 23, '921025105024', 'KIRUBA A', 'CL004', 'Electrical and Electronics Engineering');

INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
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
('STU358', 58, '921025105060', 'YUVATHI SRI A', 'CL004', 'Electrical and Electronics Engineering'),
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
('STU415', 15, '921025106015', 'GIRIVASAN A', 'CL005', 'Electronics and Communication Engineering');

INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
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
('STU458', 58, '921025106059', 'VIKRAM N', 'CL005', 'Electronics and Communication Engineering'),
('STU501', 1, '921025114001', 'ABINESH P', 'CL006', 'Mechanical Engineering'),
('STU502', 2, '921025114002', 'AKASH K', 'CL006', 'Mechanical Engineering'),
('STU503', 3, '921025114003', 'AZHAGARRAJA P', 'CL006', 'Mechanical Engineering'),
('STU504', 4, '921025114004', 'BHUVANESHPANDI S', 'CL006', 'Mechanical Engineering'),
('STU505', 5, '921025114005', 'BUVANESWARAN S', 'CL006', 'Mechanical Engineering'),
('STU506', 6, '921025114006', 'DEEPAK A', 'CL006', 'Mechanical Engineering'),
('STU507', 7, '921025114007', 'DEEPAK KISHAN R', 'CL006', 'Mechanical Engineering');

INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
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
('STU542', 42, '921025114044', 'YUVARAJ M', 'CL006', 'Mechanical Engineering'),
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
('STU615', 15, '921025103015', 'MENAKA DEVI K', 'CL007', 'Civil Engineering');

INSERT IGNORE INTO students (id, s_no, roll_no, name, class_id, department) VALUES
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

