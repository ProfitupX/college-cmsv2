import { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, Clock, AlertTriangle, FileX2, Filter, 
  Search, RefreshCw, ChevronDown, ChevronUp, Layers, Users, BookOpen
} from 'lucide-react';
import { statsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import styles from './AssessmentStatusCard.module.css';

export default function AssessmentStatusCard({ 
  role: propRole,
  department: propDepartment,
  classId: propClassId 
}) {
  const { user } = useAuth();
  const effectiveRole = (propRole || user?.role || 'faculty').toLowerCase();
  const isPrivileged = effectiveRole === 'admin' || effectiveRole === 'principal' || effectiveRole === 'vice_principal';
  const isHod = effectiveRole === 'hod';
  const isClassCoord = effectiveRole === 'class_coordinator' || (!isPrivileged && !isHod && Boolean(user?.isClassCoordinator));

  // 1. IA Selector (Strictly IA1 or IA2)
  const [assessmentMode, setAssessmentMode] = useState('internal1'); // 'internal1' | 'internal2'

  // 2. Status Filters within Selected Assessment
  const [statusFilter, setStatusFilter] = useState('pending'); // 'all' | 'pending' | 'completed'

  // 3. Department & Class Filters
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedClass, setSelectedClass] = useState(propClassId || 'all');
  const [searchTerm, setSearchTerm] = useState('');

  // 4. Component State
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch status data from backend
  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const params = {};
      if (isClassCoord) {
        params.role = 'class_coordinator';
        params.isClassCoordinator = 'true';
        if (selectedClass && selectedClass !== 'all') {
          params.classId = selectedClass;
        } else if (user?.coordinatedClassId) {
          params.classId = user.coordinatedClassId;
        }
      } else if (isHod) {
        params.role = 'hod';
        params.department = propDepartment || user?.department;
        if (selectedClass && selectedClass !== 'all') {
          params.classId = selectedClass;
        }
      } else {
        // Admin / Principal / Vice Principal
        params.role = effectiveRole;
        if (selectedDept && selectedDept !== 'all') {
          params.department = selectedDept;
        }
        if (selectedClass && selectedClass !== 'all') {
          params.classId = selectedClass;
        }
      }

      const res = await statsAPI.getAssessmentStatus(params);
      if (res && res.success) {
        setData(res);
      } else {
        setError(res?.error || 'Could not load assessment monitoring data.');
      }
    } catch (err) {
      console.error('Failed to load assessment status:', err);
      setError(err?.message || 'Error communicating with assessment monitoring server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [effectiveRole, selectedDept, selectedClass]);

  // Filter subjects based on selected IA assessment and status filter
  const displayedSubjects = useMemo(() => {
    if (!data?.subjects) return [];

    return data.subjects.filter(sub => {
      // Get the status for the chosen assessment
      const iaData = assessmentMode === 'internal1' ? sub.ia1 : sub.ia2;
      const statusCode = iaData?.statusCode || 'not_created';

      // 1. Status Filter Check ('all', 'pending', 'completed')
      if (statusFilter === 'pending') {
        if (statusCode === 'completed') return false;
      } else if (statusFilter === 'completed') {
        if (statusCode !== 'completed') return false;
      }

      // 2. Class Filter (if local selection applies)
      if (selectedClass !== 'all' && sub.classId !== selectedClass) {
        return false;
      }

      // 3. Department Filter (for Admin/Principal)
      if (isPrivileged && selectedDept !== 'all' && sub.department !== selectedDept) {
        return false;
      }

      // 4. Search Query Filter (Subject Code, Subject Name, Faculty Name)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const codeMatch = (sub.subjectCode || '').toLowerCase().includes(q);
        const nameMatch = (sub.subjectName || '').toLowerCase().includes(q);
        const facMatch = (sub.facultyName || '').toLowerCase().includes(q);
        const classMatch = (sub.className || '').toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !facMatch && !classMatch) return false;
      }

      return true;
    });
  }, [data, assessmentMode, statusFilter, selectedClass, selectedDept, searchTerm, isPrivileged]);

  // Compute live filter tab counts for selected assessment
  const filterCounts = useMemo(() => {
    if (!data?.subjects) return { all: 0, pending: 0, completed: 0 };
    let all = 0;
    let pending = 0;
    let completed = 0;

    data.subjects.forEach(sub => {
      // Check department and class scopes first
      if (isPrivileged && selectedDept !== 'all' && sub.department !== selectedDept) return;
      if (selectedClass !== 'all' && sub.classId !== selectedClass) return;

      all++;
      const iaData = assessmentMode === 'internal1' ? sub.ia1 : sub.ia2;
      if (iaData?.statusCode === 'completed') {
        completed++;
      } else {
        pending++;
      }
    });

    return { all, pending, completed };
  }, [data, assessmentMode, isPrivileged, selectedDept, selectedClass]);

  // Format timestamp helper
  const formatTime = (ts) => {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }) + ' ' + d.toLocaleTimeString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '—';
    }
  };

  // Status Badge Renderer
  const renderBadge = (iaData) => {
    const code = iaData?.statusCode || 'not_created';
    const text = iaData?.status || 'Session Not Created';

    let badgeClass = styles.badgeNotCreated;
    let icon = <FileX2 size={13} />;

    if (code === 'completed') {
      badgeClass = styles.badgeCompleted;
      icon = <CheckCircle2 size={13} />;
    } else if (code === 'partially_completed') {
      badgeClass = styles.badgePartiallyCompleted;
      icon = <Clock size={13} />;
    } else if (code === 'not_entered') {
      badgeClass = styles.badgeNotEntered;
      icon = <AlertTriangle size={13} />;
    }

    return (
      <span className={`${styles.badge} ${badgeClass}`}>
        {icon}
        {text}
      </span>
    );
  };

  const getSubTitleText = () => {
    if (isClassCoord) {
      const clsName = user?.coordinatedClasses?.[0]?.name || 'Assigned Class';
      return `Class-restricted monitoring for ${clsName}. Identify subject faculty with pending entries.`;
    }
    if (isHod) {
      return `Departmental mark entry monitoring for ${propDepartment || user?.department}.`;
    }
    return 'College-wide executive monitoring of IA1 and IA2 faculty mark entry completion.';
  };

  return (
    <div id="assessment-status-card" className={styles.container}>
      {/* 1. Header with Assessment Selector */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.titleIcon}>
            <Layers size={22} />
          </div>
          <div>
            <h2 className={styles.title}>Internal Assessment Mark Entry Status – IA1 &amp; IA2</h2>
            <p className={styles.subTitle}>{getSubTitleText()}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* IA Assessment Selector (IA1 vs IA2) */}
          <div className={styles.assessmentSelector}>
            <button
              type="button"
              className={`${styles.assessmentBtn} ${assessmentMode === 'internal1' ? styles.assessmentBtnActiveIA1 : ''}`}
              onClick={() => setAssessmentMode('internal1')}
            >
              <BookOpen size={15} />
              IA1 (Internal Assessment 1)
            </button>
            <button
              type="button"
              className={`${styles.assessmentBtn} ${assessmentMode === 'internal2' ? styles.assessmentBtnActiveIA2 : ''}`}
              onClick={() => setAssessmentMode('internal2')}
            >
              <BookOpen size={15} />
              IA2 (Internal Assessment 2)
            </button>
          </div>

          <button
            type="button"
            className={styles.filterTab}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--surface)', border: '1px solid var(--border-solid)', borderRadius: '6px' }}
            onClick={() => fetchData(true)}
            disabled={refreshing}
            title="Refresh Mark Entry Data"
          >
            <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            type="button"
            className={styles.filterTab}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--surface)', border: '1px solid var(--border-solid)', borderRadius: '6px' }}
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Details' : 'Collapse Details'}
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            {isCollapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: '8px' }} />
          <div>Loading {assessmentMode === 'internal1' ? 'IA1' : 'IA2'} mark entry status...</div>
        </div>
      ) : error ? (
        <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', borderRadius: '8px', fontSize: '0.85rem' }}>
          <AlertTriangle size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          {error}
        </div>
      ) : (
        <>
          {/* 2. Toolbar & Status Filter Controls */}
          {!isCollapsed && (
            <>
              <div className={styles.toolbar}>
                <div className={styles.filterGroup}>
                  {/* Status Filters: All, Pending Only, Completed */}
                  <div className={styles.statusFilterTabs}>
                    <button
                      type="button"
                      className={`${styles.filterTab} ${statusFilter === 'all' ? styles.filterTabActive : ''}`}
                      onClick={() => setStatusFilter('all')}
                    >
                      All ({filterCounts.all})
                    </button>
                    <button
                      type="button"
                      className={`${styles.filterTab} ${statusFilter === 'pending' ? styles.filterTabActive : ''}`}
                      onClick={() => setStatusFilter('pending')}
                      style={statusFilter === 'pending' ? { background: '#d97706', color: '#fff' } : {}}
                    >
                      Pending Only ({filterCounts.pending})
                    </button>
                    <button
                      type="button"
                      className={`${styles.filterTab} ${statusFilter === 'completed' ? styles.filterTabActive : ''}`}
                      onClick={() => setStatusFilter('completed')}
                      style={statusFilter === 'completed' ? { background: '#059669', color: '#fff' } : {}}
                    >
                      Completed ({filterCounts.completed})
                    </button>
                  </div>

                  {/* Department Filter (Admin & Principal only) */}
                  {isPrivileged && Array.isArray(data?.departments) && (
                    <select
                      className={styles.selectInput}
                      value={selectedDept}
                      onChange={e => {
                        setSelectedDept(e.target.value);
                        setSelectedClass('all');
                      }}
                    >
                      <option value="all">All Departments</option>
                      {data.departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  )}

                  {/* Class / Section Filter (HOD, Incharge, or Admin) */}
                  {Array.isArray(data?.classes) && data.classes.length > 1 && (
                    <select
                      className={styles.selectInput}
                      value={selectedClass}
                      onChange={e => setSelectedClass(e.target.value)}
                    >
                      <option value="all">
                        {isClassCoord ? 'All My Assigned Classes' : 'All Classes / Sections'}
                      </option>
                      {data.classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.section ? `(Sec ${c.section})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Live Search Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Search faculty or subject..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Detailed Subject-Wise Monitoring Table */}
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Subject Code &amp; Name</th>
                      <th>Year / Section</th>
                      <th>Faculty Name</th>
                      <th>Status</th>
                      <th>Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedSubjects.length > 0 ? (
                      displayedSubjects.map((sub) => {
                        const iaData = assessmentMode === 'internal1' ? sub.ia1 : sub.ia2;
                        const isPending = iaData?.statusCode !== 'completed';

                        return (
                          <tr 
                            key={`${sub.subjectId}-${sub.classId}`}
                            className={isPending ? styles.rowPending : styles.rowCompleted}
                          >
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                <span style={{ color: '#4f46e5', marginRight: '6px' }}>[{sub.subjectCode}]</span>
                                {sub.subjectName}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {sub.className} &bull; {sub.subjectType}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600 }}>{sub.year} Year</span>
                              {sub.section && (
                                <span style={{ marginLeft: '6px', padding: '1px 5px', background: 'var(--border-light)', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                                  Sec {sub.section}
                                </span>
                              )}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {sub.facultyName}
                              </div>
                              {sub.facultyDesignation && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {sub.facultyDesignation}
                                </div>
                              )}
                            </td>
                            <td>
                              {renderBadge(iaData)}
                            </td>
                            <td>
                              <span className={styles.timestamp}>
                                {formatTime(iaData?.lastUpdated)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className={styles.emptyState}>
                          <CheckCircle2 size={32} className={styles.emptyIcon} />
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {statusFilter === 'pending'
                              ? `All subjects have completed ${assessmentMode === 'internal1' ? 'IA1' : 'IA2'} mark entry!`
                              : `No subjects found matching your filter criteria.`}
                          </div>
                          <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                            {statusFilter === 'pending' && 'Switch to "All" to view completed entries.'}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
