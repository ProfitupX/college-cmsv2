import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, Loader, AlertTriangle, BookOpen, UploadCloud, Shield, GraduationCap, Award, Users, TrendingUp, CheckCircle2 } from 'lucide-react';
import { classesAPI, adminAPI } from '../../services/api';
import AdminToolbar from '../../components/Admin/AdminToolbar';
import BulkUploadModal from '../../components/Admin/BulkUploadModal';
import styles from './AdminPages.module.css';

// Helper: resolve role info from staffs list for a given coordinator name
function resolveCoordinatorRole(coordinatorName, staffsList) {
  if (!coordinatorName || !staffsList?.length) return null;
  const normTarget = coordinatorName.toLowerCase().replace(/^(dr|mr|mrs|ms|prof)\.?\s*/i, '').replace(/[^a-z]/g, '');
  if (!normTarget || normTarget.length < 3) return null;
  const match = staffsList.find((s) => {
    const normName = (s.name || '').toLowerCase().replace(/^(dr|mr|mrs|ms|prof)\.?\s*/i, '').replace(/[^a-z]/g, '');
    return normName && normName.length >= 3 && (normName.includes(normTarget) || normTarget.includes(normName));
  });
  if (!match) return { roleLabel: 'Class In-charge', roleBg: '#ecfdf5', roleColor: '#065f46', border: '#a7f3d0', icon: 'incharge', name: coordinatorName };
  const role = (match.role || '').toLowerCase();
  const desig = (match.designation || '').toLowerCase();
  if (role === 'admin') return { roleLabel: 'Admin', roleBg: '#f1f5f9', roleColor: '#475569', border: '#cbd5e1', icon: 'admin', name: match.name };
  if (role === 'principal' || (desig.includes('principal') && !desig.includes('vice')))
    return { roleLabel: 'Principal', roleBg: '#f5f3ff', roleColor: '#6d28d9', border: '#ddd6fe', icon: 'principal', name: match.name };
  if (role === 'vice_principal' || desig.includes('vice principal') || desig.includes('vp'))
    return { roleLabel: 'Vice Principal', roleBg: '#eef2ff', roleColor: '#4338ca', border: '#c7d2fe', icon: 'vp', name: match.name };
  if (role === 'hod' || desig.includes('hod')) {
    const dept = match.department ? match.department.replace('Engineering', 'Engg').replace('Artificial Intelligence and Data Science', 'AI&DS') : '';
    return { roleLabel: dept ? `HOD · ${dept}` : 'HOD', roleBg: '#fef2f2', roleColor: '#991b1b', border: '#fecaca', icon: 'hod', name: match.name };
  }
  return { roleLabel: 'Class In-charge', roleBg: '#ecfdf5', roleColor: '#065f46', border: '#a7f3d0', icon: 'incharge', name: match.name };
}

function RoleIcon({ type, size = 13 }) {
  if (type === 'admin') return <Shield size={size} />;
  if (type === 'principal') return <GraduationCap size={size} />;
  if (type === 'vp') return <Award size={size} />;
  if (type === 'hod') return <Award size={size} />;
  return <Users size={size} />;
}

