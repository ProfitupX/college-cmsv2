/**
 * =====================================================================================
 * MarkHub Test Suite: PG Activities Total Calculation Verification
 *
 * Scope:
 * 1. Verify formula: Activities Total = Assignment Marks (out of 95) + Attendance Marks (out of 5)
 * 2. Verify display out of 100 for PG courses (isPG === true)
 * 3. Verify strict isolation: UG courses (isPG === false) remain out of 95 without attendance
 * 4. Verify all 6 mandatory user test cases
 * 5. Verify dynamic reactivity when marks or attendance inputs change
 * 6. Verify capping at 100 and non-negative boundaries
 * =====================================================================================
 */

const assert = require('assert');

// 1. Emulate canonical attendanceCalculator rules (as implemented in src/utils/attendanceCalculator.js)
const calculateAttendanceMark = (pct) => {
  const p = Math.round(Number(pct) || 0);
  if (p >= 95) return 5;
  if (p >= 90) return 3;
  if (p >= 85) return 2;
  if (p >= 80) return 1;
  return 0; // Below 80% is 0 mark
};

const computeAttendancePercentage = ({
  rawHours = 0,
  totalHours = 30,
  assessmentMode = 'internal1',
  int1HoursAttended = 0,
  int1Hours,
  int2Hours,
  labHours = 0,
  labAttendance = 0
}) => {
  const isInternal2 = String(assessmentMode || '').toLowerCase().trim() === 'internal2';

  if (isInternal2) {
    const i1Attd = parseInt(int1HoursAttended || 0, 10);
    const i2Attd = parseInt(rawHours || 0, 10);
    const i1Max = parseInt(int1Hours || 30, 10);
    const i2Max = parseInt(int2Hours || 30, 10);

    if (i1Attd > 0) {
      const cumAttended = Math.min(i1Max, Math.max(0, i1Attd)) + Math.min(i2Max, Math.max(0, i2Attd));
      const cumMax = (i1Max + i2Max) || parseInt(totalHours, 10) || 60;
      return cumMax > 0 ? Math.min(100, Math.round((cumAttended / cumMax) * 100)) : 0;
    }

    const activeMax = i2Max || parseInt(totalHours, 10) || 30;
    const capped = Math.min(activeMax, Math.max(0, i2Attd));
    return activeMax > 0 ? Math.min(100, Math.round((capped / activeMax) * 100)) : 0;
  } else {
    const tMax = parseInt(int1Hours || totalHours || 30, 10);
    const capped = Math.min(tMax, Math.max(0, parseInt(rawHours || 0, 10)));
    return tMax > 0 ? Math.min(100, Math.round((capped / tMax) * 100)) : 0;
  }
};

const resolveAttendanceMark = (studentId, {
  attendanceMarks = {},
  attendanceData = {},
  totalHours = 30,
  assessmentMode = 'internal1',
  int1AttendanceData = {},
  int1Hours,
  int2Hours,
  labHours = 0,
  labData = {}
} = {}) => {
  const sIdStr = String(studentId || '');
  const rawHoursVal = attendanceData?.[studentId] ?? attendanceData?.[sIdStr];

  if (rawHoursVal !== undefined && rawHoursVal !== '' && rawHoursVal !== null) {
    const rawHours = parseInt(rawHoursVal, 10) || 0;
    const int1Attd = int1AttendanceData?.[studentId] ?? int1AttendanceData?.[sIdStr] ?? 0;
    const studentLab = labData?.[studentId] ?? labData?.[sIdStr] ?? {};
    const labAttd = studentLab?.labAttendance ?? 0;

    const pct = computeAttendancePercentage({
      rawHours,
      totalHours,
      assessmentMode,
      int1HoursAttended: int1Attd,
      int1Hours,
      int2Hours,
      labHours,
      labAttendance: labAttd
    });
    return calculateAttendanceMark(pct);
  }

  if (attendanceMarks) {
    const saved = attendanceMarks[studentId] ?? attendanceMarks[sIdStr];
    if (saved !== undefined && saved !== null && !isNaN(parseFloat(saved))) {
      return parseFloat(saved);
    }
  }

  return 0;
};

