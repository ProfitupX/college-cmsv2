-- =====================================================================================
-- MARKHUB PHASE 1: DATABASE ROLLBACK AND DISASTER RECOVERY SCRIPT (V5.6 FINAL CRITICAL DEFECT CORRECTION)
-- Target Schema: college_cms_verify
-- Application: Anna University Internal Mark Entry Portal (UG & PG Unified MarkHub)
-- Scope: NOV/DEC 2026 Assessment Cycle - 4 Active M.E. Classes (ME_CSE_I, ME_EST_I, ME_SE_III, ME_MFE_III)
-- Execution Mode: PREPARATION ONLY (DO NOT EXECUTE WITHOUT AUTHORIZATION)
--
-- TECHNICAL GOVERNANCE & MYSQL DDL IMPLICIT-COMMIT FORWARD RECOVERY NOTICE:
-- 1. In MySQL 8, DDL statements (`ALTER TABLE`, `DROP TABLE`, `DROP TRIGGER`) cause implicit commits.
--    Rollback in MySQL is NOT an atomic database-wide rollback; it is a sequence of explicit
--    compensating operations (forward-recovery) executed in reverse dependency order.
-- 2. V5.6 HARDENED ROLLBACK ARCHITECTURE:
--    - Exact Original Class-ID Inventory Verification: Rigorously verifies all 29 original
--      class IDs individually against the baseline (missing count = 0, extra count = 0),
--      not just a total count of 29.
--    - Cross-Schema Foreign-Key Inspection: Audits all schemas across the MySQL server to detect
--      if any external schema has added foreign keys pointing to `college_cms_verify.classes`
--      or `college_cms_verify.academic_programmes`.
--    - Strict M.E. Class Removal Gate: Verifies that all 4 M.E. classes are completely deleted
--      before any DDL schema alterations proceed.
--    - Drops all 15 immutability triggers (including insert protection triggers).
--    - Drops unique session identity guard constraint (`uq_marks_sessions_identity`) and columns.
--    - Comprehensive Post-Rollback State Verification: Rigorously verifies restored schema,
--      exact class inventory (29), column removals, trigger drops, and baseline audit retention.
--    - Never reports SUCCESS unless every mandatory assertion passes 100%.
--
-- PHYSICAL SERVER SAFETY MANDATE:
-- - Schema name (`DATABASE()`) and TCP port (`@@port`) checks ALONE DO NOT prove physical server identity.
-- - The operator MUST independently verify out-of-band in client connection properties that the
--   host endpoint is strictly local (127.0.0.1/localhost) before setting
--   `@OPERATOR_VERIFIED_LOCAL_SANDBOX = 'YES_VERIFIED_LOCAL_SANDBOX'`.
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
    'OPERATOR MUST INDEPENDENTLY CONFIRM LOCAL SANDBOX ENDPOINT OUT-OF-BAND' AS physical_server_safety_requirement;

