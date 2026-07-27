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
  type        VARCHAR(30)  DEFAULT 'Theory',
  department  VARCHAR(150),
  semester    INT,
  ltpc        VARCHAR(20),
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
  staff_id      VARCHAR(20)   NOT NULL,
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
  CONSTRAINT fk_mark_component FOREIGN KEY (component_id) REFERENCES assessment_components(id) ON DELETE CASCADE,
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
