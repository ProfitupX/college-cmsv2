import { computeGrade, INTERNAL_ASSESSMENT_MAX } from '../../data/assessmentTypes';
import styles from './MarksRow.module.css';

export default function MarksRow({ student, components, marks = {}, onMarkChange, index }) {
  // Total max from all components (staff-defined)
  const totalMax = components.reduce((s, c) => s + (parseFloat(c.max) || 0), 0);

  // Raw total entered marks
  const rawTotal = components.reduce((sum, c) => {
    const val = parseFloat(marks[c.uid]) || 0;
    return sum + Math.min(val, c.max);
  }, 0);

  // Normalize to INTERNAL_ASSESSMENT_MAX (e.g. 40)
  const normalizedMarks =
    totalMax > 0 ? (rawTotal / totalMax) * INTERNAL_ASSESSMENT_MAX : 0;

  // Percentage for grade
  const percentage = totalMax > 0 ? (rawTotal / totalMax) * 100 : 0;
  const gradeInfo = computeGrade(percentage);

  const initials = student.name.split(' ').map((n) => n[0]).join('').slice(0, 2);

  return (
    <tr className={styles.row} style={{ animationDelay: `${index * 40}ms` }}>
      {/* Student Info */}
      <td className={styles.studentCell}>
        <div className={styles.studentInfo}>
          <span className={styles.sNo}>{student.sNo}</span>
          <div className={styles.avatar} style={{ '--idx': index }}>
            {initials}
          </div>
          <div>
            <p className={styles.name}>{student.name}</p>
            <p className={styles.roll}>{student.rollNo}</p>
          </div>
        </div>
      </td>

      {/* Dynamic Component Inputs */}
      {components.map((comp) => {
        const val = marks[comp.uid] !== undefined ? marks[comp.uid] : '';
        const numVal = parseFloat(val);
        const isOver = !isNaN(numVal) && numVal > comp.max;
        return (
          <td key={comp.uid} className={styles.inputCell}>
            <div className={styles.inputWrap}>
              <input
                id={`marks-${student.id}-${comp.uid}`}
                type="number"
                min="0"
                max={comp.max}
                step="0.5"
                className={`${styles.input} ${isOver ? styles.inputError : ''}`}
                value={val}
                onChange={(e) => onMarkChange(student.id, comp.uid, e.target.value)}
                placeholder="—"
              />
              <span className={styles.inputMax}>/{comp.max}</span>
              {isOver && (
                <span className={styles.errorTip}>Max: {comp.max}</span>
              )}
            </div>
          </td>
        );
      })}

      {/* Raw Total */}
      <td className={styles.totalCell}>
        <span className={styles.total}>{rawTotal.toFixed(1)}</span>
        <span className={styles.maxLabel}>/ {totalMax}</span>
      </td>

      {/* Normalized to 40 — KEY COLUMN */}
      <td className={styles.normalizedCell}>
        <div
          className={styles.normalizedBadge}
          style={{
            background: `${gradeInfo.color}15`,
            borderColor: `${gradeInfo.color}35`,
            color: gradeInfo.color,
          }}
        >
          <span className={styles.normalizedVal}>{normalizedMarks.toFixed(2)}</span>
          <span className={styles.normalizedOf}>/ {INTERNAL_ASSESSMENT_MAX}</span>
        </div>
      </td>

      {/* Percentage bar */}
      <td className={styles.percentCell}>
        <div className={styles.percentBar}>
          <div
            className={styles.percentFill}
            style={{
              width: `${Math.min(percentage, 100)}%`,
              background: gradeInfo.color,
            }}
          />
        </div>
        <span className={styles.percentText}>{percentage.toFixed(1)}%</span>
      </td>

      {/* Grade */}
      <td className={styles.gradeCell}>
        <span
          className={styles.gradeBadge}
          style={{ color: gradeInfo.color, background: `${gradeInfo.color}18` }}
          title={gradeInfo.label}
        >
          {gradeInfo.grade}
        </span>
      </td>
    </tr>
  );
}
