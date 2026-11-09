-- =====================================================================================
-- MARKHUB PHASE 1: PRE-FLIGHT READINESS DIAGNOSTICS (V5.7 TARGETED DEFECT CORRECTIONS)
-- Target Schema: college_cms_verify
-- Execution Mode: PURE READ-ONLY DIAGNOSTIC INSPECTION (SELECT STATEMENTS ONLY)
-- Strict Safety Governance: 
--   1. ZERO DDL (NO CREATE, NO DROP, NO ALTER)
--   2. ZERO DML (NO INSERT, NO UPDATE, NO DELETE, NO TRUNCATE)
--   3. ZERO STORED PROCEDURES / FUNCTIONS
--   4. PHYSICAL SERVER SAFETY: Explicit human out-of-band endpoint verification required
--   5. OPERATIONALLY ENFORCEABLE MAINTENANCE WINDOW: Inspects PROCESSLIST (active & idle pools) & innodb_trx
--   6. INDIVIDUAL 29 CLASS IDs: All 29 expected baseline classes verified individually
--   7. EXACT CYCLES: Exactly one ODD_INTERNAL_1 and exactly one ODD_INTERNAL_2 for AY 2026-2027
--   8. DEPARTMENT VALIDATION: Verifies all 7 required departments exist exactly once (no duplicates)
--   9. SESSION IDENTITY CLEAN STATE: Confirms zero duplicate identities before migration
-- Author: Google Antigravity Advanced Agentic Pair Programming
-- Date: 2026-11-09
-- =====================================================================================

-- =====================================================================================
-- DIAGNOSTIC 0A: PHYSICAL SERVER SAFETY & CLIENT CONNECTION AUDIT
-- =====================================================================================
-- TECHNICAL GOVERNANCE NOTICE ON PHYSICAL SERVER IDENTITY & MAINTENANCE ISOLATION:
-- 1. Database name (`DATABASE()`) and TCP port (`@@port`) checks ALONE DO NOT prove physical server identity.
--    A cloud production server or remote VPS could host a schema named `college_cms_verify`
--    and listen on port 3306 or 3307.
-- 2. An SQL-only query inspecting `@@hostname` reads only what the connected MySQL daemon reports;
--    it DOES NOT prove that the client's TCP socket is connected to `localhost` or `127.0.0.1`.
-- 3. HUMAN VERIFICATION REQUIREMENT (MANDATORY OUT-OF-BAND AUDIT):
--    Prior to accepting these pre-flight diagnostics, the operator MUST independently verify
--    in the local shell / client session (e.g., MySQL CLI / Workbench connection properties)
--    that the active host endpoint is strictly `127.0.0.1`, `localhost`, or a verified local UNIX/named pipe socket.
-- 4. OPERATIONALLY ENFORCEABLE WRITE-FREE MAINTENANCE WINDOW & LIMITATIONS:
--    `information_schema.PROCESSLIST` is a point-in-time check and CANNOT block incoming TCP connections
--    (subject to TOCTOU race conditions). True isolation MUST be operationally guaranteed:
--    - Phase A: Stop application traffic and background worker pools (`pm2 stop college-cms-backend`).
--    - Phase B: Programmatically verify zero concurrent client threads (active or idle) on college_cms_verify
--               or unassigned sessions (`DB IS NULL`) in PROCESSLIST.
--    - Phase C: Programmatically verify zero active uncommitted background transactions in innodb_trx.
-- 5. STOP CONDITION:
--    If the operator cannot independently verify that the physical connection is strictly local,
--    or if `DATABASE()` is not `college_cms_verify`, or if `DATABASE()` = 'college_cms',
--    OPERATOR MUST TERMINATE EXECUTION IMMEDIATELY. DO NOT PROCEED TO BASELINE CAPTURE.
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

