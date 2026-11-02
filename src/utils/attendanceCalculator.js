/**
 * Single Shared Canonical Attendance Mark Calculation Source
 * 
 * Rules (Anna University & 2025 Autonomous Regulation):
 *  >= 95% -> 5 marks
 *  90% to 94% -> 3 marks
 *  85% to 89% -> 2 marks
 *  80% to 84% -> 1 mark
 *  < 80%     -> 0 marks
 * 
 * Used identically across:
 * 1. MarksEntry display (MarksRow / MarksTable)
 * 2. Report Preview (ReportPreviewModal)
 * 3. PDF Generator (pdfReportGenerator)
 * 4. Excel Generator (excelReportGenerator)
 * 5. API Response Adapter (api.js / backend marks.js)
 */

export const calculateAttendanceMark = (pct) => {
  const p = Math.round(Number(pct) || 0);
  if (p >= 95) return 5;
  if (p >= 90) return 3;
  if (p >= 85) return 2;
  if (p >= 80) return 1;
  return 0; // Below 80% is 0 mark
};

export const computeAttendancePercentage = ({
  rawHours = 0,
  totalHours = 30,
  assessmentMode = 'internal1',
  int1HoursAttended = 0,
  int1Hours = 30,
  int2Hours = 30,
  labHours = 0,
  labAttendance = 0
}) => {
  const isInternal2 = String(assessmentMode || '').toLowerCase().trim() === 'internal2';

  if (isInternal2) {
    const i1Attd = parseInt(int1HoursAttended || 0, 10);
    const i2Attd = parseInt(rawHours || 0, 10);
    const lAttd  = parseInt(labAttendance || 0, 10);

    const i1Max = parseInt(int1Hours || 30, 10);
    const i2Max = parseInt(int2Hours || 30, 10);
    const lMax  = parseInt(labHours || 0, 10);

    const cumAttended = Math.min(i1Max, Math.max(0, i1Attd)) +
                        Math.min(i2Max, Math.max(0, i2Attd)) +
                        Math.min(lMax, Math.max(0, lAttd));

    const cumMax = (i1Max + i2Max + lMax) || parseInt(totalHours, 10) || 60;
    return cumMax > 0 ? Math.min(100, Math.round((cumAttended / cumMax) * 100)) : 0;
  } else {
    // Internal 1:
    const tMax = parseInt(int1Hours || totalHours || 30, 10);
    const capped = Math.min(tMax, Math.max(0, parseInt(rawHours || 0, 10)));
    return tMax > 0 ? Math.min(100, Math.round((capped / tMax) * 100)) : 0;
  }
};

export const computeStudentAttendanceMark = (params) => {
  const pct = computeAttendancePercentage(params);
  return calculateAttendanceMark(pct);
};

/**
 * Resolves the attendance mark for a specific student.
 * 
 * IMPORTANT:
 * If the backend already provided a calculated `attendance_mark` (stored in `attendanceMarks[studentId]`),
 * that value MUST BE RETURNED DIRECTLY (including 0!).
 * Recalculation only occurs if the student has no stored attendance mark yet (e.g. freshly typed hours).
 */
export const resolveAttendanceMark = (studentId, {
  attendanceMarks = {},
  attendanceData = {},
  totalHours = 30,
  assessmentMode = 'internal1',
  int1AttendanceData = {},
  int1Hours = 30,
  int2Hours = 30,
  labHours = 0,
  labData = {}
} = {}) => {
  // 1. Direct Backend Source of Truth:
  // If attendanceMarks has a value for this student (e.g. 0, 1, 2, 3, 5), USE IT.
  if (attendanceMarks && studentId && attendanceMarks[studentId] !== undefined && attendanceMarks[studentId] !== null) {
    const parsed = parseFloat(attendanceMarks[studentId]);
    if (!isNaN(parsed)) return parsed;
  }

  // Also check string / numeric ID variations
  const sIdStr = String(studentId);
  if (attendanceMarks && attendanceMarks[sIdStr] !== undefined && attendanceMarks[sIdStr] !== null) {
    const parsed = parseFloat(attendanceMarks[sIdStr]);
    if (!isNaN(parsed)) return parsed;
  }

  // 2. Fallback / Live input calculation using exact shared canonical formula:
  const rawHours = attendanceData?.[studentId] ?? attendanceData?.[sIdStr] ?? 0;
  const int1Attd = int1AttendanceData?.[studentId] ?? int1AttendanceData?.[sIdStr] ?? 0;
  const studentLab = labData?.[studentId] ?? labData?.[sIdStr] ?? {};
  const labAttd = studentLab?.labAttendance ?? 0;

  return computeStudentAttendanceMark({
    rawHours,
    totalHours,
    assessmentMode,
    int1HoursAttended: int1Attd,
    int1Hours,
    int2Hours,
    labHours,
    labAttendance: labAttd
  });
};