-- =====================================================================================
-- SAFEGUARD 0.2: SANDBOX INSTANCE & SERVER IDENTITY MULTI-FACTOR VERIFICATION
-- Operator MUST declare both session variables prior to execution:
--   SET @OPERATOR_AUTHORIZED_ROLLBACK = 'AUTHORIZED_ROLLBACK_BY_EXAMINATION_CELL';
--   SET @OPERATOR_VERIFIED_LOCAL_SANDBOX = 'YES_VERIFIED_LOCAL_SANDBOX';
-- =====================================================================================
DROP PROCEDURE IF EXISTS `sp_rollback_assert_sandbox_instance`;
DELIMITER $$
CREATE PROCEDURE `sp_rollback_assert_sandbox_instance`()
BEGIN
    -- 1. Check human out-of-band physical server verification variable
    IF @OPERATOR_VERIFIED_LOCAL_SANDBOX IS NULL 
       OR @OPERATOR_VERIFIED_LOCAL_SANDBOX <> 'YES_VERIFIED_LOCAL_SANDBOX' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL SECURITY ABORT: Operator has not confirmed local sandbox out-of-band verification. Execute: SET @OPERATOR_VERIFIED_LOCAL_SANDBOX = ''YES_VERIFIED_LOCAL_SANDBOX''; only after verifying connection is 127.0.0.1/localhost.';
    END IF;

    -- 2. Check institutional rollback authorization variable
    IF @OPERATOR_AUTHORIZED_ROLLBACK IS NULL 
       OR @OPERATOR_AUTHORIZED_ROLLBACK <> 'AUTHORIZED_ROLLBACK_BY_EXAMINATION_CELL' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL SECURITY ABORT: Explicit operator authorization required. Execute: SET @OPERATOR_AUTHORIZED_ROLLBACK = ''AUTHORIZED_ROLLBACK_BY_EXAMINATION_CELL''; before running rollback.';
    END IF;

    -- 3. SQL-enforced database name check
    IF DATABASE() IS NULL OR DATABASE() <> 'college_cms_verify' THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'FATAL SECURITY ABORT: Target database is NOT college_cms_verify. Rollback aborted immediately.';
    END IF;

    -- 4. SQL-enforced port check (3306/3307 sandbox environment)
    IF @@port NOT IN (3306, 3307) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL SECURITY ABORT: Active MySQL port is not sandbox development port (3306/3307). Halting for safety.';
    END IF;

    -- 5. Production schema collision check
    IF (SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = 'college_cms') > 0 
       AND DATABASE() = 'college_cms' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL SECURITY ABORT: Attempting rollback against production schema college_cms! Execution aborted.';
    END IF;
END$$
DELIMITER ;

CALL `sp_rollback_assert_sandbox_instance`();
DROP PROCEDURE `sp_rollback_assert_sandbox_instance`;