-- -------------------------------------------------------------------------------------
-- DIAGNOSTIC 0B: Operational Maintenance Window Client Connection Audit
-- Asserts that NO other application client threads or pool connections (active or idle)
-- are connected to college_cms_verify or unassigned sessions (DB IS NULL)
-- -------------------------------------------------------------------------------------
SELECT 
    'CHECK 0B: Maintenance Window Client Connection Audit' AS check_name,
    COUNT(CASE WHEN COMMAND NOT IN ('Sleep', 'Binlog Dump') THEN 1 END) AS active_client_count,
    COUNT(CASE WHEN COMMAND = 'Sleep' THEN 1 END) AS idle_client_count,
    '0 active and 0 idle client threads on college_cms_verify or unassigned sessions' AS expected_value,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS: Zero concurrent client threads on college_cms_verify or unassigned sessions'
        WHEN COUNT(CASE WHEN COMMAND NOT IN ('Sleep', 'Binlog Dump') THEN 1 END) > 0 
            THEN 'FAIL: Active concurrent client queries detected! Halt application backend/pools immediately.'
        ELSE 'FAIL: Idle client connections detected (potential application pool or external client). Stop application backend before baseline/migration.'
    END AS status
FROM information_schema.PROCESSLIST
WHERE (DB = 'college_cms_verify' OR DB IS NULL)
  AND ID <> CONNECTION_ID()
  AND COMMAND <> 'Binlog Dump';

-- -------------------------------------------------------------------------------------
-- DIAGNOSTIC 0C: Active Background Transactions Audit
-- Asserts that zero uncommitted background transactions exist on the MySQL engine
-- -------------------------------------------------------------------------------------
SELECT 
    'CHECK 0C: Active Background Transactions Audit' AS check_name,
    COUNT(*) AS active_trx_count,
    '0 uncommitted background transactions' AS expected_value,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS: Zero active background transactions'
        ELSE 'FAIL: Active background transactions detected! Await commit/rollback before proceeding.'
    END AS status
FROM information_schema.innodb_trx;

-- -------------------------------------------------------------------------------------
-- CHECK 1: Database Engine Version & Feature Compatibility
-- -------------------------------------------------------------------------------------
SELECT 
    'CHECK 1: Database Engine Version' AS check_name,
    VERSION() AS current_value,
    'MySQL 8.0.0 or higher' AS expected_value,
    CASE 
        WHEN SUBSTRING_INDEX(VERSION(), '.', 1) >= 8 THEN 'PASS'
        ELSE 'FAIL: MySQL 8.0+ required for stored generated columns, JSON_ARRAY functions, and atomic DDL'
    END AS status;

-- -------------------------------------------------------------------------------------
-- CHECK 2: Baseline Table Inventory Check (Exact Inventory of 21 Core Tables)
-- -------------------------------------------------------------------------------------
SELECT 
    'CHECK 2: Baseline Table Inventory' AS check_name,
    COUNT(*) AS current_value,
    '21 core tables present' AS expected_value,
    CASE 
        WHEN COUNT(*) = 21 THEN 'PASS'
        ELSE 'FAIL: Missing core tables in college_cms_verify schema'
    END AS status
FROM information_schema.tables 
WHERE table_schema = 'college_cms_verify'
  AND table_name IN (
    'academic_years', 'assessment_components', 'assessment_cycles', 'class_analysis_remarks',
    'classes', 'departments', 'mark_unlock_requests', 'marks', 'marks_audit_logs',
    'marks_history', 'marks_sessions', 'notifications', 'session_attendance', 'staffs',
    'student_enrollment_events', 'student_enrollments', 'student_quarantine_records',
    'students', 'subjects', 'system_error_logs', 'system_settings'
  );

-- Detailed Table Inventory Breakdown (Reports any missing table individually)
SELECT 
    t.expected_table,
    CASE 
        WHEN ist.table_name IS NOT NULL THEN 'PRESENT'
        ELSE 'MISSING: Required baseline table not found!'
    END AS presence_status
