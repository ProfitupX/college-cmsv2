import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMarks } from '../context/MarksContext';
import { classesAPI, subjectsAPI, studentsAPI, marksAPI } from '../services/api';
import ComponentBuilder2021 from '../components/MarksEntry/ComponentBuilder2021';
import MarksTable2021 from '../components/MarksEntry/MarksTable2021';
import ClassSubjectSelector from '../components/MarksEntry/ClassSubjectSelector';
import { 
  generateSubjectMarksListPDF2021, 
  generateSubjectAnalysisPDF,
  generateClassAnalysisPDF,
  generateConsolidatedMarksPDF,
  generateOverallMarksAndAttendancePDF
} from '../services/pdfReportGenerator';
import DeclarationModal from '../components/Reports/DeclarationModal';
import { Save, RotateCcw, Download, AlertTriangle, CheckCircle, Loader, Lock, Key, Clock, FileText, UserCheck } from 'lucide-react';
import styles from './MarksEntryPage.module.css';

/**
 * MarksEntryPage for 2021 Regulation — 3rd & Final Year Students
 *
 * Mark Scheme:
 * ─────────────────────────────────────────────────────────────────
 * Theory Subjects
 *   Int1 & Int2: CIA /40 + Internal Exam /100→60 = Total /100
 *
 * Lab-cum-Theory / Theory-cum-Lab
 *   Int1: CIA /50 + Internal Exam /100→50 = Total /100
 *   Int2: CIA /50 + Lab Exam /100→50 = Total /100
 *         (Internal Exam is recorded for reference but NOT counted)
 *
 * No attendance marks.
 * ─────────────────────────────────────────────────────────────────
 */
