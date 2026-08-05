import MarksRow2021 from './MarksRow2021';
import styles from './MarksTable.module.css';

/**
 * MarksTable for 2021 Regulation (3rd & Final Year)
 * 
 * Theory:
 *   Int1 & Int2 — CIA /40 (sum of components) + Internal Exam /100→60 = Total /100
 * 
 * Lab-cum-Theory / Theory-cum-Lab:
 *   Int1 — CIA /50 + Internal Exam /100→50 = Total /100
 *   Int2 — CIA /50 + Internal Exam /100 (shown, NOT counted) + Lab Exam /100→50 = Total /100
 * 
 * NO attendance marks column.
 */
export default function MarksTable2021({
  students, components, marksData, onMarkChange,
  internalExamData, labData,
  assessmentMode, selectedSubject,
  onInternalExamChange, onLabDataChange, isLocked
}) {
  const isLabType = selectedSubject?.type === 'Lab-cum-Theory' || selectedSubject?.type === 'Theory-cum-Lab';
  const ciaMax    = isLabType ? 50 : 40;
  const examConvertedMax = isLabType ? 50 : 60;

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {/* Fixed columns */}
              <th className={`${styles.th} ${styles.sNoTh}`}>S.No</th>
              <th className={`${styles.th} ${styles.rollNoTh}`}>Roll No</th>
              <th className={`${styles.th} ${styles.studentTh}`}>Student Name</th>

              {/* Dynamic assessment component columns */}
              {components.map((comp) => (
                <th key={comp.uid} className={styles.th}>
                  <div className={styles.thContent}>
                    <span className={styles.thIcon}>{comp.icon}</span>
                    <span className={styles.thLabel}>{comp.label}</span>
                    <span className={styles.thMax}>Max: {comp.conductedMax || 100}</span>
                  </div>
                </th>
              ))}

              {/* CIA Total (computed) */}
              <th className={`${styles.th} ${styles.computedTh}`}>
                CIA Total
                <div className={styles.thSub}>/ {ciaMax}</div>
              </th>

              {/* Internal Exam column — always shown */}
              <th className={`${styles.th} ${styles.internalExamTh}`}>
                <div className={styles.thContent}>
                  <span className={styles.thIcon}>📝</span>
                  <span className={styles.thLabel}>
                    {assessmentMode === 'internal1' ? 'Internal 1 Exam' : 'Internal 2 Exam'}
                    {assessmentMode === 'internal2' && isLabType && (
                      <span style={{ color: '#f59e0b', fontSize: '0.7rem', display: 'block' }}>(Ref only)</span>
                    )}
                  </span>
                  <div className={styles.thSub}>
                    /100 → {examConvertedMax}
                    {assessmentMode === 'internal2' && isLabType && ' ⚠️ Not counted'}
                  </div>
                </div>
              </th>

              {/* Lab Exam column — only Int2 Lab-cum-Theory */}
              {assessmentMode === 'internal2' && isLabType && (
                <th className={`${styles.th} ${styles.internalExamTh}`}>
                  <div className={styles.thContent}>
                    <span className={styles.thIcon}>🔬</span>
                    <span className={styles.thLabel}>Lab Exam</span>
                    <div className={styles.thSub}>/100 → 50</div>
                  </div>
                </th>
              )}

              {/* Final Score */}
              <th className={`${styles.th} ${styles.computedTh}`} style={{ background: 'var(--primary)', color: '#fff' }}>
                Final Total
                <div className={styles.thSub}>/ 100</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, i) => (
              <MarksRow2021
                key={`${student.id}-${assessmentMode}`}
                student={student}
                components={components}
                marks={marksData[student.id] || {}}
                internalExamMark={internalExamData[student.id] || ''}
                labData={labData ? labData[student.id] || {} : {}}
                assessmentMode={assessmentMode}
                selectedSubject={selectedSubject}
                onMarkChange={onMarkChange}
                onInternalExamChange={(val) => onInternalExamChange(student.id, val)}
                onLabDataChange={(field, val) => onLabDataChange(student.id, field, val)}
                isLocked={isLocked}
                index={i}
                ciaMax={ciaMax}
                examConvertedMax={examConvertedMax}
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
          CIA max: {ciaMax} marks
        </span>
        <span className={styles.footerFormula}>
          {!isLabType
            ? `Formula: CIA (/40) + Exam (/100→60) = Total /100`
            : assessmentMode === 'internal1'
              ? `Formula: CIA (/50) + Exam (/100→50) = Total /100`
              : `Formula: CIA (/50) + Lab Exam (/100→50) = Total /100  [Internal Exam for reference only]`
          }
        </span>
      </div>
    </div>
  );
}
