import { useState, useEffect } from 'react';
import { 
  Users, Building, UserCheck, Activity,
  TrendingUp, Award, FileText, Download
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { statsAPI } from '../../services/api';
import { generateCollegeOverviewPDF } from '../../services/pdfReportGenerator';
import { useAuth } from '../../context/AuthContext';
import styles from './PrincipalDashboard.module.css';

const COLORS = ['#800000', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'];

export default function PrincipalDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    statsAPI.getCollegeStats()
      .then((res) => {
        setData(res);
      })
      .catch((err) => setError('Failed to load college statistics.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadReport = async () => {
    try {
      await generateCollegeOverviewPDF({
        overview: data.overview,
        departmentStats: data.departmentStats,
        user
      });
    } catch (err) {
      alert('Failed to generate report: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <div className={styles.spinner}></div>
        <p>Loading College Overview...</p>
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

  const { overview, departmentStats, performanceTrend } = data;

  // Prepare data for Pie Chart (Student Distribution)
  const pieData = departmentStats.map(dept => ({
    name: dept.department.replace('Engineering', 'Engg'),
    value: dept.totalStudents
  }));

  // Prepare data for Bar Chart (Dept Avg Score)
  const barData = departmentStats.map(dept => ({
    name: dept.department.replace('Engineering', 'Engg'),
    avgScore: parseFloat(dept.avgScore) || 0
  }));

  return (
    <div className={styles.principalContainer}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-10px' }}>
        <button 
          onClick={handleDownloadReport}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: 'var(--primary)', color: '#fff', 
            padding: '8px 16px', borderRadius: '8px', 
            border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500'
          }}
        >
          <Download size={16} /> Download College Report
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

      {/* Data Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <FileText size={20} className={styles.chartIcon} />
          <h3>Department-wise Detailed Analytics</h3>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Total Students</th>
                <th>Average Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {departmentStats.map((dept, i) => (
                <tr key={i}>
                  <td>
                    <div className={styles.deptNameWrapper}>
                      <div className={styles.deptColorIndicator} style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className={styles.deptName}>{dept.department}</span>
                    </div>
                  </td>
                  <td>{dept.totalStudents}</td>
                  <td>
                    <span className={styles.scoreBadge}>
                      {dept.avgScore}
                    </span>
                  </td>
                  <td>
                    {parseFloat(dept.avgScore) >= 60 ? (
                      <span className={styles.statusGood}>Excellent</span>
                    ) : parseFloat(dept.avgScore) >= 40 ? (
                      <span className={styles.statusAverage}>Average</span>
                    ) : (
                      <span className={styles.statusPoor}>Needs Attention</span>
                    )}
                  </td>
                </tr>
              ))}
              {departmentStats.length === 0 && (
                <tr>
                  <td colSpan="4" className={styles.emptyState}>No department data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
