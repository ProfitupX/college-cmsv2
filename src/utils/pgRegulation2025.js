/**
 * =====================================================================================
 * ANNA UNIVERSITY PG REGULATION 2025 (CBCS) ASSESSMENT & EVALUATION ENGINE
 * Applicable to M.E. / M.Tech. Programmes (Affiliated Non-Autonomous Institutions)
 *
 * Technical Governance & Scope:
 * - Pure, deterministic numerical calculations matching Anna University PG Regulations 2025.
 * - MARKS ONLY: Handles numerical marks, maximums, and attendance. No letter grades,
 *   grade points, SGPA, or CGPA.
 * - Handles 4 fundamental course types:
 *     1. Theory (T) - CA: 40, ESE: 60
 *     2. Theory-cum-Laboratory (TL) - CA: 50, ESE: 50
 *     3. Laboratory / Practical (P) - CA: 60, ESE: 40
 *     4. Project Work (PW - Phase I & Phase II) - CA: 60, ESE: 40
 * - Passing Minimum: 45% in ESE for Theory/TL, 50% in ESE for Lab/Project; 50% in aggregate.
 * - Leaves existing UG calculation and attendance logic completely untouched.
 * =====================================================================================
 */

/**
 * 1. PG Regulation 2025 Course Types & Evaluation Schemes
 */
export const PG_COURSE_TYPES = {
  THEORY: {
    id: 'Theory',
    label: 'Theory Course (T)',
    ciaMax: 40,
    eseMax: 60,
    esePassingPercentage: 45, // 45% of 60 = 27 marks
    eseMinPassingMarks: 27,
    totalMinPassingMarks: 50,
    defaultComponents: [
      {
        uid: 101,
        typeId: 'test',
        label: 'Internal Test 1 (35% CA)',
        conductedMax: 100,
        max: 14,
        color: '#6C63FF',
        icon: '📝',
        description: 'First continuous assessment test scaled to 14 marks'
      },
      {
        uid: 102,
        typeId: 'test',
        label: 'Internal Test 2 (35% CA)',
        conductedMax: 100,
        max: 14,
        color: '#3B82F6',
        icon: '📝',
        description: 'Second continuous assessment test scaled to 14 marks'
      },
      {
        uid: 103,
        typeId: 'assignment',
        label: 'Course Activities (30% CA)',
        conductedMax: 100,
        max: 12,
        color: '#10B981',
        icon: '📋',
        description: 'Assignments / Seminars / Case Studies / GATE Problem Solving'
      }
    ]
  },

  THEORY_CUM_LAB: {
    id: 'Theory-cum-Lab',
    label: 'Theory-cum-Laboratory Course (TL)',
    ciaMax: 50,
    eseMax: 50,
    esePassingPercentage: 45, // 45% of 50 = 22.5 marks
    eseMinPassingMarks: 22.5,
    totalMinPassingMarks: 50,
    defaultComponents: [
      {
        uid: 201,
        typeId: 'test',
        label: 'Theory Continuous Assessment',
        conductedMax: 100,
        max: 25,
        color: '#6C63FF',
        icon: '📝',
        description: 'Theory tests component scaled to 25 marks'
      },
      {
        uid: 202,
        typeId: 'practical',
        label: 'Laboratory Continuous Assessment',
        conductedMax: 100,
        max: 25,
        color: '#F472B6',
        icon: '🔬',
        description: 'Practical lab experiments evaluation scaled to 25 marks'
      }
    ]
  },

  PRACTICAL: {
    id: 'Practical',
    label: 'Laboratory / Practical Course (P)',
    ciaMax: 60,
    eseMax: 40,
    esePassingPercentage: 50, // 50% of 40 = 20 marks
    eseMinPassingMarks: 20,
    totalMinPassingMarks: 50,
    defaultComponents: [
      {
        uid: 301,
        typeId: 'practical',
        label: 'Lab Experiments & Record Work',
        conductedMax: 100,
        max: 40,
        color: '#F472B6',
        icon: '🔬',
        description: 'Continuous lab observation, execution, and record evaluation'
      },
      {
        uid: 302,
        typeId: 'model',
        label: 'Model Practical Examination',
        conductedMax: 100,
        max: 20,
        color: '#8B5CF6',
        icon: '🏆',
        description: 'End-of-term model laboratory examination'
      }
    ]
  },

  PROJECT: {
    id: 'Project',
    label: 'Project Work Phase I / Phase II (PW)',
    ciaMax: 60,
    eseMax: 40,
    esePassingPercentage: 50, // 50% of 40 = 20 marks
    eseMinPassingMarks: 20,
    totalMinPassingMarks: 50,
    defaultComponents: [
      {
        uid: 401,
        typeId: 'project',
        label: 'Review I (Problem & Methodology)',
        conductedMax: 100,
        max: 15,
        color: '#F59E0B',
        icon: '🚀',
        description: 'Project Review I by Review Committee (15 marks)'
      },
      {
        uid: 402,
        typeId: 'project',
        label: 'Review II (Design & Implementation)',
        conductedMax: 100,
        max: 20,
        color: '#FB923C',
        icon: '⚙️',
        description: 'Project Review II by Review Committee (20 marks)'
      },
      {
        uid: 403,
        typeId: 'project',
        label: 'Review III (Results & Dissertation Draft)',
        conductedMax: 100,
        max: 25,
        color: '#10B981',
        icon: '📊',
        description: 'Project Review III by Review Committee (25 marks)'
      }
    ]
  }
};

