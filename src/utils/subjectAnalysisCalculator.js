import { isPGClass, isPGSubject } from './pgRegulation2025.js';
import { resolveAuthoritativeRegulation } from './regulationResolver.js';
import { resolveAttendanceMark } from './attendanceCalculator.js';

/**
 * Shared authoritative calculation engine for Subject Analysis Report
 * Guarantees 100% mathematical parity across:
 * 1. Live Modal Preview (ReportPreviewModal.jsx)
 * 2. Official PDF Generation (generateSubjectAnalysisPDF)
 * 3. Official Excel Export (exportSubjectAnalysisExcel)
 */
export function calculateSubjectAnalysis({
  subject,
  classObj,
  students = [],
  marksData = {},
  allMarks = [],
  components = [],
  attendanceData = {},
  attendanceMarks = {},
  internalExamData = {},
  labData = {},
  assessmentMode = 'internal1',
  totalHours = 0,
  int1Hours,
  int2Hours,
  labHours,
  int1AttendanceData = {},
  regulation = null
}) {
  const isPG = isPGClass(classObj) || isPGSubject(subject, classObj);
  const resolvedReg = resolveAuthoritativeRegulation({
    classObj,
    subject,
    regulation,
    assessmentMode,
    batch: classObj?.batch,
    isPG,
    allowClientFallback: true
  });

  const is2021 = resolvedReg === '2021';
  const isLabType = ['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab'].includes(subject?.type || '');
  const ciaMax = isLabType ? 50 : 40;
  const examConvertedMax = isLabType ? 50 : 60;

  const analysisPrescribedHrs = parseInt(
    totalHours ||
    ((assessmentMode === 'internal2')
      ? (subject?.int2_hours || int2Hours || 30)
      : (subject?.int1_hours || int1Hours || 30)) ||
    30,
    10
  );

  const gradeCounts = { U: 0, E: 0, D: 0, C: 0, B: 0, A: 0, S: 0 };
  let appeared = 0;
  let passed = 0;
  let failed = 0;
  let absent = 0;
  let maxMark = 0;
  let minMark = 100;
  let totalScore = 0;

  const activeMarksData = (marksData && Object.keys(marksData).length > 0)
    ? marksData
    : ((allMarks && (Array.isArray(allMarks) ? allMarks.length > 0 : Object.keys(allMarks).length > 0)) ? allMarks : {});

  const studentRows = (students || []).map((st, idx) => {
    let mark = 0;
    let isAbsent = false;

    if (is2021) {
      // ── Regulation 2021: CIA components + Internal Exam (converted) ──
      let rawCIA = 0;
      if (components && activeMarksData) {
        const isArray = Array.isArray(activeMarksData);
        components.forEach(comp => {
          let val = 0;
          if (isArray) {
            const markObj = activeMarksData.find(m => (m.component_id === comp.id || m.component_id === comp.uid) && (m.student_id === st.id || String(m.student_id) === String(st.id)));
            val = markObj ? parseFloat(markObj.marks_obtained) || 0 : 0;
          } else {
            val = (activeMarksData[st.id] && activeMarksData[st.id][comp.uid || comp.id])
              ? parseFloat(activeMarksData[st.id][comp.uid || comp.id])
              : (activeMarksData[String(st.id)] && activeMarksData[String(st.id)][comp.uid || comp.id])
                ? parseFloat(activeMarksData[String(st.id)][comp.uid || comp.id])
                : 0;
          }
          if (val === 0 && Array.isArray(allMarks) && allMarks.length > 0) {
            const fallbackObj = allMarks.find(m => (m.component_id === comp.id || m.component_id === comp.uid) && (m.student_id === st.id || String(m.student_id) === String(st.id)));
            if (fallbackObj && fallbackObj.marks_obtained) {
              val = parseFloat(fallbackObj.marks_obtained) || 0;
            }
          }
          const conducted = parseFloat(comp.conducted_max) || parseFloat(comp.max_marks) || parseFloat(comp.conductedMax) || parseFloat(comp.max) || 100;
          rawCIA += Math.min(val, conducted);
        });
      }

      const ciaTotal = Math.min(Math.round(rawCIA), ciaMax);
      const examRaw = parseFloat(internalExamData?.[st.id] ?? internalExamData?.[String(st.id)]) || 0;
      const examConverted = Math.round((examRaw / 100) * examConvertedMax);

      const labExamRaw = labData?.[st.id]?.labMark
        ? parseFloat(labData[st.id].labMark)
        : (labData?.[String(st.id)]?.labMark ? parseFloat(labData[String(st.id)].labMark) : 0);
      const labExamConverted = Math.round((labExamRaw / 100) * 50);

      if (isLabType && assessmentMode === 'internal2') {
        mark = Math.min(ciaTotal + labExamConverted, 100);
      } else {
        mark = Math.min(ciaTotal + examConverted, 100);
      }

      const rawVal = internalExamData?.[st.id] ?? internalExamData?.[String(st.id)];
      // For 2021 reg: absent only if no CIA marks AND no exam mark
      if ((rawVal === '' || rawVal === undefined || rawVal === null) && ciaTotal === 0 && (!isLabType || assessmentMode !== 'internal2')) {
        isAbsent = true;
      }
    } else {
      // ── Regulation 2025 (UG & PG Autonomous Standard Model) ──
      // Component marks (max 95) + Attendance marks (max 5) = Final Total (max 100)
      let rawCIA = 0;
      let hasComponentMarks = false;
      const dataSource = activeMarksData;
      if (components && dataSource) {
        const isArray = Array.isArray(dataSource);
        components.forEach(comp => {
          let val = undefined;
          if (isArray) {
            const markObj = dataSource.find(m => (m.component_id === comp.id || m.component_id === comp.uid) && (m.student_id === st.id || String(m.student_id) === String(st.id)));
            if (markObj && markObj.marks_obtained !== null && markObj.marks_obtained !== undefined && markObj.marks_obtained !== '') {
              val = markObj.marks_obtained;
            }
          } else {
            val = dataSource?.[st.id]?.[comp.uid || comp.id] ?? dataSource?.[String(st.id)]?.[comp.uid || comp.id];
          }

          if (val === undefined && Array.isArray(allMarks) && allMarks.length > 0) {
            const markObj = allMarks.find(m => (m.component_id === comp.id || m.component_id === comp.uid) && (m.student_id === st.id || String(m.student_id) === String(st.id)));
            if (markObj && markObj.marks_obtained !== null && markObj.marks_obtained !== undefined && markObj.marks_obtained !== '') {
              val = markObj.marks_obtained;
            }
          }

          if (val !== undefined && val !== null && val !== '' && !isNaN(parseFloat(val))) {
            hasComponentMarks = true;
            const numVal = parseFloat(val);
            const conducted = parseFloat(comp.conducted_max) || parseFloat(comp.conductedMax) || 100;
            const weight = parseFloat(comp.max_marks) || parseFloat(comp.max) || conducted;
            const scaled = conducted > 0 ? (Math.min(numVal, conducted) / conducted) * weight : 0;
            rawCIA += scaled;
          }
        });
      }
      rawCIA = Math.round(rawCIA);

      const rawHoursVal = attendanceData?.[st.id] ?? attendanceData?.[String(st.id || '')];
      const hasAttendanceHours = rawHoursVal !== undefined && rawHoursVal !== '' && rawHoursVal !== null;
      const dbAttMark = (attendanceMarks?.[st.id] !== undefined && attendanceMarks?.[st.id] !== null && attendanceMarks?.[st.id] !== '')
        ? parseFloat(attendanceMarks[st.id])
        : (attendanceMarks?.[String(st.id)] !== undefined && attendanceMarks?.[String(st.id)] !== null && attendanceMarks?.[String(st.id)] !== '')
          ? parseFloat(attendanceMarks[String(st.id)])
          : null;
      const hasAttendanceMark = dbAttMark !== null && !isNaN(dbAttMark);

      const attendanceMark = resolveAttendanceMark(st.id, {
        attendanceMarks,
        attendanceData,
        totalHours: analysisPrescribedHrs,
        assessmentMode,
        int1AttendanceData: typeof int1AttendanceData !== 'undefined' ? int1AttendanceData : {},
        int1Hours: int1Hours || subject?.int1_hours || 30,
        int2Hours: int2Hours || subject?.int2_hours || 30,
        labHours: labHours || subject?.lab_hours || 0,
        labData
      });

      const rawExamVal = internalExamData?.[st.id] ?? internalExamData?.[String(st.id)];
      const hasExamMark = rawExamVal !== '' && rawExamVal !== undefined && rawExamVal !== null && rawExamVal !== 'AB' && !isNaN(parseFloat(rawExamVal));

      if (hasComponentMarks || hasAttendanceHours || hasAttendanceMark) {
        mark = Math.min(100, rawCIA + attendanceMark);
      } else if (hasExamMark) {
        // Fallback for legacy standalone exam entry if no 2025 assessment components/attendance exist
        mark = Math.min(100, Math.round(parseFloat(rawExamVal) || 0));
      } else {
        isAbsent = true;
      }
    }

    if (isAbsent) {
      absent++;
      return {
        sNo: idx + 1,
        rollNo: st.roll_no || st.rollNo || '-',
        name: String(st.name || '').replace(/ð[^\s]*/g, '').trim(),
        mark: 0,
        markStr: 'AB',
        result: 'AB',
        grade: 'U',
        isAbsent: true
      };
    }

    appeared++;
    totalScore += mark;
    if (mark > maxMark) maxMark = mark;
    if (mark < minMark) minMark = mark;

    // Pass threshold: 50 marks (standard Anna University internal passing mark)
    const passThreshold = 50;
    const isPass = mark >= passThreshold;
    if (isPass) passed++;
    else failed++;

    let studentGrade = 'U';
    if (mark < 50) { gradeCounts.U++; studentGrade = 'U'; }
    else if (mark <= 55) { gradeCounts.E++; studentGrade = 'E'; }
    else if (mark <= 59) { gradeCounts.D++; studentGrade = 'D'; }
    else if (mark <= 69) { gradeCounts.C++; studentGrade = 'C'; }
    else if (mark <= 79) { gradeCounts.B++; studentGrade = 'B'; }
    else if (mark <= 89) { gradeCounts.A++; studentGrade = 'A'; }
    else { gradeCounts.S++; studentGrade = 'S'; }

    return {
      sNo: idx + 1,
      rollNo: st.roll_no || st.rollNo || '-',
      name: String(st.name || '').replace(/ð[^\s]*/g, '').trim(),
      mark,
      markStr: String(mark),
      result: isPass ? 'PASS' : 'FAIL',
      grade: studentGrade,
      isAbsent: false
    };
  });

  if (appeared === 0) minMark = 0;
  const passPct = appeared > 0 ? ((passed / appeared) * 100).toFixed(1) : '100.0';
  const avgMark = appeared > 0 ? (totalScore / appeared).toFixed(1) : '0.0';

  return {
    appeared,
    passed,
    failed,
    absent,
    passPct,
    avgMark,
    maxMark,
    minMark,
    totalScore,
    gradeCounts,
    studentRows,
    is2021,
    analysisPrescribedHrs
  };
}
