import { useState, useEffect, useMemo, Fragment } from 'react';
import { 
  Users, Building, UserCheck, Activity,
  TrendingUp, Award, FileText, Download, FileSpreadsheet, GraduationCap
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { statsAPI, classesAPI, subjectsAPI } from '../../services/api';
import { generateCollegeOverviewPDF, generateContinuousAssessmentAnalysisPDF } from '../../services/pdfReportGenerator';
import { useAuth } from '../../context/AuthContext';
import { ACADEMIC_UNITS_METRICS, getPGProgrammeByClass, PG_PROGRAMMES } from '../../utils/academicProgrammes';
import AssessmentStatusCard from './AssessmentStatusCard';
import styles from './PrincipalDashboard.module.css';

const DemographicsTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className={styles.customTooltip}>
        <div style={{ fontWeight: 700, color: d.color, marginBottom: '2px' }}>{d.fullName}</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Students: <strong>{d.value}</strong> ({d.pct}%)
        </div>
      </div>
    );
  }
  return null;
};

export default function PrincipalDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [caData, setCaData] = useState(null);
  const [caMode, setCaMode] = useState('internal1');
  const [loading, setLoading] = useState(true);
  const [caLoading, setCaLoading] = useState(false);
  const [error, setError] = useState('');
  const [classesList, setClassesList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);

  // Compute live PG student strength from actual class records (zero hardcoding)
  const pgStudentsCount = useMemo(() => {
    return (classesList || []).filter(c => {
      const isPG = getPGProgrammeByClass(c);
      return Boolean(isPG);
    }).reduce((sum, c) => sum + (parseInt(c.student_count, 10) || 0), 0);
  }, [classesList]);

  // Load college overview stats
  useEffect(() => {
    statsAPI.getCollegeStats()
      .then((res) => {
        setData(res);
      })
      .catch(() => setError('Failed to load college statistics.'))
      .finally(() => setLoading(false));

    classesAPI.getAll()
      .then((res) => setClassesList(Array.isArray(res) ? res : []))
      .catch(() => {});

    subjectsAPI.getAll()
      .then((res) => setSubjectsList(Array.isArray(res) ? res : []))
      .catch(() => {});
  }, []);

  // Load Continuous Assessment Analysis data
  useEffect(() => {
    setCaLoading(true);
    statsAPI.getContinuousAssessment(caMode)
      .then((res) => {
        setCaData(res);
      })
      .catch((err) => console.error('Failed to load CA stats:', err))
      .finally(() => setCaLoading(false));
  }, [caMode]);

  const handleDownloadOverviewReport = async () => {
    try {
      await generateCollegeOverviewPDF({
        overview: data.overview,
        departmentStats: data.departmentStats,
        user
      });
    } catch (err) {
      alert('Failed to generate overview report: ' + err.message);
    }
  };

  // Deduplicate and sanitize CA departments: under Science & Humanities, remove unwanted general I CSE entry
  const sanitizedCaDepartments = useMemo(() => {
    if (!caData?.departments) return [];
    return caData.departments.map(dept => {
      const full = (dept.departmentFullName || '').toLowerCase();
      const short = (dept.department || '').toLowerCase();
      const isComputer = full.includes('computer') || short.includes('cse');
      const isSH = !isComputer && (full.includes('science') || full.includes('humanities') || short.includes('science') || short.includes('s&h'));
      if (!isSH || !Array.isArray(dept.years)) return dept;

      const hasCseSectioned = dept.years.some(yr => {
        const y = String(yr.year || '').toUpperCase();
        return y.includes('CSE-A') || y.includes('CSE A') || y.includes('CSE_A') ||
               y.includes('CSE-B') || y.includes('CSE B') || y.includes('CSE_B');
      });

      if (!hasCseSectioned) return dept;

      const filteredYears = dept.years.filter(yr => {
        const y = String(yr.year || '').trim().toUpperCase();
        const isCse = y.includes('CSE');
        const isSectioned = y.includes('CSE-A') || y.includes('CSE A') || y.includes('CSE_A') ||
                            y.includes('CSE-B') || y.includes('CSE B') || y.includes('CSE_B');
        return !(isCse && !isSectioned);
      });

      const deptStrength = filteredYears.reduce((acc, y) => acc + (parseInt(y.strength) || 0), 0);
      const deptPassed = filteredYears.reduce((acc, y) => acc + (parseInt(y.passed) || 0), 0);
      const deptOverallPct = deptStrength > 0 ? ((deptPassed / deptStrength) * 100).toFixed(2) : '0.00';

      return {
        ...dept,
        years: filteredYears,
        deptStrength,
        deptPassed,
        deptOverallPct
      };
    });
  }, [caData]);

  const sanitizedSummary = useMemo(() => {
    if (!caData?.summary) return null;
    const shDept = (sanitizedCaDepartments || []).find(d => 
      (d.department || '').toLowerCase().includes('science') ||
      (d.departmentFullName || '').toLowerCase().includes('science')
    );
    const shStrength = shDept?.deptStrength ?? (caData.summary.firstYear?.strength || 0);
    const shPassed = shDept?.deptPassed ?? (caData.summary.firstYear?.passed || 0);
    const shPct = shStrength > 0 ? ((shPassed / shStrength) * 100).toFixed(2) : '0.00';

    const ugWithoutFirstYearStrength = caData.summary.withoutFirstYear?.strength || 0;
    const ugWithoutFirstYearPassed = caData.summary.withoutFirstYear?.passed || 0;
    const ugWithoutFirstYearPct = caData.summary.withoutFirstYear?.percentage || '0.00';

    const ugOverallStrength = ugWithoutFirstYearStrength + shStrength;
    const ugOverallPassed = ugWithoutFirstYearPassed + shPassed;
    const ugOverallPct = ugOverallStrength > 0 ? ((ugOverallPassed / ugOverallStrength) * 100).toFixed(2) : '0.00';

    const pgStrength = caData.summary?.pgSummary?.strength > 0
      ? caData.summary.pgSummary.strength
      : (pgStudentsCount || 0);
    const pgPassed = caData.summary?.pgSummary?.passed || 0;
    const pgMarksEntered = Boolean(caData.summary?.pgSummary?.marksStatus === 'Completed' || pgPassed > 0);

    const totalCollegeStrength = ugOverallStrength + pgStrength;
    const totalCollegePassed = ugOverallPassed + pgPassed;
    const totalCollegePct = pgMarksEntered && totalCollegeStrength > 0
      ? ((totalCollegePassed / totalCollegeStrength) * 100).toFixed(2)
      : null;

    return {
      withoutFirstYear: {
        strength: ugWithoutFirstYearStrength,
        passed: ugWithoutFirstYearPassed,
        percentage: ugWithoutFirstYearPct
      },
      firstYear: {
        strength: shStrength,
        passed: shPassed,
        percentage: shPct
      },
      ugOverall: {
        strength: ugOverallStrength,
        passed: ugOverallPassed,
        percentage: ugOverallPct
      },
      collegeOverall: {
        strength: totalCollegeStrength,
        passed: totalCollegePassed,
        percentage: totalCollegePct,
        pgAwaitingMarks: !pgMarksEntered
      },
      pgSummary: {
        strength: pgStrength,
        passed: pgPassed,
        marksStatus: caData.summary?.pgSummary?.marksStatus || 'Not Started',
        resultStatus: caData.summary?.pgSummary?.resultStatus || 'Awaiting Marks',
        percentage: caData.summary?.pgSummary?.percentage || null
      }
    };
  }, [caData, sanitizedCaDepartments, pgStudentsCount]);

  // Derive robust, accurate PG programme statistics from backend data with dynamic fallback
  const sanitizedPgProgrammes = useMemo(() => {
    // Group classesList by PG Programme for accurate fallback and detailed semester views
    const pgClassesByCode = {};
    (classesList || []).forEach(c => {
      const prog = getPGProgrammeByClass(c);
      if (prog) {
        if (!pgClassesByCode[prog.code]) pgClassesByCode[prog.code] = [];
        pgClassesByCode[prog.code].push(c);
      }
    });

    return PG_PROGRAMMES.map(baseProg => {
      const backendProg = (caData?.pgProgrammes || []).find(p => p.programmeCode === baseProg.code);
      const classesForProg = pgClassesByCode[baseProg.code] || [];

      // Primary source of truth is actual student records / enrolled count; if backend returns 0 or missing, fall back to class list count
      const classListStrength = classesForProg.reduce((sum, c) => sum + (parseInt(c.student_count, 10) || 0), 0);
      const progStrength = (backendProg && backendProg.progStrength > 0)
        ? backendProg.progStrength
        : classListStrength;

      // Construct Year I and Year II
      const years = ['I', 'II'].map(yLabel => {
        const backendYear = backendProg?.years?.find(y => y.yearLabel === yLabel);
        const yClasses = classesForProg.filter(c => 
          String(c.year_label || '').toUpperCase() === yLabel ||
          (yLabel === 'I' && (c.semester == 1 || c.semester == 2)) ||
          (yLabel === 'II' && (c.semester == 3 || c.semester == 4))
        );
        const yStrength = (backendYear && backendYear.strength > 0)
          ? backendYear.strength
          : yClasses.reduce((sum, c) => sum + (parseInt(c.student_count, 10) || 0), 0);
        
        // Merge classes from backend and/or classesList
        const combinedClasses = (backendYear?.classes && backendYear.classes.length > 0)
          ? backendYear.classes
          : yClasses.map(c => ({
              id: c.id,
              name: c.name,
              semester: c.semester,
              year_label: c.year_label,
              student_count: parseInt(c.student_count, 10) || 0
            }));

        const hasMarks = backendYear?.percentage !== null && backendYear?.percentage !== undefined;
        const marksStatus = yStrength === 0 
          ? 'No Active Batch' 
          : (backendYear?.marksStatus || (hasMarks ? 'Completed' : 'Marks Entry: Not Started'));
        const resultStatus = yStrength === 0 
          ? 'Future Batch' 
          : (backendYear?.resultStatus || (hasMarks ? 'Published' : 'Awaiting Marks'));

        return {
          year: yLabel === 'I' ? 'Year I' : 'Year II',
          yearLabel: yLabel,
          strength: yStrength,
          passed: hasMarks ? (backendYear?.passed || 0) : 0,
          percentage: hasMarks ? backendYear?.percentage : null,
          marksStatus,
          resultStatus,
          classes: combinedClasses
        };
      });

      // Active status description
      const activeYears = years.filter(yr => yr.strength > 0 || (yr.classes && yr.classes.length > 0));
      let batchStatus = 'No Active Batch';
      if (activeYears.length === 2) {
        batchStatus = 'Active: I & II Year';
      } else if (activeYears.length === 1) {
        const yr = activeYears[0];
        const semList = yr.classes.map(c => `Sem ${c.semester}`).filter(Boolean);
        const semStr = semList.length > 0 ? ` (${[...new Set(semList)].join(', ')})` : '';
        batchStatus = `Active: ${yr.yearLabel} Year${semStr}`;
      }

      return {
        programmeCode: baseProg.code,
        programmeName: baseProg.name,
        shortName: baseProg.shortName,
        owningDepartment: baseProg.owningDepartment,
        degreeTitle: baseProg.degreeTitle || 'M.E.',
        regulation: baseProg.regulation || '2025',
        years,
        progStrength,
        progPassed: backendProg?.progPassed || 0,
        batchStatus: backendProg?.batchStatus || batchStatus,
        marksStatus: progStrength === 0 ? 'No Active Batch' : (backendProg?.marksStatus || 'Marks Entry: Not Started'),
        resultStatus: progStrength === 0 ? 'Future Batch' : (backendProg?.resultStatus || 'Awaiting Marks'),
        progOverallPct: backendProg?.progOverallPct || null
      };
    });
  }, [caData, classesList]);

  const handleDownloadCAPDF = async () => {
    if (!caData) return;
    try {
      await generateContinuousAssessmentAnalysisPDF({
        caData: {
          ...caData,
          departments: sanitizedCaDepartments,
          pgProgrammes: sanitizedPgProgrammes,
          summary: sanitizedSummary || caData.summary
        },
        sessionLabel: caMode,
        user
      });
    } catch (err) {
      alert('Failed to generate CA report: ' + err.message);
    }
  };

  const handleExportCACSV = () => {
    if (!caData) return;
    const isCA2 = caMode === 'internal2';
    let csv = `NADAR SARASWATHI COLLEGE OF ENGINEERING AND TECHNOLOGY\n`;
    csv += `VADAPUDUPATTI, THENI - 625 531\n`;
    csv += `CONTINUOUS ASSESSMENT - ${isCA2 ? '2' : '1'} ANALYSIS\n\n`;
    csv += `Department / Programme,Year,Strength,Passed,Percentage,Percentage (Over all)\n`;

    const summary = sanitizedSummary || caData.summary;

    // 1. All 8 UG Departments
    sanitizedCaDepartments.forEach((dept) => {
      dept.years.forEach((yr, idx) => {
        const deptLabel = idx === 0 ? `"${dept.department}"` : '""';
        const deptOverall = idx === 0 ? `"${dept.deptOverallPct}%"` : '""';
        csv += `${deptLabel},"${yr.year}",${yr.strength},${yr.passed},"${yr.percentage}%",${deptOverall}\n`;
      });
    });

    // 2. All 4 PG Programmes immediately after Science & Humanities
    const exportPgList = sanitizedPgProgrammes?.length ? sanitizedPgProgrammes : (caData.pgProgrammes || []);
    (exportPgList || caData.pgProgrammes || []).forEach((prog) => {
      prog.years.forEach((yr, idx) => {
        const progLabel = idx === 0 ? `"${prog.programmeName}"` : '""';
        const yrPassed = yr.percentage !== null && yr.percentage !== undefined ? yr.passed : '—';
        const yrPct = yr.percentage !== null && yr.percentage !== undefined
          ? `"${yr.percentage}%"`
          : `"${yr.strength === 0 ? 'No Active Batch' : (yr.marksStatus || 'Marks Entry: Not Started')}"`;
        const progOverall = idx === 0
          ? (prog.progOverallPct !== null && prog.progOverallPct !== undefined
              ? `"${prog.progOverallPct}%"`
              : `"${prog.progStrength === 0 ? 'No Active Batch' : (prog.resultStatus || 'Awaiting Marks')}"`)
          : '""';
        csv += `${progLabel},"${yr.year}",${yr.strength},${yrPassed},${yrPct},${progOverall}\n`;
      });
    });

    // 3. Three Summary Rows
    // Row 1: Pass Percentage Without First Year (Years II, III, IV)
    csv += `"Pass Percentage Without First Year (Years II, III, IV)",,${summary.withoutFirstYear.strength},${summary.withoutFirstYear.passed},"${summary.withoutFirstYear.percentage}%",\n`;

    // Row 2: UG Overall Pass Percentage (Excluding PG)
    csv += `"UG Overall Pass Percentage (Excluding PG)",,${summary.ugOverall.strength},${summary.ugOverall.passed},"${summary.ugOverall.percentage}%",\n`;

    // Row 3: College Overall Pass Percentage (Including UG + PG)
    const collegePct = summary.collegeOverall.pgAwaitingMarks || summary.collegeOverall.percentage === null
      ? `"— (Awaiting PG Marks)"`
      : `"${summary.collegeOverall.percentage}%"`;
    csv += `"College Overall Pass Percentage (Including UG + PG)",,${summary.collegeOverall.strength},${summary.collegeOverall.passed},${collegePct},\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NSCET_Continuous_Assessment_${isCA2 ? '2' : '1'}_Analysis.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <div className={styles.spinner}></div>
        <p>Loading NSCET-MarkHub Executive Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorWrapper}>
        <Activity size={32} />
        <p>{error}</p>
      </div>
    );
  }

  const { overview, departmentStats } = data;

  const DEPT_SHORT_NAMES = {
    'Artificial Intelligence and Data Science': 'AI & DS',
    'Civil Engineering': 'Civil',
    'Computer Science and Engineering': 'CSE',
    'Electrical and Electronics Engineering': 'EEE',
    'Electronics and Communication Engineering': 'ECE',
    'Information Technology': 'IT',
    'Mechanical Engineering': 'Mech',
    'Science and Humanities': 'S&H (1st Yr)'
  };

  const DEPT_PALETTE = [
    '#800000', // Maroon / Primary
    '#2563EB', // Royal Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#EC4899', // Pink
    '#4F46E5'  // Indigo
  ];

  const totalStudentsCount = departmentStats.reduce((sum, d) => sum + (parseInt(d.totalStudents) || 0), 0);

  const pieData = departmentStats.map((dept, idx) => {
    const shortName = DEPT_SHORT_NAMES[dept.department] || dept.department.replace('Engineering', 'Engg');
    const color = DEPT_PALETTE[idx % DEPT_PALETTE.length];
    const val = parseInt(dept.totalStudents) || 0;
    const pct = totalStudentsCount > 0 ? ((val / totalStudentsCount) * 100).toFixed(1) : '0.0';
    return {
      name: shortName,
      fullName: dept.department,
      value: val,
      color,
      pct
    };
  });

  const barData = departmentStats
    .filter(dept => {
      const dName = (dept.department || '').toLowerCase();
      return !dName.includes('science') && !dName.includes('humanities') && !dName.includes('first year');
    })
    .map(dept => ({
      name: DEPT_SHORT_NAMES[dept.department] || dept.department.replace('Engineering', 'Engg'),
      fullName: dept.department,
      avgScore: parseFloat(dept.avgScore) || 0
    }));

  return (
    <div className={styles.principalContainer}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Executive Dashboard
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Centralized Academic Performance & Continuous Assessment Reports
          </p>
        </div>
        <button 
          onClick={handleDownloadOverviewReport}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: 'var(--primary)', color: '#fff', 
            padding: '8px 16px', borderRadius: '8px', 
            border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600'
          }}
        >
          <Download size={15} /> Download College Overview
        </button>
      </div>

      {/* Overview Stats Grid: 4 Core Institutional KPI Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563EB' }}>
            <Building size={24} />
          </div>
          <div className={styles.statInfo}>
            <h3>UG Departments</h3>
            <h2>{ACADEMIC_UNITS_METRICS.ugDepartmentsCount}</h2>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED' }}>
            <GraduationCap size={24} />
          </div>
          <div className={styles.statInfo}>
            <h3>PG Programmes</h3>
            <h2>{ACADEMIC_UNITS_METRICS.pgProgrammesCount}</h2>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <Award size={24} />
          </div>
          <div className={styles.statInfo}>
            <h3>Total Academic Units</h3>
            <h2>{ACADEMIC_UNITS_METRICS.totalAcademicUnits}</h2>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#EC4899' }}>
            <Users size={24} />
          </div>
          <div className={styles.statInfo}>
            <h3>PG Student Strength</h3>
            <h2>{(caData?.summary?.pgSummary?.strength > 0 ? caData.summary.pgSummary.strength : (pgStudentsCount || 0))}</h2>
          </div>
        </div>
      </div>

      {/* Official Continuous Assessment Analysis Card */}
      <div className={styles.caCard}>
        <div className={styles.caHeader}>
          <div className={styles.caHeaderLeft}>
            <h3>Continuous Assessment Performance Analysis</h3>
            <p>Official Department-wise &amp; Year-wise Pass Statistics Format</p>
          </div>

          <div className={styles.caActions}>
            <div className={styles.pillSelector}>
              <button 
                type="button" 
                className={`${styles.pillBtn} ${caMode === 'internal1' ? styles.pillActive : ''}`}
                onClick={() => setCaMode('internal1')}
              >
                Internal 1 (CA-1)
              </button>
              <button 
                type="button" 
                className={`${styles.pillBtn} ${caMode === 'internal2' ? styles.pillActive : ''}`}
                onClick={() => setCaMode('internal2')}
              >
                Internal 2 (CA-2)
              </button>
            </div>

            <button 
              onClick={handleDownloadCAPDF}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: '#800000', color: '#fff',
                padding: '7px 14px', borderRadius: '6px',
                border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600'
              }}
            >
              <Download size={14} /> PDF Report
            </button>

            <button 
              onClick={handleExportCACSV}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'var(--surface)', color: 'var(--text-primary)',
                border: '1px solid var(--border-solid)',
                padding: '7px 14px', borderRadius: '6px',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600'
              }}
            >
              <FileSpreadsheet size={14} color="#10B981" /> Export CSV
            </button>
          </div>
        </div>

        {caLoading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
            <div className={styles.spinner} style={{ margin: '0 auto 10px' }} />
            Calculating Continuous Assessment Statistics...
          </div>
        ) : caData ? (
          <div className={styles.tableWrapper}>
            <table className={styles.caTable}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingLeft: '16px' }}>Department / Programme</th>
                  <th>Year</th>
                  <th>Strength</th>
                  <th>Passed</th>
                  <th>Percentage (%)</th>
                  <th>Percentage (Overall)</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Undergraduate Departments (8 Departments) */}
                {sanitizedCaDepartments.map((dept, dIdx) => (
                  dept.years.map((yr, yIdx) => (
                    <tr key={`ug-${dIdx}-${yIdx}`}>
                      {yIdx === 0 && (
                        <td 
                          rowSpan={dept.years.length} 
                          className={`${styles.caDeptCell} ${dept.department.toLowerCase().includes('science') ? styles.caDeptCellCenter : ''}`}
                        >
                          {dept.department}
                        </td>
                      )}
                      <td style={{ 
                        fontWeight: 600, 
                        textAlign: 'center' 
                      }}>
                        {yr.year}
                      </td>
                      <td>{yr.strength}</td>
                      <td>{yr.passed}</td>
                      <td style={{ fontWeight: 600, color: parseFloat(yr.percentage) >= 75 ? '#059669' : parseFloat(yr.percentage) >= 50 ? '#d97706' : '#dc2626' }}>
                        {yr.percentage}%
                      </td>
                      {yIdx === 0 && (
                        <td 
                          rowSpan={dept.years.length} 
                          className={styles.caDeptOverallCell}
                        >
                          {dept.deptOverallPct}%
                        </td>
                      )}
                    </tr>
                  ))
                ))}

                {/* 2. Postgraduate Programmes Section Divider */}
                <tr key="pg-section-divider" style={{ background: 'rgba(124, 58, 237, 0.08)', borderTop: '2px solid #7C3AED', borderBottom: '1px solid #7C3AED' }}>
                  <td colSpan={6} style={{ padding: '8px 16px', fontWeight: 800, color: '#6D28D9', fontSize: '0.82rem', letterSpacing: '0.5px', textAlign: 'left' }}>
                    POSTGRADUATE PROGRAMMES (Anna University M.E. Regulation 2025)
                  </td>
                </tr>

                {/* 3. Postgraduate Programmes (4 M.E. Programmes, 2 rows each: Year I and Year II) */}
                {sanitizedPgProgrammes.map((prog, pIdx) => (
                  <Fragment key={prog.programmeCode}>
                    {prog.years.map((yr, yIdx) => {
                      const hasMarks = yr.percentage !== null && yr.percentage !== undefined;
                      const yrPassedDisplay = hasMarks ? yr.passed : '—';
                      const yrPctDisplay = hasMarks ? (
                        <span style={{ fontWeight: 600, color: parseFloat(yr.percentage) >= 75 ? '#059669' : parseFloat(yr.percentage) >= 50 ? '#d97706' : '#dc2626' }}>
                          {yr.percentage}%
                        </span>
                      ) : (
                        <span style={{ color: yr.strength === 0 ? 'var(--text-muted)' : '#d97706', fontSize: '0.80rem', fontStyle: yr.strength === 0 ? 'italic' : 'normal', fontWeight: yr.strength === 0 ? 500 : 600 }}>
                          {yr.strength === 0 ? 'No Active Batch' : (yr.marksStatus || 'Marks Entry: Not Started')}
                        </span>
                      );

                      const hasProgOverall = prog.progOverallPct !== null && prog.progOverallPct !== undefined;
                      const progOverallDisplay = hasProgOverall ? (
                        `${prog.progOverallPct}%`
                      ) : (
                        <span style={{ color: prog.progStrength === 0 ? 'var(--text-muted)' : '#64748b', fontSize: '0.80rem', fontStyle: prog.progStrength === 0 ? 'italic' : 'normal', fontWeight: prog.progStrength === 0 ? 500 : 600 }}>
                          {prog.progStrength === 0 ? 'No Active Batch' : (prog.resultStatus || 'Awaiting Marks')}
                        </span>
                      );

                      return (
                        <tr key={`pg-${pIdx}-${yIdx}`}>
                          {yIdx === 0 && (
                            <td 
                              rowSpan={prog.years.length} 
                              className={styles.caDeptCell}
                              style={{ borderLeft: '3px solid #7C3AED' }}
                            >
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                {prog.programmeName}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
                                {prog.owningDepartment ? `Dept of ${prog.owningDepartment}` : ''} · M.E. R2025
                              </div>
                            </td>
                          )}
                          <td style={{ 
                            fontWeight: 600, 
                            textAlign: 'center' 
                          }}>
                            {yr.year}
                          </td>
                          <td>{yr.strength}</td>
                          <td>{yrPassedDisplay}</td>
                          <td>{yrPctDisplay}</td>
                          {yIdx === 0 && (
                            <td 
                              rowSpan={prog.years.length} 
                              className={styles.caDeptOverallCell}
                            >
                              {progOverallDisplay}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}

                {/* 4. Three Required Institutional Summary Rows */}

                {/* Summary Row 1: Without First Year (Years II, III, IV) */}
                <tr className={styles.caSummaryRow}>
                  <td colSpan={2} style={{ textAlign: 'left', paddingLeft: '16px', fontWeight: 700 }}>
                    Pass Percentage Without First Year (Years II, III, IV)
                  </td>
                  <td style={{ fontWeight: 700 }}>{(sanitizedSummary || caData.summary).withoutFirstYear.strength}</td>
                  <td style={{ fontWeight: 700 }}>{(sanitizedSummary || caData.summary).withoutFirstYear.passed}</td>
                  <td colSpan={2} style={{ color: '#800000', fontSize: '0.92rem', fontWeight: 800 }}>
                    {(sanitizedSummary || caData.summary).withoutFirstYear.percentage}%
                  </td>
                </tr>

                {/* Summary Row 2: UG Overall Pass Percentage (Excluding PG) */}
                <tr className={styles.caSummaryRow} style={{ background: '#f8fafc', borderTop: '1px solid var(--border-solid)' }}>
                  <td colSpan={2} style={{ textAlign: 'left', paddingLeft: '16px', fontWeight: 700, color: '#1E3A8A' }}>
                    UG Overall Pass Percentage (Excluding PG)
                  </td>
                  <td style={{ fontWeight: 700 }}>{(sanitizedSummary || caData.summary).ugOverall.strength}</td>
                  <td style={{ fontWeight: 700 }}>{(sanitizedSummary || caData.summary).ugOverall.passed}</td>
                  <td colSpan={2} style={{ color: '#1E3A8A', fontSize: '0.92rem', fontWeight: 800 }}>
                    {(sanitizedSummary || caData.summary).ugOverall.percentage}%
                  </td>
                </tr>

                {/* Summary Row 3: College Overall Pass Percentage (Including UG + PG) */}
                <tr className={styles.caOverallRow}>
                  <td colSpan={2} style={{ textAlign: 'left', paddingLeft: '16px', fontWeight: 800 }}>
                    College Overall Pass Percentage (Including UG + PG)
                  </td>
                  <td style={{ fontWeight: 800 }}>{(sanitizedSummary || caData.summary).collegeOverall.strength}</td>
                  <td style={{ fontWeight: 800 }}>{(sanitizedSummary || caData.summary).collegeOverall.passed}</td>
                  <td colSpan={2} style={{ fontSize: '0.95rem', fontWeight: 800 }}>
                    {(sanitizedSummary || caData.summary).collegeOverall.pgAwaitingMarks || (sanitizedSummary || caData.summary).collegeOverall.percentage === null ? (
                      <span style={{ color: '#d97706', fontWeight: 700 }}>
                        — (Awaiting PG Marks)
                      </span>
                    ) : (
                      `${(sanitizedSummary || caData.summary).collegeOverall.percentage}%`
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{
              padding: '12px 20px',
              background: 'var(--bg)',
              borderTop: '1px solid var(--border-solid)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <span>
                <strong style={{ color: 'var(--text-primary)' }}>Institutional Structure:</strong> 8 UG Departments (R2021) + 4 PG Programmes (R2025) = 12 Total Academic Units.
              </span>
              <span style={{ fontStyle: 'italic' }}>
                Dynamic enrollment from live database · Zero duplicate counts
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Principal College-Wide IA1 & IA2 Mark Entry Monitoring */}
      <AssessmentStatusCard role="principal" />

      {/* Charts Section */}
      <div className={styles.chartsWrapper}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <TrendingUp size={20} className={styles.chartIcon} />
            <div>
              <h3>Department Performance (Avg Score)</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Continuous assessment averages by department
              </p>
            </div>
          </div>
          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={barData} margin={{ top: 20, right: 20, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 600 }} 
                  axisLine={false} 
                  tickLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'var(--surface-hover)' }} 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(val, name, item) => [`${val}%`, item?.payload?.fullName || 'Avg Score']}
                />
                <Bar dataKey="avgScore" fill="#800000" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <Users size={20} className={styles.chartIcon} />
            <div>
              <h3>Student Demographics</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Total: <strong>{totalStudentsCount} Students</strong> across 8 Departments
              </p>
            </div>
          </div>
          <div className={styles.chartBody}>
            <div className={styles.demographicsContainer}>
              <div className={styles.demographicsChartWrapper}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<DemographicsTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Clean Structured Legend Grid with Badges (No Overflow) */}
              <div className={styles.demographicsLegendGrid}>
                {pieData.map(item => (
                  <div key={item.name} className={styles.legendItem} title={`${item.fullName}: ${item.value} students`}>
                    <div className={styles.legendLeft}>
                      <span className={styles.legendDot} style={{ backgroundColor: item.color }} />
                      <span className={styles.legendLabel}>{item.name}</span>
                    </div>
                    <span className={styles.legendValue}>{item.value} ({item.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
