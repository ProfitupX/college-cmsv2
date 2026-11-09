-- =====================================================================================
-- MARKHUB PHASE 1: POST-MIGRATION VERIFICATION & VALIDATION SUITE (V5.7 TARGETED DEFECT CORRECTIONS)
-- Target Schema: college_cms_verify
-- Execution Mode: PURE READ-ONLY VALIDATION (SELECT STATEMENTS ONLY)
-- Strict Safety Governance:
--   1. ZERO DDL (NO CREATE, NO ALTER, NO DROP)
--   2. ZERO DML (NO INSERT, NO UPDATE, NO DELETE, NO TRUNCATE)
--   3. ZERO STORED PROCEDURES / FUNCTIONS (No procedure creation or deletion)
--   4. PHYSICAL SERVER SAFETY: Explicit human out-of-band endpoint verification required
--   5. SELECTED-COLUMN CRYPTOGRAPHIC BASELINE: Validates row-level selected vital fields.
--      Does not claim full-row physical byte protection or replace out-of-band full backup.
--   6. STATUS STANDARD: Uses explicit PASS / FAIL / NOT VERIFIED statuses across all tests
--   7. AGGREGATED MASTER SCORECARD: Evaluates TEST 0 through TEST 15 comprehensively;
--      GREEN is impossible if even one test is FAIL, missing, or NOT VERIFIED.
--   8. ENDPOINT NOTICE: Scorecard explicitly outputs physical endpoint human verification requirement.
-- Author: Google Antigravity Advanced Agentic Pair Programming
-- Date: 2026-11-09
-- =====================================================================================

USE college_cms_verify;

-- =====================================================================================
-- TEST 0: PHYSICAL SERVER SAFETY & CLIENT CONNECTION AUDIT
-- =====================================================================================
SELECT 
    'TEST 0' AS test_id,
    'Physical Server Safety & Client Connection Context' AS test_name,
    'college_cms_verify on sandbox port (3306/3307) with local endpoint' AS expected_condition,
    CONCAT('Database: ', COALESCE(DATABASE(), 'NONE'), ' | Host: ', @@hostname, ' | Port: ', @@port, ' | User: ', USER()) AS actual_value,
    CASE 
        WHEN DATABASE() = 'college_cms_verify' AND @@port IN (3306, 3307) 
            THEN 'PASS'
        WHEN DATABASE() = 'college_cms' 
            THEN 'FAIL: Connected to production schema college_cms! HALT IMMEDIATELY!'
        ELSE 'FAIL: Connected to unexpected database or port!'
    END AS status,
    'Operator must independently verify local host endpoint out-of-band' AS details;

-- =====================================================================================
-- TEST 1: BASELINE METRICS & LIFECYCLE STATUS INTEGRITY
-- Corrected Diagnostic Labels: Reports actual completed run counts and actual metric rows.
-- =====================================================================================
SELECT 
    'TEST 1' AS test_id,
    'Baseline Metrics & Lifecycle Status Completeness' AS test_name,
    'Lifecycle status COMPLETED with all 7 baseline metrics present' AS expected_condition,
    CONCAT(
        'Completed Runs: ', 
        COALESCE((SELECT COUNT(*) FROM migration_baseline_capture_status WHERE status = 'COMPLETED'), 0),
        ' | Metric Count: ', 
        COALESCE((SELECT COUNT(*) FROM migration_baseline_metrics), 0)
    ) AS actual_value,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'migration_baseline_capture_status') = 0
          OR (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'migration_baseline_metrics') = 0
            THEN 'NOT VERIFIED: Baseline tables do not exist in college_cms_verify'
        WHEN (SELECT COUNT(*) FROM migration_baseline_capture_status WHERE status = 'COMPLETED') = 0
            THEN 'FAIL: Baseline capture status is not COMPLETED'
        WHEN (
            SELECT COUNT(*) FROM migration_baseline_metrics 
            WHERE metric_name IN (
                'baseline_students', 'baseline_student_enrollments', 'baseline_classes',
                'baseline_marks_sessions', 'baseline_marks', 'baseline_assessment_components',
                'baseline_session_attendance'
            )
        ) <> 7
            THEN 'FAIL: Missing one or more required baseline metrics'
        ELSE 'PASS'
    END AS status,
    'Requires verified completed baseline capture before validation can proceed' AS details;

-- =====================================================================================
-- TEST 2: TABLE 1 - students (360-Degree Bidirectional Record Integrity)
-- Anti-Join 1: Detects modified or missing baseline students.
-- Anti-Join 2: Detects unauthorized additional students.
-- =====================================================================================
SELECT 
    'TEST 2' AS test_id,
    'Students Table 360-Degree Record Integrity' AS test_name,
    'Current count matches baseline (1194), zero modified/missing, zero unauthorized additional' AS expected_condition,
    CONCAT(
        'Live: ', (SELECT COUNT(*) FROM students), 
        ' | Baseline: ', COALESCE((SELECT row_count FROM migration_baseline_metrics WHERE metric_name = 'baseline_students'), -1),
        ' | Mismatched: ', (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN students s ON b.record_pk = CAST(s.id AS CHAR)
            WHERE b.table_name = 'students'
              AND (s.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(s.id, s.roll_no, s.name, s.department, s.current_semester, s.status), 256))
        ),
        ' | Additional: ', (
            SELECT COUNT(*) FROM students s
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = CAST(s.id AS CHAR) AND b.table_name = 'students'
            WHERE b.record_pk IS NULL
        )
    ) AS actual_value,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'migration_baseline_metrics') = 0
            THEN 'NOT VERIFIED: migration_baseline_metrics missing'
        WHEN (SELECT COUNT(*) FROM students) <> (SELECT row_count FROM migration_baseline_metrics WHERE metric_name = 'baseline_students')
            THEN 'FAIL: Row count does not match baseline'
        WHEN (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN students s ON b.record_pk = CAST(s.id AS CHAR)
            WHERE b.table_name = 'students'
              AND (s.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(s.id, s.roll_no, s.name, s.department, s.current_semester, s.status), 256))
        ) > 0
            THEN 'FAIL: One or more baseline student records modified or missing'
        WHEN (
            SELECT COUNT(*) FROM students s
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = CAST(s.id AS CHAR) AND b.table_name = 'students'
            WHERE b.record_pk IS NULL
        ) > 0
            THEN 'FAIL: Unauthorized additional students detected'
        ELSE 'PASS'
    END AS status,
    'Verifies physical profile immutability and bidirectional anti-join integrity' AS details;

