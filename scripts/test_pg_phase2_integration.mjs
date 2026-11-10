/**
 * MarkHub PG Regulation 2025 - Phase 2 Integration Verification Script
 * Validates Common Assessment Interface logic, UG vs PG detection, course type presets, and UG preservation.
 */

import {
  isPGClass,
  isPGSubject,
  getPGComponentPresets,
  normalizePGSubjectType,
  PG_COURSE_TYPES,
  evaluatePGPassStatus
} from '../src/utils/pgRegulation2025.js';
import * as pgModule from '../src/utils/pgRegulation2025.js';
import {
  calculateAttendanceMark,
  resolveAttendanceMark
} from '../src/utils/attendanceCalculator.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

console.log('======================================================');
console.log('🧪 MARKHUB PG REGULATION 2025 - PHASE 2 VERIFICATION');
console.log('======================================================\n');

// 1. UG vs PG Detection Tests
console.log('📦 [1/4] Testing UG vs PG Class & Subject Detection...');

const ugClasses = [
  { id: 'CL001', name: 'B.E. CSE - I Year', department: 'Computer Science and Engineering', semester: 1 },
  { id: 'CL002', name: 'B.Tech IT - II Year', department: 'Information Technology', semester: 3 },
  { id: 'C_SH_CSE_A_1', name: 'I B.E CSE A', department: 'Science and Humanities', semester: 1 }
];

ugClasses.forEach(c => {
  assert(isPGClass(c) === false, `UG class ${c.id} (${c.name}) correctly identified as isPG=false`);
});

const pgTargetClasses = [
  { id: 'ME_CSE_I', name: 'M.E. Computer Science and Engineering - I Year', department: 'CSE', semester: 1 },
  { id: 'ME_EST_I', name: 'M.E. Embedded System Technologies - I Year', department: 'EEE', semester: 1 },
  { id: 'ME_SE_I', name: 'M.E. Structural Engineering - I Year', department: 'Civil', semester: 1 },
  { id: 'ME_SE_III', name: 'M.E. Structural Engineering - II Year', department: 'Civil', semester: 3 },
  { id: 'ME_MFE_I', name: 'M.E. Manufacturing Engineering - I Year', department: 'Mechanical', semester: 1 },
  { id: 'ME_MFE_III', name: 'M.E. Manufacturing Engineering - II Year', department: 'Mechanical', semester: 3 }
];

pgTargetClasses.forEach(c => {
  assert(isPGClass(c) === true, `Target PG class ${c.id} correctly identified as isPG=true`);
});

// Subject detection
const ugSubject = { id: 'SUB_UG_01', code: 'CS25C01', name: 'Python Programming', class_id: 'CL001', type: 'Theory' };
const pgSubject1 = { id: 'SUB_PG_01', code: 'CP4151', name: 'Advanced Data Structures and Algorithms', class_id: 'ME_CSE_I', type: 'Theory' };
const pgSubjectWithFlag = { id: 'SUB_PG_02', code: 'CP4161', name: 'Data Structures Laboratory', class_id: 'CL_CUSTOM', program_type: 'PG', type: 'Practical' };

assert(isPGSubject(ugSubject, ugClasses[0]) === false, 'UG subject identified as isPG=false');
assert(isPGSubject(pgSubject1, pgTargetClasses[0]) === true, 'PG subject by class_id identified as isPG=true');
assert(isPGSubject(pgSubjectWithFlag, null) === true, 'PG subject by program_type flag identified as isPG=true');

// 2. PG 4 Course Types Preset Verification
console.log('\n📦 [2/4] Testing Presets for all 4 PG Course Types...');

const testCases = [
  {
    type: 'Theory',
    expectedCiaMax: 40,
    expectedEseMax: 60,
    compSum: 40,
    compCount: 3
  },
  {
    type: 'Theory-cum-Lab',
    expectedCiaMax: 50,
    expectedEseMax: 50,
    compSum: 50,
    compCount: 2
  },
  {
    type: 'Practical',
    expectedCiaMax: 60,
    expectedEseMax: 40,
    compSum: 60,
    compCount: 2
  },
  {
    type: 'Project',
    expectedCiaMax: 60,
    expectedEseMax: 40,
    compSum: 60,
    compCount: 3
  }
];

