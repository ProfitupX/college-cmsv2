import { computeGrade } from '../../data/assessmentTypes';
import styles from './MarksRow.module.css';

export default function MarksRow({ 
  student = {}, components = [], marks = {}, attendanceHours = '', savedAttendanceMark, isElevated, int1AttendanceHours = '', internalExamMark = '', displayHours = 30, conductedHours, conductedCumHours, int1Hours = 30, int2Hours = 30, labHours = 0,
  onMarkChange, onAttendanceChange, onInternalExamChange, index = 0,
  assessmentMode = 'internal1', labData = {}, selectedSubject = {}, onLabDataChange, isLocked,
  isPureLab = false, prescribedLabHours = 40
}) {
  // Converted total (sum of raw marks)
  let convertedTotal = 0;
  (components || []).forEach(c => {
    const val = parseFloat(marks[c?.uid]) || 0;
    const conducted = parseFloat(c?.conductedMax) || 100;
    convertedTotal += Math.min(val, conducted);
  });
  convertedTotal = Math.round(convertedTotal);

  // Anna Univ 25th Regulation attendance rule:
  // 95–100% → 5 marks, 90–95% → 3 marks, 85–90% → 2 marks, 80–85% → 1 mark, <80% → 0 marks
  const getAttendanceMark = (attended, maxHours) => {
    if (!maxHours || maxHours <= 0) return 0;
    const pct = (attended / maxHours) * 100;
    if (pct >= 95) return 5;
    if (pct >= 90) return 3;
    if (pct >= 85) return 2;
    if (pct >= 80) return 1;
    return 0; // Below 80% is 0 mark
  };

  let attendanceMark = 0;
  let cumulativeAttended = 0;
  let cumulativeMaxHours = 0;

  // Max allowed hours (strictly 30 or LTPC prescribed, cannot exceed)
  const maxAttdHours = parseInt(int1Hours || displayHours || 30, 10);
  const maxInt2Hours = parseInt(int2Hours || displayHours || 30, 10);
  const maxLabHours  = parseInt(labHours || 30, 10);

  if (assessmentMode === 'internal1') {
    const baseHours = maxAttdHours;
    const aHours = parseInt(attendanceHours || 0, 10);
    if (baseHours > 0 && !isNaN(aHours)) {
      const cappedHours = Math.min(aHours, baseHours);
      attendanceMark = getAttendanceMark(cappedHours, baseHours);
    }
  } else {
    // Internal 2 mode: Cumulative attendance (Int1 + Int2 [+ Lab if Lab-cum-Theory])
    const i1Attd = parseInt(int1AttendanceHours || 0, 10);
    const i2Attd = parseInt(attendanceHours || 0, 10);
    const isLabCumTheory = selectedSubject?.type === 'Lab-cum-Theory' || selectedSubject?.type === 'Theory-cum-Lab';
    const lAttd  = isLabCumTheory ? parseInt(labData?.labAttendance || 0, 10) : 0;
    
    const i1Max = maxAttdHours;
    const i2Max = maxInt2Hours;
    const lMax  = isLabCumTheory ? maxLabHours : 0;
    cumulativeMaxHours = i1Max + i2Max + lMax;

    cumulativeAttended = Math.min(i1Attd, i1Max) + Math.min(i2Attd, i2Max) + (isLabCumTheory ? Math.min(lAttd, lMax) : 0);

    if (cumulativeMaxHours > 0) {
      attendanceMark = getAttendanceMark(cumulativeAttended, cumulativeMaxHours);
    }
  }

  const effectiveAttMark = (savedAttendanceMark !== undefined && savedAttendanceMark !== null && parseFloat(savedAttendanceMark) > 0)
    ? parseFloat(savedAttendanceMark)
    : attendanceMark;
  const finalTotal100 = convertedTotal + effectiveAttMark;
  const initials = (student?.name || 'Unknown')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Pure Laboratory / Practical Mode
  if (isPureLab) {
    const pureLabHoursMax = parseInt(prescribedLabHours || labHours || selectedSubject?.total_hours || 40, 10);
    const pureLabAttdRaw = (attendanceHours !== undefined && attendanceHours !== '') ? attendanceHours : (labData?.labAttendance || '');
    const pureLabAttdNum = parseInt(pureLabAttdRaw || 0, 10);
    const pureLabAttdMark = getAttendanceMark(pureLabAttdNum, pureLabHoursMax);

    const pureLabMarkRaw = (labData?.labMark !== undefined && labData?.labMark !== '') ? labData.labMark : (internalExamMark || '');
    const pureLabMarkNum = parseFloat(pureLabMarkRaw);
    const isPureLabAbsent = isNaN(pureLabMarkNum) || pureLabMarkRaw === '' || pureLabMarkRaw === 'AB';
    const pureLabTotal = isPureLabAbsent ? 0 : Math.min(100, Math.round(pureLabMarkNum));
    const isPureLabPass = !isPureLabAbsent && pureLabTotal >= 50;

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

        {/* Column 1: Lab Attended Hours */}
        <td className={styles.inputCell}>
          <div className={styles.inputWrap}>
            <input
              type="number"
              min="0"
              max={pureLabHoursMax}
              className={`${styles.input} ${pureLabAttdNum > pureLabHoursMax ? styles.inputError : ''}`}
              value={pureLabAttdRaw}
              onChange={(e) => {
                const val = e.target.value;
                onAttendanceChange && onAttendanceChange(val);
                onLabDataChange && onLabDataChange('labAttendance', val);
              }}
              disabled={isLocked}
              placeholder="Attended Hrs"
            />
            <span className={styles.inputMax}>/{pureLabHoursMax}</span>
            {pureLabAttdNum > pureLabHoursMax && (
              <span className={styles.errorTip}>Max: {pureLabHoursMax}</span>
            )}
          </div>
        </td>

        {/* Regulation 2025: Attendance Mark */}
        <td className={styles.totalCell}>
          <div className={styles.finalTotalBadge} style={{ background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1' }}>
            <span className={styles.total}>{pureLabAttdMark}</span>
          </div>
        </td>

        {/* Column 2: Lab Exam Mark written out of 100 */}
        <td className={styles.inputCell}>
          <div className={styles.inputWrap}>
            <input
              type="number"
              min="0"
              max="100"
              className={`${styles.input} ${pureLabMarkNum > 100 ? styles.inputError : ''}`}
              value={pureLabMarkRaw}
              onChange={(e) => {
                const val = e.target.value;
                onInternalExamChange && onInternalExamChange(val);
                onLabDataChange && onLabDataChange('labMark', val);
              }}
              disabled={isLocked}
              placeholder="Lab Mark / 100"
            />
            <span className={styles.inputMax}>/100</span>
            {pureLabMarkNum > 100 && (
              <span className={styles.errorTip}>Max: 100</span>
            )}
          </div>
        </td>

        {/* Total Mark */}
        <td className={styles.totalCell}>
          <div
            className={styles.finalTotalBadge}
            style={{
              background: isPureLabAbsent ? '#94a3b8' : (isPureLabPass ? '#059669' : '#dc2626'),
              color: '#ffffff'
            }}
          >
            <span className={styles.total}>{isPureLabAbsent ? 'AB' : pureLabTotal}</span>
          </div>
        </td>

        {/* Result */}
        <td className={styles.totalCell} style={{ textAlign: 'center' }}>
          <span style={{
            fontWeight: 700,
            fontSize: '0.85rem',
            color: isPureLabAbsent ? '#64748b' : (isPureLabPass ? '#059669' : '#dc2626')
          }}>
            {isPureLabAbsent ? 'AB' : (isPureLabPass ? 'PASS' : 'FAIL')}
          </span>
        </td>
      </tr>
    );
  }

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
              max={maxAttdHours}
              className={`${styles.input} ${parseFloat(attendanceHours) > maxAttdHours ? styles.inputError : ''}`}
              value={attendanceHours}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  onAttendanceChange('');
                  return;
                }
                const num = parseFloat(val);
                if (!isNaN(num) && num > maxAttdHours) {
                  onAttendanceChange(String(maxAttdHours));
                  return;
                }
                if (!isNaN(num) && num < 0) {
                  onAttendanceChange('0');
                  return;
                }
                onAttendanceChange(val);
              }}
              disabled={isLocked}
              placeholder="—"
            />
            <span className={styles.inputMax}>/{maxAttdHours}</span>
            {parseFloat(attendanceHours) > maxAttdHours && (
              <span className={styles.errorTip}>Max: {maxAttdHours}</span>
            )}
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
              <span className={styles.inputMax}>/{maxAttdHours}</span>
            </div>
          </td>

          {/* Int 2 Attendance Input Column */}
          <td className={styles.inputCell}>
            <div className={styles.inputWrap}>
              <input
                type="number"
                min="0"
                max={maxInt2Hours}
                className={`${styles.input} ${parseFloat(attendanceHours) > maxInt2Hours ? styles.inputError : ''}`}
                value={attendanceHours}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    onAttendanceChange('');
                    return;
                  }
                  const num = parseFloat(val);
                  if (!isNaN(num) && num > maxInt2Hours) {
                    onAttendanceChange(String(maxInt2Hours));
                    return;
                  }
                  if (!isNaN(num) && num < 0) {
                    onAttendanceChange('0');
                    return;
                  }
                  onAttendanceChange(val);
                }}
                disabled={isLocked}
                placeholder="—"
              />
              <span className={styles.inputMax}>/{maxInt2Hours}</span>
              {parseFloat(attendanceHours) > maxInt2Hours && (
                <span className={styles.errorTip}>Max: {maxInt2Hours}</span>
              )}
            </div>
          </td>

          {/* Lab Attendance Input Column (if Lab-cum-Theory / Theory-cum-Lab) */}
          {(selectedSubject?.type === 'Lab-cum-Theory' || selectedSubject?.type === 'Theory-cum-Lab') && (
            <td className={styles.inputCell}>
              <div className={styles.inputWrap}>
                <input
                  type="number"
                  min="0"
                  max={maxLabHours}
                  className={`${styles.input} ${parseFloat(labData?.labAttendance) > maxLabHours ? styles.inputError : ''}`}
                  value={labData?.labAttendance || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      onLabDataChange('labAttendance', '');
                      return;
                    }
                    const num = parseFloat(val);
                    if (!isNaN(num) && num > maxLabHours) {
                      onLabDataChange('labAttendance', String(maxLabHours));
                      return;
                    }
                    if (!isNaN(num) && num < 0) {
                      onLabDataChange('labAttendance', '0');
                      return;
                    }
                    onLabDataChange('labAttendance', val);
                  }}
                  disabled={isLocked}
                  placeholder="—"
                />
                <span className={styles.inputMax}>/{maxLabHours}</span>
                {parseFloat(labData?.labAttendance) > maxLabHours && (
                  <span className={styles.errorTip}>Max: {maxLabHours}</span>
                )}
              </div>
            </td>
          )}
        </>
      )}

      {/* Activities / Component Total */}
      <td className={styles.totalCell}>
        <div className={styles.finalTotalBadge}
          style={{
            background: `var(--text-primary)`,
            color: `var(--surface)`,
          }}
        >
          <span className={styles.total}>{convertedTotal}</span>
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

      {/* Lab Mark column - only when mode is internal2 AND type is Lab-cum-Theory / Theory-cum-Lab */}
      {assessmentMode === 'internal2' && (selectedSubject?.type === 'Lab-cum-Theory' || selectedSubject?.type === 'Theory-cum-Lab') && (
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