FROM (
    SELECT 'academic_years' AS expected_table UNION ALL
    SELECT 'assessment_components' UNION ALL
    SELECT 'assessment_cycles' UNION ALL
    SELECT 'class_analysis_remarks' UNION ALL
    SELECT 'classes' UNION ALL
    SELECT 'departments' UNION ALL
    SELECT 'mark_unlock_requests' UNION ALL
    SELECT 'marks' UNION ALL
    SELECT 'marks_audit_logs' UNION ALL
    SELECT 'marks_history' UNION ALL
    SELECT 'marks_sessions' UNION ALL
    SELECT 'notifications' UNION ALL
    SELECT 'session_attendance' UNION ALL
    SELECT 'staffs' UNION ALL
    SELECT 'student_enrollment_events' UNION ALL
    SELECT 'student_enrollments' UNION ALL
    SELECT 'student_quarantine_records' UNION ALL
    SELECT 'students' UNION ALL
    SELECT 'subjects' UNION ALL
    SELECT 'system_error_logs' UNION ALL
    SELECT 'system_settings'
) t
LEFT JOIN information_schema.tables ist 
  ON ist.table_schema = 'college_cms_verify' AND ist.table_name = t.expected_table
ORDER BY presence_status DESC, t.expected_table ASC;

-- -------------------------------------------------------------------------------------
-- CHECK 3: Pre-Migration Column Cleanliness (Confirms Phase 1 Target Columns Do NOT Exist)
-- -------------------------------------------------------------------------------------
SELECT 
    'CHECK 3: Pre-Migration Column Cleanliness' AS check_name,
    COUNT(*) AS current_value,
    '0 pre-existing target columns' AS expected_value,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS'
        ELSE 'FAIL: Schema already contains Phase 1 migration columns. Investigate before proceeding.'
    END AS status
FROM information_schema.columns 
WHERE table_schema = 'college_cms_verify' 
  AND (
    (table_name = 'classes' AND column_name IN ('program_type', 'regulation_code', 'program_code')) OR
    (table_name = 'marks_sessions' AND column_name IN ('academic_year_id', 'assessment_cycle_id', 'is_archived', 'session_identity_guard')) OR
    (table_name = 'marks' AND column_name IN ('is_cleared', 'cleared_at', 'cleared_by', 'clear_reason')) OR
    (table_name = 'assessment_components' AND column_name IN ('is_active', 'archived_at', 'archived_by', 'archive_reason')) OR
    (table_name = 'student_enrollments' AND column_name IN ('is_marks_eligible', 'is_promotion_eligible'))
  );

-- -------------------------------------------------------------------------------------
-- CHECK 4A: Active Academic Year Dynamic Resolution (No Hard-Coded ID Assumptions)
-- Resolves academic year dynamically using code '2026-2027' and is_current = 1
-- -------------------------------------------------------------------------------------
SELECT 
    'CHECK 4A: Active Academic Year Resolution' AS check_name,
    id AS resolved_academic_year_id,
    code AS academic_year_code,
    is_current,
    CASE 
        WHEN code = '2026-2027' AND is_current = 1 THEN 'PASS'
        ELSE 'FAIL: Academic Year 2026-2027 is missing or not marked is_current = 1'
    END AS status
FROM academic_years 
WHERE code = '2026-2027';

-- -------------------------------------------------------------------------------------
-- CHECK 4B: Exact Assessment Cycles Verification (AY 2026–2027)
-- Explicit Requirement: Exactly ONE ODD_INTERNAL_1 and exactly ONE ODD_INTERNAL_2
-- -------------------------------------------------------------------------------------
SELECT 
    'CHECK 4B: Assessment Cycles Verification (AY 2026-2027)' AS check_name,
    c.expected_cycle_type,
    COUNT(ac.id) AS actual_cycle_count,
    'Exactly 1 cycle configured' AS expected_value,
    CASE 
        WHEN COUNT(ac.id) = 1 THEN 'PASS: Exactly one cycle configured'
        WHEN COUNT(ac.id) = 0 THEN 'FAIL: Required assessment cycle missing for AY 2026-2027!'
        ELSE 'FAIL: Duplicate assessment cycle entries detected for AY 2026-2027!'
    END AS status
