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

  const [formData, setFormData] = useState({ id: '', code: '', name: '', type: 'Theory', class_id: '', faculty_id: '', ltpc: '', total_hours: '' });

  const handleLtpcChange = (val) => {
    let hours = formData.total_hours;
    if (val && val.length === 4) {
      const c = parseInt(val[3]);
      if (!isNaN(c)) {
        hours = c * 15;
      }
    }
    setFormData(prev => ({ ...prev, ltpc: val, total_hours: hours }));
  };

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
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
    setFormData(s);
    setIsEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAdd = () => {
    setFormData({ id: '', code: '', name: '', type: 'Theory', class_id: '', faculty_id: '', ltpc: '', total_hours: '' });
    setIsEditing(false);
    setShowForm(true);
  };

  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                            s.code.toLowerCase().includes(search.toLowerCase());
      
      const subClass = classesList.find(c => c.id === s.class_id);
      
      const matchesDept = !deptFilter || (subClass && subClass.department === deptFilter);
      const matchesSem = !semFilter || (subClass && subClass.semester === parseInt(semFilter));
      
      return matchesSearch && matchesDept && matchesSem;
    });
  }, [subjects, classesList, search, deptFilter, semFilter]);

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
        semesterFilter={semFilter} onSemesterChange={setSemFilter}
      />

      {error && <div className={styles.error}><AlertTriangle size={16} /> {error}</div>}

      {showForm && (
        <form className={styles.formCard} onSubmit={handleSave}>
          <h3>{isEditing ? 'Edit Subject' : 'Add New Subject'}</h3>
          <div className={styles.grid}>
            <input required placeholder="Subject ID (e.g. SUB-01)" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} disabled={isEditing} />
            <input required placeholder="Subject Code (e.g. IT301)" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
            <input required placeholder="Subject Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            
            <input placeholder="LTPC (e.g. 3104)" value={formData.ltpc} onChange={e => handleLtpcChange(e.target.value)} />
            <input type="number" placeholder="Total Hours" value={formData.total_hours} onChange={e => setFormData({...formData, total_hours: e.target.value})} />

            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
              <option value="Theory">Theory</option>
              <option value="Practical">Practical</option>
              <option value="Lab-cum-Theory">Lab-cum-Theory</option>
            </select>
            
            <select required value={formData.class_id} onChange={e => setFormData({...formData, class_id: e.target.value})}>
              <option value="">-- Assign Class --</option>
              {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select required value={formData.faculty_id} onChange={e => setFormData({...formData, faculty_id: e.target.value})}>
              <option value="">-- Assign Staff --</option>
              {staffsList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
            </select>
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
            <th>LTPC</th>
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
              <td>{s.ltpc ? `${s.ltpc} (${s.total_hours}h)` : '-'}</td>
              <td>{s.class_id}</td>
              <td>{s.faculty_id}</td>
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
