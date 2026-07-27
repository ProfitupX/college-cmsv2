import { useState, useEffect } from 'react';
import { Loader, Download, FileText, CheckCircle2, BookOpen, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { statsAPI, marksAPI, classesAPI, subjectsAPI, studentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  generateSubjectAnalysisPDF, 
  generateClassAnalysisPDF, 
  generateConsolidatedMarksPDF 
} from '../services/pdfReportGenerator';
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
  const { user } = useAuth();
  const [stats,    setStats]    = useState(null);
  const [sessions, setSessions] = useState([]);
  const [classes,  setClasses]  = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);

  const [selectedClassId, setSelectedClassId]     = useState('CL001');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [sessionLabel, setSessionLabel]           = useState('internal1');
  const [classRemarks, setClassRemarks]           = useState('');
  const [improvementPlan, setImprovementPlan]     = useState('');
  const [savingRemarks, setSavingRemarks]         = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [genLoading, setGenLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      statsAPI.get(),
      marksAPI.getSessions(),
      classesAPI.getAll(),
      subjectsAPI.getByClass('CL001'),
      studentsAPI.getByClass('CL001')
    ])
      .then(([s, sess, cls, subs, stds]) => { 
        setStats(s); 
        setSessions(sess); 
        setClasses(cls);
        setSubjects(subs);
        setStudents(stds);
        if (subs.length > 0) setSelectedSubjectId(subs[0].id);
      })
      .catch(() => setError('Failed to load reports. Is the server running?'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    import('../services/api').then(({ remarksAPI }) => {
      remarksAPI.get(selectedClassId, sessionLabel).then(data => {
        setClassRemarks(data.remarks || '');
        setImprovementPlan(data.improvement_plan || '');
      }).catch(err => console.error(err));
    });
  }, [selectedClassId, sessionLabel]);

  const handleSaveRemarks = async () => {
    setSavingRemarks(true);
    try {
      const { remarksAPI } = await import('../services/api');
      await remarksAPI.save(selectedClassId, sessionLabel, { remarks: classRemarks, improvement_plan: improvementPlan });
      alert('Remarks saved successfully!');
    } catch (err) {
      alert('Failed to save remarks.');
    } finally {
      setSavingRemarks(false);
    }
  };

  const handleDownloadSubjectPDF = async () => {
    const sub = subjects.find(s => s.id === selectedSubjectId);
    const cls = classes.find(c => c.id === selectedClassId) || { id: 'CL001', name: 'IT - II Year - III Sem', department: 'Information Technology', semester: 4, year_label: 'II', academic_year: '2025-26' };
    
    setGenLoading(true);
    try {
      const sessDetail = await marksAPI.getSessions({ classId: selectedClassId, subjectId: selectedSubjectId, sessionLabel });
      let detail = null;
      if (sessDetail.length > 0) {
        detail = await marksAPI.getSessionDetail(sessDetail[0].id);
      }

      await generateSubjectAnalysisPDF({
        subject: sub || { code: 'GE3451', name: 'Environmental Sciences and Sustainability', department: 'IT' },
        classObj: cls,
        staff: user,
        session: detail?.session,
        students,
        marksData: {},
        attendanceData: detail?.attendance || {},
        internalExamData: detail?.internalExam || {},
        labData: detail?.labData || {},
        assessmentMode: sessionLabel
      });
    } catch (err) {
      alert('Failed to generate Subject Analysis PDF: ' + err.message);
    } finally {
      setGenLoading(false);
    }
  };

  const handleDownloadClassPDF = async (pdfType) => {
    const cls = classes.find(c => c.id === selectedClassId) || { id: 'CL001', name: 'IT - II Year - III Sem', department: 'Information Technology', semester: 4, year_label: 'II', academic_year: '2025-26' };

    setGenLoading(true);
    try {
      const summary = await marksAPI.getClassSummary(selectedClassId, sessionLabel);

      if (pdfType === 'class_analysis') {
        await generateClassAnalysisPDF({
          classObj: summary.classObj || cls,
          sessionLabel,
          subjects: summary.subjects || subjects,
          students: summary.students || students,
          allSessions: summary.sessions || [],
          allAttendance: summary.allAttendance || [],
          remarks: classRemarks,
          remedialAction: improvementPlan
        });
      } else {
        await generateConsolidatedMarksPDF({
          classObj: summary.classObj || cls,
          sessionLabel,
          subjects: summary.subjects || subjects,
          students: summary.students || students,
          allSessions: summary.sessions || [],
          allAttendance: summary.allAttendance || []
        });
      }
    } catch (err) {
      alert('Failed to generate Class PDF: ' + err.message);
    } finally {
      setGenLoading(false);
    }
  };

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
      {/* Official PDF Statement Generator Portal Box */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border-solid)',
        borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)'
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={22} color="#6C63FF" /> Official College PDF Statement Generation Portal
        </h3>
        <p style={{ margin: '0 0 18px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Nadar Saraswathi College of Engineering & Technology — Generate official Format NAC/TLP statements for HOD, Class In-charge, and Staff.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Target Class:</label>
            <select 
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-solid)', fontSize: '0.85rem', fontWeight: 600 }}
              value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}
            >
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Assessment Period:</label>
            <select 
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-solid)', fontSize: '0.85rem', fontWeight: 600 }}
              value={sessionLabel} onChange={(e) => setSessionLabel(e.target.value)}
            >
              <option value="internal1">Internal Test 1 with Assignment</option>
              <option value="internal2">Internal Test 2 with Assignment</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Subject (For Subject Report):</label>
            <select 
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-solid)', fontSize: '0.85rem', fontWeight: 600 }}
              value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Raw Marks Reports */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 12px', color: 'var(--text-secondary)' }}>1. Raw Mark Statements</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <button 
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', color: '#fff', border: 'none',
                padding: '10px 18px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
              onClick={() => handleDownloadClassPDF('consolidated_statement')}
              disabled={genLoading}
            >
              <Download size={15} /> Consolidated Mark Statement (NAC/TLP-07a.20)
            </button>
          </div>
        </div>

        {/* Full Analysis Reports */}
        <div>
          <h4 style={{ margin: '0 0 12px', color: 'var(--text-secondary)' }}>2. Full Performance Analysis Reports</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <button 
              style={{
                background: 'linear-gradient(135deg, #6C63FF 0%, #4F46E5 100%)', color: '#fff', border: 'none',
                padding: '10px 18px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
              onClick={handleDownloadSubjectPDF}
              disabled={genLoading}
            >
              <Download size={15} /> Subject Test Analysis Report (NAC/TLP-07a.21)
            </button>

            <button 
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff', border: 'none',
                padding: '10px 18px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
              onClick={() => handleDownloadClassPDF('class_analysis')}
              disabled={genLoading}
            >
              <Download size={15} /> Class Performance Report (NAC/TLP-20)
            </button>
          </div>
        </div>

        {/* Class Coordinator Remarks (Only visible if role allows) */}
        {(user?.isClassCoordinator || user?.role === 'hod' || user?.role === 'admin') && (
          <div style={{ marginTop: '30px', padding: '20px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border-solid)' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '1rem', color: 'var(--text-primary)' }}>Class In-charge Remarks (For Class Analysis Report)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <textarea 
                placeholder="Overall Class Performance Remarks..." 
                value={classRemarks} 
                onChange={e => setClassRemarks(e.target.value)}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-solid)', minHeight: '60px', resize: 'vertical' }}
              />
              <textarea 
                placeholder="Remedial / Improvement Plan for the Class..." 
                value={improvementPlan} 
                onChange={e => setImprovementPlan(e.target.value)}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-solid)', minHeight: '60px', resize: 'vertical' }}
              />
              <button 
                onClick={handleSaveRemarks}
                disabled={savingRemarks}
                style={{ alignSelf: 'flex-start', background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {savingRemarks ? 'Saving...' : 'Save Remarks for PDF'}
              </button>
            </div>
          </div>
        )}
      </div>

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
                    <span className={`${styles.badge} ${e.status === 'submitted' || e.status === 'locked' ? styles.submitted : styles.draft}`}>
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
