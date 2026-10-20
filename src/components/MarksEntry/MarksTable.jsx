import MarksRow from './MarksRow';
import { useAuth } from '../../context/AuthContext';
import styles from './MarksTable.module.css';

export default function MarksTable({ 
  students, components, marksData, onMarkChange,
  attendanceData, attendanceMarks = {}, int1AttendanceData = {}, internalExamData, totalHours, int1Hours, int2Hours, labHours,
  onAttendanceChange, onInternalExamChange, onTotalHoursChange,
  labData, assessmentMode, selectedSubject, onLabDataChange, isLocked
}) {
  const { user } = useAuth();
  const isElevated = user?.role === 'principal' || user?.role === 'vice_principal' || user?.role === 'hod' || user?.role === 'admin';
  const totalMax = components.reduce((s, c) => s + (parseFloat(c.max) || 0), 0);

  // Which hours to show based on mode
  const displayHours = assessmentMode === 'internal1' ? int1Hours : int2Hours;
  const isLabCumTheory = selectedSubject?.type === 'Lab-cum-Theory' || selectedSubject?.type === 'Theory-cum-Lab';

  // Calculate maximum actual attended hours across students to represent conducted classes
  let maxActualHours = 0;
  let maxCumActualHours = 0;
  students.forEach((st) => {
    const raw = parseInt(attendanceData[st.id] || 0, 10);
    if (raw > maxActualHours) maxActualHours = raw;

    const i1 = parseInt(int1AttendanceData[st.id] || 0, 10);
    const l = isLabCumTheory ? parseInt(labData?.[st.id]?.labAttendance || 0, 10) : 0;
    const cum = i1 + raw + l;
    if (cum > maxCumActualHours) maxCumActualHours = cum;
  });

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {/* Sticky Columns */}
              <th className={`${styles.th} ${styles.sNoTh}`}>S.No</th>
              <th className={`${styles.th} ${styles.rollNoTh}`}>Roll No</th>
              <th className={`${styles.th} ${styles.studentTh}`}>Student Name</th>

              {/* Dynamic Assessment Columns */}
              {components.map((comp) => (
                <th key={comp.uid} className={styles.th}>
                  <div className={styles.thContent}>
                    <span className={styles.thIcon}>{comp.icon}</span>
                    <span className={styles.thLabel}>{comp.label}</span>
                    <span className={styles.thMax}>Max: {comp.conductedMax || 100}</span>
                  </div>
                </th>
              ))}

              {/* Attendance Columns based on assessment mode */}
              {assessmentMode === 'internal1' ? (
                <th className={`${styles.th} ${styles.attendanceTh}`}>
                  <div className={styles.thContent}>
                    <span className={styles.thIcon}>📅</span>
                    <span className={styles.thLabel}>
                      Actual Taken Hrs
                    </span>
                    <div className={styles.globalHoursWrap}>
                      <label>Total Classes:</label>
                      <div className={styles.lockedHours} title="Auto-assigned from LTPC">{int1Hours || '?'}</div>
                    </div>
                  </div>
                </th>
              ) : (
                <>
                  {/* Read-Only Int 1 Attendance Header */}
                  <th className={`${styles.th} ${styles.attendanceTh}`}>
                    <div className={styles.thContent}>
                      <span className={styles.thIcon}>📅</span>
                      <span className={styles.thLabel}>Int 1 Attd</span>
                      <div className={styles.thSub}>Max: {int1Hours || '?'}</div>
                    </div>
                  </th>

                  {/* Int 2 Attendance Header */}
                  <th className={`${styles.th} ${styles.attendanceTh}`}>
                    <div className={styles.thContent}>
                      <span className={styles.thIcon}>📅</span>
                      <span className={styles.thLabel}>
                        Int 2 Attd Hrs
                      </span>
                      <div className={styles.thSub}>Max: {int2Hours || '?'}</div>
                    </div>
                  </th>

                  {/* Lab Attendance Header (if Lab-cum-Theory / Theory-cum-Lab) */}
                  {(selectedSubject?.type === 'Lab-cum-Theory' || selectedSubject?.type === 'Theory-cum-Lab') && (
                    <th className={`${styles.th} ${styles.attendanceTh}`}>
                      <div className={styles.thContent}>
                        <span className={styles.thIcon}>🧑‍🔬</span>
                        <span className={styles.thLabel}>Lab Attd</span>
                        <div className={styles.thSub}>Max: {labHours || '?'}</div>
                      </div>
                    </th>
                  )}
                </>
              )}

              {/* Activities Total - ALWAYS visible */}
              <th className={`${styles.th} ${styles.computedTh}`}>
                Activities Total
                <div className={styles.thSub}>/ {totalMax || 95}</div>
              </th>

              {/* Internal Exam - mode specific name */}
              <th className={`${styles.th} ${styles.internalExamTh}`}>
                <div className={styles.thContent}>
                  <span className={styles.thIcon}>📝</span>
                  <span className={styles.thLabel}>
                    {assessmentMode === 'internal1' ? 'Internal 1 Exam' : 'Internal 2 Exam'}
                  </span>
                  <div className={styles.thSub}>Max: 100</div>
                </div>
              </th>

              {/* Lab Mark column - only when mode is internal2 AND type is Lab-cum-Theory / Theory-cum-Lab */}
              {(assessmentMode === 'internal2' && (selectedSubject?.type === 'Lab-cum-Theory' || selectedSubject?.type === 'Theory-cum-Lab')) && (
                <th className={`${styles.th} ${styles.internalExamTh}`}>
                  <div className={styles.thContent}>
                    <span className={styles.thIcon}>🔬</span>
                    <span className={styles.thLabel}>Lab Mark</span>
                    <div className={styles.thSub}>Max: 100</div>
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {students.map((student, i) => (
              <MarksRow
                key={`${student.id}-${assessmentMode}`}
                student={student}
                components={components}
                marks={marksData[student.id] || {}}
                attendanceHours={attendanceData[student.id] || ''}
                savedAttendanceMark={attendanceMarks[student.id]}
                isElevated={isElevated}
                int1AttendanceHours={int1AttendanceData[student.id] || ''}
                internalExamMark={internalExamData[student.id] || ''}
                displayHours={displayHours}
                conductedHours={maxActualHours > 0 ? maxActualHours : displayHours}
                conductedCumHours={maxCumActualHours}
                int1Hours={int1Hours}
                int2Hours={int2Hours}
                labHours={labHours}
                assessmentMode={assessmentMode}
                selectedSubject={selectedSubject}
                labData={labData ? labData[student.id] || {} : {}}
                onMarkChange={onMarkChange}
                isLocked={isLocked}
                onAttendanceChange={(val) => onAttendanceChange(student.id, val)}
                onInternalExamChange={(val) => onInternalExamChange(student.id, val)}
                onLabDataChange={(field, val) => onLabDataChange(student.id, field, val)}
                index={i}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <span className={styles.footerInfo}>
          {students.length} student{students.length !== 1 ? 's' : ''} ·{' '}
          {components.length} component{components.length !== 1 ? 's' : ''} ·{' '}
          Total weight allocated: {totalMax}%
        </span>
        <span className={styles.footerFormula}>
          Formula: Σ (Raw Marks) + Attendance
        </span>
      </div>
    </div>
  );
}