-- =====================================================================================
-- SAFEGUARD 0.3: EXPANDED CONDITIONAL SAFETY AUDIT & CROSS-SCHEMA DEPENDENCY INSPECTION
-- Audits cross-schema foreign keys across ALL databases on the MySQL server, and audits
-- all post-migration operational records before any trigger or schema object is altered!
-- =====================================================================================
DROP PROCEDURE IF EXISTS `sp_rollback_assert_safety_guard`;
DELIMITER $$
CREATE PROCEDURE `sp_rollback_assert_safety_guard`()
BEGIN
    DECLARE v_enrolled_pg_students INT DEFAULT 0;
    DECLARE v_pg_marks_sessions INT DEFAULT 0;
    DECLARE v_sessions_with_ay INT DEFAULT 0;
    DECLARE v_sessions_with_cycle INT DEFAULT 0;
    DECLARE v_pg_subjects INT DEFAULT 0;
    DECLARE v_cleared_marks INT DEFAULT 0;
    DECLARE v_archived_components INT DEFAULT 0;
    DECLARE v_archived_sessions INT DEFAULT 0;
    DECLARE v_unlock_requests INT DEFAULT 0;
    DECLARE v_history_records INT DEFAULT 0;
    DECLARE v_pg_attendance INT DEFAULT 0;
    DECLARE v_pg_audit_logs INT DEFAULT 0;
    DECLARE v_cross_schema_fks INT DEFAULT 0;

    -- 1. Complete Cross-Schema Foreign Key Dependency Inspection across ALL databases
    SELECT COUNT(*) INTO v_cross_schema_fks
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE REFERENCED_TABLE_SCHEMA = 'college_cms_verify'
      AND REFERENCED_TABLE_NAME IN ('academic_programmes', 'classes')
      AND NOT (TABLE_SCHEMA = 'college_cms_verify' AND TABLE_NAME IN ('classes', 'subjects', 'students', 'student_enrollments', 'marks_sessions', 'class_analysis_remarks'));

    IF v_cross_schema_fks > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL ROLLBACK ABORT: External or cross-schema table foreign key references detected on classes or academic_programmes. Rollback blocked.';
    END IF;

    -- 2. Check for student enrollments in the 4 M.E. classes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'student_enrollments') THEN
        SELECT COUNT(*) INTO v_enrolled_pg_students 
        FROM student_enrollments 
        WHERE class_id IN ('ME_CSE_I', 'ME_EST_I', 'ME_SE_III', 'ME_MFE_III');
    END IF;

    -- 3. Check for assessment sessions in the 4 M.E. classes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'marks_sessions') THEN
        SELECT COUNT(*) INTO v_pg_marks_sessions 
        FROM marks_sessions 
        WHERE class_id IN ('ME_CSE_I', 'ME_EST_I', 'ME_SE_III', 'ME_MFE_III');
    END IF;

    -- 4. Check for assessment sessions with populated academic_year_id (excluding unresolved session 1)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'college_cms_verify' AND table_name = 'marks_sessions' AND column_name = 'academic_year_id') THEN
        SELECT COUNT(*) INTO v_sessions_with_ay FROM marks_sessions WHERE academic_year_id IS NOT NULL;
    END IF;

    -- 5. Check for assessment sessions with populated assessment_cycle_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'college_cms_verify' AND table_name = 'marks_sessions' AND column_name = 'assessment_cycle_id') THEN
        SELECT COUNT(*) INTO v_sessions_with_cycle FROM marks_sessions WHERE assessment_cycle_id IS NOT NULL;
    END IF;

    -- 6. Check for subjects allocated to the 4 M.E. classes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'subjects') THEN
        SELECT COUNT(*) INTO v_pg_subjects 
        FROM subjects 
        WHERE class_id IN ('ME_CSE_I', 'ME_EST_I', 'ME_SE_III', 'ME_MFE_III');
    END IF;

    -- 7. Check if any marks have been soft-cleared post-migration
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'college_cms_verify' AND table_name = 'marks' AND column_name = 'is_cleared') THEN
        SELECT COUNT(*) INTO v_cleared_marks FROM marks WHERE is_cleared = 1;
    END IF;

    -- 8. Check if any components have been soft-archived post-migration
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'college_cms_verify' AND table_name = 'assessment_components' AND column_name = 'is_active') THEN
        SELECT COUNT(*) INTO v_archived_components FROM assessment_components WHERE is_active = 0;
    END IF;

    -- 9. Check if any assessment sessions have been archived post-migration (excluding baseline session 1)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'college_cms_verify' AND table_name = 'marks_sessions' AND column_name = 'is_archived') THEN
        SELECT COUNT(*) INTO v_archived_sessions FROM marks_sessions WHERE is_archived = 1 AND id <> 1;
    END IF;

    -- 10. Check for mark unlock requests referencing M.E. classes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'mark_unlock_requests') THEN
        SELECT COUNT(*) INTO v_unlock_requests 
        FROM mark_unlock_requests 
        WHERE class_id IN ('ME_CSE_I', 'ME_EST_I', 'ME_SE_III', 'ME_MFE_III');
    END IF;

    -- 11. Check for marks history snapshots referencing M.E. classes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'marks_history') THEN
        SELECT COUNT(*) INTO v_history_records 
        FROM marks_history 
        WHERE class_id IN ('ME_CSE_I', 'ME_EST_I', 'ME_SE_III', 'ME_MFE_III');
    END IF;

    -- 12. Check for session attendance referencing M.E. classes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'session_attendance') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'marks_sessions') THEN
        SELECT COUNT(*) INTO v_pg_attendance
        FROM session_attendance sa
        JOIN marks_sessions ms ON sa.session_id = ms.id
        WHERE ms.class_id IN ('ME_CSE_I', 'ME_EST_I', 'ME_SE_III', 'ME_MFE_III');
    END IF;

    -- 13. Check for marks audit logs referencing M.E. classes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'marks_audit_logs') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'marks_sessions') THEN
        SELECT COUNT(*) INTO v_pg_audit_logs
        FROM marks_audit_logs mal
        JOIN marks_sessions ms ON mal.session_id = ms.id
        WHERE ms.class_id IN ('ME_CSE_I', 'ME_EST_I', 'ME_SE_III', 'ME_MFE_III');
    END IF;

    -- FATAL ASSERTION: If ANY operational data exists, ABORT ROLLBACK!
    IF v_enrolled_pg_students > 0 OR v_pg_marks_sessions > 0 OR v_sessions_with_ay > 0 
       OR v_sessions_with_cycle > 0 OR v_pg_subjects > 0 OR v_cleared_marks > 0 
       OR v_archived_components > 0 OR v_archived_sessions > 0 OR v_unlock_requests > 0 
       OR v_history_records > 0 OR v_pg_attendance > 0 OR v_pg_audit_logs > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL ROLLBACK ABORT: Post-migration operational records exist (enrolled students, marks sessions, populated AY/cycle, soft-cleared marks, attendance, or audit history). Rollback blocked to prevent data loss.';
    END IF;