/**
 * Normalizes any subject type string into one of the 4 canonical PG categories.
 * Handles aliases such as "Laboratory", "Lab", "Theory cum Lab", "Project Work", etc.
 */
export const normalizePGSubjectType = (rawType = '') => {
  const t = String(rawType || '').toLowerCase().trim();
  if (t.includes('project')) return 'Project';
  if (t.includes('practical') || t.includes('laboratory') || t === 'lab') return 'Practical';
  if (t.includes('cum') || (t.includes('theory') && t.includes('lab'))) return 'Theory-cum-Lab';
  return 'Theory'; // Default fallback
};

/**
 * Retrieves the full configuration and component preset for a given subject type.
 */
export const getPGComponentPresets = (rawSubjectType) => {
  const canonical = normalizePGSubjectType(rawSubjectType);
  switch (canonical) {
    case 'Project':
      return PG_COURSE_TYPES.PROJECT;
    case 'Practical':
      return PG_COURSE_TYPES.PRACTICAL;
    case 'Theory-cum-Lab':
      return PG_COURSE_TYPES.THEORY_CUM_LAB;
    case 'Theory':
    default:
      return PG_COURSE_TYPES.THEORY;
  }
};

/**
 * 2. Pass/Fail Evaluation Engine (Marks Only - Clause 9)
 *
 * Evaluates pass/fail status strictly using numerical marks:
 * 1. ESE sub-minimum: 45% for Theory/TL (27/60 or 22.5/50); 50% for Lab/Project (20/40)
 * 2. Total minimum: 50% aggregate (CA + ESE >= 50 out of 100)
 *
 * Does not calculate letter grades or grade points.
 *
 * @param {Object} params
 * @param {number} params.caMarks - Continuous assessment mark obtained
 * @param {number} params.eseMarks - End semester exam mark obtained
 * @param {string} params.subjectType - Course type (Theory, Practical, etc.)
 * @param {boolean} [params.isDebarred=false] - Attendance debarment status (<65%)
 * @param {boolean} [params.isWithdrawn=false] - Official withdrawal status
 */
export const evaluatePGPassStatus = ({
  caMarks = 0,
  eseMarks = 0,
  subjectType = 'Theory',
  isDebarred = false,
  isWithdrawn = false
}) => {
  if (isWithdrawn) {
    return {
      passed: false,
      totalMarks: 0,
      caMarks: 0,
      eseMarks: 0,
      status: 'WITHDRAWN',
      reason: 'Course withdrawn under Clause 14'
    };
  }

  if (isDebarred) {
    return {
      passed: false,
      totalMarks: 0,
      caMarks: 0,
      eseMarks: 0,
      status: 'DEBARRED',
      reason: 'Shortage of Attendance (<65%) under Clause 7.3'
    };
  }

  const config = getPGComponentPresets(subjectType);
  const numCA = Number(caMarks) || 0;
  const numESE = Number(eseMarks) || 0;
  const total = Math.round(numCA + numESE);

  // Check ESE sub-minimum
  const passedESE = numESE >= config.eseMinPassingMarks;
  // Check total passing minimum
  const passedTotal = total >= config.totalMinPassingMarks;

  const passed = passedESE && passedTotal;

  if (!passedESE) {
    return {
      passed: false,
      totalMarks: total,
      caMarks: numCA,
      eseMarks: numESE,
      status: 'FAIL',
      reason: `Failed ESE sub-minimum: secured ${numESE}/${config.eseMax} (required >= ${config.eseMinPassingMarks})`
    };
  }

  if (!passedTotal) {
    return {
      passed: false,
      totalMarks: total,
      caMarks: numCA,
      eseMarks: numESE,
      status: 'FAIL',
      reason: `Failed aggregate minimum: secured ${total}/100 (required >= ${config.totalMinPassingMarks})`
    };
  }

  return {
    passed: true,
    totalMarks: total,
    caMarks: numCA,
    eseMarks: numESE,
    status: 'PASS',
    reason: 'Satisfied ESE sub-minimum and aggregate 50% requirement'
  };
};