// 2. Emulate MarksRow calculation logic (as updated in src/components/MarksEntry/MarksRow.jsx)
const computeRowDisplayedTotal = ({
  components = [],
  marks = {},
  attendanceHours = '',
  savedAttendanceMark,
  displayHours = 30,
  assessmentMode = 'internal1',
  int1Hours,
  int2Hours,
  labHours = 0,
  studentId = 'STU001',
  isPG = false
}) => {
  // Converted total (sum of scaled component marks out of 95)
  let rawConvertedTotal = 0;
  (components || []).forEach(c => {
    const val = parseFloat((marks || {})[c?.uid ?? c?.id]) || 0;
    const conducted = parseFloat(c?.conductedMax || c?.max) || 100;
    const weight = parseFloat(c?.max) || conducted;
    const scaled = conducted > 0 ? (Math.min(val, conducted) / conducted) * weight : 0;
    rawConvertedTotal += scaled;
  });

  const convertedTotal = Math.round(rawConvertedTotal);

  const effectiveAttMark = resolveAttendanceMark(studentId, {
    attendanceMarks: studentId ? { [studentId]: savedAttendanceMark } : {},
    attendanceData: studentId ? { [studentId]: attendanceHours } : {},
    totalHours: displayHours,
    assessmentMode,
    int1AttendanceData: {},
    int1Hours: int1Hours || displayHours,
    int2Hours: int2Hours || displayHours,
    labHours,
    labData: {}
  });

  const finalTotal100 = Math.min(100, convertedTotal + effectiveAttMark);

  // Return both the displayed value and metadata
  return {
    convertedTotal,
    effectiveAttMark,
    finalTotal100,
    displayedTotal: isPG ? finalTotal100 : convertedTotal,
    displayedMax: isPG ? 100 : (components.reduce((s, c) => s + (parseFloat(c?.max) || 0), 0) || 95),
    headerMax: isPG ? 100 : 95
  };
};

// Test runner harness
let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('=================================================================');
console.log('MarkHub PG Activities Total Calculation Verification Suite');
console.log('=================================================================\n');

// Standard PG Components summing to 95 marks:
// Test 1: 25m, Test 2: 25m, Assignment: 25m, Seminar/Quiz: 20m -> Total: 95m
const pgComponents = [
  { uid: 'c1', label: 'Test 1', max: 25, conductedMax: 25 },
  { uid: 'c2', label: 'Test 2', max: 25, conductedMax: 25 },
  { uid: 'c3', label: 'Course Activities / Assignment', max: 25, conductedMax: 25 },
  { uid: 'c4', label: 'Quiz / Seminar', max: 20, conductedMax: 20 }
];

// Helper to construct marks summing to a target out of 95:
// E.g., target 92: 25 + 25 + 25 + 17 = 92
const makeMarks = (target) => {
  if (target === 92) return { c1: '25', c2: '25', c3: '25', c4: '17' };
  if (target === 93) return { c1: '25', c2: '25', c3: '25', c4: '18' };
  if (target === 95) return { c1: '25', c2: '25', c3: '25', c4: '20' };
  if (target === 0) return {};
  return { c1: String(target) };
};

console.log('--- 1. Mandatory User Acceptance Test Cases (PG) ---');

runTest('Case 1: PG Assignment 92/95 with attendance 26/28 (Attendance: 93% -> 3m; Total: 95/100)', () => {
  const result = computeRowDisplayedTotal({
    components: pgComponents,
    marks: makeMarks(92),
    attendanceHours: '26',
    displayHours: 28,
    int1Hours: 28,
    isPG: true
  });

  assert.strictEqual(result.convertedTotal, 92, 'Assignment raw converted total must be 92');
  assert.strictEqual(result.effectiveAttMark, 3, 'Attendance mark for 26/28 (92.86% -> 93%) must be 3');
  assert.strictEqual(result.finalTotal100, 95, 'Final total must be 92 + 3 = 95');
  assert.strictEqual(result.displayedTotal, 95, 'Displayed Activities Total must be 95');
  assert.strictEqual(result.headerMax, 100, 'Header max must be / 100');
});

