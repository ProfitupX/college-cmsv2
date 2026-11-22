/**
 * =====================================================================================
 * MARKHUB AUTHORITATIVE ACADEMIC REGULATION RESOLVER
 * =====================================================================================
 *
 * Technical Governance & Strict Regulation Determinism:
 * 1. Backend regulation identification MUST use authoritative database metadata
 *    for the relevant class, subject, and cohort.
 * 2. req.body.regulation, frontend session values, or client-supplied parameters
 *    must NEVER be used as an authoritative source on the backend.
 * 3. A client is NEVER allowed to override the database regulation.
 * 4. If trusted database metadata identifies R2021, the backend uses R2021 even if client sends R2025.
 * 5. If trusted database metadata identifies R2025, the backend uses R2025 even if client sends R2021.
 * 6. If database metadata is missing, conflicting or ambiguous, fail-closed: reject with HTTP 400.
 * 7. Never guess the regulation from semester number, year label or other unreliable assumptions.
 * 8. Frontend regulation information may be used for display/navigation only, not backend authorization.
 */

import { isPGClass, isPGSubject } from './pgRegulation2025.js';

const VERIFIED_2021_CLASS_IDS = [
  'CL_AIDS_III', 'CL_AIDS_IV',
  'CL_CIVIL_III', 'CL_CIVIL_IV',
  'CL_CSE_III', 'CL_CSE_IV',
  'CL_ECE_III', 'CL_ECE_IV',
  'CL_EEE_III', 'CL_EEE_IV',
  'CL_IT_III', 'CL_IT_IV',
  'CL_MECH_III', 'CL_MECH_IV'
];

/**
 * Detailed regulation resolution returning authoritative regulation and diagnosis.
 *
 * @param {Object} context
 * @param {Object} [context.classObj] - Class database entity or record
 * @param {Object} [context.subject] - Subject database entity or record
 * @param {string} [context.batch] - Explicit cohort batch string (e.g. '2025-2029')
 * @param {boolean} [context.isPG] - Explicit PG flag (if already resolved)
 * @param {boolean} [context.allowClientFallback=false] - For frontend display only; backend MUST leave false
 * @param {string|number} [context.regulation] - Frontend-only display hint
 * @param {string} [context.reportType] - Frontend-only report type
 * @param {string} [context.assessmentMode] - Frontend-only assessment mode
 * @param {Object} [context.session] - Marks session record
 * @returns {{ regulation: '2021'|'2025'|null, status: 'RESOLVED'|'CONFLICT'|'UNRESOLVED'|'CLIENT_FALLBACK', error: string|null, source: string, signals: Object }}
 */
