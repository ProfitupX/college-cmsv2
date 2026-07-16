import { CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './RecentEntries.module.css';

function StatusBadge({ status }) {
  const isSubmitted = status === 'submitted';
  return (
    <span className={`${styles.badge} ${isSubmitted ? styles.submitted : styles.draft}`}>
      {isSubmitted ? <CheckCircle2 size={11} /> : <Clock size={11} />}
      {isSubmitted ? 'Submitted' : 'Draft'}
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

export default function RecentEntries({ entries }) {
  const navigate = useNavigate();
  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Recent Submissions</h3>
          <p className={styles.sub}>Latest marks entries by you</p>
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
        </div>

        {/* Rows */}
        {entries.map((e, i) => (
          <div
            key={e.id}
            className={styles.row}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className={styles.subject}>{e.subject}</span>
            <span className={styles.class}>{e.class}</span>
            <span className={styles.date}>{formatDate(e.submittedAt)}</span>
            <span className={styles.count}>{e.count}</span>
            <ScorePill avg={e.avgScore} />
            <StatusBadge status={e.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
