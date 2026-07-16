import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, Loader, AlertTriangle, Users, UploadCloud } from 'lucide-react';
import { staffsAPI } from '../../services/api';
import AdminToolbar from '../../components/Admin/AdminToolbar';
import BulkUploadModal from '../../components/Admin/BulkUploadModal';
import styles from './AdminPages.module.css';

export default function ManageStaffs() {
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({ id: '', name: '', short_name: '', designation: '', email: '', role: 'faculty', employee_id: '', department: '' });

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const loadStaffs = () => {
    setLoading(true);
    staffsAPI.getAll()
      .then(setStaffs)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStaffs(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (isEditing) {
        await staffsAPI.update(formData.id, formData);
      } else {
        await staffsAPI.create(formData);
      }
      setShowForm(false);
      loadStaffs();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkUpload = async (data) => {
    try {
      await staffsAPI.create(data);
      loadStaffs();
    } catch (err) {
      throw new Error('Bulk upload failed: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete staff ${id}?`)) return;
    try {
      await staffsAPI.delete(id);
      loadStaffs();
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
    setFormData({ id: '', name: '', short_name: '', designation: '', email: '', role: 'faculty', employee_id: '', department: '' });
    setIsEditing(false);
    setShowForm(true);
  };

  const filteredStaffs = useMemo(() => {
    return staffs.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                            s.email.toLowerCase().includes(search.toLowerCase()) ||
                            (s.employee_id && s.employee_id.toLowerCase().includes(search.toLowerCase()));
      const matchesDept = !deptFilter || s.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [staffs, search, deptFilter]);

  if (loading) return <div className={styles.center}><Loader className={styles.spinner} /></div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <Users size={24} color="var(--primary)" />
          <h2>Manage Staffs</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={styles.uploadBtn} onClick={() => setShowUpload(true)}>
            <UploadCloud size={16} /> Bulk Upload
          </button>
          <button className={styles.addBtn} onClick={openAdd}>
            <Plus size={16} /> Add Staff
          </button>
        </div>
      </header>

      <AdminToolbar 
        search={search} onSearchChange={setSearch}
        departmentFilter={deptFilter} onDepartmentChange={setDeptFilter}
      />

      {error && <div className={styles.error}><AlertTriangle size={16} /> {error}</div>}

      {showForm && (
        <form className={styles.formCard} onSubmit={handleSave}>
          <h3>{isEditing ? 'Edit Staff' : 'Add New Staff'}</h3>
          <div className={styles.grid}>
            <input required placeholder="Staff ID (e.g. FAC001)" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} disabled={isEditing} />
            <input required placeholder="Employee ID (e.g. NSCET123)" value={formData.employee_id || ''} onChange={e => setFormData({...formData, employee_id: e.target.value})} />
            <input required placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <input placeholder="Short Name (e.g. R. Prathap)" value={formData.short_name || ''} onChange={e => setFormData({...formData, short_name: e.target.value})} />
            <input required type="email" placeholder="Email Address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            <input placeholder="Designation (e.g. Assistant Professor)" value={formData.designation || ''} onChange={e => setFormData({...formData, designation: e.target.value})} />
            
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

            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
              <option value="faculty">Faculty</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className={styles.formActions}>
            <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save Staff'}</button>
          </div>
        </form>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID / Emp ID</th>
            <th>Name</th>
            <th>Department</th>
            <th>Designation</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredStaffs.map(s => (
            <tr key={s.id}>
              <td><strong>{s.id}</strong><br/><small>{s.employee_id}</small></td>
              <td>{s.name}</td>
              <td>{s.department || '-'}</td>
              <td>{s.designation}</td>
              <td>{s.email}</td>
              <td>{s.role}</td>
              <td>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className={styles.editIcon} onClick={() => openEdit(s)}><Edit2 size={16} /></button>
                  <button className={styles.deleteIcon} onClick={() => handleDelete(s.id)}><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          ))}
          {filteredStaffs.length === 0 && <tr><td colSpan="7" className={styles.empty}>No staffs found.</td></tr>}
        </tbody>
      </table>

      {showUpload && (
        <BulkUploadModal 
          title="Upload Staffs (CSV)"
          expectedColumns={['id', 'name', 'short_name', 'designation', 'department', 'email', 'role', 'employee_id']}
          onUpload={handleBulkUpload}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
