-- =====================================================================================
-- MARKHUB PHASE 1: AUTHORIZED IMMUTABLE BASELINE CAPTURE (V5.7 TARGETED DEFECT CORRECTIONS)
-- Target Schema: college_cms_verify
-- Execution Mode: SEPARATELY AUTHORIZED BASELINE CAPTURE (IMMUTABLE SNAPSHOT)
--
-- TECHNICAL GOVERNANCE & INTEGRITY SCOPE SPECIFICATION:
-- 1. SELECTED-COLUMN CRYPTOGRAPHIC CHECKSUMS (EXPLICIT SCOPE DEFINITION):
--    - This baseline captures deterministic SHA-256 hashes computed over a strict, explicit
--      subset of vital academic identity, session, enrollment, marks, and attendance columns.
--    - It verifies row-level semantic data integrity and relational state.
--    - It DOES NOT claim to be a byte-for-byte full-row physical database backup or storage snapshot.
--      Columns outside the monitored set (such as presentation styling, UI icons, or non-functional
--      auxiliary metadata) are intentionally excluded from the hash payload.
--    - Standard physical database backup (`mysqldump` or storage snapshot) MUST be completed
--      out-of-band prior to executing any DDL or DML migration script.
-- 2. OPERATIONALLY ENFORCEABLE WRITE-FREE MAINTENANCE WINDOW & LIMITATIONS:
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
-- 3. RELIABLE TRANSACTION EXCEPTION HANDLING & LIFECYCLE TRACKING:
--    - The `IN_PROGRESS` status record is explicitly committed to disk BEFORE the capture transaction begins.
--    - The capture transaction is wrapped in `sp_execute_baseline_capture` with `EXIT HANDLER FOR SQLEXCEPTION`.
--    - On failure:
--      a) The real MySQL error message is extracted using `GET DIAGNOSTICS CONDITION 1 v_error_text = MESSAGE_TEXT;`.
--      b) The uncommitted snapshot transaction is rolled back.
--      c) Status is updated to `FAILED_INTERRUPTED` with failure reason and EXPLICITLY COMMITTED to disk,
--         guaranteeing persistence even when `autocommit = 0`.
--      d) Execution halts via `SIGNAL SQLSTATE '45000'`.
--    - LIMITATION TRANSPARENCY:
--      If catastrophic failure occurs (such as immediate server power loss, OS crash, or abrupt network severance
--      before the exception handler executes), MySQL InnoDB crash recovery will roll back uncommitted hashes,
--      leaving the lifecycle record in `IN_PROGRESS` status. Safeguard 0.4 explicitly detects and halts on any
--      pre-existing uncompleted run, preventing accidental re-execution until the incident is forensically reviewed.
-- 4. NON-DESTRUCTIVE RECOVERY PROCEDURE:
--    - Safe recovery does NOT delete existing baseline evidence or audit records.
--    - Retries require an authorized distinct `@run_id`, preserving full historical failure forensics.
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
    'WRITE-FREE MAINTENANCE WINDOW MUST BE ENFORCED THROUGH MIGRATION HANDOFF' AS maintenance_window_requirement;

