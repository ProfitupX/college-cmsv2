import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, Download, FileText, CheckCircle2, BookOpen, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';
import { statsAPI, marksAPI, classesAPI, subjectsAPI, studentsAPI, remarksAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  generateSubjectAnalysisPDF, 
  generateSubjectMarksListPDF,
  generateSubjectMarksListPDF2021,
  generateClassAnalysisPDF, 
  generateConsolidatedMarksPDF,
  generateOverallMarksAndAttendancePDF,
  generateHodMarksPDF,
  generateCollegeOverviewPDF,
  generateContinuousAssessmentAnalysisPDF
} from '../services/pdfReportGenerator';
import DeclarationModal from '../components/Reports/DeclarationModal';
import SubjectSelectionModal from '../components/Reports/SubjectSelectionModal';
import ReportPreviewModal from '../components/Common/ReportPreviewModal';
import { 
  exportSubjectMarksExcel, 
  exportLaboratoryMarksExcel, 
  exportOverallMarksExcel, 
  exportSubjectAnalysisExcel, 
  exportConsolidatedMarksExcel, 
  exportClassAnalysisExcel 
} from '../services/excelReportGenerator';
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
  const navigate = useNavigate();
  const [stats,    setStats]    = useState(null);
  const [sessions, setSessions] = useState([]);
  const [classes,  setClasses]  = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);

  const [selectedClassId, setSelectedClassId]     = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [sessionLabel, setSessionLabel]           = useState('internal1');
  const [classRemarks, setClassRemarks]           = useState('');
  const [improvementPlan, setImprovementPlan]     = useState('');
  const [savingRemarks, setSavingRemarks]         = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [declarationModalOpen, setDeclarationModalOpen] = useState(false);
  const [pdfPayload, setPdfPayload] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewPayload, setPreviewPayload] = useState(null);
  
  // New Subject Selection Modal state for multi-subject PDFs
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [subjectModalPdfType, setSubjectModalPdfType] = useState('');
  
  const [overallFromDate, setOverallFromDate] = useState('');
  const [overallToDate, setOverallToDate] = useState('');
  const [subjectMarksMode, setSubjectMarksMode] = useState('with_internal');
  const [legalMarksMode, setLegalMarksMode] = useState('with_internal');
  const [selectedDept, setSelectedDept] = useState(user?.department || 'Information Technology');
  const [hodMarksData, setHodMarksData] = useState(null);
  const [hodMarksLoading, setHodMarksLoading] = useState(false);

  const isElevated = user?.role === 'hod' || user?.role === 'admin' || user?.role === 'principal' || user?.role === 'vice_principal';
  const isCoordinatorOfSelectedClass = user?.isClassCoordinator && (
    user.coordinatedClassId === selectedClassId || 
    (user.coordinatedClasses || []).some(c => c.id === selectedClassId)
  );

  // 1. Initial Load: Fetch and filter allowed classes based on User Role
  useEffect(() => {
    classesAPI.getAll()
      .then((allClasses) => {
        let allowed = [];
        if (user?.role === 'principal' || user?.role === 'vice_principal' || user?.role === 'admin') {
          allowed = allClasses;
        } else if (user?.role === 'hod') {
          allowed = allClasses.filter(c => 
            c.department === user.department || 
            (c.department === 'Science and Humanities' && user.department !== 'Science and Humanities' && c.name?.toLowerCase().includes(user.department?.toLowerCase().split(' ')[0]))
          );
        } else if (user?.isClassCoordinator) {
          const coordIds = (user.coordinatedClasses || []).map(c => c.id);
          const teachIds = (user.teachingClasses || []).map(c => c.id);
          allowed = allClasses.filter(c => 
            coordIds.includes(c.id) || 
            (user.coordinatedClassId && c.id === user.coordinatedClassId) ||
            teachIds.includes(c.id)
          );
        } else {
          // Pure Faculty
          const teachIds = (user?.teachingClasses || []).map(c => c.id);
          allowed = allClasses.filter(c => teachIds.includes(c.id));
        }

        const yearWeight = { 'IV': 1, 'III': 2, 'II': 3, 'I': 4 };
        allowed.sort((a, b) => {
          const wA = yearWeight[a.year_label] || (a.name?.includes('IV') ? 1 : a.name?.includes('III') ? 2 : a.name?.includes('II') ? 3 : 4);
          const wB = yearWeight[b.year_label] || (b.name?.includes('IV') ? 1 : b.name?.includes('III') ? 2 : b.name?.includes('II') ? 3 : 4);
          if (wA !== wB) return wA - wB;
          return (a.name || '').localeCompare(b.name || '');
        });

        setClasses(allowed);

        // Pick initial class: prioritized to coordinated class, or first allowed class
        const initialClsId = user?.coordinatedClassId || (allowed.length > 0 ? allowed[0].id : '');
        setSelectedClassId(initialClsId);

        return Promise.all([
          statsAPI.get(initialClsId, user?.id, user?.role, user?.department),
          marksAPI.getSessions({ classId: initialClsId || undefined }),
          initialClsId ? subjectsAPI.getByClass(initialClsId) : Promise.resolve([]),
          initialClsId ? studentsAPI.getByClass(initialClsId) : Promise.resolve([])
        ]);
      })
      .then(([s, sess, subs, stds]) => {
        setStats(s);
        setSessions(sess);

        // Filter subjects based on role
        let filteredSubs = subs;
        if (!isElevated && !user?.isClassCoordinator) {
          filteredSubs = subs.filter(sub => user?.assignedSubjectIds?.includes(sub.id));
        }
        setSubjects(filteredSubs);
        setStudents(stds);
        if (filteredSubs.length > 0) setSelectedSubjectId(filteredSubs[0].id);
      })
      .catch(() => setError('Failed to load reports data. Is the server running?'))
      .finally(() => setLoading(false));
  }, [user]);

  // 2. When Selected Class changes: Reload subjects, students, remarks, and stats
  useEffect(() => {
    if (!selectedClassId) return;

    // Fetch subjects for this class
    subjectsAPI.getByClass(selectedClassId)
      .then((allSubs) => {
        let visibleSubs = allSubs;
        // If not elevated and not coordinator of this class, only show staff's assigned subjects
        const isCoordOfThis = user?.isClassCoordinator && (
          user.coordinatedClassId === selectedClassId || 
          (user.coordinatedClasses || []).some(c => c.id === selectedClassId)
        );
        if (!isElevated && !isCoordOfThis) {
          visibleSubs = allSubs.filter(sub => user?.assignedSubjectIds?.includes(sub.id));
        }
        setSubjects(visibleSubs);
        if (visibleSubs.length > 0) {
          setSelectedSubjectId(visibleSubs[0].id);
        } else {
          setSelectedSubjectId('');
        }
      })
      .catch(() => setSubjects([]));

    // Fetch students
    studentsAPI.getByClass(selectedClassId)
      .then(setStudents)
      .catch(() => setStudents([]));

    // Fetch stats
    statsAPI.get(selectedClassId, user?.id, user?.role, user?.department)
      .then(setStats)
      .catch(() => {});
  }, [selectedClassId, user]);

  // 3. Load Remarks for Class & Session
  useEffect(() => {
    if (!selectedClassId) return;
    remarksAPI.get(selectedClassId, sessionLabel)
      .then(data => {
        setClassRemarks(data?.remarks || '');
        setImprovementPlan(data?.improvement_plan || '');
      })
      .catch(err => console.error(err));
  }, [selectedClassId, sessionLabel]);

  // 4. Load Academic Year Pass Marks for Everyone's Panel (Admin, Principal, VP, HOD, Faculty)
  useEffect(() => {
    const deptToFetch = (user?.role === 'hod' || user?.role === 'faculty' || user?.role === 'staff')
      ? (user?.department || 'Information Technology')
      : (selectedDept || 'Information Technology');

    if (deptToFetch) {
      setHodMarksLoading(true);
      statsAPI.getHodMarks(deptToFetch, sessionLabel)
        .then(data => setHodMarksData(data))
        .catch(err => {
          console.error('Failed to load HOD marks:', err);
          setHodMarksData(null);
        })
        .finally(() => setHodMarksLoading(false));
    }
  }, [user, sessionLabel, selectedDept]);

  const handleDownloadCollegeOverview = async () => {
    setGenLoading(true);
    try {
      const collegeStats = await statsAPI.getCollegeStats();
      await generateCollegeOverviewPDF({
        overview: collegeStats.overview,
        departmentStats: collegeStats.departmentStats,
        user
      });
    } catch (err) {
      alert('Failed to generate College Overview PDF: ' + err.message);
    } finally {
      setGenLoading(false);
    }
  };

  const handleDownloadContinuousAssessmentPDF = async () => {
    setGenLoading(true);
    try {
      const caData = await statsAPI.getContinuousAssessment(sessionLabel);
      await generateContinuousAssessmentAnalysisPDF({
        caData,
        sessionLabel,
        user
      });
    } catch (err) {
      alert('Failed to generate Continuous Assessment PDF: ' + err.message);
    } finally {
      setGenLoading(false);
    }
  };

  const handleExportContinuousAssessmentCSV = async () => {
    try {
      const caData = await statsAPI.getContinuousAssessment(sessionLabel);
      const isCA2 = sessionLabel === 'internal2';
      let csv = `NADAR SARASWATHI COLLEGE OF ENGINEERING AND TECHNOLOGY\n`;
      csv += `VADAPUDUPATTI, THENI - 625 531\n`;
      csv += `CONTINUOUS ASSESSMENT - ${isCA2 ? '2' : '1'} ANALYSIS\n\n`;
      csv += `Department,Year,Strength,Passed,Percentage,Percentage (Over all)\n`;

      caData.departments.forEach((dept) => {
        dept.years.forEach((yr, idx) => {
          const deptLabel = idx === 0 ? `"${dept.department}"` : '""';
          const deptOverall = idx === 0 ? `"${dept.deptOverallPct}%"` : '""';
          csv += `${deptLabel},"${yr.year}",${yr.strength},${yr.passed},"${yr.percentage}%",${deptOverall}\n`;
        });
      });

      csv += `"Pass Percentage Without First Year (Years II, III, IV)",,${caData.summary.withoutFirstYear.strength},${caData.summary.withoutFirstYear.passed},"${caData.summary.withoutFirstYear.percentage}%",\n`;
      if (caData.summary.firstYear) {
        csv += `"Pass Percentage of First Year (Science & Humanities)",,${caData.summary.firstYear.strength},${caData.summary.firstYear.passed},"${caData.summary.firstYear.percentage}%",\n`;
      }
      csv += `"College Overall Pass Percentage (Total including First Year)",,${caData.summary.collegeOverall.strength},${caData.summary.collegeOverall.passed},"${caData.summary.collegeOverall.percentage}%",\n`;

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `NSCET_Continuous_Assessment_${isCA2 ? '2' : '1'}_Analysis.csv`;
      link.click();
    } catch (err) {
      alert('Failed to export CSV: ' + err.message);
    }
  };

  const handleSaveRemarks = async () => {
    setSavingRemarks(true);
    try {
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
    const cls = classes.find(c => c.id === selectedClassId) || { id: selectedClassId, name: 'Target Class', department: user?.department, semester: 4, year_label: 'II', academic_year: '2025-26' };
    
    setGenLoading(true);
    try {
      const sessDetail = await marksAPI.getSessions({ classId: selectedClassId, subjectId: selectedSubjectId, sessionLabel });
      let detail = null;
      if (sessDetail.length > 0) {
        detail = await marksAPI.getSessionDetail(sessDetail[0].id);
      }

      // Build marksData lookup { [studentId]: { [componentId]: mark } } for Reg-2025 CIA fallback
      const marksDataObj = {};
      (detail?.marks || []).forEach(m => {
        if (!marksDataObj[m.student_id]) marksDataObj[m.student_id] = {};
        marksDataObj[m.student_id][m.component_id] = parseFloat(m.marks_obtained);
      });

      setPdfPayload({
        subject: sub || { code: 'SUB', name: 'Subject Analysis', department: cls.department },
        classObj: cls,
        staff: { name: detail?.session?.staff_name || sub?.faculty_name || sub?.staff_name || 'Faculty Staff' },
        session: detail?.session,
        students,
        marksData: marksDataObj,
        allMarks: detail?.marks || [],
        components: detail?.components || [],
        attendanceData: detail?.attendance || {},
        attendanceMarks: detail?.attendanceMarks || {},
        internalExamData: detail?.internalExam || {},
        labData: detail?.labData || {},
        assessmentMode: sessionLabel,
        user
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
      setPreviewPayload({
        reportType: 'subject_analysis',
        ...pdfPayload,
        declarationData,
        user
      });
      setPreviewModalOpen(true);
    } catch (err) {
      alert('Failed to preview Subject Analysis: ' + err.message);
    } finally {
      setGenLoading(false);
    }
  };

  const handleDownloadSubjectMarksPDF = async () => {
    if (!selectedSubjectId || !selectedClassId) return;
    const sub = subjects.find(s => s.id === selectedSubjectId);
    const cls = classes.find(c => c.id === selectedClassId) || { id: selectedClassId, name: 'Target Class', department: user?.department, semester: 4, year_label: 'II', academic_year: '2026-2027' };
    const withInternal = subjectMarksMode === 'with_internal';

    setGenLoading(true);
    try {
      const sessDetail = await marksAPI.getSessions({ classId: selectedClassId, subjectId: selectedSubjectId, sessionLabel });
      let detail = null;
      let currentSession = null;
      if (sessDetail.length > 0) {
        currentSession = sessDetail[0];
        detail = await marksAPI.getSessionDetail(currentSession.id);
      }

      const is2021 = cls.year_label === 'III' || cls.year_label === 'IV' || parseInt(cls.semester) >= 5;

      const staffObj = {
        name: detail?.session?.staff_name || sub?.faculty_name || sub?.staff_name || 'Faculty Staff'
      };

      const marksObj = {};
      (detail?.marks || []).forEach(m => {
        if (!marksObj[m.student_id]) marksObj[m.student_id] = {};
        marksObj[m.student_id][m.component_id] = parseFloat(m.marks_obtained);
      });

      const componentsList = (detail?.components || []).map(c => ({
        uid: c.id,
        id: c.id,
        typeId: c.type_id,
        label: c.label,
        conductedMax: parseFloat(c.conducted_max) || 100,
        max: parseFloat(c.max_marks),
        icon: c.icon,
        color: c.color,
      }));

      let int1Attd = {};
      if (sessionLabel === 'internal2') {
        try {
          const int1Sess = await marksAPI.getSessions({ classId: selectedClassId, subjectId: selectedSubjectId, sessionLabel: 'internal1' });
          if (int1Sess.length > 0) {
            const int1Det = await marksAPI.getSessionDetail(int1Sess[0].id);
            int1Attd = int1Det?.attendance || {};
          }
        } catch (e) {
          console.warn('Could not load IA1 attendance', e);
        }
      }

      setPreviewPayload({
        is2021,
        subject: sub || { code: 'SUB', name: 'Subject', department: cls.department, type: 'Theory' },
        classObj: cls,
        staff: staffObj,
        session: currentSession,
        students,
        marksData: marksObj,
        attendanceData: detail?.attendance || {},
        attendanceMarks: detail?.attendanceMarks || {},
        internalExamData: detail?.internalExam || {},
        labData: detail?.labData || {},
        assessmentMode: sessionLabel,
        components: componentsList,
        totalHours: parseInt(currentSession?.total_hours || sub?.total_hours || 60, 10),
        int1Hours: parseInt(currentSession?.int1_hours || sub?.int1_hours || 30, 10),
        int2Hours: parseInt(currentSession?.int2_hours || sub?.int2_hours || 30, 10),
        labHours: parseInt(currentSession?.lab_hours || sub?.lab_hours || 0, 10),
        int1AttendanceData: int1Attd,
        withInternal,
        user
      });
      setPreviewModalOpen(true);
    } catch (err) {
      alert('Failed to load marks for statement: ' + err.message);
    } finally {
      setGenLoading(false);
    }
  };

  const executePreviewPDF = async (options = {}) => {
    if (!previewPayload) return;
    setGenLoading(true);
    try {
      const {
        reportType, is2021, subject, classObj, staff, session, students, marksData, attendanceData,
        attendanceMarks, internalExamData, labData, assessmentMode, components, totalHours,
        int1Hours, int2Hours, labHours, int1AttendanceData, withInternal,
        subjects, allSessions, allAttendance, allMarks, allComponents, selectedSubjectIds,
        inchargeNameParam, fromDate, toDate, declarationData, classRemarks: remarksText, remedialAction: planText
      } = previewPayload;

      if (reportType === 'subject_analysis') {
        await generateSubjectAnalysisPDF({
          subject, classObj, staff, session, students,
          allMarks: marksData || allMarks,
          marksData: marksData || allMarks,
          components, attendanceData, internalExamData, labData,
          assessmentMode, declarationData, user
        });
      } else if (reportType === 'class_analysis') {
        await generateClassAnalysisPDF({
          classObj, sessionLabel: assessmentMode || sessionLabel,
          subjects, students, allSessions, allAttendance,
          remarks: remarksText || classRemarks,
          remedialAction: planText || improvementPlan,
          selectedSubjectIds, inchargeNameParam, user
        });
      } else if (reportType === 'examcell_legal' || reportType === 'overall_statement') {
        await generateOverallMarksAndAttendancePDF({
          classObj, sessionLabel: assessmentMode || sessionLabel,
          subjects, students, allSessions, allAttendance, allMarks, allComponents,
          fromDate, toDate, selectedSubjectIds,
          withInternal, inchargeNameParam, user
        });
      } else if (reportType === 'consolidated_statement') {
        await generateConsolidatedMarksPDF({
          classObj, sessionLabel: assessmentMode || sessionLabel,
          subjects, students, allSessions, allAttendance, allMarks, allComponents,
          selectedSubjectIds, inchargeNameParam, user
        });
      } else if (reportType === 'batch_subject_marks') {
        for (const subId of (selectedSubjectIds || [])) {
          const sub = (subjects || []).find(s => s.id === subId);
          if (sub) {
            await handleDownloadSingleSubjectMarksPDF(sub, classObj, assessmentMode || sessionLabel, subjectMarksMode);
            if (selectedSubjectIds.length > 1) {
              await new Promise(r => setTimeout(r, 350));
            }
          }
        }
      } else if (is2021) {
        await generateSubjectMarksListPDF2021({
          subject, classObj, staff, session, students, marksData, attendanceData,
          totalHours, internalExamData, labData, assessmentMode, components,
          withInternal,
          theoryCumLabMode: options.theoryCumLabMode || 'assignment_lab_only',
          showWrittenExamInPdf: !!options.showWrittenExamInPdf,
          user
        });
      } else {
        await generateSubjectMarksListPDF({
          subject, classObj, staff, session, students, marksData, attendanceData,
          attendanceMarks, internalExamData, labData, assessmentMode, components,
          totalHours, int1Hours, int2Hours, labHours, int1AttendanceData,
          withInternal, user
        });
      }
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setGenLoading(false);
    }
  };

  const executePreviewExcel = async (options = {}) => {
    if (!previewPayload) return;
    try {
      const {
        reportType, subject, classObj, staff, session, students, marksData, attendanceData,
        attendanceMarks, internalExamData, labData, assessmentMode, components, totalHours,
        int1Hours, int2Hours, labHours, int1AttendanceData, withInternal,
        subjects, allSessions, allAttendance, allMarks, allComponents, selectedSubjectIds,
        inchargeNameParam, declarationData, classRemarks: remarksText, remedialAction: planText
      } = previewPayload;

      if (reportType === 'subject_analysis') {
        await exportSubjectAnalysisExcel({
          subject, classObj, staff, session, students,
          marksData, allMarks, components, attendanceData, internalExamData, labData,
          assessmentMode, declarationData, user
        });
      } else if (reportType === 'class_analysis') {
        await exportClassAnalysisExcel({
          classObj, sessionLabel: assessmentMode || sessionLabel,
          subjects, students, allSessions, allMarks, allAttendance,
          remarks: remarksText || classRemarks,
          remedialAction: planText || improvementPlan,
          selectedSubjectIds, inchargeNameParam, user
        });
      } else if (reportType === 'examcell_legal' || reportType === 'overall_statement') {
        await exportOverallMarksExcel({
          classObj, sessionLabel: assessmentMode || sessionLabel,
          subjects, students, allSessions, allAttendance, allMarks, allComponents,
          withInternal, user
        });
      } else if (reportType === 'consolidated_statement') {
        await exportConsolidatedMarksExcel({
          classObj, sessionLabel: assessmentMode || sessionLabel,
          subjects, students, allSessions, allAttendance, allMarks, allComponents,
          selectedSubjectIds, inchargeNameParam, user
        });
      } else if (reportType === 'batch_subject_marks') {
        for (const subId of (selectedSubjectIds || [])) {
          const sub = (subjects || []).find(s => s.id === subId);
          if (sub) {
            await exportSubjectMarksExcel({
              subject: sub, classObj, staff: { name: sub.faculty_name || sub.staff_name || 'Faculty Staff' },
              session, students, marksData: {}, attendanceData: {},
              assessmentMode: assessmentMode || sessionLabel, withInternal, user
            });
            await new Promise(r => setTimeout(r, 300));
          }
        }
      } else {
        await exportSubjectMarksExcel({
          subject, classObj, staff, session, students, marksData, attendanceData,
          attendanceMarks, internalExamData, labData, assessmentMode, components,
          totalHours, int1Hours, int2Hours, labHours, int1AttendanceData,
          withInternal,
          theoryCumLabMode: options.theoryCumLabMode || 'assignment_lab_only',
          showWrittenExamInPdf: !!options.showWrittenExamInPdf,
          user
        });
      }
    } catch (err) {
      alert('Failed to generate Excel: ' + err.message);
    }
  };

  const openSubjectSelectionModal = (pdfType) => {
    setSubjectModalPdfType(pdfType);
    setSubjectModalOpen(true);
  };

  const handleDownloadSingleSubjectMarksPDF = async (sub, cls, sessionMode, mode) => {
    try {
      const sessDetail = await marksAPI.getSessions({ classId: cls.id, subjectId: sub.id, sessionLabel: sessionMode });
      let detail = null;
      let currentSession = null;
      if (sessDetail.length > 0) {
        currentSession = sessDetail[0];
        detail = await marksAPI.getSessionDetail(currentSession.id);
      }

      const is2021 = cls.year_label === 'III' || cls.year_label === 'IV' || parseInt(cls.semester) >= 5;
      const staffObj = { name: detail?.session?.staff_name || sub?.faculty_name || sub?.staff_name || 'Faculty Staff' };
      const marksObj = {};
      (detail?.marks || []).forEach(m => {
        if (!marksObj[m.student_id]) marksObj[m.student_id] = {};
        marksObj[m.student_id][m.component_id] = parseFloat(m.marks_obtained);
      });

      const componentsList = (detail?.components || []).map(c => ({
        uid: c.id, id: c.id, typeId: c.type_id, label: c.label,
        conductedMax: parseFloat(c.conducted_max) || 100,
        max: parseFloat(c.max_marks), icon: c.icon, color: c.color
      }));

      const withInternal = mode === 'with_internal';

      if (is2021) {
        await generateSubjectMarksListPDF2021({
          subject: sub, classObj: cls, staff: staffObj, session: currentSession,
          students, marksData: marksObj, attendanceData: detail?.attendance || {},
          totalHours: parseInt(currentSession?.total_hours || sub?.total_hours || 0),
          internalExamData: detail?.internalExam || {},
          labData: detail?.labData || {}, assessmentMode: sessionMode,
          components: componentsList, withInternal, user
        });
      } else {
        let int1Attd = {};
        if (sessionMode === 'internal2') {
          try {
            const int1Sess = await marksAPI.getSessions({ classId: cls.id, subjectId: sub.id, sessionLabel: 'internal1' });
            if (int1Sess.length > 0) {
              const int1Det = await marksAPI.getSessionDetail(int1Sess[0].id);
              int1Attd = int1Det?.attendance || {};
            }
          } catch (e) {}
        }

        await generateSubjectMarksListPDF({
          subject: sub, classObj: cls, staff: staffObj, session: currentSession,
          students, marksData: marksObj, attendanceData: detail?.attendance || {},
          attendanceMarks: detail?.attendanceMarks || {},
          internalExamData: detail?.internalExam || {},
          labData: detail?.labData || {}, assessmentMode: sessionMode,
          components: componentsList,
          totalHours: parseInt(currentSession?.total_hours || sub?.total_hours || 60, 10),
          int1Hours: parseInt(currentSession?.int1_hours || sub?.int1_hours || 30, 10),
          int2Hours: parseInt(currentSession?.int2_hours || sub?.int2_hours || 30, 10),
          labHours: parseInt(currentSession?.lab_hours || sub?.lab_hours || 0, 10),
          int1AttendanceData: int1Attd, withInternal, user
        });
      }
    } catch (e) {
      console.error('Error generating single subject PDF', e);
    }
  };

  const handleDownloadClassPDF = async (selectedSubjectIds) => {
    setSubjectModalOpen(false);
    const pdfType = subjectModalPdfType;
    const cls = classes.find(c => c.id === selectedClassId) || { id: selectedClassId, name: 'Target Class', department: user?.department, semester: 4, year_label: 'II', academic_year: '2025-26' };
    const isCoordOfThis = user?.isClassCoordinator && (
      user.coordinatedClassId === selectedClassId || 
      (user.coordinatedClasses || []).some(c => c.id === selectedClassId)
    );
    const inchargeNameParam = isCoordOfThis ? user?.name : '';

    setGenLoading(true);
    try {
      const summary = await marksAPI.getClassSummary(selectedClassId, sessionLabel);

      if (pdfType === 'subject_marks_statement') {
        setPreviewPayload({
          reportType: 'batch_subject_marks',
          classObj: summary.classObj || cls,
          subjects: (summary.subjects || subjects).filter(s => selectedSubjectIds.includes(s.id)),
          selectedSubjectIds,
          students: summary.students || students,
          assessmentMode: sessionLabel,
          summary,
          user
        });
        setPreviewModalOpen(true);
        return;
      }

      if (pdfType === 'class_analysis') {
        setPreviewPayload({
          reportType: 'class_analysis',
          classObj: summary.classObj || cls,
          sessionLabel,
          subjects: summary.subjects || subjects,
          students: summary.students || students,
          allSessions: summary.sessions || [],
          allAttendance: summary.allAttendance || [],
          allMarks: summary.allMarks || [],
          classRemarks,
          remedialAction: improvementPlan,
          selectedSubjectIds,
          inchargeNameParam,
          assessmentMode: sessionLabel,
          user
        });
        setPreviewModalOpen(true);
      } else if (pdfType === 'overall_statement' || pdfType === 'examcell_legal') {
        setPreviewPayload({
          reportType: 'examcell_legal',
          classObj: summary.classObj || cls,
          sessionLabel,
          subjects: summary.subjects || subjects,
          students: summary.students || students,
          allSessions: summary.sessions || [],
          allAttendance: summary.allAttendance || [],
          allMarks: summary.allMarks || [],
          allComponents: summary.allComponents || [],
          fromDate: overallFromDate,
          toDate: overallToDate,
          selectedSubjectIds,
          withInternal: legalMarksMode === 'with_internal',
          inchargeNameParam,
          assessmentMode: sessionLabel,
          user
        });
        setPreviewModalOpen(true);
      } else {
        setPreviewPayload({
          reportType: 'consolidated_statement',
          classObj: summary.classObj || cls,
          sessionLabel,
          subjects: summary.subjects || subjects,
          students: summary.students || students,
          allSessions: summary.sessions || [],
          allAttendance: summary.allAttendance || [],
          allMarks: summary.allMarks || [],
          allComponents: summary.allComponents || [],
          selectedSubjectIds,
          inchargeNameParam,
          assessmentMode: sessionLabel,
          user
        });
        setPreviewModalOpen(true);
      }
    } catch (err) {
      alert('Failed to load class report data: ' + err.message);
    } finally {
      setGenLoading(false);
    }
  };

  const handleDownloadHodPDF = async () => {
    const dept = user?.role === 'hod' ? user.department : selectedDept;
    if (!dept) return;
    setGenLoading(true);
    try {
      const data = hodMarksData || await statsAPI.getHodMarks(dept, sessionLabel);
      await generateHodMarksPDF(dept, sessionLabel, data, user?.name || data?.hodName, user);
    } catch (err) {
      alert('Failed to generate HOD Marks Report: ' + err.message);
    } finally {
      setGenLoading(false);
    }
  };

  const handleHistoryRowClick = (session) => {
    // Check if class is 2021 Regulation (3rd & 4th Year)
    const is2021 = session.year_label === 'III' || session.year_label === 'IV' || session.year_label === '3' || session.year_label === '4' || parseInt(session.semester) >= 5;
    const path = is2021 ? '/marks-entry-2021' : '/marks-entry';
    navigate(path, { 
      state: { 
        loadSessionId: session.id,
        classId: session.class_id || session.classId, 
        subjectId: session.subject_id || session.subjectId,
        sessionLabel: session.session_label || session.sessionLabel
      } 
    });
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Loader size={28} />
        <p>Loading official reports portal…</p>
      </div>
    );
  }

  if (error) {
    return <div className={styles.errorState}>{error}</div>;
  }

  const summaryCards = [
    { label: 'Total Submissions', value: stats?.totalSessions ?? 0,         color: '#6C63FF' },
    { label: 'This Month',        value: stats?.submittedThisMonth ?? 0,     color: '#10B981' },
    ...(user?.role !== 'hod' && user?.role !== 'principal' && user?.role !== 'vice_principal' && user?.role !== 'admin' 
      ? [{ label: 'Avg Score /40', value: `${stats?.averageScore ?? 0}`, color: '#F59E0B' }] 
      : []),
    { label: 'Pending Drafts',    value: stats?.pendingSubmissions ?? 0,     color: '#EF4444' },
  ];

  const performanceData   = stats?.performanceData    || [];
  const subjectDist       = stats?.subjectDistribution || [];

  const canDownloadClassReports = isElevated || isCoordinatorOfSelectedClass;

  return (
    <div>
      {/* Official PDF Statement Generator Portal Box */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border-solid)',
        borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={22} color="#6C63FF" /> Official College PDF Statement Generation Portal
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Nadar Saraswathi College of Engineering &amp; Technology — Anna University Format NAC/TLP Statements
            </p>
          </div>

          {user?.isClassCoordinator && (
            <span style={{
              background: 'rgba(16, 185, 129, 0.12)', color: '#047857', border: '1px solid rgba(16, 185, 129, 0.25)',
              padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700
            }}>
              ★ Class In-charge: {user.coordinatedClasses?.[0]?.name || 'Assigned Class'}
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', margin: '20px 0' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              {user?.isClassCoordinator ? 'My In-charge / Teaching Class:' : 'Select Target Class:'}
            </label>
            <select 
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-solid)', fontSize: '0.85rem', fontWeight: 600, background: 'var(--surface-hover)', color: 'var(--text-primary)' }}
              value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}
            >
              {[...classes].sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {user?.coordinatedClassId === c.id ? '(In-charge)' : ''}
                </option>
              ))}
              {classes.length === 0 && <option value="">No Assigned Classes</option>}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Assessment Period:</label>
            <select 
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-solid)', fontSize: '0.85rem', fontWeight: 600, background: 'var(--surface-hover)', color: 'var(--text-primary)' }}
              value={sessionLabel} onChange={(e) => setSessionLabel(e.target.value)}
            >
              <option value="internal1">Internal Test 1 with Assignment (CA-1)</option>
              <option value="internal2">Internal Test 2 with Assignment (CA-2)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Subject (For Subject Report):</label>
            <select 
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-solid)', fontSize: '0.85rem', fontWeight: 600, background: 'var(--surface-hover)', color: 'var(--text-primary)' }}
              value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              {subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              {subjects.length === 0 && <option value="">No Subjects Available</option>}
            </select>
          </div>
        </div>

        {/* 1. Category 1: Subject Mark & Analysis Statements */}
        <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-solid)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
            <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#3B82F6', color: '#fff', borderRadius: '4px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 800 }}>CAT 1</span>
              Subject Mark Statements &amp; Analysis
            </h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Access: Assigned Faculty, HOD &amp; Leadership
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-start' }}>
            {/* Subject Marks Statement Card with 2 Options */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg)',
              padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-solid)'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Subject Marks Statement:
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={subjectMarksMode}
                  onChange={(e) => setSubjectMarksMode(e.target.value)}
                  style={{
                    padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-solid)',
                    fontSize: '0.8rem', fontWeight: 600, background: 'var(--surface-hover)', color: 'var(--text-primary)'
                  }}
                >
                  <option value="with_internal">With Assignment Marks</option>
                  <option value="without_internal">Without Assignment Marks</option>
                </select>
                <button
                  style={{
                    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', color: '#fff', border: 'none',
                    padding: '8px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                  onClick={handleDownloadSubjectMarksPDF}
                  disabled={genLoading || !selectedSubjectId}
                >
                  <Download size={14} /> Download Statement
                </button>
                <button
                  style={{
                    background: 'var(--surface-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-solid)',
                    padding: '8px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                  onClick={() => openSubjectSelectionModal('subject_marks_statement')}
                  disabled={genLoading || subjects.length === 0}
                  title="Select multiple subjects or Select All to download"
                >
                  <FileText size={14} color="var(--primary)" /> Select All / Multiple Subjects
                </button>
              </div>
            </div>

            {/* Subject Test Analysis Report */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg)',
              padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-solid)', justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Subject Performance Analysis:
              </span>
              <button 
                style={{
                  background: 'linear-gradient(135deg, #6C63FF 0%, #4F46E5 100%)', color: '#fff', border: 'none',
                  padding: '8px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
                onClick={handleDownloadSubjectPDF}
                disabled={genLoading || !selectedSubjectId}
              >
                <Download size={14} /> Subject Test Analysis Report (NAC/TLP-07a.21)
              </button>
            </div>
          </div>
        </div>

        {/* 2. Category 2: Class Reports & ExamCell Statements */}
        <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-solid)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
            <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#059669', color: '#fff', borderRadius: '4px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 800 }}>CAT 2</span>
              Class Reports &amp; ExamCell Statements
            </h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Access: Class In-charge, HOD &amp; Leadership
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-start' }}>
            {canDownloadClassReports ? (
              <>
                <button 
                  style={{
                    background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)', color: '#fff', border: 'none',
                    padding: '10px 16px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px', height: 'fit-content', marginTop: 'auto'
                  }}
                  onClick={() => openSubjectSelectionModal('consolidated_statement')}
                  disabled={genLoading || !selectedClassId}
                >
                  <Download size={15} /> Consolidated Mark Statement (NAC/TLP-07a.20)
                </button>

                <button 
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff', border: 'none',
                    padding: '10px 16px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px', height: 'fit-content', marginTop: 'auto'
                  }}
                  onClick={() => openSubjectSelectionModal('class_analysis')}
                  disabled={genLoading || !selectedClassId}
                >
                  <Download size={15} /> Class Performance Report (NAC/TLP-20)
                </button>

                {/* ExamCell Legal Statement Box with 2 Options */}
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg)',
                  padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-solid)'
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    ExamCell Legal Statement (Official Legal Size):
                  </span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                      value={legalMarksMode}
                      onChange={(e) => setLegalMarksMode(e.target.value)}
                      style={{
                        padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-solid)',
                        fontSize: '0.75rem', fontWeight: 600, background: 'var(--surface-hover)', color: 'var(--text-primary)'
                      }}
                    >
                      <option value="with_internal">With Assignment Marks</option>
                      <option value="without_internal">Without Assignment Marks</option>
                    </select>

                    <input 
                      type="date" 
                      value={overallFromDate} 
                      onChange={e => setOverallFromDate(e.target.value)}
                      style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-solid)', fontSize: '0.75rem', color: 'var(--text-primary)', background: 'var(--surface-hover)' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>to</span>
                    <input 
                      type="date" 
                      value={overallToDate} 
                      onChange={e => setOverallToDate(e.target.value)}
                      style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-solid)', fontSize: '0.75rem', color: 'var(--text-primary)', background: 'var(--surface-hover)' }}
                    />
                  </div>
                  <button 
                    style={{
                      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: '#fff', border: 'none',
                      padding: '8px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', justifyContent: 'center'
                    }}
                    onClick={() => openSubjectSelectionModal('examcell_legal')}
                    disabled={genLoading || !selectedClassId}
                  >
                    <FileText size={14} /> Generate ExamCell Legal Statement
                  </button>
                </div>
              </>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                🔒 Class Performance, Consolidated, &amp; ExamCell Legal Statements are generated by the Class In-charge &amp; HOD.
              </div>
            )}
          </div>
        </div>

        {/* 3. Category 3: Department Continuous Assessment (HOD Marks) */}
        {(user?.role === 'hod' || isElevated) && (
          <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-solid)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#EC4899', color: '#fff', borderRadius: '4px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 800 }}>CAT 3</span>
                Department Continuous Assessment (HOD Marks)
              </h4>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Access: Head of Department &amp; College Leadership
              </span>
            </div>

            <div style={{ padding: '15px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border-solid)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {user?.role !== 'hod' && (
                    <select
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                      style={{
                        padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-solid)',
                        fontSize: '0.82rem', fontWeight: 700, background: 'var(--surface-hover)', color: 'var(--text-primary)'
                      }}
                    >
                      <option value="Information Technology">Information Technology</option>
                      <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                      <option value="Artificial Intelligence and Data Science">Artificial Intelligence and Data Science</option>
                      <option value="Electronics and Communication Engineering">Electronics and Communication Engineering</option>
                      <option value="Electrical and Electronics Engineering">Electrical and Electronics Engineering</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Civil Engineering">Civil Engineering</option>
                      <option value="Science and Humanities">Science and Humanities</option>
                    </select>
                  )}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Continuous Assessment Pass % for <strong>{user?.role === 'hod' ? user.department : selectedDept}</strong>
                  </span>
                </div>

                <button 
                  style={{
                    background: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)', color: '#fff', border: 'none',
                    padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                  onClick={() => handleDownloadHodPDF()}
                  disabled={genLoading || !hodMarksData}
                >
                  <Download size={14} /> Download HOD Marks (PDF)
                </button>
              </div>
              
              {hodMarksLoading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Loader size={18} className="spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }} />
                  Loading year-wise continuous assessment marks...
                </div>
              ) : hodMarksData ? (
                <div style={{ overflowX: 'auto', marginTop: '10px' }}>
                  <table className={styles.table} style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '10px', borderBottom: '2px solid var(--border-solid)', color: 'var(--text-secondary)' }}>Year / Sem</th>
                        <th style={{ textAlign: 'center', padding: '10px', borderBottom: '2px solid var(--border-solid)', color: 'var(--text-secondary)' }}>Total Students</th>
                        <th style={{ textAlign: 'center', padding: '10px', borderBottom: '2px solid var(--border-solid)', color: 'var(--text-secondary)' }}>Passed Students</th>
                        <th style={{ textAlign: 'center', padding: '10px', borderBottom: '2px solid var(--border-solid)', color: 'var(--text-secondary)' }}>Failed Students</th>
                        <th style={{ textAlign: 'center', padding: '10px', borderBottom: '2px solid var(--border-solid)', color: 'var(--text-secondary)' }}>Pass %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hodMarksData.years.map((y, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-solid)' }}>
                          <td style={{ padding: '10px', fontWeight: 600 }}>{y.year} Year (Sem {y.semester})</td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>{y.strength}</td>
                          <td style={{ padding: '10px', textAlign: 'center', color: '#10B981', fontWeight: 600 }}>{y.passed}</td>
                          <td style={{ padding: '10px', textAlign: 'center', color: y.failed > 0 ? '#EF4444' : 'var(--text-secondary)', fontWeight: 600 }}>{y.failed}</td>
                          <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{y.passPct}%</td>
                        </tr>
                      ))}
                      <tr style={{ background: 'var(--surface-hover)' }}>
                        <td style={{ padding: '10px', fontWeight: 700 }}>OVERALL TOTAL</td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700 }}>{hodMarksData.overall.strength}</td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700, color: '#10B981' }}>{hodMarksData.overall.passed}</td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700, color: hodMarksData.overall.failed > 0 ? '#EF4444' : 'inherit' }}>{hodMarksData.overall.failed}</td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{hodMarksData.overall.passPct}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '15px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No continuous assessment marks recorded yet for this session.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Category 4: College Executive Reports (Principal & Leadership) */}
        {(user?.role === 'principal' || user?.role === 'vice_principal' || user?.role === 'admin') && (
          <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-solid)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#800000', color: '#fff', borderRadius: '4px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 800 }}>CAT 4</span>
                College Executive Reports
              </h4>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Access: Principal, Vice Principal &amp; Admin
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
              <button 
                style={{
                  background: 'linear-gradient(135deg, #800000 0%, #5B0000 100%)', color: '#fff', border: 'none',
                  padding: '10px 18px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
                onClick={handleDownloadCollegeOverview}
                disabled={genLoading}
              >
                <Download size={15} /> Download College Overview (PDF)
              </button>

              <button 
                style={{
                  background: 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)', color: '#fff', border: 'none',
                  padding: '10px 18px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
                onClick={handleDownloadContinuousAssessmentPDF}
                disabled={genLoading}
              >
                <FileText size={15} /> Continuous Assessment Analysis (PDF)
              </button>

              <button 
                style={{
                  background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border-solid)',
                  padding: '10px 18px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
                onClick={handleExportContinuousAssessmentCSV}
                disabled={genLoading}
              >
                <Download size={15} color="#10B981" /> Export CA Analysis (CSV)
              </button>
            </div>
          </div>
        )}

        {/* Class Coordinator Remarks (Only visible if role allows) */}
        {canDownloadClassReports && (
          <div style={{ marginTop: '26px', padding: '18px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border-solid)' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              Class In-charge Remarks &amp; Action Plan (For Class Analysis Report)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea 
                placeholder="Overall Class Performance Remarks..." 
                value={classRemarks} 
                onChange={e => setClassRemarks(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-solid)', minHeight: '55px', resize: 'vertical', fontSize: '0.85rem', background: 'var(--surface-hover)', color: 'var(--text-primary)' }}
              />
              <textarea 
                placeholder="Remedial / Improvement Plan for the Class..." 
                value={improvementPlan} 
                onChange={e => setImprovementPlan(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-solid)', minHeight: '55px', resize: 'vertical', fontSize: '0.85rem', background: 'var(--surface-hover)', color: 'var(--text-primary)' }}
              />
              <button 
                onClick={handleSaveRemarks}
                disabled={savingRemarks}
                style={{ alignSelf: 'flex-start', background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem' }}
              >
                {savingRemarks ? 'Saving...' : 'Save Remarks for PDF'}
              </button>
            </div>
          </div>
        )}
      </div>

      <DeclarationModal 
        isOpen={declarationModalOpen} 
        onClose={() => setDeclarationModalOpen(false)} 
        onSubmit={handleGenerateSubjectPDF}
        session={pdfPayload?.session}
      />

      <SubjectSelectionModal
        isOpen={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        onSubmit={handleDownloadClassPDF}
        subjects={subjects.filter(s => s.code !== 'LIB' && s.name.toUpperCase() !== 'LIBRARY')}
      />

      {/* Summary Row */}
      <div className={styles.summaryRow}>
        {summaryCards.map((s) => (
          <div key={s.label} className={styles.summaryCard} style={{ '--c': s.color }}>
            <div className={styles.summaryVal} style={{ color: s.color }}>{s.value}</div>
            <div className={styles.summaryLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Year-wise Continuous Assessment Pass Percentage Section (Available for Everyone's Panel) */}
      {hodMarksData && Array.isArray(hodMarksData.years) && hodMarksData.years.length > 0 && (
        <div style={{ marginTop: '24px', marginBottom: '32px' }}>
          <div className={styles.chartCard} style={{ marginBottom: '20px', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 className={styles.chartTitle} style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                  Academic Year-wise Continuous Assessment Pass %
                </h3>
                <p className={styles.chartSub} style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
                  Overall pass performance across all academic years for <strong>{user?.role === 'hod' ? (user.department || 'Department') : selectedDept}</strong>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Overall Pass Rate:
                </span>
                <span style={{ 
                  fontSize: '0.98rem', fontWeight: 700, 
                  color: parseFloat(hodMarksData.overall?.passPct) >= 75 ? '#059669' : '#2563EB',
                  background: 'rgba(37,99,235,0.08)', padding: '4px 12px', borderRadius: '12px',
                  border: '1px solid rgba(37,99,235,0.18)'
                }}>
                  {hodMarksData.overall?.passPct || '80.00'}%
                </span>
              </div>
            </div>

            <div style={{ width: '100%', minHeight: '260px' }}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={hodMarksData.years.map((y) => ({
                    name: `Year ${y.year}`,
                    pass: parseFloat(y.passPct) || 0,
                    year: y.year,
                    strength: y.strength,
                    passed: y.passed,
                    failed: y.failed
                  }))}
                  margin={{ top: 25, right: 20, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(108,99,255,0.08)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 13, fill: 'var(--text-secondary)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className={styles.tooltip}>
                            <p className={styles.ttLabel}>{d.name}</p>
                            <p className={styles.ttVal} style={{ color: payload[0].fill }}>
                              Pass Percentage: <strong>{d.pass}%</strong>
                            </p>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                              Strength: {d.strength} | Passed: {d.passed} | Failed: {d.failed}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="pass" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {hodMarksData.years.map((y, idx) => {
                      const barColors = ['#3B82F6', '#6C63FF', '#10B981', '#F59E0B'];
                      return <Cell key={`bar-${idx}`} fill={barColors[idx % barColors.length]} />;
                    })}
                    <LabelList dataKey="pass" position="top" formatter={(val) => `${val}%`} fontSize={13} fill="var(--text-primary)" fontWeight={600} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Year Breakdown Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '18px' }}>
            {hodMarksData.years.map((y, idx) => {
              const barColors = ['#3B82F6', '#6C63FF', '#10B981', '#F59E0B'];
              const barColor = barColors[idx % barColors.length];
              return (
                <div key={idx} className={styles.chartCard} style={{ padding: '16px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 className={styles.chartTitle} style={{ margin: 0, fontSize: '0.96rem' }}>Year {y.year} Assessment</h4>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface-hover)', padding: '2px 8px', borderRadius: '6px' }}>Sem {y.semester}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    <span>Strength: <strong>{y.strength}</strong></span>
                    <span>Passed: <strong style={{ color: '#059669' }}>{y.passed}</strong></span>
                    <span>Failed: <strong style={{ color: '#dc2626' }}>{y.failed}</strong></span>
                  </div>
                  <div style={{ width: '100%', minHeight: '160px' }}>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={[{ name: `${y.year} Year`, pass: parseFloat(y.passPct) || 0 }]} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} formatter={(val) => [`${val}%`, 'Pass Percentage']} />
                        <Bar dataKey="pass" radius={[6, 6, 0, 0]} maxBarSize={50}>
                          <Cell fill={barColor} />
                          <LabelList dataKey="pass" position="top" formatter={(val) => `${val}%`} fontSize={12} fill="var(--text-primary)" fontWeight={600} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                <tr 
                  key={e.id} 
                  onClick={() => handleHistoryRowClick(e)}
                  style={{ cursor: 'pointer' }}
                  className={styles.clickableRow}
                >
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

      <ReportPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        onDownloadPDF={(opts) => {
          executePreviewPDF(opts);
          setPreviewModalOpen(false);
        }}
        onDownloadExcel={(opts) => {
          executePreviewExcel(opts);
          setPreviewModalOpen(false);
        }}
        reportType={previewPayload?.reportType || 'subject_marks'}
        title={
          previewPayload?.reportType === 'subject_analysis' ? `Subject Test Analysis (NAC/TLP-07a.21) — ${previewPayload?.subject?.code || ''}` :
          previewPayload?.reportType === 'examcell_legal' ? `ExamCell Legal Statement — ${previewPayload?.classObj?.name || ''}` :
          previewPayload?.reportType === 'consolidated_statement' ? `Consolidated Mark Statement (TLP-07a.20) — ${previewPayload?.classObj?.name || ''}` :
          previewPayload?.reportType === 'class_analysis' ? `Class Performance Report (TLP-20) — ${previewPayload?.classObj?.name || ''}` :
          previewPayload?.reportType === 'batch_subject_marks' ? `Batch Subject Statements Preview — ${previewPayload?.classObj?.name || ''}` :
          `Report Preview — ${previewPayload?.subject?.code || ''} ${previewPayload?.subject?.name || ''}`
        }
        subject={previewPayload?.subject}
        classObj={previewPayload?.classObj}
        staff={previewPayload?.staff}
        assessmentMode={previewPayload?.assessmentMode || sessionLabel}
        withInternal={previewPayload?.withInternal !== undefined ? previewPayload?.withInternal : (subjectMarksMode === 'with_internal')}
        students={previewPayload?.students || []}
        marksData={previewPayload?.marksData || {}}
        attendanceData={previewPayload?.attendanceData || {}}
        attendanceMarks={previewPayload?.attendanceMarks || {}}
        internalExamData={previewPayload?.internalExamData || {}}
        labData={previewPayload?.labData || {}}
        components={previewPayload?.components || []}
        totalHours={previewPayload?.totalHours || 30}
        int1Hours={previewPayload?.int1Hours || 30}
        int2Hours={previewPayload?.int2Hours || 30}
        labHours={previewPayload?.labHours || 0}
        int1AttendanceData={previewPayload?.int1AttendanceData || {}}
        regulation={previewPayload?.is2021 ? '2021' : '2025'}
        subjects={previewPayload?.subjects || []}
        allSessions={previewPayload?.allSessions || []}
        allAttendance={previewPayload?.allAttendance || []}
        allMarks={previewPayload?.allMarks || []}
        allComponents={previewPayload?.allComponents || []}
        selectedSubjectIds={previewPayload?.selectedSubjectIds || []}
        declarationData={previewPayload?.declarationData || {}}
        classRemarks={previewPayload?.classRemarks || classRemarks}
        remedialAction={previewPayload?.remedialAction || improvementPlan}
      />
    </div>
  );
}
