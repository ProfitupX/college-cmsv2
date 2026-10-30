import MarksRow from './MarksRow';
import { useAuth } from '../../context/AuthContext';
import styles from './MarksTable.module.css';

export default function MarksTable({ 
  students = [], components = [], marksData = {}, onMarkChange,
  attendanceData = {}, attendanceMarks = {}, int1AttendanceData = {}, internalExamData = {}, totalHours = 0, int1Hours = 30, int2Hours = 30, labHours = 0,
  onAttendanceChange, onInternalExamChange, onTotalHoursChange,
  labData = {}, assessmentMode = 'internal1', selectedSubject = {}, onLabDataChange, isLocked
}) {
  const { user } = useAuth();
  const isElevated = user?.role === 'principal' || user?.role === 'vice_principal' || user?.role === 'hod' || user?.role === 'admin';
  const totalMax = (components || []).reduce((s, c) => s + (parseFloat(c?.max) || 0), 0);

  // Which hours to show based on mode (default standard 30)
  const displayHours = (assessmentMode === 'internal1' ? int1Hours : int2Hours) || 30;
  const isLabCumTheory = selectedSubject?.type === 'Lab-cum-Theory' || selectedSubject?.type === 'Theory-cum-Lab';
  const isPureLab = Boolean(selectedSubject && (
    selectedSubject.type === 'Practical' ||
    selectedSubject.type === 'Laboratory' ||
    selectedSubject.type === 'Lab' ||
    (selectedSubject.name?.toLowerCase().includes('laboratory') && !['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab'].includes(selectedSubject?.type))
  ));
  const prescribedLabHours = parseInt(labHours || selectedSubject?.total_hours || 40, 10);

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            {isPureLab ? (
              <tr>
                <th className={`${styles.th} ${styles.sNoTh}`}>S.No</th>
                <th className={`${styles.th} ${styles.rollNoTh}`}>Roll No</th>
                <th className={`${styles.th} ${styles.studentTh}`}>Student Name</th>

                {/* Column 1: Lab Total Hours on top, enter actual attended hours below */}
                <th className={`${styles.th} ${styles.attendanceTh}`}>
                  <div className={styles.thContent}>
                    <span className={styles.thIcon}>⏱</span>
                    <span className={styles.thLabel}>Lab Attended Hours</span>
                    <div className={styles.globalHoursWrap} style={{ marginTop: '4px' }}>
                      <label style={{ fontSize: '0.65rem', opacity: 0.85 }}>Total Lab Hrs:</label>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        className={styles.globalHoursInput}
                        value={totalHours || labHours || selectedSubject?.total_hours || selectedSubject?.lab_hours || ''}
                        onChange={(e) => onTotalHoursChange && onTotalHoursChange(e.target.value)}
                        disabled={isLocked}
                        placeholder="Hrs"
                        title="Enter total lab hours"
                        style={{ width: '48px', padding: '2px 4px', fontSize: '0.75rem', borderRadius: '4px', textAlign: 'center' }}
                      />
                    </div>
                  </div>
                </th>

                {/* Regulation 2025: Attendance Mark */}
                <th className={`${styles.th} ${styles.computedTh}`}>
                  Attd Mark
                  <div className={styles.thSub}>/ 5</div>
                </th>

                {/* Column 2: Lab Exam Mark written out of 100 */}
                <th className={`${styles.th} ${styles.internalExamTh}`}>
                  <div className={styles.thContent}>
                    <span className={styles.thIcon}>🔬</span>
                    <span className={styles.thLabel}>Lab Practical Exam</span>
                    <div className={styles.thSub}>Max: 100</div>
                  </div>
                </th>

                {/* Total Mark & Result */}
                <th className={`${styles.th} ${styles.computedTh}`}>
                  Total Mark
                  <div className={styles.thSub}>/ 100</div>
                </th>
                <th className={`${styles.th} ${styles.computedTh}`}>
                  Result
                  <div className={styles.thSub}>Pass &gt;= 50</div>
                </th>
              </tr>
            ) : (
              <tr>
                {/* Sticky Columns */}
                <th className={`${styles.th} ${styles.sNoTh}`}>S.No</th>
                <th className={`${styles.th} ${styles.rollNoTh}`}>Roll No</th>
                <th className={`${styles.th} ${styles.studentTh}`}>Student Name</th>

                {/* Dynamic Assessment Columns */}
                {(components || []).filter(Boolean).map((comp) => (
                  <th key={comp.uid} className={styles.th}>
                    <div className={styles.thContent}>
                      <span className={styles.thIcon}>{comp.icon}</span>
                      <span className={styles.thLabel}>{comp.label}</span>
                      <span className={styles.thMax}>Max: {comp.conductedMax || 100}</span>
                    </div>
                  </th>
                ))}

                {/* Attendance Column (Single clean attendance column for both Int 1 & Int 2) */}
                <th className={`${styles.th} ${styles.attendanceTh}`}>
                  <div className={styles.thContent}>
                    <span className={styles.thIcon}>📅</span>
                    <span className={styles.thLabel}>
                      Attendance
                    </span>
                    <div className={styles.globalHoursWrap}>
                      <label>Total Classes:</label>
                      <div className={styles.lockedHours} title={`Total Class Hours: ${displayHours}`}>{displayHours}</div>
                    </div>
                  </div>
                </th>

                {/* Lab Attendance Header (if Lab-cum-Theory / Theory-cum-Lab) */}
                {(selectedSubject?.type === 'Lab-cum-Theory' || selectedSubject?.type === 'Theory-cum-Lab') && (
                  <th className={`${styles.th} ${styles.attendanceTh}`}>
                    <div className={styles.thContent}>
                      <span className={styles.thIcon}>🧑‍🔬</span>
                      <span className={styles.thLabel}>Lab Attd</span>
                      <div className={styles.thSub}>Max: {labHours || 30}</div>
                    </div>
                  </th>
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
            )}
          </thead>
          <tbody>
            {(students || []).filter(Boolean).map((student, i) => (
              <MarksRow
                key={`${student?.id}-${assessmentMode}`}
                student={student}
                components={components || []}
                marks={(marksData && student?.id ? marksData[student.id] : {}) || {}}
                attendanceHours={(attendanceData && student?.id && attendanceData[student.id] !== undefined) ? attendanceData[student.id] : ''}
                savedAttendanceMark={attendanceMarks && student?.id ? attendanceMarks[student.id] : undefined}
                isElevated={isElevated}
                isPureLab={isPureLab}
                prescribedLabHours={prescribedLabHours}
                int1AttendanceHours={(int1AttendanceData && student?.id && int1AttendanceData[student.id] !== undefined) ? int1AttendanceData[student.id] : ''}
                internalExamMark={(internalExamData && student?.id && internalExamData[student.id] !== undefined) ? internalExamData[student.id] : ''}
                displayHours={displayHours}
                int1Hours={int1Hours || 30}
                int2Hours={int2Hours || 30}
                labHours={labHours || 30}
                assessmentMode={assessmentMode}
                selectedSubject={selectedSubject}
                labData={(labData && student?.id ? labData[student.id] : {}) || {}}
                onMarkChange={onMarkChange}
                isLocked={isLocked}
                onAttendanceChange={(val) => onAttendanceChange && student?.id && onAttendanceChange(student.id, val)}
                onInternalExamChange={(val) => onInternalExamChange && student?.id && onInternalExamChange(student.id, val)}
                onLabDataChange={(field, val) => onLabDataChange && student?.id && onLabDataChange(student.id, field, val)}
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
