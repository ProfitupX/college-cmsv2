import { useState, useEffect } from 'react';
import {
  Users, BookOpen, ClipboardCheck, TrendingUp,
  AlertCircle, Calendar, CheckCircle2, Loader, Key, Check, X, ShieldAlert, FileText, Download
} from 'lucide-react';
import StatsGrid from '../components/Dashboard/StatsGrid';
import PerformanceChart from '../components/Dashboard/PerformanceChart';
import SubjectBreakdown from '../components/Dashboard/SubjectBreakdown';
import RecentEntries from '../components/Dashboard/RecentEntries';
import PrincipalDashboard from '../components/Dashboard/PrincipalDashboard';
import { statsAPI, marksAPI, settingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { generateClassAnalysisPDF, generateConsolidatedMarksPDF } from '../services/pdfReportGenerator';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data,     setData]     = useState(null);
  const [sessions, setSessions] = useState([]);
  const [unlockRequests, setUnlockRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [deadline, setDeadline] = useState('');
  const [newDeadline, setNewDeadline] = useState('');

  const loadData = () => {
    setLoading(true);
    const promises = [
      statsAPI.get('', user?.id, user?.role, user?.department),
      marksAPI.getSessions({}),
      settingsAPI.getDeadline()
    ];

    if (user?.role === 'hod' || user?.role === 'admin') {
      promises.push(marksAPI.getUnlockRequests().catch(() => []));
    } else {
      promises.push(Promise.resolve([]));
    }

    Promise.all(promises)
      .then(([stats, sess, dl, requests]) => { 
        setData(stats); 
        setSessions(sess.slice(0, 5));
        if (dl && dl.value) {
          setDeadline(dl.value);
          setNewDeadline(dl.value);
        }
        setUnlockRequests(requests.filter(r => r.status === 'pending'));
      })
      .catch(() => setError('Could not load dashboard data. Is the API server running?'))
      .finally(() => setLoading(false));
  };

  const handleSetDeadline = async () => {
    if (!newDeadline) return alert('Please select a date');
    try {
      await settingsAPI.setDeadline(newDeadline);
      setDeadline(newDeadline);
      alert('Deadline updated successfully! Notifications sent to staff.');
    } catch (err) {
      alert('Failed to update deadline');
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleApproveUnlock = async (reqId, sessId, action) => {
    try {
      await marksAPI.approveUnlock({
        requestId: reqId,
        sessionId: sessId,
        hodId: user?.id || 'HOD',
        action
      });
      loadData();
    } catch (err) {
      alert('Failed to process unlock action: ' + err.message);
    }
  };

  const handleDownloadClassPDF = async (type) => {
    try {
      const summary = await marksAPI.getClassSummary('CL001', 'internal1');
      if (type === 'class_analysis') {
        await generateClassAnalysisPDF({
          classObj: summary.classObj,
          sessionLabel: 'internal1',
          subjects: summary.subjects,
          students: summary.students,
          allSessions: summary.sessions,
          allAttendance: summary.allAttendance
        });
      } else {
        await generateConsolidatedMarksPDF({
          classObj: summary.classObj,
          sessionLabel: 'internal1',
          subjects: summary.subjects,
          students: summary.students,
          allSessions: summary.sessions,
          allAttendance: summary.allAttendance
        });
      }
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    }
  };

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

  // Intercept Principal & Vice Principal Dashboard
  if (user?.role === 'principal' || user?.role === 'vice_principal') {
    return (
      <div className={styles.dashboardContainer}>
        <header className={styles.welcomeBanner}>
          <div>
            <h1 className={styles.greeting}>{greeting}, {user?.name || 'Principal'}!</h1>
            <p className={styles.subGreeting}>College Overview and Analytics Dashboard</p>
          </div>
        </header>
        <PrincipalDashboard />
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

  const roleTitle = user?.role === 'hod'
    ? 'HOD Panel (Department Overview)'
    : user?.isClassCoordinator
    ? 'Class In-charge Panel'
    : 'Faculty Staff Panel';

  const isHodOrAdmin = user?.role === 'hod' || user?.role === 'admin';
  const assignedClassList = data?.assignedClasses || [];
  
  let studentSubtext = `${user?.department || 'Information Technology'} Department (All Years)`;
  if (!isHodOrAdmin) {
    if (assignedClassList.length > 1) {
      studentSubtext = `Across ${assignedClassList.length} Classes (${assignedClassList.join(', ')})`;
    } else if (assignedClassList.length === 1) {
      studentSubtext = `Class: ${assignedClassList[0]}`;
    } else {
      studentSubtext = 'Assigned Classes';
    }
  }

  const subjectLabel = isHodOrAdmin 
    ? (data?.myTeachingSubjects > 0 ? 'My Teaching Subjects' : 'Total Department Subjects') 
    : 'My Assigned Subjects';

  const subjectValue = isHodOrAdmin
    ? (data?.myTeachingSubjects > 0 ? data.myTeachingSubjects : (data?.totalSubjects ?? 0))
    : (data?.totalSubjects ?? 0);

  const subjectSubtext = isHodOrAdmin
    ? (data?.myTeachingSubjects > 0 
        ? `${data.myTeachingSubjects} subject(s) taught by HOD (${data?.totalSubjects ?? 0} total in dept)` 
        : `Across all ${user?.department || 'IT'} classes`)
    : (assignedClassList.length > 0 ? `${assignedClassList.length} Class(es) Teaching` : 'This semester');

  const stats = [
    {
      icon: Users, label: isHodOrAdmin ? 'Department Total Students' : 'Total Students',
      value: data?.totalStudents ?? 0,
      sub: studentSubtext, color: '#6C63FF',
    },
    {
      icon: BookOpen, label: subjectLabel,
      value: subjectValue,
      sub: subjectSubtext, color: '#22D3EE',
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
            {greeting}, {user?.name || 'Faculty'}! 🎓
          </h2>
          <p className={styles.bannerSub}>
            <strong>Role:</strong> {roleTitle} — {user?.department || 'Information Technology'}
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '12px' }}>
        {/* HOD Deadline Engine */}
        {(user?.role === 'hod' || user?.role === 'admin') && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border-solid)',
            borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={22} color="var(--primary)" /> Set Marks Entry Deadline
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Set a global deadline for all staff to complete their internal marks entry.
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input 
                type="date" 
                value={newDeadline}
                onChange={e => setNewDeadline(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-solid)', fontSize: '1rem', outline: 'none', width: '100%' }}
              />
              <button 
                onClick={handleSetDeadline}
                style={{
                  background: 'var(--primary)', color: 'white', border: 'none',
                  padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >
                Update Deadline
              </button>
            </div>
            {deadline && (
              <div style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Current Deadline: <strong>{new Date(deadline).toLocaleDateString()}</strong>
              </div>
            )}
          </div>
        )}

        {/* Quick Official Report Downloads for Class Coordinator / HOD */}
        {(user?.isClassCoordinator || user?.role === 'hod' || user?.role === 'admin') && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border-solid)',
            borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={22} color="var(--primary)" /> Official Reports Download
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Generate and download class-wise performance analytics and consolidated mark statements.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                style={{
                  background: 'var(--bg)', border: '1px solid var(--border-solid)', color: 'var(--text-primary)',
                  padding: '12px 16px', borderRadius: '8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: '600'
                }}
                onClick={() => handleDownloadClassPDF('class_analysis')}
              >
                <FileText size={18} color="var(--primary)" /> Class Performance Report (NAC/TLP-20)
              </button>
              <button 
                style={{
                  background: 'var(--bg)', border: '1px solid var(--border-solid)', color: 'var(--text-primary)',
                  padding: '12px 16px', borderRadius: '8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: '600'
                }}
                onClick={() => handleDownloadClassPDF('consolidated_statement')}
              >
                <Download size={18} color="#10B981" /> Consolidated Mark Statement (NAC/TLP-07a.20)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* HOD Unlock Request Approval Center */}
      {(user?.role === 'hod' || user?.role === 'admin') && unlockRequests.length > 0 && (
        <div className={styles.requestsCard} style={{ marginBottom: '12px' }}>
          <div className={styles.requestsHeader}>
            <div className={styles.requestsTitle}>
              <Key size={20} color="#D97706" />
              <span>Pending Mark Edit Unlock Requests ({unlockRequests.length})</span>
            </div>
            <span className={styles.requestsBadge}>HOD Action Required</span>
          </div>

          <div className={styles.requestsGrid}>
            {unlockRequests.map((req) => (
              <div key={req.id} className={styles.requestItem}>
                <div className={styles.requestInfo}>
                  <strong>{req.staff_name}</strong> requested to unlock <strong>{req.subject_code || req.subject_name}</strong> ({req.class_name})
                </div>
                <div className={styles.requestReason}>
                  "{req.reason}"
                </div>
                <div className={styles.requestActions}>
                  <button 
                    className={styles.approveBtn} 
                    onClick={() => handleApproveUnlock(req.id, req.session_id, 'approve')}
                  >
                    <Check size={14} /> Approve Unlock
                  </button>
                  <button 
                    className={styles.rejectBtn} 
                    onClick={() => handleApproveUnlock(req.id, req.session_id, 'reject')}
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <RecentEntries entries={entries} />
    </div>
  );
}
