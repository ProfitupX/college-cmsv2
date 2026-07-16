import { TrendingUp, TrendingDown } from 'lucide-react';
import styles from './StatsGrid.module.css';

function StatCard({ icon: Icon, label, value, sub, trend, trendVal, color, delay = 0 }) {
  const isUp = trend === 'up';
  return (
    <div
      className={styles.card}
      style={{ '--card-color': color, animationDelay: `${delay}ms` }}
    >
      <div className={styles.top}>
        <div className={styles.iconWrap} style={{ background: `${color}18` }}>
          <Icon size={22} color={color} />
        </div>
        {trendVal && (
          <span className={`${styles.trend} ${isUp ? styles.up : styles.down}`}>
            {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trendVal}
          </span>
        )}
      </div>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
      {sub && <div className={styles.sub}>{sub}</div>}
      <div className={styles.bar} style={{ background: color }} />
    </div>
  );
}

export default function StatsGrid({ stats }) {
  return (
    <div className={styles.grid}>
      {stats.map((s, i) => (
        <StatCard key={s.label} {...s} delay={i * 80} />
      ))}
    </div>
  );
}