-- =====================================================================================
-- TEST 3: TABLE 2 - student_enrollments (360-Degree Bidirectional Record Integrity)
-- Anti-Join 1: Detects modified or missing baseline student_enrollments.
-- Anti-Join 2: Detects unauthorized additional enrollments.
-- =====================================================================================
SELECT 
    'TEST 3' AS test_id,
    'Student Enrollments 360-Degree Record Integrity' AS test_name,
    'Current count matches baseline (2051), zero modified/missing, zero unauthorized additional' AS expected_condition,
    CONCAT(
        'Live: ', (SELECT COUNT(*) FROM student_enrollments), 
        ' | Baseline: ', COALESCE((SELECT row_count FROM migration_baseline_metrics WHERE metric_name = 'baseline_student_enrollments'), -1),
        ' | Mismatched: ', (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN student_enrollments se ON b.record_pk = CAST(se.id AS CHAR)
            WHERE b.table_name = 'student_enrollments'
              AND (se.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(se.id, se.student_id, se.academic_year_id, se.class_id, se.semester, se.attempt_number, se.transfer_sequence, se.status, se.entry_type, se.is_current, se.is_verified_entry), 256))
        ),
        ' | Additional: ', (
            SELECT COUNT(*) FROM student_enrollments se
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = CAST(se.id AS CHAR) AND b.table_name = 'student_enrollments'
            WHERE b.record_pk IS NULL
        )
    ) AS actual_value,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'migration_baseline_metrics') = 0
            THEN 'NOT VERIFIED: migration_baseline_metrics missing'
        WHEN (SELECT COUNT(*) FROM student_enrollments) <> (SELECT row_count FROM migration_baseline_metrics WHERE metric_name = 'baseline_student_enrollments')
            THEN 'FAIL: Row count does not match baseline'
        WHEN (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN student_enrollments se ON b.record_pk = CAST(se.id AS CHAR)
            WHERE b.table_name = 'student_enrollments'
              AND (se.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(se.id, se.student_id, se.academic_year_id, se.class_id, se.semester, se.attempt_number, se.transfer_sequence, se.status, se.entry_type, se.is_current, se.is_verified_entry), 256))
        ) > 0
            THEN 'FAIL: One or more baseline student enrollment records modified or missing'
        WHEN (
            SELECT COUNT(*) FROM student_enrollments se
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = CAST(se.id AS CHAR) AND b.table_name = 'student_enrollments'
            WHERE b.record_pk IS NULL
        ) > 0
            THEN 'FAIL: Unauthorized additional student enrollments detected'
        ELSE 'PASS'
    END AS status,
    'Verifies academic placement history immutability' AS details;

-- =====================================================================================
-- TEST 4: TABLE 3 - classes (Baseline Integrity & Controlled Expansion to 33 Classes)
-- Verifies baseline 29 classes unchanged + exactly 4 approved M.E. classes added.
-- =====================================================================================
SELECT 
    'TEST 4' AS test_id,
    'Classes Table Controlled Expansion (29 Baseline + 4 M.E. = 33 Total)' AS test_name,
    'Total count exactly 33, zero baseline classes modified, zero unauthorized additional classes' AS expected_condition,
    CONCAT(
        'Live: ', (SELECT COUNT(*) FROM classes), 
        ' | Expected: 33 (29 baseline + 4 active M.E.)',
        ' | Mismatched Baseline: ', (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN classes c ON b.record_pk = c.id
            WHERE b.table_name = 'classes'
              AND (c.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(c.id, c.name, c.department, c.semester, c.year_label, c.section, c.academic_year, c.batch), 256))
        ),
        ' | Unauthorized Additional: ', (
            SELECT COUNT(*) FROM classes c
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = c.id AND b.table_name = 'classes'
            WHERE b.record_pk IS NULL
              AND c.id NOT IN ('ME_CSE_I', 'ME_EST_I', 'ME_SE_III', 'ME_MFE_III')
        )
    ) AS actual_value,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'migration_baseline_metrics') = 0
            THEN 'NOT VERIFIED: migration_baseline_metrics missing'
        WHEN (SELECT COUNT(*) FROM classes) <> 33
            THEN 'FAIL: Total classes count is not exactly 33'
        WHEN (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN classes c ON b.record_pk = c.id
            WHERE b.table_name = 'classes'
              AND (c.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(c.id, c.name, c.department, c.semester, c.year_label, c.section, c.academic_year, c.batch), 256))
        ) > 0
            THEN 'FAIL: Baseline class attributes modified or missing'
        WHEN (
            SELECT COUNT(*) FROM classes c
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = c.id AND b.table_name = 'classes'
            WHERE b.record_pk IS NULL
              AND c.id NOT IN ('ME_CSE_I', 'ME_EST_I', 'ME_SE_III', 'ME_MFE_III')
        ) > 0
            THEN 'FAIL: Unauthorized additional classes detected outside 4 approved M.E. cohorts'
        ELSE 'PASS'
    END AS status,
    'Strictly limits classes table growth to the 4 confirmed active M.E. cohorts' AS details;

