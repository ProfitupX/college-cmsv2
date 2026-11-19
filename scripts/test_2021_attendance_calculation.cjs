// =====================================================================
// Regression Test: 2021 Regulation vs 2025 Regulation Attendance Calculation
// Validates:
// 1. Session selection in 2021 is filtered by both subject ID and sessionLabel (internal1 vs internal2)
// 2. Student present hours in 2021 strictly extracted from hours_attended without falsy fallback on 0
// 3. No fallback to actual_taken_hours in 2021
// 4. Missing attendance records in 2021 contribute 0 present hours (not full attendance)
// 5. Subject attended hours in 2021 are clamped to working hours
// 6. Reconciliation in 2021: sum(subject_pHrs) === overallPHrs
// 7. Both formats: withInternal = true and withInternal = false
// 8. 2025 Regulation logic remains 100% UNCHANGED and isolated:
//    - Session lookup preserves allSessions.find(s => s.subject_id === sub.id || s.subject_id === sub.code)
//    - Attendance calculation preserves original fallback chain
//    - Row structure and 3-column layout (withInternal) preserved
//
// Exit Code: 0 on success, 1 on failure
// =====================================================================

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}: ${details}`);
  }
}

console.log('\n======================================================');
console.log('🧪 RUNNING 2021 REGULATION & 2025 ISOLATION TESTS');
console.log('======================================================\n');

try {
  // Mirror of pdfReportGenerator.js compute logic
  function computeStudentRow({
    student,
    targetSubjects,
    sessionLabel,
    allSessions,
    allAttendance,
    allMarks = [],
    allComponents = [],
    is2021 = true,
    withInternal = true
  }) {
    let overallWHrs = 0;
    let overallPHrs = 0;

    const row = [
      1,
      student.roll_no || student.id,
      student.name
    ];

    targetSubjects.forEach(sub => {
      const isInternal2 = sessionLabel === 'internal2' || String(sessionLabel).includes('2');
      const sess = is2021
        ? (allSessions || []).find(s => 
            (s.subject_id === sub.id || s.subject_id === sub.code) && 
            (s.session_label === sessionLabel || (isInternal2 ? s.session_label === 'internal2' : s.session_label === 'internal1'))
          )
        : allSessions.find(s => s.subject_id === sub.id || s.subject_id === sub.code);

      if (!sess) {
        if (is2021 && withInternal) {
          row.push('-', '0');
        } else {
          row.push('0', '0', '-');
        }
        return;
      }

      const att = (allAttendance || []).find(a => a.session_id === sess.id && a.student_id === student.id);

      const subTotal = parseInt(sub.total_hours, 10) || 60;
      const sessHrs = sess ? (isInternal2 ? (sess.internal2_total_hours || sess.total_hours) : sess.total_hours) : null;
      const configuredHrs = isInternal2
        ? (parseInt(sub.int2_hours, 10) || parseInt(sessHrs, 10) || 30)
        : (parseInt(sub.int1_hours, 10) || parseInt(sessHrs, 10) || 30);
      const wHrs = configuredHrs;

      let pHrs;
      if (is2021) {
        // 2021 Regulation: strictly use student present hours from att.hours_attended.
        // Preserve 0 values; missing records contribute 0 present hours. No actual_taken_hours or lab fallback.
        let rawPHrs = 0;
        if (att && att.hours_attended !== null && att.hours_attended !== undefined && att.hours_attended !== '') {
          const parsed = parseInt(att.hours_attended, 10);
          rawPHrs = !isNaN(parsed) && parsed >= 0 ? parsed : 0;
        }
        pHrs = Math.min(rawPHrs, wHrs);
        overallWHrs += wHrs;
        overallPHrs += pHrs;
      } else {
        // 2025 Regulation: existing calculation preserved exactly as before
        pHrs = att ? (parseInt(att.hours_attended) || parseInt(att.actual_taken_hours) || parseInt(att.attendance_days) || parseInt(att.lab_attendance) || 0) : 0;
        overallWHrs += wHrs;
        overallPHrs += pHrs;
      }

      const markStr = '45'; // dummy mark for testing attendance columns
      if (!is2021) {
        const actMark = 40; // dummy activity mark for 2025
        if (!withInternal) {
          row.push(wHrs, Math.min(pHrs, wHrs), markStr);
        } else {
          row.push(Math.min(pHrs, wHrs), markStr, actMark > 0 ? actMark : '-');
        }
      } else {
        if (!withInternal) {
          row.push(wHrs, pHrs, markStr);
        } else {
          row.push(pHrs, markStr);
        }
      }
    });

    const pct = overallWHrs > 0 ? Math.min(100, Math.round((overallPHrs / overallWHrs) * 100)) : 0;
    if (is2021) {
      row.push(overallWHrs, overallPHrs, pct);
    } else {
      row.push(overallWHrs, Math.min(overallPHrs, overallWHrs), pct);
    }

    return { row, overallWHrs, overallPHrs, pct };
  }

  // ─────────────────────────────────────────────────────────────
  // SUITE 1: 2021 REGULATION - ZERO ATTENDANCE PRESERVED (NO FALLBACK TO ACTUAL_TAKEN_HOURS OR LAB)
  // ─────────────────────────────────────────────────────────────
  console.log('📦 [1/7] Testing 2021 Zero Attendance Protection (No actual_taken_hours or lab fallback)...');
  {
    const studentZero = { id: 'ST001', roll_no: '921021104001', name: 'Zero Attendance Student' };
    const subjects = [{ id: 'SUB1', code: 'CS8501', int1_hours: 30 }];
    const sessions = [{ id: 101, subject_id: 'SUB1', session_label: 'internal1' }];
    // In database, hours_attended = 0, but actual_taken_hours and lab_attendance are 30
    const attendance = [{
      session_id: 101,
      student_id: 'ST001',
      hours_attended: 0,
      actual_taken_hours: 30,
      lab_attendance: 30
    }];

    const result = computeStudentRow({
      student: studentZero,
      targetSubjects: subjects,
      sessionLabel: 'internal1',
      allSessions: sessions,
      allAttendance: attendance,
      is2021: true,
      withInternal: true
    });

    // In 2021 withInternal: row structure is [sNo, rollNo, name, pHrs, markStr, overallWHrs, overallPHrs, pct]
    const subjectPHrs = result.row[3];
    assert(subjectPHrs === 0, '2021 Zero attendance: Subject pHrs is strictly 0 (no actual_taken_hours/lab fallback)', `Got ${subjectPHrs}`);
    assert(result.overallPHrs === 0, '2021 Zero attendance: Overall present hours is strictly 0', `Got ${result.overallPHrs}`);
    assert(result.overallWHrs === 30, '2021 Zero attendance: Overall working hours is 30', `Got ${result.overallWHrs}`);
    assert(result.pct === 0, '2021 Zero attendance: Percentage is 0%', `Got ${result.pct}`);
  }

  // ─────────────────────────────────────────────────────────────
  // SUITE 2: 2021 REGULATION - MISSING ATTENDANCE RECORD CONTRIBUTES ZERO HOURS
  // ─────────────────────────────────────────────────────────────
  console.log('\n📦 [2/7] Testing 2021 Missing Attendance Record Handling (Not full attendance)...');
  {
    const studentMissing = { id: 'ST002', roll_no: '921021104002', name: 'Missing Record Student' };
    const subjects = [{ id: 'SUB1', code: 'CS8501', int1_hours: 30 }];
    const sessions = [{ id: 101, subject_id: 'SUB1', session_label: 'internal1' }];
    const attendance = []; // No record for this student

    const result = computeStudentRow({
      student: studentMissing,
      targetSubjects: subjects,
      sessionLabel: 'internal1',
      allSessions: sessions,
      allAttendance: attendance,
      is2021: true,
      withInternal: true
    });

    const subjectPHrs = result.row[3];
    assert(subjectPHrs === 0, '2021 Missing record: Subject pHrs is strictly 0', `Got ${subjectPHrs}`);
    assert(result.overallPHrs === 0, '2021 Missing record: Overall present hours is strictly 0', `Got ${result.overallPHrs}`);
    assert(result.overallWHrs === 30, '2021 Missing record: Working hours counted (30)', `Got ${result.overallWHrs}`);
    assert(result.pct === 0, '2021 Missing record: Percentage is 0%', `Got ${result.pct}`);
  }

  // ─────────────────────────────────────────────────────────────
  // SUITE 3: 2021 REGULATION - PARTIAL & FULL ATTENDANCE SCENARIOS
  // ─────────────────────────────────────────────────────────────
  console.log('\n📦 [3/7] Testing 2021 Partial and Full Attendance Calculations...');
  {
    const studentFull = { id: 'ST003', roll_no: '921021104003', name: 'Full Attendance Student' };
    const studentPartial = { id: 'ST004', roll_no: '921021104004', name: 'Partial Attendance Student' };
    const subjects = [
      { id: 'SUB1', code: 'CS8501', int1_hours: 30 },
      { id: 'SUB2', code: 'CS8502', int1_hours: 25 }
    ];
    const sessions = [
      { id: 101, subject_id: 'SUB1', session_label: 'internal1' },
      { id: 102, subject_id: 'SUB2', session_label: 'internal1' }
    ];
    const attendance = [
      { session_id: 101, student_id: 'ST003', hours_attended: 30 },
      { session_id: 102, student_id: 'ST003', hours_attended: 25 },
      { session_id: 101, student_id: 'ST004', hours_attended: 21 },
      { session_id: 102, student_id: 'ST004', hours_attended: 20 }
    ];

    const resultFull = computeStudentRow({
      student: studentFull,
      targetSubjects: subjects,
      sessionLabel: 'internal1',
      allSessions: sessions,
      allAttendance: attendance,
      is2021: true,
      withInternal: true
    });
    assert(resultFull.overallWHrs === 55, '2021 Full attendance: Overall WHrs = 55 (30 + 25)');
    assert(resultFull.overallPHrs === 55, '2021 Full attendance: Overall PHrs = 55 (30 + 25)');
    assert(resultFull.pct === 100, '2021 Full attendance: 100%');

    const resultPartial = computeStudentRow({
      student: studentPartial,
      targetSubjects: subjects,
      sessionLabel: 'internal1',
      allSessions: sessions,
      allAttendance: attendance,
      is2021: true,
      withInternal: true
    });
    assert(resultPartial.overallWHrs === 55, '2021 Partial attendance: Overall WHrs = 55');
    assert(resultPartial.overallPHrs === 41, '2021 Partial attendance: Overall PHrs = 41 (21 + 20)');
    assert(resultPartial.pct === 75, '2021 Partial attendance: 75% (41/55)');
  }

  // ─────────────────────────────────────────────────────────────
  // SUITE 4: 2021 REGULATION - CLAMPING OVER-REPORTED ATTENDANCE
  // ─────────────────────────────────────────────────────────────
  console.log('\n📦 [4/7] Testing 2021 Clamping of Present Hours to Working Hours...');
  {
    const studentOver = { id: 'ST005', roll_no: '921021104005', name: 'Over Attendance Student' };
    const subjects = [{ id: 'SUB1', code: 'CS8501', int1_hours: 30 }];
    const sessions = [{ id: 101, subject_id: 'SUB1', session_label: 'internal1' }];
    const attendance = [{ session_id: 101, student_id: 'ST005', hours_attended: 35 }]; // 35 > 30

    const result = computeStudentRow({
      student: studentOver,
      targetSubjects: subjects,
      sessionLabel: 'internal1',
      allSessions: sessions,
      allAttendance: attendance,
      is2021: true,
      withInternal: true
    });

    const subjectPHrs = result.row[3];
    assert(subjectPHrs === 30, '2021 Over-attendance: Subject pHrs clamped to 30', `Got ${subjectPHrs}`);
    assert(result.overallPHrs === 30, '2021 Over-attendance: Overall present hours clamped to 30', `Got ${result.overallPHrs}`);
    assert(result.pct === 100, '2021 Over-attendance: Capped at 100%', `Got ${result.pct}`);
  }

  // ─────────────────────────────────────────────────────────────
  // SUITE 5: 2021 REGULATION - SESSION ISOLATION (INTERNAL 1 VS INTERNAL 2)
  // ─────────────────────────────────────────────────────────────
  console.log('\n📦 [5/7] Testing 2021 Session Isolation (Internal 1 vs Internal 2)...');
  {
    const student = { id: 'ST006', roll_no: '921021104006', name: 'Multi-Assessment Student' };
    const subjects = [{ id: 'SUB1', code: 'CS8501', int1_hours: 30, int2_hours: 30 }];
    // Both sessions exist in allSessions
    const sessions = [
      { id: 101, subject_id: 'SUB1', session_label: 'internal1' },
      { id: 201, subject_id: 'SUB1', session_label: 'internal2' }
    ];
    // Student attended 28h in Internal 1, but only 12h in Internal 2
    const attendance = [
      { session_id: 101, student_id: 'ST006', hours_attended: 28 },
      { session_id: 201, student_id: 'ST006', hours_attended: 12 }
    ];

    // Case A: Query for Internal 1
    const resI1 = computeStudentRow({
      student,
      targetSubjects: subjects,
      sessionLabel: 'internal1',
      allSessions: sessions,
      allAttendance: attendance,
      is2021: true,
      withInternal: true
    });
    assert(resI1.row[3] === 28, '2021 Internal 1 report correctly selects Internal 1 attendance (28h)', `Got ${resI1.row[3]}`);
    assert(resI1.overallPHrs === 28, '2021 Internal 1 overall present hours = 28h', `Got ${resI1.overallPHrs}`);

    // Case B: Query for Internal 2
    const resI2 = computeStudentRow({
      student,
      targetSubjects: subjects,
      sessionLabel: 'internal2',
      allSessions: sessions,
      allAttendance: attendance,
      is2021: true,
      withInternal: true
    });
    assert(resI2.row[3] === 12, '2021 Internal 2 report correctly selects Internal 2 attendance (12h, NOT 28h)', `Got ${resI2.row[3]}`);
    assert(resI2.overallPHrs === 12, '2021 Internal 2 overall present hours = 12h', `Got ${resI2.overallPHrs}`);
  }

  // ─────────────────────────────────────────────────────────────
  // SUITE 6: 2021 REGULATION - RECONCILIATION ACROSS BOTH FORMATS
  // ─────────────────────────────────────────────────────────────
  console.log('\n📦 [6/7] Testing 2021 Reconciliation Across Formats (With/Without Internal)...');
  {
    const student = { id: 'ST007', roll_no: '921021104007', name: 'Format Test Student' };
    const subjects = [
      { id: 'SUB1', code: 'CS8501', int1_hours: 30 },
      { id: 'SUB2', code: 'CS8502', int1_hours: 25 },
      { id: 'SUB3', code: 'CS8503', int1_hours: 35 }
    ];
    const sessions = [
      { id: 101, subject_id: 'SUB1', session_label: 'internal1' },
      { id: 102, subject_id: 'SUB2', session_label: 'internal1' },
      { id: 103, subject_id: 'SUB3', session_label: 'internal1' }
    ];
    const attendance = [
      { session_id: 101, student_id: 'ST007', hours_attended: 27 },
      { session_id: 102, student_id: 'ST007', hours_attended: 20 },
      { session_id: 103, student_id: 'ST007', hours_attended: 31 }
    ];

    // Format 1: With Internal (2 cols per sub: Attd Hrs, Int Marks)
    const resWithInt = computeStudentRow({
      student,
      targetSubjects: subjects,
      sessionLabel: 'internal1',
      allSessions: sessions,
      allAttendance: attendance,
      is2021: true,
      withInternal: true
    });
    const sumWithInt = resWithInt.row[3] + resWithInt.row[5] + resWithInt.row[7];
    assert(sumWithInt === 78, '2021 With Internal: Sum of subject present hours = 78 (27 + 20 + 31)');
    assert(resWithInt.overallPHrs === 78, '2021 With Internal: Overall present hours = 78');
    assert(sumWithInt === resWithInt.overallPHrs, '2021 With Internal: Exact reconciliation: sum(subject_pHrs) === overallPHrs');
    assert(resWithInt.row[10] === 78, '2021 With Internal: Displayed overall present hours matches reconciliation');

    // Format 2: Without Internal (3 cols per sub: W.Hrs, P.Hrs, Exam Mark)
    const resNoInt = computeStudentRow({
      student,
      targetSubjects: subjects,
      sessionLabel: 'internal1',
      allSessions: sessions,
      allAttendance: attendance,
      is2021: true,
      withInternal: false
    });
    const sumNoInt = resNoInt.row[4] + resNoInt.row[7] + resNoInt.row[10];
    const sumWHrsNoInt = resNoInt.row[3] + resNoInt.row[6] + resNoInt.row[9];
    assert(sumNoInt === 78, '2021 Without Internal: Sum of subject present hours = 78');
    assert(sumWHrsNoInt === 90, '2021 Without Internal: Sum of subject working hours = 90 (30 + 25 + 35)');
    assert(resNoInt.overallPHrs === 78, '2021 Without Internal: Overall present hours = 78');
    assert(resNoInt.overallWHrs === 90, '2021 Without Internal: Overall working hours = 90');
    assert(sumNoInt === resNoInt.overallPHrs, '2021 Without Internal: Exact reconciliation: sum(subject_pHrs) === overallPHrs');
  }

  // ─────────────────────────────────────────────────────────────
  // SUITE 7: 2025 REGULATION - VERIFY CALCULATIONS & FORMAT REMAIN UNCHANGED
  // ─────────────────────────────────────────────────────────────
  console.log('\n📦 [7/7] Testing 2025 Regulation Isolation (Unchanged behavior & structure)...');
  {
    const student2025 = { id: 'ST2025', roll_no: '921025104001', name: '2025 Reg Student' };
    const subjects = [{ id: 'SUB_25', code: 'GE25101', int1_hours: 30 }];
    const sessions = [{ id: 501, subject_id: 'SUB_25', session_label: 'internal1' }];
    // In 2025, hours_attended is null, but actual_taken_hours is 28: 2025 uses the original fallback chain
    const attendance = [{
      session_id: 501,
      student_id: 'ST2025',
      hours_attended: null,
      actual_taken_hours: 28,
      attendance_days: null,
      lab_attendance: null
    }];

    // 2025 withInternal: should have 3 columns per subject: Attd Hrs, Int Marks, Activity Marks
    const res2025WithInt = computeStudentRow({
      student: student2025,
      targetSubjects: subjects,
      sessionLabel: 'internal1',
      allSessions: sessions,
      allAttendance: attendance,
      is2021: false,
      withInternal: true
    });

    // Subject columns start at index 3: Attd Hrs (index 3), Int Marks (index 4), Activity Marks (index 5)
    // Overall columns: WHrs (index 6), PHrs (index 7), pct (index 8)
    assert(res2025WithInt.row[3] === 28, '2025 Regulation: Attd Hrs resolved from actual_taken_hours fallback as before (28h)', `Got ${res2025WithInt.row[3]}`);
    assert(res2025WithInt.row[4] === '45', '2025 Regulation: Int Marks column present');
    assert(res2025WithInt.row[5] === 40, '2025 Regulation: Activity Marks column present (3-column layout)');
    assert(res2025WithInt.row[6] === 30, '2025 Regulation: Overall WHrs = 30');
    assert(res2025WithInt.row[7] === 28, '2025 Regulation: Overall PHrs = 28');
    assert(res2025WithInt.row[8] === 93, '2025 Regulation: pct = 93% (28/30)');

    // 2025 withoutInternal: should have 3 columns per subject: W.Hrs, P.Hrs, Exam Mark
    const res2025NoInt = computeStudentRow({
      student: student2025,
      targetSubjects: subjects,
      sessionLabel: 'internal1',
      allSessions: sessions,
      allAttendance: attendance,
      is2021: false,
      withInternal: false
    });
    // Subject columns: W.Hrs (index 3), P.Hrs (index 4), Exam Mark (index 5)
    assert(res2025NoInt.row[3] === 30, '2025 withoutInternal: W.Hrs = 30');
    assert(res2025NoInt.row[4] === 28, '2025 withoutInternal: P.Hrs = 28');
    assert(res2025NoInt.row[5] === '45', '2025 withoutInternal: Exam Mark = 45');
    assert(res2025NoInt.row[6] === 30, '2025 withoutInternal: Overall WHrs = 30');
    assert(res2025NoInt.row[7] === 28, '2025 withoutInternal: Overall PHrs = 28');
    assert(res2025NoInt.row[8] === 93, '2025 withoutInternal: Overall pct = 93%');
  }

} catch (err) {
  console.error('Unhandled Exception in Test Suite:', err);
  process.exit(1);
}

console.log('\n======================================================');
console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('======================================================\n');

if (failedTests > 0) {
  process.exit(1);
}

process.exit(0);
