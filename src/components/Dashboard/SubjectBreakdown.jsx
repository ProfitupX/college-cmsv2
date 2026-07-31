import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';
import styles from './SubjectBreakdown.module.css';

export default function SubjectBreakdown({ data, title = 'Subject Scores', sub = 'Average % per subject' }) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.sub}>{sub}</p>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="20%"
          outerRadius="90%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar
            minAngle={15}
            background={{ fill: 'rgba(108,99,255,0.05)' }}
            clockWise
            dataKey="value"
            cornerRadius={6}
          />
          <Tooltip
            formatter={(val) => [`${val}%`, 'Avg Score']}
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border-solid)',
              borderRadius: '10px',
              fontSize: '0.78rem',
            }}
          />
        </RadialBarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className={styles.legend}>
        {data.map((d) => (
          <div key={d.name} className={styles.legendItem}>
            <span className={styles.dot} style={{ background: d.fill }} />
            <span className={styles.name}>{d.name}</span>
            <span className={styles.val}>{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