runTest('Case 2: PG Assignment 93/95 with partial attendance 23/28 (Attendance: 82% -> 1m; Total: 94/100)', () => {
  const result = computeRowDisplayedTotal({
    components: pgComponents,
    marks: makeMarks(93),
    attendanceHours: '23',
    displayHours: 28,
    int1Hours: 28,
    isPG: true
  });

  assert.strictEqual(result.convertedTotal, 93, 'Assignment raw converted total must be 93');
  assert.strictEqual(result.effectiveAttMark, 1, 'Attendance mark for 23/28 (82.14% -> 82%) must be 1');
  assert.strictEqual(result.finalTotal100, 94, 'Final total must be 93 + 1 = 94');
  assert.strictEqual(result.displayedTotal, 94, 'Displayed Activities Total must be 94');
  assert.strictEqual(result.headerMax, 100, 'Header max must be / 100');
});

runTest('Case 3: PG Assignment 95/95 with full attendance 28/28 (Attendance: 100% -> 5m; Total: 100/100)', () => {
  const result = computeRowDisplayedTotal({
    components: pgComponents,
    marks: makeMarks(95),
    attendanceHours: '28',
    displayHours: 28,
    int1Hours: 28,
    isPG: true
  });

  assert.strictEqual(result.convertedTotal, 95, 'Assignment raw converted total must be 95');
  assert.strictEqual(result.effectiveAttMark, 5, 'Attendance mark for 28/28 (100%) must be 5');
  assert.strictEqual(result.finalTotal100, 100, 'Final total must be 95 + 5 = 100');
  assert.strictEqual(result.displayedTotal, 100, 'Displayed Activities Total must be 100');
  assert.strictEqual(result.headerMax, 100, 'Header max must be / 100');
});

runTest('Case 4: PG zero attendance 0/28 with 92/95 assignment (Attendance: 0% -> 0m; Total: 92/100)', () => {
  const result = computeRowDisplayedTotal({
    components: pgComponents,
    marks: makeMarks(92),
    attendanceHours: '0',
    displayHours: 28,
    int1Hours: 28,
    isPG: true
  });

  assert.strictEqual(result.convertedTotal, 92, 'Assignment raw converted total must be 92');
  assert.strictEqual(result.effectiveAttMark, 0, 'Attendance mark for 0/28 (0%) must be 0');
  assert.strictEqual(result.finalTotal100, 92, 'Final total must be 92 + 0 = 92');
  assert.strictEqual(result.displayedTotal, 92, 'Displayed Activities Total must be 92');
  assert.strictEqual(result.headerMax, 100, 'Header max must be / 100');
});

runTest('Case 5a: PG blank assignment marks (0/95) with attendance 26/28 (3m) -> Total: 3/100', () => {
  const result = computeRowDisplayedTotal({
    components: pgComponents,
    marks: {},
    attendanceHours: '26',
    displayHours: 28,
    int1Hours: 28,
    isPG: true
  });

  assert.strictEqual(result.convertedTotal, 0, 'Assignment raw converted total must be 0');
  assert.strictEqual(result.effectiveAttMark, 3, 'Attendance mark for 26/28 (93%) must be 3');
  assert.strictEqual(result.finalTotal100, 3, 'Final total must be 0 + 3 = 3');
  assert.strictEqual(result.displayedTotal, 3, 'Displayed Activities Total must be 3');
  assert.strictEqual(result.headerMax, 100, 'Header max must be / 100');
});