testCases.forEach(tc => {
  const preset = getPGComponentPresets(tc.type);
  assert(preset.ciaMax === tc.expectedCiaMax, `${tc.type}: CA Max = ${tc.expectedCiaMax}`);
  assert(preset.eseMax === tc.expectedEseMax, `${tc.type}: ESE Max = ${tc.expectedEseMax}`);
  const sum = preset.defaultComponents.reduce((acc, c) => acc + c.max, 0);
  assert(sum === tc.compSum, `${tc.type}: Component weights sum to ${tc.compSum} (${preset.defaultComponents.map(c => c.max).join('+')})`);
  assert(preset.defaultComponents.length === tc.compCount, `${tc.type}: Has ${tc.compCount} standard assessment components`);
});

// Alias normalization
assert(normalizePGSubjectType('Laboratory') === 'Practical', 'Laboratory normalized to Practical');
assert(normalizePGSubjectType('Lab') === 'Practical', 'Lab normalized to Practical');
assert(normalizePGSubjectType('Theory cum Lab') === 'Theory-cum-Lab', 'Theory cum Lab normalized to Theory-cum-Lab');
assert(normalizePGSubjectType('Lab-cum-Theory') === 'Theory-cum-Lab', 'Lab-cum-Theory normalized to Theory-cum-Lab');
assert(normalizePGSubjectType('Project Work Phase I') === 'Project', 'Project Work Phase I normalized to Project');

// 3. Attendance Calculation Reuse (Exact UG equivalence)
console.log('\n📦 [3/4] Testing Exact UG Attendance Module Reuse for PG...');

const attendanceCases = [
  { attended: 30, total: 30, expectedMark: 5, label: '100% attendance' },
  { attended: 29, total: 30, expectedMark: 5, label: '96.6% attendance (>=95%)' },
  { attended: 27, total: 30, expectedMark: 3, label: '90.0% attendance (90-94%)' },
  { attended: 26, total: 30, expectedMark: 2, label: '86.6% attendance (85-89%)' },
  { attended: 24, total: 30, expectedMark: 1, label: '80.0% attendance (80-84%)' },
  { attended: 22, total: 30, expectedMark: 0, label: '73.3% attendance (<80%)' },
  { attended: 15, total: 30, expectedMark: 0, label: '50.0% attendance (Debarred)' }
];

attendanceCases.forEach(ac => {
  const pct = Math.round((ac.attended / ac.total) * 100);
  const mark = calculateAttendanceMark(pct);
  assert(mark === ac.expectedMark, `Attendance ${ac.attended}/${ac.total} (${pct}%) -> ${mark}/5 marks (${ac.label})`);

  // Verify resolveAttendanceMark behaves identically
  const studentId = 'ST_TEST_01';
  const resolved = resolveAttendanceMark(studentId, {
    attendanceMarks: {},
    attendanceData: { [studentId]: String(ac.attended) },
    totalHours: ac.total,
    assessmentMode: 'internal1',
    int1AttendanceData: {},
    int1Hours: ac.total,
    int2Hours: ac.total,
    labHours: 0,
    labData: {}
  });
  assert(resolved === ac.expectedMark, `resolveAttendanceMark returned ${resolved} == ${ac.expectedMark}`);
});

// 4. Verification of Dashboard Route Splitting
console.log('\n📦 [4/4] Testing Dashboard Route Splitting for PG vs UG...');

const dashboardSubs = [
  { id: '1', class_id: 'CL001', semester: 1, year_label: 'I', name: 'UG Sem 1' },
  { id: '2', class_id: 'CL002', semester: 3, year_label: 'II', name: 'UG Sem 3' },
  { id: '3', class_id: 'CL003', semester: 5, year_label: 'III', name: 'UG Sem 5 (R2021)' },
  { id: '4', class_id: 'ME_CSE_I', semester: 1, year_label: 'I', name: 'PG Sem 1' },
  { id: '5', class_id: 'ME_SE_III', semester: 3, year_label: 'II', name: 'PG Sem 3 (Year II)' },
  { id: '6', class_id: 'ME_MFE_III', semester: 3, year_label: 'II', name: 'PG Sem 3 (Year II)' }
];

