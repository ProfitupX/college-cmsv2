import { useState, useEffect } from 'react';
import { Search, Users, GraduationCap, BookOpen, Loader } from 'lucide-react';
import { studentsAPI, classesAPI, subjectsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import styles from './StudentsPage.module.css';

const AVATAR_COLORS = [
  '#6C63FF','#F472B6','#22D3EE','#10B981','#FB923C','#F59E0B',
  '#EF4444','#3B82F6','#8B5CF6','#14B8A6','#EC4899','#A78BFA',
];

function getInitials(name) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [classesDict, setClassesDict] = useState({});
  const [staffClasses, setStaffClasses] = useState([]);
  
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    Promise.all([
      classesAPI.getAll(),
      studentsAPI.getAll(),
      subjectsAPI.getByFaculty(user.id)
    ])
      .then(([allClasses, allStudents, staffSubjects]) => {
        // Create dictionary for quick class lookup
        const cDict = {};
        allClasses.forEach(c => cDict[c.id] = c);
        setClassesDict(cDict);

        // Find unique classes this staff teaches
        const uniqueClassIds = [...new Set(staffSubjects.map(sub => sub.class_id).filter(Boolean))];
        const sClasses = uniqueClassIds.map(id => cDict[id]).filter(Boolean);
        setStaffClasses(sClasses);

        // Filter students to only those in the staff's classes
        const myStudents = allStudents.filter(s => uniqueClassIds.includes(s.class_id));
        setStudents(myStudents);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load student data. Is the server running?');
      })
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = students.filter(
    (s) => {
      const q = search.toLowerCase();
      const matchName = s.name ? s.name.toLowerCase().includes(q) : false;
      const matchRoll = s.roll_no ? s.roll_no.toLowerCase().includes(q) : false;
      return matchName || matchRoll;
    }
  );

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Loader size={28} />
        <p>Loading your students…</p>
      </div>
    );
  }

  if (error) {
    return <div className={styles.errorState}>{error}</div>;
  }

  return (
    <div>
      {/* Staff Classes Summary Banner */}
      <div className={styles.classBanner}>
        <div className={styles.bannerLeft}>
          <div className={styles.bannerIcon}><GraduationCap size={22} color="#fff" /></div>
          <div>
            <h2 className={styles.bannerTitle}>My Assigned Students</h2>
            <p className={styles.bannerSub}>
              You are assigned to {staffClasses.length} {staffClasses.length === 1 ? 'class' : 'classes'}
            </p>
          </div>
        </div>
        <div className={styles.bannerStats}>
          <div className={styles.bannerStat}>
            <Users size={16} />
            <span><strong>{students.length}</strong> Total Students</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            id="student-search"
            type="text"
            className={styles.searchInput}
            placeholder="Search by name or register number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        <span className={styles.resultCount}>{filtered.length} of {students.length} students</span>
        <div className={styles.viewToggle}>
          <button className={`${styles.viewBtn} ${view === 'grid'  ? styles.viewBtnActive : ''}`}
            onClick={() => setView('grid')}  id="grid-view-btn">⊞ Grid</button>
          <button className={`${styles.viewBtn} ${view === 'table' ? styles.viewBtnActive : ''}`}
            onClick={() => setView('table')} id="table-view-btn">☰ Table</button>
        </div>
      </div>

      {/* Grid View */}
      {view === 'grid' && (
        <div className={styles.grid}>
          {filtered.map((student, i) => {
            const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
            const stuClass = classesDict[student.class_id];
            
            return (
              <div key={student.id} className={styles.card} style={{ animationDelay: `${Math.min(i * 20, 600)}ms` }}>
                <div className={styles.cardTop}>
                  <div className={styles.sNo}>{student.s_no}</div>
                  <div className={styles.avatar} style={{ background: color }}>{getInitials(student.name)}</div>
                  <div className={styles.studentMeta}>
                    <h4 className={styles.name}>{student.name}</h4>
                    <p className={styles.regNo}>{student.roll_no}</p>
                  </div>
                </div>
                <div className={styles.cardChips}>
                  <span className={styles.chip} style={{ background: `${color}18`, color }}>
                    {stuClass ? stuClass.department : 'Unknown Dept'}
                  </span>
                  <span className={styles.chip}>
                    {stuClass ? `Sem ${stuClass.semester} · Sec ${stuClass.section || 'A'}` : student.class_id}
                  </span>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className={styles.empty}>No students match "<strong>{search}</strong>"</div>
          )}
        </div>
      )}

      {/* Table View */}
      {view === 'table' && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Register No.</th>
                <th>Name</th>
                <th>Department</th>
                <th>Sem</th>
                <th>Section</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student, i) => {
                const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
                const stuClass = classesDict[student.class_id];

                return (
                  <tr key={student.id}>
                    <td className={styles.tdSno}>{student.s_no}</td>
                    <td className={styles.tdReg}><code className={styles.regCode}>{student.roll_no}</code></td>
                    <td className={styles.tdName}>
                      <div className={styles.tableStudent}>
                        <div className={styles.avatarSm} style={{ background: color }}>{getInitials(student.name)}</div>
                        {student.name}
                      </div>
                    </td>
                    <td>{stuClass ? stuClass.department : 'Unknown'}</td>
                    <td className={styles.tdCenter}>{stuClass ? stuClass.semester : '-'}</td>
                    <td className={styles.tdCenter}>{stuClass ? stuClass.section || 'A' : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className={styles.emptyTable}>No students match "<strong>{search}</strong>"</div>
          )}
        </div>
      )}
    </div>
  );
}
