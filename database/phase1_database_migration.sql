-- =====================================================================================
-- MARKHUB PHASE 1: DATABASE MIGRATION SCRIPT (V5.7 TARGETED DEFECT CORRECTIONS)
-- Target Schema: college_cms_verify
-- Application: Anna University Internal Mark Entry Portal (UG & PG Unified MarkHub)
-- Scope: NOV/DEC 2026 Assessment Cycle - 4 Active M.E. Classes (ME_CSE_I, ME_EST_I, ME_SE_III, ME_MFE_III)
-- Execution Mode: PREPARATION ONLY (DO NOT EXECUTE WITHOUT EXPLICIT AUTHORIZATION)
--
-- TECHNICAL GOVERNANCE & MYSQL NON-ATOMIC DDL EXECUTION NOTICE:
-- 1. In MySQL 8, DDL statements (`CREATE TABLE`, `ALTER TABLE`, `CREATE TRIGGER`) cause implicit commits.
--    This migration cannot be wrapped in a single monolithic transaction.
-- 2. STAGED RECOVERY ARCHITECTURE:
--    - The migration is structured into 8 distinct, sequentially verified execution stages.
--    - Each stage must pass its assertion gate before the next stage proceeds.
--    - If a failure occurs, the operator MUST consult the Stage-by-Stage Recovery Matrix
--      in `phase1_migration_execution_plan.md` to safely revert partial state.
-- 3. OPERATIONALLY ENFORCEABLE WRITE-FREE MAINTENANCE WINDOW & LIMITATIONS:
--    - A session variable alone is only an operator declaration; it does NOT prevent external writes.
--    - Programmatic verification via `information_schema.PROCESSLIST` is a point-in-time check (subject
--      to TOCTOU race conditions) and cannot physically block new incoming TCP socket connections.
--    - True write-free maintenance MUST be operationally guaranteed prior to execution:
--      a) Stop application traffic / background workers (`pm2 stop college-cms-backend` or container isolation).
--      b) Optionally enable global read-only mode (`SET GLOBAL read_only = ON; SET GLOBAL super_read_only = ON;`).
--      c) Programmatically verify zero concurrent client threads (both active and idle pools) via `information_schema.PROCESSLIST`.
--      d) Programmatically verify zero active background transactions via `information_schema.innodb_trx`.
--      e) Set operator declaration:
--         `SET @OPERATOR_ENFORCED_WRITE_FREE_MAINTENANCE_WINDOW = 'YES_MAINTENANCE_WINDOW_ENFORCED';`
--      f) Maintain this write-free window continuously until `phase1_migration_validation.sql` emits GREEN.
-- 4. AIRTIGHT SESSION IDENTITY PROTECTION WITH 100% NON-NULL GUARD:
--    - In MySQL InnoDB, composite unique indexes permit duplicate rows if ANY indexed column is NULL.
--    - Resolved via stored generated column `session_identity_guard` which maps `academic_year_id`,
--      `assessment_cycle_id`, and `session_label` using non-null fallbacks:
--      CONCAT(COALESCE(AY, '__UNRESOLVED_AY__'), ':', COALESCE(Cycle, '__UNRESOLVED_CYCLE__'), ':', COALESCE(NULLIF(TRIM(label), ''), '__DEFAULT_LABEL__')).
--    - The composite unique key is defined on `(session_identity_guard, class_id, subject_id)`, where
--      every single column is guaranteed 100% NON-NULL, eliminating NULL-bypass duplicates entirely.
--    - Preserves historical session 1 unresolved without altering or deleting any historical data.
-- 5. SELECTED-COLUMN INTEGRITY PRESERVATION:
--    - Operates under verified baseline capture (`migration_baseline_capture_status` = 'COMPLETED').
--    - All existing baseline records (29 classes, 1,194 students, 44 marks, session 1) are preserved.
-- 6. AIRTIGHT DATA PROTECTION (15 IMMUTABILITY TRIGGERS):
--    - Strictly blocks INSERT into archived sessions.
--    - Strictly blocks UPDATEs moving marks, components, or attendance into archived sessions.
--    - Strictly blocks ANY update or unarchiving of archived assessment sessions.
--    - Strictly blocks destructive DELETEs across marks, components, sessions, attendance, history, and audit logs.
--    - Legitimate updates to active sessions (where is_archived = 0) proceed unhindered.
-- 7. CONDITIONAL FINAL-STATE VERIFICATION (NO UNCONDITIONAL SUCCESS):
--    - Live Completion Scorecard evaluates all 9 final-state assertions conditionally in its `CASE WHEN` clause:
--      classes count, PG count, UG count, unmapped count, programmes count, verified 4 M.E. classes,
--      archived sessions count, preserved historical session 1 guard, unique index coverage, and trigger count.
--    - A failed assertion can NEVER be followed by a success result.
--
-- Author: Google Antigravity Advanced Agentic Pair Programming
-- Date: 2026-11-09
-- =====================================================================================

USE college_cms_verify;

-- =====================================================================================
-- SAFEGUARD 0.1: PHYSICAL SERVER SAFETY & CLIENT CONNECTION AUDIT DISPLAY
-- Displays active connection parameters for human visual inspection.
-- Does NOT rely on SELECT IF() or invalid table references.
-- =====================================================================================
SELECT 
    DATABASE() AS active_database,
    @@hostname AS server_hostname,
    @@port AS server_port,
    USER() AS client_connection_identity,
    CURRENT_USER() AS authenticated_user,
    CASE 
        WHEN DATABASE() = 'college_cms_verify' AND @@port IN (3306, 3307) 
            THEN 'PRELIMINARY CHECK PASS: Verify client connection is local (127.0.0.1/localhost)'
        WHEN DATABASE() = 'college_cms' 
            THEN 'FATAL SECURITY VIOLATION: Connected to production schema college_cms! HALT IMMEDIATELY!'
        ELSE 'FAIL: Connected to unexpected database or port! OPERATOR MUST HALT IMMEDIATELY!'
    END AS connection_status,
    'OPERATOR MUST INDEPENDENTLY CONFIRM LOCAL SANDBOX ENDPOINT OUT-OF-BAND' AS physical_server_safety_requirement,
    'WRITE-FREE MAINTENANCE WINDOW MUST BE ACTIVE THROUGH MIGRATION HANDOFF' AS maintenance_window_requirement;

