import { ChevronDown } from 'lucide-react';
import styles from './ClassSubjectSelector.module.css';

export default function ClassSubjectSelector({
  classes,
  subjects,
  selectedClass,
  selectedSubject,
  onClassChange,
  onSubjectChange,
}) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.selectorGroup}>
        {/* Class Selector */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="class-select">
            Select Class
          </label>
          <div className={styles.selectWrap}>
            <select
              id="class-select"
              className={styles.select}
              value={selectedClass}
              onChange={(e) => onClassChange(e.target.value)}
            >
              <option value="">— Choose a Class —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className={styles.chevron} />
          </div>
        </div>

        {/* Subject Selector */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="subject-select">
            Select Subject
          </label>
          <div className={styles.selectWrap}>
            <select
              id="subject-select"
              className={styles.select}
              value={selectedSubject}
              onChange={(e) => onSubjectChange(e.target.value)}
              disabled={!selectedClass || subjects.length === 0}
            >
              <option value="">
                {!selectedClass
                  ? '— Select a class first —'
                  : subjects.length === 0
                  ? '— No subjects available —'
                  : '— Choose a Subject —'}
              </option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className={styles.chevron} />
          </div>
        </div>
      </div>

      {/* Info Strip */}
      {selectedClass && selectedSubject && (
        <div className={styles.infoStrip}>
          <span className={styles.infoBadge}>
            Marks entry is active — Fill in the assessment components below
          </span>
        </div>
      )}
    </div>
  );
}
