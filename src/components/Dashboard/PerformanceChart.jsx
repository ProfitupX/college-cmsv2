import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import styles from './PerformanceChart.module.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.tooltip}>
        <p className={styles.ttLabel}>{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} style={{ color: p.color }} className={styles.ttVal}>
            {p.name}: <strong>{p.value}{p.dataKey === 'avgScore' ? '%' : ''}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function PerformanceChart({ data }) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Performance Overview</h3>
          <p className={styles.sub}>Monthly average scores & submissions</p>
        </div>
        <div className={styles.legend}>
          <span className={styles.dot} style={{ background: '#6C63FF' }} />
          <span>Avg Score</span>
          <span className={styles.dot} style={{ background: '#22D3EE' }} />
          <span>Submissions</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(108,99,255,0.08)" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: '#94A3B8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#94A3B8' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="avgScore"
            name="Avg Score"
            stroke="#6C63FF"
            strokeWidth={2.5}
            fill="url(#scoreGrad)"
            dot={{ r: 4, fill: '#6C63FF', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6 }}
          />
          <Area
            type="monotone"
            dataKey="submissions"
            name="Submissions"
            stroke="#22D3EE"
            strokeWidth={2}
            fill="url(#subGrad)"
            dot={{ r: 3, fill: '#22D3EE', strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