-- =====================================================================================
-- STAGE 0: EXECUTION CONTEXT AUDIT & MANDATORY PRECONDITION CHECKS
-- Operator MUST declare session variables prior to execution:
--   SET @OPERATOR_AUTHORIZED_MIGRATION_EXECUTION = 'AUTHORIZED_BY_EXAMINATION_CELL';
--   SET @OPERATOR_VERIFIED_LOCAL_SANDBOX = 'YES_VERIFIED_LOCAL_SANDBOX';
--   SET @OPERATOR_ENFORCED_WRITE_FREE_MAINTENANCE_WINDOW = 'YES_MAINTENANCE_WINDOW_ENFORCED';
-- =====================================================================================
DROP PROCEDURE IF EXISTS `sp_migration_assert_preconditions`;
DELIMITER $$
CREATE PROCEDURE `sp_migration_assert_preconditions`()
BEGIN
    DECLARE v_prog_collisions INT DEFAULT 0;
    DECLARE v_class_collisions INT DEFAULT 0;
    DECLARE v_baseline_completed INT DEFAULT 0;
    DECLARE v_active_clients INT DEFAULT 0;
    DECLARE v_idle_clients INT DEFAULT 0;
    DECLARE v_active_trx INT DEFAULT 0;

    -- 1. Check human out-of-band physical server verification variable
    IF @OPERATOR_VERIFIED_LOCAL_SANDBOX IS NULL 
       OR @OPERATOR_VERIFIED_LOCAL_SANDBOX <> 'YES_VERIFIED_LOCAL_SANDBOX' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL SECURITY ABORT: Operator has not confirmed local sandbox out-of-band verification. Execute: SET @OPERATOR_VERIFIED_LOCAL_SANDBOX = ''YES_VERIFIED_LOCAL_SANDBOX''; only after verifying connection is 127.0.0.1/localhost.';
    END IF;

    -- 2. Check institutional migration authorization variable
    IF @OPERATOR_AUTHORIZED_MIGRATION_EXECUTION IS NULL 
       OR @OPERATOR_AUTHORIZED_MIGRATION_EXECUTION <> 'AUTHORIZED_BY_EXAMINATION_CELL' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL SECURITY ABORT: Explicit operator authorization required. Execute: SET @OPERATOR_AUTHORIZED_MIGRATION_EXECUTION = ''AUTHORIZED_BY_EXAMINATION_CELL''; before running migration.';
    END IF;

    -- 3A. Check write-free maintenance window enforcement operator declaration variable
    IF @OPERATOR_ENFORCED_WRITE_FREE_MAINTENANCE_WINDOW IS NULL 
       OR @OPERATOR_ENFORCED_WRITE_FREE_MAINTENANCE_WINDOW <> 'YES_MAINTENANCE_WINDOW_ENFORCED' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL SECURITY ABORT: Operator has not confirmed write-free maintenance window enforcement. Execute: SET @OPERATOR_ENFORCED_WRITE_FREE_MAINTENANCE_WINDOW = ''YES_MAINTENANCE_WINDOW_ENFORCED''; to guarantee zero concurrent mutations.';
    END IF;

    -- 3B. Programmatic verification of client isolation (PROCESSLIST: active queries and idle pools)
    SELECT 
        COUNT(CASE WHEN COMMAND NOT IN ('Sleep', 'Binlog Dump') THEN 1 END),
        COUNT(CASE WHEN COMMAND = 'Sleep' THEN 1 END)
    INTO v_active_clients, v_idle_clients
    FROM information_schema.PROCESSLIST
    WHERE (DB = 'college_cms_verify' OR DB IS NULL)
      AND ID <> CONNECTION_ID()
      AND COMMAND <> 'Binlog Dump';

    IF v_active_clients > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL SECURITY ABORT: Active concurrent client queries detected on college_cms_verify or unassigned session. Enforce write-free maintenance window before running migration.';
    END IF;

    IF v_idle_clients > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL SECURITY ABORT: Idle client connections detected on college_cms_verify or unassigned session (potential connection pool). Stop application backend (pm2 stop) and disconnect external clients.';
    END IF;

    -- 3C. Programmatic verification of zero active background transactions (innodb_trx)
    SELECT COUNT(*) INTO v_active_trx
    FROM information_schema.innodb_trx;

    IF v_active_trx > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL SECURITY ABORT: Active uncommitted background InnoDB transactions detected. Enforce write-free maintenance window before running migration.';
    END IF;

    -- 4. SQL-enforced database name check
    IF DATABASE() IS NULL OR DATABASE() <> 'college_cms_verify' THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'FATAL SECURITY ABORT: Target database is NOT college_cms_verify. Migration aborted immediately.';
    END IF;

    -- 5. SQL-enforced port check
    IF @@port NOT IN (3306, 3307) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL SECURITY ABORT: Active MySQL port is not sandbox development port (3306/3307). Halting for safety.';
    END IF;

    -- 6. Production schema collision check
    IF (SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = 'college_cms') > 0 
       AND DATABASE() = 'college_cms' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL SECURITY ABORT: Attempting migration against production schema college_cms! Execution aborted.';
    END IF;

    -- 7. Mandatory Completed Baseline Assertion
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'migration_baseline_capture_status') THEN
        SELECT COUNT(*) INTO v_baseline_completed 
        FROM `migration_baseline_capture_status` WHERE `status` = 'COMPLETED';
    END IF;

    IF v_baseline_completed = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL MIGRATION ABORT: No verified completed baseline found (status = COMPLETED). Execute phase1_migration_baseline_capture.sql before migration.';
    END IF;

    -- 8. Pre-insertion verification of programme codes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'academic_programmes') THEN
        SELECT COUNT(*) INTO v_prog_collisions 
        FROM academic_programmes 
        WHERE code IN (
            'UG_CSE', 'UG_IT', 'UG_AIDS', 'UG_ECE', 'UG_EEE', 'UG_MECH', 'UG_CIVIL',
            'ME_CSE', 'ME_SE', 'ME_MFE', 'ME_EST'
        );
        IF v_prog_collisions > 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FATAL MIGRATION ABORT: One or more academic programme codes already exist. Aborting to prevent silent overwrite.';
        END IF;
    END IF;

    -- 9. Pre-insertion verification of 4 M.E. class IDs
    SELECT COUNT(*) INTO v_class_collisions 
    FROM classes 
    WHERE id IN ('ME_CSE_I', 'ME_EST_I', 'ME_SE_III', 'ME_MFE_III');
    IF v_class_collisions > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL MIGRATION ABORT: One or more confirmed M.E. class IDs already exist in classes table. Aborting to prevent collision.';
    END IF;

    -- 10. Department Validation: Verify that each of the 7 required departments exists EXACTLY ONCE
    IF (SELECT COUNT(*) FROM departments WHERE short_name = 'AIDS') <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FATAL MIGRATION ABORT: Department AIDS is missing or duplicated in departments table.';
    END IF;
    IF (SELECT COUNT(*) FROM departments WHERE short_name = 'CIVIL') <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FATAL MIGRATION ABORT: Department CIVIL is missing or duplicated in departments table.';
    END IF;
    IF (SELECT COUNT(*) FROM departments WHERE short_name = 'CSE') <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FATAL MIGRATION ABORT: Department CSE is missing or duplicated in departments table.';
    END IF;
    IF (SELECT COUNT(*) FROM departments WHERE short_name = 'ECE') <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FATAL MIGRATION ABORT: Department ECE is missing or duplicated in departments table.';
    END IF;
    IF (SELECT COUNT(*) FROM departments WHERE short_name = 'EEE') <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FATAL MIGRATION ABORT: Department EEE is missing or duplicated in departments table.';
    END IF;
    IF (SELECT COUNT(*) FROM departments WHERE short_name = 'IT') <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FATAL MIGRATION ABORT: Department IT is missing or duplicated in departments table.';
    END IF;
    IF (SELECT COUNT(*) FROM departments WHERE short_name = 'MECH') <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FATAL MIGRATION ABORT: Department MECH is missing or duplicated in departments table.';
    END IF;

    -- 11. Cycle Validation: AY 2026-2027 must contain exactly one ODD_INTERNAL_1 and one ODD_INTERNAL_2
    IF (
        SELECT COUNT(*) FROM assessment_cycles ac
        JOIN academic_years ay ON ay.code = '2026-2027' AND ay.is_current = 1
        WHERE ac.academic_year_id = ay.id AND ac.cycle_type = 'ODD_INTERNAL_1'
    ) <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FATAL MIGRATION ABORT: Assessment cycle ODD_INTERNAL_1 is missing or duplicated for AY 2026-2027.';
    END IF;
    IF (
        SELECT COUNT(*) FROM assessment_cycles ac
        JOIN academic_years ay ON ay.code = '2026-2027' AND ay.is_current = 1
        WHERE ac.academic_year_id = ay.id AND ac.cycle_type = 'ODD_INTERNAL_2'
    ) <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FATAL MIGRATION ABORT: Assessment cycle ODD_INTERNAL_2 is missing or duplicated for AY 2026-2027.';
    END IF;
