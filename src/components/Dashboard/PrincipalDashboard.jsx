import { useState, useEffect } from 'react';
import { 
  Users, Building, UserCheck, Activity,
  TrendingUp, Award, FileText, Download, FileSpreadsheet
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { statsAPI } from '../../services/api';
import { generateCollegeOverviewPDF, generateContinuousAssessmentAnalysisPDF } from '../../services/pdfReportGenerator';
import { useAuth } from '../../context/AuthContext';
import styles from './PrincipalDashboard.module.css';

const COLORS = ['#800000', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'];

export default function PrincipalDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [caData, setCaData] = useState(null);
  const [caMode, setCaMode] = useState('internal1');
  const [loading, setLoading] = useState(true);
  const [caLoading, setCaLoading] = useState(false);
  const [error, setError] = useState('');

  // Load college overview stats
  useEffect(() => {
    statsAPI.getCollegeStats()
      .then((res) => {
        setData(res);
      })
      .catch(() => setError('Failed to load college statistics.'))
      .finally(() => setLoading(false));
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

  const handleDownloadCAPDF = async () => {
    if (!caData) return;
    try {
      await generateContinuousAssessmentAnalysisPDF({
        caData,
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
    csv += `Department,Year,Strength,Passed,Percentage,Percentage (Over all)\n`;

    caData.departments.forEach((dept) => {
      dept.years.forEach((yr, idx) => {
        const deptLabel = idx === 0 ? `"${dept.department}"` : '';
        const deptOverall = idx === 0 ? `"${dept.deptOverallPct}%"` : '';
        csv += `${deptLabel},${yr.year},${yr.strength},${yr.passed},"${yr.percentage}%",${deptOverall}\n`;
      });
    });

    csv += `"Pass Percentage Without First Year",,${caData.summary.withoutFirstYear.strength},${caData.summary.withoutFirstYear.passed},"${caData.summary.withoutFirstYear.percentage}%",\n`;
    csv += `"College Overall Pass Percentage",,${caData.summary.collegeOverall.strength},${caData.summary.collegeOverall.passed},"${caData.summary.collegeOverall.percentage}%",\n`;

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

  const pieData = departmentStats.map(dept => ({
    name: dept.department.replace('Engineering', 'Engg'),
    value: dept.totalStudents
  }));

  const barData = departmentStats.map(dept => ({
    name: dept.department.replace('Engineering', 'Engg'),
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

      {/* Overview Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(128, 0, 0, 0.1)', color: '#800000' }}>
            <Users size={24} />
          </div>
          <div className={styles.statInfo}>
            <h3>Total Students</h3>
            <h2>{overview.totalStudents}</h2>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
            <Building size={24} />
          </div>
          <div className={styles.statInfo}>
            <h3>Departments</h3>
            <h2>{overview.totalDepartments}</h2>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <UserCheck size={24} />
          </div>
          <div className={styles.statInfo}>
            <h3>Faculty Members</h3>
            <h2>{overview.totalFaculty}</h2>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <Award size={24} />
          </div>
          <div className={styles.statInfo}>
            <h3>College Average</h3>
            <h2>{overview.collegeAvg} <span className={styles.statUnit}>/ 100</span></h2>
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
                  <th style={{ textAlign: 'left', paddingLeft: '16px' }}>Department</th>
                  <th>Year</th>
                  <th>Strength</th>
                  <th>Passed</th>
                  <th>Percentage (%)</th>
                  <th>Percentage (Over all)</th>
                </tr>
              </thead>
              <tbody>
                {caData.departments.map((dept, dIdx) => (
                  dept.years.map((yr, yIdx) => (
                    <tr key={`${dIdx}-${yIdx}`}>
                      {yIdx === 0 && (
                        <td 
                          rowSpan={dept.years.length} 
                          className={styles.caDeptCell}
                        >
                          {dept.department}
                        </td>
                      )}
                      <td style={{ fontWeight: 600 }}>{yr.year}</td>
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

                {/* Summary Row: Without First Year */}
                <tr className={styles.caSummaryRow}>
                  <td colSpan={2} style={{ textAlign: 'left', paddingLeft: '16px' }}>
                    Pass Percentage Without First Year
                  </td>
                  <td>{caData.summary.withoutFirstYear.strength}</td>
                  <td>{caData.summary.withoutFirstYear.passed}</td>
                  <td colSpan={2} style={{ color: '#800000', fontSize: '0.9rem' }}>
                    {caData.summary.withoutFirstYear.percentage}%
                  </td>
                </tr>

                {/* Summary Row: College Overall */}
                <tr className={styles.caOverallRow}>
                  <td colSpan={2} style={{ textAlign: 'left', paddingLeft: '16px' }}>
                    College Overall Pass Percentage
                  </td>
                  <td>{caData.summary.collegeOverall.strength}</td>
                  <td>{caData.summary.collegeOverall.passed}</td>
                  <td colSpan={2} style={{ fontSize: '1rem' }}>
                    {caData.summary.collegeOverall.percentage}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* Charts Section */}
      <div className={styles.chartsWrapper}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <TrendingUp size={20} className={styles.chartIcon} />
            <h3>Department Performance (Avg Score)</h3>
          </div>
          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'var(--surface-hover)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="avgScore" fill="#800000" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <Users size={20} className={styles.chartIcon} />
            <h3>Student Demographics</h3>
          </div>
          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
