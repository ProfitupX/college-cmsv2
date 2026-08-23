import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMarks } from '../context/MarksContext';
import { classesAPI, subjectsAPI, studentsAPI, marksAPI } from '../services/api';
import ComponentBuilder from '../components/MarksEntry/ComponentBuilder';
import MarksTable from '../components/MarksEntry/MarksTable';
import ClassSubjectSelector from '../components/MarksEntry/ClassSubjectSelector';
import { 
  generateSubjectAnalysisPDF, 
  generateClassAnalysisPDF, 
  generateConsolidatedMarksPDF 
} from '../services/pdfReportGenerator';
import { Save, RotateCcw, Download, AlertTriangle, CheckCircle, Loader, Lock, Key, Clock } from 'lucide-react';
import styles from './MarksEntryPage.module.css';

export default function MarksEntryPage() {
  const { user } = useAuth();
  const {
    selectedClassId, selectedSubjectId,
    marksData, attendanceData, internalExamData, labData, totalHours, isDirty,
    setClass, setSubject, setMark, setAttendance, setInternalExam, setLabData, setTotalHours, setSessionBulk, markSaved, clearMarks,
  } = useMarks();

  // Remote data
  const [classes,   setClasses]   = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [students,  setStudents]  = useState([]);

  // UI & Lock state
  const [assessmentComponents, setAssessmentComponents] = useState([]);
  const [saved,   setSaved]   = useState(false);
  const [assessmentMode, setAssessmentMode] = useState('internal1');
  const [saving,  setSaving]  = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [isComponentsDirty, setIsComponentsDirty] = useState(false);
  const [reportType, setReportType] = useState('subject_marks_list');
  const [int1AttendanceData, setInt1AttendanceData] = useState({});

  // Lock / Unlock Request State
  const [currentSession, setCurrentSession] = useState(null);
  const [remedialAction, setRemedialAction] = useState('');
  const [sessionStatus, setSessionStatus] = useState('draft'); // draft | locked | unlock_requested | unlocked
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [submittingUnlock, setSubmittingUnlock] = useState(false);

  // ── Load classes on mount (2025 Regulation: 2nd Year classes only) ────
  useEffect(() => {
    classesAPI.getAll()
      .then(allClasses => {
        const filtered = allClasses.filter(c =>
          c.year_label === 'II' ||
          parseInt(c.semester) === 3 ||
          parseInt(c.semester) === 4
        );
        setClasses(filtered);
      })
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, []);

  // ── Load subjects when class changes (Role-Based Subject Filtering) ──
  useEffect(() => {
    if (!selectedClassId) { setSubjects([]); return; }
    subjectsAPI.getByClass(selectedClassId).then((allSubs) => {
      // If user is Staff (faculty) or Class Coordinator, filter to only assigned subjects unless HOD/Admin
      const isElevated = user?.role === 'hod' || user?.role === 'admin';
      if (!isElevated && user?.assignedSubjectIds?.length > 0) {
        setSubjects(allSubs.filter(s => user.assignedSubjectIds.includes(s.id)));
      } else {
        setSubjects(allSubs);
      }
    }).catch(() => setSubjects([]));
  }, [selectedClassId, user]);

  // ── Load students when class changes ──────────────────
  useEffect(() => {
    if (!selectedClassId) { setStudents([]); return; }
    studentsAPI.getByClass(selectedClassId).then(setStudents).catch(() => setStudents([]));
  }, [selectedClassId]);

  // ── Load existing session when subject or mode changes ────────
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId || !user?.id) return;
    
    setLoading(true);

    const fetchInt1Promise = (assessmentMode === 'internal2')
      ? marksAPI.getSessions({ classId: selectedClassId, subjectId: selectedSubjectId, sessionLabel: 'internal1' })
          .then((sessions) => {
            if (sessions.length > 0) return marksAPI.getSessionDetail(sessions[0].id);
            return null;
          })
          .then((detail) => (detail ? detail.attendance || {} : {}))
          .catch(() => ({}))
      : Promise.resolve({});

    fetchInt1Promise
      .then((int1Attd) => {
        setInt1AttendanceData(int1Attd);

        return marksAPI.getSessions({ classId: selectedClassId, subjectId: selectedSubjectId, sessionLabel: assessmentMode })
          .then((sessions) => {
            if (sessions.length > 0) {
              return marksAPI.getSessionDetail(sessions[0].id);
            }
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
                totalHours: detail.session.total_hours || 0
              });
              setRemedialAction(detail.session.remedial_action || '');
              setSaved(true);
              setIsComponentsDirty(false);
            } else {
              setCurrentSession(null);
              setSessionStatus('draft');
              setAssessmentComponents([]);
              setSessionBulk({ marks: {}, attendance: {}, internalExam: {}, totalHours: 0 });
              setRemedialAction('');
              setSaved(false);
              setIsComponentsDirty(false);
              
              const activeSub = subjects.find(s => s.id === selectedSubjectId);
              if (activeSub && activeSub.total_hours) {
                setTotalHours(activeSub.total_hours);
              } else {
                setTotalHours('');
              }
            }
          });
      })
      .catch((err) => console.error("Failed to load existing marks:", err))
      .finally(() => setLoading(false));
  }, [selectedClassId, selectedSubjectId, user?.id, subjects, assessmentMode]);

  const selectedClass   = classes.find((c) => c.id === selectedClassId);
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const totalMax        = assessmentComponents.reduce((s, c) => s + (parseFloat(c.max) || 0), 0);

  // Split hours based on LTPC total and subject type
  const getHourSplits = (ltpc, type, total) => {
    const cleanLtpc = (ltpc || '').trim().replace(/-/g, '');
    const h = parseInt(total || 0);

    if (type === 'Lab-cum-Theory' || type === 'Theory-cum-Lab') {
      if (cleanLtpc === '2023') return { int1: 15, int2: 15, lab: 30 };
      if (cleanLtpc === '2043') return { int1: 15, int2: 15, lab: 60 };
      if (cleanLtpc === '1022') return { int1: 15, int2: 15, lab: 15 };
      if (cleanLtpc === '3024') return { int1: 30, int2: 30, lab: 15 };
      if (cleanLtpc === '3045') return { int1: 30, int2: 30, lab: 45 };
      if (cleanLtpc === '1021') return { int1: 15, int2: 15, lab: 15 };
      return { int1: 15, int2: 15, lab: Math.max(0, h - 30) };
    }

    if (type === 'Theory') {
      if (cleanLtpc === '3104' || cleanLtpc === '3004') return { int1: 30, int2: 30, lab: 0 };
      if (cleanLtpc === '1001') return { int1: 7, int2: 8, lab: 0 };
      if (cleanLtpc === '3003' || cleanLtpc === '2103') return { int1: 25, int2: 20, lab: 0 };
      if (cleanLtpc === '2002') return { int1: 15, int2: 15, lab: 0 };
    }

    if (type === 'Practical') {
      if (cleanLtpc === '0042') return { int1: 30, int2: 30, lab: 0 };
      if (cleanLtpc === '1021') return { int1: 25, int2: 20, lab: 0 };
      if (cleanLtpc === '0041') return { int1: 30, int2: 30, lab: 0 };
    }

    if (!h) return { int1: 0, int2: 0, lab: 0 };
    if (h === 60) return { int1: 30, int2: 30, lab: 0 };
    if (h === 45) return { int1: 25, int2: 20, lab: 0 };
    if (h === 30) return { int1: 15, int2: 15, lab: 0 };
    if (h === 15) return { int1: 7, int2: 8, lab: 0 };
    return { int1: Math.ceil(h / 2), int2: Math.floor(h / 2), lab: 0 };
  };

  const hourSplits = selectedSubject ? getHourSplits(selectedSubject.ltpc, selectedSubject.type, totalHours) : { int1: 0, int2: 0, lab: 0 };
  const int1Hours = hourSplits.int1;
  const int2Hours = hourSplits.int2;
  const labHours  = hourSplits.lab;

  const handleSave = async (actionType = 'draft') => {
    setSaving(true);
    setSaveErr('');
    try {
      const marksPayload = [];
      students.forEach((st) => {
        const m = marksData[st.id] || {};
        assessmentComponents.forEach((comp, idx) => {
          marksPayload.push({
            studentId:       st.id,
            componentIndex:  idx,
            marksObtained:   parseFloat(m[comp.uid]) || 0,
          });
        });
      });

      const attendancePayload = students.map(st => ({
        studentId: st.id,
        hoursAttended: attendanceData[st.id] || 0,
        internalExamMark: internalExamData[st.id] || '',
        labAttendance: (labData[st.id] && labData[st.id].labAttendance) || 0,
        labMark: (labData[st.id] && labData[st.id].labMark) || ''
      }));

      const payload = {
        subjectId:     selectedSubjectId,
        classId:       selectedClassId,
        staffId:       user.id,
        sessionLabel:  assessmentMode,
        totalHours:    totalHours || 0,
        remedialAction: remedialAction,
        components:    assessmentComponents.map((c) => ({
          typeId:   c.typeId,
          label:    c.label,
          conductedMax: c.conductedMax || 100,
          maxMarks: c.max,
          icon:     c.icon,
          color:    c.color,
        })),
        marks: marksPayload,
        attendance: attendancePayload,
        actionType,
        remedialAction
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
    if (selectedSubject && selectedSubject.total_hours) {
      setTotalHours(selectedSubject.total_hours);
    } else {
      setTotalHours('');
    }
    setAssessmentMode('internal1');
  };

  // Submit Unlock Request to HOD
  const handleRequestUnlock = async () => {
    if (!currentSession?.id) return;
    setSubmittingUnlock(true);
    try {
      await marksAPI.requestUnlock({
        sessionId: currentSession.id,
        subjectId: selectedSubjectId,
        classId: selectedClassId,
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

  // Instant unlock for HOD/Admin
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

  // Official PDF Generation
  const handleDownloadPDF = async () => {
    if (!selectedClass || !selectedSubject) return;

    if (reportType === 'subject_analysis') {
      await generateSubjectAnalysisPDF({
        subject: selectedSubject,
        classObj: selectedClass,
        staff: user,
        session: currentSession,
        remedialAction, // Pass state
        students,
        marksData,
        attendanceData,
        internalExamData,
        labData,
        assessmentMode
      });
    } else if (reportType === 'subject_marks_list') {
      const { generateSubjectMarksListPDF } = await import('../services/pdfReportGenerator');
      await generateSubjectMarksListPDF({
        subject: selectedSubject,
        classObj: selectedClass,
        staff: user,
        session: currentSession,
        students,
        marksData,
        attendanceData,
        internalExamData,
        labData,
        assessmentMode,
        components: assessmentComponents,
        int1Hours,
        int2Hours,
        labHours,
        int1AttendanceData
      });
    } else if (reportType === 'class_analysis') {
      const summary = await marksAPI.getClassSummary(selectedClassId, assessmentMode);
      await generateClassAnalysisPDF({
        classObj: selectedClass,
        sessionLabel: assessmentMode,
        subjects: summary.subjects || subjects,
        students,
        allSessions: summary.sessions || [],
        allMarks: summary.allMarks || [],
        allAttendance: summary.allAttendance || []
      });
    } else if (reportType === 'consolidated_statement') {
      const summary = await marksAPI.getClassSummary(selectedClassId, assessmentMode);
      await generateConsolidatedMarksPDF({
        classObj: selectedClass,
        sessionLabel: assessmentMode,
        subjects: summary.subjects || subjects,
        students,
        allSessions: summary.sessions || [],
        allAttendance: summary.allAttendance || []
      });
    }
  };

  const handleClassChange = (val) => {
    setClass(val); setAssessmentComponents([]); setSaved(false); setSaveErr('');
  };
  const handleSubjectChange = (val) => {
    setSubject(val); setAssessmentComponents([]); setSaved(false); setSaveErr('');
  };

  const step = !selectedSubject ? 1 : assessmentComponents.length === 0 ? 2 : 3;
  const isPrincipal = user?.role === 'principal' || user?.role === 'vice_principal';
  const isLocked = isPrincipal || ((sessionStatus === 'locked' || sessionStatus === 'unlock_requested') && user?.role !== 'hod' && user?.role !== 'admin');
  const canEnterMarks = isPrincipal ? true : assessmentComponents.length > 0;

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Loader size={28} className={styles.spinner} />
        <p>Loading class & session data from database…</p>
      </div>
    );
  }

  return (
    <div>
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
        selectedClass={selectedClassId}
        selectedSubject={selectedSubjectId}
        onClassChange={handleClassChange}
        onSubjectChange={handleSubjectChange}
      />

      {selectedSubject && (
        <>
          {/* Lock / Unlock Banner (Hidden for Principal/VP) */}
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

          <div className={styles.subjectStrip}>
            <div>
              <h3>{selectedSubject.name}</h3>
              <p>{selectedSubject.code} · {selectedClass?.name} {selectedSubject.ltpc ? `· LTPC: ${selectedSubject.ltpc}` : ''}</p>
            </div>
            
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
          </div>
          {!isPrincipal && (
            <ComponentBuilder
              components={assessmentComponents}
              onChange={(comps) => { setAssessmentComponents(comps); setSaved(false); setIsComponentsDirty(true); }}
              isLocked={isLocked}
            />
          )}
        </>
      )}

      {canEnterMarks && students.length > 0 && (
        <>
          <MarksTable
            students={students}
            components={assessmentComponents}
            marksData={marksData}
            attendanceData={attendanceData}
            int1AttendanceData={int1AttendanceData}
            internalExamData={internalExamData}
            labData={labData}
            totalHours={totalHours}
            int1Hours={int1Hours}
            int2Hours={int2Hours}
            labHours={labHours}
            assessmentMode={assessmentMode}
            selectedSubject={selectedSubject}
            onMarkChange={setMark}
            onAttendanceChange={setAttendance}
            onInternalExamChange={setInternalExam}
            onLabDataChange={setLabData}
            onTotalHoursChange={(val) => { setTotalHours(val); setSaved(false); }}
            isLocked={isLocked}
          />

          {!isPrincipal && (
            <div style={{ marginTop: '24px', background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-solid)' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '1rem', color: 'var(--text-primary)' }}>Manual Remarks & Improvement Plan (NAC/TLP-07a.21)</h4>
              <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Provide qualitative inputs, remarks, or a remedial action plan for this assessment. This will be included in the Subject Analysis Report.
              </p>
              <textarea
                value={remedialAction}
                onChange={(e) => { setRemedialAction(e.target.value); setSaved(false); setIsDirty(true); }}
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

      {/* Action Bar (always visible if a subject is selected) */}
      {selectedSubject && (
        <div className={styles.actionBar}>
          <div className={styles.actionLeft}>
            {saved && !isPrincipal && (
              <div className={styles.savedMsg}>
                <CheckCircle size={16} />
                Marks saved to database!
              </div>
            )}
            {saveErr && !isPrincipal && (
              <div className={styles.errorMsg}>
                <AlertTriangle size={16} />
                {saveErr}
              </div>
            )}
            {(isDirty || isComponentsDirty) && !saved && !saveErr && !isPrincipal && (
              <div className={styles.dirtyMsg}>
                <AlertTriangle size={16} />
                Unsaved changes — don't forget to submit
              </div>
            )}
          </div>
          <div className={styles.actionRight}>
            <div className={styles.downloadGroup}>
              <select 
                className={styles.downloadSelect}
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="subject_marks_list">Subject Marks List</option>
                <option value="subject_analysis">Subject Analysis Report (NAC/TLP-07a.21)</option>
                {(user?.role === 'hod' || user?.role === 'admin' || user?.isClassCoordinator || isPrincipal) && (
                  <>
                    <option value="class_analysis">Class Performance Report (NAC/TLP-20)</option>
                    <option value="consolidated_statement">Consolidated Mark Statement (NAC/TLP-07a.20)</option>
                  </>
                )}
              </select>
              <button className={styles.downloadBtn} onClick={handleDownloadPDF}>
                <Download size={15} /> Download PDF Statement
              </button>
            </div>
            {!isPrincipal && (
              <>
                <button className={styles.clearBtn} onClick={handleReset} id="clear-marks-btn" disabled={isLocked}>
                  <RotateCcw size={15} /> Clear Marks
                </button>
                <button
                  className={styles.saveBtn}
                  onClick={() => handleSave('draft')}
                  disabled={saving || (!isDirty && !isComponentsDirty) || isLocked}
                  id="save-marks-btn"
                  style={{ background: 'var(--surface)', color: 'var(--primary)', border: '1px solid var(--primary)' }}
                >
                  {saving
                    ? <><Loader size={15} className={styles.spinner} /> Saving…</>
                    : <><Save size={15} /> Save Draft</>
                  }
                </button>
                <button
                  className={styles.saveBtn}
                  onClick={() => {
                    if(window.confirm('Are you sure you want to freeze these marks? You will not be able to edit them further without HOD approval.')) {
                      handleSave('frozen');
                    }
                  }}
                  disabled={saving || isLocked}
                  id="freeze-marks-btn"
                  style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}
                >
                  {saving
                    ? <><Loader size={15} className={styles.spinner} /> Freezing…</>
                    : <><Lock size={15} /> Freeze Marks</>
                  }
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

      {/* Unlock Request Modal */}
      {showUnlockModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h3><Key size={18} /> Request Edit Permission from HOD</h3>
            <p>Please enter the reason why you need to modify the locked marks for <strong>{selectedSubject?.name}</strong>:</p>
            <textarea
              className={styles.modalTextarea}
              placeholder="e.g. Correction needed in Assignment 2 marks for Reg.No 921025205001..."
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
    </div>
  );
}
