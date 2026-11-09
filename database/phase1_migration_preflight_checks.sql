-- =====================================================================================
-- MARKHUB PHASE 1: LEGACY PRE-FLIGHT COMPATIBILITY NOTICE & ARCHITECTURE REDIRECTION
-- Target Schema: college_cms_verify
-- Status: DEPRECATED & OBSOLETE (MONOLITHIC EXECUTION PROHIBITED)
-- Revision: V5.6 Final Critical Defect Correction
-- =====================================================================================
--
-- TECHNICAL GOVERNANCE & EXECUTION SAFETY NOTICE:
-- DO NOT EXECUTE THIS FILE TO ATTEMPT PRE-FLIGHT DIAGNOSTICS OR BASELINE CAPTURE.
--
-- This file is retained exclusively as an informational architectural stub for backward
-- compatibility with legacy automation tooling. Under the MarkHub V5.6 Architecture Standard,
-- the monolithic workflow has been permanently partitioned into two decoupled,
-- independently authorized, and sequentially executed deliverables:
--
-- 1. STEP 1: READ-ONLY PRE-FLIGHT DIAGNOSTICS
--    File: `phase1_migration_preflight_diagnostics.sql`
--    - Pure SELECT queries only (zero DDL, zero DML, zero stored procedures).
--    - Inspects engine version, active AY, exact assessment cycles (ODD_INTERNAL_1/2),
--      pre-migration column cleanliness, core table inventory, department metadata,
--      and baseline 29-class inventory.
--    - Displays active connection context for independent human verification.
--    - Emits a consolidated 10-check diagnostic readiness scorecard.
--
-- 2. STEP 2: AUTHORIZED BASELINE CAPTURE
--    File: `phase1_migration_baseline_capture.sql`
--    - Requires explicit operator authorization declaration before execution.
--    - Lifecycle-tracked baseline capture with non-atomicity safeguards.
--    - Captures deterministic row-level SHA-256 hashes using JSON_ARRAY() serialization.
--    - Immutable hard-stop if baseline already exists or if interrupted capture is detected.
--    - Executes safe completeness verification procedure.
--
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- Informational Safety Report: Direct Operator to the Decoupled Deliverables
-- -------------------------------------------------------------------------------------
SELECT 
    'DEPRECATION NOTICE: phase1_migration_preflight_checks.sql is OBSOLETE' AS architectural_notice,
    'DO NOT EXECUTE MONOLITHIC PRE-FLIGHT WORKFLOW' AS operational_warning,
    'Please run the following two decoupled scripts in sequential order:' AS required_action,
    '1. phase1_migration_preflight_diagnostics.sql (Pure Read-Only Diagnostics)' AS step_1,
    '2. phase1_migration_baseline_capture.sql (Authorized Immutable Baseline Capture)' AS step_2,
    DATABASE() AS current_database,
    @@hostname AS current_hostname,
    @@port AS current_port,
    CURRENT_USER() AS connected_user,
    NOW() AS evaluated_at;