END$$
DELIMITER ;

CALL `sp_rollback_assert_safety_guard`();
DROP PROCEDURE `sp_rollback_assert_safety_guard`;

-- =====================================================================================
-- STEP 1: DROP DATABASE PROTECTION TRIGGERS (ALL 15 TRIGGERS)
-- Triggers are dropped ONLY after the safety audit has succeeded.
-- =====================================================================================

DROP TRIGGER IF EXISTS `trg_prevent_hard_delete_marks`;
DROP TRIGGER IF EXISTS `trg_prevent_insert_marks_archived_session`;
DROP TRIGGER IF EXISTS `trg_prevent_update_marks_archived_session`;
DROP TRIGGER IF EXISTS `trg_prevent_hard_delete_components`;
DROP TRIGGER IF EXISTS `trg_prevent_insert_components_archived_session`;
DROP TRIGGER IF EXISTS `trg_prevent_update_components_archived_session`;
DROP TRIGGER IF EXISTS `trg_prevent_hard_delete_sessions`;
DROP TRIGGER IF EXISTS `trg_prevent_update_archived_session`;
DROP TRIGGER IF EXISTS `trg_prevent_hard_delete_attendance`;
DROP TRIGGER IF EXISTS `trg_prevent_insert_attendance_archived_session`;
DROP TRIGGER IF EXISTS `trg_prevent_update_attendance_archived_session`;
DROP TRIGGER IF EXISTS `trg_prevent_hard_delete_marks_history`;
DROP TRIGGER IF EXISTS `trg_prevent_update_marks_history`;
DROP TRIGGER IF EXISTS `trg_prevent_hard_delete_marks_audit_logs`;
DROP TRIGGER IF EXISTS `trg_prevent_update_marks_audit_logs`;

-- =====================================================================================
-- STEP 2: REVERT STUDENT ENROLLMENTS SCHEMA
-- Target Table: student_enrollments
-- Purpose: Remove virtual eligibility columns and reporting index.
-- =====================================================================================

ALTER TABLE `student_enrollments`
    DROP INDEX `idx_enrollment_hist_report`,
    DROP COLUMN `is_promotion_eligible`,
    DROP COLUMN `is_marks_eligible`;

-- =====================================================================================
-- STEP 3: REVERT ASSESSMENT COMPONENTS SCHEMA
-- Target Table: assessment_components
-- Purpose: Remove soft-archival columns and active lookup index.
-- =====================================================================================

ALTER TABLE `assessment_components`
    DROP INDEX `idx_components_session_active`,
    DROP COLUMN `archive_reason`,
    DROP COLUMN `archived_by`,
    DROP COLUMN `archived_at`,
    DROP COLUMN `is_active`;

-- =====================================================================================
-- STEP 4: REVERT MARKS TABLE SCHEMA
-- Target Table: marks
-- Purpose: Remove soft-clearing audit columns and active lookup index.
-- =====================================================================================

ALTER TABLE `marks`
    DROP INDEX `idx_marks_active_lookup`,
    DROP COLUMN `clear_reason`,
    DROP COLUMN `cleared_by`,
    DROP COLUMN `cleared_at`,
    DROP COLUMN `is_cleared`;

