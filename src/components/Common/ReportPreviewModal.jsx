import { useState, useMemo } from 'react';
import { X, Download, FileSpreadsheet, FileText, CheckCircle2, BarChart2, BookOpen, Users, Award } from 'lucide-react';
import styles from './ReportPreviewModal.module.css';

export default function ReportPreviewModal({
  isOpen,
  onClose,
  onDownloadPDF,
  onDownloadExcel,
  title = 'Report Preview & Download',
  reportType = 'subject_marks',
  subject,
  classObj,
  staff,
  assessmentMode = 'internal1',
  withInternal = true,
  students = [],
  marksData = {},
  attendanceData = {},
  attendanceMarks = {},
  internalExamData = {},
  labData = {},
  components = [],
  totalHours = 30,
  int1Hours = 30,
  int2Hours = 30,
  labHours = 0,
  int1AttendanceData = {},
  regulation = '2025',
  isLabOnly = false,
  // Props for multi-subject / class / analysis reports:
  subjects = [],
  allSessions = [],
  allAttendance = [],
  allMarks = [],
  allComponents = [],
  selectedSubjectIds = [],
  declarationData = {},
  classRemarks = '',
  remedialAction = ''
}) {
  const isInternal2 = assessmentMode === 'internal2';
  const hasLab = ['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab'].includes(subject?.type);

  // 2021 Regulation Theory-cum-Lab in Internal 2 options
  const [theoryCumLabMode, setTheoryCumLabMode] = useState('assignment_lab_only');
  const [showWrittenExamInPdf, setShowWrittenExamInPdf] = useState(false);
  const [targetPages, setTargetPages] = useState('auto');

  // Total prescribed hours: strictly int1Hours for Internal 1; int2Hours for Internal 2
  const tHours = isInternal2
    ? (parseInt(subject?.int2_hours || int2Hours, 10) || 30)
    : (parseInt(subject?.int1_hours || int1Hours, 10) || 30);

  const getAttendanceMark = (pct) => {
    if (pct >= 95) return 5;
    if (pct >= 90) return 3;
    if (pct >= 85) return 2;
    if (pct >= 80) return 1;
    return 0;
  };

  // 1. Single Subject Marks Rows
  const previewRows = useMemo(() => {
    if (reportType !== 'subject_marks' && !isLabOnly) return [];
    return students.map((student, idx) => {
      let convertedTotal = 0;
      (components || []).forEach(c => {
        const val = parseFloat(marksData[student.id]?.[c.uid || c.id]) || 0;
        const conducted = parseFloat(c.conductedMax || c.conducted_max) || 100;
        convertedTotal += Math.min(val, conducted);
      });
      convertedTotal = Math.round(convertedTotal);

      let rawHours = parseInt(attendanceData[student.id] || 0, 10);
      let pct = tHours > 0 ? Math.min(100, Math.round((rawHours / tHours) * 100)) : 0;
      let attendanceMark = (attendanceMarks && attendanceMarks[student.id] !== undefined && parseFloat(attendanceMarks[student.id]) > 0)
        ? parseFloat(attendanceMarks[student.id])
        : getAttendanceMark(pct);

      const examMark = internalExamData ? internalExamData[student.id] : undefined;
      const numExam = parseFloat(examMark);
      const examMarkStr = (!isNaN(numExam) && examMark !== null && examMark !== undefined && examMark !== '')
        ? Math.round(numExam)
        : '-';

      const labRaw = parseFloat(labData[student.id]?.labMark) || 0;
      const labConverted = Math.round((labRaw / 100) * 50);

      const totalInternal = Math.min(100, convertedTotal + attendanceMark);
      const isPass = examMarkStr !== '-' && parseInt(examMarkStr, 10) >= 50;

      let attendedLabHours = 0;
      if (labData[student.id]?.labAttendance !== undefined && labData[student.id]?.labAttendance !== null && labData[student.id]?.labAttendance !== '') {
        attendedLabHours = parseInt(labData[student.id].labAttendance, 10);
      } else if (attendanceData[student.id] !== undefined && attendanceData[student.id] !== null && attendanceData[student.id] !== '') {
        attendedLabHours = parseInt(attendanceData[student.id], 10);
      }

      let labRawMark = null;
      if (labData[student.id]?.labMark !== undefined && labData[student.id]?.labMark !== null && labData[student.id]?.labMark !== '') {
        labRawMark = labData[student.id].labMark;
      } else if (internalExamData[student.id] !== undefined && internalExamData[student.id] !== null && internalExamData[student.id] !== '') {
        labRawMark = internalExamData[student.id];
      }
      const numLabMark = parseFloat(labRawMark);
      const isLabAbsent = isNaN(numLabMark) || labRawMark === null || labRawMark === '' || labRawMark === 'AB';
      const labMarkStr = isLabAbsent ? 'AB' : Math.round(numLabMark);
      const labResult = isLabAbsent ? 'AB' : (numLabMark >= 50 ? 'PASS' : 'FAIL');

      return {
        sNo: idx + 1,
        rollNo: student.roll_no || student.rollNo || '-',
        name: String(student.name || '').replace(/ð[^\s]*/g, '').trim(),
        rawHours,
        tHours,
        pct,
        attendanceMark,
        convertedTotal,
        labConverted,
        totalInternal,
        examMarkStr,
        resultStr: examMarkStr === '-' ? 'AB' : (isPass ? 'PASS' : 'FAIL'),
        attendedLabHours,
        labMarkStr,
        labResult
      };
    });
  }, [students, marksData, attendanceData, attendanceMarks, internalExamData, labData, components, tHours, reportType, isLabOnly]);

  // 2. Subject Test Analysis Data Calculation
  const subjectAnalysisData = useMemo(() => {
    if (reportType !== 'subject_analysis') return null;

    const is2021 = classObj?.year_label === 'III' || classObj?.year_label === 'IV' || parseInt(classObj?.semester) >= 5;
    const isLabType = ['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab'].includes(subject?.type || '');
    const ciaMax = isLabType ? 50 : 40;
    const examConvertedMax = isLabType ? 50 : 60;

    const gradeCounts = { U: 0, E: 0, D: 0, C: 0, B: 0, A: 0, S: 0 };
    let appeared = 0;
    let passed = 0;
    let failed = 0;
    let absent = 0;
    let maxMark = 0;
    let minMark = 100;
    let totalScore = 0;

    const studentRows = students.map((st, idx) => {
      let mark = 0;
      let isAbsent = false;

      if (is2021) {
        let rawCIA = 0;
        if (components && (marksData || allMarks)) {
          const isArray = Array.isArray(marksData) || Array.isArray(allMarks);
          const dataArr = Array.isArray(marksData) ? marksData : (Array.isArray(allMarks) ? allMarks : []);
          components.forEach(comp => {
            let val = 0;
            if (isArray) {
              const markObj = dataArr.find(m => m.component_id === comp.id && m.student_id === st.id);
              val = markObj ? parseFloat(markObj.marks_obtained) || 0 : 0;
            } else {
              val = (marksData[st.id] && marksData[st.id][comp.uid || comp.id]) ? parseFloat(marksData[st.id][comp.uid || comp.id]) : 0;
            }
            const conducted = parseFloat(comp.conducted_max) || parseFloat(comp.max_marks) || parseFloat(comp.conductedMax) || 100;
            rawCIA += Math.min(val, conducted);
          });
        }
        const ciaTotal = Math.min(Math.round(rawCIA), ciaMax);
        const examRaw = parseFloat(internalExamData[st.id]) || 0;
        const examConverted = Math.round((examRaw / 100) * examConvertedMax);
        const labExamRaw = labData[st.id]?.labMark ? parseFloat(labData[st.id].labMark) : 0;
        const labExamConverted = Math.round((labExamRaw / 100) * 50);

        if (isLabType && assessmentMode === 'internal2') {
          mark = Math.min(ciaTotal + labExamConverted, 100);
        } else {
          mark = Math.min(ciaTotal + examConverted, 100);
        }

        const rawVal = internalExamData[st.id];
        if ((rawVal === '' || rawVal === undefined || rawVal === null) && (!isLabType || assessmentMode !== 'internal2')) {
          isAbsent = true;
        }
      } else {
        const rawVal = internalExamData[st.id];
        if (rawVal === '' || rawVal === undefined || rawVal === null) {
          isAbsent = true;
        } else {
          mark = parseFloat(rawVal) || 0;
        }
      }

      if (isAbsent) {
        absent++;
        return {
          sNo: idx + 1,
          rollNo: st.roll_no || st.rollNo || '-',
          name: String(st.name || '').replace(/ð[^\s]*/g, '').trim(),
          markStr: 'AB',
          result: 'AB'
        };
      }

      appeared++;
      totalScore += mark;
      if (mark > maxMark) maxMark = mark;
      if (mark < minMark) minMark = mark;

      const passThreshold = (isLabType || subject?.type?.toLowerCase().includes('lab') || subject?.type?.toLowerCase().includes('practical')) ? 50 : 60;
      const isPass = mark >= passThreshold;
      if (isPass) passed++;
      else failed++;

      if (mark < 50) gradeCounts.U++;
      else if (mark <= 55) gradeCounts.E++;
      else if (mark <= 59) gradeCounts.D++;
      else if (mark <= 69) gradeCounts.C++;
      else if (mark <= 79) gradeCounts.B++;
      else if (mark <= 89) gradeCounts.A++;
      else gradeCounts.S++;

      return {
        sNo: idx + 1,
        rollNo: st.roll_no || st.rollNo || '-',
        name: String(st.name || '').replace(/ð[^\s]*/g, '').trim(),
        markStr: Math.round(mark),
        result: isPass ? 'PASS' : 'FAIL'
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
      maxMark,
      minMark,
      passPct,
      avgMark,
      gradeCounts,
      studentRows
    };
  }, [reportType, classObj, subject, students, components, marksData, allMarks, internalExamData, labData, assessmentMode]);

  // 3. Multi-Subject Data for ExamCell Legal & Consolidated Statements
  const multiSubjectRows = useMemo(() => {
    if (reportType !== 'examcell_legal' && reportType !== 'overall_statement' && reportType !== 'consolidated_statement') {
      return { targetSubs: [], rows: [] };
    }

    let targetSubs = subjects.filter(s => s.code !== 'LIB' && s.name?.toUpperCase() !== 'LIBRARY');
    if (selectedSubjectIds && selectedSubjectIds.length > 0) {
      targetSubs = targetSubs.filter(s => selectedSubjectIds.includes(s.id));
    }

    const is2021 = classObj?.year_label === 'III' || classObj?.year_label === 'IV' || parseInt(classObj?.semester) >= 5;

    const rows = students.map((st, idx) => {
      const cleanName = String(st.name || '').replace(/ð[^\s]*/g, '').trim();
      let totalAttendedHours = 0;
      let totalPrescribedHours = 0;
      let passedCount = 0;
      let failedCount = 0;
      let absentCount = 0;

      const subValues = targetSubs.map(sub => {
        const sess = allSessions.find(s => s.subject_id === sub.id && s.session_label === assessmentMode);
        let attHrs = 0;
        let markVal = '-';

        if (sess) {
          const attRec = allAttendance.find(a => a.session_id === sess.id && a.student_id === st.id);
          if (attRec) {
            attHrs = parseInt(attRec.hours_attended || 0, 10);
            if (attRec.internal_exam_mark !== null && attRec.internal_exam_mark !== undefined && attRec.internal_exam_mark !== '') {
              markVal = Math.round(parseFloat(attRec.internal_exam_mark));
            }
          }
          const markRecs = allMarks.filter(m => m.session_id === sess.id && m.student_id === st.id);
          if (markRecs.length > 0) {
            let sum = 0;
            markRecs.forEach(m => sum += parseFloat(m.marks_obtained || 0));
            markVal = Math.round(sum);
          }
        }

        const subPrescribed = parseInt(sess?.total_hours || (assessmentMode === 'internal2' ? sub.int2_hours : sub.int1_hours) || 30, 10);
        totalAttendedHours += attHrs;
        totalPrescribedHours += subPrescribed;

        if (markVal === '-' || markVal === 'AB') {
          absentCount++;
        } else if (typeof markVal === 'number' && markVal >= 50) {
          passedCount++;
        } else if (typeof markVal === 'number') {
          failedCount++;
        }

        const subPct = subPrescribed > 0 ? Math.min(100, Math.round((attHrs / subPrescribed) * 100)) : 0;
        return {
          code: sub.code,
          attHrs,
          subPct,
          markVal
        };
      });

      const overallPct = totalPrescribedHours > 0
        ? Math.min(100, Math.round((totalAttendedHours / totalPrescribedHours) * 100))
        : 0;

      return {
        sNo: idx + 1,
        rollNo: st.roll_no || st.rollNo || '-',
        name: cleanName,
        subValues,
        overallPct,
        passedCount,
        failedCount,
        absentCount
      };
    });

    return { targetSubs, rows };
  }, [reportType, subjects, selectedSubjectIds, classObj, students, allSessions, assessmentMode, allAttendance, allMarks]);

  // 4. Class Performance Summary Rows
  const classAnalysisRows = useMemo(() => {
    if (reportType !== 'class_analysis') return [];
    let targetSubs = subjects.filter(s => s.code !== 'LIB' && s.name?.toUpperCase() !== 'LIBRARY');
    if (selectedSubjectIds && selectedSubjectIds.length > 0) {
      targetSubs = targetSubs.filter(s => selectedSubjectIds.includes(s.id));
    }

    return targetSubs.map((sub, idx) => {
      const sess = allSessions.find(s => s.subject_id === sub.id && s.session_label === assessmentMode);
      let passed = students.length;
      let failed = 0;
      let appeared = students.length;
      let passPct = '100.00';

      if (sess) {
        const attRows = allAttendance.filter(a => a.session_id === sess.id);
        let p = 0;
        let f = 0;
        attRows.forEach(r => {
          const mark = parseFloat(r.internal_exam_mark);
          if (!isNaN(mark)) {
            if (mark >= 50) p++;
            else f++;
          }
        });
        if (p + f > 0) {
          passed = p;
          failed = f;
          appeared = p + f;
          passPct = ((p / appeared) * 100).toFixed(2);
        }
      }

      const faculty = sub.faculty_name || sub.staff_name || 'Faculty Staff';
      return {
        sNo: idx + 1,
        code: sub.code,
        name: sub.name,
        faculty,
        total: students.length,
        appeared,
        passed,
        failed,
        passPct
      };
    });
  }, [reportType, subjects, selectedSubjectIds, allSessions, assessmentMode, students, allAttendance]);

  if (!isOpen) return null;

  const handleDownloadPDFClick = () => {
    onDownloadPDF({ theoryCumLabMode, showWrittenExamInPdf, targetPages });
  };

  const handleDownloadExcelClick = () => {
    onDownloadExcel({ theoryCumLabMode, showWrittenExamInPdf, targetPages });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>
              <FileText size={20} color="var(--primary)" />
              {title}
            </h2>
            <div className={styles.subtitle}>
              Review marks and attendance details before confirming download. Both PDF and Excel formats are ready.
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Metadata Badges */}
        <div className={styles.metaRow}>
          {subject && (
            <div className={styles.metaBadge}>
              <strong>Subject:</strong> {subject?.code} - {subject?.name}
            </div>
          )}
          <div className={styles.metaBadge}>
            <strong>Class:</strong> {classObj?.name || `${classObj?.year_label || 'II'} / ${classObj?.semester || '4'}`}
          </div>
          <div className={styles.metaBadge}>
            <strong>Assessment:</strong> {assessmentMode === 'internal1' ? 'Internal Assessment 1' : 'Internal Assessment 2'}
          </div>
          {reportType === 'subject_marks' && (
            <>
              <div className={styles.metaBadge}>
                <strong>Mode:</strong> {withInternal ? 'With Assignment Marks' : 'Without Assignment Marks'}
              </div>
              <div className={styles.metaBadge} style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}>
                <strong>Total Hours:</strong> {tHours} Hrs
              </div>
            </>
          )}
          <div className={styles.metaBadge}>
            <strong>Students:</strong> {students.length}
          </div>
        </div>

        {/* PDF Page Layout & Regulation Options */}
        <div className={styles.specialOptionsBox} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e3a8a' }}>📄 PDF Layout Pages:</span>
            <select
              value={targetPages}
              onChange={e => setTargetPages(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1.5px solid #93c5fd',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: '#fff',
                color: '#1e40af',
                cursor: 'pointer'
              }}
            >
              <option value="auto">Auto (Smart Distribution)</option>
              <option value="1_page">Fit on 1 Single Page</option>
              <option value="2_pages">Format into 2 Pages</option>
              <option value="3_pages">Format into 3 Pages</option>
            </select>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              (Signatures automatically pinned to bottom of final page)
            </span>
          </div>

          {regulation === '2021' && isInternal2 && hasLab && withInternal && reportType === 'subject_marks' && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#1e40af' }}>Theory-cum-Lab:</span>
                <select 
                  value={theoryCumLabMode} 
                  onChange={e => setTheoryCumLabMode(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #bfdbfe', fontSize: '0.8rem' }}
                >
                  <option value="assignment_lab_only">Assignment (50) + Lab (50) only</option>
                  <option value="with_written_exam">Full (Assignment + Lab + Written Exam)</option>
                </select>
              </label>

              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={showWrittenExamInPdf} 
                  onChange={e => setShowWrittenExamInPdf(e.target.checked)} 
                />
                <span>Show Internal Written Exam Mark in PDF/Excel</span>
              </label>
            </div>
          )}
        </div>

        {/* Live Preview Container */}
        <div className={styles.tableWrap}>
          {/* VIEW A: Subject Test Analysis Report */}
          {reportType === 'subject_analysis' && subjectAnalysisData && (
            <div>
              <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>Strength</span>
                  <span className={styles.kpiVal}>{students.length}</span>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>Appeared</span>
                  <span className={styles.kpiVal}>{subjectAnalysisData.appeared}</span>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>Passed</span>
                  <span className={styles.kpiVal} style={{ color: '#10b981' }}>{subjectAnalysisData.passed}</span>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>Failed</span>
                  <span className={styles.kpiVal} style={{ color: '#ef4444' }}>{subjectAnalysisData.failed}</span>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>Pass %</span>
                  <span className={styles.kpiVal} style={{ color: '#2563eb' }}>{subjectAnalysisData.passPct}%</span>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>Average</span>
                  <span className={styles.kpiVal}>{subjectAnalysisData.avgMark}</span>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>Highest</span>
                  <span className={styles.kpiVal} style={{ color: '#047857' }}>{subjectAnalysisData.maxMark}</span>
                </div>
              </div>

              {/* Grade distribution overview */}
              <div className={styles.sectionHeader}>
                <BarChart2 size={16} /> 1. Grade &amp; Performance Distribution
              </div>
              <table className={styles.table} style={{ marginBottom: '20px' }}>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ textAlign: 'center' }}>0-49 (U)</th>
                    <th style={{ textAlign: 'center' }}>50-55 (E)</th>
                    <th style={{ textAlign: 'center' }}>56-59 (D)</th>
                    <th style={{ textAlign: 'center' }}>60-69 (C)</th>
                    <th style={{ textAlign: 'center' }}>70-79 (B)</th>
                    <th style={{ textAlign: 'center' }}>80-89 (A)</th>
                    <th style={{ textAlign: 'center' }}>90-100 (S)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 700 }}>No. of Students</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#ef4444' }}>{subjectAnalysisData.gradeCounts.U}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{subjectAnalysisData.gradeCounts.E}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{subjectAnalysisData.gradeCounts.D}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{subjectAnalysisData.gradeCounts.C}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{subjectAnalysisData.gradeCounts.B}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>{subjectAnalysisData.gradeCounts.A}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#059669' }}>{subjectAnalysisData.gradeCounts.S}</td>
                  </tr>
                </tbody>
              </table>

              <div className={styles.sectionHeader}>
                <Users size={16} /> 2. Student Mark List Preview
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>S.No</th>
                    <th style={{ width: '130px' }}>Roll No</th>
                    <th>Student Name</th>
                    <th style={{ width: '160px', textAlign: 'center' }}>Mark Obtained (/ 100)</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectAnalysisData.studentRows.map(r => (
                    <tr key={r.rollNo}>
                      <td style={{ textAlign: 'center' }}>{r.sNo}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{r.rollNo}</td>
                      <td>{r.name}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#1e40af' }}>{r.markStr}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: r.result === 'PASS' ? '#10b981' : (r.result === 'AB' ? '#64748b' : '#ef4444') }}>
                        {r.result}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW B: ExamCell Legal Statement (Multi-Subject) */}
          {(reportType === 'examcell_legal' || reportType === 'overall_statement') && (
            <div>
              <div className={styles.sectionHeader}>
                <BookOpen size={16} /> Multi-Subject ExamCell Legal Statement Preview ({multiSubjectRows.targetSubs.length} Subjects)
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>S.No</th>
                    <th style={{ width: '130px' }}>Roll No</th>
                    <th>Student Name</th>
                    {multiSubjectRows.targetSubs.map(s => (
                      <th key={s.id} style={{ textAlign: 'center' }}>
                        <div>{s.code}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>Attd / Mark</div>
                      </th>
                    ))}
                    <th style={{ width: '110px', textAlign: 'center' }}>Overall Attd %</th>
                  </tr>
                </thead>
                <tbody>
                  {multiSubjectRows.rows.map(r => (
                    <tr key={r.rollNo}>
                      <td style={{ textAlign: 'center' }}>{r.sNo}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{r.rollNo}</td>
                      <td>{r.name}</td>
                      {r.subValues.map((sv, idx) => (
                        <td key={idx} style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{sv.attHrs}h</span>
                          {' / '}
                          <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{sv.markVal}</span>
                        </td>
                      ))}
                      <td style={{ textAlign: 'center', fontWeight: 700, color: r.overallPct >= 75 ? '#059669' : '#dc2626' }}>
                        {r.overallPct}%
                      </td>
                    </tr>
                  ))}
                  {multiSubjectRows.rows.length === 0 && (
                    <tr>
                      <td colSpan={multiSubjectRows.targetSubs.length + 4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No records found for this class.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW C: Consolidated Mark Statement */}
          {reportType === 'consolidated_statement' && (
            <div>
              <div className={styles.sectionHeader}>
                <Award size={16} /> Consolidated Mark Statement Preview ({multiSubjectRows.targetSubs.length} Subjects)
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>S.No</th>
                    <th style={{ width: '130px' }}>Roll No</th>
                    <th>Student Name</th>
                    {multiSubjectRows.targetSubs.map(s => (
                      <th key={s.id} style={{ textAlign: 'center' }}>{s.code}</th>
                    ))}
                    <th style={{ width: '80px', textAlign: 'center', color: '#dc2626' }}>Failed</th>
                    <th style={{ width: '80px', textAlign: 'center', color: '#16a34a' }}>Passed</th>
                    <th style={{ width: '80px', textAlign: 'center', color: '#64748b' }}>Absent</th>
                  </tr>
                </thead>
                <tbody>
                  {multiSubjectRows.rows.map(r => (
                    <tr key={r.rollNo}>
                      <td style={{ textAlign: 'center' }}>{r.sNo}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{r.rollNo}</td>
                      <td>{r.name}</td>
                      {r.subValues.map((sv, idx) => (
                        <td key={idx} style={{ textAlign: 'center', fontWeight: 700, color: sv.markVal === 'AB' ? '#64748b' : (typeof sv.markVal === 'number' && sv.markVal >= 50 ? '#059669' : '#dc2626') }}>
                          {sv.markVal}
                        </td>
                      ))}
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>{r.failedCount}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>{r.passedCount}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{r.absentCount}</td>
                    </tr>
                  ))}
                  {multiSubjectRows.rows.length === 0 && (
                    <tr>
                      <td colSpan={multiSubjectRows.targetSubs.length + 6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No records found for this class.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW D: Class Performance Analysis */}
          {reportType === 'class_analysis' && (
            <div>
              <div className={styles.sectionHeader}>
                <BarChart2 size={16} /> Subject-Wise Class Performance Analysis Preview
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>S.No</th>
                    <th style={{ width: '110px' }}>Subject Code</th>
                    <th>Subject Name</th>
                    <th>Staff In-Charge</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Strength</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Appeared</th>
                    <th style={{ width: '90px', textAlign: 'center', color: '#16a34a' }}>Passed</th>
                    <th style={{ width: '90px', textAlign: 'center', color: '#dc2626' }}>Failed</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Pass %</th>
                  </tr>
                </thead>
                <tbody>
                  {classAnalysisRows.map(r => (
                    <tr key={r.code}>
                      <td style={{ textAlign: 'center' }}>{r.sNo}</td>
                      <td style={{ fontWeight: 600 }}>{r.code}</td>
                      <td>{r.name}</td>
                      <td>{r.faculty}</td>
                      <td style={{ textAlign: 'center' }}>{r.total}</td>
                      <td style={{ textAlign: 'center' }}>{r.appeared}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>{r.passed}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>{r.failed}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#2563eb' }}>{r.passPct}%</td>
                    </tr>
                  ))}
                  {classAnalysisRows.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No subjects found for this class analysis.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW E: Batch Multi-Subject Statement Banner */}
          {reportType === 'batch_subject_marks' && (
            <div>
              <div className={styles.batchBanner}>
                <div>
                  <strong style={{ color: '#166534', fontSize: '0.9rem' }}>
                    Multi-Subject Marks Statement Batch ({subjects.length} Subjects Selected)
                  </strong>
                  <div style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '4px' }}>
                    Clicking download below will generate statements for all selected subjects at once.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {subjects.map(s => (
                    <span key={s.id} style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {s.code}
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.sectionHeader}>
                <Users size={16} /> Students in Target Class ({students.length} Students)
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>S.No</th>
                    <th style={{ width: '140px' }}>Roll No</th>
                    <th>Student Name</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st, idx) => (
                    <tr key={st.id || idx}>
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{st.roll_no || st.rollNo || '-'}</td>
                      <td>{String(st.name || '').replace(/ð[^\s]*/g, '').trim()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW F: Single Subject Marks & Lab Only */}
          {(reportType === 'subject_marks' || isLabOnly) && (
            isLabOnly ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>S.No</th>
                    <th style={{ width: '130px' }}>Roll No</th>
                    <th>Student Name</th>
                    <th style={{ width: '150px' }}>Lab Attended Hours</th>
                    <th style={{ width: '150px' }}>Lab Marks (/ 100)</th>
                    <th style={{ width: '120px' }}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map(r => (
                    <tr key={r.rollNo}>
                      <td style={{ textAlign: 'center' }}>{r.sNo}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{r.rollNo}</td>
                      <td>{r.name}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{r.attendedLabHours} Hrs</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#0e7490' }}>{r.labMarkStr}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: r.labResult === 'PASS' ? '#10b981' : '#ef4444' }}>
                        {r.labResult}
                      </td>
                    </tr>
                  ))}
                  {previewRows.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No student records found to display.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>S.No</th>
                    <th style={{ width: '130px' }}>Roll No</th>
                    <th>Student Name</th>
                    {withInternal ? (
                      <>
                        <th style={{ width: '110px' }}>Attd Mark (5)</th>
                        <th style={{ width: '130px' }}>Activities (95)</th>
                        <th style={{ width: '140px' }}>Total Internal (100)</th>
                      </>
                    ) : (
                      <>
                        <th style={{ width: '130px' }}>Exam Mark (100)</th>
                        <th style={{ width: '110px' }}>Result</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map(r => (
                    <tr key={r.rollNo}>
                      <td style={{ textAlign: 'center' }}>{r.sNo}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{r.rollNo}</td>
                      <td>{r.name}</td>
                      {withInternal ? (
                        <>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{r.attendanceMark}</td>
                          <td style={{ textAlign: 'center' }}>{r.convertedTotal}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#1d4ed8' }}>{r.totalInternal}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{r.examMarkStr}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: r.resultStr === 'PASS' ? '#10b981' : '#ef4444' }}>
                            {r.resultStr}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {previewRows.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No student records found to display.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )
          )}
        </div>

        {/* Modal Footer with Two Download Options */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            <CheckCircle2 size={16} color="#10B981" />
            <span>Ready for official download. Select format below:</span>
          </div>

          <div className={styles.footerActions}>
            <button className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>

            <button className={styles.excelBtn} onClick={handleDownloadExcelClick}>
              <FileSpreadsheet size={16} />
              Download Excel (.xlsx)
            </button>

            <button className={styles.pdfBtn} onClick={handleDownloadPDFClick}>
              <Download size={16} />
              Download PDF Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
