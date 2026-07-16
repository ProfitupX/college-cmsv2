import { INTERNAL_ASSESSMENT_MAX } from '../../data/assessmentTypes';
import MarksRow from './MarksRow';
import styles from './MarksTable.module.css';

export default function MarksTable({ students, components, marksData, onMarkChange }) {
  const totalMax = components.reduce((s, c) => s + (parseFloat(c.max) || 0), 0);

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {/* Sticky Student Column */}
              <th className={`${styles.th} ${styles.studentTh}`}>Student</th>

              {/* Dynamic Assessment Columns */}
              {components.map((comp) => (
                <th key={comp.uid} className={styles.th}>
                  <div className={styles.thContent}>
                    <span className={styles.thIcon}>{comp.icon}</span>
                    <span className={styles.thLabel}>{comp.label}</span>
                    <span className={styles.thMax}>Max: {comp.max}</span>
                  </div>
                </th>
              ))}

              {/* Computed columns */}
              <th className={`${styles.th} ${styles.computedTh}`}>
                Raw Total
                <div className={styles.thSub}>/ {totalMax}</div>
              </th>

              {/* ★ Normalized-to-40 column */}
              <th className={`${styles.th} ${styles.normalizedTh}`}>
                <div className={styles.normalizedHeader}>
                  <span>Marks</span>
                  <span className={styles.normalizedOf}>/ {INTERNAL_ASSESSMENT_MAX}</span>
                </div>
                <div className={styles.thSub}>Internal Assessment</div>
              </th>

              <th className={`${styles.th} ${styles.computedTh}`}>Percentage</th>
              <th className={`${styles.th} ${styles.computedTh}`}>Grade</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, i) => (
              <MarksRow
                key={student.id}
                student={student}
                components={components}
                marks={marksData[student.id] || {}}
                onMarkChange={onMarkChange}
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
          Total max: {totalMax} marks
        </span>
        <span className={styles.footerFormula}>
          Formula: (Raw Total ÷ {totalMax}) × {INTERNAL_ASSESSMENT_MAX} = Marks out of {INTERNAL_ASSESSMENT_MAX}
        </span>
      </div>
    </div>
  );
}
