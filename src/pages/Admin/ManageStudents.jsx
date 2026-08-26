import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, Loader, AlertTriangle, GraduationCap, UploadCloud } from 'lucide-react';
import { studentsAPI, classesAPI } from '../../services/api';
import AdminToolbar from '../../components/Admin/AdminToolbar';
import BulkUploadModal from '../../components/Admin/BulkUploadModal';
import styles from './AdminPages.module.css';

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [classesList, setClassesList] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({ id: '', s_no: '', roll_no: '', name: '', class_id: '' });

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [studs, cls] = await Promise.all([
        studentsAPI.getAll(),
        classesAPI.getAll()
      ]);
      setStudents(studs);
      setClassesList(cls);
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
      const payload = { ...formData, s_no: parseInt(formData.s_no) || 0 };
      if (isEditing) {
        await studentsAPI.update(formData.id, payload);
      } else {
        await studentsAPI.create(payload);
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
      await studentsAPI.create(data);
      loadData();
    } catch (err) {
      throw new Error('Bulk upload failed: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete student ${id}?`)) return;
    try {
      await studentsAPI.delete(id);
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
    setFormData({ id: '', s_no: '', roll_no: '', name: '', class_id: '' });
    setIsEditing(false);
    setShowForm(true);
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = search.toLowerCase();
      const matchName = s.name ? s.name.toLowerCase().includes(q) : false;
      const matchRoll = s.roll_no ? s.roll_no.toLowerCase().includes(q) : false;
      const matchId = s.id ? s.id.toLowerCase().includes(q) : false;
      const matchesSearch = matchName || matchRoll || matchId;
      
      // Find the class for this student to match department/sem filters
      const stuClass = classesList.find(c => c.id === s.class_id);
      
      const matchesDept = !deptFilter || (stuClass && stuClass.department === deptFilter);
      const matchesSem = !semFilter || (stuClass && stuClass.semester === parseInt(semFilter));
      
      return matchesSearch && matchesDept && matchesSem;
    });
  }, [students, classesList, search, deptFilter, semFilter]);

  if (loading) return <div className={styles.center}><Loader className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <GraduationCap size={24} color="var(--primary)" />
          <h2>Manage Students</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={styles.uploadBtn} onClick={() => setShowUpload(true)}>
            <UploadCloud size={16} /> Bulk Upload
          </button>
          <button className={styles.addBtn} onClick={openAdd}>
            <Plus size={16} /> Add Student
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
          <h3>{isEditing ? 'Edit Student' : 'Add New Student'}</h3>
          <div className={styles.grid}>
            <input required placeholder="Student ID (e.g. STU123)" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} disabled={isEditing} />
            <input type="number" placeholder="S.No" value={formData.s_no} onChange={e => setFormData({...formData, s_no: e.target.value})} />
            <input required placeholder="Roll No (e.g. 921021205001)" value={formData.roll_no} onChange={e => setFormData({...formData, roll_no: e.target.value})} />
            <input required placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <select required value={formData.class_id} onChange={e => setFormData({...formData, class_id: e.target.value})}>
              <option value="">-- Assign Class --</option>
              {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className={styles.formActions}>
            <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save Student'}</button>
          </div>
        </form>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>S.No</th>
            <th>Roll No</th>
            <th>Name</th>
            <th>Class</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.map(s => (
            <tr key={s.id}>
              <td>{s.s_no}</td>
              <td><strong>{s.roll_no}</strong></td>
              <td>{s.name}</td>
              <td>{s.class_id}</td>
              <td>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className={styles.editIcon} onClick={() => openEdit(s)}><Edit2 size={16} /></button>
                  <button className={styles.deleteIcon} onClick={() => handleDelete(s.id)}><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          ))}
          {filteredStudents.length === 0 && <tr><td colSpan="5" className={styles.empty}>No students found.</td></tr>}
        </tbody>
      </table>

      {showUpload && (
        <BulkUploadModal 
          title="Upload Students (CSV)"
          expectedColumns={['id', 's_no', 'roll_no', 'name', 'class_id']}
          onUpload={handleBulkUpload}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
