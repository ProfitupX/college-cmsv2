import { computeGrade } from '../../data/assessmentTypes';
import styles from './MarksRow.module.css';

export default function MarksRow({ 
  student, components, marks = {}, attendanceHours, int1AttendanceHours, internalExamMark, displayHours, int1Hours, int2Hours, labHours,
  onMarkChange, onAttendanceChange, onInternalExamChange, index,
  assessmentMode, labData, selectedSubject, onLabDataChange, isLocked
}) {
  // Converted total (sum of raw marks)
  let convertedTotal = 0;
  components.forEach(c => {
    const val = parseFloat(marks[c.uid]) || 0;
    const conducted = parseFloat(c.conductedMax) || 100;
    convertedTotal += Math.min(val, conducted);
  });

  const getAttendanceMark = (attended, maxHours) => {
    if (!maxHours || maxHours <= 0) return 0;
    const mark = (attended / maxHours) * 5;
    return Math.min(5, Math.max(0, mark));
  };

  let attendanceMark = 0;
  let cumulativeAttended = 0;
  let cumulativeMaxHours = 0;

  if (assessmentMode === 'internal1') {
    const tHours = parseInt(int1Hours || displayHours || 0);
    const aHours = parseInt(attendanceHours || 0);
    if (tHours > 0 && !isNaN(aHours)) {
      attendanceMark = getAttendanceMark(aHours, tHours);
    }
  } else {
    // Internal 2 mode: Cumulative attendance (Int1 + Int2 [+ Lab if Lab-cum-Theory])
    const i1Attd = parseInt(int1AttendanceHours || 0);
    const i2Attd = parseInt(attendanceHours || 0);
    const lAttd  = (selectedSubject?.type === 'Lab-cum-Theory') ? parseInt(labData?.labAttendance || 0) : 0;
    
    cumulativeAttended = i1Attd + i2Attd + lAttd;

    const i1Max = parseInt(int1Hours || 0);
    const i2Max = parseInt(int2Hours || 0);
    const lMax  = (selectedSubject?.type === 'Lab-cum-Theory') ? parseInt(labHours || 0) : 0;
    
    cumulativeMaxHours = i1Max + i2Max + lMax;

    if (cumulativeMaxHours > 0) {
      attendanceMark = getAttendanceMark(cumulativeAttended, cumulativeMaxHours);
    }
  }

  const finalTotal100 = convertedTotal + attendanceMark;
  const initials = student.name.split(' ').map((n) => n[0]).join('').slice(0, 2);

  return (
    <tr className={styles.row} style={{ animationDelay: `${index * 40}ms` }}>
      {/* S.No */}
      <td className={styles.sNoCell}>{student.sNo || index + 1}</td>

      {/* Roll No */}
      <td className={styles.rollNoCell}>{student.rollNo || student.roll_no || '-'}</td>

      {/* Student Info */}
      <td className={styles.studentCell}>
        <div className={styles.studentInfo}>
          <div className={styles.avatar} style={{ '--idx': index }}>
            {initials}
          </div>
          <span className={styles.name}>{student.name}</span>
        </div>
      </td>

      {/* Dynamic Component Inputs (Assessment / Activities) */}
      {components.map((comp) => {
        const val = marks[comp.uid] !== undefined ? marks[comp.uid] : '';
        const numVal = parseFloat(val);
        const conductedMax = parseFloat(comp.conductedMax) || 100;
        const isOver = !isNaN(numVal) && numVal > conductedMax;

        return (
          <td key={comp.uid} className={styles.inputCell}>
            <div className={styles.inputWrap}>
              <input
                id={`marks-${student.id}-${comp.uid}`}
                type="number"
                min="0"
                max={conductedMax}
                step="0.5"
                className={`${styles.input} ${isOver ? styles.inputError : ''}`}
                value={val}
                onChange={(e) => onMarkChange(student.id, comp.uid, e.target.value)}
                disabled={isLocked}
                placeholder="—"
              />
              <span className={styles.inputMax}>/{conductedMax}</span>
              {isOver && (
                <span className={styles.errorTip}>Max: {conductedMax}</span>
              )}
            </div>
          </td>
        );
      })}

      {/* Attendance Cells */}
      {assessmentMode === 'internal1' ? (
        <td className={styles.inputCell}>
          <div className={styles.inputWrap}>
            <input
              type="number"
              min="0"
              max={int1Hours || displayHours || 100}
              className={`${styles.input} ${parseInt(attendanceHours) > (int1Hours || displayHours || 0) ? styles.inputError : ''}`}
              value={attendanceHours}
              onChange={(e) => onAttendanceChange(e.target.value)}
              disabled={isLocked}
              placeholder="—"
            />
            <span className={styles.inputMax}>/{int1Hours || displayHours || '?'}</span>
            <div className={styles.convertedDisplay}>
              <span className={styles.convertedLabel}>wt.</span> {attendanceMark.toFixed(1)} 
              <span className={styles.convertedMax}>/5</span>
            </div>
          </div>
        </td>
      ) : (
        <>
          {/* Read-Only Int 1 Attendance Column */}
          <td className={styles.inputCell}>
            <div className={styles.inputWrap}>
              <input
                type="number"
                className={`${styles.input} ${styles.readOnlyInput}`}
                value={int1AttendanceHours || 0}
                readOnly
                disabled
                title="Attendance from Internal Assessment 1"
              />
              <span className={styles.inputMax}>/{int1Hours || '?'}</span>
            </div>
          </td>

          {/* Int 2 Attendance Input Column */}
          <td className={styles.inputCell}>
            <div className={styles.inputWrap}>
              <input
                type="number"
                min="0"
                max={int2Hours || 100}
                className={`${styles.input} ${parseInt(attendanceHours) > (int2Hours || 0) && (int2Hours || 0) > 0 ? styles.inputError : ''}`}
                value={attendanceHours}
                onChange={(e) => onAttendanceChange(e.target.value)}
                disabled={isLocked}
                placeholder="—"
              />
              <span className={styles.inputMax}>/{int2Hours || '?'}</span>
              <div className={styles.convertedDisplay} title={`Cumulative Attended: ${cumulativeAttended}/${cumulativeMaxHours}`}>
                <span className={styles.convertedLabel}>wt.</span> {attendanceMark.toFixed(1)} 
                <span className={styles.convertedMax}>/5</span>
              </div>
            </div>
          </td>

          {/* Lab Attendance Input Column (if Lab-cum-Theory) */}
          {selectedSubject?.type === 'Lab-cum-Theory' && (
            <td className={styles.inputCell}>
              <div className={styles.inputWrap}>
                <input
                  type="number"
                  min="0"
                  max={labHours || 100}
                  className={`${styles.input} ${parseFloat(labData?.labAttendance) > (labHours || 100) ? styles.inputError : ''}`}
                  value={labData?.labAttendance || ''}
                  onChange={(e) => onLabDataChange('labAttendance', e.target.value)}
                  disabled={isLocked}
                  placeholder="—"
                />
                <span className={styles.inputMax}>/{labHours || '?'}</span>
                {parseFloat(labData?.labAttendance) > (labHours || 100) && (
                  <span className={styles.errorTip}>Max: {labHours || '?'}</span>
                )}
              </div>
            </td>
          )}
        </>
      )}

      {/* Final Score */}
      <td className={styles.totalCell}>
        <div className={styles.finalTotalBadge}
          style={{
            background: `var(--text-primary)`,
            color: `var(--surface)`,
          }}
        >
          <span className={styles.total}>{finalTotal100.toFixed(1)}</span>
        </div>
      </td>

      {/* Internal Exam */}
      <td className={styles.inputCell}>
        <div className={styles.inputWrap}>
          <input
            type="number"
            min="0"
            max="100"
            className={`${styles.input} ${parseFloat(internalExamMark) > 100 ? styles.inputError : ''}`}
            value={internalExamMark}
            onChange={(e) => onInternalExamChange(e.target.value)}
            disabled={isLocked}
            placeholder="—"
          />
          <span className={styles.inputMax}>/100</span>
          {parseFloat(internalExamMark) > 100 && (
            <span className={styles.errorTip}>Max: 100</span>
          )}
        </div>
      </td>

      {/* Lab Mark column - only when mode is internal2 AND type is Lab-cum-Theory */}
      {assessmentMode === 'internal2' && selectedSubject?.type === 'Lab-cum-Theory' && (
        <td className={styles.inputCell}>
          <div className={styles.inputWrap}>
            <input
              type="number"
              min="0"
              max="100"
              className={`${styles.input} ${parseFloat(labData?.labMark) > 100 ? styles.inputError : ''}`}
              value={labData?.labMark || ''}
              onChange={(e) => onLabDataChange('labMark', e.target.value)}
              disabled={isLocked}
              placeholder="—"
            />
            <span className={styles.inputMax}>/100</span>
            {parseFloat(labData?.labMark) > 100 && (
              <span className={styles.errorTip}>Max: 100</span>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}