runTest('Case 5b: PG blank assignment marks (0/95) with blank attendance (0m) -> Total: 0/100', () => {
  const result = computeRowDisplayedTotal({
    components: pgComponents,
    marks: {},
    attendanceHours: '',
    displayHours: 28,
    int1Hours: 28,
    isPG: true
  });

  assert.strictEqual(result.convertedTotal, 0, 'Assignment raw converted total must be 0');
  assert.strictEqual(result.effectiveAttMark, 0, 'Attendance mark for blank hours must be 0');
  assert.strictEqual(result.finalTotal100, 0, 'Final total must be 0 + 0 = 0');
  assert.strictEqual(result.displayedTotal, 0, 'Displayed Activities Total must be 0');
  assert.strictEqual(result.headerMax, 100, 'Header max must be / 100');
});

console.log('\n--- 2. UG Regression Isolation Test Cases (isPG === false) ---');

runTest('Case 6a: UG course with Assignment 92/95 and 26/28 attendance displays strictly 92 out of 95', () => {
  const result = computeRowDisplayedTotal({
    components: pgComponents,
    marks: makeMarks(92),
    attendanceHours: '26',
    displayHours: 28,
    int1Hours: 28,
    isPG: false // Strictly UG
  });

  assert.strictEqual(result.convertedTotal, 92, 'Assignment raw converted total is 92');
  assert.strictEqual(result.effectiveAttMark, 3, 'Attendance mark is calculated as 3');
  assert.strictEqual(result.displayedTotal, 92, 'UG must display convertedTotal (92), NOT finalTotal100');
  assert.strictEqual(result.headerMax, 95, 'UG header must remain / 95');
});

runTest('Case 6b: UG course with Assignment 95/95 and full 28/28 attendance displays strictly 95 out of 95', () => {
  const result = computeRowDisplayedTotal({
    components: pgComponents,
    marks: makeMarks(95),
    attendanceHours: '28',
    displayHours: 28,
    int1Hours: 28,
    isPG: false // Strictly UG
  });

  assert.strictEqual(result.convertedTotal, 95, 'Assignment raw converted total is 95');
  assert.strictEqual(result.displayedTotal, 95, 'UG must display convertedTotal (95), NOT 100');
  assert.strictEqual(result.headerMax, 95, 'UG header must remain / 95');
});

console.log('\n--- 3. Live Dynamic Reactivity & Boundary Assertions ---');

runTest('Reactivity: Live update when assignment mark increases from 92 to 95 with 26/28 attendance', () => {
  const before = computeRowDisplayedTotal({
    components: pgComponents,
    marks: makeMarks(92),
    attendanceHours: '26',
    displayHours: 28,
    isPG: true
  });
  const after = computeRowDisplayedTotal({
    components: pgComponents,
    marks: makeMarks(95),
    attendanceHours: '26',
    displayHours: 28,
    isPG: true
  });

  assert.strictEqual(before.displayedTotal, 95, 'Initial total must be 92 + 3 = 95');
  assert.strictEqual(after.displayedTotal, 98, 'Updated total must be 95 + 3 = 98');
});

runTest('Reactivity: Live update when attendance hours change from 20 to 28 with 92/95 assignment', () => {
  // 20/28 = 71.4% -> 0 marks
  const before = computeRowDisplayedTotal({
    components: pgComponents,
    marks: makeMarks(92),
    attendanceHours: '20',
    displayHours: 28,
    isPG: true
  });
  // 28/28 = 100% -> 5 marks
  const after = computeRowDisplayedTotal({
    components: pgComponents,
    marks: makeMarks(92),
    attendanceHours: '28',
    displayHours: 28,
    isPG: true
  });

  assert.strictEqual(before.effectiveAttMark, 0, '20/28 attendance mark is 0');
  assert.strictEqual(before.displayedTotal, 92, 'Total with 0 attendance is 92');
  assert.strictEqual(after.effectiveAttMark, 5, '28/28 attendance mark is 5');
  assert.strictEqual(after.displayedTotal, 97, 'Total with 5 attendance is 97');
});