FROM (
    SELECT 'ODD_INTERNAL_1' AS expected_cycle_type UNION ALL
    SELECT 'ODD_INTERNAL_2'
) c
LEFT JOIN academic_years ay ON ay.code = '2026-2027' AND ay.is_current = 1
LEFT JOIN assessment_cycles ac 
  ON ac.academic_year_id = ay.id AND ac.cycle_type = c.expected_cycle_type
GROUP BY c.expected_cycle_type;

-- -------------------------------------------------------------------------------------
-- CHECK 5: Academic Programmes Clean State (Must NOT pre-exist prior to migration)
-- An existing academic_programmes table indicates an uncleaned or already-migrated state!
-- -------------------------------------------------------------------------------------
SELECT 
    'CHECK 5: Academic Programmes Clean Pre-Migration State' AS check_name,
    COUNT(*) AS table_count,
    '0 (Table must not pre-exist)' AS expected_value,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS: Table academic_programmes does not pre-exist (clean pre-migration state)'
        ELSE 'FAIL: Table academic_programmes already exists in schema! Prior migration or uncleaned objects detected.'
    END AS status
FROM information_schema.tables 
WHERE table_schema = 'college_cms_verify' 
  AND table_name = 'academic_programmes';

-- -------------------------------------------------------------------------------------
-- CHECK 6: Confirmed 4 Active M.E. Class IDs Pre-Insertion Collision Check
-- Target: ME_CSE_I, ME_EST_I, ME_SE_III, ME_MFE_III
-- -------------------------------------------------------------------------------------
SELECT 
    'CHECK 6: M.E. Class ID Collision Check (4 Active Classes)' AS check_name,
    COUNT(*) AS colliding_classes_count,
    '0 colliding class IDs' AS expected_value,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS'
        ELSE 'FAIL: One or more proposed M.E. class IDs already exist in classes table!'
    END AS status
FROM classes
WHERE id IN ('ME_CSE_I', 'ME_EST_I', 'ME_SE_III', 'ME_MFE_III');

-- -------------------------------------------------------------------------------------
-- CHECK 7: Academic Departments Exact 1-to-1 Mapping & Duplicate Validation
-- Validates that each of the 7 required departments exists EXACTLY ONCE with no duplicates.
-- Required codes: AIDS, CIVIL, CSE, ECE, EEE, IT, MECH
-- -------------------------------------------------------------------------------------
SELECT 
    'CHECK 7: Required Academic Departments (Exact 1-to-1 Mapping)' AS check_name,
    req.expected_code,
    d.id AS actual_department_id,
    d.name AS actual_department_name,
    COUNT(d.id) AS occurrence_count,
    CASE 
        WHEN COUNT(d.id) = 1 THEN 'PASS: Unique department verified'
        WHEN COUNT(d.id) = 0 THEN 'FAIL: Required department missing from departments table!'
        ELSE 'FAIL: Duplicate department entries detected in departments table!'
    END AS status
FROM (
    SELECT 'AIDS' AS expected_code UNION ALL
    SELECT 'CIVIL' UNION ALL
    SELECT 'CSE' UNION ALL
    SELECT 'ECE' UNION ALL
    SELECT 'EEE' UNION ALL
    SELECT 'IT' UNION ALL
    SELECT 'MECH'
) req
LEFT JOIN departments d ON d.short_name = req.expected_code
GROUP BY req.expected_code, d.id, d.name
ORDER BY req.expected_code ASC;