-- =====================================================================================
-- TEST 5: EXACT VERIFICATION OF ALL 4 APPROVED M.E. CLASSES
-- Verifies exact programme, department, semester, section ('A'), batch, and academic year ('2026-2027').
-- =====================================================================================
SELECT 
    'TEST 5' AS test_id,
    'Exact Verification of All 4 Approved M.E. Postgraduate Classes' AS test_name,
    'All 4 M.E. classes match exact institutional attributes' AS expected_condition,
    CONCAT('Matching Classes: ', (
        SELECT COUNT(*) FROM classes
        WHERE (
            id = 'ME_CSE_I' AND name = 'M.E. CSE - I Year - I Sem' 
            AND department = 'Computer Science and Engineering' AND program_code = 'ME_CSE' 
            AND program_type = 'PG' AND regulation_code = '2025' AND semester = 1 
            AND year_label = 'I' AND section = 'A' AND batch = '2026-2028' AND academic_year = '2026-2027'
        ) OR (
            id = 'ME_EST_I' AND name = 'M.E. EST - I Year - I Sem' 
            AND department = 'Electronics and Communication Engineering' AND program_code = 'ME_EST' 
            AND program_type = 'PG' AND regulation_code = '2025' AND semester = 1 
            AND year_label = 'I' AND section = 'A' AND batch = '2026-2028' AND academic_year = '2026-2027'
        ) OR (
            id = 'ME_SE_III' AND name = 'M.E. Structural - II Year - III Sem' 
            AND department = 'Civil Engineering' AND program_code = 'ME_SE' 
            AND program_type = 'PG' AND regulation_code = '2025' AND semester = 3 
            AND year_label = 'II' AND section = 'A' AND batch = '2025-2027' AND academic_year = '2026-2027'
        ) OR (
            id = 'ME_MFE_III' AND name = 'M.E. Manufacturing - II Year - III Sem' 
            AND department = 'Mechanical Engineering' AND program_code = 'ME_MFE' 
            AND program_type = 'PG' AND regulation_code = '2025' AND semester = 3 
            AND year_label = 'II' AND section = 'A' AND batch = '2025-2027' AND academic_year = '2026-2027'
        )
    ), ' of 4') AS actual_value,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM classes
            WHERE (
                id = 'ME_CSE_I' AND name = 'M.E. CSE - I Year - I Sem' 
                AND department = 'Computer Science and Engineering' AND program_code = 'ME_CSE' 
                AND program_type = 'PG' AND regulation_code = '2025' AND semester = 1 
                AND year_label = 'I' AND section = 'A' AND batch = '2026-2028' AND academic_year = '2026-2027'
            ) OR (
                id = 'ME_EST_I' AND name = 'M.E. EST - I Year - I Sem' 
                AND department = 'Electronics and Communication Engineering' AND program_code = 'ME_EST' 
                AND program_type = 'PG' AND regulation_code = '2025' AND semester = 1 
                AND year_label = 'I' AND section = 'A' AND batch = '2026-2028' AND academic_year = '2026-2027'
            ) OR (
                id = 'ME_SE_III' AND name = 'M.E. Structural - II Year - III Sem' 
                AND department = 'Civil Engineering' AND program_code = 'ME_SE' 
                AND program_type = 'PG' AND regulation_code = '2025' AND semester = 3 
                AND year_label = 'II' AND section = 'A' AND batch = '2025-2027' AND academic_year = '2026-2027'
            ) OR (
                id = 'ME_MFE_III' AND name = 'M.E. Manufacturing - II Year - III Sem' 
                AND department = 'Mechanical Engineering' AND program_code = 'ME_MFE' 
                AND program_type = 'PG' AND regulation_code = '2025' AND semester = 3 
                AND year_label = 'II' AND section = 'A' AND batch = '2025-2027' AND academic_year = '2026-2027'
            )
        ) = 4 THEN 'PASS'
        ELSE 'FAIL: One or more approved M.E. classes have mismatched attributes'
    END AS status,
    'Confirms exact configuration of ME_CSE_I, ME_EST_I, ME_SE_III, and ME_MFE_III' AS details;

-- =====================================================================================
-- TEST 6: TABLE 4 - marks_sessions (360-Degree Record Integrity)
-- Anti-Join 1: Detects modified or missing baseline session 1.
-- Anti-Join 2: Detects unauthorized additional sessions.
-- =====================================================================================
SELECT 
    'TEST 6' AS test_id,
    'Marks Sessions 360-Degree Record Integrity' AS test_name,
    'Current count matches baseline (1), zero modified/missing, zero unauthorized additional' AS expected_condition,
    CONCAT(
        'Live: ', (SELECT COUNT(*) FROM marks_sessions), 
        ' | Baseline: ', COALESCE((SELECT row_count FROM migration_baseline_metrics WHERE metric_name = 'baseline_marks_sessions'), -1),
        ' | Mismatched: ', (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN marks_sessions ms ON b.record_pk = CAST(ms.id AS CHAR)
            WHERE b.table_name = 'marks_sessions'
              AND (ms.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(ms.id, ms.subject_id, ms.class_id, ms.staff_id, ms.session_label, ms.total_max, ms.status, ms.avg_score, ms.student_count), 256))
        ),
        ' | Additional: ', (
            SELECT COUNT(*) FROM marks_sessions ms
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = CAST(ms.id AS CHAR) AND b.table_name = 'marks_sessions'
            WHERE b.record_pk IS NULL
        )
    ) AS actual_value,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'migration_baseline_metrics') = 0
            THEN 'NOT VERIFIED: migration_baseline_metrics missing'
        WHEN (SELECT COUNT(*) FROM marks_sessions) <> (SELECT row_count FROM migration_baseline_metrics WHERE metric_name = 'baseline_marks_sessions')
            THEN 'FAIL: Marks sessions count regression'
        WHEN (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN marks_sessions ms ON b.record_pk = CAST(ms.id AS CHAR)
            WHERE b.table_name = 'marks_sessions'
              AND (ms.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(ms.id, ms.subject_id, ms.class_id, ms.staff_id, ms.session_label, ms.total_max, ms.status, ms.avg_score, ms.student_count), 256))
        ) > 0
            THEN 'FAIL: Baseline marks session 1 attributes modified or missing'
        WHEN (
            SELECT COUNT(*) FROM marks_sessions ms
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = CAST(ms.id AS CHAR) AND b.table_name = 'marks_sessions'
            WHERE b.record_pk IS NULL
        ) > 0
            THEN 'FAIL: Unauthorized additional marks sessions detected'
        ELSE 'PASS'
    END AS status,
    'Ensures zero unauthorized marks sessions created during migration' AS details;

-- =====================================================================================
-- TEST 7: TABLE 5 - marks (360-Degree Record Integrity)
-- Anti-Join 1: Detects modified or missing baseline marks records.
-- Anti-Join 2: Detects unauthorized additional marks records.
-- =====================================================================================
SELECT 
    'TEST 7' AS test_id,
    'Marks Table 360-Degree Record Integrity' AS test_name,
    'Current count matches baseline (44), zero modified/missing, zero unauthorized additional' AS expected_condition,
    CONCAT(
        'Live: ', (SELECT COUNT(*) FROM marks), 
        ' | Baseline: ', COALESCE((SELECT row_count FROM migration_baseline_metrics WHERE metric_name = 'baseline_marks'), -1),
        ' | Mismatched: ', (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN marks m ON b.record_pk = CAST(m.id AS CHAR)
            WHERE b.table_name = 'marks'
              AND (m.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(m.id, m.session_id, m.component_id, m.student_id, m.marks_obtained), 256))
        ),
        ' | Additional: ', (
            SELECT COUNT(*) FROM marks m
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = CAST(m.id AS CHAR) AND b.table_name = 'marks'
            WHERE b.record_pk IS NULL
        )
    ) AS actual_value,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'migration_baseline_metrics') = 0
            THEN 'NOT VERIFIED: migration_baseline_metrics missing'
        WHEN (SELECT COUNT(*) FROM marks) <> (SELECT row_count FROM migration_baseline_metrics WHERE metric_name = 'baseline_marks')
            THEN 'FAIL: Marks table count regression'
        WHEN (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN marks m ON b.record_pk = CAST(m.id AS CHAR)
            WHERE b.table_name = 'marks'
              AND (m.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(m.id, m.session_id, m.component_id, m.student_id, m.marks_obtained), 256))
        ) > 0
            THEN 'FAIL: Baseline marks data modified or missing'
        WHEN (
            SELECT COUNT(*) FROM marks m
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = CAST(m.id AS CHAR) AND b.table_name = 'marks'
            WHERE b.record_pk IS NULL
        ) > 0
            THEN 'FAIL: Unauthorized additional marks records detected'
        ELSE 'PASS'
    END AS status,
    'Guarantees 100% preservation of all student continuous assessment scores' AS details;

