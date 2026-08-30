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

export default function YearPerformanceChart({ data = [] }) {
  // Ensure we have II, III, IV even if there's no data
  const chartData = [
    { name: 'II', value: 0, fill: '#6C63FF' },
    { name: 'III', value: 0, fill: '#10B981' },
    { name: 'IV', value: 0, fill: '#F59E0B' }
  ];

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
          <p className={styles.sub}>Overall assessment average for 2nd, 3rd, and 4th years</p>
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