-- -------------------------------------------------------------------------------------
-- CHECK 8A: INDIVIDUAL VERIFICATION OF ALL 29 EXPECTED BASELINE CLASS IDs
-- Verifies every single expected class ID individually against classes table.
-- Codebase ground truth (server/seed_all_first_year.js:66-67 & database/full_deployment_seed.sql):
-- - Year I (8 classes): C_SH_AIDS_1, C_SH_CIVIL_1, C_SH_CSE_A_1, C_SH_CSE_B_1, C_SH_ECE_1, C_SH_EEE_1, C_SH_IT_1, C_SH_MECH_1
-- - Year II (7 classes): CL001, CL002, CL003, CL004, CL005, CL006, CL007
-- - Year III (7 classes): CL_AIDS_III, CL_CIVIL_III, CL_CSE_III, CL_ECE_III, CL_EEE_III, CL_IT_III, CL_MECH_III
-- - Year IV (7 classes): CL_AIDS_IV, CL_CIVIL_IV, CL_CSE_IV, CL_ECE_IV, CL_EEE_IV, CL_IT_IV, CL_MECH_IV
-- Total = 8 + 7 + 7 + 7 = EXACTLY 29 CLASSES.
-- -------------------------------------------------------------------------------------
SELECT 
    'CHECK 8A: Individual 29 Baseline Class IDs Verification' AS check_name,
    exp.id AS expected_class_id,
    exp.year_level,
    c.id AS actual_class_id,
    c.name AS actual_class_name,
    c.department,
    c.semester,
    c.section,
    CASE 
        WHEN c.id IS NOT NULL THEN 'PASS: Verified class exists'
        ELSE 'FAIL: Expected baseline class ID MISSING from database!'
    END AS status
FROM (
    SELECT 'C_SH_AIDS_1' AS id, 'I' AS year_level UNION ALL
    SELECT 'C_SH_CIVIL_1', 'I' UNION ALL
    SELECT 'C_SH_CSE_A_1', 'I' UNION ALL
    SELECT 'C_SH_CSE_B_1', 'I' UNION ALL
    SELECT 'C_SH_ECE_1', 'I' UNION ALL
    SELECT 'C_SH_EEE_1', 'I' UNION ALL
    SELECT 'C_SH_IT_1', 'I' UNION ALL
    SELECT 'C_SH_MECH_1', 'I' UNION ALL
    SELECT 'CL001', 'II' UNION ALL
    SELECT 'CL002', 'II' UNION ALL
    SELECT 'CL003', 'II' UNION ALL
    SELECT 'CL004', 'II' UNION ALL
    SELECT 'CL005', 'II' UNION ALL
    SELECT 'CL006', 'II' UNION ALL
    SELECT 'CL007', 'II' UNION ALL
    SELECT 'CL_AIDS_III', 'III' UNION ALL
    SELECT 'CL_CIVIL_III', 'III' UNION ALL
    SELECT 'CL_CSE_III', 'III' UNION ALL
    SELECT 'CL_ECE_III', 'III' UNION ALL
    SELECT 'CL_EEE_III', 'III' UNION ALL
    SELECT 'CL_IT_III', 'III' UNION ALL
    SELECT 'CL_MECH_III', 'III' UNION ALL
    SELECT 'CL_AIDS_IV', 'IV' UNION ALL
    SELECT 'CL_CIVIL_IV', 'IV' UNION ALL
    SELECT 'CL_CSE_IV', 'IV' UNION ALL
    SELECT 'CL_ECE_IV', 'IV' UNION ALL
    SELECT 'CL_EEE_IV', 'IV' UNION ALL
    SELECT 'CL_IT_IV', 'IV' UNION ALL
    SELECT 'CL_MECH_IV', 'IV'
) exp
LEFT JOIN classes c ON c.id = exp.id
ORDER BY FIELD(exp.year_level, 'I', 'II', 'III', 'IV'), exp.id ASC;

-- -------------------------------------------------------------------------------------
-- CHECK 8B: COMPLETE EXPECTED 29-CLASS INVENTORY AUDIT & DISCREPANCY RESOLUTION
-- Asserts that:
-- 1. All 29 expected class IDs match existing classes (matched = 29)
-- 2. No missing classes exist (missing = 0)
-- 3. No extra or unexpected classes exist (extra = 0)
-- -------------------------------------------------------------------------------------
SELECT 
    'CHECK 8B: Baseline Classes Inventory Summary & Anti-Join' AS check_name,
    (SELECT COUNT(*) FROM classes) AS total_classes_in_db,
    COUNT(c.id) AS matched_expected_classes,
    (29 - COUNT(c.id)) AS missing_classes_count,
    ((SELECT COUNT(*) FROM classes) - COUNT(c.id)) AS unexpected_extra_classes,
    '29 classes (8 Year I, 7 Year II, 7 Year III, 7 Year IV)' AS expected_inventory,
    CASE 
        WHEN (SELECT COUNT(*) FROM classes) = 29 AND COUNT(c.id) = 29 THEN 'PASS'
        WHEN COUNT(c.id) < 29 THEN 'FAIL: One or more expected baseline classes are missing'
        ELSE 'FAIL: Extra or unexpected classes detected in classes table'
    END AS status
