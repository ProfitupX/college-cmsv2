import { CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMarks } from '../../context/MarksContext';
import styles from './RecentEntries.module.css';

function StatusBadge({ status }) {
  const isFrozen = status === 'locked' || status === 'unlock_requested' || status === 'submitted';
  return (
    <span className={`${styles.badge} ${isFrozen ? styles.submitted : styles.draft}`}>
      {isFrozen ? <CheckCircle2 size={11} /> : <Clock size={11} />}
      {isFrozen ? 'Frozen' : 'Draft'}
    </span>
  );
}

function ScorePill({ avg }) {
  const color =
    avg >= 80 ? 'var(--success)' :
    avg >= 60 ? 'var(--warning)' :
    'var(--danger)';
  return (
    <span className={styles.score} style={{ color, background: `${color}18` }}>
      {avg.toFixed(1)}%
    </span>
  );
}

export default function RecentEntries({ entries, classes = [] }) {
  const navigate = useNavigate();
  const { setRegulation, setClassAndSubject, setSelectionWithRegulation } = useMarks();
  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleRowClick = (e) => {
    // 1. Resolve class from props or matching class name
    const matchedClass = (classes || []).find((c) =>
      (e.classId && String(c.id) === String(e.classId)) ||
      (c.name && e.class && c.name.trim().toLowerCase() === e.class.trim().toLowerCase())
    );

    const targetClassId = (e.classId && e.classId !== 'undefined' && e.classId !== 'null')
      ? String(e.classId)
      : (matchedClass?.id ? String(matchedClass.id) : '');

    const targetSubjectId = (e.subjectId && e.subjectId !== 'undefined' && e.subjectId !== 'null')
      ? String(e.subjectId)
      : '';

    // 2. Robust 2021 Regulation Detection
    const yr = String(e.yearLabel || matchedClass?.year_label || '').toUpperCase();
    const sem = parseInt(e.semester || matchedClass?.semester, 10);
    const clsName = String(e.class || matchedClass?.name || '').toUpperCase();
    const is2021 = yr === 'III' || yr === 'IV' || yr === '3' || yr === '4' ||
                   (!isNaN(sem) && sem >= 5) ||
                   clsName.includes('III YEAR') || clsName.includes('IV YEAR') ||
                   clsName.includes('3RD YEAR') || clsName.includes('4TH YEAR') ||
                   clsName.includes('V SEM') || clsName.includes('VI SEM') ||
                   clsName.includes('VII SEM') || clsName.includes('VIII SEM') ||
                   clsName.includes('SEM 5') || clsName.includes('SEM 6') ||
                   clsName.includes('SEM 7') || clsName.includes('SEM 8');

    const reg = is2021 ? '2021' : '2025';
    const route = is2021 ? '/marks-entry-2021' : '/marks-entry';
    const sessionLabel = e.sessionLabel || 'internal1';

    // 3. Atomically update MarksContext
    if (setSelectionWithRegulation) {
      setSelectionWithRegulation({
        regulation: reg,
        classId: targetClassId,
        subjectId: targetSubjectId
      });
    } else {
      if (setRegulation) setRegulation(reg);
      if (setClassAndSubject && targetClassId && targetSubjectId) {
        setClassAndSubject(targetClassId, targetSubjectId);
      }
    }

    // 4. Navigate directly to the destination Marks Entry route with explicit params
    const queryParams = new URLSearchParams({
      classId: targetClassId,
      subjectId: targetSubjectId,
      sessionLabel,
      ...(e.id ? { sessionId: String(e.id) } : {})
    }).toString();

    navigate(`${route}?${queryParams}`, { 
      state: { 
        loadSessionId: e.id, 
        classId: targetClassId, 
        subjectId: targetSubjectId,
        sessionLabel,
        staffName: e.staffName,
        staffDesignation: e.staffDesignation
      } 
    });
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Recent Submissions</h3>
          <p className={styles.sub}>Latest marks entries — click any row to open marks sheet</p>
        </div>
        <button className={styles.viewAll} onClick={() => navigate('/reports')}>
          View All <ChevronRight size={14} />
        </button>
      </div>

      <div className={styles.table}>
        {/* Head */}
        <div className={`${styles.row} ${styles.head}`}>
          <span>Subject</span>
          <span>Class</span>
          <span>Date</span>
          <span>Students</span>
          <span>Avg Score</span>
          <span>Status</span>
          <span style={{ textAlign: 'right' }}>Action</span>
        </div>

        {/* Rows */}
        {entries.map((e, i) => (
          <div
            key={e.id}
            className={styles.row}
            style={{ animationDelay: `${i * 60}ms`, cursor: 'pointer' }}
            onClick={() => handleRowClick(e)}
            title={`Click to open marks entry for ${e.subject} (${e.class})`}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className={styles.subject} style={{ color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {e.subject}
              </span>
              {e.staffName && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                  👤 {e.staffName}
                </span>
              )}
            </div>
            <span className={styles.class}>{e.class}</span>
            <span className={styles.date}>{formatDate(e.submittedAt)}</span>
            <span className={styles.count}>{e.count}</span>
            <ScorePill avg={e.avgScore} />
            <StatusBadge status={e.status} />
            <div style={{ textAlign: 'right' }}>
              <span className={styles.enterLink}>
                Edit Sheet <ChevronRight size={13} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