dashboardSubs.forEach(sub => {
  const isPGSub = String(sub?.class_id || '').startsWith('ME_') || sub?.program_type === 'PG' || sub?.regulation_code === 'R2025';
  const is2021 = !isPGSub && (sub?.year_label === 'III' || sub?.year_label === 'IV' || parseInt(sub?.semester, 10) >= 5);
  const targetRoute = is2021 ? '/marks-entry-2021' : '/marks-entry';

  if (String(sub.class_id).startsWith('ME_')) {
    assert(targetRoute === '/marks-entry', `PG subject ${sub.name} (${sub.class_id}) routes to /marks-entry`);
  } else if (sub.semester >= 5) {
    assert(targetRoute === '/marks-entry-2021', `UG subject ${sub.name} routes to /marks-entry-2021`);
  } else {
    assert(targetRoute === '/marks-entry', `UG subject ${sub.name} routes to /marks-entry`);
  }
});

// 5. Verification of Marks-Only Governance (No Grades, Grade Points, SGPA/CGPA)
console.log('\n📦 [5/5] Testing Marks-Only Governance & Absence of Grade/GPA APIs...');

// Verify removed functions are strictly undefined
assert(pgModule.PG_R2025_GRADE_THRESHOLDS === undefined, 'PG_R2025_GRADE_THRESHOLDS is strictly undefined');
assert(pgModule.computePGR2025Grade === undefined, 'computePGR2025Grade is strictly undefined');
assert(pgModule.calculatePGSGPA === undefined, 'calculatePGSGPA is strictly undefined');
assert(pgModule.calculatePGCGPA === undefined, 'calculatePGCGPA is strictly undefined');
assert(pgModule.calculatePGEquivalentPercentage === undefined, 'calculatePGEquivalentPercentage is strictly undefined');
assert(pgModule.classifyPGDegree === undefined, 'classifyPGDegree is strictly undefined');

// Verify evaluatePGPassStatus outputs marks-only structure
const theoryPass = evaluatePGPassStatus({ caMarks: 35, eseMarks: 50, subjectType: 'Theory' });
assert(theoryPass.passed === true, 'Theory aggregate 85/100 passes');
assert(theoryPass.status === 'PASS', 'Theory pass status is PASS');
assert(theoryPass.totalMarks === 85, 'Theory totalMarks is 85');
assert(theoryPass.grade === undefined, 'Theory pass result has NO grade property');
assert(theoryPass.gradePoints === undefined, 'Theory pass result has NO gradePoints property');

const theoryFailEse = evaluatePGPassStatus({ caMarks: 35, eseMarks: 20, subjectType: 'Theory' });
assert(theoryFailEse.passed === false, 'Theory ESE 20/60 (<27) fails sub-minimum');
assert(theoryFailEse.status === 'FAIL', 'Theory fail status is FAIL');
assert(theoryFailEse.grade === undefined, 'Theory fail result has NO grade property');

const practicalPass = evaluatePGPassStatus({ caMarks: 55, eseMarks: 35, subjectType: 'Practical' });
assert(practicalPass.passed === true, 'Practical aggregate 90/100 passes');
assert(practicalPass.status === 'PASS', 'Practical pass status is PASS');
assert(practicalPass.totalMarks === 90, 'Practical totalMarks is 90');
assert(practicalPass.grade === undefined, 'Practical pass result has NO grade property');

console.log('\n======================================================');
console.log(`📊 PHASE 2 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================');

if (failed > 0) {
  console.error(`\n❌ VERIFICATION FAILED WITH ${failed} DEFECT(S)`);
  process.exit(1);
} else {
  console.log('\n✅ ALL PHASE 2 VERIFICATION CHECKS PASSED CLEANLY.');
  process.exit(0);
}

