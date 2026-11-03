import { computeGrade } from '../../data/assessmentTypes';
import { resolveAttendanceMark, calculateAttendanceMark } from '../../utils/attendanceCalculator';
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
    const val = parseFloat((marks || {})[c?.uid]) || 0;
    const conducted = parseFloat(c?.conductedMax) || 100;
    convertedTotal += Math.min(val, conducted);
  });
  convertedTotal = Math.round(convertedTotal);

  // Max allowed hours (strictly 30 or LTPC prescribed, cannot exceed)
  const maxAttdHours = Math.max(7, parseInt(int1Hours || displayHours || 30, 10));
  const maxInt2Hours = Math.max(7, parseInt(int2Hours || displayHours || 30, 10));
  const maxLabHours = Math.max(0, parseInt(labHours || 0, 10));

  const effectiveAttMark = resolveAttendanceMark(student?.id, {
    attendanceMarks: student?.id ? { [student.id]: savedAttendanceMark } : {},
    attendanceData: student?.id ? { [student.id]: attendanceHours } : {},
    totalHours: displayHours,
    assessmentMode,
    int1AttendanceData: student?.id ? { [student.id]: int1AttendanceHours } : {},
    int1Hours,
    int2Hours,
    labHours,
    labData: student?.id ? { [student.id]: labData } : {}
  });
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
    const pureLabPct = pureLabHoursMax > 0 ? Math.min(100, Math.round((pureLabAttdNum / pureLabHoursMax) * 100)) : 0;
    const pureLabAttdMark = calculateAttendanceMark(pureLabPct);

    const pureLabMarkRaw = (labData?.labMark !== undefined && labData?.labMark !== '') ? labData.labMark : (internalExamMark || '');
    const pureLabMarkNum = parseFloat(pureLabMarkRaw);
    const isPureLabAbsent = isNaN(pureLabMarkNum) || pureLabMarkRaw === '' || pureLabMarkRaw === 'AB';
    const pureLabTotal = isPureLabAbsent ? 0 : Math.min(100, Math.round(pureLabMarkNum));
    const isPureLabPass = !isPureLabAbsent && pureLabTotal >= 50;

    return (
      <tr className={styles.row} style={{ animationDelay: `${index * 40}ms` }}>
        {/* S.No */}
        <td className={styles.sNoCell}>{student?.sNo || index + 1}</td>

        {/* Roll No */}
        <td className={styles.rollNoCell}>{student?.rollNo || student?.roll_no || '-'}</td>

        {/* Student Info */}
        <td className={styles.studentCell}>
          <div className={styles.studentInfo}>
            <div className={styles.avatar} style={{ '--idx': index }}>
              {initials}
            </div>
            <span className={styles.name}>{student?.name || 'Student'}</span>
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
                let val = e.target.value;
                if (val !== '') {
                  const n = parseFloat(val);
                  if (!isNaN(n) && pureLabHoursMax > 0 && n > pureLabHoursMax) val = String(pureLabHoursMax);
                  else if (!isNaN(n) && n < 0) val = '0';
                }
                onAttendanceChange && onAttendanceChange(val);
                onLabDataChange && onLabDataChange('labAttendance', val);
              }}
              onKeyDown={(e) => {
                if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
                  const sel = window.getSelection()?.toString();
                  if (!sel && pureLabAttdNum >= pureLabHoursMax) {
                    e.preventDefault();
                  }
                }
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
                let val = e.target.value;
                if (val !== '') {
                  const n = parseFloat(val);
                  if (!isNaN(n) && n > 100) val = '100';
                  else if (!isNaN(n) && n < 0) val = '0';
                }
                onInternalExamChange && onInternalExamChange(val);
                onLabDataChange && onLabDataChange('labMark', val);
              }}
              onKeyDown={(e) => {
                if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
                  const sel = window.getSelection()?.toString();
                  if (!sel && pureLabMarkNum >= 100) {
                    e.preventDefault();
                  }
                }
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
      <td className={styles.sNoCell}>{student?.sNo || index + 1}</td>

      {/* Roll No */}
      <td className={styles.rollNoCell}>{student?.rollNo || student?.roll_no || '-'}</td>

      {/* Student Info */}
      <td className={styles.studentCell}>
        <div className={styles.studentInfo}>
          <div className={styles.avatar} style={{ '--idx': index }}>
            {initials}
          </div>
          <span className={styles.name}>{student?.name || 'Student'}</span>
        </div>
      </td>

      {/* Dynamic Component Inputs (Assessment / Activities) */}
      {(components || []).filter(Boolean).map((comp) => {
        const compUid = comp?.uid ?? comp?.id;
        const val = (marks && compUid !== undefined && marks[compUid] !== undefined) ? marks[compUid] : '';
        const numVal = parseFloat(val);
        const conductedMax = parseFloat(comp?.conductedMax) || 100;
        const isOver = !isNaN(numVal) && numVal > conductedMax;

        return (
          <td key={compUid || Math.random()} className={styles.inputCell}>
            <div className={styles.inputWrap}>
              <input
                id={`marks-${student?.id || index}-${compUid || 'comp'}`}
                type="number"
                min="0"
                max={conductedMax}
                step="0.5"
                className={`${styles.input} ${isOver ? styles.inputError : ''}`}
                value={val}
                onChange={(e) => {
                  let v = e.target.value;
                  if (v !== '') {
                    const n = parseFloat(v);
                    if (!isNaN(n) && conductedMax > 0 && n > conductedMax) v = String(conductedMax);
                    else if (!isNaN(n) && n < 0) v = '0';
                  }
                  if (onMarkChange && student?.id && compUid !== undefined) {
                    onMarkChange(student.id, compUid, v);
                  }
                }}
                onKeyDown={(e) => {
                  if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
                    const sel = window.getSelection()?.toString();
                    if (!sel && parseFloat(val) >= conductedMax) {
                      e.preventDefault();
                    }
                  }
                }}
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
      {(() => {
        const currentMaxAttd = Math.max(7, (assessmentMode === 'internal2' ? maxInt2Hours : maxAttdHours) || 30);
        return (
          <td className={styles.inputCell}>
            <div className={styles.inputWrap}>
              <input
                type="number"
                min="0"
                max={currentMaxAttd}
                className={`${styles.input} ${parseFloat(attendanceHours) > currentMaxAttd ? styles.inputError : ''}`}
                value={attendanceHours}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    onAttendanceChange('');
                    return;
                  }
                  const num = parseFloat(val);
                  if (!isNaN(num) && num > currentMaxAttd) {
                    onAttendanceChange(String(currentMaxAttd));
                    return;
                  }
                  if (!isNaN(num) && num < 0) {
                    onAttendanceChange('0');
                    return;
                  }
                  onAttendanceChange(val);
                }}
                onKeyDown={(e) => {
                  if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
                    const sel = window.getSelection()?.toString();
                    if (!sel && parseFloat(attendanceHours) >= currentMaxAttd) {
                      e.preventDefault();
                    }
                  }
                }}
                disabled={isLocked}
                placeholder="—"
              />
              <span className={styles.inputMax}>/{currentMaxAttd}</span>
              <span
                className={styles.attMarkBadge}
                title={`Calculated Attendance Mark: ${effectiveAttMark} / 5`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  marginLeft: '5px',
                  padding: '2px 5px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: '4px',
                  color: effectiveAttMark > 0 ? '#10b981' : '#94a3b8',
                  background: effectiveAttMark > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                  whiteSpace: 'nowrap'
                }}
              >
                {effectiveAttMark}m
              </span>
              {parseFloat(attendanceHours) > currentMaxAttd && (
                <span className={styles.errorTip}>Max: {currentMaxAttd}</span>
              )}
            </div>
          </td>
        );
      })()}

      {/* Lab Attendance Input Column (if Lab-cum-Theory / Theory-cum-Lab) */}
      {assessmentMode === 'internal2' &&
        (selectedSubject?.type === 'Lab-cum-Theory' || selectedSubject?.type === 'Theory-cum-Lab') && (
          <td className={styles.inputCell}>
            <div className={styles.inputWrap}>
              <input
                type="number"
                min="0"
                max={maxLabHours}
                className={`${styles.input} ${parseFloat(labData?.labAttendance) > maxLabHours ? styles.inputError : ''}`}
                value={labData?.labAttendance !== undefined ? labData.labAttendance : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    onLabDataChange && onLabDataChange('labAttendance', '');
                    return;
                  }
                  const num = parseFloat(val);
                  if (!isNaN(num) && num > maxLabHours) {
                    onLabDataChange && onLabDataChange('labAttendance', String(maxLabHours));
                    return;
                  }
                  if (!isNaN(num) && num < 0) {
                    onLabDataChange && onLabDataChange('labAttendance', '0');
                    return;
                  }
                  onLabDataChange && onLabDataChange('labAttendance', val);
                }}
                onKeyDown={(e) => {
                  if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
                    const sel = window.getSelection()?.toString();
                    if (!sel && parseFloat(labData?.labAttendance) >= maxLabHours) {
                      e.preventDefault();
                    }
                  }
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
            onChange={(e) => {
              let v = e.target.value;
              if (v !== '') {
                const n = parseFloat(v);
                if (!isNaN(n) && n > 100) v = '100';
                else if (!isNaN(n) && n < 0) v = '0';
              }
              onInternalExamChange(v);
            }}
            onKeyDown={(e) => {
              if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
                const sel = window.getSelection()?.toString();
                if (!sel && parseFloat(internalExamMark) >= 100) {
                  e.preventDefault();
                }
              }
            }}
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
              onChange={(e) => {
                let v = e.target.value;
                if (v !== '') {
                  const n = parseFloat(v);
                  if (!isNaN(n) && n > 100) v = '100';
                  else if (!isNaN(n) && n < 0) v = '0';
                }
                onLabDataChange('labMark', v);
              }}
              onKeyDown={(e) => {
                if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
                  const sel = window.getSelection()?.toString();
                  if (!sel && parseFloat(labData?.labMark) >= 100) {
                    e.preventDefault();
                  }
                }
              }}
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