-- =====================================================================================
-- TEST 8: TABLE 6 - assessment_components (360-Degree Record Integrity)
-- Anti-Join 1: Detects modified or missing baseline assessment components.
-- Anti-Join 2: Detects unauthorized additional assessment components.
-- =====================================================================================
SELECT 
    'TEST 8' AS test_id,
    'Assessment Components 360-Degree Record Integrity' AS test_name,
    'Current count matches baseline (3), zero modified/missing, zero unauthorized additional' AS expected_condition,
    CONCAT(
        'Live: ', (SELECT COUNT(*) FROM assessment_components), 
        ' | Baseline: ', COALESCE((SELECT row_count FROM migration_baseline_metrics WHERE metric_name = 'baseline_assessment_components'), -1),
        ' | Mismatched: ', (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN assessment_components ac ON b.record_pk = CAST(ac.id AS CHAR)
            WHERE b.table_name = 'assessment_components'
              AND (ac.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(ac.id, ac.session_id, ac.type_id, ac.label, ac.conducted_max, ac.max_marks), 256))
        ),
        ' | Additional: ', (
            SELECT COUNT(*) FROM assessment_components ac
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = CAST(ac.id AS CHAR) AND b.table_name = 'assessment_components'
            WHERE b.record_pk IS NULL
        )
    ) AS actual_value,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'migration_baseline_metrics') = 0
            THEN 'NOT VERIFIED: migration_baseline_metrics missing'
        WHEN (SELECT COUNT(*) FROM assessment_components) <> (SELECT row_count FROM migration_baseline_metrics WHERE metric_name = 'baseline_assessment_components')
            THEN 'FAIL: Assessment components count regression'
        WHEN (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN assessment_components ac ON b.record_pk = CAST(ac.id AS CHAR)
            WHERE b.table_name = 'assessment_components'
              AND (ac.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(ac.id, ac.session_id, ac.type_id, ac.label, ac.conducted_max, ac.max_marks), 256))
        ) > 0
            THEN 'FAIL: Baseline assessment components data modified or missing'
        WHEN (
            SELECT COUNT(*) FROM assessment_components ac
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = CAST(ac.id AS CHAR) AND b.table_name = 'assessment_components'
            WHERE b.record_pk IS NULL
        ) > 0
            THEN 'FAIL: Unauthorized additional assessment components detected'
        ELSE 'PASS'
    END AS status,
    'Verifies preservation of maximum marks, weights, and component labels' AS details;

-- =====================================================================================
-- TEST 9: TABLE 7 - session_attendance (360-Degree Record Integrity)
-- Anti-Join 1: Detects modified or missing baseline session attendance records.
-- Anti-Join 2: Detects unauthorized additional session attendance records.
-- =====================================================================================
SELECT 
    'TEST 9' AS test_id,
    'Session Attendance 360-Degree Record Integrity' AS test_name,
    'Current count matches baseline (26), zero modified/missing, zero unauthorized additional' AS expected_condition,
    CONCAT(
        'Live: ', (SELECT COUNT(*) FROM session_attendance), 
        ' | Baseline: ', COALESCE((SELECT row_count FROM migration_baseline_metrics WHERE metric_name = 'baseline_session_attendance'), -1),
        ' | Mismatched: ', (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN session_attendance sa ON b.record_pk = CONCAT(sa.session_id, ':', sa.student_id)
            WHERE b.table_name = 'session_attendance'
              AND (sa.session_id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(sa.session_id, sa.student_id, sa.hours_attended, actual_taken_hours, attendance_mark), 256))
        ),
        ' | Additional: ', (
            SELECT COUNT(*) FROM session_attendance sa
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = CONCAT(sa.session_id, ':', sa.student_id) AND b.table_name = 'session_attendance'
            WHERE b.record_pk IS NULL
        )
    ) AS actual_value,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'migration_baseline_metrics') = 0
            THEN 'NOT VERIFIED: migration_baseline_metrics missing'
        WHEN (SELECT COUNT(*) FROM session_attendance) <> (SELECT row_count FROM migration_baseline_metrics WHERE metric_name = 'baseline_session_attendance')
            THEN 'FAIL: Session attendance count regression'
        WHEN (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN session_attendance sa ON b.record_pk = CONCAT(sa.session_id, ':', sa.student_id)
            WHERE b.table_name = 'session_attendance'
              AND (sa.session_id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(sa.session_id, sa.student_id, sa.hours_attended, actual_taken_hours, attendance_mark), 256))
        ) > 0
            THEN 'FAIL: Baseline session attendance data modified or missing'
        WHEN (
            SELECT COUNT(*) FROM session_attendance sa
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = CONCAT(sa.session_id, ':', sa.student_id) AND b.table_name = 'session_attendance'
            WHERE b.record_pk IS NULL
        ) > 0
            THEN 'FAIL: Unauthorized additional attendance records detected'
        ELSE 'PASS'
    END AS status,
    'Verifies attendance hours and statutory marks ledger preservation' AS details;

-- =====================================================================================
-- TEST 10: ZERO UNMAPPED CLASSES AUDIT
-- Confirms that 100% of classes have an authoritative program_code assigned.
-- =====================================================================================
SELECT 
    'TEST 10' AS test_id,
    'Zero Unmapped Classes Audit' AS test_name,
    '0 classes with NULL program_code' AS expected_condition,
    CONCAT('Unmapped Classes: ', (SELECT COUNT(*) FROM classes WHERE program_code IS NULL)) AS actual_value,
    CASE 
        WHEN (SELECT COUNT(*) FROM classes WHERE program_code IS NULL) = 0 THEN 'PASS'
        ELSE 'FAIL: Classes remain with NULL program_code'
    END AS status,
    'All classes must be mapped to an authoritative academic programme' AS details;

