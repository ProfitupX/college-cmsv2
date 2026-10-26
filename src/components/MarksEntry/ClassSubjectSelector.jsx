import { ChevronDown } from 'lucide-react';
import styles from './ClassSubjectSelector.module.css';

export default function ClassSubjectSelector({
  classes = [],
  subjects = [],
  selectedClass,
  selectedSubject,
  onClassChange,
  onSubjectChange,
}) {
  const sortedClasses = [...(classes || [])]
    .filter(Boolean)
    .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));

  const sortedSubjects = [...(subjects || [])]
    .filter(Boolean)
    .sort((a, b) => (a?.code || '').localeCompare(b?.code || ''));

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
              value={selectedClass || ''}
              onChange={(e) => onClassChange(e.target.value)}
            >
              <option value="">— Choose a Class —</option>
              {sortedClasses.map((c) => (
                <option key={c?.id} value={c?.id}>
                  {c?.name}
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
              value={selectedSubject || ''}
              onChange={(e) => onSubjectChange(e.target.value)}
              disabled={!selectedClass || sortedSubjects.length === 0}
            >
              <option value="">
                {!selectedClass
                  ? '— Select a class first —'
                  : sortedSubjects.length === 0
                  ? '— No subjects available —'
                  : '— Choose a Subject —'}
              </option>
              {sortedSubjects.map((s) => (
                <option key={s?.id} value={s?.id}>
                  {s?.code} — {s?.name}{s?.faculty_name ? ` • [Staff: ${s.faculty_name}]` : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className={styles.chevron} />
          </div>
        </div>
      </div>

      {/* Info Strip */}
      {selectedClass && selectedSubject && (() => {
        const activeSub = (subjects || []).find(s => s && String(s.id) === String(selectedSubject));
        if (!activeSub) return null;
        return (
          <div className={styles.infoStrip}>
            <span className={styles.infoBadge}>
              Subject: <strong>{activeSub.code} — {activeSub.name}</strong>
              {activeSub.faculty_name && (
                <span> • Staff In-Charge: <strong style={{ color: '#f59e0b' }}>{activeSub.faculty_name}</strong></span>
              )}
            </span>
          </div>
        );
      })()}
    </div>
  );
}