export default function ManageClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({ id: '', name: '', department: 'Information Technology', semester: '', year_label: '', class_coordinator: '' });
  
  const [staffs, setStaffs] = useState([]);
  
  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');

  // Promote class modal state
  const [promoteModalClass, setPromoteModalClass] = useState(null);
  const [promoteData, setPromoteData] = useState({
    newName: '',
    newSemester: 1,
    newYearLabel: 'I',
    mode: 'in_place',
    newClassId: ''
  });
  const [promoting, setPromoting] = useState(false);
  const [promoteSuccess, setPromoteSuccess] = useState('');

  const openPromoteModal = (c) => {
    let nextYear = 'I';
    if (c.year_label === 'I') nextYear = 'II';
    else if (c.year_label === 'II') nextYear = 'III';
    else if (c.year_label === 'III') nextYear = 'IV';
    else nextYear = 'IV';

    const currSem = parseInt(c.semester) || 1;
    const nextSem = Math.min(8, currSem + 2 <= 8 ? currSem + 2 : currSem + 1);

    let nextName = c.name || '';
    if (c.year_label && nextYear) {
      nextName = nextName.replace(new RegExp(`\\b${c.year_label}\\s*Year\\b`, 'i'), `${nextYear} Year`);
      nextName = nextName.replace(new RegExp(`Sem\\s*${currSem}`, 'i'), `Sem ${nextSem}`);
    }

    setPromoteModalClass(c);
    setPromoteData({
      newName: nextName,
      newSemester: nextSem,
      newYearLabel: nextYear,
      mode: 'in_place',
      newClassId: `CL_${c.id}_${nextYear}`
    });
    setPromoteSuccess('');
  };

  const handlePromoteSubmit = async (e) => {
    e.preventDefault();
    if (!promoteModalClass) return;
    setPromoting(true);
    setError('');
    try {
      const res = await classesAPI.promote(promoteModalClass.id, promoteData);
      setPromoteSuccess(res.message || 'Class promoted successfully!');
      setTimeout(() => {
        setPromoteModalClass(null);
        setPromoteSuccess('');
        loadClasses();
      }, 1200);
    } catch (err) {
      setError('Promotion failed: ' + err.message);
    } finally {
      setPromoting(false);
    }
  };

  const loadClasses = () => {
    setLoading(true);
    classesAPI.getAll()
      .then(setClasses)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { 
    loadClasses(); 
    adminAPI.getCredentials().then(setStaffs).catch(console.error);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = { ...formData, semester: parseInt(formData.semester) || 0 };
      if (isEditing) {
        await classesAPI.update(formData.id, payload);
      } else {
        await classesAPI.create(payload);
      }
      setShowForm(false);
      loadClasses();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkUpload = async (data) => {
    try {
      await classesAPI.create(data); // bulk create handles arrays
      loadClasses();
    } catch (err) {
      throw new Error('Bulk upload failed: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete class ${id}?`)) return;
    try {
      await classesAPI.delete(id);
      loadClasses();
    } catch (err) {
      alert(err.message);
    }
  };

  const openEdit = (c) => {
    setFormData(c);
    setIsEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAdd = () => {
    setFormData({ id: `CL_${Math.floor(Date.now() / 1000)}`, name: '', department: 'Information Technology', semester: '', year_label: '', class_coordinator: '' });
    setIsEditing(false);
    setShowForm(true);
  };

  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const q = search.toLowerCase();
      const matchName = c.name ? c.name.toLowerCase().includes(q) : false;
      const matchId = c.id ? c.id.toLowerCase().includes(q) : false;
      const matchesSearch = matchName || matchId;
      const matchesDept = !deptFilter || c.department === deptFilter;
      const matchesSem = !semFilter || c.semester === parseInt(semFilter);
      
      let matchesBranch = true;
      if (deptFilter === 'Science and Humanities' && branchFilter) {
        const cleanBranch = branchFilter.replace(/[^a-zA-Z]/g, '').toLowerCase();
        const cleanClassName = c.name.replace(/[^a-zA-Z]/g, '').toLowerCase();
        matchesBranch = cleanClassName.includes(cleanBranch);

        if (branchFilter === 'CSE' && sectionFilter) {
          const matchSec = (c.section && c.section.toUpperCase() === sectionFilter.toUpperCase()) ||
                           c.name.toUpperCase().includes(`CSE ${sectionFilter.toUpperCase()}`) ||
                           c.id.toUpperCase().includes(`CSE_${sectionFilter.toUpperCase()}`);
          matchesBranch = matchesBranch && matchSec;
        }
      }
      
      return matchesSearch && matchesDept && matchesSem && matchesBranch;
    });
  }, [classes, search, deptFilter, branchFilter, sectionFilter, semFilter]);

  if (loading) return <div className={styles.center}><Loader className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <BookOpen size={24} color="var(--primary)" />
          <h2>Manage Classes</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={styles.uploadBtn} onClick={() => setShowUpload(true)}>
            <UploadCloud size={16} /> Bulk Upload
          </button>
          <button className={styles.addBtn} onClick={openAdd}>
            <Plus size={16} /> Add Class
          </button>
        </div>
      </header>

      <AdminToolbar 
        search={search} onSearchChange={setSearch}
        departmentFilter={deptFilter} onDepartmentChange={setDeptFilter}
        branchFilter={branchFilter} onBranchChange={setBranchFilter}
        sectionFilter={sectionFilter} onSectionChange={setSectionFilter}
        semesterFilter={semFilter} onSemesterChange={setSemFilter}
      />

      {error && <div className={styles.error}><AlertTriangle size={16} /> {error}</div>}

      {showForm && (
        <form className={styles.formCard} onSubmit={handleSave}>
          <h3>{isEditing ? 'Edit Class' : 'Add New Class'}</h3>
          <div className={styles.grid}>
            <input required placeholder="Class ID (e.g. IT-A-2025)" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} disabled={true} />
            <input required placeholder="Class Name (e.g. II Year IT A)" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            
            <select value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})}>
              <option value="">-- Select Department --</option>
              <option value="Computer Science and Engineering">Computer Science and Engineering</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Artificial Intelligence and Data Science">Artificial Intelligence and Data Science</option>
              <option value="Electronics and Communication Engineering">Electronics and Communication Engineering</option>
              <option value="Electrical and Electronics Engineering">Electrical and Electronics Engineering</option>
              <option value="Civil Engineering">Civil Engineering</option>
              <option value="Mechanical Engineering">Mechanical Engineering</option>
              <option value="Science and Humanities">Science and Humanities</option>
              <option value="Other">Other</option>
            </select>

            <select value={formData.semester || ''} onChange={e => setFormData({...formData, semester: e.target.value})}>
              <option value="">-- Semester --</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select value={formData.year_label || ''} onChange={e => setFormData({...formData, year_label: e.target.value})}>
              <option value="">-- Year --</option>
              {['I', 'II', 'III', 'IV'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <select value={formData.class_coordinator || ''} onChange={e => setFormData({...formData, class_coordinator: e.target.value})}>
              <option value="">-- Select Class In-charge --</option>
              {staffs.map(s => <option key={s.id} value={s.name}>{s.name} ({s.id})</option>)}
            </select>
          </div>
          <div className={styles.formActions}>
            <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save Class'}</button>
          </div>
        </form>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Dept</th>
            <th>Sem / Year</th>
            <th>In Charge</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredClasses.map(c => {
            const coordRole = resolveCoordinatorRole(c.class_coordinator, staffs);
            return (
              <tr key={c.id}>
                <td><strong>{c.id}</strong></td>
                <td>{c.name}</td>
                <td>{c.department}</td>
                <td>Sem {c.semester} / {c.year_label}</td>
                <td>
                  {coordRole ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '3px 9px', borderRadius: '12px', fontSize: '0.72rem',
                        fontWeight: 700, background: coordRole.roleBg,
                        color: coordRole.roleColor, border: `1px solid ${coordRole.border}`,
                        width: 'fit-content'
                      }}>
                        <RoleIcon type={coordRole.icon} size={12} />
                        {coordRole.roleLabel}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                        {coordRole.name}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Not Assigned</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      title="Promote Class to Next Year / Semester" 
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '4px 8px', borderRadius: '6px', border: '1px solid #93c5fd',
                        background: '#eff6ff', color: '#1e40af', fontSize: '0.75rem', fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      onClick={() => openPromoteModal(c)}
                    >
                      <TrendingUp size={13} /> Promote
                    </button>
                    <button className={styles.editIcon} onClick={() => openEdit(c)}><Edit2 size={16} /></button>
                    <button className={styles.deleteIcon} onClick={() => handleDelete(c.id)}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
          {filteredClasses.length === 0 && <tr><td colSpan="6" className={styles.empty}>No classes found.</td></tr>}
        </tbody>
      </table>

      {showUpload && (
        <BulkUploadModal 
          title="Upload Classes (CSV / Excel)"
          expectedColumns={['id', 'name', 'department', 'semester', 'year_label']}
          onUpload={handleBulkUpload}
          onClose={() => setShowUpload(false)}
        />
      )}

      {/* Upgrade / Promote Class Modal */}
      {promoteModalClass && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
          <div style={{
            background: '#fff', borderRadius: '12px', width: '92%', maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #cbd5e1', overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={20} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
                  Promote Class to Next Year / Semester
                </h3>
              </div>
              <button 
                onClick={() => setPromoteModalClass(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePromoteSubmit} style={{ padding: '20px' }}>
              {/* Current Class Info */}
              <div style={{
                background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px',
                padding: '12px 14px', marginBottom: '16px', fontSize: '0.85rem'
              }}>
                <div style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: '4px' }}>
                  Current: {promoteModalClass.name} ({promoteModalClass.id})
                </div>
                <div style={{ color: '#3b82f6', fontSize: '0.8rem' }}>
                  Department: <strong>{promoteModalClass.department}</strong> | Year: <strong>{promoteModalClass.year_label}</strong> | Sem: <strong>{promoteModalClass.semester}</strong>
                </div>
              </div>

              {promoteSuccess ? (
                <div style={{
                  padding: '12px 14px', background: '#dcfce7', border: '1px solid #86efac',
                  borderRadius: '8px', color: '#166534', fontWeight: 600, fontSize: '0.88rem',
                  display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px'
                }}>
                  <CheckCircle2 size={18} />
                  {promoteSuccess}
                </div>
              ) : null}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Next Year:
                  </label>
                  <select
                    value={promoteData.newYearLabel}
                    onChange={e => setPromoteData({ ...promoteData, newYearLabel: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    {['I', 'II', 'III', 'IV'].map(y => <option key={y} value={y}>{y} Year</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Next Semester:
                  </label>
                  <select
                    value={promoteData.newSemester}
                    onChange={e => setPromoteData({ ...promoteData, newSemester: parseInt(e.target.value) || 1 })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  New Class Name:
                </label>
                <input
                  required
                  value={promoteData.newName}
                  onChange={e => setPromoteData({ ...promoteData, newName: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              {/* Upgrade Mode Selector */}
              <div style={{ marginBottom: '18px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Upgrade Method:
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', cursor: 'pointer', fontSize: '0.82rem', color: '#1e293b' }}>
                  <input
                    type="radio"
                    name="promoteMode"
                    value="in_place"
                    checked={promoteData.mode === 'in_place'}
                    onChange={() => setPromoteData({ ...promoteData, mode: 'in_place' })}
                    style={{ marginTop: '2px' }}
                  />
                  <span>
                    <strong>In-Place Upgrade (Recommended)</strong>: Updates the existing class so all enrolled students immediately advance to {promoteData.newYearLabel} Year with 1 click!
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: '#1e293b' }}>
                  <input
                    type="radio"
                    name="promoteMode"
                    value="new_class"
                    checked={promoteData.mode === 'new_class'}
                    onChange={() => setPromoteData({ ...promoteData, mode: 'new_class' })}
                    style={{ marginTop: '2px' }}
                  />
                  <span>
                    <strong>Create New Class ID & Move Students</strong>: Creates a new Class ID and transfers all students to it.
                  </span>
                </label>
              </div>

              {promoteData.mode === 'new_class' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    New Class ID:
                  </label>
                  <input
                    required
                    value={promoteData.newClassId}
                    onChange={e => setPromoteData({ ...promoteData, newClassId: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPromoteModalClass(null)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={promoting}
                  style={{
                    padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#2563eb',
                    color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <TrendingUp size={16} />
                  {promoting ? 'Promoting...' : `Promote to ${promoteData.newYearLabel} Year`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
