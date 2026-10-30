import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMarks } from '../context/MarksContext';
import { classesAPI, subjectsAPI, studentsAPI, marksAPI, settingsAPI } from '../services/api';
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
import ReportPreviewModal from '../components/Common/ReportPreviewModal';
import { 
  exportSubjectMarksExcel, 
  exportLaboratoryMarksExcel, 
  exportOverallMarksExcel, 
  exportSubjectAnalysisExcel, 
  exportConsolidatedMarksExcel, 
  exportClassAnalysisExcel 
} from '../services/excelReportGenerator';
import { Save, RotateCcw, Download, AlertTriangle, CheckCircle, CheckCircle2, Loader, Lock, Key, Clock, FileText, UserCheck } from 'lucide-react';
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
    setRegulation, setSelectionWithRegulation, setClass, setSubject, setClassAndSubject, setMark, setAttendance, setInternalExam, setLabData, setTotalHours, setSessionBulk, markSaved, clearMarks, clearSelection,
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
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);
  const [pdfPayload, setPdfPayload] = useState(null);
  const [liveSaveStatus, setLiveSaveStatus] = useState(''); // 'saving', 'saved', 'error', ''
  const autoSaveTimerRef = useRef(null);

  const location = useLocation();

  // ── Handle incoming navigation state ────────────────────────
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const rawClassId = location.state?.classId || location.state?.class_id || searchParams.get('classId') || searchParams.get('class_id') || sessionStorage.getItem('last_classId_2021');
    const rawSubjectId = location.state?.subjectId || location.state?.subject_id || searchParams.get('subjectId') || searchParams.get('subject_id') || sessionStorage.getItem('last_subjectId_2021');
    const targetSession = location.state?.sessionLabel || location.state?.session_label || searchParams.get('session') || searchParams.get('sessionLabel') || sessionStorage.getItem('last_session_2021');

    const targetClassId = (rawClassId && rawClassId !== 'undefined' && rawClassId !== 'null') ? String(rawClassId) : '';
    const targetSubjectId = (rawSubjectId && rawSubjectId !== 'undefined' && rawSubjectId !== 'null') ? String(rawSubjectId) : '';

    if (targetClassId && targetSubjectId) {
      if (setSelectionWithRegulation) {
        setSelectionWithRegulation({ regulation: '2021', classId: targetClassId, subjectId: targetSubjectId });
      } else {
        setRegulation('2021');
        setClassAndSubject(targetClassId, targetSubjectId);
      }
    } else {
      setRegulation('2021');
      if (targetClassId) setClass(targetClassId);
      if (targetSubjectId) setSubject(targetSubjectId);
    }
    if (targetSession) {
      setAssessmentMode(targetSession);
    }
  }, [location.state, location.search]);

  // Sync active selection to sessionStorage so reload/F5 preserves state
  useEffect(() => {
    if (effectiveClassId) {
      sessionStorage.setItem('last_classId_2021', String(effectiveClassId));
    }
    if (effectiveSubjectId) {
      sessionStorage.setItem('last_subjectId_2021', String(effectiveSubjectId));
    }
    if (assessmentMode) {
      sessionStorage.setItem('last_session_2021', assessmentMode);
    }
  }, [effectiveClassId, effectiveSubjectId, assessmentMode]);

  // ── Load classes on mount — filter to 3rd/4th year only, restricted by user role ────
  useEffect(() => {
    classesAPI.getAll()
      .then(allClasses => {
        const classList = Array.isArray(allClasses) ? allClasses.filter(Boolean) : [];
        // 2021 Regulation: only show III and IV year classes (semester 5,6,7,8)
        let filtered = classList.filter(c =>
          c && (
            c.year_label === 'III' || c.year_label === 'IV' ||
            c.year_label === '3' || c.year_label === '4' ||
            parseInt(c.semester) >= 5
          )
        );

        if (user?.role === 'principal' || user?.role === 'vice_principal' || user?.role === 'admin') {
          // All 3rd/4th year classes
        } else if (user?.role === 'hod') {
          const teachIds = (user?.teachingClasses || []).map(c => c && String(c.id));
          filtered = filtered.filter(c => c && (c.department === user.department || teachIds.includes(String(c.id))));
        } else if (user?.isClassCoordinator) {
          const coordIds = (user.coordinatedClasses || []).map(c => c && String(c.id));
          const teachIds = (user.teachingClasses || []).map(c => c && String(c.id));
          filtered = filtered.filter(c => 
            c && (
              coordIds.includes(String(c.id)) || 
              (user.coordinatedClassId && String(c.id) === String(user.coordinatedClassId)) || 
              teachIds.includes(String(c.id))
            )
          );
        } else {
          const teachIds = (user?.teachingClasses || []).map(c => c && String(c.id));
          filtered = filtered.filter(c => c && teachIds.includes(String(c.id)));
        }

        // Guarantee target class from redirect is available in classes list for HoD/Staff
        const searchParams = new URLSearchParams(location.search);
        const rawTargetClass = location.state?.classId || location.state?.class_id || searchParams.get('classId') || searchParams.get('class_id') || sessionStorage.getItem('last_classId_2021');
        const targetClassId = (rawTargetClass && rawTargetClass !== 'undefined' && rawTargetClass !== 'null') ? String(rawTargetClass) : '';

        if (targetClassId) {
          const matchedTarget = classList.find(c => c && String(c.id) === String(targetClassId));
          if (matchedTarget && !filtered.some(c => c && String(c.id) === String(targetClassId))) {
            filtered = [...filtered, matchedTarget];
          }
        }

        const yearWeight = { 'IV': 1, 'III': 2, 'II': 3, 'I': 4 };
        filtered.sort((a, b) => {
          if (!a || !b) return 0;
          const wA = yearWeight[a.year_label] || (a.name?.includes('IV') ? 1 : a.name?.includes('III') ? 2 : a.name?.includes('II') ? 3 : 4);
          const wB = yearWeight[b.year_label] || (b.name?.includes('IV') ? 1 : b.name?.includes('III') ? 2 : b.name?.includes('II') ? 3 : 4);
          if (wA !== wB) return wA - wB;
          return (a.name || '').localeCompare(b.name || '');
        });

        setClasses(filtered);
      })
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, [user]);

  // Ensure stale 2025 classes are cleanly removed on regulation switch without refresh
  useEffect(() => {
    if (classes.length > 0 && effectiveClassId) {
      const isValid = classes.some(c => c && String(c.id) === String(effectiveClassId));
      const searchParams = new URLSearchParams(location.search);
      const targetClassId = location.state?.classId || location.state?.class_id || searchParams.get('classId') || searchParams.get('class_id');
      if (!isValid && !targetClassId) {
        clearSelection();
      }
    }
  }, [classes, effectiveClassId]);

  // ── Load subjects when class changes ──────────────────────
  useEffect(() => {
    if (!effectiveClassId) { setSubjects([]); return; }
    subjectsAPI.getByClass(effectiveClassId).then((allSubs) => {
      const subsList = Array.isArray(allSubs) ? allSubs.filter(Boolean) : [];
      const isElevated = user?.role === 'hod' || user?.role === 'admin' || user?.role === 'principal' || user?.role === 'vice_principal';
      const isCoordinator = user?.isClassCoordinator && (
        user.coordinatedClassId === effectiveClassId || 
        (user.coordinatedClasses || []).some(c => c && String(c.id) === String(effectiveClassId))
      );

      let visibleSubs = subsList;
      if (!isElevated && !isCoordinator) {
        visibleSubs = subsList.filter(s => {
          if (!s) return false;
          const matchFacultyId = String(s.faculty_id) === String(user?.id);
          const matchFacultyName = s.faculty_name && user?.name && s.faculty_name.toLowerCase().trim() === user.name.toLowerCase().trim();
          const matchAssignedList = (user?.assignedSubjectIds || []).map(String).includes(String(s.id));
          return matchFacultyId || matchFacultyName || matchAssignedList;
        });
      }

      // Restore target subject reliably from incoming state, query params, or existing selection
      const searchParams = new URLSearchParams(location.search);
      const rawTargetSub = location.state?.subjectId || location.state?.subject_id || searchParams.get('subjectId') || searchParams.get('subject_id') || effectiveSubjectId || sessionStorage.getItem('last_subjectId_2021');
      const targetSubId = (rawTargetSub && rawTargetSub !== 'undefined' && rawTargetSub !== 'null') ? String(rawTargetSub) : '';

      if (targetSubId) {
        const matched = subsList.find(s => s && String(s.id) === String(targetSubId));
        if (matched && !visibleSubs.some(s => s && String(s.id) === String(targetSubId))) {
          visibleSubs = [...visibleSubs, matched];
        }
      }

      setSubjects(visibleSubs);

      if (targetSubId && visibleSubs.some(s => s && String(s.id) === String(targetSubId))) {
        if (String(targetSubId) !== String(selectedSubjectId)) {
          setSubject(targetSubId);
        }
      }
    }).catch(() => setSubjects([]));
  }, [effectiveClassId, user, selectedSubjectId]);

  // ── Load students when class changes ──────────────────────
  useEffect(() => {
    if (!effectiveClassId) { setStudents([]); return; }
    studentsAPI.getByClass(effectiveClassId).then(allStudents => {
      setStudents(Array.isArray(allStudents) ? allStudents.filter(Boolean) : []);
    }).catch(() => setStudents([]));
  }, [effectiveClassId]);

  const selectedClass   = (classes || []).find(c => c && String(c.id) === String(effectiveClassId));
  const selectedSubject = (subjects || []).find(s => s && String(s.id) === String(effectiveSubjectId));
  const isPureLab = Boolean(selectedSubject && (
    selectedSubject.type === 'Practical' ||
    selectedSubject.type === 'Laboratory' ||
    selectedSubject.type === 'Lab' ||
    (selectedSubject.name?.toLowerCase().includes('laboratory') && !['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab'].includes(selectedSubject?.type))
  ));

  useEffect(() => {
    if (isPureLab) {
      setReportType('lab_marks_only');
    }
  }, [isPureLab]);

  // Synchronize custom admin LTPC splits and hours allocation in real-time
  useEffect(() => {
    if (!effectiveSubjectId) return;
    settingsAPI.getSubjectAllocation(effectiveSubjectId).then((alloc) => {
      if (alloc) {
        const i1 = alloc.int1 !== undefined && alloc.int1 !== null ? alloc.int1 : alloc.int1_hours;
        const i2 = alloc.int2 !== undefined && alloc.int2 !== null ? alloc.int2 : alloc.int2_hours;
        const lb = alloc.lab !== undefined && alloc.lab !== null ? alloc.lab : alloc.lab_hours;
        const tot = alloc.total !== undefined && alloc.total !== null ? alloc.total : alloc.total_hours;

        setSubjects((prev) =>
          prev.map((s) => {
            if (String(s.id) === String(effectiveSubjectId) || String(s.code) === String(alloc.code)) {
              return {
                ...s,
                int1_hours: i1 !== undefined && i1 !== null ? parseInt(i1, 10) : s.int1_hours,
                int2_hours: i2 !== undefined && i2 !== null ? parseInt(i2, 10) : s.int2_hours,
                lab_hours:  lb !== undefined && lb !== null ? parseInt(lb, 10) : s.lab_hours,
                total_hours: tot !== undefined && tot !== null ? parseInt(tot, 10) : s.total_hours,
              };
            }
            return s;
          })
        );
      }
    }).catch(() => {});
  }, [effectiveSubjectId]);

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

    const searchParams = new URLSearchParams(location.search);
    const rawSessionId = location.state?.loadSessionId || searchParams.get('sessionId');
    const targetSessionId = (rawSessionId && rawSessionId !== 'undefined' && rawSessionId !== 'null') ? rawSessionId : null;

    const fetchSession = targetSessionId
      ? marksAPI.getSessionDetail(targetSessionId).catch(() => null)
      : marksAPI.getSessions({ classId: effectiveClassId, subjectId: effectiveSubjectId, sessionLabel: assessmentMode })
          .then((sessions) => {
            if (sessions && sessions.length > 0) return marksAPI.getSessionDetail(sessions[0].id);
            return null;
          })
          .catch(() => null);

    fetchSession
      .then((detail) => {
        if (detail && detail.session) {
          setCurrentSession(detail.session);
          setSessionStatus(detail.session.status || 'locked');
          if (detail.session.session_label && detail.session.session_label !== assessmentMode) {
            setAssessmentMode(detail.session.session_label);
          }

          const loadedComps = (detail.components || []).map((c) => ({
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
          (detail.marks || []).forEach(m => {
            if (!loadedMarks[m.student_id]) loadedMarks[m.student_id] = {};
            loadedMarks[m.student_id][m.component_id] = parseFloat(m.marks_obtained);
          });
          const activeSub = subjects.find(s => s && String(s.id) === String(effectiveSubjectId)) || selectedSubject;
          const activeSplits = activeSub ? getHourSplits(activeSub.ltpc, activeSub.type, activeSub.total_hours) : { int1: 30, int2: 30 };
          const prescribed = assessmentMode === 'internal2'
            ? (activeSub?.int2_hours ?? activeSplits.int2 ?? 30)
            : (activeSub?.int1_hours ?? activeSplits.int1 ?? 30);
          const sessHours = parseInt(detail.session?.total_hours, 10);
          const hasAdminAllocation = (assessmentMode === 'internal2' ? activeSub?.int2_hours : activeSub?.int1_hours) > 0;
          const finalSessionHours = hasAdminAllocation ? prescribed : ((sessHours > 0) ? sessHours : (prescribed > 0 ? prescribed : 30));

          setSessionBulk({
            marks: loadedMarks,
            attendance: detail.attendance || {},
            internalExam: detail.internalExam || {},
            labData: detail.labData || {},
            totalHours: finalSessionHours
          });
          setTotalHours(finalSessionHours);
          setRemedialAction(detail.session.remedial_action || '');
          setSaved(true);
          setIsComponentsDirty(false);
        } else {
          setCurrentSession(null);
          setSessionStatus('draft');
          setAssessmentComponents([]);
          const activeSub = subjects.find(s => s && String(s.id) === String(effectiveSubjectId)) || selectedSubject;
          const activeSplits = activeSub ? getHourSplits(activeSub.ltpc, activeSub.type, activeSub.total_hours) : { int1: 30, int2: 30 };
          const defaultSessionHours = assessmentMode === 'internal2'
            ? (activeSub?.int2_hours ?? activeSplits.int2 ?? 30)
            : (activeSub?.int1_hours ?? activeSplits.int1 ?? 30);
          setSessionBulk({ marks: {}, attendance: {}, internalExam: {}, labData: {}, totalHours: defaultSessionHours });
          setTotalHours(defaultSessionHours);
          setRemedialAction('');
          setSaved(false);
          setIsComponentsDirty(false);
        }
      })
      .catch((err) => console.error('Failed to load marks session (2021):', err))
      .finally(() => setLoading(false));
  }, [effectiveClassId, effectiveSubjectId, user?.id, subjects, assessmentMode]);

  // Split hours based on LTPC total and subject type (matches 2021 & 2025 college curriculum table)
  const getHourSplits = (ltpc, type, total) => {
    const cleanLtpc = String(ltpc || '').trim().replace(/[\s\-]+/g, '');
    let h = parseInt(total || 0, 10);
    if (h > 0 && h <= 10) h = h * 15;
    if (!h || h <= 0) h = 60;

    if (['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab'].includes(type)) {
      if (cleanLtpc === '2023') return { int1: 15, int2: 15, lab: 30 };
      if (cleanLtpc === '2043') return { int1: 15, int2: 15, lab: 60 };
      if (cleanLtpc === '1022') return { int1: 15, int2: 15, lab: 15 };
      if (cleanLtpc === '3024') return { int1: 30, int2: 30, lab: 15 };
      if (cleanLtpc === '3045') return { int1: 30, int2: 30, lab: 45 };
      if (cleanLtpc === '1021') return { int1: 15, int2: 15, lab: 15 };
      return { int1: 30, int2: 30, lab: Math.max(0, h - 60) || 30 };
    }

    if (type === 'Theory') {
      if (cleanLtpc === '3104' || cleanLtpc === '3004') return { int1: 30, int2: 30, lab: 0 };
      if (cleanLtpc === '1001') return { int1: 7, int2: 8, lab: 0 };
      if (cleanLtpc === '3003' || cleanLtpc === '2103') return { int1: 25, int2: 20, lab: 0 };
      if (cleanLtpc === '2002') return { int1: 15, int2: 15, lab: 0 };
      if (h === 45) return { int1: 25, int2: 20, lab: 0 };
      if (h === 30) return { int1: 15, int2: 15, lab: 0 };
      if (h === 15) return { int1: 7, int2: 8, lab: 0 };
      return { int1: Math.ceil(h / 2), int2: Math.floor(h / 2), lab: 0 };
    }

    if (type === 'Practical' || type === 'Laboratory' || type === 'Lab') {
      if (cleanLtpc === '0042') return { int1: 30, int2: 30, lab: 0 };
      if (cleanLtpc === '1021') return { int1: 25, int2: 20, lab: 0 };
      if (cleanLtpc === '0041') return { int1: 30, int2: 30, lab: 0 };
      if (cleanLtpc === '0021') return { int1: 15, int2: 15, lab: 0 };
      if (h === 45) return { int1: 25, int2: 20, lab: 0 };
      if (h === 30) return { int1: 15, int2: 15, lab: 0 };
      return { int1: Math.ceil(h / 2), int2: Math.floor(h / 2), lab: 0 };
    }

    if (!h) return { int1: 30, int2: 30, lab: 0 };
    if (h === 60) return { int1: 30, int2: 30, lab: 0 };
    if (h === 45) return { int1: 25, int2: 20, lab: 0 };
    if (h === 30) return { int1: 15, int2: 15, lab: 0 };
    if (h === 15) return { int1: 7, int2: 8, lab: 0 };
    return { int1: Math.ceil(h / 2), int2: Math.floor(h / 2), lab: 0 };
  };

  const defaultSplits = selectedSubject ? getHourSplits(selectedSubject.ltpc, selectedSubject.type, selectedSubject.total_hours) : { int1: 30, int2: 30, lab: 0 };
  const int1Hours = (selectedSubject?.int1_hours !== null && selectedSubject?.int1_hours !== undefined && selectedSubject?.int1_hours !== '')
    ? parseInt(selectedSubject.int1_hours, 10)
    : (defaultSplits.int1 || 30);
  const int2Hours = (selectedSubject?.int2_hours !== null && selectedSubject?.int2_hours !== undefined && selectedSubject?.int2_hours !== '')
    ? parseInt(selectedSubject.int2_hours, 10)
    : (defaultSplits.int2 || 30);
  const labHours  = (selectedSubject?.lab_hours !== null && selectedSubject?.lab_hours !== undefined && selectedSubject?.lab_hours !== '')
    ? parseInt(selectedSubject.lab_hours, 10)
    : (defaultSplits.lab || (isPureLab ? (selectedSubject?.total_hours || 60) : 0));

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

  // Auto-save removed: manual Save Draft requested to avoid network/latency dependency
  // ── Save handler ───────────────────────────────────────────
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
            studentId:      st.id,
            componentIndex: idx,
            marksObtained:  (val !== undefined && val !== '' && !isNaN(parseFloat(val))) ? parseFloat(val) : null,
          });
        });
      });

      // For 2021 reg — attendance recorded for tracking (0 marks weight), along with internalExam and labData
      const attendancePayload = students.map(st => {
        const rawAttd = attendanceData[st.id] !== undefined && attendanceData[st.id] !== '' 
          ? parseInt(attendanceData[st.id], 10) || 0 
          : (parseInt(labData[st.id]?.labAttendance, 10) || 0);
        const rawLabMark = (labData[st.id] && labData[st.id].labMark !== undefined && labData[st.id].labMark !== '')
          ? labData[st.id].labMark
          : (internalExamData[st.id] || '');
        return {
          studentId: st.id,
          hoursAttended: rawAttd,
          actualTakenHours: rawAttd,
          internalExamMark: rawLabMark || internalExamData[st.id] || '',
          labAttendance: rawAttd,
          labMark: rawLabMark
        };
      });

      const currentAssessmentHours = parseInt(totalHours, 10) || (assessmentMode === 'internal1' ? int1Hours : int2Hours) || 30;
      const payload = {
        subjectId:    effectiveSubjectId,
        classId:      effectiveClassId,
        staffId:      user.id,
        sessionLabel: assessmentMode,
        totalHours:   parseInt(currentAssessmentHours, 10),
        int1Hours:    parseInt(int1Hours || 0, 10),
        int2Hours:    parseInt(int2Hours || 0, 10),
        labHours:     parseInt(labHours || 0, 10),
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
            (Array.isArray(freshDetail?.marks) ? freshDetail.marks : []).forEach(m => {
              if (m && m.student_id) {
                if (!reloadedMarks[m.student_id]) reloadedMarks[m.student_id] = {};
                reloadedMarks[m.student_id][m.component_id] = parseFloat(m.marks_obtained);
              }
            });
            setSessionBulk({
              marks: reloadedMarks,
              attendance: freshDetail.attendance || {},
              internalExam: freshDetail.internalExam || {},
              labData: freshDetail.labData || {},
              totalHours: freshDetail.session?.total_hours || ''
            });
          }
        } catch (detailErr) {
          console.warn('Post-save refresh detail notice (2021):', detailErr);
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
      setAssessmentMode('internal1');
      alert('Marks have been completely cleared and reset in the database.');
    } catch (err) {
      alert('Failed to reset marks: ' + (err.message || 'Server error'));
    } finally {
      setSaving(false);
    }
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

  // ── PDF / Report Download (All open Preview Modal first) ───
  const handleDownloadPDF = async () => {
    if (!selectedClass || !selectedSubject) return;
    setReportPreviewOpen(true);
  };

  const handleGenerateSubjectPDF = async (declarationData) => {
    setDeclarationModalOpen(false);
    try {
      await generateSubjectAnalysisPDF({
        ...pdfPayload,
        marksData: pdfPayload.allMarks, // Map allMarks to marksData for pdfReportGenerator
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
          totalHours: parseInt(totalHours || currentSession?.total_hours || selectedSubject?.total_hours || 60, 10),
          labHours: parseInt(totalHours || currentSession?.total_hours || selectedSubject?.total_hours || 60, 10),
          assessmentMode,
          targetPages: options.targetPages || 'auto',
          user
        });
        return;
      }

      if (reportType === 'subject_analysis') {
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

      const withInternal = reportType !== 'subject_marks_without_internal_2021';
      await generateSubjectMarksListPDF2021({
        subject: selectedSubject,
        classObj: selectedClass,
        staff: { name: currentSession?.staff_name || selectedSubject?.faculty_name || selectedSubject?.staff_name || user?.name || 'Faculty Staff' },
        session: currentSession,
        students,
        marksData,
        attendanceData,
        totalHours: parseInt(totalHours || currentSession?.total_hours || (assessmentMode === 'internal2' ? int2Hours : int1Hours) || 30),
        internalExamData,
        labData,
        assessmentMode,
        components: assessmentComponents,
        withInternal,
        theoryCumLabMode: options.theoryCumLabMode || 'assignment_lab_only',
        showWrittenExamInPdf: !!options.showWrittenExamInPdf,
        targetPages: options.targetPages || 'auto',
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
          totalHours: parseInt(totalHours || currentSession?.total_hours || (assessmentMode === 'internal2' ? int2Hours : int1Hours) || 30),
          labHours: 40,
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

      const withInternal = reportType !== 'subject_marks_without_internal_2021';
      await exportSubjectMarksExcel({
        subject: selectedSubject,
        classObj: selectedClass,
        staff: { name: currentSession?.staff_name || selectedSubject?.faculty_name || selectedSubject?.staff_name || user?.name || 'Faculty Staff' },
        session: currentSession,
        students,
        marksData,
        attendanceData,
        attendanceMarks: {},
        internalExamData,
        labData,
        assessmentMode,
        components: assessmentComponents,
        totalHours: parseInt(totalHours || (assessmentMode === 'internal2' ? int2Hours : int1Hours) || 30),
        int1Hours,
        int2Hours,
        labHours,
        int1AttendanceData: {},
        withInternal,
        theoryCumLabMode: options.theoryCumLabMode || 'assignment_lab_only',
        showWrittenExamInPdf: !!options.showWrittenExamInPdf,
        user
      });
    } catch (e) {
      alert('Failed to generate Excel: ' + e.message);
    }
  };

  const handleDownloadSubjectAnalysisPDF = async () => {
    if (!selectedClass || !selectedSubject) return;
    setPdfPayload({
      subject: selectedSubject,
      classObj: selectedClass,
      staff: { name: currentSession?.staff_name || selectedSubject?.faculty_name || selectedSubject?.staff_name || user?.name || 'Faculty Staff' },
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
    if (!val) {
      sessionStorage.removeItem('last_classId_2021');
      sessionStorage.removeItem('last_subjectId_2021');
    } else {
      sessionStorage.setItem('last_classId_2021', String(val));
      sessionStorage.removeItem('last_subjectId_2021');
    }
    setAssessmentComponents([]);
    setCurrentSession(null);
    setSessionStatus('draft');
    setSaved(false);
    setSaveErr('');
  };
  const handleSubjectChange = (val) => {
    setSubject(val);
    if (val) {
      sessionStorage.setItem('last_subjectId_2021', String(val));
    } else {
      sessionStorage.removeItem('last_subjectId_2021');
    }
    setAssessmentComponents([]);
    setCurrentSession(null);
    setSessionStatus('draft');
    setSaved(false);
    setSaveErr('');
  };

  const selectedClassObj = classes.find(c => c && String(c.id) === String(effectiveClassId));
  const userDept = (user?.department || '').trim().toLowerCase();
  const classDept = (selectedClassObj?.department || '').trim().toLowerCase();
  const className = (selectedClassObj?.name || '').trim().toLowerCase();

  const isClassDeptHod = user?.role === 'hod' && Boolean(
    (classDept && userDept && classDept === userDept) ||
    (selectedClassObj?.year_label === 'I' && (userDept.includes('science') || userDept.includes('humanities'))) ||
    (!classDept && userDept && className && className.includes(userDept.split(' ')[0]))
  );
  const canDirectlyUnlock = Boolean(user?.role === 'admin' || user?.role === 'principal' || user?.role === 'vice_principal' || isClassDeptHod);

  const step = !selectedSubject ? 1 : (isPureLab || assessmentComponents.length > 0 ? 3 : 2);
  const isPrincipal = user?.role === 'principal' || user?.role === 'vice_principal';
  const isLocked = isPrincipal || ((sessionStatus === 'locked' || sessionStatus === 'unlock_requested') && user?.role !== 'hod' && user?.role !== 'admin');
  const canEnterMarks = isPrincipal || isPureLab ? true : assessmentComponents.length > 0;

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
            {isPureLab
              ? 'Laboratory / Practical: Direct Mark Entry (Lab Attended Hours & 100 Marks Practical Exam) · No Attendance marks'
              : isLabType
              ? `Lab-cum-Theory: CIA /${ciaMax} + Exam /100→${ciaMax === 50 ? 50 : 60}  |  Int2: CIA /50 + Lab Exam /100→50`
              : `Theory: CIA /40 + Internal Exam /100→60 = Total /100 · No Attendance marks`}
          </div>
        </div>
      </div>

      {/* Steps indicator */}
      <div className={styles.steps}>
        {[
          { n: 1, label: 'Select Class & Subject' },
          ...(!isPureLab ? [{ n: 2, label: 'Build Assessment Sheet' }] : []),
          { n: isPureLab ? 2 : 3, label: 'Enter & Submit Marks' },
        ].map((s) => (
          <div
            key={s.n}
            className={`${styles.step} ${step === s.n ? styles.stepActive : ''} ${step > s.n ? styles.stepDone : ''}`}
          >
            <div className={styles.stepNum}>{step > s.n ? <CheckCircle size={14} /> : s.n}</div>
            <span className={styles.stepLabel}>{s.label}</span>
            {s.n < (isPureLab ? 2 : 3) && <div className={styles.stepLine} />}
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
                <span>This Marks Sheet is <strong>Locked</strong> after submission. {canDirectlyUnlock ? 'You can unlock it.' : 'Changes require Class HOD approval.'}</span>
              </div>
              {canDirectlyUnlock ? (
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

          {!isPrincipal && !isPureLab && (
            <ComponentBuilder2021
              components={assessmentComponents}
              onChange={(comps) => { setAssessmentComponents(comps); setSaved(false); setIsComponentsDirty(true); }}
              isLocked={isLocked}
              ciaMax={ciaMax}
            />
          )}

          {isPureLab && (
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1.5px solid #86efac',
              borderRadius: '10px',
              padding: '14px 18px',
              margin: '16px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 4px rgba(22, 101, 52, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#166534', fontWeight: 600 }}>
                <span style={{ fontSize: '1.3rem' }}>🔬</span>
                <span>Laboratory / Practical Course — Direct Mark Entry (Lab Attended Hours &amp; 100 Marks Practical Exam)</span>
              </div>
              <span style={{ fontSize: '0.8rem', background: '#16a34a', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
                Direct Entry • No Theory CIA
              </span>
            </div>
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
            int1Hours={int1Hours}
            int2Hours={int2Hours}
            labHours={labHours}
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
                <AlertTriangle size={16} /> Unsaved changes. Click "Save Draft" to save.
              </div>
            )}
          </div>
          <div className={styles.actionRight}>
            <div className={styles.downloadGroup}>
              <select className={styles.downloadSelect} value={reportType} onChange={(e) => setReportType(e.target.value)}>
                {isPureLab ? (
                  <>
                    <option value="lab_marks_only">🔬 Laboratory Marks Statement (Attended Hrs &amp; 100 Marks Practical Exam)</option>
                    <option value="subject_analysis">Subject Analysis Report (NAC/TLP-07a.21)</option>
                    {(user?.role === 'hod' || user?.role === 'admin' || user?.isClassCoordinator || isPrincipal) && (
                      <>
                        <option value="class_analysis">Class Performance Report (NAC/TLP-20)</option>
                        <option value="consolidated_statement">Consolidated Mark Statement (NAC/TLP-07a.20)</option>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <option value="subject_marks_with_internal_2021">Subject Marks List (With Assignment Marks)</option>
                    <option value="subject_marks_without_internal_2021">Subject Marks List (Without Assignment Marks)</option>
                    {['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab', 'Practical', 'Laboratory'].includes(selectedSubject?.type) && (
                      <option value="lab_marks_only">🔬 Laboratory Marks Statement (Lab Marks &amp; Attended Hrs Only)</option>
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
                  </>
                )}
              </select>
              <button className={styles.downloadBtn} onClick={handleDownloadPDF}>
                <Download size={15} /> Download PDF Statement
              </button>
            </div>
            {!isPrincipal && (
              <>
                <button className={styles.clearBtn} onClick={handleReset} disabled={isLocked && user?.role !== 'hod' && user?.role !== 'admin'}>
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

      <ReportPreviewModal
        isOpen={reportPreviewOpen}
        onClose={() => setReportPreviewOpen(false)}
        onDownloadPDF={(opts) => {
          executeSubjectPDF(opts);
          setReportPreviewOpen(false);
        }}
        onDownloadExcel={(opts) => {
          executeSubjectExcel(opts);
          setReportPreviewOpen(false);
        }}
        title={reportType === 'lab_marks_only'
          ? `Laboratory Marks Statement — ${selectedSubject?.code || ''} ${selectedSubject?.name || ''}`
          : `Report Preview — ${selectedSubject?.code || ''} ${selectedSubject?.name || ''}`}
        subject={selectedSubject}
        classObj={selectedClass}
        staff={{ name: currentSession?.staff_name || selectedSubject?.faculty_name || selectedSubject?.staff_name || user?.name || 'Faculty Staff' }}
        assessmentMode={assessmentMode}
        withInternal={reportType !== 'subject_marks_without_internal_2021'}
        students={students}
        marksData={marksData}
        attendanceData={attendanceData}
        attendanceMarks={{}}
        internalExamData={internalExamData}
        labData={labData}
        components={assessmentComponents}
        totalHours={totalHours || (assessmentMode === 'internal2' ? int2Hours : int1Hours) || 30}
        int1Hours={int1Hours}
        int2Hours={int2Hours}
        labHours={labHours}
        int1AttendanceData={{}}
        regulation="2021"
        reportType={reportType}
        isLabOnly={reportType === 'lab_marks_only'}
      />
    </div>
  );
}
