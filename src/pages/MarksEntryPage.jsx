import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import DeclarationModal from '../components/Reports/DeclarationModal';
import ReportPreviewModal from '../components/Common/ReportPreviewModal';
import { 
  exportSubjectMarksExcel, 
  exportLaboratoryMarksExcel, 
  exportOverallMarksExcel, 
  exportSubjectAnalysisExcel, 
  exportConsolidatedMarksExcel, 
  exportClassAnalysisExcel 
} from '../services/excelReportGenerator';
import { Save, RotateCcw, Download, AlertTriangle, CheckCircle, CheckCircle2, Loader, Lock, Key, Clock, UserCheck } from 'lucide-react';
import styles from './MarksEntryPage.module.css';

export default function MarksEntryPage() {
  const { user } = useAuth();
  const {
    activeRegulation,
    selectedClassId, selectedSubjectId,
    marksData, attendanceData, attendanceMarks, internalExamData, labData, totalHours, isDirty,
    setRegulation, setClass, setSubject, setClassAndSubject, setMark, setAttendance, setInternalExam, setLabData, setTotalHours, setSessionBulk, markSaved, clearMarks, clearSelection,
  } = useMarks();

  const isCorrectReg = activeRegulation === '2025';
  const effectiveClassId = isCorrectReg ? selectedClassId : '';
  const effectiveSubjectId = isCorrectReg ? selectedSubjectId : '';

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setRegulation('2025');
    const searchParams = new URLSearchParams(location.search);
    const targetClassId = location.state?.classId || location.state?.class_id || searchParams.get('classId') || searchParams.get('class_id');
    const targetSubjectId = location.state?.subjectId || location.state?.subject_id || searchParams.get('subjectId') || searchParams.get('subject_id');
    const targetSession = location.state?.sessionLabel || location.state?.session_label || searchParams.get('session') || searchParams.get('sessionLabel');

    if (targetClassId && targetSubjectId) {
      setClassAndSubject(targetClassId, targetSubjectId);
    } else if (targetClassId) {
      setClass(targetClassId);
    }
    if (targetSession) {
      setAssessmentMode(targetSession);
    }
  }, [location.state, location.search]);

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
  const [reportType, setReportType] = useState('subject_analysis');
  const [int1AttendanceData, setInt1AttendanceData] = useState({});

  // Lock / Unlock Request State
  const [currentSession, setCurrentSession] = useState(null);
  const [remedialAction, setRemedialAction] = useState('');
  const [sessionStatus, setSessionStatus] = useState('draft'); // draft | locked | unlock_requested | unlocked
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [declarationModalOpen, setDeclarationModalOpen] = useState(false);
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);
  const [pdfPayload, setPdfPayload] = useState(null);
  const [submittingUnlock, setSubmittingUnlock] = useState(false);

  // ── Load classes on mount (2025 Regulation: I Year & II Year Autonomous classes, filtered by role) ────
  useEffect(() => {
    classesAPI.getAll()
      .then(allClasses => {
        let filtered = allClasses.filter(c =>
          c.year_label === 'I' ||
          c.year_label === 'II' ||
          c.year_label === '1' ||
          c.year_label === '2' ||
          parseInt(c.semester) === 1 ||
          parseInt(c.semester) === 2 ||
          parseInt(c.semester) === 3 ||
          parseInt(c.semester) === 4
        );

        if (user?.role === 'principal' || user?.role === 'vice_principal' || user?.role === 'admin') {
          // All 1st & 2nd year classes
        } else if (user?.role === 'hod') {
          const teachIds = (user?.teachingClasses || []).map(c => c.id);
          filtered = filtered.filter(c => 
            c.department === user.department || 
            (c.department === 'Science and Humanities' && user.department !== 'Science and Humanities' && c.name?.toLowerCase().includes(user.department?.toLowerCase().split(' ')[0])) ||
            teachIds.includes(c.id)
          );
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
        const searchParams = new URLSearchParams(location.search);
        const targetClassId = location.state?.classId || location.state?.class_id || searchParams.get('classId') || searchParams.get('class_id');
        if (targetClassId) {
          const matchedTarget = allClasses.find(c => String(c.id) === String(targetClassId));
          if (matchedTarget && !filtered.some(c => String(c.id) === String(targetClassId))) {
            filtered.push(matchedTarget);
          }
        }

        const yearWeight = { 'IV': 1, 'III': 2, 'II': 3, 'I': 4 };
        filtered.sort((a, b) => {
          const wA = yearWeight[a.year_label] || (a.name?.includes('IV') ? 1 : a.name?.includes('III') ? 2 : a.name?.includes('II') ? 3 : 4);
          const wB = yearWeight[b.year_label] || (b.name?.includes('IV') ? 1 : b.name?.includes('III') ? 2 : b.name?.includes('II') ? 3 : 4);
          if (wA !== wB) return wA - wB;
          return (a.name || '').localeCompare(b.name || '');
        });

        setClasses(filtered);
      })
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, [user, location.state, location.search]);

  // Ensure stale 2021 classes are cleanly removed on regulation switch without refresh
  useEffect(() => {
    if (classes.length > 0 && effectiveClassId) {
      const isValid = classes.some(c => c.id === effectiveClassId);
      const searchParams = new URLSearchParams(location.search);
      const targetClassId = location.state?.classId || location.state?.class_id || searchParams.get('classId') || searchParams.get('class_id');
      if (!isValid && !targetClassId) {
        clearSelection();
      }
    }
  }, [classes, effectiveClassId, location.state, location.search]);

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

      // Restore target subject reliably from incoming state, query params, or existing selection
      const searchParams = new URLSearchParams(location.search);
      const targetSubId = location.state?.subjectId || location.state?.subject_id || searchParams.get('subjectId') || searchParams.get('subject_id') || effectiveSubjectId;
      if (targetSubId) {
        const matched = allSubs.find(s => String(s.id) === String(targetSubId));
        if (matched && !visibleSubs.some(s => String(s.id) === String(targetSubId))) {
          visibleSubs.push(matched);
        }
      }

      setSubjects(visibleSubs);

      if (targetSubId && visibleSubs.some(s => String(s.id) === String(targetSubId))) {
        if (String(targetSubId) !== String(selectedSubjectId)) {
          setSubject(targetSubId);
        }
      }
    }).catch(() => setSubjects([]));
  }, [effectiveClassId, user, location.state, location.search, selectedSubjectId]);

  // ── Load students when class changes ──────────────────
  useEffect(() => {
    if (!effectiveClassId) { setStudents([]); return; }
    studentsAPI.getByClass(effectiveClassId).then(setStudents).catch(() => setStudents([]));
  }, [effectiveClassId]);

  // ── Load existing session when subject or mode changes ────────
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

    const fetchInt1Promise = (assessmentMode === 'internal2')
      ? marksAPI.getSessions({ classId: effectiveClassId, subjectId: effectiveSubjectId, sessionLabel: 'internal1' })
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

        return marksAPI.getSessions({ classId: effectiveClassId, subjectId: effectiveSubjectId, sessionLabel: assessmentMode })
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
                attendanceMarks: detail.attendanceMarks || {},
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
              setSessionBulk({ marks: {}, attendance: {}, internalExam: {}, labData: {}, totalHours: 0 });
              setRemedialAction('');
              setSaved(false);
              setIsComponentsDirty(false);
              
              const activeSub = subjects.find(s => s.id === effectiveSubjectId);
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
  }, [effectiveClassId, effectiveSubjectId, user?.id, subjects, assessmentMode]);

  const selectedClass   = classes.find((c) => c.id === effectiveClassId);
  const selectedSubject = subjects.find((s) => s.id === effectiveSubjectId);
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

  const defaultSplits = selectedSubject ? getHourSplits(selectedSubject.ltpc, selectedSubject.type, totalHours) : { int1: 30, int2: 30, lab: 0 };
  const int1Hours = (selectedSubject?.int1_hours !== null && selectedSubject?.int1_hours !== undefined && selectedSubject?.int1_hours !== '')
    ? parseInt(selectedSubject.int1_hours, 10)
    : (defaultSplits.int1 || 30);
  const int2Hours = (selectedSubject?.int2_hours !== null && selectedSubject?.int2_hours !== undefined && selectedSubject?.int2_hours !== '')
    ? parseInt(selectedSubject.int2_hours, 10)
    : (defaultSplits.int2 || 30);
  const labHours  = (selectedSubject?.lab_hours !== null && selectedSubject?.lab_hours !== undefined && selectedSubject?.lab_hours !== '')
    ? parseInt(selectedSubject.lab_hours, 10)
    : (defaultSplits.lab || 0);

  const [liveSaveStatus, setLiveSaveStatus] = useState(''); // 'saving', 'saved', 'error', ''
  const autoSaveTimerRef = useRef(null);

  // Debounced Real-Time Auto-Save
  useEffect(() => {
    if (!isDirty || isLocked || !effectiveClassId || !effectiveSubjectId || assessmentComponents.length === 0 || students.length === 0) {
      return;
    }

    setLiveSaveStatus('saving');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await handleSave('draft', true);
        setLiveSaveStatus('saved');
        setTimeout(() => setLiveSaveStatus(''), 2500);
      } catch (err) {
        console.error('Real-time auto-save error:', err);
        setLiveSaveStatus('error');
      }
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [marksData, attendanceData, internalExamData, labData, totalHours, remedialAction, isDirty]);

  const handleSave = async (actionType = 'draft', isAutoSave = false) => {
    if (!isAutoSave) setSaving(true);
    setSaveErr('');
    try {
      const marksPayload = [];
      students.forEach((st) => {
        const m = marksData[st.id] || {};
        assessmentComponents.forEach((comp, idx) => {
          const val = m[comp.uid];
          marksPayload.push({
            studentId:       st.id,
            componentIndex:  idx,
            marksObtained:   (val !== undefined && val !== '' && !isNaN(parseFloat(val))) ? parseFloat(val) : null,
          });
        });
      });

      const attendancePayload = students.map(st => ({
        studentId: st.id,
        hoursAttended: attendanceData[st.id] !== undefined && attendanceData[st.id] !== '' ? parseInt(attendanceData[st.id], 10) || 0 : 0,
        actualTakenHours: attendanceData[st.id] !== undefined && attendanceData[st.id] !== '' ? parseInt(attendanceData[st.id], 10) || 0 : 0,
        int1AttendanceHours: int1AttendanceData[st.id] !== undefined && int1AttendanceData[st.id] !== '' ? parseInt(int1AttendanceData[st.id], 10) || 0 : 0,
        internalExamMark: internalExamData[st.id] || '',
        labAttendance: (labData[st.id] && labData[st.id].labAttendance) || 0,
        labMark: (labData[st.id] && labData[st.id].labMark) || ''
      }));

      const currentAssessmentHours = (assessmentMode === 'internal1' ? int1Hours : int2Hours) || parseInt(totalHours, 10) || 30;
      const payload = {
        subjectId:     effectiveSubjectId,
        classId:       effectiveClassId,
        staffId:       user.id,
        sessionLabel:  assessmentMode,
        totalHours:    parseInt(currentAssessmentHours, 10),
        int1Hours:     parseInt(int1Hours || 0, 10),
        int2Hours:     parseInt(int2Hours || 0, 10),
        labHours:      parseInt(labHours || 0, 10),
        remedialAction: remedialAction,
        components:    assessmentComponents.map((c) => ({
          typeId:   c.typeId,
          label:    c.label,
          conductedMax: parseFloat(c.conductedMax) || 100,
          maxMarks: parseFloat(c.max) || 0,
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
        try {
          const freshDetail = await marksAPI.getSessionDetail(res.sessionId);
          if (freshDetail && freshDetail.components) {
            const reloadedComps = freshDetail.components.map((c) => ({
              uid: c.id,
              typeId: c.type_id,
              label: c.label,
              conductedMax: parseFloat(c.conducted_max) || 100,
              max: parseFloat(c.max_marks),
              icon: c.icon,
              color: c.color,
            }));
            setAssessmentComponents(reloadedComps);

            const reloadedMarks = {};
            freshDetail.marks.forEach(m => {
              if (!reloadedMarks[m.student_id]) reloadedMarks[m.student_id] = {};
              reloadedMarks[m.student_id][m.component_id] = parseFloat(m.marks_obtained);
            });
            setSessionBulk({
              marks: reloadedMarks,
              attendance: freshDetail.attendance || {},
              attendanceMarks: freshDetail.attendanceMarks || {},
              internalExam: freshDetail.internalExam || {},
              labData: freshDetail.labData || {},
              totalHours: freshDetail.session?.total_hours || 0
            });
          }
        } catch (detailErr) {
          console.warn('Post-save refresh detail notice:', detailErr);
        }
      }

      markSaved();
      setSaved(true);
      setSessionStatus(actionType === 'frozen' ? 'locked' : 'draft');
      setIsComponentsDirty(false);
      if (actionType === 'frozen') {
        alert('Marks have been frozen and locked successfully.');
      }
    } catch (err) {
      setSaveErr(err.message || 'Failed to save marks.');
      if (isAutoSave) throw err;
    } finally {
      if (!isAutoSave) setSaving(false);
    }
  };

  const handleReset = async () => { 
    if (!window.confirm('Are you sure you want to completely clear all marks for this subject? This will permanently delete any saved or fake marks in the database and give you a fresh, clean sheet.')) {
      return;
    }
    setSaving(true);
    try {
      await marksAPI.resetSession({
        classId: effectiveClassId,
        subjectId: effectiveSubjectId,
        sessionLabel: assessmentMode,
        sessionId: currentSession?.id,
        staffId: user?.id || currentSession?.staff_id || 'staff'
      });
      clearMarks(); 
      setCurrentSession(null);
      setAssessmentComponents([]);
      setSessionStatus('draft');
      setSaved(false); 
      setSaveErr(''); 
      setIsComponentsDirty(false);
      if (selectedSubject && selectedSubject.total_hours) {
        setTotalHours(selectedSubject.total_hours);
      } else {
        setTotalHours('');
      }
      alert('Marks have been completely cleared and reset in the database.');
    } catch (err) {
      alert('Failed to reset marks: ' + (err.message || 'Server error'));
    } finally {
      setSaving(false);
    }
  };

  // Submit Unlock Request to HOD
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

  // All PDF/Excel generation opens full-screen preview first
  const handleDownloadPDF = async () => {
    if (!selectedClass || !selectedSubject) return;
    setReportPreviewOpen(true);
  };

  const handleGenerateSubjectPDF = async (declarationData) => {
    setDeclarationModalOpen(false);
    try {
      await generateSubjectAnalysisPDF({
        ...pdfPayload,
        marksData: pdfPayload.allMarks, // Because pdfReportGenerator uses marksData (although we'll also pass allMarks)
        declarationData,
        user
      });
    } catch (err) {
      alert('Failed to generate Subject Analysis PDF: ' + err.message);
    } finally {
      setPdfPayload(null);
    }
  };

  const executeSubjectPDF = async (options = {}) => {
    try {
      if (reportType === 'lab_marks_only') {
        const { generateLaboratoryMarksOnlyPDF } = await import('../services/pdfReportGenerator');
        await generateLaboratoryMarksOnlyPDF({
          subject: selectedSubject,
          classObj: selectedClass,
          staff: { name: currentSession?.staff_name || selectedSubject?.faculty_name || selectedSubject?.staff_name || user?.name || 'Faculty Staff' },
          session: currentSession,
          students,
          attendanceData,
          labData,
          internalExamData,
          totalHours,
          labHours,
          assessmentMode,
          targetPages: options?.targetPages || 'auto',
          user
        });
        return;
      }

      if (reportType === 'subject_analysis') {
        const { generateSubjectAnalysisPDF } = await import('../services/pdfReportGenerator');
        await generateSubjectAnalysisPDF({
          subject: selectedSubject,
          classObj: selectedClass,
          staff: { name: currentSession?.staff_name || selectedSubject?.faculty_name || selectedSubject?.staff_name || user?.name || 'Faculty Staff' },
          session: currentSession,
          remedialAction,
          students,
          allMarks: marksData,
          marksData,
          components: assessmentComponents,
          attendanceData,
          internalExamData,
          labData,
          assessmentMode,
          user
        });
        return;
      }

      if (reportType === 'examcell_legal_with_internal' || reportType === 'examcell_legal_without_internal') {
        const withInternal = reportType === 'examcell_legal_with_internal';
        const summary = await marksAPI.getClassSummary(effectiveClassId, assessmentMode);
        const { generateOverallMarksAndAttendancePDF } = await import('../services/pdfReportGenerator');
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
          inchargeNameParam: user?.isClassCoordinator ? user?.name : '',
          user
        });
        return;
      }

      if (reportType === 'class_analysis') {
        const summary = await marksAPI.getClassSummary(effectiveClassId, assessmentMode);
        const { generateClassAnalysisPDF } = await import('../services/pdfReportGenerator');
        await generateClassAnalysisPDF({
          classObj: selectedClass,
          sessionLabel: assessmentMode,
          subjects: summary.subjects || subjects,
          students,
          allSessions: summary.sessions || [],
          allMarks: summary.allMarks || [],
          allAttendance: summary.allAttendance || [],
          inchargeNameParam: user?.isClassCoordinator ? user?.name : '',
          user
        });
        return;
      }

      if (reportType === 'consolidated_statement') {
        const summary = await marksAPI.getClassSummary(effectiveClassId, assessmentMode);
        const { generateConsolidatedMarksPDF } = await import('../services/pdfReportGenerator');
        await generateConsolidatedMarksPDF({
          classObj: selectedClass,
          sessionLabel: assessmentMode,
          subjects: summary.subjects || subjects,
          students,
          allSessions: summary.sessions || [],
          allAttendance: summary.allAttendance || [],
          allMarks: summary.allMarks || [],
          allComponents: summary.allComponents || [],
          inchargeNameParam: user?.isClassCoordinator ? user?.name : '',
          user
        });
        return;
      }

      const withInternal = reportType !== 'subject_marks_without_internal';
      const { generateSubjectMarksListPDF } = await import('../services/pdfReportGenerator');
      await generateSubjectMarksListPDF({
        subject: selectedSubject,
        classObj: selectedClass,
        staff: { name: currentSession?.staff_name || selectedSubject?.faculty_name || selectedSubject?.staff_name || user?.name || 'Faculty Staff' },
        session: currentSession,
        students,
        marksData,
        attendanceData,
        attendanceMarks,
        internalExamData,
        labData,
        assessmentMode,
        components: assessmentComponents,
        totalHours,
        int1Hours,
        int2Hours,
        labHours,
        int1AttendanceData,
        withInternal,
        targetPages: options?.targetPages || 'auto',
        user
      });
    } catch (e) {
      alert('Failed to generate PDF: ' + e.message);
    }
  };

  const executeSubjectExcel = async (options = {}) => {
    try {
      if (reportType === 'lab_marks_only') {
        await exportLaboratoryMarksExcel({
          subject: selectedSubject,
          classObj: selectedClass,
          staff: { name: currentSession?.staff_name || selectedSubject?.faculty_name || selectedSubject?.staff_name || user?.name || 'Faculty Staff' },
          session: currentSession,
          students,
          attendanceData,
          labData,
          internalExamData,
          totalHours,
          labHours,
          assessmentMode,
          user
        });
        return;
      }

      if (reportType === 'subject_analysis') {
        await exportSubjectAnalysisExcel({
          subject: selectedSubject,
          classObj: selectedClass,
          staff: { name: currentSession?.staff_name || selectedSubject?.faculty_name || selectedSubject?.staff_name || user?.name || 'Faculty Staff' },
          session: currentSession,
          remedialAction,
          students,
          marksData,
          components: assessmentComponents,
          attendanceData,
          internalExamData,
          labData,
          assessmentMode,
          user
        });
        return;
      }

      if (reportType === 'class_analysis') {
        const summary = await marksAPI.getClassSummary(effectiveClassId, assessmentMode);
        await exportClassAnalysisExcel({
          classObj: selectedClass,
          sessionLabel: assessmentMode,
          subjects: summary.subjects || subjects,
          students,
          allSessions: summary.sessions || [],
          allMarks: summary.allMarks || [],
          allAttendance: summary.allAttendance || [],
          inchargeNameParam: user?.isClassCoordinator ? user?.name : '',
          user
        });
        return;
      }

      if (reportType === 'consolidated_statement') {
        const summary = await marksAPI.getClassSummary(effectiveClassId, assessmentMode);
        await exportConsolidatedMarksExcel({
          classObj: selectedClass,
          sessionLabel: assessmentMode,
          subjects: summary.subjects || subjects,
          students,
          allSessions: summary.sessions || [],
          allAttendance: summary.allAttendance || [],
          allMarks: summary.allMarks || [],
          allComponents: summary.allComponents || [],
          inchargeNameParam: user?.isClassCoordinator ? user?.name : '',
          user
        });
        return;
      }

      if (reportType === 'examcell_legal_with_internal' || reportType === 'examcell_legal_without_internal') {
        const withInternal = reportType === 'examcell_legal_with_internal';
        const summary = await marksAPI.getClassSummary(effectiveClassId, assessmentMode);
        await exportOverallMarksExcel({
          classObj: selectedClass,
          sessionLabel: assessmentMode,
          subjects: summary.subjects || subjects,
          students,
          allSessions: summary.sessions || [],
          allAttendance: summary.allAttendance || [],
          allMarks: summary.allMarks || [],
          allComponents: summary.allComponents || [],
          withInternal,
          user
        });
        return;
      }

      const withInternal = reportType !== 'subject_marks_without_internal';
      await exportSubjectMarksExcel({
        subject: selectedSubject,
        classObj: selectedClass,
        staff: { name: currentSession?.staff_name || selectedSubject?.faculty_name || selectedSubject?.staff_name || user?.name || 'Faculty Staff' },
        session: currentSession,
        students,
        marksData,
        attendanceData,
        attendanceMarks,
        internalExamData,
        labData,
        assessmentMode,
        components: assessmentComponents,
        totalHours,
        int1Hours,
        int2Hours,
        labHours,
        int1AttendanceData,
        withInternal,
        user
      });
    } catch (e) {
      alert('Failed to generate Excel: ' + e.message);
    }
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
        selectedClass={effectiveClassId}
        selectedSubject={effectiveSubjectId}
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

          {/* Enhanced Subject & Faculty Banner */}
          <div className={styles.subjectStrip}>
            <div className={styles.subjectInfoLeft}>
              <div className={styles.badgeRow}>
                <span className={styles.codeBadge}>{selectedSubject.code}</span>
                <span className={styles.typeBadge}>{selectedSubject.type || 'Theory'}</span>
                <span className={styles.regBadge}>Regulation 2025</span>
                {selectedSubject.ltpc && (
                  <span className={styles.ltpcBadge}>LTPC: {selectedSubject.ltpc}</span>
                )}
                {/* Auto-display Total Hours assigned via LTPC at top */}
                <span className={styles.totalHoursBadge} style={{
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  ⏱ Total Hours: <strong>{assessmentMode === 'internal1' ? int1Hours : int2Hours} hrs</strong>
                  {selectedSubject?.type?.includes('Lab') && labHours > 0 ? ` + ${labHours} Lab hrs` : ''}
                  <span style={{ opacity: 0.75, fontWeight: 500 }}>
                    ({selectedSubject?.total_hours || (int1Hours + int2Hours + labHours)} Course Hrs)
                  </span>
                </span>
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
            attendanceMarks={attendanceMarks}
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
            {liveSaveStatus === 'saving' && (
              <div className={styles.liveSaveIndicator}>
                <Loader size={14} className={styles.spinner} />
                Saving marks in real-time…
              </div>
            )}
            {liveSaveStatus === 'saved' && (
              <div className={`${styles.liveSaveIndicator} ${styles.liveSaveSuccess}`}>
                <CheckCircle2 size={14} color="#047857" />
                Real-time data saved &amp; synced!
              </div>
            )}
            {saved && !liveSaveStatus && !isPrincipal && (
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
            {(isDirty || isComponentsDirty) && !saved && !saveErr && !liveSaveStatus && !isPrincipal && (
              <div className={styles.dirtyMsg}>
                <AlertTriangle size={16} />
                Unsaved changes — auto-saving in real time…
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
                <option value="subject_marks_with_internal">Subject Marks List (With Assignment Marks)</option>
                <option value="subject_marks_without_internal">Subject Marks List (Without Assignment Marks)</option>
                {['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab', 'Practical', 'Laboratory'].includes(selectedSubject?.type) && (
                  <option value="lab_marks_only">🔬 Laboratory Marks Statement (Lab Marks & Attended Hrs Only)</option>
                )}
                <option value="subject_analysis">Subject Analysis Report (NAC/TLP-07a.21)</option>
                {(user?.role === 'hod' || user?.role === 'admin' || user?.isClassCoordinator || isPrincipal) && (
                  <>
                    <option value="class_analysis">Class Performance Report (NAC/TLP-20)</option>
                    <option value="consolidated_statement">Consolidated Mark Statement (NAC/TLP-07a.20)</option>
                    <option value="examcell_legal_with_internal">ExamCell Legal Statement (With Assignment Marks)</option>
                    <option value="examcell_legal_without_internal">ExamCell Legal Statement (Without Assignment Marks)</option>
                  </>
                )}
              </select>
              <button className={styles.downloadBtn} onClick={handleDownloadPDF}>
                <Download size={15} /> Download PDF Statement
              </button>
            </div>
            {!isPrincipal && (
              <>
                <button className={styles.clearBtn} onClick={handleReset} id="clear-marks-btn" disabled={isLocked && user?.role !== 'hod' && user?.role !== 'admin'}>
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

      <DeclarationModal 
        isOpen={declarationModalOpen} 
        onClose={() => setDeclarationModalOpen(false)} 
        onSubmit={handleGenerateSubjectPDF}
        session={currentSession}
      />

      <ReportPreviewModal
        isOpen={reportPreviewOpen}
        onClose={() => setReportPreviewOpen(false)}
        onDownloadPDF={(options) => {
          executeSubjectPDF(options);
          setReportPreviewOpen(false);
        }}
        onDownloadExcel={(options) => {
          executeSubjectExcel(options);
          setReportPreviewOpen(false);
        }}
        title={reportType === 'lab_marks_only'
          ? `Laboratory Marks Statement — ${selectedSubject?.code || ''} ${selectedSubject?.name || ''}`
          : `Report Preview — ${selectedSubject?.code || ''} ${selectedSubject?.name || ''}`}
        subject={selectedSubject}
        classObj={selectedClass}
        staff={{ name: currentSession?.staff_name || selectedSubject?.faculty_name || selectedSubject?.staff_name || user?.name || 'Faculty Staff' }}
        assessmentMode={assessmentMode}
        withInternal={reportType !== 'subject_marks_without_internal'}
        students={students}
        marksData={marksData}
        attendanceData={attendanceData}
        attendanceMarks={attendanceMarks}
        internalExamData={internalExamData}
        labData={labData}
        components={assessmentComponents}
        totalHours={totalHours}
        int1Hours={int1Hours}
        int2Hours={int2Hours}
        labHours={labHours}
        int1AttendanceData={int1AttendanceData}
        regulation="2025"
        reportType={reportType}
        isLabOnly={reportType === 'lab_marks_only'}
      />
    </div>
  );
}
