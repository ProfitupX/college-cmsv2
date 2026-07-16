import { useState, useEffect } from 'react';
import {
  Users, BookOpen, ClipboardCheck, TrendingUp,
  AlertCircle, Calendar, CheckCircle2, Loader,
} from 'lucide-react';
import StatsGrid from '../components/Dashboard/StatsGrid';
import PerformanceChart from '../components/Dashboard/PerformanceChart';
import SubjectBreakdown from '../components/Dashboard/SubjectBreakdown';
import RecentEntries from '../components/Dashboard/RecentEntries';
import { statsAPI, marksAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data,     setData]     = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    Promise.all([statsAPI.get('CL001'), marksAPI.getSessions({ classId: 'CL001' })])
      .then(([stats, sess]) => { setData(stats); setSessions(sess.slice(0, 5)); })
      .catch(() => setError('Could not load dashboard data. Is the API server running?'))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Good morning' :
    now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Loader size={32} className={styles.spinner} />
        <p>Loading dashboard data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <AlertCircle size={32} color="var(--danger)" />
        <p>{error}</p>
        <small>Make sure the Express server is running: <code>npm run server</code></small>
      </div>
    );
  }

  const stats = [
    {
      icon: Users, label: 'Total Students',
      value: data?.totalStudents ?? 0,
      sub: 'IT II Year III Sem', color: '#6C63FF',
    },
    {
      icon: BookOpen, label: 'Subjects Assigned',
      value: data?.totalSubjects ?? 0,
      sub: 'This semester (III Sem)', color: '#22D3EE',
    },
    {
      icon: AlertCircle, label: 'Pending Drafts',
      value: data?.pendingSubmissions ?? 0,
      sub: 'Awaiting submission', color: '#F59E0B',
    },
    {
      icon: TrendingUp, label: 'Average Score /40',
      value: `${data?.averageScore ?? 0}`,
      sub: 'Across all sessions', trend: 'up', trendVal: '+2.1', color: '#10B981',
    },
  ];

  // Shape sessions into the format RecentEntries expects
  const entries = sessions.map((s) => ({
    id:          s.id,
    subject:     s.subject,
    class:       s.class_name,
    submittedAt: s.created_at,
    status:      s.status,
    count:       s.student_count,
    avgScore:    s.avg_score,
  }));

  return (
    <div>
      {/* Welcome Banner */}
      <div className={styles.banner}>
        <div className={styles.bannerLeft}>
          <h2 className={styles.bannerTitle}>
            {greeting}, {user?.name?.split(' ').slice(0, 2).join(' ') || 'Faculty'}! 🎓
          </h2>
          <p className={styles.bannerSub}>
            {data?.pendingSubmissions > 0
              ? <>You have <strong>{data.pendingSubmissions} pending draft{data.pendingSubmissions > 1 ? 's' : ''}</strong> and {data.submittedThisMonth} entries this month.</>
              : <>All submissions up to date. {data?.submittedThisMonth ?? 0} entries this month.</>
            }
          </p>
        </div>
        <div className={styles.bannerRight}>
          <div className={styles.bannerStat}>
            <CheckCircle2 size={18} color="#10B981" />
            <span>{data?.totalSessions ?? 0} Total Submissions</span>
          </div>
          <div className={styles.bannerStat}>
            <Calendar size={18} color="#6C63FF" />
            <span>{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
        </div>
      </div>

      <StatsGrid stats={stats} />

      <div className={styles.chartsRow}>
        <div className={styles.chartMain}>
          <PerformanceChart data={data?.performanceData || []} />
        </div>
        <div className={styles.chartSide}>
          <SubjectBreakdown data={data?.subjectDistribution || []} />
        </div>
      </div>

      <RecentEntries entries={entries} />
    </div>
  );
}