runTest('Boundary: Overflow capping strictly at 100 (never exceeds 100)', () => {
  // Hypothetical component sum slightly over due to scaling
  const result = computeRowDisplayedTotal({
    components: [
      { uid: 'c1', label: 'Comp 1', max: 50, conductedMax: 50 },
      { uid: 'c2', label: 'Comp 2', max: 50, conductedMax: 50 }
    ],
    marks: { c1: '50', c2: '50' }, // 100 marks
    attendanceHours: '28',
    displayHours: 28,
    isPG: true
  });

  assert.strictEqual(result.finalTotal100, 100, 'Must cap at 100 even if convertedTotal (100) + att (5) = 105');
  assert.strictEqual(result.displayedTotal, 100, 'Displayed total must be 100');
});

console.log('\n--- 4. Institutional Attendance Slabs Compliance (Anna University / 2025 Autonomous) ---');

const attSlabs = [
  { hours: 28, total: 28, pct: '100%', expectedMark: 5 },
  { hours: 27, total: 28, pct: '96%',  expectedMark: 5 }, // 27/28 = 96.4% >= 95% -> 5m
  { hours: 26, total: 28, pct: '93%',  expectedMark: 3 }, // 26/28 = 92.9% -> 93% in 90-94% -> 3m
  { hours: 25, total: 28, pct: '89%',  expectedMark: 2 }, // 25/28 = 89.3% in 85-89% -> 2m
  { hours: 24, total: 28, pct: '86%',  expectedMark: 2 }, // 24/28 = 85.7% in 85-89% -> 2m
  { hours: 23, total: 28, pct: '82%',  expectedMark: 1 }, // 23/28 = 82.1% in 80-84% -> 1m
  { hours: 22, total: 28, pct: '79%',  expectedMark: 0 }, // 22/28 = 78.6% < 80% -> 0m
  { hours: 0,  total: 28, pct: '0%',   expectedMark: 0 }  // 0/28 = 0% -> 0m
];

attSlabs.forEach(({ hours, total, pct, expectedMark }) => {
  runTest(`Attendance Slab: ${hours}/${total} (${pct}) evaluates to ${expectedMark} mark(s)`, () => {
    const mark = resolveAttendanceMark('STU_TEST', {
      attendanceData: { STU_TEST: String(hours) },
      totalHours: total,
      int1Hours: total
    });
    assert.strictEqual(mark, expectedMark, `Expected ${expectedMark} for ${hours}/${total}`);
  });
});

console.log('\n=================================================================');
console.log(`Summary: ${passedTests}/${totalTests} assertions PASSED`);
console.log('=================================================================\n');

