import styles from './MarksRow.module.css';

/**
 * MarksRow for 2021 Regulation (3rd & Final Year)
 *
 * Theory:
 *   CIA = sum of component marks (capped at ciaMax=40)
 *   Internal Exam: conducted /100, converted = (exam/100) * 60
 *   Final Total = CIA + examConverted (max 100), no attendance
 *
 * Lab-cum-Theory / Theory-cum-Lab:
 *   Int1:
 *     CIA = sum of component marks (capped at ciaMax=50)
 *     Internal Exam: conducted /100, converted = (exam/100) * 50
 *     Final Total = CIA + examConverted (max 100)
 *   Int2:
 *     CIA = sum of component marks (capped at ciaMax=50)
 *     Internal Exam: conducted /100 — SHOWN but NOT counted in final total
 *     Lab Exam: conducted /100, converted = (labExam/100) * 50
 *     Final Total = CIA + labExamConverted (max 100)
 */
export default function MarksRow2021({
  student = {}, components = [], marks = {}, attendanceHours = '', totalHours = 0,
  internalExamMark = '', labData = {}, assessmentMode = 'internal1', selectedSubject = {},
  isPureLab = false,
  onMarkChange, onAttendanceChange, onInternalExamChange, onLabDataChange,
  isLocked, index = 0, ciaMax = 40, examConvertedMax = 60
}) {
  // Match both hyphenated ('Theory-cum-Lab') and non-hyphenated ('Theory cum Lab') DB values
  const isLabType = [
    'Lab-cum-Theory', 'Theory-cum-Lab',
    'Lab cum Theory', 'Theory cum Lab'
  ].includes(selectedSubject?.type);

  const initials = (student?.name || 'Unknown')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Pure Laboratory / Practical Mode (Regulation 2021 - NO attendance marks)
  if (isPureLab) {
    const pureLabHoursMax = parseInt(totalHours || selectedSubject?.total_hours || selectedSubject?.lab_hours || 40, 10);
    const pureLabAttdRaw = (attendanceHours !== undefined && attendanceHours !== '') ? attendanceHours : (labData?.labAttendance || '');
    const pureLabAttdNum = parseInt(pureLabAttdRaw || 0, 10);

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
            color: isPureLabAbsent ? '#64748b' : (isPureLabPass ? '#16a34a' : '#dc2626')
          }}>
            {isPureLabAbsent ? 'AB' : (isPureLabPass ? 'PASS' : 'FAIL')}
          </span>
        </td>
      </tr>
    );
  }

  // 1. Sum raw component marks — cap each at conductedMax
  let rawCIA = 0;
  (components || []).forEach(c => {
    const val = parseFloat(marks[c?.uid]) || 0;
    const conducted = parseFloat(c?.conductedMax) || 100;
    rawCIA += Math.min(val, conducted);
  });

  // 2. Cap CIA at ciaMax (40 for theory, 50 for lab types)
  const ciaTotal = Math.min(Math.round(rawCIA), ciaMax);

  // 3. Internal exam converted
  const examRaw = parseFloat(internalExamMark) || 0;
  const examConverted = Math.round((examRaw / 100) * examConvertedMax);

  // 4. Lab exam converted (Int2 lab type only)
  const labExamRaw = parseFloat(labData?.labMark) || 0;
  const labExamConverted = Math.round((labExamRaw / 100) * 50);

  // 5. Compute Final Total (Attendance does NOT affect marks)
  let finalTotal;
  if (isLabType && assessmentMode === 'internal2') {
    // Internal exam NOT counted — only CIA + Lab Exam
    finalTotal = Math.min(ciaTotal + labExamConverted, 100);
  } else {
    finalTotal = Math.min(ciaTotal + examConverted, 100);
  }

  const parsedAttd = parseInt(attendanceHours);
  const hasAttd = attendanceHours !== '' && !isNaN(parsedAttd);
  const attdOver = totalHours > 0 && hasAttd && parsedAttd > totalHours;
  const attdPercent = totalHours > 0 && hasAttd ? Math.min(100, Math.round((parsedAttd / totalHours) * 100)) : null;

  return (
    <tr className={styles.row} style={{ animationDelay: `${index * 40}ms` }}>
      {/* S.No */}
      <td className={styles.sNoCell}>{student.sNo || index + 1}</td>

      {/* Roll No */}
      <td className={styles.rollNoCell}>{student.rollNo || student.roll_no || '-'}</td>

      {/* Student Name */}
      <td className={styles.studentCell}>
        <div className={styles.studentInfo}>
          <div className={styles.avatar} style={{ '--idx': index }}>
            {initials}
          </div>
          <span className={styles.name}>{student.name}</span>
        </div>
      </td>

      {/* Dynamic component inputs */}
      {components.map((comp) => {
        const val = marks[comp.uid] !== undefined ? marks[comp.uid] : '';
        const numVal = parseFloat(val);
        const conductedMax = parseFloat(comp.conductedMax) || 100;
        const isOver = !isNaN(numVal) && numVal > conductedMax;

        return (
          <td key={comp.uid} className={styles.inputCell}>
            <div className={styles.inputWrap}>
              <input
                id={`marks2021-${student.id}-${comp.uid}`}
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
                  onMarkChange(student.id, comp.uid, v);
                }}
                disabled={isLocked}
                placeholder="—"
              />
              <span className={styles.inputMax}>/{conductedMax}</span>
              {isOver && <span className={styles.errorTip}>Max: {conductedMax}</span>}
            </div>
          </td>
        );
      })}

      {/* CIA Total (computed, read-only) */}
      <td className={styles.totalCell}>
        <div
          className={styles.finalTotalBadge}
          style={{
            background: rawCIA > ciaMax ? 'var(--danger)' : 'var(--primary)',
            color: '#fff',
          }}
          title={`Raw sum: ${Math.round(rawCIA)} → capped at ${ciaMax}`}
        >
          <span className={styles.total}>{ciaTotal}</span>
          <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>/{ciaMax}</span>
        </div>
      </td>

      {/* Internal Exam input — always shown */}
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
            disabled={isLocked}
            placeholder="—"
          />
          <span className={styles.inputMax}>/100</span>
          {/* Show converted value only if it counts */}
          {!(isLabType && assessmentMode === 'internal2') && examRaw > 0 && (
            <div className={styles.convertedDisplay}>
              <span className={styles.convertedLabel}>→</span> {examConverted}
              <span className={styles.convertedMax}>/{examConvertedMax}</span>
            </div>
          )}
        </div>
      </td>

      {/* Lab Exam — only Int2 Lab-cum-Theory */}
      {assessmentMode === 'internal2' && isLabType && (
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
              disabled={isLocked}
              placeholder="—"
            />
            <span className={styles.inputMax}>/100</span>
            {labExamRaw > 0 && (
              <div className={styles.convertedDisplay}>
                <span className={styles.convertedLabel}>→</span> {labExamConverted}
                <span className={styles.convertedMax}>/50</span>
              </div>
            )}
          </div>
        </td>
      )}

      {/* Attendance Column (Manual entry, purely for records, 0 marks weight) */}
      <td className={styles.inputCell}>
        <div className={styles.inputWrap}>
          <input
            type="number"
            min="0"
            value={attendanceHours}
            max={totalHours > 0 ? totalHours : undefined}
            className={`${styles.input} ${attdOver ? styles.inputError : ''}`}
            onChange={(e) => {
              let v = e.target.value;
              if (v !== '') {
                const n = parseFloat(v);
                const maxH = totalHours > 0 ? totalHours : 30;
                if (!isNaN(n) && maxH > 0 && n > maxH) v = String(maxH);
                else if (!isNaN(n) && n < 0) v = '0';
              }
              onAttendanceChange(v);
            }}
            disabled={isLocked}
            placeholder="—"
            title="Attended classes / hours"
          />
          <span className={styles.inputMax}>/{totalHours || '—'}</span>
        </div>
      </td>

      {/* Final Total */}
      <td className={styles.totalCell}>
        <div
          className={styles.finalTotalBadge}
          style={{
            background: finalTotal < 50 ? 'var(--danger)' : 'var(--success, #10b981)',
            color: '#fff',
          }}
        >
          <span className={styles.total}>{finalTotal}</span>
          <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>/100</span>
        </div>
      </td>
    </tr>
  );
}
