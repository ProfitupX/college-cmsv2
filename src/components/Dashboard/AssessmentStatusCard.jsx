import { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, Clock, AlertTriangle, FileX2, Filter, 
  Search, RefreshCw, ChevronDown, ChevronUp, Layers, Users, BookOpen, PlusCircle
} from 'lucide-react';
import { statsAPI, marksAPI } from '../../services/api';
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

  // 3. Department, Semester & Class Filters
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [selectedClass, setSelectedClass] = useState(propClassId || 'all');
  const [searchTerm, setSearchTerm] = useState('');

  // 4. Component State
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [initiatingKey, setInitiatingKey] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

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

  // Available semesters according to user role, department, and loaded subject scope
  // Evaluated statically from the department pool so selecting a semester never collapses options or hides the dropdown
  const availableSemesters = useMemo(() => {
    if (!data?.subjects) return [];

    const scopedSubjects = (isPrivileged && selectedDept !== 'all')
      ? data.subjects.filter(s => s.department === selectedDept)
      : data.subjects;

    const semSet = new Set();
    scopedSubjects.forEach(s => {
      if (s.semester != null && s.semester !== '') {
        const val = parseInt(s.semester, 10);
        if (!isNaN(val)) semSet.add(val);
      }
    });

    if (semSet.size === 0) {
      const targetDept = (isPrivileged && selectedDept !== 'all' ? selectedDept : propDepartment || user?.department || '').toLowerCase();
      if (targetDept.includes('science') || targetDept.includes('humanities') || targetDept.includes('first year')) {
        return [1, 2];
      }
      return [1, 2, 3, 4, 5, 6, 7, 8];
    }

    return Array.from(semSet).sort((a, b) => a - b);
  }, [data?.subjects, isPrivileged, selectedDept, propDepartment, user?.department]);

  // Cooperative Class filter: available classes filtered by active department and semester
  const availableClasses = useMemo(() => {
    if (!Array.isArray(data?.classes)) return [];
    return data.classes.filter(c => {
      if (isPrivileged && selectedDept !== 'all' && c.department !== selectedDept) return false;
      if (selectedSemester !== 'all' && String(c.semester) !== String(selectedSemester)) return false;
      return true;
    });
  }, [data?.classes, isPrivileged, selectedDept, selectedSemester]);

  // Filter subjects based on selected IA assessment, status filter, department, semester, class, and search
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

      // 2. Department Filter (for Admin/Principal)
      if (isPrivileged && selectedDept !== 'all' && sub.department !== selectedDept) {
        return false;
      }

      // 3. Semester Filter
      if (selectedSemester !== 'all' && String(sub.semester) !== String(selectedSemester)) {
        return false;
      }

      // 4. Class Filter (if local selection applies)
      if (selectedClass !== 'all' && sub.classId !== selectedClass) {
        return false;
      }

      // 5. Search Query Filter (Subject Code, Subject Name, Faculty Name, Class Name)
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
  }, [data, assessmentMode, statusFilter, selectedDept, selectedSemester, selectedClass, searchTerm, isPrivileged]);

  // Compute live filter tab counts for selected assessment
  const filterCounts = useMemo(() => {
    if (!data?.subjects) return { all: 0, pending: 0, completed: 0 };
    let all = 0;
    let pending = 0;
    let completed = 0;

    data.subjects.forEach(sub => {
      // Check department, semester, and class scopes first
      if (isPrivileged && selectedDept !== 'all' && sub.department !== selectedDept) return;
      if (selectedSemester !== 'all' && String(sub.semester) !== String(selectedSemester)) return;
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
  }, [data, assessmentMode, isPrivileged, selectedDept, selectedSemester, selectedClass]);

  // Session Initiation Handler
  const handleInitiateSession = async (sub) => {
    const assessmentName = assessmentMode === 'internal1' ? 'IA1' : 'IA2';
    const confirmMsg = `Initiate ${assessmentName} Assessment Session for:\n\n` +
      `Subject: [${sub.subjectCode}] ${sub.subjectName}\n` +
      `Class: ${sub.className} (${sub.year} Year${sub.section ? `, Sec ${sub.section}` : ''})\n` +
      `Allocated Faculty: ${sub.facultyName}\n\n` +
      `Proceed with session initiation?`;

    if (!window.confirm(confirmMsg)) return;

    const key = `${sub.subjectId}-${sub.classId}`;
    setInitiatingKey(key);
    setActionFeedback(null);

    try {
      const res = await marksAPI.initiateSession({
        subjectId: sub.subjectId,
        classId: sub.classId,
        sessionLabel: assessmentMode
      });

      if (res && res.success) {
        setActionFeedback({
          type: 'success',
          message: res.message || `${assessmentName} assessment session initiated successfully.`
        });

        // Update local state immediately so row updates to 'Not Entered' without delay
        setData(prev => {
          if (!prev || !prev.subjects) return prev;
          const updatedSubjects = prev.subjects.map(s => {
            if (s.subjectId === sub.subjectId && s.classId === sub.classId) {
              return {
                ...s,
                [assessmentMode === 'internal1' ? 'ia1' : 'ia2']: {
                  sessionId: res.sessionId,
                  status: 'Not Entered',
                  statusCode: 'not_entered',
                  entered: 0,
                  pending: s.expectedStudents || 0,
                  lastUpdated: new Date().toISOString()
                }
              };
            }
            return s;
          });
          return { ...prev, subjects: updatedSubjects };
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: res?.error || 'Failed to initiate assessment session.'
        });
      }
    } catch (err) {
      console.error('Error initiating session:', err);
      setActionFeedback({
        type: 'error',
        message: err?.response?.data?.error || err?.message || 'Error communicating with server to initiate session.'
      });
    } finally {
      setInitiatingKey(null);
    }
  };

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
          {/* Feedback Banner */}
          {actionFeedback && (
            <div className={actionFeedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError}>
              <span>{actionFeedback.message}</span>
              <button 
                type="button" 
                onClick={() => setActionFeedback(null)} 
                className={styles.feedbackClose}
                aria-label="Dismiss notification"
              >
                &times;
              </button>
            </div>
          )}

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
                        setSelectedSemester('all');
                        setSelectedClass('all');
                      }}
                      aria-label="Filter by department"
                    >
                      <option value="all">All Departments</option>
                      {data.departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  )}

                  {/* Semester Filter: PERMANENTLY VISIBLE across Admin, Principal, VP, HOD */}
                  <select
                    className={styles.selectInput}
                    value={selectedSemester}
                    onChange={e => {
                      const newSem = e.target.value;
                      setSelectedSemester(newSem);
                      if (selectedClass !== 'all' && data?.classes) {
                        const currentCls = data.classes.find(c => String(c.id) === String(selectedClass));
                        if (currentCls && newSem !== 'all' && String(currentCls.semester) !== String(newSem)) {
                          setSelectedClass('all');
                        }
                      }
                    }}
                    aria-label="Filter subjects by semester"
                  >
                    <option value="all">All Semesters</option>
                    {availableSemesters.map(s => (
                      <option key={s} value={String(s)}>Semester {s}</option>
                    ))}
                  </select>

                  {/* Class / Section Filter (cooperative with Department and Semester) */}
                  {availableClasses.length > 0 && (
                    <select
                      className={styles.selectInput}
                      value={selectedClass}
                      onChange={e => setSelectedClass(e.target.value)}
                      aria-label="Filter subjects by class or section"
                    >
                      <option value="all">
                        {isClassCoord ? 'All My Assigned Classes' : 'All Classes / Sections'}
                      </option>
                      {availableClasses.map(c => (
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
                        const canInitiate = isPrivileged || 
                          (isHod && (sub.department === user?.department || propDepartment === sub.department)) || 
                          (sub.facultyId && String(sub.facultyId) === String(user?.id));

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
                                {sub.className} &bull; {sub.subjectType} &bull; Sem {sub.semester || '—'}
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
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}>
                                {renderBadge(iaData)}
                                {canInitiate && iaData?.statusCode === 'not_created' && (
                                  <button
                                    type="button"
                                    className={styles.initiateBtn}
                                    onClick={() => handleInitiateSession(sub)}
                                    disabled={initiatingKey === `${sub.subjectId}-${sub.classId}`}
                                    title={`Initiate ${assessmentMode === 'internal1' ? 'IA1' : 'IA2'} session for ${sub.subjectName}`}
                                  >
                                    {initiatingKey === `${sub.subjectId}-${sub.classId}` ? (
                                      <><RefreshCw size={11} className="spin" /> Initiating...</>
                                    ) : (
                                      <><PlusCircle size={11} /> Initiate Session</>
                                    )}
                                  </button>
                                )}
                              </div>
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