export default function MarksEntryPage2021() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    activeRegulation,
    selectedClassId, selectedSubjectId,
    marksData, attendanceData, internalExamData, labData, totalHours, isDirty,
    setRegulation, setClass, setSubject, setClassAndSubject, setMark, setAttendance, setInternalExam, setLabData, setTotalHours, setSessionBulk, markSaved, clearMarks, clearSelection,
  } = useMarks();

  const isCorrectReg = activeRegulation === '2021';
  const effectiveClassId = isCorrectReg ? selectedClassId : '';
  const effectiveSubjectId = isCorrectReg ? selectedSubjectId : '';

  const [classes,   setClasses]   = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [students,  setStudents]  = useState([]);

  const [assessmentComponents, setAssessmentComponents] = useState([]);
  const [saved,    setSaved]    = useState(false);
  const [assessmentMode, setAssessmentMode] = useState('internal1');
  const [saving,   setSaving]   = useState(false);
  const [saveErr,  setSaveErr]  = useState('');
  const [loading,  setLoading]  = useState(true);
  const [isComponentsDirty, setIsComponentsDirty] = useState(false);
  const [reportType, setReportType] = useState('subject_marks_list_2021');
  const [remedialAction, setRemedialAction] = useState('');

  // Lock / Unlock
  const [currentSession, setCurrentSession]     = useState(null);
  const [sessionStatus,  setSessionStatus]      = useState('draft');
  const [showUnlockModal, setShowUnlockModal]   = useState(false);
  const [unlockReason,   setUnlockReason]       = useState('');
  const [submittingUnlock, setSubmittingUnlock] = useState(false);
  const [declarationModalOpen, setDeclarationModalOpen] = useState(false);
  const [pdfPayload, setPdfPayload] = useState(null);

  const location = useLocation();

  // ── Handle incoming navigation state ────────────────────────
  useEffect(() => {
    setRegulation('2021');
    const targetClassId = location.state?.classId || location.state?.class_id;
    const targetSubjectId = location.state?.subjectId || location.state?.subject_id;
    const targetSession = location.state?.sessionLabel || location.state?.session_label;

    if (targetClassId && targetSubjectId) {
      setClassAndSubject(targetClassId, targetSubjectId);
    } else if (targetClassId) {
      setClass(targetClassId);
    }
    if (targetSession) {
      setAssessmentMode(targetSession);
    }
  }, [location.state]);

  // ── Load classes on mount — filter to 3rd/4th year only, restricted by user role ────
  useEffect(() => {
    classesAPI.getAll()
      .then(allClasses => {
        // 2021 Regulation: only show III and IV year classes (semester 5,6,7,8)
        let filtered = allClasses.filter(c =>
          c.year_label === 'III' || c.year_label === 'IV' ||
          c.year_label === '3' || c.year_label === '4' ||
          parseInt(c.semester) >= 5
        );

        if (user?.role === 'principal' || user?.role === 'vice_principal' || user?.role === 'admin') {
          // All 3rd/4th year classes
        } else if (user?.role === 'hod') {
          const teachIds = (user?.teachingClasses || []).map(c => c.id);
          filtered = filtered.filter(c => c.department === user.department || teachIds.includes(c.id));
        } else if (user?.isClassCoordinator) {
          const coordIds = (user.coordinatedClasses || []).map(c => c.id);
          const teachIds = (user.teachingClasses || []).map(c => c.id);
          filtered = filtered.filter(c => 
            coordIds.includes(c.id) || 
            (user.coordinatedClassId && c.id === user.coordinatedClassId) || 
            teachIds.includes(c.id)
          );
        } else {
          const teachIds = (user?.teachingClasses || []).map(c => c.id);
          filtered = filtered.filter(c => teachIds.includes(c.id));
        }

        // Guarantee target class from redirect is available in classes list for HoD/Staff
        const targetClassId = location.state?.classId || location.state?.class_id;
        if (targetClassId) {
          const matchedTarget = allClasses.find(c => c.id === targetClassId);
          if (matchedTarget && !filtered.some(c => c.id === targetClassId)) {
            filtered.push(matchedTarget);
          }
        }

        setClasses(filtered);
      })
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, [user, location.state]);

  // Ensure stale 2025 classes are cleanly removed on regulation switch without refresh
  useEffect(() => {
    if (classes.length > 0 && effectiveClassId) {
      const isValid = classes.some(c => c.id === effectiveClassId);
      const targetClassId = location.state?.classId || location.state?.class_id;
      if (!isValid && !targetClassId) {
        clearSelection();
      }
    }
  }, [classes, effectiveClassId]);

  // ── Load subjects when class changes ──────────────────────
  useEffect(() => {
    if (!effectiveClassId) { setSubjects([]); return; }
    subjectsAPI.getByClass(effectiveClassId).then((allSubs) => {
      const isElevated = user?.role === 'hod' || user?.role === 'admin' || user?.role === 'principal' || user?.role === 'vice_principal';
      const isCoordinator = user?.isClassCoordinator && (
        user.coordinatedClassId === effectiveClassId || 
        (user.coordinatedClasses || []).some(c => c.id === effectiveClassId)
      );

      let visibleSubs = allSubs;
      if (!isElevated && !isCoordinator && user?.assignedSubjectIds?.length > 0) {
        visibleSubs = allSubs.filter(s => user.assignedSubjectIds.includes(s.id));
      }
      setSubjects(visibleSubs);

      // Restore target subject reliably from incoming state or existing selection
      const targetSubId = location.state?.subjectId || location.state?.subject_id || effectiveSubjectId;
      if (targetSubId && visibleSubs.some(s => s.id === targetSubId)) {
        setSubject(targetSubId);
      }
    }).catch(() => setSubjects([]));
  }, [effectiveClassId, user]);

  // ── Load students when class changes ──────────────────────
  useEffect(() => {
    if (!effectiveClassId) { setStudents([]); return; }
    studentsAPI.getByClass(effectiveClassId).then(setStudents).catch(() => setStudents([]));
  }, [effectiveClassId]);

  // ── Load existing session when subject or mode changes ────
  useEffect(() => {
    if (!effectiveClassId || !effectiveSubjectId || !user?.id) {
      setCurrentSession(null);
      setSessionStatus('draft');
      setAssessmentComponents([]);
      setRemedialAction('');
      setSaved(false);
      setIsComponentsDirty(false);
      return;
    }
    setLoading(true);

    marksAPI.getSessions({ classId: effectiveClassId, subjectId: effectiveSubjectId, sessionLabel: assessmentMode })
      .then((sessions) => {
        if (sessions.length > 0) return marksAPI.getSessionDetail(sessions[0].id);
        return null;
      })
      .then((detail) => {
        if (detail) {
          setCurrentSession(detail.session);
          setSessionStatus(detail.session.status || 'locked');

          const loadedComps = detail.components.map((c) => ({
            uid: c.id,
            typeId: c.type_id,
            label: c.label,
            conductedMax: parseFloat(c.conducted_max) || 100,
            max: parseFloat(c.max_marks),
            icon: c.icon,
            color: c.color,
          }));
          setAssessmentComponents(loadedComps);

          const loadedMarks = {};
          detail.marks.forEach(m => {
            if (!loadedMarks[m.student_id]) loadedMarks[m.student_id] = {};
            loadedMarks[m.student_id][m.component_id] = parseFloat(m.marks_obtained);
          });
          setSessionBulk({
            marks: loadedMarks,
            attendance: detail.attendance || {},
            internalExam: detail.internalExam || {},
            labData: detail.labData || {},
            totalHours: detail.session.total_hours || ''
          });
          setRemedialAction(detail.session.remedial_action || '');
          setSaved(true);
          setIsComponentsDirty(false);
        } else {
          setCurrentSession(null);
          setSessionStatus('draft');
          setAssessmentComponents([]);
          setSessionBulk({ marks: {}, attendance: {}, internalExam: {}, labData: {}, totalHours: 0 });
          setRemedialAction('');
          setSaved(false);
          setIsComponentsDirty(false);
        }
      })
      .catch((err) => console.error('Failed to load marks session (2021):', err))
      .finally(() => setLoading(false));
  }, [effectiveClassId, effectiveSubjectId, user?.id, subjects, assessmentMode]);

  const selectedClass   = classes.find(c => c.id === effectiveClassId);
  const selectedSubject = subjects.find(s => s.id === effectiveSubjectId);
  const handlingFacultyName =
    currentSession?.staff_name ||
    location.state?.staffName ||
    selectedSubject?.faculty_name ||
    (user?.role === 'staff' || user?.role === 'faculty' ? user.name : 'Faculty Not Assigned');
  const handlingFacultyDesig =
    currentSession?.staff_designation ||
    location.state?.staffDesignation ||
    selectedSubject?.faculty_designation ||
    (user?.role === 'staff' || user?.role === 'faculty' ? user.designation : '');

  // ── Save handler ───────────────────────────────────────────
  const handleSave = async (actionType = 'draft') => {
    setSaving(true);
    setSaveErr('');
    try {
      const marksPayload = [];
      students.forEach((st) => {
        const m = marksData[st.id] || {};
        assessmentComponents.forEach((comp, idx) => {
          marksPayload.push({
            studentId:      st.id,
            componentIndex: idx,
            marksObtained:  parseFloat(m[comp.uid]) || 0,
          });
        });
      });

      // For 2021 reg — attendance recorded for tracking (0 marks weight), along with internalExam and labData
      const attendancePayload = students.map(st => ({
        studentId: st.id,
        hoursAttended: attendanceData[st.id] !== undefined && attendanceData[st.id] !== '' ? parseInt(attendanceData[st.id], 10) || 0 : 0,
        actualTakenHours: attendanceData[st.id] !== undefined && attendanceData[st.id] !== '' ? parseInt(attendanceData[st.id], 10) || 0 : 0,
        internalExamMark: internalExamData[st.id] || '',
        labAttendance: 0,
        labMark: (labData[st.id] && labData[st.id].labMark) || ''
      }));

      const payload = {
        subjectId:    effectiveSubjectId,
        classId:      effectiveClassId,
        staffId:      user.id,
        sessionLabel: assessmentMode,
        totalHours:   parseInt(totalHours, 10) || 0,
        remedialAction,
        components: assessmentComponents.map((c) => ({
          typeId:   c.typeId,
          label:    c.label,
          conductedMax: c.conductedMax || 100,
          maxMarks: c.max,
          icon:     c.icon,
          color:    c.color,
        })),
        marks: marksPayload,
        attendance: attendancePayload,
        actionType
      };

      const res = await marksAPI.submit(payload);
      if (res.sessionId) {
        setCurrentSession((prev) => ({ ...(prev || {}), id: res.sessionId }));
      }

      markSaved();
      setSaved(true);
      setSessionStatus(actionType === 'frozen' ? 'locked' : 'draft');
      setIsComponentsDirty(false);
    } catch (err) {
      setSaveErr(err.message || 'Failed to save marks.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    clearMarks();
    setSaved(false);
    setSaveErr('');
    setAssessmentMode('internal1');
  };

  const handleRequestUnlock = async () => {
    if (!currentSession?.id) return;
    setSubmittingUnlock(true);
    try {
      await marksAPI.requestUnlock({
        sessionId: currentSession.id,
        subjectId: effectiveSubjectId,
        classId: effectiveClassId,
        staffId: user.id,
        reason: unlockReason
      });
      setSessionStatus('unlock_requested');
      setShowUnlockModal(false);
      setUnlockReason('');
    } catch (err) {
      alert(err.message || 'Failed to submit unlock request.');
    } finally {
      setSubmittingUnlock(false);
    }
  };

  const handleUnlockSheet = async () => {
    if (!currentSession?.id) return;
    try {
      await marksAPI.unlockSession(currentSession.id);
      setSessionStatus('draft');
      setSaved(false);
    } catch (err) {
      alert(err.message || 'Failed to unlock sheet.');
    }
  };

  // ── PDF Download ───────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!selectedClass || !selectedSubject) return;

    if (reportType === 'subject_marks_list_2021' || reportType === 'subject_marks_with_internal_2021' || reportType === 'subject_marks_without_internal_2021') {
      const withInternal = reportType !== 'subject_marks_without_internal_2021';
      await generateSubjectMarksListPDF2021({
        subject: selectedSubject,
        classObj: selectedClass,
        staff: user,
        session: currentSession,
        students,
        marksData,
        attendanceData,
        totalHours: parseInt(totalHours || currentSession?.total_hours || 0),
        internalExamData,
        labData,
        assessmentMode,
        components: assessmentComponents,
        withInternal
      });
    } else if (reportType === 'subject_analysis') {
      setPdfPayload({
        subject: selectedSubject,
        classObj: selectedClass,
        staff: user,
        session: currentSession,
        remedialAction, // Pass state
        students,
        allMarks: marksData,
        components: assessmentComponents,
        attendanceData,
        internalExamData,
        labData,
        assessmentMode
      });
      setDeclarationModalOpen(true);
    } else if (reportType === 'examcell_legal_with_internal' || reportType === 'examcell_legal_without_internal') {
      const withInternal = reportType === 'examcell_legal_with_internal';
      const summary = await marksAPI.getClassSummary(effectiveClassId, assessmentMode);
      await generateOverallMarksAndAttendancePDF({
        classObj: selectedClass,
        sessionLabel: assessmentMode,
        subjects: summary.subjects || subjects,
        students,
        allSessions: summary.sessions || [],
        allAttendance: summary.allAttendance || [],
        allMarks: summary.allMarks || [],
        allComponents: summary.allComponents || [],
        withInternal,
        inchargeNameParam: user?.isClassCoordinator ? user?.name : ''
      });
    } else if (reportType === 'class_analysis') {
      const summary = await marksAPI.getClassSummary(effectiveClassId, assessmentMode);
      await generateClassAnalysisPDF({
        classObj: selectedClass,
        sessionLabel: assessmentMode,
        subjects: summary.subjects || subjects,
        students,
        allSessions: summary.sessions || [],
        allMarks: summary.allMarks || [],
        allAttendance: summary.allAttendance || [],
        inchargeNameParam: user?.isClassCoordinator ? user?.name : ''
      });
    } else if (reportType === 'consolidated_statement') {
      const summary = await marksAPI.getClassSummary(effectiveClassId, assessmentMode);
      await generateConsolidatedMarksPDF({
        classObj: selectedClass,
        sessionLabel: assessmentMode,
        subjects: summary.subjects || subjects,
        students,
        allSessions: summary.sessions || [],
        allAttendance: summary.allAttendance || [],
        allMarks: summary.allMarks || [],
        allComponents: summary.allComponents || [],
        inchargeNameParam: user?.isClassCoordinator ? user?.name : ''
      });
    }
  };

  const handleGenerateSubjectPDF = async (declarationData) => {
    setDeclarationModalOpen(false);
    try {
      await generateSubjectAnalysisPDF({
        ...pdfPayload,
        marksData: pdfPayload.allMarks, // Map allMarks to marksData for pdfReportGenerator
        declarationData
      });
    } catch (err) {
      alert('Failed to generate Subject Analysis PDF: ' + err.message);
    } finally {
      setPdfPayload(null);
    }
  };

  const handleDownloadSubjectAnalysisPDF = async () => {
    if (!selectedClass || !selectedSubject) return;
    setPdfPayload({
      subject: selectedSubject,
      classObj: selectedClass,
      staff: user,
      session: currentSession,
      students,
      allMarks: marksData,
      components: assessmentComponents,
      attendanceData,
      internalExamData,
      labData,
      assessmentMode,
      remedialAction
    });
    setDeclarationModalOpen(true);
  };

  const handleClassChange = (val) => {
    setClass(val);
    setAssessmentComponents([]);
    setCurrentSession(null);
    setSessionStatus('draft');
    setSaved(false);
    setSaveErr('');
  };
  const handleSubjectChange = (val) => {
    setSubject(val);
    setAssessmentComponents([]);
    setCurrentSession(null);
    setSessionStatus('draft');
    setSaved(false);
    setSaveErr('');
  };

  const step = !selectedSubject ? 1 : assessmentComponents.length === 0 ? 2 : 3;
  const isPrincipal = user?.role === 'principal' || user?.role === 'vice_principal';
  const isLocked = isPrincipal || ((sessionStatus === 'locked' || sessionStatus === 'unlock_requested') && user?.role !== 'hod' && user?.role !== 'admin');
  const canEnterMarks = isPrincipal ? true : assessmentComponents.length > 0;

  // Match both hyphenated ('Theory-cum-Lab') and non-hyphenated ('Theory cum Lab') DB values
  const isLabType = [
    'Lab-cum-Theory', 'Theory-cum-Lab',
    'Lab cum Theory', 'Theory cum Lab'
  ].includes(selectedSubject?.type);
  const ciaMax = isLabType ? 50 : 40;

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Loader size={28} className={styles.spinner} />
        <p>Loading class &amp; session data…</p>
      </div>
    );
  }

  return (
    <div>
      {/* 2021 Regulation Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
        color: '#fff',
        borderRadius: '12px',
        padding: '12px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.9rem',
        fontWeight: 600,
      }}>
        <span style={{ fontSize: '1.4rem' }}>🎓</span>
        <div>
          <div>2021 Regulation — 3rd &amp; Final Year Marks Entry</div>
          <div style={{ fontWeight: 400, fontSize: '0.78rem', opacity: 0.85, marginTop: '2px' }}>
            {isLabType
              ? `Lab-cum-Theory: CIA /${ciaMax} + Exam /100→${ciaMax === 50 ? 50 : 60}  |  Int2: CIA /50 + Lab Exam /100→50`
              : `Theory: CIA /40 + Internal Exam /100→60 = Total /100 · No Attendance marks`}
          </div>
        </div>
      </div>

      {/* Steps indicator */}
      <div className={styles.steps}>
        {[
          { n: 1, label: 'Select Class & Subject' },
          { n: 2, label: 'Build Assessment Sheet' },
          { n: 3, label: 'Enter & Submit Marks' },
        ].map((s) => (
          <div
            key={s.n}
            className={`${styles.step} ${step === s.n ? styles.stepActive : ''} ${step > s.n ? styles.stepDone : ''}`}
          >
            <div className={styles.stepNum}>{step > s.n ? <CheckCircle size={14} /> : s.n}</div>
            <span className={styles.stepLabel}>{s.label}</span>
            {s.n < 3 && <div className={styles.stepLine} />}
          </div>
        ))}
      </div>

      <ClassSubjectSelector
        classes={classes}
        subjects={subjects}
        selectedClass={effectiveClassId}
        selectedSubject={effectiveSubjectId}
        onClassChange={handleClassChange}
        onSubjectChange={handleSubjectChange}
      />

      {selectedSubject && (
        <>
          {/* Lock Banner */}
          {sessionStatus === 'locked' && !isPrincipal && (
            <div className={styles.lockBanner}>
              <div className={styles.lockBannerLeft}>
                <Lock size={18} />
                <span>This Marks Sheet is <strong>Locked</strong> after submission. {user?.role === 'hod' || user?.role === 'admin' ? 'You can unlock it.' : 'Changes require HOD approval.'}</span>
              </div>
              {user?.role === 'hod' || user?.role === 'admin' ? (
                <button className={styles.requestUnlockBtn} onClick={handleUnlockSheet}>
                  <Key size={14} /> Unlock Sheet
                </button>
              ) : (
                <button className={styles.requestUnlockBtn} onClick={() => setShowUnlockModal(true)}>
                  <Key size={14} /> Request Edit Permission
                </button>
              )}
            </div>
          )}

          {sessionStatus === 'unlock_requested' && !isPrincipal && (
            <div className={styles.lockBanner}>
              <div className={styles.lockBannerLeft}>
                <Clock size={18} />
                <span>Unlock Request Pending: Waiting for <strong>HOD Approval</strong> to edit marks.</span>
              </div>
              <span className={styles.pendingBadge}>Approval Pending</span>
            </div>
          )}

          {/* Enhanced Subject & Faculty Banner */}
          <div className={styles.subjectStrip}>
            <div className={styles.subjectInfoLeft}>
              <div className={styles.badgeRow}>
                <span className={styles.codeBadge}>{selectedSubject.code}</span>
                <span className={styles.typeBadge}>
                  {isLabType ? 'Lab-cum-Theory (CIA /50)' : 'Theory (CIA /40)'}
                </span>
                <span className={styles.regBadge}>Regulation 2021</span>
                {selectedSubject.ltpc && (
                  <span className={styles.ltpcBadge}>LTPC: {selectedSubject.ltpc}</span>
                )}
                {isPrincipal ? (
                  <span className={styles.roleBadgePrincipal}>
                    🏛 Principal Review Panel
                  </span>
                ) : user?.role === 'hod' ? (
                  <span className={styles.roleBadgeHod}>
                    🏢 HOD Monitoring Panel • {user?.department || selectedClass?.department || 'Dept'}
                  </span>
                ) : user?.isClassCoordinator ? (
                  <span className={styles.roleBadgeCoord}>
                    📋 Class In-Charge View
                  </span>
                ) : (
                  <span className={styles.roleBadgeStaff}>
                    📝 Faculty Marks Entry Portal
                  </span>
                )}
              </div>

              <h2 className={styles.subjectTitle}>{selectedSubject.name}</h2>
              <p className={styles.classDeptInfo}>
                🎓 Class: {selectedClass?.name || 'Class'} · {selectedClass?.department || selectedSubject?.department || 'Engineering'}
              </p>

              {/* Prominent Faculty In-Charge Indicator */}
              <div className={styles.staffInChargeBox}>
                <div className={styles.staffIconCircle}>
                  <UserCheck size={18} />
                </div>
                <div className={styles.staffTextGroup}>
                  <span className={styles.staffLabel}>FACULTY / STAFF IN-CHARGE</span>
                  <div className={styles.staffNameHighlight}>
                    <span>{handlingFacultyName}</span>
                    {handlingFacultyDesig && (
                      <span className={styles.staffDesig}>({handlingFacultyDesig})</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.subjectStripRight}>
              <div className={styles.assessmentSelector}>
                <label>Assessment Mode:</label>
                <select
                  value={assessmentMode}
                  onChange={(e) => setAssessmentMode(e.target.value)}
                  className={styles.dropdown}
                >
                  <option value="internal1">Internal Assessment 1</option>
                  <option value="internal2">Internal Assessment 2</option>
                </select>
              </div>

              {sessionStatus === 'locked' ? (
                <div className={`${styles.sessionStateBadge} ${styles.stateLocked}`}>
                  <Lock size={12} /> Status: Marks Frozen &amp; Locked
                </div>
              ) : sessionStatus === 'unlock_requested' ? (
                <div className={`${styles.sessionStateBadge} ${styles.statePending}`}>
                  <Clock size={12} /> Status: Unlock Approval Pending
                </div>
              ) : (
                <div className={`${styles.sessionStateBadge} ${styles.stateDraft}`}>
                  <Clock size={12} /> Status: Draft (Editable)
                </div>
              )}
            </div>
          </div>

          {!isPrincipal && (
            <ComponentBuilder2021
              components={assessmentComponents}
              onChange={(comps) => { setAssessmentComponents(comps); setSaved(false); setIsComponentsDirty(true); }}
              isLocked={isLocked}
              ciaMax={ciaMax}
            />
          )}
        </>
      )}

      {canEnterMarks && students.length > 0 && (
        <>
          {/* Info strip about mark allocation */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-solid)',
            borderRadius: '10px',
            padding: '10px 16px',
            marginBottom: '12px',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap',
          }}>
            <span>📊 <strong>CIA:</strong> Sum of components (max {ciaMax})</span>
            {!(isLabType && assessmentMode === 'internal2') && (
              <span>📝 <strong>Internal Exam:</strong> /100 → converted to /{isLabType ? 50 : 60}</span>
            )}
            {isLabType && assessmentMode === 'internal2' && (
              <>
                <span>📝 <strong>Internal Exam:</strong> /100</span>
                <span>🔬 <strong>Lab Exam:</strong> /100 → converted to /50</span>
              </>
            )}
            <span>📅 <strong>Attendance:</strong> Record only (0 mark weight)</span>
            <span>🏆 <strong>Final:</strong> /100</span>
          </div>

          <MarksTable2021
            students={students}
            components={assessmentComponents}
            marksData={marksData}
            attendanceData={attendanceData}
            totalHours={totalHours}
            internalExamData={internalExamData}
            labData={labData}
            assessmentMode={assessmentMode}
            selectedSubject={selectedSubject}
            onMarkChange={setMark}
            onAttendanceChange={setAttendance}
            onTotalHoursChange={(val) => { setTotalHours(val); setSaved(false); }}
            onInternalExamChange={setInternalExam}
            onLabDataChange={setLabData}
            isLocked={isLocked}
          />

          {!isPrincipal && (
            <div style={{ marginTop: '24px', background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-solid)' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '1rem', color: 'var(--text-primary)' }}>Remarks &amp; Improvement Plan</h4>
              <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Qualitative inputs, remarks, or remedial action plan for this assessment. Included in the Subject Analysis Report.
              </p>
              <textarea
                value={remedialAction}
                onChange={(e) => { setRemedialAction(e.target.value); setSaved(false); }}
                placeholder="e.g. Extra coaching classes arranged for slow learners..."
                disabled={isLocked}
                style={{
                  width: '100%', minHeight: '80px', padding: '12px', borderRadius: '8px',
                  border: '1px solid var(--border-solid)', background: isLocked ? 'var(--bg)' : '#fff',
                  fontSize: '0.9rem', resize: 'vertical'
                }}
              />
            </div>
          )}
        </>
      )}

      {/* Action Bar */}
      {selectedSubject && (
        <div className={styles.actionBar}>
          <div className={styles.actionLeft}>
            {saved && !isPrincipal && (
              <div className={styles.savedMsg}>
                <CheckCircle size={16} /> Marks saved to database!
              </div>
            )}
            {saveErr && !isPrincipal && (
              <div className={styles.errorMsg}>
                <AlertTriangle size={16} /> {saveErr}
              </div>
            )}
            {(isDirty || isComponentsDirty) && !saved && !saveErr && !isPrincipal && (
              <div className={styles.dirtyMsg}>
                <AlertTriangle size={16} /> Unsaved changes — don't forget to submit
              </div>
            )}
          </div>
          <div className={styles.actionRight}>
            <div className={styles.downloadGroup}>
              <select className={styles.downloadSelect} value={reportType} onChange={(e) => setReportType(e.target.value)}>
                <option value="subject_marks_with_internal_2021">Subject Marks List (With Internal Marks)</option>
                <option value="subject_marks_without_internal_2021">Subject Marks List (Without Internal Marks)</option>
                <option value="subject_analysis">Subject Analysis Report (NAC/TLP-07a.21)</option>
                {(user?.role === 'hod' || user?.role === 'admin' || user?.isClassCoordinator || isPrincipal) && (
                  <>
                    <option value="class_analysis">Class Performance Report (NAC/TLP-20)</option>
                    <option value="consolidated_statement">Consolidated Mark Statement (NAC/TLP-07a.20)</option>
                    <option value="examcell_legal_with_internal">ExamCell Legal Statement (With Internal Marks)</option>
                    <option value="examcell_legal_without_internal">ExamCell Legal Statement (Without Internal Marks)</option>
                  </>
                )}
              </select>
              <button className={styles.downloadBtn} onClick={handleDownloadPDF}>
                <Download size={15} /> Download PDF Statement
              </button>
            </div>
            {!isPrincipal && (
              <>
                <button className={styles.clearBtn} onClick={handleReset} disabled={isLocked}>
                  <RotateCcw size={15} /> Clear Marks
                </button>
                <button
                  className={styles.saveBtn}
                  onClick={() => handleSave('draft')}
                  disabled={saving || (!isDirty && !isComponentsDirty) || isLocked}
                  style={{ background: 'var(--surface)', color: 'var(--primary)', border: '1px solid var(--primary)' }}
                >
                  {saving ? <><Loader size={15} className={styles.spinner} /> Saving…</> : <><Save size={15} /> Save Draft</>}
                </button>
                <button
                  className={styles.saveBtn}
                  onClick={() => {
                    if (window.confirm('Freeze these marks? You will need HOD approval to edit further.')) {
                      handleSave('frozen');
                    }
                  }}
                  disabled={saving || isLocked}
                  style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}
                >
                  {saving ? <><Loader size={15} className={styles.spinner} /> Freezing…</> : <><Lock size={15} /> Freeze Marks</>}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {selectedSubject && assessmentComponents.length === 0 && !isPrincipal && (
        <div className={styles.promptBox}>
          <p>👆 Add at least one assessment component above to start entering marks.</p>
        </div>
      )}

      {/* Unlock Modal */}
      {showUnlockModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h3><Key size={18} /> Request Edit Permission from HOD</h3>
            <p>Please enter the reason why you need to modify the locked marks for <strong>{selectedSubject?.name}</strong>:</p>
            <textarea
              className={styles.modalTextarea}
              placeholder="e.g. Correction needed in Assignment 2 marks..."
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
            />
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setShowUnlockModal(false)}>Cancel</button>
              <button className={styles.modalSubmitBtn} onClick={handleRequestUnlock} disabled={submittingUnlock || !unlockReason.trim()}>
                {submittingUnlock ? 'Submitting…' : 'Submit Request to HOD'}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeclarationModal 
        isOpen={declarationModalOpen} 
        onClose={() => setDeclarationModalOpen(false)} 
        onSubmit={handleGenerateSubjectPDF}
        session={currentSession}
      />
    </div>
  );
}