-- =====================================================================================
-- STEP 5: REVERT MARKS SESSIONS SCHEMA & UNRESOLVED STATE
-- Target Table: marks_sessions
-- =====================================================================================

-- 5.1: Revert historical session 1 archival flag
UPDATE `marks_sessions`
SET `is_archived` = 0, `archived_at` = NULL, `archived_by` = NULL, `archive_reason` = NULL
WHERE `id` = 1;

-- 5.2: Drop AY/cycle consistency constraints and identity columns on marks_sessions
ALTER TABLE `marks_sessions`
    DROP FOREIGN KEY `fk_marks_sessions_cycle_ay_consistency`,
    DROP CONSTRAINT `chk_session_ay_cycle_consistency`,
    DROP FOREIGN KEY `fk_marks_sessions_academic_year`,
    DROP FOREIGN KEY `fk_marks_sessions_assessment_cycle`,
    DROP INDEX `uq_marks_sessions_identity`,
    DROP INDEX `idx_marks_sessions_cycle_status`,
    DROP COLUMN `session_identity_guard`,
    DROP COLUMN `archive_reason`,
    DROP COLUMN `archived_by`,
    DROP COLUMN `archived_at`,
    DROP COLUMN `is_archived`,
    DROP COLUMN `assessment_cycle_id`,
    DROP COLUMN `academic_year_id`;

-- 5.3: Drop composite key on assessment_cycles
ALTER TABLE `assessment_cycles`
    DROP INDEX `uq_cycle_ay_composite`;

-- =====================================================================================
-- STEP 6: REVERT CLASSES TABLE AND STRICTLY REMOVE 4 M.E. CLASSES
-- Target Table: classes
-- Verified removal gate: Asserts all 4 M.E. classes are deleted before dropping columns.
-- =====================================================================================

-- 6.1: Delete the 4 active M.E. class cohorts
DELETE FROM `classes` 
WHERE `id` IN (
    'ME_CSE_I', 'ME_EST_I', 'ME_SE_III', 'ME_MFE_III'
)
AND `id` NOT IN (SELECT DISTINCT class_id FROM student_enrollments)
AND `id` NOT IN (SELECT DISTINCT class_id FROM marks_sessions);

-- 6.2: Strict Removal Assertion Gate: Halts if any M.E. class remains in classes table
DROP PROCEDURE IF EXISTS `sp_assert_me_classes_removed`;
DELIMITER $$
CREATE PROCEDURE `sp_assert_me_classes_removed`()
BEGIN
    DECLARE v_remaining_me_classes INT DEFAULT 0;
    SELECT COUNT(*) INTO v_remaining_me_classes 
    FROM classes 
    WHERE id IN ('ME_CSE_I', 'ME_EST_I', 'ME_SE_III', 'ME_MFE_III');

    IF v_remaining_me_classes > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL ROLLBACK ABORT: Failed to delete all 4 M.E. class records. Schema alteration blocked.';
    END IF;
END$$
DELIMITER ;

CALL `sp_assert_me_classes_removed`();
DROP PROCEDURE `sp_assert_me_classes_removed`;

-- 6.3: Drop foreign key, index, and programme columns on classes
ALTER TABLE `classes`
    DROP FOREIGN KEY `fk_classes_academic_programme`,
    DROP INDEX `idx_classes_prog_reg_sem`,
    DROP COLUMN `program_code`,
    DROP COLUMN `regulation_code`,
    DROP COLUMN `program_type`;

-- =====================================================================================
-- STEP 7: DROP ACADEMIC PROGRAMMES TABLE
-- Target Table: academic_programmes
-- =====================================================================================

DROP TABLE IF EXISTS `academic_programmes`;