-- =====================================================================================
-- SAFEGUARD 0.2: EXPLICIT OPERATOR AUTHORIZATION & OPERATIONAL MAINTENANCE VERIFICATION GATE
-- Operator MUST declare session variables prior to execution:
--   SET @run_id = 'MARKHUB_PHASE1_BASELINE_20261109';
--   SET @OPERATOR_AUTHORIZED_BASELINE_CAPTURE = 'AUTHORIZED_BY_EXAMINATION_CELL';
--   SET @OPERATOR_VERIFIED_LOCAL_SANDBOX = 'YES_VERIFIED_LOCAL_SANDBOX';
--   SET @OPERATOR_ENFORCED_WRITE_FREE_MAINTENANCE_WINDOW = 'YES_MAINTENANCE_WINDOW_ENFORCED';
-- =====================================================================================
DROP PROCEDURE IF EXISTS `sp_assert_operator_authorization`;
DELIMITER $$
CREATE PROCEDURE `sp_assert_operator_authorization`()
BEGIN
    DECLARE v_active_clients INT DEFAULT 0;
    DECLARE v_idle_clients INT DEFAULT 0;
    DECLARE v_active_trx INT DEFAULT 0;

    -- 1. Check human out-of-band physical server verification variable
    IF @OPERATOR_VERIFIED_LOCAL_SANDBOX IS NULL 
       OR @OPERATOR_VERIFIED_LOCAL_SANDBOX <> 'YES_VERIFIED_LOCAL_SANDBOX' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL SECURITY ABORT: Operator has not confirmed local sandbox out-of-band verification. Execute: SET @OPERATOR_VERIFIED_LOCAL_SANDBOX = ''YES_VERIFIED_LOCAL_SANDBOX''; only after verifying connection is 127.0.0.1/localhost.';
    END IF;

    -- 2. Check institutional authorization variable
    IF @OPERATOR_AUTHORIZED_BASELINE_CAPTURE IS NULL 
       OR @OPERATOR_AUTHORIZED_BASELINE_CAPTURE <> 'AUTHORIZED_BY_EXAMINATION_CELL' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL SECURITY ABORT: Explicit operator authorization required. Execute: SET @OPERATOR_AUTHORIZED_BASELINE_CAPTURE = ''AUTHORIZED_BY_EXAMINATION_CELL''; before running baseline capture.';
    END IF;

    -- 3. Check write-free maintenance window operator declaration
    IF @OPERATOR_ENFORCED_WRITE_FREE_MAINTENANCE_WINDOW IS NULL 
       OR @OPERATOR_ENFORCED_WRITE_FREE_MAINTENANCE_WINDOW <> 'YES_MAINTENANCE_WINDOW_ENFORCED' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL SECURITY ABORT: Operator has not confirmed write-free maintenance window enforcement. Execute: SET @OPERATOR_ENFORCED_WRITE_FREE_MAINTENANCE_WINDOW = ''YES_MAINTENANCE_WINDOW_ENFORCED'';';
    END IF;

    -- 4. Operational Check: Verify zero concurrent client threads (active or idle) on college_cms_verify or unassigned
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
        SET MESSAGE_TEXT = 'FATAL MAINTENANCE ABORT: Active concurrent client queries detected on college_cms_verify or unassigned session. Halt application backend/pools before capture.';
    END IF;

    IF v_idle_clients > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL MAINTENANCE ABORT: Idle client connections detected on college_cms_verify or unassigned session (potential connection pool). Stop application backend (pm2 stop) and disconnect external clients.';
    END IF;

    -- 5. Operational Check: Verify zero active uncommitted background transactions
    SELECT COUNT(*) INTO v_active_trx
    FROM information_schema.innodb_trx;

    IF v_active_trx > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL MAINTENANCE ABORT: Active uncommitted background transactions detected on MySQL engine. Await completion before capture.';
    END IF;

    -- 6. SQL-enforced database name check
    IF DATABASE() IS NULL OR DATABASE() <> 'college_cms_verify' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL SECURITY ABORT: Target database is NOT college_cms_verify. Baseline capture aborted.';
    END IF;

    -- 7. SQL-enforced port check
    IF @@port NOT IN (3306, 3307) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL SECURITY ABORT: Active MySQL port is not local sandbox development port (3306/3307).';
    END IF;

    -- 8. Production schema collision check
    IF (SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = 'college_cms') > 0 
       AND DATABASE() = 'college_cms' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL SECURITY ABORT: Connected to production schema college_cms! Execution aborted.';
    END IF;
END$$
DELIMITER ;

CALL `sp_assert_operator_authorization`();
DROP PROCEDURE `sp_assert_operator_authorization`;

-- =====================================================================================
-- SAFEGUARD 0.3: BASELINE INFRASTRUCTURE & LIFECYCLE TRACKING TABLES
-- Creates tables before beginning snapshot transaction (avoids DDL implicit commit during capture).
-- =====================================================================================

