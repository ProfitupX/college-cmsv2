import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList
} from 'recharts';
import styles from './PerformanceChart.module.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.tooltip}>
        <p className={styles.ttLabel}>Year {label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} style={{ color: p.fill }} className={styles.ttVal}>
            Average Marks: <strong>{p.value}%</strong>
          </p>
        ))}
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          (Assignments + Internal Written Exams)
        </p>
      </div>
    );
  }
  return null;
};

export default function YearPerformanceChart({ data = [], user }) {
  const allYears = [
    { name: 'II', fill: '#6C63FF' },
    { name: 'III', fill: '#10B981' },
    { name: 'IV', fill: '#F59E0B' }
  ];

  let visibleYears = new Set();
  
  if (!user || user.role === 'admin' || user.role === 'hod' || user.role === 'principal' || user.role === 'vice_principal') {
    visibleYears = new Set(['II', 'III', 'IV']);
  } else {
    (user.coordinatedClasses || []).forEach(c => {
      if (c.year_label) visibleYears.add(c.year_label);
    });
    (user.teachingClasses || []).forEach(c => {
      if (c.year_label) visibleYears.add(c.year_label);
    });
  }

  const chartData = allYears
    .filter(y => visibleYears.has(y.name))
    .map(y => ({ ...y, value: 0 }));

  if (chartData.length === 0) {
    chartData.push(...allYears.map(y => ({ ...y, value: 0 })));
  }

  data.forEach(d => {
    const index = chartData.findIndex(c => c.name === d.name);
    if (index !== -1) {
      chartData[index].value = parseFloat(d.value) || 0;
    }
  });

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Year-wise Student Performance</h3>
          <p className={styles.sub}>
            Overall assessment average for {
              (!user || user.role === 'admin' || user.role === 'hod' || user.role === 'principal' || user.role === 'vice_principal') 
              ? '2nd, 3rd, and 4th years' 
              : 'your active classes'
            }
          </p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(108,99,255,0.08)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 13, fill: 'var(--text-secondary)', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `Year ${val}`}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(108,99,255,0.04)' }} />
          <Bar
            dataKey="value"
            name="Avg Score"
            radius={[6, 6, 0, 0]}
            maxBarSize={60}
            animationDuration={1500}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
            <LabelList dataKey="value" position="top" fill="var(--text-secondary)" fontSize={12} fontWeight={600} formatter={(val) => `${val}%`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
