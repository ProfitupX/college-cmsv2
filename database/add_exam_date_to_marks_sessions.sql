-- ============================================================================
-- MARKHUB: ADD SUBJECT-WISE EXAM DATE TO MARKS_SESSIONS
-- ============================================================================
-- File: database/add_exam_date_to_marks_sessions.sql
-- Architecture Reference: MH-FEAT-EXAM-DATE-2026-V1
-- Purpose: Adds independently maintained exam_date column to marks_sessions
-- Scope: Supports independent exam dates for IA1 and IA2 across UG 2021 & PG 2025
-- Safety: Idempotent DDL (checks column existence; zero data loss; preserves triggers)
-- Note: PREPARATION ONLY. DO NOT EXECUTE AUTOMATICALLY.
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Check if exam_date column already exists in marks_sessions
SET @col_exam_date_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'marks_sessions'
      AND COLUMN_NAME = 'exam_date'
);

-- 2. Conditionally add exam_date DATE NULL after session_label
SET @ddl_add_exam_date = IF(
    @col_exam_date_exists = 0,
    'ALTER TABLE `marks_sessions` ADD COLUMN `exam_date` DATE NULL AFTER `session_label` COMMENT ''Subject-wise assessment examination date''',
    'SELECT "Column exam_date already exists in marks_sessions; no schema change needed." AS notice'
);

PREPARE stmt_add_exam_date FROM @ddl_add_exam_date;
EXECUTE stmt_add_exam_date;
DEALLOCATE PREPARE stmt_add_exam_date;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- ROLLBACK SCRIPT (IF EVER REQUIRED):
--   ALTER TABLE `marks_sessions` DROP COLUMN `exam_date`;
-- ============================================================================
