import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, Loader, AlertTriangle, BookOpen, UploadCloud } from 'lucide-react';
import { classesAPI } from '../../services/api';
import AdminToolbar from '../../components/Admin/AdminToolbar';
import BulkUploadModal from '../../components/Admin/BulkUploadModal';
import styles from './AdminPages.module.css';

export default function ManageClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({ id: '', name: '', department: 'Information Technology', semester: '', year_label: '' });
  
  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');

  const loadClasses = () => {
    setLoading(true);
    classesAPI.getAll()
      .then(setClasses)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadClasses(); }, []);

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
    setFormData({ id: '', name: '', department: 'Information Technology', semester: '', year_label: '' });
    setIsEditing(false);
    setShowForm(true);
  };

  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
      const matchesDept = !deptFilter || c.department === deptFilter;
      const matchesSem = !semFilter || c.semester === parseInt(semFilter);
      return matchesSearch && matchesDept && matchesSem;
    });
  }, [classes, search, deptFilter, semFilter]);

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
        semesterFilter={semFilter} onSemesterChange={setSemFilter}
      />

      {error && <div className={styles.error}><AlertTriangle size={16} /> {error}</div>}

      {showForm && (
        <form className={styles.formCard} onSubmit={handleSave}>
          <h3>{isEditing ? 'Edit Class' : 'Add New Class'}</h3>
          <div className={styles.grid}>
            <input required placeholder="Class ID (e.g. IT-A-2025)" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} disabled={isEditing} />
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
              <option value="Other">Other</option>
            </select>

            <input type="number" placeholder="Semester (e.g. 3)" value={formData.semester} onChange={e => setFormData({...formData, semester: e.target.value})} />
            <input placeholder="Year Label (e.g. II)" value={formData.year_label} onChange={e => setFormData({...formData, year_label: e.target.value})} />
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
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredClasses.map(c => (
            <tr key={c.id}>
              <td><strong>{c.id}</strong></td>
              <td>{c.name}</td>
              <td>{c.department}</td>
              <td>Sem {c.semester} / {c.year_label}</td>
              <td>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className={styles.editIcon} onClick={() => openEdit(c)}><Edit2 size={16} /></button>
                  <button className={styles.deleteIcon} onClick={() => handleDelete(c.id)}><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          ))}
          {filteredClasses.length === 0 && <tr><td colSpan="5" className={styles.empty}>No classes found.</td></tr>}
        </tbody>
      </table>

      {showUpload && (
        <BulkUploadModal 
          title="Upload Classes (CSV)"
          expectedColumns={['id', 'name', 'department', 'semester', 'year_label']}
          onUpload={handleBulkUpload}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