-- =====================================================================================
-- STEP 8: POST-ROLLBACK STATE & EXACT ORIGINAL CLASS-ID INVENTORY VERIFICATION
-- Asserts restored schema, exact 29 original class IDs, column removals, triggers dropped,
-- and baseline forensic audit retention.
-- Halts with SIGNAL 45000 if ANY check fails.
-- =====================================================================================
DROP PROCEDURE IF EXISTS `sp_verify_rollback_completeness`;
DELIMITER $$
CREATE PROCEDURE `sp_verify_rollback_completeness`()
BEGIN
    DECLARE v_missing_classes INT DEFAULT 0;
    DECLARE v_extra_classes INT DEFAULT 0;

    -- 1. Classes count must be back to exactly 29
    IF (SELECT COUNT(*) FROM classes) <> 29 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROLLBACK VERIFICATION FAILED: Classes count is not back to exactly 29 baseline classes.';
    END IF;

    -- 2. Verify all 29 original baseline class IDs exist individually (missing = 0)
    SELECT COUNT(*) INTO v_missing_classes
    FROM (
        SELECT 'C_SH_AIDS_1' AS id UNION ALL SELECT 'C_SH_CIVIL_1' UNION ALL
        SELECT 'C_SH_CSE_A_1' UNION ALL SELECT 'C_SH_CSE_B_1' UNION ALL
        SELECT 'C_SH_ECE_1' UNION ALL SELECT 'C_SH_EEE_1' UNION ALL
        SELECT 'C_SH_IT_1' UNION ALL SELECT 'C_SH_MECH_1' UNION ALL
        SELECT 'CL001' UNION ALL SELECT 'CL002' UNION ALL SELECT 'CL003' UNION ALL
        SELECT 'CL004' UNION ALL SELECT 'CL005' UNION ALL SELECT 'CL006' UNION ALL SELECT 'CL007' UNION ALL
        SELECT 'CL_AIDS_III' UNION ALL SELECT 'CL_CIVIL_III' UNION ALL
        SELECT 'CL_CSE_III' UNION ALL SELECT 'CL_ECE_III' UNION ALL
        SELECT 'CL_EEE_III' UNION ALL SELECT 'CL_IT_III' UNION ALL SELECT 'CL_MECH_III' UNION ALL
        SELECT 'CL_AIDS_IV' UNION ALL SELECT 'CL_CIVIL_IV' UNION ALL
        SELECT 'CL_CSE_IV' UNION ALL SELECT 'CL_ECE_IV' UNION ALL
        SELECT 'CL_EEE_IV' UNION ALL SELECT 'CL_IT_IV' UNION ALL SELECT 'CL_MECH_IV'
    ) exp
    LEFT JOIN classes c ON c.id = exp.id
    WHERE c.id IS NULL;

    IF v_missing_classes > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'ROLLBACK VERIFICATION FAILED: One or more of the original 29 baseline class IDs are missing after rollback.';
    END IF;

    -- 3. Verify no extra or unexpected classes exist (extra = 0)
    SELECT COUNT(*) INTO v_extra_classes
    FROM classes
    WHERE id NOT IN (
        'C_SH_AIDS_1', 'C_SH_CIVIL_1', 'C_SH_CSE_A_1', 'C_SH_CSE_B_1',
        'C_SH_ECE_1', 'C_SH_EEE_1', 'C_SH_IT_1', 'C_SH_MECH_1',
        'CL001', 'CL002', 'CL003', 'CL004', 'CL005', 'CL006', 'CL007',
        'CL_AIDS_III', 'CL_CIVIL_III', 'CL_CSE_III', 'CL_ECE_III', 'CL_EEE_III', 'CL_IT_III', 'CL_MECH_III',
        'CL_AIDS_IV', 'CL_CIVIL_IV', 'CL_CSE_IV', 'CL_ECE_IV', 'CL_EEE_IV', 'CL_IT_IV', 'CL_MECH_IV'
    );

    IF v_extra_classes > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'ROLLBACK VERIFICATION FAILED: Unexpected classes found in classes table after rollback.';
    END IF;

    -- 4. academic_programmes table must not exist
    IF (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'academic_programmes') > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROLLBACK VERIFICATION FAILED: academic_programmes table still exists.';
    END IF;

    -- 5. Phase 1 columns must not exist
    IF (
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_schema = 'college_cms_verify' 
          AND (
            (table_name = 'classes' AND column_name IN ('program_type', 'regulation_code', 'program_code')) OR
            (table_name = 'marks_sessions' AND column_name IN ('academic_year_id', 'assessment_cycle_id', 'is_archived', 'session_identity_guard')) OR
            (table_name = 'marks' AND column_name IN ('is_cleared', 'cleared_at', 'cleared_by', 'clear_reason')) OR
            (table_name = 'assessment_components' AND column_name IN ('is_active', 'archived_at', 'archived_by', 'archive_reason')) OR
            (table_name = 'student_enrollments' AND column_name IN ('is_marks_eligible', 'is_promotion_eligible'))
          )
    ) > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROLLBACK VERIFICATION FAILED: Reverted columns still exist in schema.';
    END IF;

    -- 6. Protection triggers must all be dropped (all 15 Phase 1 triggers must not exist)
    IF (
        SELECT COUNT(*) FROM information_schema.triggers 
        WHERE trigger_schema = 'college_cms_verify' 
          AND trigger_name IN (
            'trg_prevent_hard_delete_marks', 'trg_prevent_insert_marks_archived_session', 'trg_prevent_update_marks_archived_session',
            'trg_prevent_hard_delete_components', 'trg_prevent_insert_components_archived_session', 'trg_prevent_update_components_archived_session',
            'trg_prevent_hard_delete_sessions', 'trg_prevent_update_archived_session',
            'trg_prevent_hard_delete_attendance', 'trg_prevent_insert_attendance_archived_session', 'trg_prevent_update_attendance_archived_session',
            'trg_prevent_hard_delete_marks_history', 'trg_prevent_update_marks_history',
            'trg_prevent_hard_delete_marks_audit_logs', 'trg_prevent_update_marks_audit_logs'
          )
    ) > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROLLBACK VERIFICATION FAILED: Phase 1 protection triggers still exist after rollback.';
    END IF;

    -- 7. Baseline audit objects must be preserved
    IF (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name IN ('migration_baseline_metrics', 'migration_baseline_record_hashes', 'migration_baseline_capture_status')) <> 3 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROLLBACK VERIFICATION FAILED: Baseline audit objects were erroneously dropped.';
    END IF;