export function resolveRegulationDetails(context = {}) {
  const {
    classObj = null,
    subject = null,
    batch = null,
    isPG = null,
    allowClientFallback = false,
    regulation = null,
    reportType = null,
    assessmentMode = null,
    session = null
  } = context;

  // ── Signal 1: Postgraduate Programme Resolution ──────────
  // All PG programmes (M.E. / M.Tech.) are strictly governed by Anna University PG Regulation 2025
  let pgSignal = null;
  if (isPG === true || isPGClass(classObj) || isPGSubject(subject, classObj)) {
    pgSignal = '2025';
  }

  // ── Signal 2: Subject-Level Database Metadata ────────────
  let subjectSignal = null;
  const subReg = subject?.regulation || subject?.regulation_code || subject?.regulation_year || subject?.regulationYear;
  if (subReg !== undefined && subReg !== null && String(subReg).trim()) {
    const s = String(subReg).trim();
    if (s === '2021' || s === 'R2021' || s.toLowerCase() === 'regulation 2021') subjectSignal = '2021';
    else if (s === '2025' || s === 'R2025' || s.toLowerCase() === 'regulation 2025') subjectSignal = '2025';
  }

  const subName = String(subject?.name || '').trim();
  const subCode = String(subject?.code || '').trim();
  const subId = String(subject?.id || '').trim();

  const isSub21Token = /\b(R2021|Regulation[- ]?2021|Reg[- ]?2021|2021[- ]?Reg(ulation)?)\b/i.test(subName) ||
                       /\b(R2021|Regulation[- ]?2021|Reg[- ]?2021)\b/i.test(subCode) ||
                       /^SUB_UG21[_\-]/i.test(subId) || /_2021[_\-]?/i.test(subId);

  const isSub25Token = /\b(R2025|Regulation[- ]?2025|Reg[- ]?2025|2025[- ]?Reg(ulation)?|Autonomous[- ]?2025)\b/i.test(subName) ||
                       /\b(R2025|Regulation[- ]?2025|Reg[- ]?2025)\b/i.test(subCode) ||
                       /^SUB_UG25[_\-]/i.test(subId) || /_2025[_\-]?/i.test(subId);

  if (isSub21Token && isSub25Token) {
    subjectSignal = 'CONFLICT';
  } else if (!subjectSignal) {
    if (isSub21Token) subjectSignal = '2021';
    else if (isSub25Token) subjectSignal = '2025';
  } else {
    if (subjectSignal === '2021' && isSub25Token) subjectSignal = 'CONFLICT';
    if (subjectSignal === '2025' && isSub21Token) subjectSignal = 'CONFLICT';
  }

  // ── Signal 3: Class-Level Database Metadata ──────────────
  let classSignal = null;
  const clsReg = classObj?.regulation || classObj?.regulation_code || classObj?.regulation_year || classObj?.regulationYear;
  if (clsReg !== undefined && clsReg !== null && String(clsReg).trim()) {
    const s = String(clsReg).trim();
    if (s === '2021' || s === 'R2021' || s.toLowerCase() === 'regulation 2021') classSignal = '2021';
    else if (s === '2025' || s === 'R2025' || s.toLowerCase() === 'regulation 2025') classSignal = '2025';
  }

  const clsName = String(classObj?.name || '').trim();
  const clsId = String(classObj?.id || '').trim();

  const isCls21Token = VERIFIED_2021_CLASS_IDS.includes(clsId) ||
                       /\b(R2021|Regulation[- ]?2021|Reg[- ]?2021|2021[- ]?Reg(ulation)?)\b/i.test(clsName) ||
                       /^CL_UG21[_\-]/i.test(clsId) || /_2021[_\-]?/i.test(clsId);

  const isCls25Token = /\b(R2025|Regulation[- ]?2025|Reg[- ]?2025|2025[- ]?Reg(ulation)?|Autonomous[- ]?2025)\b/i.test(clsName) ||
                       /^CL_UG25[_\-]/i.test(clsId) || /_2025[_\-]?/i.test(clsId);

  if (isCls21Token && isCls25Token) {
    classSignal = 'CONFLICT';
  } else if (!classSignal) {
    if (isCls21Token) classSignal = '2021';
    else if (isCls25Token) classSignal = '2025';
  } else {
    if (classSignal === '2021' && isCls25Token) classSignal = 'CONFLICT';
    if (classSignal === '2025' && isCls21Token) classSignal = 'CONFLICT';
  }

  // ── Signal 4: Cohort Batch Database Metadata ─────────────
  let batchSignal = null;
  const effBatch = String(classObj?.batch || batch || session?.batch || subject?.batch || '').trim();
  const batchMatch = effBatch.match(/^(\d{4})[-–](\d{4})/);
  if (batchMatch) {
    const startYear = parseInt(batchMatch[1], 10);
    if (!isNaN(startYear)) {
      if (startYear >= 2025) batchSignal = '2025';
      else if (startYear <= 2024) batchSignal = '2021';
    }
  }

  // ── Conflict Evaluation ──────────────────────────────────
  const allSignals = [pgSignal, subjectSignal, classSignal, batchSignal].filter(Boolean);
  const hasConflict = allSignals.includes('CONFLICT') ||
                      (allSignals.includes('2021') && allSignals.includes('2025'));

  if (hasConflict) {
    return {
      regulation: null,
      status: 'CONFLICT',
      error: 'Conflicting academic regulation metadata: Class/batch metadata and subject metadata resolve to conflicting regulations. Please verify database records.',
      source: 'database',
      signals: { pgSignal, subjectSignal, classSignal, batchSignal }
    };
  }

  // ── Consistent Database Resolution ───────────────────────
  if (allSignals.includes('2021')) {
    return {
      regulation: '2021',
      status: 'RESOLVED',
      error: null,
      source: 'database',
      signals: { pgSignal, subjectSignal, classSignal, batchSignal }
    };
  }

  if (allSignals.includes('2025')) {
    return {
      regulation: '2025',
      status: 'RESOLVED',
      error: null,
      source: 'database',
      signals: { pgSignal, subjectSignal, classSignal, batchSignal }
    };
  }

  // ── Display-Only Client Fallback (Frontend Navigation/Preview Only) ──
  if (allowClientFallback) {
    const explicitReg = regulation || session?.regulation;
    if (explicitReg !== undefined && explicitReg !== null) {
      const s = String(explicitReg).trim();
      if (s === '2021' || s === 'R2021' || s.toLowerCase() === 'regulation 2021') {
        return { regulation: '2021', status: 'CLIENT_FALLBACK', error: null, source: 'client', signals: {} };
      }
      if (s === '2025' || s === 'R2025' || s.toLowerCase() === 'regulation 2025') {
        return { regulation: '2025', status: 'CLIENT_FALLBACK', error: null, source: 'client', signals: {} };
      }
    }

    const repType = String(reportType || '');
    if (repType.endsWith('_2021') || repType.includes('2021')) {
      return { regulation: '2021', status: 'CLIENT_FALLBACK', error: null, source: 'reportType', signals: {} };
    }
    if (repType.endsWith('_2025') || repType.includes('2025')) {
      return { regulation: '2025', status: 'CLIENT_FALLBACK', error: null, source: 'reportType', signals: {} };
    }

    const mode = String(assessmentMode || session?.session_label || '');
    if (mode.includes('2021')) {
      return { regulation: '2021', status: 'CLIENT_FALLBACK', error: null, source: 'assessmentMode', signals: {} };
    }
    if (mode.includes('2025')) {
      return { regulation: '2025', status: 'CLIENT_FALLBACK', error: null, source: 'assessmentMode', signals: {} };
    }
  }

  // ── Fail-Closed: Ambiguous or Missing Database Metadata ──
  return {
    regulation: null,
    status: 'UNRESOLVED',
    error: 'Academic regulation unresolved: Unable to authoritatively determine academic regulation from class and subject database metadata.',
    source: 'database',
    signals: { pgSignal, subjectSignal, classSignal, batchSignal }
  };
}

/**
 * Authoritatively resolves the academic regulation ('2021' | '2025' | null).
 * Evaluates purely authoritative database metadata by default.
 * Client regulation parameters are strictly ignored on the backend.
 *
 * @param {Object} context
 * @returns {'2021'|'2025'|null}
 */
export function resolveAuthoritativeRegulation(context = {}) {
  const result = resolveRegulationDetails(context);
  return result.regulation;
}

export function isRegulation2021(context) {
  return resolveAuthoritativeRegulation(context) === '2021';
}

export function isRegulation2025(context) {
  return resolveAuthoritativeRegulation(context) === '2025';
}