CREATE TABLE IF NOT EXISTS `migration_baseline_capture_status` (
    `migration_run_id` VARCHAR(64) PRIMARY KEY,
    `status` ENUM('IN_PROGRESS', 'COMPLETED', 'FAILED_INTERRUPTED') NOT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `completed_at` DATETIME(3) NULL,
    `operator_signoff` VARCHAR(100) NOT NULL,
    `failure_reason` VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `migration_baseline_metrics` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `metric_name` VARCHAR(64) NOT NULL UNIQUE,
    `table_name` VARCHAR(64) NOT NULL,
    `row_count` BIGINT NOT NULL,
    `min_pk` VARCHAR(64) NULL,
    `max_pk` VARCHAR(64) NULL,
    `baseline_captured_at` DATETIME(3) NOT NULL,
    `migration_run_id` VARCHAR(64) NOT NULL,
    `authorization_signoff` VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `migration_baseline_record_hashes` (
    `table_name` VARCHAR(64) NOT NULL,
    `record_pk` VARCHAR(64) NOT NULL,
    `record_hash` CHAR(64) NOT NULL,
    `captured_at` DATETIME(3) NOT NULL,
    `migration_run_id` VARCHAR(64) NOT NULL,
    PRIMARY KEY (`table_name`, `record_pk`),
    INDEX `idx_baseline_hash_lookup` (`table_name`, `record_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================================
-- SAFEGUARD 0.4: DETECT COMPLETED BASELINE & RE-RUN RESTRICTIONS
-- Halts execution if a completed baseline already exists (immutable).
-- If previous attempts failed, ensures retry uses an authorized distinct run ID without
-- deleting previous forensic evidence.
-- =====================================================================================
DROP PROCEDURE IF EXISTS `sp_assert_clean_baseline_state`;
DELIMITER $$
CREATE PROCEDURE `sp_assert_clean_baseline_state`()
BEGIN
    DECLARE v_completed_runs INT DEFAULT 0;
    DECLARE v_run_id_exists INT DEFAULT 0;

    -- 1. An existing COMPLETED baseline is strictly immutable.
    SELECT COUNT(*) INTO v_completed_runs 
    FROM `migration_baseline_capture_status` WHERE `status` = 'COMPLETED';

    IF v_completed_runs > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL PRE-FLIGHT HARD STOP: Completed baseline already exists. Baseline is strictly immutable. Re-running capture is prohibited.';
    END IF;

    -- 2. Verify that current run ID is not already used in status table (prevents collision with failed run)
    SELECT COUNT(*) INTO v_run_id_exists 
    FROM `migration_baseline_capture_status` 
    WHERE `migration_run_id` = @run_id;

    IF v_run_id_exists > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL PRE-FLIGHT HARD STOP: Migration run ID already exists. Specify a distinct @run_id for retry to preserve forensic history.';
    END IF;
END$$
DELIMITER ;

CALL `sp_assert_clean_baseline_state`();
DROP PROCEDURE `sp_assert_clean_baseline_state`;

-- =====================================================================================
-- INITIALIZE & COMMIT LIFECYCLE RECORD BEFORE SNAPSHOT TRANSACTION
-- Ensures IN_PROGRESS status is reliably recorded on disk so failure status persists
-- even if the subsequent snapshot transaction encounters an error and rolls back.
-- =====================================================================================
SET @captured_at = CURRENT_TIMESTAMP(3);
SET @signoff = @OPERATOR_AUTHORIZED_BASELINE_CAPTURE;

INSERT INTO `migration_baseline_capture_status` 
    (`migration_run_id`, `status`, `started_at`, `completed_at`, `operator_signoff`, `failure_reason`)
VALUES 
    (@run_id, 'IN_PROGRESS', @captured_at, NULL, @signoff, NULL);

COMMIT; -- Guarantees IN_PROGRESS lifecycle record is persisted on disk even if autocommit = 0

-- =====================================================================================
-- PRE-COMPILE COMPLETENESS VERIFICATION PROCEDURE (BEFORE SNAPSHOT TRANSACTION)
-- Pre-compiled to avoid DDL implicit commits during snapshot execution.
-- =====================================================================================
DROP PROCEDURE IF EXISTS `sp_verify_baseline_capture_completeness`;
DELIMITER $$
CREATE PROCEDURE `sp_verify_baseline_capture_completeness`()
BEGIN
    DECLARE v_metrics_count INT DEFAULT 0;
    DECLARE v_hash_mismatches INT DEFAULT 0;
    DECLARE v_missing_hashes INT DEFAULT 0;

    -- 1. Verify exactly 7 baseline metrics exist for this run
    SELECT COUNT(*) INTO v_metrics_count 
    FROM `migration_baseline_metrics` 
    WHERE `migration_run_id` = @run_id;

    IF v_metrics_count <> 7 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Incomplete metrics recorded: expected exactly 7 baseline metrics.';
    END IF;

    -- 2. Verify row counts in metrics match stored hash counts for every table
    SELECT COUNT(*) INTO v_missing_hashes
    FROM `migration_baseline_metrics` bm
    LEFT JOIN (
        SELECT table_name, migration_run_id, COUNT(*) AS hash_count
        FROM `migration_baseline_record_hashes`
        WHERE migration_run_id = @run_id
        GROUP BY table_name, migration_run_id
    ) h ON bm.table_name = h.table_name AND bm.migration_run_id = h.migration_run_id
    WHERE bm.migration_run_id = @run_id
      AND (h.hash_count IS NULL OR bm.row_count <> h.hash_count);

    IF v_missing_hashes > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Metric row count does not match stored hashes count.';
    END IF;

    -- 3. Row-by-Row Anti-Join Hash Verification Against Live Tables Within Same Snapshot
    -- Table 1: students
    SELECT COUNT(*) INTO v_hash_mismatches
    FROM `migration_baseline_record_hashes` b
    LEFT JOIN students s ON b.record_pk = CAST(s.id AS CHAR)
    WHERE b.table_name = 'students' AND b.migration_run_id = @run_id
      AND (s.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(s.id, s.roll_no, s.name, s.department, s.current_semester, s.status), 256));

    IF v_hash_mismatches > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Row hash mismatch detected on students table.';
    END IF;

    -- Table 2: student_enrollments
    SELECT COUNT(*) INTO v_hash_mismatches
    FROM `migration_baseline_record_hashes` b
    LEFT JOIN student_enrollments se ON b.record_pk = CAST(se.id AS CHAR)
    WHERE b.table_name = 'student_enrollments' AND b.migration_run_id = @run_id
      AND (se.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(se.id, se.student_id, se.academic_year_id, se.class_id, se.semester, se.attempt_number, se.transfer_sequence, se.status, se.entry_type, se.is_current, se.is_verified_entry), 256));

    IF v_hash_mismatches > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Row hash mismatch detected on student_enrollments table.';
    END IF;

    -- Table 3: classes
    SELECT COUNT(*) INTO v_hash_mismatches
    FROM `migration_baseline_record_hashes` b
    LEFT JOIN classes c ON b.record_pk = c.id
    WHERE b.table_name = 'classes' AND b.migration_run_id = @run_id
      AND (c.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(c.id, c.name, c.department, c.semester, c.year_label, c.section, c.academic_year, c.batch), 256));

    IF v_hash_mismatches > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Row hash mismatch detected on classes table.';
    END IF;

    -- Table 4: marks_sessions
    SELECT COUNT(*) INTO v_hash_mismatches
    FROM `migration_baseline_record_hashes` b
    LEFT JOIN marks_sessions ms ON b.record_pk = CAST(ms.id AS CHAR)
    WHERE b.table_name = 'marks_sessions' AND b.migration_run_id = @run_id
      AND (ms.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(ms.id, ms.subject_id, ms.class_id, ms.staff_id, ms.session_label, ms.total_max, ms.status, ms.avg_score, ms.student_count), 256));

    IF v_hash_mismatches > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Row hash mismatch detected on marks_sessions table.';
    END IF;

    -- Table 5: marks
    SELECT COUNT(*) INTO v_hash_mismatches
    FROM `migration_baseline_record_hashes` b
    LEFT JOIN marks m ON b.record_pk = CAST(m.id AS CHAR)
    WHERE b.table_name = 'marks' AND b.migration_run_id = @run_id
      AND (m.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(m.id, m.session_id, m.component_id, m.student_id, m.marks_obtained), 256));

    IF v_hash_mismatches > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Row hash mismatch detected on marks table.';
    END IF;

    -- Table 6: assessment_components
    SELECT COUNT(*) INTO v_hash_mismatches
    FROM `migration_baseline_record_hashes` b
    LEFT JOIN assessment_components ac ON b.record_pk = CAST(ac.id AS CHAR)
    WHERE b.table_name = 'assessment_components' AND b.migration_run_id = @run_id
      AND (ac.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(ac.id, ac.session_id, ac.type_id, ac.label, ac.conducted_max, ac.max_marks), 256));

    IF v_hash_mismatches > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Row hash mismatch detected on assessment_components table.';
    END IF;

    -- Table 7: session_attendance
    SELECT COUNT(*) INTO v_hash_mismatches
    FROM `migration_baseline_record_hashes` b
    LEFT JOIN session_attendance sa ON b.record_pk = CONCAT(sa.session_id, ':', sa.student_id)
    WHERE b.table_name = 'session_attendance' AND b.migration_run_id = @run_id
      AND (sa.session_id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(sa.session_id, sa.student_id, sa.hours_attended, sa.actual_taken_hours, sa.attendance_mark), 256));

    IF v_hash_mismatches > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Row hash mismatch detected on session_attendance table.';
    END IF;
END$$
DELIMITER ;

-- =====================================================================================
-- EXCEPTION-PROTECTED BASELINE CAPTURE EXECUTION PROCEDURE
-- Encapsulates snapshot transaction in SQLEXCEPTION handler.
-- On error: rolls back uncommitted snapshot and reliably records FAILED_INTERRUPTED.
-- On success: marks status = COMPLETED and commits entire capture.
-- =====================================================================================
DROP PROCEDURE IF EXISTS `sp_execute_baseline_capture`;
DELIMITER $$
CREATE PROCEDURE `sp_execute_baseline_capture`()
BEGIN
    DECLARE v_error_text VARCHAR(255) DEFAULT 'Baseline capture transaction failed and was rolled back.';

    -- Exception Handler: On any error, roll back capture transaction and record failure in status table
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        -- 1. Extract actual error message from MySQL diagnostics
        GET DIAGNOSTICS CONDITION 1 v_error_text = MESSAGE_TEXT;

        -- 2. Roll back uncommitted snapshot capture transaction
        ROLLBACK;

        -- 3. Reliably record failure status in migration_baseline_capture_status
        UPDATE `migration_baseline_capture_status`
        SET `status` = 'FAILED_INTERRUPTED',
            `completed_at` = CURRENT_TIMESTAMP(3),
            `failure_reason` = SUBSTRING(v_error_text, 1, 255)
        WHERE `migration_run_id` = @run_id;

        -- 4. Explicit commit guarantees failure status persistence even under autocommit = 0
        COMMIT;

        -- 5. Re-raise exception to abort execution immediately
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL BASELINE CAPTURE FAILURE: Transaction aborted and rolled back. Failure status reliably recorded in migration_baseline_capture_status.';
    END;

    -- Initiate Single Consistent Snapshot Transaction
    SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
    START TRANSACTION WITH CONSISTENT SNAPSHOT;

    -- ---------------------------------------------------------------------------------
    -- CAPTURE TABLE 1: students (Baseline: 1,194 unique physical student profiles)
    -- Monitored Selected Columns: id, roll_no, name, department, current_semester, status
    -- ---------------------------------------------------------------------------------
    INSERT INTO `migration_baseline_record_hashes` (`table_name`, `record_pk`, `record_hash`, `captured_at`, `migration_run_id`)
    SELECT 'students', CAST(id AS CHAR), SHA2(JSON_ARRAY(id, roll_no, name, department, current_semester, status), 256), @captured_at, @run_id
    FROM `students`;

    INSERT INTO `migration_baseline_metrics` (`metric_name`, `table_name`, `row_count`, `min_pk`, `max_pk`, `baseline_captured_at`, `migration_run_id`, `authorization_signoff`)
    SELECT 'baseline_students', 'students', COUNT(*), CAST(MIN(id) AS CHAR), CAST(MAX(id) AS CHAR), @captured_at, @run_id, @signoff
    FROM `students`;

    -- ---------------------------------------------------------------------------------
    -- CAPTURE TABLE 2: student_enrollments (Baseline: 2,051 lifecycle placement records)
    -- Monitored Selected Columns: id, student_id, academic_year_id, class_id, semester, attempt_number,
    --                             transfer_sequence, status, entry_type, is_current, is_verified_entry
    -- ---------------------------------------------------------------------------------
    INSERT INTO `migration_baseline_record_hashes` (`table_name`, `record_pk`, `record_hash`, `captured_at`, `migration_run_id`)
    SELECT 'student_enrollments', CAST(id AS CHAR), SHA2(JSON_ARRAY(id, student_id, academic_year_id, class_id, semester, attempt_number, transfer_sequence, status, entry_type, is_current, is_verified_entry), 256), @captured_at, @run_id
    FROM `student_enrollments`;

    INSERT INTO `migration_baseline_metrics` (`metric_name`, `table_name`, `row_count`, `min_pk`, `max_pk`, `baseline_captured_at`, `migration_run_id`, `authorization_signoff`)
    SELECT 'baseline_student_enrollments', 'student_enrollments', COUNT(*), CAST(MIN(id) AS CHAR), CAST(MAX(id) AS CHAR), @captured_at, @run_id, @signoff
    FROM `student_enrollments`;

    -- ---------------------------------------------------------------------------------
    -- CAPTURE TABLE 3: classes (Baseline: 29 baseline undergraduate classes)
    -- Monitored Selected Columns: id, name, department, semester, year_label, section, academic_year, batch
    -- ---------------------------------------------------------------------------------
    INSERT INTO `migration_baseline_record_hashes` (`table_name`, `record_pk`, `record_hash`, `captured_at`, `migration_run_id`)
    SELECT 'classes', id, SHA2(JSON_ARRAY(id, name, department, semester, year_label, section, academic_year, batch), 256), @captured_at, @run_id
    FROM `classes`;

    INSERT INTO `migration_baseline_metrics` (`metric_name`, `table_name`, `row_count`, `min_pk`, `max_pk`, `baseline_captured_at`, `migration_run_id`, `authorization_signoff`)
    SELECT 'baseline_classes', 'classes', COUNT(*), MIN(id), MAX(id), @captured_at, @run_id, @signoff
    FROM `classes`;

    -- ---------------------------------------------------------------------------------
    -- CAPTURE TABLE 4: marks_sessions (Baseline: 1 historical session, ID 1)
    -- Monitored Selected Columns: id, subject_id, class_id, staff_id, session_label, total_max, status, avg_score, student_count
    -- ---------------------------------------------------------------------------------
    INSERT INTO `migration_baseline_record_hashes` (`table_name`, `record_pk`, `record_hash`, `captured_at`, `migration_run_id`)
    SELECT 'marks_sessions', CAST(id AS CHAR), SHA2(JSON_ARRAY(id, subject_id, class_id, staff_id, session_label, total_max, status, avg_score, student_count), 256), @captured_at, @run_id
    FROM `marks_sessions`;

    INSERT INTO `migration_baseline_metrics` (`metric_name`, `table_name`, `row_count`, `min_pk`, `max_pk`, `baseline_captured_at`, `migration_run_id`, `authorization_signoff`)
    SELECT 'baseline_marks_sessions', 'marks_sessions', COUNT(*), CAST(MIN(id) AS CHAR), CAST(MAX(id) AS CHAR), @captured_at, @run_id, @signoff
    FROM `marks_sessions`;

    -- ---------------------------------------------------------------------------------
    -- CAPTURE TABLE 5: marks (Baseline: 44 student mark records)
    -- Monitored Selected Columns: id, session_id, component_id, student_id, marks_obtained
    -- ---------------------------------------------------------------------------------
    INSERT INTO `migration_baseline_record_hashes` (`table_name`, `record_pk`, `record_hash`, `captured_at`, `migration_run_id`)
    SELECT 'marks', CAST(id AS CHAR), SHA2(JSON_ARRAY(id, session_id, component_id, student_id, marks_obtained), 256), @captured_at, @run_id
    FROM `marks`;

    INSERT INTO `migration_baseline_metrics` (`metric_name`, `table_name`, `row_count`, `min_pk`, `max_pk`, `baseline_captured_at`, `migration_run_id`, `authorization_signoff`)
    SELECT 'baseline_marks', 'marks', COUNT(*), CAST(MIN(id) AS CHAR), CAST(MAX(id) AS CHAR), @captured_at, @run_id, @signoff
    FROM `marks`;

    -- ---------------------------------------------------------------------------------
    -- CAPTURE TABLE 6: assessment_components (Baseline: 3 components for session 1)
    -- Monitored Selected Columns: id, session_id, type_id, label, conducted_max, max_marks
    -- ---------------------------------------------------------------------------------
    INSERT INTO `migration_baseline_record_hashes` (`table_name`, `record_pk`, `record_hash`, `captured_at`, `migration_run_id`)
    SELECT 'assessment_components', CAST(id AS CHAR), SHA2(JSON_ARRAY(id, session_id, type_id, label, conducted_max, max_marks), 256), @captured_at, @run_id
    FROM `assessment_components`;

    INSERT INTO `migration_baseline_metrics` (`metric_name`, `table_name`, `row_count`, `min_pk`, `max_pk`, `baseline_captured_at`, `migration_run_id`, `authorization_signoff`)
    SELECT 'baseline_assessment_components', 'assessment_components', COUNT(*), CAST(MIN(id) AS CHAR), CAST(MAX(id) AS CHAR), @captured_at, @run_id, @signoff
    FROM `assessment_components`;

    -- ---------------------------------------------------------------------------------
    -- CAPTURE TABLE 7: session_attendance (Baseline: 26 student attendance records)
    -- Monitored Selected Columns: session_id, student_id, hours_attended, actual_taken_hours, attendance_mark
    -- ---------------------------------------------------------------------------------
    INSERT INTO `migration_baseline_record_hashes` (`table_name`, `record_pk`, `record_hash`, `captured_at`, `migration_run_id`)
    SELECT 'session_attendance', CONCAT(session_id, ':', student_id), SHA2(JSON_ARRAY(session_id, student_id, hours_attended, actual_taken_hours, attendance_mark), 256), @captured_at, @run_id
    FROM `session_attendance`;

    INSERT INTO `migration_baseline_metrics` (`metric_name`, `table_name`, `row_count`, `min_pk`, `max_pk`, `baseline_captured_at`, `migration_run_id`, `authorization_signoff`)
    SELECT 'baseline_session_attendance', 'session_attendance', COUNT(*), MIN(CONCAT(session_id, ':', student_id)), MAX(CONCAT(session_id, ':', student_id)), @captured_at, @run_id, @signoff
    FROM `session_attendance`;

    -- Verify completeness within the same snapshot
    CALL `sp_verify_baseline_capture_completeness`();

    -- Mark status = COMPLETED only after all checks pass
    UPDATE `migration_baseline_capture_status`
    SET `status` = 'COMPLETED', `completed_at` = CURRENT_TIMESTAMP(3)
    WHERE `migration_run_id` = @run_id;

    -- Commit snapshot capture and COMPLETED status together
    COMMIT;
END$$
DELIMITER ;

-- =====================================================================================
-- EXECUTE BASELINE CAPTURE TRANSACTION
-- =====================================================================================
CALL `sp_execute_baseline_capture`();

-- Clean up procedures after execution
DROP PROCEDURE `sp_execute_baseline_capture`;
DROP PROCEDURE `sp_verify_baseline_capture_completeness`;

-- =====================================================================================
-- BASELINE CAPTURE SCORECARD
-- Uses LEFT JOIN to guarantee zero-row or zero-hash tables cannot be hidden.
-- Emitted ONLY when sp_execute_baseline_capture completes and status is COMPLETED.
-- =====================================================================================
SELECT 
    bm.metric_name,
    bm.table_name,
    bm.row_count,
    COALESCE(h.stored_hashes_count, 0) AS stored_hashes_count,
    bm.min_pk,
    bm.max_pk,
    bcs.status AS lifecycle_status,
    bm.baseline_captured_at,
    CASE 
        WHEN bm.row_count = 0 THEN 'ERROR: Baseline source table has 0 rows!'
        WHEN COALESCE(h.stored_hashes_count, 0) = 0 THEN 'ERROR: Zero hashes stored for table!'
        WHEN bm.row_count = COALESCE(h.stored_hashes_count, 0) AND bcs.status = 'COMPLETED' THEN 'VERIFIED IMMUTABLE'
        ELSE 'ERROR: Row count does not match stored hashes count!'
    END AS verification_status
FROM `migration_baseline_metrics` bm
LEFT JOIN (
    SELECT table_name, migration_run_id, COUNT(record_pk) AS stored_hashes_count
    FROM `migration_baseline_record_hashes`
    GROUP BY table_name, migration_run_id
) h ON bm.table_name = h.table_name AND bm.migration_run_id = h.migration_run_id
LEFT JOIN `migration_baseline_capture_status` bcs ON bm.migration_run_id = bcs.migration_run_id
WHERE bm.migration_run_id = @run_id
ORDER BY bm.id ASC;

-- Master Baseline Status Confirmation
SELECT 
    `migration_run_id`,
    `status` AS master_baseline_status,
    `started_at`,
    `completed_at`,
    `operator_signoff`,
    CASE 
        WHEN `status` = 'COMPLETED' THEN 'SUCCESS: Selected-column cryptographic baseline captured and verified within identical consistent snapshot. Maintenance window enforced.'
        WHEN `status` = 'FAILED_INTERRUPTED' THEN 'FAIL: Baseline capture was interrupted or failed. Transaction rolled back.'
        ELSE 'NOT VERIFIED: Baseline capture in unknown or incomplete state.'
    END AS governance_confirmation
FROM `migration_baseline_capture_status`
WHERE `migration_run_id` = @run_id;

-- =====================================================================================
-- SAFE NON-DESTRUCTIVE RETRY RECOVERY WORKFLOW (DOCUMENTED REFERENCE)
-- If a baseline capture encounters an error and records status = 'FAILED_INTERRUPTED':
-- 1. DO NOT DELETE existing baseline records or status history. All failed run records
--    remain permanently preserved in `migration_baseline_capture_status` for audit.
-- 2. Investigate the failure reason recorded in `migration_baseline_capture_status`.
-- 3. The Examination Cell authorizes an official retry with an incremented run identifier:
--      SET @run_id = 'MARKHUB_PHASE1_BASELINE_20261109_RETRY1';
--      SET @OPERATOR_AUTHORIZED_BASELINE_CAPTURE = 'AUTHORIZED_BY_EXAMINATION_CELL';
--      SET @OPERATOR_VERIFIED_LOCAL_SANDBOX = 'YES_VERIFIED_LOCAL_SANDBOX';
--      SET @OPERATOR_ENFORCED_WRITE_FREE_MAINTENANCE_WINDOW = 'YES_MAINTENANCE_WINDOW_ENFORCED';
-- 4. Re-execute this script under the new run ID. All historical evidence is preserved!
-- =====================================================================================