END$$
DELIMITER ;

CALL `sp_migration_assert_preconditions`();
DROP PROCEDURE `sp_migration_assert_preconditions`;

-- =====================================================================================
-- STAGE 1: ACADEMIC PROGRAMMES METADATA INFRASTRUCTURE
-- Execution Order:
--   1. DDL: CREATE TABLE `academic_programmes`
--   2. DML: Dynamic INSERT of 11 programmes (7 UG + 4 PG) resolving department IDs dynamically
-- Expected Post-Stage State:
--   - `academic_programmes` exists with exactly 11 rows.
-- Failure Points & Partial State:
--   - Foreign key constraint failure if any department short_name is misconfigured.
-- Stage 1 Recovery Action:
--   - DROP TABLE IF EXISTS `academic_programmes`;
-- =====================================================================================

CREATE TABLE IF NOT EXISTS `academic_programmes` (
    `code` VARCHAR(20) NOT NULL COMMENT 'e.g. UG_CSE, ME_CSE',
    `name` VARCHAR(150) NOT NULL COMMENT 'Full official programme title',
    `program_type` ENUM('UG', 'PG') NOT NULL COMMENT 'Level indicator',
    `owning_department_id` INT NOT NULL COMMENT 'Foreign key to departments table',
    `owning_dept_code` VARCHAR(20) NOT NULL COMMENT 'e.g. CSE, ECE, CIVIL, MECH, AIDS, IT, EEE',
    `duration_years` TINYINT NOT NULL DEFAULT 4 COMMENT '4 for UG, 2 for PG',
    `total_semesters` TINYINT NOT NULL DEFAULT 8 COMMENT '8 for UG, 4 for PG',
    `current_regulation` VARCHAR(20) NOT NULL DEFAULT '2021' COMMENT '2021 for UG, 2025 for PG',
    `degree_title` VARCHAR(50) NOT NULL COMMENT 'B.E., B.Tech, M.E., M.Tech',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=active, 0=dormant',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`code`),
    KEY `idx_acad_prog_type` (`program_type`),
    KEY `idx_acad_prog_dept` (`owning_department_id`),
    CONSTRAINT `fk_academic_programmes_dept` 
        FOREIGN KEY (`owning_department_id`) REFERENCES `departments` (`id`) 
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dynamic INSERT of the 11 Academic Programmes (7 UG + 4 PG)
-- IDs dynamically resolved from departments table by short_name
INSERT INTO `academic_programmes` 
    (`code`, `name`, `program_type`, `owning_department_id`, `owning_dept_code`, `duration_years`, `total_semesters`, `current_regulation`, `degree_title`, `is_active`)
SELECT 
    p.code, p.name, p.program_type, d.id, d.short_name, p.duration_years, p.total_semesters, p.current_regulation, p.degree_title, 1
FROM (
    -- Undergraduate Programmes (7)
    SELECT 'UG_AIDS' AS code, 'B.Tech Artificial Intelligence and Data Science' AS name, 'UG' AS program_type, 'AIDS' AS dept_code, 4 AS duration_years, 8 AS total_semesters, '2021' AS current_regulation, 'B.Tech' AS degree_title UNION ALL
    SELECT 'UG_CIVIL', 'B.E. Civil Engineering', 'UG', 'CIVIL', 4, 8, '2021', 'B.E.' UNION ALL
    SELECT 'UG_CSE',   'B.E. Computer Science and Engineering', 'UG', 'CSE', 4, 8, '2021', 'B.E.' UNION ALL
    SELECT 'UG_ECE',   'B.E. Electronics and Communication Engineering', 'UG', 'ECE', 4, 8, '2021', 'B.E.' UNION ALL
    SELECT 'UG_EEE',   'B.E. Electrical and Electronics Engineering', 'UG', 'EEE', 4, 8, '2021', 'B.E.' UNION ALL
    SELECT 'UG_IT',    'B.Tech Information Technology', 'UG', 'IT', 4, 8, '2021', 'B.Tech' UNION ALL
    SELECT 'UG_MECH',  'B.E. Mechanical Engineering', 'UG', 'MECH', 4, 8, '2021', 'B.E.' UNION ALL

    -- Postgraduate Programmes (4 Approved M.E. Programmes under Regulation 2025)
    SELECT 'ME_CSE',   'M.E. Computer Science and Engineering', 'PG', 'CSE', 2, 4, '2025', 'M.E.' UNION ALL
    SELECT 'ME_SE',    'M.E. Structural Engineering', 'PG', 'CIVIL', 2, 4, '2025', 'M.E.' UNION ALL
    SELECT 'ME_MFE',   'M.E. Manufacturing Engineering', 'PG', 'MECH', 2, 4, '2025', 'M.E.' UNION ALL
    SELECT 'ME_EST',   'M.E. Embedded System Technologies', 'PG', 'ECE', 2, 4, '2025', 'M.E.'
) p
JOIN departments d ON d.short_name = p.dept_code;

-- Verify exactly 11 programmes were inserted
DROP PROCEDURE IF EXISTS `sp_assert_programmes_inserted`;
DELIMITER $$
CREATE PROCEDURE `sp_assert_programmes_inserted`()
BEGIN
    DECLARE v_count INT;
    SELECT COUNT(*) INTO v_count FROM academic_programmes;
    IF v_count <> 11 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL MIGRATION ABORT: Failed to insert exactly 11 academic programmes.';
    END IF;
END$$
DELIMITER ;

CALL `sp_assert_programmes_inserted`();
DROP PROCEDURE `sp_assert_programmes_inserted`;

-- =====================================================================================
-- STAGE 2: CLASS SCHEMA EXTENSION & 1-TO-1 MAPPING OF ALL 29 BASELINE CLASSES + SEED 4 M.E. CLASSES
-- Execution Order:
--   1. DDL: ALTER TABLE `classes` ADD program_type, regulation_code, program_code, FK, index
--   2. DML: 29 individual UPDATE statements explicitly mapping each baseline class
--   3. Assertion: `sp_migration_assert_no_unmapped_classes()` halts if unmapped classes exist
--   4. DML: INSERT exactly 4 active M.E. postgraduate classes (total classes becomes 33)
-- Expected Post-Stage State:
--   - `classes` has 33 rows (29 baseline + 4 active M.E.); zero unmapped classes.
-- =====================================================================================

ALTER TABLE `classes`
    ADD COLUMN `program_type` ENUM('UG', 'PG') NOT NULL DEFAULT 'UG' AFTER `department`,
    ADD COLUMN `regulation_code` VARCHAR(20) NULL DEFAULT NULL AFTER `program_type`,
    ADD COLUMN `program_code` VARCHAR(20) NULL AFTER `regulation_code`,
    ADD CONSTRAINT `fk_classes_academic_programme` 
        FOREIGN KEY (`program_code`) REFERENCES `academic_programmes` (`code`) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD INDEX `idx_classes_prog_reg_sem` (`program_type`, `regulation_code`, `semester`);

-- Explicit 1-to-1 Mapping for All 29 Baseline Classes
-- Year I Science and Humanities (8 statements) - regulation left NULL pending Gazette notification
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = NULL, `program_code` = 'UG_AIDS'  WHERE `id` = 'C_SH_AIDS_1';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = NULL, `program_code` = 'UG_CIVIL' WHERE `id` = 'C_SH_CIVIL_1';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = NULL, `program_code` = 'UG_CSE'   WHERE `id` = 'C_SH_CSE_A_1';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = NULL, `program_code` = 'UG_CSE'   WHERE `id` = 'C_SH_CSE_B_1';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = NULL, `program_code` = 'UG_ECE'   WHERE `id` = 'C_SH_ECE_1';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = NULL, `program_code` = 'UG_EEE'   WHERE `id` = 'C_SH_EEE_1';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = NULL, `program_code` = 'UG_IT'    WHERE `id` = 'C_SH_IT_1';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = NULL, `program_code` = 'UG_MECH'  WHERE `id` = 'C_SH_MECH_1';

-- Year II Departmental Classes (7 statements) - regulation left NULL pending institutional clarification
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = NULL, `program_code` = 'UG_IT'    WHERE `id` = 'CL001';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = NULL, `program_code` = 'UG_CSE'   WHERE `id` = 'CL002';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = NULL, `program_code` = 'UG_AIDS'  WHERE `id` = 'CL003';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = NULL, `program_code` = 'UG_EEE'   WHERE `id` = 'CL004';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = NULL, `program_code` = 'UG_ECE'   WHERE `id` = 'CL005';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = NULL, `program_code` = 'UG_MECH'  WHERE `id` = 'CL006';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = NULL, `program_code` = 'UG_CIVIL' WHERE `id` = 'CL007';

-- Years III & IV Departmental Classes (14 statements) - Verified Anna University Regulation 2021
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = '2021', `program_code` = 'UG_AIDS'  WHERE `id` = 'CL_AIDS_III';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = '2021', `program_code` = 'UG_AIDS'  WHERE `id` = 'CL_AIDS_IV';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = '2021', `program_code` = 'UG_CIVIL' WHERE `id` = 'CL_CIVIL_III';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = '2021', `program_code` = 'UG_CIVIL' WHERE `id` = 'CL_CIVIL_IV';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = '2021', `program_code` = 'UG_CSE'   WHERE `id` = 'CL_CSE_III';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = '2021', `program_code` = 'UG_CSE'   WHERE `id` = 'CL_CSE_IV';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = '2021', `program_code` = 'UG_ECE'   WHERE `id` = 'CL_ECE_III';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = '2021', `program_code` = 'UG_ECE'   WHERE `id` = 'CL_ECE_IV';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = '2021', `program_code` = 'UG_EEE'   WHERE `id` = 'CL_EEE_III';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = '2021', `program_code` = 'UG_EEE'   WHERE `id` = 'CL_EEE_IV';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = '2021', `program_code` = 'UG_IT'    WHERE `id` = 'CL_IT_III';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = '2021', `program_code` = 'UG_IT'    WHERE `id` = 'CL_IT_IV';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = '2021', `program_code` = 'UG_MECH'  WHERE `id` = 'CL_MECH_III';
UPDATE `classes` SET `program_type` = 'UG', `regulation_code` = '2021', `program_code` = 'UG_MECH'  WHERE `id` = 'CL_MECH_IV';

-- Zero-Tolerance Assertion for Unmapped Classes
DROP PROCEDURE IF EXISTS `sp_migration_assert_no_unmapped_classes`;
DELIMITER $$
CREATE PROCEDURE `sp_migration_assert_no_unmapped_classes`()
BEGIN
    DECLARE v_unmatched_count INT;
    SELECT COUNT(*) INTO v_unmatched_count FROM classes WHERE program_code IS NULL;
    IF v_unmatched_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL MIGRATION ABORT: Unmatched classes found without valid programme assignment. Manual verification required.';
    END IF;
END$$
DELIMITER ;

CALL `sp_migration_assert_no_unmapped_classes`();
DROP PROCEDURE `sp_migration_assert_no_unmapped_classes`;

-- Seed ONLY the 4 Active M.E. Classes for NOV/DEC 2026 Scope
INSERT INTO `classes` 
    (`id`, `name`, `department`, `program_type`, `regulation_code`, `program_code`, `semester`, `year_label`, `section`, `room_no`, `academic_year`, `batch`)
VALUES
    ('ME_CSE_I',   'M.E. CSE - I Year - I Sem',          'Computer Science and Engineering',         'PG', '2025', 'ME_CSE', 1, 'I',  'A', 'PG-CSE-101', '2026-2027', '2026-2028'),
    ('ME_EST_I',   'M.E. EST - I Year - I Sem',          'Electronics and Communication Engineering', 'PG', '2025', 'ME_EST', 1, 'I',  'A', 'PG-ECE-101', '2026-2027', '2026-2028'),
    ('ME_SE_III',  'M.E. Structural - II Year - III Sem', 'Civil Engineering',                        'PG', '2025', 'ME_SE',  3, 'II', 'A', 'PG-CIV-201', '2026-2027', '2025-2027'),
    ('ME_MFE_III', 'M.E. Manufacturing - II Year - III Sem', 'Mechanical Engineering',               'PG', '2025', 'ME_MFE', 3, 'II', 'A', 'PG-MEC-201', '2026-2027', '2025-2027');

-- =====================================================================================
-- STAGE 3: FIVE-COLUMN ASSESSMENT SESSION IDENTITY & AY/CYCLE INTEGRITY
-- Execution Order:
--   1. DDL: Add composite unique key on `assessment_cycles` (`academic_year_id`, `id`)
--   2. DDL: ALTER TABLE `marks_sessions` ADD academic_year_id, assessment_cycle_id,
--      is_archived, session_identity_guard, and unique index
--   3. DML: UPDATE historical session 1 to unresolved soft-archived state
--   4. DDL: Add composite FK and check constraint on `marks_sessions`
-- =====================================================================================

ALTER TABLE `assessment_cycles`
    ADD UNIQUE KEY `uq_cycle_ay_composite` (`academic_year_id`, `id`);

ALTER TABLE `marks_sessions`
    ADD COLUMN `academic_year_id` INT NULL AFTER `class_id`,
    ADD COLUMN `assessment_cycle_id` INT NULL AFTER `academic_year_id`,
    ADD COLUMN `is_archived` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=archived, 0=active' AFTER `status`,
    ADD COLUMN `archived_at` DATETIME(3) NULL AFTER `is_archived`,
    ADD COLUMN `archived_by` VARCHAR(50) NULL AFTER `archived_at`,
    ADD COLUMN `archive_reason` VARCHAR(255) NULL AFTER `archived_by`,
    ADD COLUMN `session_identity_guard` VARCHAR(255) 
        GENERATED ALWAYS AS (
            CONCAT(
                COALESCE(CAST(`academic_year_id` AS CHAR), '__UNRESOLVED_AY__'), ':',
                COALESCE(CAST(`assessment_cycle_id` AS CHAR), '__UNRESOLVED_CYCLE__'), ':',
                COALESCE(NULLIF(TRIM(`session_label`), ''), '__DEFAULT_LABEL__')
            )
        ) STORED AFTER `archive_reason`,
    ADD CONSTRAINT `fk_marks_sessions_academic_year`
        FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `fk_marks_sessions_assessment_cycle`
        FOREIGN KEY (`assessment_cycle_id`) REFERENCES `assessment_cycles` (`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD UNIQUE KEY `uq_marks_sessions_identity` (
        `session_identity_guard`, `class_id`, `subject_id`
    ),
    ADD INDEX `idx_marks_sessions_cycle_status` (`assessment_cycle_id`, `status`, `is_archived`);

-- Soft-archive historical session 1 in unresolved state
UPDATE `marks_sessions`
SET 
    `academic_year_id` = NULL,
    `assessment_cycle_id` = NULL,
    `is_archived` = 1,
    `archived_at` = NOW(3),
    `archived_by` = 'PHASE1_MIGRATION',
    `archive_reason` = 'Historical baseline session preserved unresolved pending Examination Cell ledger audit'
WHERE `id` = 1;

-- Enforce AY/Cycle consistency constraint
ALTER TABLE `marks_sessions`
    ADD CONSTRAINT `fk_marks_sessions_cycle_ay_consistency`
        FOREIGN KEY (`academic_year_id`, `assessment_cycle_id`) 
        REFERENCES `assessment_cycles` (`academic_year_id`, `id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `chk_session_ay_cycle_consistency` 
        CHECK (
            (`academic_year_id` IS NULL AND `assessment_cycle_id` IS NULL)
            OR
            (`academic_year_id` IS NOT NULL AND `assessment_cycle_id` IS NOT NULL)
        );

-- =====================================================================================
-- STAGE 4: NON-DESTRUCTIVE MARKS CLEARING INFRASTRUCTURE
-- =====================================================================================

ALTER TABLE `marks`
    ADD COLUMN `is_cleared` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=soft cleared, 0=active entry' AFTER `marks_obtained`,
    ADD COLUMN `cleared_at` DATETIME(3) NULL COMMENT 'Timestamp of soft clearing' AFTER `is_cleared`,
    ADD COLUMN `cleared_by` VARCHAR(50) NULL COMMENT 'User ID who cleared mark' AFTER `cleared_at`,
    ADD COLUMN `clear_reason` VARCHAR(255) NULL COMMENT 'Audit justification for clearing' AFTER `cleared_by`,
    ADD INDEX `idx_marks_active_lookup` (`session_id`, `student_id`, `is_cleared`);

-- =====================================================================================
-- STAGE 5: NON-DESTRUCTIVE ASSESSMENT COMPONENT ARCHIVAL INFRASTRUCTURE
-- =====================================================================================

ALTER TABLE `assessment_components`
    ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=active component, 0=archived component' AFTER `max_marks`,
    ADD COLUMN `archived_at` DATETIME(3) NULL COMMENT 'Timestamp of component archival' AFTER `is_active`,
    ADD COLUMN `archived_by` VARCHAR(50) NULL COMMENT 'User ID who archived component' AFTER `archived_at`,
    ADD COLUMN `archive_reason` VARCHAR(255) NULL COMMENT 'Reason for component archival' AFTER `archived_by`,
    ADD INDEX `idx_components_session_active` (`session_id`, `is_active`);

-- =====================================================================================
-- STAGE 6: DECOUPLED STUDENT ENROLLMENTS ACADEMIC ELIGIBILITY RULES
-- =====================================================================================

ALTER TABLE `student_enrollments`
    ADD COLUMN `is_marks_eligible` TINYINT(1) 
        GENERATED ALWAYS AS (CASE WHEN `status` = 'ENROLLED' AND `is_confirmed_active` = 1 THEN 1 ELSE 0 END) VIRTUAL 
        AFTER `is_confirmed_active`,
    ADD COLUMN `is_promotion_eligible` TINYINT(1) NULL DEFAULT NULL 
        COMMENT 'End-of-term promotion clearance: NULL=active semester pending evaluation, 1=promoted, 0=detained'
        AFTER `is_marks_eligible`,
    ADD INDEX `idx_enrollment_hist_report` (`student_id`, `class_id`, `academic_year_id`, `status`);

-- =====================================================================================
-- STAGE 7: DATABASE-LEVEL IMMUTABILITY & AIRTIGHT DELETION/UPDATE/INSERT PROTECTION TRIGGERS
-- Protects sessions, marks, attendance, components, history, and audit logs across ALL paths.
-- Exactly 15 triggers deployed:
--   1. trg_prevent_hard_delete_marks (DELETE marks)
--   2. trg_prevent_insert_marks_archived_session (INSERT marks into archived session blocked)
--   3. trg_prevent_update_marks_archived_session (UPDATE marks: archived session & moving marks blocked)
--   4. trg_prevent_hard_delete_components (DELETE components)
--   5. trg_prevent_insert_components_archived_session (INSERT components into archived session blocked)
--   6. trg_prevent_update_components_archived_session (UPDATE components: archived session & moving components blocked)
--   7. trg_prevent_hard_delete_sessions (DELETE sessions)
--   8. trg_prevent_update_archived_session (UPDATE sessions: modifying or unarchiving archived sessions blocked)
--   9. trg_prevent_hard_delete_attendance (DELETE attendance)
--  10. trg_prevent_insert_attendance_archived_session (INSERT attendance into archived session blocked)
--  11. trg_prevent_update_attendance_archived_session (UPDATE attendance: archived session & moving attendance blocked)
--  12. trg_prevent_hard_delete_marks_history (DELETE history)
--  13. trg_prevent_update_marks_history (UPDATE history)
--  14. trg_prevent_hard_delete_marks_audit_logs (DELETE audit logs)
--  15. trg_prevent_update_marks_audit_logs (UPDATE audit logs)
-- =====================================================================================

DELIMITER $$

-- Trigger 7.1: Prohibit hard physical DELETE on marks table
CREATE TRIGGER `trg_prevent_hard_delete_marks`
BEFORE DELETE ON `marks`
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Destructive DELETE on marks table is prohibited. Use soft clearing (is_cleared = 1) to preserve historical integrity.';
END$$

-- Trigger 7.2: Prohibit INSERT of marks into an archived session
CREATE TRIGGER `trg_prevent_insert_marks_archived_session`
BEFORE INSERT ON `marks`
FOR EACH ROW
BEGIN
    IF (SELECT is_archived FROM marks_sessions WHERE id = NEW.session_id) = 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'INSERT of marks into an archived assessment session is prohibited. Session is permanently locked.';
    END IF;
END$$

-- Trigger 7.3: Prohibit unauthorized UPDATE on marks (session archived, moving marks into archived session, or un-clearing mark)
CREATE TRIGGER `trg_prevent_update_marks_archived_session`
BEFORE UPDATE ON `marks`
FOR EACH ROW
BEGIN
    -- Cannot update marks that belong to an archived session
    IF (SELECT is_archived FROM marks_sessions WHERE id = OLD.session_id) = 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Marks belonging to an archived assessment session cannot be updated. Session is permanently locked.';
    END IF;

    -- Cannot move marks into an archived session
    IF NEW.session_id <> OLD.session_id AND (SELECT is_archived FROM marks_sessions WHERE id = NEW.session_id) = 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Moving marks into an archived assessment session is prohibited. Session is permanently locked.';
    END IF;

    -- Cannot un-clear soft-cleared marks
    IF OLD.is_cleared = 1 AND NEW.is_cleared = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Un-clearing soft-cleared marks is prohibited. Preserved for institutional audit.';
    END IF;
END$$

-- Trigger 7.4: Prohibit hard physical DELETE on assessment_components table
CREATE TRIGGER `trg_prevent_hard_delete_components`
BEFORE DELETE ON `assessment_components`
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Destructive DELETE on assessment_components is prohibited. Use component archival (is_active = 0) to preserve historical marks references.';
END$$

-- Trigger 7.5: Prohibit INSERT of assessment components into an archived session
CREATE TRIGGER `trg_prevent_insert_components_archived_session`
BEFORE INSERT ON `assessment_components`
FOR EACH ROW
BEGIN
    IF (SELECT is_archived FROM marks_sessions WHERE id = NEW.session_id) = 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'INSERT of assessment components into an archived assessment session is prohibited. Session is permanently locked.';
    END IF;
END$$

-- Trigger 7.6: Prohibit unauthorized UPDATE on assessment_components (session archived or moving into archived session)
CREATE TRIGGER `trg_prevent_update_components_archived_session`
BEFORE UPDATE ON `assessment_components`
FOR EACH ROW
BEGIN
    -- Cannot update components belonging to an archived session
    IF (SELECT is_archived FROM marks_sessions WHERE id = OLD.session_id) = 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Assessment components belonging to an archived session cannot be updated. Session is permanently locked.';
    END IF;

    -- Cannot move components into an archived session
    IF NEW.session_id <> OLD.session_id AND (SELECT is_archived FROM marks_sessions WHERE id = NEW.session_id) = 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Moving assessment components into an archived assessment session is prohibited. Session is permanently locked.';
    END IF;
END$$

-- Trigger 7.7: Prohibit hard physical DELETE on marks_sessions table
CREATE TRIGGER `trg_prevent_hard_delete_sessions`
BEFORE DELETE ON `marks_sessions`
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Destructive DELETE on marks_sessions is prohibited. Use session archival (is_archived = 1) to preserve assessment ledgers.';
END$$

-- Trigger 7.8: Prohibit ANY modification OR unarchiving of archived marks_sessions
CREATE TRIGGER `trg_prevent_update_archived_session`
BEFORE UPDATE ON `marks_sessions`
FOR EACH ROW
BEGIN
    IF OLD.is_archived = 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Modification or unarchiving of archived marks sessions is prohibited through any update path. Archived sessions are permanently locked.';
    END IF;
END$$

-- Trigger 7.9: Prohibit hard physical DELETE on session_attendance table
CREATE TRIGGER `trg_prevent_hard_delete_attendance`
BEFORE DELETE ON `session_attendance`
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Destructive DELETE on session_attendance is prohibited. Attendance ledgers are permanent institutional audit records.';
END$$

-- Trigger 7.10: Prohibit INSERT of attendance into an archived session
CREATE TRIGGER `trg_prevent_insert_attendance_archived_session`
BEFORE INSERT ON `session_attendance`
FOR EACH ROW
BEGIN
    IF (SELECT is_archived FROM marks_sessions WHERE id = NEW.session_id) = 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'INSERT of attendance records into an archived assessment session is prohibited. Session is permanently locked.';
    END IF;
END$$

-- Trigger 7.11: Prohibit unauthorized UPDATE on session_attendance (session archived or moving into archived session)
CREATE TRIGGER `trg_prevent_update_attendance_archived_session`
BEFORE UPDATE ON `session_attendance`
FOR EACH ROW
BEGIN
    -- Cannot update attendance belonging to an archived session
    IF (SELECT is_archived FROM marks_sessions WHERE id = OLD.session_id) = 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Attendance records belonging to an archived session cannot be updated. Session is permanently locked.';
    END IF;

    -- Cannot move attendance into an archived session
    IF NEW.session_id <> OLD.session_id AND (SELECT is_archived FROM marks_sessions WHERE id = NEW.session_id) = 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Moving attendance records into an archived assessment session is prohibited. Session is permanently locked.';
    END IF;
END$$

-- Trigger 7.12: Prohibit hard physical DELETE on marks_history
CREATE TRIGGER `trg_prevent_hard_delete_marks_history`
BEFORE DELETE ON `marks_history`
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Destructive DELETE on marks_history is prohibited. Marks history snapshots are immutable audit ledgers.';
END$$

-- Trigger 7.13: Prohibit UPDATE on marks_history (snapshots are write-once)
CREATE TRIGGER `trg_prevent_update_marks_history`
BEFORE UPDATE ON `marks_history`
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'UPDATE on marks_history is prohibited. Historical snapshots cannot be altered.';
END$$

-- Trigger 7.14: Prohibit hard physical DELETE on marks_audit_logs
CREATE TRIGGER `trg_prevent_hard_delete_marks_audit_logs`
BEFORE DELETE ON `marks_audit_logs`
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Destructive DELETE on marks_audit_logs is prohibited. Forensic audit logs cannot be purged.';
END$$

-- Trigger 7.15: Prohibit UPDATE on marks_audit_logs (audit logs are append-only)
CREATE TRIGGER `trg_prevent_update_marks_audit_logs`
BEFORE UPDATE ON `marks_audit_logs`
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'UPDATE on marks_audit_logs is prohibited. Audit trail records are strictly append-only.';
END$$

DELIMITER ;

-- =====================================================================================
-- STAGE 8: MANDATORY FINAL-STATE COMPLETION VERIFICATION & SCORECARD
-- Executes programmatic assertions across all post-migration invariants.
-- Halts execution via SIGNAL 45000 if ANY final-state assertion fails.
-- Never emits unconditional SUCCESS.
-- =====================================================================================
DROP PROCEDURE IF EXISTS `sp_migration_verify_final_state`;
DELIMITER $$
CREATE PROCEDURE `sp_migration_verify_final_state`()
BEGIN
    -- 1. Classes count must be exactly 33 (29 baseline + 4 active M.E.)
    IF (SELECT COUNT(*) FROM classes) <> 33 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'MIGRATION VERIFICATION FAILED: Classes count is not exactly 33 (29 baseline + 4 active M.E.).';
    END IF;

    -- 2. PG classes count must be exactly 4
    IF (SELECT COUNT(*) FROM classes WHERE program_type = 'PG') <> 4 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'MIGRATION VERIFICATION FAILED: PG classes count is not exactly 4.';
    END IF;

    -- 3. UG classes count must be exactly 29
    IF (SELECT COUNT(*) FROM classes WHERE program_type = 'UG') <> 29 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'MIGRATION VERIFICATION FAILED: UG classes count is not exactly 29.';
    END IF;

    -- 4. No unmapped classes allowed
    IF (SELECT COUNT(*) FROM classes WHERE program_code IS NULL) > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'MIGRATION VERIFICATION FAILED: Unmapped classes detected with NULL program_code.';
    END IF;

    -- 5. Academic programmes count must be exactly 11 (7 UG + 4 PG)
    IF (SELECT COUNT(*) FROM academic_programmes) <> 11 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'MIGRATION VERIFICATION FAILED: Academic programmes count is not exactly 11.';
    END IF;

    -- 6. All 4 M.E. classes must exist with verified attributes
    IF (
        SELECT COUNT(*) FROM classes
        WHERE id IN ('ME_CSE_I', 'ME_EST_I', 'ME_SE_III', 'ME_MFE_III')
          AND program_type = 'PG'
          AND regulation_code = '2025'
    ) <> 4 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'MIGRATION VERIFICATION FAILED: One or more M.E. classes missing or have incorrect program_type/regulation.';
    END IF;

    -- 7. Historical session 1 must be preserved in unresolved soft-archived state
    IF (
        SELECT COUNT(*) FROM marks_sessions 
        WHERE id = 1 
          AND academic_year_id IS NULL 
          AND assessment_cycle_id IS NULL 
          AND session_identity_guard = '__UNRESOLVED_AY__:__UNRESOLVED_CYCLE__:internal1'
          AND is_archived = 1
    ) <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'MIGRATION VERIFICATION FAILED: Historical session 1 not properly preserved in unresolved state.';
    END IF;

    -- 8. Unique session identity constraint must be active
    IF (
        SELECT COUNT(*) FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = 'college_cms_verify' 
          AND TABLE_NAME = 'marks_sessions' 
          AND INDEX_NAME = 'uq_marks_sessions_identity'
          AND COLUMN_NAME = 'session_identity_guard'
    ) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'MIGRATION VERIFICATION FAILED: uq_marks_sessions_identity index does not cover session_identity_guard.';
    END IF;

    -- 9. All 15 immutability triggers must be active
    IF (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'college_cms_verify') <> 15 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'MIGRATION VERIFICATION FAILED: Active trigger count is not exactly 15 in college_cms_verify.';
    END IF;
END$$
DELIMITER ;

CALL `sp_migration_verify_final_state`();
DROP PROCEDURE `sp_migration_verify_final_state`;

-- Live Migration Completion Scorecard (Evaluates all 9 mandatory assertions conditionally in CASE WHEN)
SELECT 
    'PHASE 1 DATABASE MIGRATION STATUS' AS operation,
    CASE 
        WHEN (SELECT COUNT(*) FROM classes) = 33
         AND (SELECT COUNT(*) FROM classes WHERE program_type = 'PG') = 4
         AND (SELECT COUNT(*) FROM classes WHERE program_type = 'UG') = 29
         AND (SELECT COUNT(*) FROM classes WHERE program_code IS NULL) = 0
         AND (SELECT COUNT(*) FROM academic_programmes) = 11
         AND (
             SELECT COUNT(*) FROM classes
             WHERE id IN ('ME_CSE_I', 'ME_EST_I', 'ME_SE_III', 'ME_MFE_III')
               AND program_type = 'PG'
               AND regulation_code = '2025'
         ) = 4
         AND (SELECT COUNT(*) FROM marks_sessions WHERE is_archived = 1) = 1
         AND (
             SELECT COUNT(*) FROM marks_sessions 
             WHERE id = 1 
               AND academic_year_id IS NULL 
               AND assessment_cycle_id IS NULL 
               AND session_identity_guard = '__UNRESOLVED_AY__:__UNRESOLVED_CYCLE__:internal1'
               AND is_archived = 1
         ) = 1
         AND (
             SELECT COUNT(*) FROM information_schema.STATISTICS 
             WHERE TABLE_SCHEMA = 'college_cms_verify' 
               AND TABLE_NAME = 'marks_sessions' 
               AND INDEX_NAME = 'uq_marks_sessions_identity' 
               AND COLUMN_NAME = 'session_identity_guard'
         ) > 0
         AND (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'college_cms_verify') = 15
        THEN 'SUCCESS: Verified all 33 classes, 11 programmes, 4 M.E. classes, 15 triggers, and airtight session identity guard.'
        ELSE 'FAIL: Final state verification failed. Review assertion details.'
    END AS verification_verdict,
    (SELECT COUNT(*) FROM classes) AS total_classes_count,
    (SELECT COUNT(*) FROM classes WHERE program_type = 'PG') AS pg_classes_count,
    (SELECT COUNT(*) FROM classes WHERE program_type = 'UG') AS ug_classes_count,
    (SELECT COUNT(*) FROM academic_programmes) AS academic_programmes_count,
    (
        SELECT COUNT(*) FROM classes
        WHERE id IN ('ME_CSE_I', 'ME_EST_I', 'ME_SE_III', 'ME_MFE_III')
          AND program_type = 'PG'
          AND regulation_code = '2025'
    ) AS verified_me_classes_count,
    (SELECT COUNT(*) FROM marks_sessions WHERE is_archived = 1) AS archived_sessions_count,
    (SELECT COUNT(*) FROM marks_sessions WHERE academic_year_id IS NOT NULL) AS active_sessions_count,
    (
        SELECT COUNT(*) FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = 'college_cms_verify' 
          AND TABLE_NAME = 'marks_sessions' 
          AND INDEX_NAME = 'uq_marks_sessions_identity' 
          AND COLUMN_NAME = 'session_identity_guard'
    ) AS session_identity_guard_index_count,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'college_cms_verify') AS triggers_active_count,
    NOW() AS evaluated_at;
