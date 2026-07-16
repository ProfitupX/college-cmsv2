import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { statsAPI, marksAPI } from '../services/api';
import styles from './ReportsPage.module.css';

const PIE_COLORS = ['#6C63FF', '#A78BFA', '#22D3EE', '#F472B6', '#FB923C'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className={styles.tooltip}>
        <p className={styles.ttLabel}>{label || payload[0]?.name}</p>
        {payload.map((p) => (
          <p key={p.dataKey || p.name} style={{ color: p.color || p.fill }} className={styles.ttVal}>
            {p.name}: <strong>{p.value}{p.dataKey === 'avgScore' ? '%' : ''}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ReportsPage() {
  const [stats,    setStats]    = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    Promise.all([statsAPI.get(), marksAPI.getSessions()])
      .then(([s, sess]) => { setStats(s); setSessions(sess); })
      .catch(() => setError('Failed to load reports. Is the server running?'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Loader size={28} />
        <p>Loading reports from database…</p>
      </div>
    );
  }

  if (error) {
    return <div className={styles.errorState}>{error}</div>;
  }

  const summaryCards = [
    { label: 'Total Submissions', value: stats?.totalSessions ?? 0,         color: '#6C63FF' },
    { label: 'This Month',        value: stats?.submittedThisMonth ?? 0,     color: '#10B981' },
    { label: 'Avg Score /40',     value: `${stats?.averageScore ?? 0}`,      color: '#F59E0B' },
    { label: 'Pending Drafts',    value: stats?.pendingSubmissions ?? 0,     color: '#EF4444' },
  ];

  const performanceData   = stats?.performanceData    || [];
  const subjectDist       = stats?.subjectDistribution || [];

  return (
    <div>
      {/* Summary Row */}
      <div className={styles.summaryRow}>
        {summaryCards.map((s) => (
          <div key={s.label} className={styles.summaryCard} style={{ '--c': s.color }}>
            <div className={styles.summaryVal} style={{ color: s.color }}>{s.value}</div>
            <div className={styles.summaryLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Monthly Submissions</h3>
          <p className={styles.chartSub}>Marks entries submitted per month</p>
          {performanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(108,99,255,0.08)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="submissions" name="Submissions" fill="#6C63FF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className={styles.noData}>No submission data yet. Submit marks to see charts.</p>}
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Subject Score Distribution</h3>
          <p className={styles.chartSub}>Average marks per subject</p>
          {subjectDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={subjectDist} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                     paddingAngle={4} dataKey="value">
                  {subjectDist.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => [`${val}`, 'Avg /40']} />
                <Legend iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className={styles.noData}>No subject data yet.</p>}
        </div>
      </div>

      {/* Submission History from DB */}
      <div className={styles.historyCard}>
        <h3 className={styles.chartTitle}>Submission History</h3>
        <p className={styles.chartSub}>All marks sessions stored in MySQL</p>
        {sessions.length === 0 ? (
          <p className={styles.noData} style={{ padding: '40px', textAlign: 'center' }}>
            No marks submitted yet. Go to Marks Entry to submit.
          </p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Code</th>
                <th>Class</th>
                <th>Staff</th>
                <th>Date</th>
                <th>Students</th>
                <th>Avg /40</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((e) => (
                <tr key={e.id}>
                  <td className={styles.tdBold}>{e.subject}</td>
                  <td><code style={{ fontSize:'0.75rem', color:'var(--primary)' }}>{e.subject_code}</code></td>
                  <td>{e.class_name}</td>
                  <td>{e.staff_name}</td>
                  <td>{new Date(e.created_at).toLocaleDateString('en-IN',
                    { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td>{e.student_count}</td>
                  <td>
                    <span className={styles.score} style={{
                      color:      e.avg_score >= 30 ? 'var(--success)' : e.avg_score >= 20 ? 'var(--warning)' : 'var(--danger)',
                      background: e.avg_score >= 30 ? 'var(--success-bg)' : e.avg_score >= 20 ? 'var(--warning-bg)' : 'var(--danger-bg)',
                    }}>{e.avg_score}</span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${e.status === 'submitted' ? styles.submitted : styles.draft}`}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