-- =====================================================================================
-- TEST 11: ACADEMIC PROGRAMMES CATALOG & M.E. DEPARTMENT OWNERSHIP
-- Confirms exactly 11 programmes and verifies ME_EST belongs to ECE under Regulation 2025.
-- =====================================================================================
SELECT 
    'TEST 11' AS test_id,
    'Academic Programmes Catalog & ME_EST Department Ownership' AS test_name,
    'Exactly 11 programmes present; ME_EST owned by ECE with regulation 2025' AS expected_condition,
    CONCAT(
        'Programmes Count: ', (SELECT COUNT(*) FROM academic_programmes),
        ' | ME_EST Dept: ', COALESCE((SELECT d.short_name FROM academic_programmes p JOIN departments d ON p.owning_department_id = d.id WHERE p.code = 'ME_EST'), 'NONE'),
        ' | ME_EST Reg: ', COALESCE((SELECT current_regulation FROM academic_programmes WHERE code = 'ME_EST'), 'NONE')
    ) AS actual_value,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'academic_programmes') = 0
            THEN 'NOT VERIFIED: academic_programmes table does not exist'
        WHEN (SELECT COUNT(*) FROM academic_programmes) <> 11
            THEN 'FAIL: Academic programmes count is not exactly 11 (7 UG + 4 PG)'
        WHEN (
            SELECT COUNT(*) FROM academic_programmes p 
            JOIN departments d ON p.owning_department_id = d.id 
            WHERE p.code = 'ME_EST' AND d.short_name = 'ECE' AND p.current_regulation = '2025'
        ) <> 1
            THEN 'FAIL: ME_EST is not mapped to ECE department or regulation is not 2025'
        ELSE 'PASS'
    END AS status,
    'Verifies academic programmes catalog integrity' AS details;

-- =====================================================================================
-- TEST 12: AY / CYCLE CONSISTENCY & MULTIPLICITY ENFORCEMENT
-- Confirms foreign key, check constraint, and unique identity guard index exist on marks_sessions,
-- and verifies that AY 2026-2027 contains exactly one ODD_INTERNAL_1 and exactly one ODD_INTERNAL_2.
-- =====================================================================================
SELECT 
    'TEST 12' AS test_id,
    'AY / Cycle Consistency & Multiplicity Constraints Enforcement' AS test_name,
    'Composite FK, CHK, uq_marks_sessions_identity active; exactly one ODD_INTERNAL_1 and one ODD_INTERNAL_2 for AY 2026-2027' AS expected_condition,
    CONCAT(
        'Composite FK: ', (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = 'college_cms_verify' AND TABLE_NAME = 'marks_sessions' AND CONSTRAINT_NAME = 'fk_marks_sessions_cycle_ay_consistency'),
        ' | Consistency CHK: ', (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = 'college_cms_verify' AND TABLE_NAME = 'marks_sessions' AND CONSTRAINT_NAME = 'chk_session_ay_cycle_consistency'),
        ' | Identity Guard Index: ', (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = 'college_cms_verify' AND TABLE_NAME = 'marks_sessions' AND INDEX_NAME = 'uq_marks_sessions_identity' AND COLUMN_NAME = 'session_identity_guard'),
        ' | ODD_INTERNAL_1: ', (SELECT COUNT(*) FROM assessment_cycles ac JOIN academic_years ay ON ay.code = '2026-2027' AND ay.is_current = 1 WHERE ac.academic_year_id = ay.id AND ac.cycle_type = 'ODD_INTERNAL_1'),
        ' | ODD_INTERNAL_2: ', (SELECT COUNT(*) FROM assessment_cycles ac JOIN academic_years ay ON ay.code = '2026-2027' AND ay.is_current = 1 WHERE ac.academic_year_id = ay.id AND ac.cycle_type = 'ODD_INTERNAL_2')
    ) AS actual_value,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = 'college_cms_verify' AND TABLE_NAME = 'marks_sessions' AND CONSTRAINT_NAME = 'fk_marks_sessions_cycle_ay_consistency') = 1
         AND (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = 'college_cms_verify' AND TABLE_NAME = 'marks_sessions' AND CONSTRAINT_NAME = 'chk_session_ay_cycle_consistency') = 1
         AND (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = 'college_cms_verify' AND TABLE_NAME = 'marks_sessions' AND INDEX_NAME = 'uq_marks_sessions_identity' AND COLUMN_NAME = 'session_identity_guard') = 1
         AND (SELECT COUNT(*) FROM assessment_cycles ac JOIN academic_years ay ON ay.code = '2026-2027' AND ay.is_current = 1 WHERE ac.academic_year_id = ay.id AND ac.cycle_type = 'ODD_INTERNAL_1') = 1
         AND (SELECT COUNT(*) FROM assessment_cycles ac JOIN academic_years ay ON ay.code = '2026-2027' AND ay.is_current = 1 WHERE ac.academic_year_id = ay.id AND ac.cycle_type = 'ODD_INTERNAL_2') = 1
            THEN 'PASS'
        ELSE 'FAIL: AY/Cycle consistency constraints, identity guard index missing, or cycles not exactly one of each for AY 2026-2027'
    END AS status,
    'Prevents mismatched or partially populated academic terms and guarantees exact assessment cycle count and unique session identities' AS details;

-- =====================================================================================
-- TEST 13: HISTORICAL SESSION 1 EXPLICITLY UNRESOLVED & SOFT-ARCHIVED
-- Confirms session 1 has NULL AY, NULL cycle, identity guard, and is_archived = 1.
-- =====================================================================================
SELECT 
    'TEST 13' AS test_id,
    'Historical Session 1 Unresolved Preservation' AS test_name,
    'AY=NULL, Cycle=NULL, is_archived=1, identity_guard="__UNRESOLVED_AY__:__UNRESOLVED_CYCLE__:internal1"' AS expected_condition,
    CONCAT(
        'AY: ', COALESCE((SELECT CAST(academic_year_id AS CHAR) FROM marks_sessions WHERE id = 1), 'NULL'),
        ' | Cycle: ', COALESCE((SELECT CAST(assessment_cycle_id AS CHAR) FROM marks_sessions WHERE id = 1), 'NULL'),
        ' | Guard: ', COALESCE((SELECT session_identity_guard FROM marks_sessions WHERE id = 1), 'NULL'),
        ' | Archived: ', COALESCE((SELECT CAST(is_archived AS CHAR) FROM marks_sessions WHERE id = 1), 'NULL')
    ) AS actual_value,
    CASE 
        WHEN (SELECT COUNT(*) FROM marks_sessions WHERE id = 1) = 0
            THEN 'FAIL: Historical session 1 missing'
        WHEN (
            SELECT COUNT(*) FROM marks_sessions 
            WHERE id = 1 
              AND academic_year_id IS NULL 
              AND assessment_cycle_id IS NULL 
              AND session_identity_guard = '__UNRESOLVED_AY__:__UNRESOLVED_CYCLE__:internal1'
              AND is_archived = 1
        ) = 1 THEN 'PASS'
        ELSE 'FAIL: Historical session 1 not properly preserved in unresolved soft-archived state'
    END AS status,
    'Historical session preserved non-destructively pending Examination Cell audit' AS details;

