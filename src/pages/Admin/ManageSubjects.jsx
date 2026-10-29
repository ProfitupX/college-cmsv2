import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, Loader, AlertTriangle, ClipboardEdit, UploadCloud } from 'lucide-react';
import { subjectsAPI, classesAPI, staffsAPI } from '../../services/api';
import AdminToolbar from '../../components/Admin/AdminToolbar';
import BulkUploadModal from '../../components/Admin/BulkUploadModal';
import styles from './AdminPages.module.css';

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [staffsList, setStaffsList] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({ 
    id: '', 
    code: '', 
    name: '', 
    type: 'Theory', 
    class_id: '', 
    faculty_id: '', 
    ltpc: '', 
    total_hours: '',
    int1_hours: '',
    int2_hours: '',
    lab_hours: ''
  });

  const getHourSplitsFromLtpc = (ltpc, type, total) => {
    const cleanLtpc = String(ltpc || '').trim().replace(/[\s\-]+/g, '');
    let h = parseInt(total || 0, 10);
    if (!h && cleanLtpc.length >= 3) {
      const parts = cleanLtpc.split('');
      const l = parseFloat(parts[0]) || 0;
      const t = parseFloat(parts[1]) || 0;
      const p = parseFloat(parts[2]) || 0;
      h = (l + t + p) * 15;
    }

    if (type === 'Lab-cum-Theory' || type === 'Theory-cum-Lab' || type === 'Lab cum Theory' || type === 'Theory cum Lab') {
      if (cleanLtpc === '2023') return { int1: 15, int2: 15, lab: 30, total: 60 };
      if (cleanLtpc === '2043') return { int1: 15, int2: 15, lab: 60, total: 90 };
      if (cleanLtpc === '1022') return { int1: 15, int2: 15, lab: 15, total: 45 };
      if (cleanLtpc === '3024') return { int1: 30, int2: 30, lab: 15, total: 75 };
      if (cleanLtpc === '3045') return { int1: 30, int2: 30, lab: 45, total: 105 };
      if (cleanLtpc === '1021') return { int1: 15, int2: 15, lab: 15, total: 45 };
      return { int1: 30, int2: 30, lab: Math.max(0, (h || 100) - 60) || 40, total: h || 100 };
    }

    if (type === 'Theory') {
      if (cleanLtpc === '3104' || cleanLtpc === '3004') return { int1: 30, int2: 30, lab: 0, total: 60 };
      if (cleanLtpc === '1001') return { int1: 7, int2: 8, lab: 0, total: 15 };
      if (cleanLtpc === '3003' || cleanLtpc === '2103') return { int1: 25, int2: 20, lab: 0, total: 45 };
      if (cleanLtpc === '2002') return { int1: 15, int2: 15, lab: 0, total: 30 };
      return { int1: Math.ceil((h || 60) / 2) || 30, int2: Math.floor((h || 60) / 2) || 30, lab: 0, total: h || 60 };
    }

    if (type === 'Practical') {
      if (cleanLtpc === '0042') return { int1: 30, int2: 30, lab: 0, total: 60 };
      if (cleanLtpc === '1021') return { int1: 25, int2: 20, lab: 0, total: 45 };
      if (cleanLtpc === '0041') return { int1: 30, int2: 30, lab: 0, total: 60 };
      return { int1: Math.ceil((h || 60) / 2) || 30, int2: Math.floor((h || 60) / 2) || 30, lab: 0, total: h || 60 };
    }

    return { int1: 30, int2: 30, lab: 0, total: h || 60 };
  };

  const handleLtpcChange = (val) => {
    const splits = getHourSplitsFromLtpc(val, formData.type, formData.total_hours);
    setFormData(prev => ({ 
      ...prev, 
      ltpc: val, 
      total_hours: splits.total || prev.total_hours,
      int1_hours: splits.int1 ?? prev.int1_hours,
      int2_hours: splits.int2 ?? prev.int2_hours,
      lab_hours: splits.lab ?? prev.lab_hours
    }));
  };

  const handleTypeChange = (newType) => {
    const splits = getHourSplitsFromLtpc(formData.ltpc, newType, formData.total_hours);
    setFormData(prev => ({
      ...prev,
      type: newType,
      int1_hours: splits.int1 ?? prev.int1_hours,
      int2_hours: splits.int2 ?? prev.int2_hours,
      lab_hours: splits.lab ?? prev.lab_hours,
      total_hours: splits.total || prev.total_hours
    }));
  };

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [subs, cls, stfs] = await Promise.all([
        subjectsAPI.getAll(),
        classesAPI.getAll(),
        staffsAPI.getAll()
      ]);
      setSubjects(subs);
      setClassesList(cls);
      setStaffsList(stfs);
    } catch (err) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (isEditing) {
        await subjectsAPI.update(formData.id, formData);
      } else {
        await subjectsAPI.create(formData);
      }
      setShowForm(false);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkUpload = async (data) => {
    try {
      await subjectsAPI.create(data);
      loadData();
    } catch (err) {
      throw new Error('Bulk upload failed: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete subject ${id}?`)) return;
    try {
      await subjectsAPI.delete(id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const openEdit = (s) => {
    setFormData({
      ...s,
      int1_hours: s.int1_hours !== null && s.int1_hours !== undefined ? s.int1_hours : '',
      int2_hours: s.int2_hours !== null && s.int2_hours !== undefined ? s.int2_hours : '',
      lab_hours: s.lab_hours !== null && s.lab_hours !== undefined ? s.lab_hours : '',
      total_hours: s.total_hours !== null && s.total_hours !== undefined ? s.total_hours : ''
    });
    setIsEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAdd = () => {
    setFormData({ 
      id: `SUB_${Math.floor(Date.now() / 1000)}`, 
      code: '', 
      name: '', 
      type: 'Theory', 
      class_id: '', 
      faculty_id: '', 
      ltpc: '', 
      total_hours: '',
      int1_hours: 30,
      int2_hours: 30,
      lab_hours: 0
    });
    setIsEditing(false);
    setShowForm(true);
  };

  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => {
      const q = search.toLowerCase();
      const matchName = s.name ? s.name.toLowerCase().includes(q) : false;
      const matchCode = s.code ? s.code.toLowerCase().includes(q) : false;
      const matchesSearch = matchName || matchCode;
      
      const subClass = classesList.find(c => c.id === s.class_id);
      
      const matchesDept = !deptFilter || (subClass && subClass.department === deptFilter);
      const matchesSem = !semFilter || (subClass && subClass.semester === parseInt(semFilter));
      
      let matchesBranch = true;
      if (deptFilter === 'Science and Humanities' && branchFilter && subClass) {
        const cleanBranch = branchFilter.replace(/[^a-zA-Z]/g, '').toLowerCase();
        const cleanClassName = subClass.name.replace(/[^a-zA-Z]/g, '').toLowerCase();
        matchesBranch = cleanClassName.includes(cleanBranch);

        if (branchFilter === 'CSE' && sectionFilter) {
          const matchSec = (subClass.section && subClass.section.toUpperCase() === sectionFilter.toUpperCase()) ||
                           subClass.name.toUpperCase().includes(`CSE ${sectionFilter.toUpperCase()}`) ||
                           subClass.id.toUpperCase().includes(`CSE_${sectionFilter.toUpperCase()}`);
          matchesBranch = matchesBranch && matchSec;
        }
      }
      
      return matchesSearch && matchesDept && matchesSem && matchesBranch;
    });
  }, [subjects, classesList, search, deptFilter, branchFilter, sectionFilter, semFilter]);

  if (loading) return <div className={styles.center}><Loader className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <ClipboardEdit size={24} color="var(--primary)" />
          <h2>Manage Subjects</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={styles.uploadBtn} onClick={() => setShowUpload(true)}>
            <UploadCloud size={16} /> Bulk Upload
          </button>
          <button className={styles.addBtn} onClick={openAdd}>
            <Plus size={16} /> Add Subject
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
          <h3>{isEditing ? 'Edit Subject' : 'Add New Subject'}</h3>
          <div className={styles.grid}>
            <input required placeholder="Subject ID (e.g. SUB101)" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} disabled={true} />
            <input required placeholder="Subject Code (e.g. IT301)" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
            <input required placeholder="Subject Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            
            <input placeholder="LTPC (e.g. 3104, 3-0-4-5)" value={formData.ltpc} onChange={e => handleLtpcChange(e.target.value)} />

            <select value={formData.type} onChange={e => handleTypeChange(e.target.value)}>
              <option value="Theory">Theory</option>
              <option value="Theory-cum-Lab">Theory-cum-Lab</option>
              <option value="Lab-cum-Theory">Lab-cum-Theory</option>
              <option value="Practical">Practical</option>
              <option value="Skill">Skill</option>
              <option value="Other">Other</option>
            </select>
            
            <select required value={formData.class_id} onChange={e => setFormData({...formData, class_id: e.target.value})}>
              <option value="">-- Assign Class --</option>
              {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select required value={formData.faculty_id} onChange={e => setFormData({...formData, faculty_id: e.target.value})}>
              <option value="">-- Assign Staff --</option>
              {staffsList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} - {s.department || s.designation || 'Faculty'} ({s.id})
                </option>
              ))}
            </select>

            {/* LTPC Hours Allocation Section */}
            <div style={{
              gridColumn: '1 / -1',
              background: 'var(--surface-hover)',
              border: '1px solid var(--border-solid)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginTop: '4px',
              marginBottom: '4px'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ⏱ Assessment Hours Allocation (LTPC Split)
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                  Auto-suggested from LTPC • Fully customizable by Admin
                </span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--text-primary)' }}>
                    Internal 1 Hours
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="e.g. 30" 
                    value={formData.int1_hours} 
                    onChange={e => {
                      const val = e.target.value;
                      setFormData(prev => {
                        const i1 = parseInt(val || 0, 10);
                        const i2 = parseInt(prev.int2_hours || 0, 10);
                        const lb = parseInt(prev.lab_hours || 0, 10);
                        return { ...prev, int1_hours: val, total_hours: (i1 + i2 + lb) || prev.total_hours };
                      });
                    }}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-solid)', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--text-primary)' }}>
                    Internal 2 Hours
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="e.g. 30" 
                    value={formData.int2_hours} 
                    onChange={e => {
                      const val = e.target.value;
                      setFormData(prev => {
                        const i1 = parseInt(prev.int1_hours || 0, 10);
                        const i2 = parseInt(val || 0, 10);
                        const lb = parseInt(prev.lab_hours || 0, 10);
                        return { ...prev, int2_hours: val, total_hours: (i1 + i2 + lb) || prev.total_hours };
                      });
                    }}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-solid)', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--text-primary)' }}>
                    Lab Hours {['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab', 'Practical'].includes(formData.type) ? '(Required)' : '(Optional)'}
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="e.g. 40" 
                    value={formData.lab_hours} 
                    onChange={e => {
                      const val = e.target.value;
                      setFormData(prev => {
                        const i1 = parseInt(prev.int1_hours || 0, 10);
                        const i2 = parseInt(prev.int2_hours || 0, 10);
                        const lb = parseInt(val || 0, 10);
                        return { ...prev, lab_hours: val, total_hours: (i1 + i2 + lb) || prev.total_hours };
                      });
                    }}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-solid)', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--text-primary)' }}>
                    Total Course Hours
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="e.g. 100" 
                    value={formData.total_hours} 
                    onChange={e => setFormData({ ...formData, total_hours: e.target.value })}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-solid)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save Subject'}</button>
          </div>
        </form>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Type</th>
            <th>LTPC / Hours Split</th>
            <th>Class</th>
            <th>Assigned Staff</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredSubjects.map(s => (
            <tr key={s.id}>
              <td><strong>{s.code}</strong></td>
              <td>{s.name}</td>
              <td>{s.type}</td>
              <td>
                {s.ltpc ? (
                  <div>
                    <strong style={{ color: 'var(--primary)' }}>{s.ltpc}</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Int1: {s.int1_hours ?? 30}h • Int2: {s.int2_hours ?? 30}h
                      {s.lab_hours ? ` • Lab: ${s.lab_hours}h` : ''}
                      {s.total_hours ? ` (${s.total_hours}h total)` : ''}
                    </div>
                  </div>
                ) : (s.total_hours ? `${s.total_hours}h` : '-')}
              </td>
              <td>{s.class_id}</td>
              <td>
                <div style={{ fontWeight: 600 }}>{s.faculty_name || s.faculty_id}</div>
                {(s.faculty_department || s.faculty_designation) && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {s.faculty_department || ''} {s.faculty_designation ? `• ${s.faculty_designation}` : ''}
                  </div>
                )}
              </td>
              <td>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className={styles.editIcon} onClick={() => openEdit(s)}><Edit2 size={16} /></button>
                  <button className={styles.deleteIcon} onClick={() => handleDelete(s.id)}><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          ))}
          {filteredSubjects.length === 0 && <tr><td colSpan="6" className={styles.empty}>No subjects found.</td></tr>}
        </tbody>
      </table>

      {showUpload && (
        <BulkUploadModal 
          title="Upload Subjects (CSV)"
          expectedColumns={['id', 'code', 'name', 'acronym', 'type', 'department', 'semester', 'faculty_id', 'class_id']}
          onUpload={handleBulkUpload}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
