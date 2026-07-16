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
  session_label VARCHAR(200)  COMMENT 'e.g. Internal Assessment 1',
  total_max     DECIMAL(8,2)  COMMENT 'Sum of all component max marks',
  status        VARCHAR(20)   DEFAULT 'submitted',
  avg_score     DECIMAL(5,2)  COMMENT 'Avg normalized score out of 40',
  student_count INT,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_session_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT fk_session_class   FOREIGN KEY (class_id)   REFERENCES classes(id),
  CONSTRAINT fk_session_staff   FOREIGN KEY (staff_id)   REFERENCES staffs(id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- 7. ASSESSMENT COMPONENTS
--    Dynamic components staff add per session
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessment_components (
  id          INT           NOT NULL AUTO_INCREMENT,
  session_id  INT           NOT NULL,
  type_id     VARCHAR(30)   COMMENT 'test | assignment | quiz | ...',
  label       VARCHAR(100)  NOT NULL COMMENT 'Custom name e.g. Test 1',
  max_marks   DECIMAL(6,2)  NOT NULL,
  icon        VARCHAR(10),
  color       VARCHAR(20),
  sort_order  INT           DEFAULT 0,
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
  CONSTRAINT fk_mark_student   FOREIGN KEY (student_id)   REFERENCES students(id)
) ENGINE=InnoDB;

-- Confirm
SELECT 'Schema created successfully ✓' AS status;