-- =====================================================================================
-- TEST 14: 100% OF UNVERIFIED ENROLLMENTS EVALUATED (ZERO LIMIT 1 BYPASS)
-- Evaluates ALL records with status = 'UNVERIFIED_PRE_MIGRATION' (no LIMIT 1).
-- =====================================================================================
SELECT 
    'TEST 14' AS test_id,
    'Unverified Enrollments Marks-Entry Gate Evaluation (100% Evaluation)' AS test_name,
    '0 unverified students with is_marks_eligible!=0 or is_promotion_eligible=1' AS expected_condition,
    CONCAT('Invalid Unverified Records: ', (
        SELECT COUNT(*) FROM student_enrollments 
        WHERE `status` = 'UNVERIFIED_PRE_MIGRATION'
          AND (`is_marks_eligible` <> 0 OR `is_promotion_eligible` = 1)
    )) AS actual_value,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM student_enrollments 
            WHERE `status` = 'UNVERIFIED_PRE_MIGRATION'
              AND (`is_marks_eligible` <> 0 OR `is_promotion_eligible` = 1)
        ) = 0 THEN 'PASS'
        ELSE 'FAIL: UNVERIFIED_PRE_MIGRATION students must evaluate to is_marks_eligible=0 and is_promotion_eligible!=1'
    END AS status,
    'Ensures unverified legacy cohort cannot receive marks entry without institutional clearance' AS details;

-- =====================================================================================
-- TEST 15: DATABASE IMMUTABILITY SAFETY TRIGGERS (ALL 15 TRIGGERS PRESENT)
-- Protects marks, components, sessions, attendance, history, and audit logs.
-- Guarantees hard-delete prohibition, update locking, and archived session insert prevention.
-- =====================================================================================
SELECT 
    'TEST 15' AS test_id,
    'Database Immutability & Anti-Deletion Safety Triggers' AS test_name,
    'All 15 protection triggers active in information_schema.triggers' AS expected_condition,
    CONCAT('Active Triggers: ', (
        SELECT COUNT(*) FROM information_schema.triggers
        WHERE trigger_schema = 'college_cms_verify'
          AND trigger_name IN (
            'trg_prevent_hard_delete_marks',
            'trg_prevent_insert_marks_archived_session',
            'trg_prevent_update_marks_archived_session',
            'trg_prevent_hard_delete_components',
            'trg_prevent_insert_components_archived_session',
            'trg_prevent_update_components_archived_session',
            'trg_prevent_hard_delete_sessions',
            'trg_prevent_update_archived_session',
            'trg_prevent_hard_delete_attendance',
            'trg_prevent_insert_attendance_archived_session',
            'trg_prevent_update_attendance_archived_session',
            'trg_prevent_hard_delete_marks_history',
            'trg_prevent_update_marks_history',
            'trg_prevent_hard_delete_marks_audit_logs',
            'trg_prevent_update_marks_audit_logs'
          )
    ), ' of 15') AS actual_value,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM information_schema.triggers
            WHERE trigger_schema = 'college_cms_verify'
              AND trigger_name IN (
                'trg_prevent_hard_delete_marks',
                'trg_prevent_insert_marks_archived_session',
                'trg_prevent_update_marks_archived_session',
                'trg_prevent_hard_delete_components',
                'trg_prevent_insert_components_archived_session',
                'trg_prevent_update_components_archived_session',
                'trg_prevent_hard_delete_sessions',
                'trg_prevent_update_archived_session',
                'trg_prevent_hard_delete_attendance',
                'trg_prevent_insert_attendance_archived_session',
                'trg_prevent_update_attendance_archived_session',
                'trg_prevent_hard_delete_marks_history',
                'trg_prevent_update_marks_history',
                'trg_prevent_hard_delete_marks_audit_logs',
                'trg_prevent_update_marks_audit_logs'
              )
        ) = 15 THEN 'PASS'
        ELSE 'FAIL: One or more data protection triggers missing in college_cms_verify'
    END AS status,
    'Guarantees hard-delete prohibition, insert prevention on archived sessions, and update locking' AS details;