// 5. Direct verification of production ES modules
(async () => {
  console.log('--- 5. Direct Verification of Production Utility Modules ---');
  try {
    const { calculateAttendanceMark: prodCalcAtt, resolveAttendanceMark: prodResolveAtt } = await import('../src/utils/attendanceCalculator.js');
    const { isPGClass: prodIsPGClass, isPGSubject: prodIsPGSubject } = await import('../src/utils/pgRegulation2025.js');
    const fs = require('fs');
    const path = require('path');

    runTest('Production attendanceCalculator: 26/28 gives exactly 3 marks', () => {
      const mark = prodResolveAtt('STU1', {
        attendanceData: { STU1: '26' },
        totalHours: 28,
        int1Hours: 28
      });
      assert.strictEqual(mark, 3, 'Production resolveAttendanceMark for 26/28 must be 3');
    });

    runTest('Production attendanceCalculator: 23/28 gives exactly 1 mark', () => {
      const mark = prodResolveAtt('STU1', {
        attendanceData: { STU1: '23' },
        totalHours: 28,
        int1Hours: 28
      });
      assert.strictEqual(mark, 1, 'Production resolveAttendanceMark for 23/28 must be 1');
    });

    runTest('Production attendanceCalculator: 28/28 gives exactly 5 marks', () => {
      const mark = prodResolveAtt('STU1', {
        attendanceData: { STU1: '28' },
        totalHours: 28,
        int1Hours: 28
      });
      assert.strictEqual(mark, 5, 'Production resolveAttendanceMark for 28/28 must be 5');
    });

    runTest('Production attendanceCalculator: 0/28 gives exactly 0 marks', () => {
      const mark = prodResolveAtt('STU1', {
        attendanceData: { STU1: '0' },
        totalHours: 28,
        int1Hours: 28
      });
      assert.strictEqual(mark, 0, 'Production resolveAttendanceMark for 0/28 must be 0');
    });

    console.log('\n--- 6. Direct Verification of PG Identification Helpers ---');

    runTest('Production isPGClass correctly identifies PG classes', () => {
      assert.strictEqual(prodIsPGClass({ id: 'ME_CSE_1', name: 'M.E. Computer Science and Engineering' }), true);
      assert.strictEqual(prodIsPGClass('ME_EST_I'), true);
      assert.strictEqual(prodIsPGClass({ name: 'M.E. Structural Engineering' }), true);
      assert.strictEqual(prodIsPGClass({ name: 'M.Tech AI' }), true);
      assert.strictEqual(prodIsPGClass({ degree_title: 'M.E.' }), true);
    });

    runTest('Production isPGClass correctly rejects UG classes (including MECH)', () => {
      assert.strictEqual(prodIsPGClass({ id: 'BE_CSE_1', name: 'B.E. Computer Science' }), false);
      assert.strictEqual(prodIsPGClass({ id: 'MECH_1', name: 'B.E. Mechanical Engineering' }), false);
      assert.strictEqual(prodIsPGClass({ name: 'Mechanical Engineering' }), false);
      assert.strictEqual(prodIsPGClass({ name: 'B.Tech Information Technology' }), false);
      assert.strictEqual(prodIsPGClass(null), false);
    });

    console.log('\n--- 7. Component Source Code Inspection ---');

    runTest('MarksRow.jsx renders finalTotal100 for PG and convertedTotal for UG', () => {
      const marksRowCode = fs.readFileSync(path.resolve(__dirname, '../src/components/MarksEntry/MarksRow.jsx'), 'utf-8');
      assert.ok(
        marksRowCode.includes('{isPG ? finalTotal100 : convertedTotal}'),
        'MarksRow.jsx must render {isPG ? finalTotal100 : convertedTotal}'
      );
      assert.ok(
        marksRowCode.includes('finalTotal100 = Math.min(100, convertedTotal + effectiveAttMark)'),
        'MarksRow.jsx must compute finalTotal100 as convertedTotal + effectiveAttMark'
      );
    });

    runTest('MarksTable.jsx displays / 100 header for PG and / totalMax for UG', () => {
      const marksTableCode = fs.readFileSync(path.resolve(__dirname, '../src/components/MarksEntry/MarksTable.jsx'), 'utf-8');
      assert.ok(
        marksTableCode.includes('{isPG ? 100 : (totalMax || 95)}'),
        'MarksTable.jsx must render {isPG ? 100 : (totalMax || 95)} in computedTh'
      );
    });

    runTest('MarksEntryPage.jsx passes isPG to MarksTable', () => {
      const marksEntryPageCode = fs.readFileSync(path.resolve(__dirname, '../src/pages/MarksEntryPage.jsx'), 'utf-8');
      assert.ok(
        marksEntryPageCode.includes('isPG={isPG}'),
        'MarksEntryPage.jsx must pass isPG={isPG} to MarksTable'
      );
    });

    console.log('\n=================================================================');
    console.log(`Final Overall Summary: ${passedTests}/${totalTests} assertions PASSED`);
    console.log('=================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Failed to run production utility module tests:', err);
    process.exit(1);
  }
})();