FROM (
    SELECT 'C_SH_AIDS_1' AS id UNION ALL
    SELECT 'C_SH_CIVIL_1' UNION ALL
    SELECT 'C_SH_CSE_A_1' UNION ALL
    SELECT 'C_SH_CSE_B_1' UNION ALL
    SELECT 'C_SH_ECE_1' UNION ALL
    SELECT 'C_SH_EEE_1' UNION ALL
    SELECT 'C_SH_IT_1' UNION ALL
    SELECT 'C_SH_MECH_1' UNION ALL
    SELECT 'CL001' UNION ALL
    SELECT 'CL002' UNION ALL
    SELECT 'CL003' UNION ALL
    SELECT 'CL004' UNION ALL
    SELECT 'CL005' UNION ALL
    SELECT 'CL006' UNION ALL
    SELECT 'CL007' UNION ALL
    SELECT 'CL_AIDS_III' UNION ALL
    SELECT 'CL_CIVIL_III' UNION ALL
    SELECT 'CL_CSE_III' UNION ALL
    SELECT 'CL_ECE_III' UNION ALL
    SELECT 'CL_EEE_III' UNION ALL
    SELECT 'CL_IT_III' UNION ALL
    SELECT 'CL_MECH_III' UNION ALL
    SELECT 'CL_AIDS_IV' UNION ALL
    SELECT 'CL_CIVIL_IV' UNION ALL
    SELECT 'CL_CSE_IV' UNION ALL
    SELECT 'CL_ECE_IV' UNION ALL
    SELECT 'CL_EEE_IV' UNION ALL
    SELECT 'CL_IT_IV' UNION ALL
    SELECT 'CL_MECH_IV'
) exp
JOIN classes c ON c.id = exp.id;

-- Year-by-Year Cohort Inventory Breakdown
SELECT 
    year_label AS academic_year_level,
    COUNT(*) AS class_count,
    GROUP_CONCAT(id ORDER BY id SEPARATOR ', ') AS class_ids
FROM classes
GROUP BY year_label
ORDER BY FIELD(year_label, 'I', 'II', 'III', 'IV');

-- -------------------------------------------------------------------------------------
-- CHECK 9: Baseline Class Department Mapping & NULL Audit
-- Detects NULL department mappings and unexpected class inventory
-- -------------------------------------------------------------------------------------
SELECT 
    'CHECK 9: Baseline Class Department Integrity & NULL Audit' AS check_name,
    COUNT(*) AS problematic_classes_count,
    '0 classes with NULL or unrecognized department' AS expected_value,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS'
        ELSE 'FAIL: Classes exist with NULL or unrecognized department mapping'
    END AS status
FROM classes
WHERE department IS NULL 
   OR TRIM(department) = ''
   OR department NOT IN (
    'Information Technology',
    'Computer Science and Engineering',
    'Artificial Intelligence and Data Science',
    'Electronics and Communication Engineering',
    'Electrical and Electronics Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Science and Humanities'
);

-- -------------------------------------------------------------------------------------
-- CHECK 10: Session Identity Protection Pre-Migration Cleanliness
-- Asserts that existing marks_sessions records contain zero duplicate identities
-- -------------------------------------------------------------------------------------
SELECT 
    'CHECK 10: Session Identity Duplicate Pre-Migration Audit' AS check_name,
    COUNT(*) AS duplicate_identity_count,
    '0 duplicate session identities' AS expected_value,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS: No duplicate session identities in existing marks_sessions'
        ELSE 'FAIL: Duplicate session identities detected in existing marks_sessions! Cleanse before migration.'
    END AS status