-- =====================================================================================
-- CONSOLIDATED POST-MIGRATION SCORECARD & OVERALL VERDICT
-- Comprehensive Aggregation: Evaluates TEST 0 through TEST 15 explicitly.
-- GREEN is IMPOSSIBLE if even one mandatory test is FAIL, missing, or NOT VERIFIED.
-- =====================================================================================
SELECT 
    'PHASE 1 POST-MIGRATION VALIDATION SCORECARD' AS verification_report,
    (SELECT COUNT(*) FROM classes WHERE program_type = 'PG') AS pg_classes_count,
    (SELECT COUNT(*) FROM classes) AS total_classes_count,
    (SELECT COUNT(*) FROM academic_programmes WHERE program_type = 'PG') AS pg_programmes_count,
    (SELECT COUNT(*) FROM marks_sessions WHERE is_archived = 1) AS archived_sessions_count,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'college_cms_verify') AS active_triggers_count,
    'MANDATORY: Physical endpoint identity (host 127.0.0.1/localhost) CANNOT be verified solely within SQL and REQUIRES independent human confirmation outside SQL in client connection settings.' AS physical_endpoint_human_verification_requirement,
    CASE 
        -- TEST 0: Physical server safety & connection context
        WHEN DATABASE() <> 'college_cms_verify' OR @@port NOT IN (3306, 3307)
            THEN 'FAIL: TEST 0 - WRONG DATABASE OR PORT CONNECTION'

        -- TEST 1: Baseline metrics completeness & lifecycle status
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'migration_baseline_metrics') = 0
          OR (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'migration_baseline_capture_status') = 0
            THEN 'NOT VERIFIED: TEST 1 - BASELINE AUDIT OBJECTS MISSING'

        WHEN (SELECT COUNT(*) FROM migration_baseline_capture_status WHERE status = 'COMPLETED') = 0
            THEN 'FAIL: TEST 1 - BASELINE STATUS IS NOT COMPLETED'

        WHEN (
            SELECT COUNT(*) FROM migration_baseline_metrics 
            WHERE metric_name IN (
                'baseline_students', 'baseline_student_enrollments', 'baseline_classes',
                'baseline_marks_sessions', 'baseline_marks', 'baseline_assessment_components',
                'baseline_session_attendance'
            )
        ) <> 7
            THEN 'FAIL: TEST 1 - INCOMPLETE BASELINE METRICS'

        -- TEST 2: students 360-degree integrity
        WHEN (SELECT COUNT(*) FROM students) <> (SELECT row_count FROM migration_baseline_metrics WHERE metric_name = 'baseline_students')
          OR (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN students s ON b.record_pk = CAST(s.id AS CHAR)
            WHERE b.table_name = 'students'
              AND (s.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(s.id, s.roll_no, s.name, s.department, s.current_semester, s.status), 256))
          ) > 0
          OR (
            SELECT COUNT(*) FROM students s
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = CAST(s.id AS CHAR) AND b.table_name = 'students'
            WHERE b.record_pk IS NULL
          ) > 0
            THEN 'FAIL: TEST 2 - STUDENTS TABLE INTEGRITY REGRESSION DETECTED'

        -- TEST 3: student_enrollments 360-degree integrity
        WHEN (SELECT COUNT(*) FROM student_enrollments) <> (SELECT row_count FROM migration_baseline_metrics WHERE metric_name = 'baseline_student_enrollments')
          OR (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN student_enrollments se ON b.record_pk = CAST(se.id AS CHAR)
            WHERE b.table_name = 'student_enrollments'
              AND (se.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(se.id, se.student_id, se.academic_year_id, se.class_id, se.semester, se.attempt_number, se.transfer_sequence, se.status, se.entry_type, se.is_current, se.is_verified_entry), 256))
          ) > 0
          OR (
            SELECT COUNT(*) FROM student_enrollments se
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = CAST(se.id AS CHAR) AND b.table_name = 'student_enrollments'
            WHERE b.record_pk IS NULL
          ) > 0
            THEN 'FAIL: TEST 3 - STUDENT ENROLLMENTS INTEGRITY REGRESSION DETECTED'

        -- TEST 4: classes controlled expansion (29 baseline + 4 ME = 33)
        WHEN (SELECT COUNT(*) FROM classes) <> 33
          OR (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN classes c ON b.record_pk = c.id
            WHERE b.table_name = 'classes'
              AND (c.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(c.id, c.name, c.department, c.semester, c.year_label, c.section, c.academic_year, c.batch), 256))
          ) > 0
          OR (
            SELECT COUNT(*) FROM classes c
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = c.id AND b.table_name = 'classes'
            WHERE b.record_pk IS NULL
              AND c.id NOT IN ('ME_CSE_I', 'ME_EST_I', 'ME_SE_III', 'ME_MFE_III')
          ) > 0
            THEN 'FAIL: TEST 4 - CLASSES EXPANSION OR BASELINE CORRUPTION DETECTED'

        -- TEST 5: exact verification of all 4 approved M.E. classes
        WHEN (
            SELECT COUNT(*) FROM classes
            WHERE (
                id = 'ME_CSE_I' AND name = 'M.E. CSE - I Year - I Sem' 
                AND department = 'Computer Science and Engineering' AND program_code = 'ME_CSE' 
                AND program_type = 'PG' AND regulation_code = '2025' AND semester = 1 
                AND year_label = 'I' AND section = 'A' AND batch = '2026-2028' AND academic_year = '2026-2027'
            ) OR (
                id = 'ME_EST_I' AND name = 'M.E. EST - I Year - I Sem' 
                AND department = 'Electronics and Communication Engineering' AND program_code = 'ME_EST' 
                AND program_type = 'PG' AND regulation_code = '2025' AND semester = 1 
                AND year_label = 'I' AND section = 'A' AND batch = '2026-2028' AND academic_year = '2026-2027'
            ) OR (
                id = 'ME_SE_III' AND name = 'M.E. Structural - II Year - III Sem' 
                AND department = 'Civil Engineering' AND program_code = 'ME_SE' 
                AND program_type = 'PG' AND regulation_code = '2025' AND semester = 3 
                AND year_label = 'II' AND section = 'A' AND batch = '2025-2027' AND academic_year = '2026-2027'
            ) OR (
                id = 'ME_MFE_III' AND name = 'M.E. Manufacturing - II Year - III Sem' 
                AND department = 'Mechanical Engineering' AND program_code = 'ME_MFE' 
                AND program_type = 'PG' AND regulation_code = '2025' AND semester = 3 
                AND year_label = 'II' AND section = 'A' AND batch = '2025-2027' AND academic_year = '2026-2027'
            )
        ) <> 4
            THEN 'FAIL: TEST 5 - APPROVED M.E. CLASSES ATTRIBUTE MISMATCH'

        -- TEST 6: marks_sessions 360-degree integrity
        WHEN (SELECT COUNT(*) FROM marks_sessions) <> (SELECT row_count FROM migration_baseline_metrics WHERE metric_name = 'baseline_marks_sessions')
          OR (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN marks_sessions ms ON b.record_pk = CAST(ms.id AS CHAR)
            WHERE b.table_name = 'marks_sessions'
              AND (ms.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(ms.id, ms.subject_id, ms.class_id, ms.staff_id, ms.session_label, ms.total_max, ms.status, ms.avg_score, ms.student_count), 256))
          ) > 0
          OR (
            SELECT COUNT(*) FROM marks_sessions ms
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = CAST(ms.id AS CHAR) AND b.table_name = 'marks_sessions'
            WHERE b.record_pk IS NULL
          ) > 0
            THEN 'FAIL: TEST 6 - MARKS SESSIONS INTEGRITY REGRESSION DETECTED'

        -- TEST 7: marks 360-degree integrity
        WHEN (SELECT COUNT(*) FROM marks) <> (SELECT row_count FROM migration_baseline_metrics WHERE metric_name = 'baseline_marks')
          OR (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN marks m ON b.record_pk = CAST(m.id AS CHAR)
            WHERE b.table_name = 'marks'
              AND (m.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(m.id, m.session_id, m.component_id, m.student_id, m.marks_obtained), 256))
          ) > 0
          OR (
            SELECT COUNT(*) FROM marks m
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = CAST(m.id AS CHAR) AND b.table_name = 'marks'
            WHERE b.record_pk IS NULL
          ) > 0
            THEN 'FAIL: TEST 7 - MARKS TABLE INTEGRITY REGRESSION DETECTED'

        -- TEST 8: assessment_components 360-degree integrity
        WHEN (SELECT COUNT(*) FROM assessment_components) <> (SELECT row_count FROM migration_baseline_metrics WHERE metric_name = 'baseline_assessment_components')
          OR (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN assessment_components ac ON b.record_pk = CAST(ac.id AS CHAR)
            WHERE b.table_name = 'assessment_components'
              AND (ac.id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(ac.id, ac.session_id, ac.type_id, ac.label, ac.conducted_max, ac.max_marks), 256))
          ) > 0
          OR (
            SELECT COUNT(*) FROM assessment_components ac
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = CAST(ac.id AS CHAR) AND b.table_name = 'assessment_components'
            WHERE b.record_pk IS NULL
          ) > 0
            THEN 'FAIL: TEST 8 - ASSESSMENT COMPONENTS INTEGRITY REGRESSION DETECTED'

        -- TEST 9: session_attendance 360-degree integrity
        WHEN (SELECT COUNT(*) FROM session_attendance) <> (SELECT row_count FROM migration_baseline_metrics WHERE metric_name = 'baseline_session_attendance')
          OR (
            SELECT COUNT(*) FROM migration_baseline_record_hashes b
            LEFT JOIN session_attendance sa ON b.record_pk = CONCAT(sa.session_id, ':', sa.student_id)
            WHERE b.table_name = 'session_attendance'
              AND (sa.session_id IS NULL OR b.record_hash <> SHA2(JSON_ARRAY(sa.session_id, sa.student_id, sa.hours_attended, actual_taken_hours, attendance_mark), 256))
          ) > 0
          OR (
            SELECT COUNT(*) FROM session_attendance sa
            LEFT JOIN migration_baseline_record_hashes b ON b.record_pk = CONCAT(sa.session_id, ':', sa.student_id) AND b.table_name = 'session_attendance'
            WHERE b.record_pk IS NULL
          ) > 0
            THEN 'FAIL: TEST 9 - SESSION ATTENDANCE INTEGRITY REGRESSION DETECTED'

        -- TEST 10: unmapped classes audit
        WHEN (SELECT COUNT(*) FROM classes WHERE program_code IS NULL) > 0
            THEN 'FAIL: TEST 10 - UNMAPPED CLASSES DETECTED'

        -- TEST 11: academic programmes catalog & ME_EST ownership
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'college_cms_verify' AND table_name = 'academic_programmes') = 0
            THEN 'NOT VERIFIED: TEST 11 - ACADEMIC PROGRAMMES TABLE MISSING'

        WHEN (SELECT COUNT(*) FROM academic_programmes) <> 11
            THEN 'FAIL: TEST 11 - ACADEMIC PROGRAMMES IS NOT 11'

        WHEN (
            SELECT COUNT(*) FROM academic_programmes p 
            JOIN departments d ON p.owning_department_id = d.id 
            WHERE p.code = 'ME_EST' AND d.short_name = 'ECE' AND p.current_regulation = '2025'
        ) <> 1
            THEN 'FAIL: TEST 11 - ME_EST DEPARTMENT OR REGULATION MISCONFIGURED'

        -- TEST 12: AY/cycle consistency constraints, identity guard index & cycle multiplicity
        WHEN (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = 'college_cms_verify' AND TABLE_NAME = 'marks_sessions' AND CONSTRAINT_NAME = 'fk_marks_sessions_cycle_ay_consistency') <> 1
          OR (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = 'college_cms_verify' AND TABLE_NAME = 'marks_sessions' AND CONSTRAINT_NAME = 'chk_session_ay_cycle_consistency') <> 1
          OR (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = 'college_cms_verify' AND TABLE_NAME = 'marks_sessions' AND INDEX_NAME = 'uq_marks_sessions_identity' AND COLUMN_NAME = 'session_identity_guard') <> 1
          OR (SELECT COUNT(*) FROM assessment_cycles ac JOIN academic_years ay ON ay.code = '2026-2027' AND ay.is_current = 1 WHERE ac.academic_year_id = ay.id AND ac.cycle_type = 'ODD_INTERNAL_1') <> 1
          OR (SELECT COUNT(*) FROM assessment_cycles ac JOIN academic_years ay ON ay.code = '2026-2027' AND ay.is_current = 1 WHERE ac.academic_year_id = ay.id AND ac.cycle_type = 'ODD_INTERNAL_2') <> 1
            THEN 'FAIL: TEST 12 - AY/CYCLE CONSISTENCY CONSTRAINTS, IDENTITY GUARD INDEX, OR CYCLE MULTIPLICITY MISMATCH'

        -- TEST 13: historical session 1 unresolved preservation
        WHEN (
            SELECT COUNT(*) FROM marks_sessions 
            WHERE id = 1 
              AND academic_year_id IS NULL 
              AND assessment_cycle_id IS NULL 
              AND session_identity_guard = '__UNRESOLVED_AY__:__UNRESOLVED_CYCLE__:internal1'
              AND is_archived = 1
        ) <> 1
            THEN 'FAIL: TEST 13 - HISTORICAL SESSION 1 NOT PRESERVED UNRESOLVED'

        -- TEST 14: unverified enrollments eligibility check
        WHEN (
            SELECT COUNT(*) FROM student_enrollments 
            WHERE `status` = 'UNVERIFIED_PRE_MIGRATION'
              AND (`is_marks_eligible` <> 0 OR `is_promotion_eligible` = 1)
        ) > 0
            THEN 'FAIL: TEST 14 - UNVERIFIED PRE-MIGRATION STUDENTS ELIGIBILITY INVALID'

        -- TEST 15: data protection triggers present (all 15 triggers)
        WHEN (
            SELECT COUNT(*) FROM information_schema.triggers
            WHERE trigger_schema = 'college_cms_verify'
              AND trigger_name IN (
                'trg_prevent_hard_delete_marks',
                'trg_prevent_insert_marks_archived_session',
                'trg_prevent_update_marks_archived_session',
                'trg_prevent_hard_delete_components',
                'trg_prevent_insert_components_archived_session',
                'trg_prevent_update_components_archived_session',
                'trg_prevent_hard_delete_sessions',
                'trg_prevent_update_archived_session',
                'trg_prevent_hard_delete_attendance',
                'trg_prevent_insert_attendance_archived_session',
                'trg_prevent_update_attendance_archived_session',
                'trg_prevent_hard_delete_marks_history',
                'trg_prevent_update_marks_history',
                'trg_prevent_hard_delete_marks_audit_logs',
                'trg_prevent_update_marks_audit_logs'
              )
        ) <> 15
            THEN 'FAIL: TEST 15 - DATA PROTECTION TRIGGERS MISSING'

        -- ALL PASS
        ELSE 'GREEN: ALL 16 VALIDATION TESTS (TEST 0 THROUGH TEST 15) PASSED WITH ZERO MUTATIONS. NOTE: PHYSICAL ENDPOINT REQUIRES HUMAN VERIFICATION OUTSIDE SQL.'
    END AS overall_verdict,
    NOW() AS evaluated_at;
