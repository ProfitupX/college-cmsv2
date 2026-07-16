import { Search, Filter } from 'lucide-react';
import styles from './AdminToolbar.module.css';

export const DEPARTMENTS = [
  'Computer Science and Engineering',
  'Information Technology',
  'Artificial Intelligence and Data Science',
  'Electronics and Communication Engineering',
  'Electrical and Electronics Engineering',
  'Civil Engineering',
  'Mechanical Engineering'
];
export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function AdminToolbar({ 
  search, 
  onSearchChange, 
  departmentFilter, 
  onDepartmentChange,
  semesterFilter,
  onSemesterChange 
}) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.searchBox}>
        <Search size={18} className={styles.searchIcon} />
        <input 
          type="text" 
          placeholder="Search..." 
          value={search} 
          onChange={(e) => onSearchChange(e.target.value)} 
        />
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <Filter size={16} className={styles.filterIcon} />
          <select value={departmentFilter} onChange={(e) => onDepartmentChange(e.target.value)}>
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {onSemesterChange && (
          <div className={styles.filterGroup}>
            <select value={semesterFilter} onChange={(e) => onSemesterChange(e.target.value)}>
              <option value="">All Semesters</option>
              {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
