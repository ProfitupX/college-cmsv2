import { useState, useMemo } from 'react';
import { X, Download, FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react';
import styles from './ReportPreviewModal.module.css';

export default function ReportPreviewModal({
  isOpen,
  onClose,
  onDownloadPDF,
  onDownloadExcel,
  title = 'Report Preview & Download',
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
  isLabOnly = false
}) {
  const isInternal2 = assessmentMode === 'internal2';
  const hasLab = ['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab'].includes(subject?.type);

  // 2021 Regulation Theory-cum-Lab in Internal 2 options
  const [theoryCumLabMode, setTheoryCumLabMode] = useState('assignment_lab_only');
  const [showWrittenExamInPdf, setShowWrittenExamInPdf] = useState(false);
  const [targetPages, setTargetPages] = useState('auto');

  // Total prescribed hours: strictly int1Hours for Internal 1; int2Hours for Internal 2 (from Admin Manage Subjects or default 30)
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

  const previewRows = useMemo(() => {
    return students.map((student, idx) => {
      // 1. Calculate activities total
      let convertedTotal = 0;
      (components || []).forEach(c => {
        const val = parseFloat(marksData[student.id]?.[c.uid || c.id]) || 0;
        const conducted = parseFloat(c.conductedMax || c.conducted_max) || 100;
        convertedTotal += Math.min(val, conducted);
      });
      convertedTotal = Math.round(convertedTotal);

      // 2. Attendance
      let rawHours = 0;
      let pct = 0;
      let attendanceMark = 0;

      rawHours = parseInt(attendanceData[student.id] || 0, 10);
      pct = tHours > 0 ? Math.min(100, Math.round((rawHours / tHours) * 100)) : 0;
      attendanceMark = (attendanceMarks && attendanceMarks[student.id] !== undefined && parseFloat(attendanceMarks[student.id]) > 0)
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

      // Lab Only specific calculations
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
  }, [students, marksData, attendanceData, attendanceMarks, internalExamData, labData, components, isInternal2, hasLab, tHours, int1AttendanceData]);

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
              Review marks and attendance details before confirming download.
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Metadata Badges */}
        <div className={styles.metaRow}>
          <div className={styles.metaBadge}>
            <strong>Subject:</strong> {subject?.code} - {subject?.name}
          </div>
          <div className={styles.metaBadge}>
            <strong>Class:</strong> {classObj?.name || `${classObj?.year_label || 'II'} / ${classObj?.semester || '4'}`}
          </div>
          <div className={styles.metaBadge}>
            <strong>Assessment:</strong> {assessmentMode === 'internal1' ? 'Internal Assessment 1' : 'Internal Assessment 2'}
          </div>
          <div className={styles.metaBadge}>
            <strong>Mode:</strong> {withInternal ? 'With Assignment Marks' : 'Without Assignment Marks'}
          </div>
          <div className={styles.metaBadge} style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}>
            <strong>Total Hours:</strong> {tHours} Hrs
          </div>
          <div className={styles.metaBadge}>
            <strong>Students:</strong> {students.length}
          </div>
        </div>

        {/* Controls Bar: PDF Page Layout & Regulation Options */}
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

          {regulation === '2021' && isInternal2 && hasLab && withInternal && (
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

        {/* Live Preview Table */}
        <div className={styles.tableWrap}>
          {isLabOnly ? (
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
