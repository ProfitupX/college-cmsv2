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
  student, components, marks = {}, internalExamMark,
  labData, assessmentMode, selectedSubject,
  onMarkChange, onInternalExamChange, onLabDataChange,
  isLocked, index, ciaMax, examConvertedMax
}) {
  const isLabType = selectedSubject?.type === 'Lab-cum-Theory' || selectedSubject?.type === 'Theory-cum-Lab';

  // 1. Sum raw component marks — cap each at conductedMax
  let rawCIA = 0;
  components.forEach(c => {
    const val = parseFloat(marks[c.uid]) || 0;
    const conducted = parseFloat(c.conductedMax) || 100;
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

  // 5. Compute Final Total
  let finalTotal;
  if (isLabType && assessmentMode === 'internal2') {
    // Internal exam NOT counted — only CIA + Lab Exam
    finalTotal = Math.min(ciaTotal + labExamConverted, 100);
  } else {
    finalTotal = Math.min(ciaTotal + examConverted, 100);
  }

  const initials = student.name.split(' ').map(n => n[0]).join('').slice(0, 2);

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
                onChange={(e) => onMarkChange(student.id, comp.uid, e.target.value)}
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
            className={`${styles.input} ${parseFloat(internalExamMark) > 100 ? styles.inputError : ''} ${
              (isLabType && assessmentMode === 'internal2') ? styles.readOnlyInput : ''
            }`}
            value={internalExamMark}
            onChange={(e) => onInternalExamChange(e.target.value)}
            disabled={isLocked}
            placeholder="—"
            title={isLabType && assessmentMode === 'internal2' ? 'Recorded for reference — not counted in total' : ''}
          />
          <span className={styles.inputMax}>/100</span>
          {/* Show converted value only if it counts */}
          {!(isLabType && assessmentMode === 'internal2') && examRaw > 0 && (
            <div className={styles.convertedDisplay}>
              <span className={styles.convertedLabel}>→</span> {examConverted}
              <span className={styles.convertedMax}>/{examConvertedMax}</span>
            </div>
          )}
          {(isLabType && assessmentMode === 'internal2') && (
            <div style={{ fontSize: '0.65rem', color: '#f59e0b', marginTop: '2px' }}>Ref only</div>
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
              onChange={(e) => onLabDataChange('labMark', e.target.value)}
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