END$$
DELIMITER ;

CALL `sp_verify_rollback_completeness`();
DROP PROCEDURE `sp_verify_rollback_completeness`;

-- =====================================================================================
-- FINAL ROLLBACK VERIFICATION SCORECARD
-- Emitted ONLY when sp_verify_rollback_completeness passes with zero exceptions.
-- =====================================================================================
SELECT 
    'ROLLBACK STATUS' AS operation,
    CASE 
        WHEN (SELECT COUNT(*) FROM classes) = 29
         AND (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'academic_programmes') = 0
         AND (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'college_cms_verify') = 0
         AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'college_cms_verify' AND table_name = 'marks_sessions' AND column_name IN ('academic_year_id', 'assessment_cycle_id', 'session_identity_guard')) = 0
         AND (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name IN ('migration_baseline_metrics', 'migration_baseline_record_hashes', 'migration_baseline_capture_status')) = 3
        THEN 'SUCCESS: Application schema restored to pre-migration baseline state.'
        ELSE 'FAIL: Rollback verification failed. Schema not fully reverted.'
    END AS status,
    (SELECT COUNT(*) FROM classes) AS current_classes_count,
    'All 29 original baseline class IDs verified present with zero extra classes' AS class_inventory_status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'academic_programmes') AS academic_programmes_exists,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'college_cms_verify') AS remaining_triggers_count,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'migration_baseline_metrics') AS baseline_metrics_preserved,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'migration_baseline_record_hashes') AS baseline_hashes_preserved,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'migration_baseline_capture_status') AS baseline_status_preserved,
    'NOTE: Baseline audit objects (metrics, hashes, and capture status) remain preserved for forensic compliance.' AS audit_notice,
    NOW() AS evaluated_at;