FROM (
    SELECT class_id, subject_id, session_label, COUNT(*) AS cnt
    FROM marks_sessions
    GROUP BY class_id, subject_id, session_label
    HAVING COUNT(*) > 1
) dupes;

-- -------------------------------------------------------------------------------------
-- OVERALL DIAGNOSTIC READINESS SUMMARY
-- Aggregates all checks into a consolidated verdict.
-- Never reports GREEN if any check fails or is missing.
-- -------------------------------------------------------------------------------------
SELECT 
    'READ-ONLY DIAGNOSTIC VERDICT' AS audit_gate,
    CASE 
        -- 1. Database name and port context
        WHEN DATABASE() <> 'college_cms_verify' OR @@port NOT IN (3306, 3307)
            THEN 'RED: WRONG DATABASE OR PORT CONNECTION DETECTED. HALT IMMEDIATELY.'

        -- 2. Maintenance window client isolation (must be 0 active and 0 idle concurrent clients)
        WHEN (
            SELECT COUNT(*) FROM information_schema.PROCESSLIST 
            WHERE (DB = 'college_cms_verify' OR DB IS NULL) 
              AND ID <> CONNECTION_ID()
              AND COMMAND <> 'Binlog Dump'
        ) > 0
            THEN 'RED: CONCURRENT CLIENT THREADS (ACTIVE OR IDLE POOLS) DETECTED ON college_cms_verify OR UNASSIGNED SESSIONS. HALT APPLICATION SERVERS.'

        -- 3. Active background transactions (must be 0)
        WHEN (SELECT COUNT(*) FROM information_schema.innodb_trx) > 0
            THEN 'RED: ACTIVE BACKGROUND TRANSACTIONS DETECTED. AWAIT COMPLETION.'

        -- 4. Baseline table inventory (21 tables)
        WHEN (
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'college_cms_verify' 
              AND table_name IN (
                'academic_years', 'assessment_components', 'assessment_cycles', 'class_analysis_remarks',
                'classes', 'departments', 'mark_unlock_requests', 'marks', 'marks_audit_logs',
                'marks_history', 'marks_sessions', 'notifications', 'session_attendance', 'staffs',
                'student_enrollment_events', 'student_enrollments', 'student_quarantine_records',
                'students', 'subjects', 'system_error_logs', 'system_settings'
              )
        ) <> 21
            THEN 'RED: CORE TABLE INVENTORY INCOMPLETE. MISSING TABLES DETECTED.'

        -- 5. Clean pre-migration column state
        WHEN (
            SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_schema = 'college_cms_verify' 
              AND (
                (table_name = 'classes' AND column_name IN ('program_type', 'regulation_code', 'program_code')) OR
                (table_name = 'marks_sessions' AND column_name IN ('academic_year_id', 'assessment_cycle_id', 'is_archived', 'session_identity_guard')) OR
                (table_name = 'marks' AND column_name IN ('is_cleared', 'cleared_at', 'cleared_by', 'clear_reason')) OR
                (table_name = 'assessment_components' AND column_name IN ('is_active', 'archived_at', 'archived_by', 'archive_reason')) OR
                (table_name = 'student_enrollments' AND column_name IN ('is_marks_eligible', 'is_promotion_eligible'))
              )
        ) > 0
            THEN 'RED: PRE-EXISTING PHASE 1 TARGET COLUMNS DETECTED.'

        -- 6. Dynamic AY resolution (2026-2027 is_current = 1)
        WHEN (
            SELECT COUNT(*) FROM academic_years 
            WHERE code = '2026-2027' AND is_current = 1
        ) <> 1
            THEN 'RED: ACADEMIC YEAR 2026-2027 MISSING OR NOT CURRENT.'

        -- 7. Exact assessment cycles verification (exactly one ODD_INTERNAL_1 and exactly one ODD_INTERNAL_2 for AY 2026-2027)
        WHEN (
            SELECT COUNT(*) 
            FROM assessment_cycles ac
            JOIN academic_years ay ON ay.code = '2026-2027' AND ay.is_current = 1
            WHERE ac.academic_year_id = ay.id AND ac.cycle_type = 'ODD_INTERNAL_1'
        ) <> 1
          OR (
            SELECT COUNT(*) 
            FROM assessment_cycles ac
            JOIN academic_years ay ON ay.code = '2026-2027' AND ay.is_current = 1
            WHERE ac.academic_year_id = ay.id AND ac.cycle_type = 'ODD_INTERNAL_2'
        ) <> 1
            THEN 'RED: REQUIRED ASSESSMENT CYCLES (EXACTLY ONE ODD_INTERNAL_1 AND ONE ODD_INTERNAL_2) MISSING OR DUPLICATED.'

        -- 8. Academic programmes table pre-migration absence (must be 0)
        WHEN (
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'college_cms_verify' AND table_name = 'academic_programmes'
        ) > 0
            THEN 'RED: ACADEMIC_PROGRAMMES TABLE ALREADY PRE-EXISTS.'

        -- 9. Zero M.E. class ID collisions
        WHEN (
            SELECT COUNT(*) FROM classes 
            WHERE id IN ('ME_CSE_I', 'ME_EST_I', 'ME_SE_III', 'ME_MFE_III')
        ) > 0
            THEN 'RED: M.E. CLASS ID COLLISION DETECTED.'

        -- 10. Required departments verification (all 7 departments must exist exactly once)
        WHEN (
            SELECT COUNT(DISTINCT short_name) FROM departments 
            WHERE short_name IN ('AIDS', 'CIVIL', 'CSE', 'ECE', 'EEE', 'IT', 'MECH')
        ) <> 7
          OR (
            SELECT COUNT(*) FROM departments 
            WHERE short_name IN ('AIDS', 'CIVIL', 'CSE', 'ECE', 'EEE', 'IT', 'MECH')
        ) <> 7
            THEN 'RED: REQUIRED ACADEMIC DEPARTMENTS MISSING OR DUPLICATED.'

        -- 11. Baseline classes count and individual 29-class matching
        WHEN (SELECT COUNT(*) FROM classes) <> 29
          OR (
            SELECT COUNT(*)
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
            JOIN classes c ON c.id = exp.id
        ) <> 29
            THEN 'RED: BASELINE CLASSES INVENTORY MISMATCH (MUST BE EXACTLY THE 29 EXPECTED CLASS IDs).'

        -- 12. Department mapping and NULL audit (must be 0 problematic classes)
        WHEN (
            SELECT COUNT(*) FROM classes
            WHERE department IS NULL 
               OR TRIM(department) = ''
               OR department NOT IN (
                'Information Technology',
                'Computer Science and Engineering',
                'Artificial Intelligence and Data Science',
                'Electronics and Communication Engineering',
                'Electrical and Electronics Engineering',
                'Mechanical Engineering',
                'Civil Engineering',
                'Science and Humanities'
            )
        ) > 0
            THEN 'RED: BASELINE CLASSES WITH NULL OR UNRECOGNIZED DEPARTMENTS DETECTED.'

        -- 13. Pre-migration session identity cleanliness (must be 0 duplicate session identities)
        WHEN (
            SELECT COUNT(*) FROM (
                SELECT class_id, subject_id, session_label, COUNT(*) AS cnt
                FROM marks_sessions
                GROUP BY class_id, subject_id, session_label
                HAVING COUNT(*) > 1
            ) dupes
        ) > 0
            THEN 'RED: DUPLICATE SESSION IDENTITIES DETECTED IN marks_sessions.'

        -- ALL PASS
        ELSE 'GREEN: ALL MANDATORY DIAGNOSTIC CHECKS PASSED. OPERATOR MUST CONFIRM LOCAL HOST OUT-OF-BAND AND ENFORCE WRITE-FREE MAINTENANCE WINDOW BEFORE PROCEEDING TO BASELINE CAPTURE.'
    END AS diagnostic_readiness_verdict,
    NOW() AS evaluated_at;