import { getPGProgrammeByClass, PG_PROGRAMMES, UG_DEPARTMENTS, ACADEMIC_UNITS_METRICS } from './academicProgrammes.js';

export { getPGProgrammeByClass, PG_PROGRAMMES, UG_DEPARTMENTS, ACADEMIC_UNITS_METRICS };

/**
 * 3. PG Program & Class Identification Helpers
 */
export const isPGClass = (classObj) => {
  if (!classObj) return false;

  // 1. Direct registry check via getPGProgrammeByClass
  if (getPGProgrammeByClass(classObj)) return true;

  const obj = typeof classObj === 'string' ? { id: classObj, name: classObj } : classObj;

  // 2. Explicit schema flags (when available)
  if (obj.program_type === 'PG' || obj.programType === 'PG') return true;
  if (obj.degree === 'PG' || obj.degree_type === 'PG') return true;
  if (obj.degree_title === 'M.E.' || obj.degree_title === 'M.Tech') return true;
  if (obj.regulation_code === 'R2025') return true;

  // 3. Class ID checks (supports ME_*, ME-*, PG_*)
  const idStr = String(obj.id || obj.class_id || obj.classId || '').trim();
  if (/^(ME|PG)[_\-\/]/i.test(idStr)) return true;

  // 4. Class Name checks (case-insensitive)
  const nameStr = String(obj.name || obj.class_name || obj.className || '').trim().toUpperCase();
  if (!nameStr) return false;

  // Pattern A: M.E. or M.TECH with dots or word boundaries (e.g. "M.E.", "M.E. CSE", "M.Tech")
  // Negative lookahead ensures "MECH" or "MECHANICAL" is never matched
  if (/\bM\.?E\.?\b/.test(nameStr) && !/\bMECH\b|\bMECHANICAL\b/i.test(nameStr)) return true;
  if (/\bM\.?TECH\b/i.test(nameStr)) return true;

  // Pattern B: Starts with ME followed by a non-alphabetic delimiter: space, underscore, hyphen, slash, colon
  // Example: "ME_SE_1", "ME_MFE_II", "ME- I CSE", "ME _ EST_I"
  // Negative lookahead ensures "MECH" (starts with 'C') is strictly excluded
  if (/^ME[\s_\-\/:]/i.test(nameStr) && !/^MECH/i.test(nameStr)) return true;

  // Pattern C: Delimited PG or ME acronym (e.g. "PG - CSE", "I Year - ME - CSE")
  if (/\bPG[\s_\-\/:]/i.test(nameStr) || /[\s_\-\/:]PG\b/i.test(nameStr)) return true;
  if (/[\s_\-\/:]ME[\s_\-\/:]/i.test(nameStr) && !/MECH/i.test(nameStr)) return true;

  return false;
};

export const isPGSubject = (subjectObj, classObj) => {
  if (isPGClass(classObj)) return true;
  if (!subjectObj) return false;
  if (subjectObj.program_type === 'PG') return true;
  if (subjectObj.regulation_code === 'R2025') return true;

  // Check joined class name if available on the subject object
  if (subjectObj.class_name || subjectObj.className) {
    if (isPGClass({ id: subjectObj.class_id, name: subjectObj.class_name || subjectObj.className })) return true;
  }

  const classIdStr = String(subjectObj.class_id || '').trim();
  if (/^(ME|PG)[_\-\/]/i.test(classIdStr)) return true;

  // Project Work is uniquely a PG course type in R2025
  if (subjectObj.type === 'Project') return true;

  return false;
};

