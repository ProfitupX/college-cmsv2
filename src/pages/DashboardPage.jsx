import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, BookOpen, ClipboardCheck, TrendingUp,
  AlertCircle, Calendar, CheckCircle2, Loader, Key, Check, X, ShieldAlert, FileText, Download,
  ExternalLink, Sparkles, BookMarked, Award, Clock
} from 'lucide-react';
import StatsGrid from '../components/Dashboard/StatsGrid';
import PerformanceChart from '../components/Dashboard/PerformanceChart';
import SubjectBreakdown from '../components/Dashboard/SubjectBreakdown';
import RecentEntries from '../components/Dashboard/RecentEntries';
import PrincipalDashboard from '../components/Dashboard/PrincipalDashboard';
import { statsAPI, marksAPI, settingsAPI, subjectsAPI, studentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { generateClassAnalysisPDF, generateConsolidatedMarksPDF, generateSubjectAnalysisPDF } from '../services/pdfReportGenerator';
import DeclarationModal from '../components/Reports/DeclarationModal';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data,     setData]     = useState(null);
  const [sessions, setSessions] = useState([]);
  const [unlockRequests, setUnlockRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [deadline, setDeadline] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [inchargeSession, setInchargeSession] = useState('internal1');
  const [genLoading, setGenLoading] = useState(false);
  const [declarationModalOpen, setDeclarationModalOpen] = useState(false);
  const [pdfPayload, setPdfPayload] = useState(null);

  const loadData = () => {
    setLoading(true);
    const promises = [
      user?.role === 'admin' 
        ? statsAPI.getCollegeStats()
        : statsAPI.get('', user?.id, user?.role, user?.department),
      marksAPI.getSessions({ 
        department: (user?.role === 'hod' || user?.role === 'faculty') ? user?.department : undefined
      }),
      settingsAPI.getDeadline()
    ];

    if (user?.role === 'hod') {
      promises.push(marksAPI.getUnlockRequests(user.department).catch(() => []));
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

  const handleDownloadClassPDF = async (type, targetClassId, period = inchargeSession) => {
    const classId = targetClassId || user?.coordinatedClassId || user?.coordinatedClasses?.[0]?.id || user?.teachingClasses?.[0]?.id || 'CL001';
    setGenLoading(true);
    try {
      const summary = await marksAPI.getClassSummary(classId, period);
      if (type === 'class_analysis') {
        await generateClassAnalysisPDF({
          classObj: summary.classObj,
          sessionLabel: period,
          subjects: summary.subjects,
          students: summary.students,
          allSessions: summary.sessions,
          allAttendance: summary.allAttendance
        });
      } else {
        await generateConsolidatedMarksPDF({
          classObj: summary.classObj,
          sessionLabel: period,
          subjects: summary.subjects,
          students: summary.students,
          allSessions: summary.sessions,
          allAttendance: summary.allAttendance,
          allMarks: summary.allMarks,
          allComponents: summary.allComponents
        });
      }
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setGenLoading(false);
    }
  };

  const handleDownloadSubjectPDF = async (subject, period = 'internal1') => {
    setGenLoading(true);
    try {
      const students = await studentsAPI.getByClass(subject.class_id);
      const sessDetail = await marksAPI.getSessions({ classId: subject.class_id, subjectId: subject.id, sessionLabel: period });
      let detail = null;
      if (sessDetail.length > 0) {
        detail = await marksAPI.getSessionDetail(sessDetail[0].id);
      }

      setPdfPayload({
        subject: { code: subject.code, name: subject.name, department: subject.class_department || user?.department },
        classObj: { id: subject.class_id, name: subject.class_name || 'Class', department: subject.class_department || user?.department, semester: subject.semester, year_label: subject.year_label },
        staff: user,
        session: detail?.session,
        students,
        allMarks: detail?.marks || [],
        components: detail?.components || [],
        attendanceData: detail?.attendance || {},
        internalExamData: detail?.internalExam || {},
        labData: detail?.labData || {},
        assessmentMode: period
      });
      setDeclarationModalOpen(true);
    } catch (err) {
      alert('Failed to fetch data for PDF: ' + err.message);
    } finally {
      setGenLoading(false);
    }
  };

  const handleGenerateSubjectPDF = async (declarationData) => {
    setDeclarationModalOpen(false);
    setGenLoading(true);
    try {
      await generateSubjectAnalysisPDF({
        ...pdfPayload,
        declarationData
      });
    } catch (err) {
      alert('Failed to generate Subject Analysis PDF: ' + err.message);
    } finally {
      setGenLoading(false);
      setPdfPayload(null);
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
    ? `Class In-charge (${user?.coordinatedClasses?.[0]?.name || user?.department})`
    : 'Faculty Staff Panel';

  const isHodOrAdmin = user?.role === 'hod' || user?.role === 'admin';
  const assignedClassList = data?.assignedClasses || (user?.teachingClasses || []).map(c => c.name);
  
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
    : ((user?.assignedSubjects?.length) || (data?.totalSubjects ?? 0));

  const subjectSubtext = isHodOrAdmin
    ? (data?.myTeachingSubjects > 0 
        ? `${data.myTeachingSubjects} subject(s) taught by HOD (${data?.totalSubjects ?? 0} total in dept)` 
        : `Across all ${user?.department || 'IT'} classes`)
    : (assignedClassList.length > 0 ? `${assignedClassList.length} Class(es) Teaching` : 'This semester');

  let stats = [];

  if (user?.role === 'admin') {
    stats = [
      {
        icon: Users, label: 'Total Students',
        value: data?.overview?.totalStudents ?? (data?.totalStudents ?? 0),
        sub: 'Enrolled across college', color: '#6C63FF',
      },
      {
        icon: BookOpen, label: 'Total Departments',
        value: data?.overview?.totalDepartments ?? 0,
        sub: 'Active departments', color: '#22D3EE',
      },
      {
        icon: Users, label: 'Total Faculty',
        value: data?.overview?.totalFaculty ?? 0,
        sub: 'Registered staff', color: '#F59E0B',
      },
      {
        icon: TrendingUp, label: 'College Avg Score',
        value: `${data?.overview?.collegeAvg ?? (data?.averageScore ?? 0)}`,
        sub: 'Across all sessions', color: '#10B981',
      },
    ];
  } else {
    stats = [
      {
        icon: Users, label: isHodOrAdmin ? 'Department Total Students' : (user?.isClassCoordinator ? 'Total Students' : 'Assigned Students'),
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
  }

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

  let sideChartData = [];
  let sideChartTitle = 'Subject Scores';
  let sideChartSub = 'Average % per subject';

  const colors = ['#6C63FF', '#10B981', '#F59E0B', '#22D3EE', '#EF4444', '#EC4899', '#8B5CF6'];

  if (user?.role === 'admin') {
    sideChartTitle = 'Department Scores';
    sideChartSub = 'Average % per department';
    if (data?.departmentStats) {
      sideChartData = data.departmentStats.map((d, idx) => ({
        name: d.department,
        value: parseFloat(d.avgScore) || 0,
        fill: colors[idx % colors.length]
      }));
    }
  } else {
    if (data?.subjectDistribution) {
      sideChartData = data.subjectDistribution.map((d, idx) => ({
        ...d,
        value: parseFloat(d.value) || 0,
        fill: colors[idx % colors.length]
      }));
    }
  }

  let perfData = (user?.role === 'admin' ? data?.performanceTrend : data?.performanceData) || [];
  if (perfData.length === 1) {
    perfData = [
      { month: 'Prev', avgScore: 0, submissions: 0 },
      ...perfData
    ];
  }

  const assignedSubjects = user?.assignedSubjects || [];
  const teachingClasses = user?.teachingClasses || [];
  const coordinatedClass = user?.coordinatedClasses?.[0] || null;

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

      {/* Class In-charge Dedicated Command Center */}
      {user?.isClassCoordinator && coordinatedClass && (
        <div className={styles.inchargeCard}>
          <div className={styles.inchargeHeader}>
            <div>
              <div className={styles.inchargeTitle}>
                <Sparkles size={20} color="#059669" />
                <span>Class In-charge Executive Portal: {coordinatedClass.name}</span>
              </div>
              <div className={styles.inchargeSub}>
                Official Continuous Assessment Reports &amp; Consolidated Statements for your in-charge class.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select 
                value={inchargeSession}
                onChange={e => setInchargeSession(e.target.value)}
                style={{
                  padding: '6px 12px', borderRadius: '6px', border: '1px solid #10B981',
                  background: '#fff', fontSize: '0.82rem', fontWeight: '700', color: '#065F46'
                }}
              >
                <option value="internal1">Internal 1 (CA-1)</option>
                <option value="internal2">Internal 2 (CA-2)</option>
              </select>
            </div>
          </div>

          <div className={styles.inchargeButtons}>
            <button 
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff', border: 'none',
                padding: '9px 16px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
              onClick={() => handleDownloadClassPDF('class_analysis', coordinatedClass.id, inchargeSession)}
              disabled={genLoading}
            >
              <FileText size={16} /> Download Class Performance Report (NAC/TLP-20)
            </button>

            <button 
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', color: '#fff', border: 'none',
                padding: '9px 16px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
              onClick={() => handleDownloadClassPDF('consolidated_statement', coordinatedClass.id, inchargeSession)}
              disabled={genLoading}
            >
              <Download size={16} /> Download Consolidated Mark Statement (NAC/TLP-07a.20)
            </button>

            <button 
              style={{
                background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border-solid)',
                padding: '9px 16px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
              onClick={() => navigate('/reports')}
            >
              <ExternalLink size={15} /> Open Full Reports Portal
            </button>
          </div>
        </div>
      )}

      {/* Teaching Workload & Schedule Section */}
      {assignedSubjects.length > 0 && (
        <div className={styles.workloadCard}>
          <div className={styles.workloadHeader}>
            <div className={styles.workloadTitle}>
              <BookMarked size={20} color="var(--primary)" />
              <span>My Teaching Classes &amp; Assigned Subjects</span>
            </div>

            <div className={styles.workloadBadges}>
              <span className={styles.workloadPill}>
                📚 {teachingClasses.length} Active Class{teachingClasses.length !== 1 ? 'es' : ''}
              </span>
              <span className={styles.workloadPill}>
                📖 {assignedSubjects.length} Subject{assignedSubjects.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className={styles.subjectGrid}>
            {assignedSubjects.map((sub) => {
              const is2021 = sub.year_label === 'III' || sub.year_label === 'IV' || parseInt(sub.semester) >= 5;
              const targetRoute = is2021 ? '/marks-entry-2021' : '/marks-entry';

              return (
                <div key={sub.id} className={styles.subjectCard}>
                  <div>
                    <div className={styles.subjectTop}>
                      <span className={styles.subjectCode}>{sub.code}</span>
                      <span className={styles.subjectTypeBadge}>{sub.type || 'Theory'}</span>
                    </div>

                    <h4 className={styles.subjectName}>{sub.name}</h4>
                    <div className={styles.subjectClassMeta}>
                      🏛 <strong>{sub.class_name || 'Class'}</strong> · Sem {sub.semester || '-'} {sub.ltpc ? `· LTPC: ${sub.ltpc}` : ''}
                    </div>
                  </div>

                  <div className={styles.subjectActions}>
                    <button 
                      className={styles.enterMarksBtn}
                      onClick={() => navigate(targetRoute)}
                    >
                      <ClipboardCheck size={14} /> Enter Marks
                    </button>
                    <button 
                      className={styles.subReportBtn}
                      onClick={() => handleDownloadSubjectPDF(sub, 'internal1')}
                      title="Download Subject Analysis PDF"
                      disabled={genLoading}
                    >
                      <Download size={13} /> Report
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Performance Charts */}
      <div className={styles.chartsRow}>
        <div className={styles.chartMain}>
          <PerformanceChart data={perfData} />
        </div>
        <div className={styles.chartSide}>
          <SubjectBreakdown 
            data={sideChartData} 
            title={sideChartTitle} 
            sub={sideChartSub} 
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: (user?.role === 'hod' || user?.role === 'admin') ? '1fr 1fr' : '1fr', gap: '20px', marginBottom: '12px' }}>
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

        {/* Quick Report Portal Access */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border-solid)',
          borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} color="var(--primary)" /> Official Reports Portal
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Access all Anna University compliant PDF assessment reports, Consolidated Mark Statements, and Class Performance Sheets.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              style={{
                background: 'var(--primary)', color: '#fff', border: 'none',
                padding: '11px 20px', borderRadius: '8px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '700'
              }}
              onClick={() => navigate('/reports')}
            >
              <ExternalLink size={16} /> Open Reports Portal
            </button>
          </div>
        </div>
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
