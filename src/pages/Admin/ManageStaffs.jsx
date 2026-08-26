import { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  Loader, 
  AlertTriangle, 
  UploadCloud, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  CheckCircle2 
} from 'lucide-react';
import { adminAPI, staffsAPI } from '../../services/api';
import AdminToolbar from '../../components/Admin/AdminToolbar';
import BulkUploadModal from '../../components/Admin/BulkUploadModal';
import styles from './AdminPages.module.css';

export default function ManageStaffs() {
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Toggle visibility of passwords per row
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    short_name: '',
    designation: '',
    email: '',
    password: '',
    role: 'faculty',
    employee_id: '',
    department: '',
  });

  // Search & Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const loadStaffs = () => {
    setLoading(true);
    adminAPI
      .getCredentials()
      .then(setStaffs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStaffs();
  }, []);

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      if (isEditing) {
        await adminAPI.updateCredential(formData.id, formData);
        setSuccessMsg(`Staff details for ${formData.name} updated successfully!`);
      } else {
        await adminAPI.createCredential(formData);
        setSuccessMsg(`New staff account created for ${formData.name}!`);
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
      setSuccessMsg('Bulk staff members uploaded successfully!');
      loadStaffs();
    } catch (err) {
      throw new Error('Bulk upload failed: ' + err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete staff member ${name || id}?`)) return;
    setError('');
    setSuccessMsg('');
    try {
      await adminAPI.deleteCredential(id);
      setSuccessMsg(`Staff account for ${name || id} deleted successfully.`);
      loadStaffs();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleQuickResetPassword = async (staff) => {
    const newPwd = window.prompt(`Enter new password for ${staff.name} (${staff.email}):`, 'faculty123');
    if (!newPwd) return;

    setError('');
    setSuccessMsg('');
    try {
      await adminAPI.resetPassword(staff.id, newPwd);
      setSuccessMsg(`Password for ${staff.name} reset successfully!`);
      loadStaffs();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEdit = (s) => {
    setFormData({
      id: s.id || '',
      name: s.name || '',
      short_name: s.short_name || '',
      designation: s.designation || '',
      email: s.email || '',
      password: s.password || '',
      role: s.role || 'faculty',
      employee_id: s.employee_id || '',
      department: s.department || '',
    });
    setIsEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAdd = () => {
    setFormData({
      id: '',
      name: '',
      short_name: '',
      designation: '',
      email: '',
      password: 'faculty123',
      role: 'faculty',
      employee_id: '',
      department: '',
    });
    setIsEditing(false);
    setShowForm(true);
  };

  const filteredStaffs = useMemo(() => {
    return staffs.filter((s) => {
      const q = search.toLowerCase();
      const matchName = s.name ? s.name.toLowerCase().includes(q) : false;
      const matchEmail = s.email ? s.email.toLowerCase().includes(q) : false;
      const matchId = s.id ? s.id.toLowerCase().includes(q) : false;
      const matchEmpId = s.employee_id ? s.employee_id.toLowerCase().includes(q) : false;
      const matchesSearch = matchName || matchEmail || matchId || matchEmpId;
      const matchesDept = !deptFilter || s.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [staffs, search, deptFilter]);

  if (loading)
    return (
      <div className={styles.center}>
        <Loader className={styles.spinner} />
      </div>
    );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <Users size={26} color="var(--primary)" />
          <div>
            <h2 style={{ margin: 0 }}>Staffs Management</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Manage staff profiles, email credentials, roles, and security
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={styles.uploadBtn} onClick={() => setShowUpload(true)}>
            <UploadCloud size={16} /> Bulk Upload CSV
          </button>
          <button className={styles.addBtn} onClick={openAdd}>
            <Plus size={16} /> Add Staff Account
          </button>
        </div>
      </header>

      <AdminToolbar
        search={search}
        onSearchChange={setSearch}
        departmentFilter={deptFilter}
        onDepartmentChange={setDeptFilter}
      />

      {error && (
        <div className={styles.error}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {successMsg && (
        <div className={styles.error} style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {showForm && (
        <form className={styles.formCard} onSubmit={handleSave}>
          <h3>{isEditing ? `Edit Staff Account: ${formData.name}` : 'Create New Staff Account'}</h3>
          <div className={styles.grid}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Staff ID</label>
              <input
                required
                placeholder="e.g. FAC001"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                disabled={isEditing}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Employee ID</label>
              <input
                placeholder="e.g. NSCET-CSE-001"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Full Name</label>
              <input
                required
                placeholder="Full Name (e.g. Dr. J. Mathalai Raj)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Short Name</label>
              <input
                placeholder="Short Name (e.g. J. Mathalai Raj)"
                value={formData.short_name}
                onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Designation</label>
              <input
                placeholder="Designation (e.g. Assistant Professor / HOD)"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Department</label>
              <select
                value={formData.department || ''}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
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
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Email Address</label>
              <input
                required
                type="email"
                placeholder="email@nscet.edu.in"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Password</label>
              <input
                required
                type="text"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Role</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                <option value="faculty">Faculty Staff</option>
                <option value="hod">HOD (Head of Department)</option>
                <option value="class_coordinator">Class In-charge</option>
                <option value="principal">Principal</option>
                <option value="vice_principal">Vice Principal</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Staff Account'}
            </button>
          </div>
        </form>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Staff ID / Name</th>
            <th>Designation & Department</th>
            <th>Email Address</th>
            <th>Password</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredStaffs.map((s) => {
            const isPasswordVisible = !!visiblePasswords[s.id];
            
            // Format role label badge
            let roleLabel = 'Faculty';
            let roleBg = 'rgba(108, 99, 255, 0.1)';
            let roleColor = 'var(--primary)';

            if (s.role === 'admin') {
              roleLabel = 'Admin';
              roleBg = 'rgba(239, 68, 68, 0.1)';
              roleColor = 'var(--danger)';
            } else if (s.role === 'principal') {
              roleLabel = 'Principal';
              roleBg = 'rgba(128, 0, 0, 0.15)';
              roleColor = '#800000';
            } else if (s.role === 'vice_principal') {
              roleLabel = 'Vice Principal';
              roleBg = 'rgba(59, 130, 246, 0.15)';
              roleColor = '#2563eb';
            } else if (s.role === 'hod') {
              roleLabel = 'HOD';
              roleBg = 'rgba(245, 158, 11, 0.15)';
              roleColor = '#b45309';
            } else if (s.role === 'class_coordinator' || s.class_role) {
              roleLabel = 'Class In-charge';
              roleBg = 'rgba(16, 185, 129, 0.15)';
              roleColor = '#047857';
            }

            return (
              <tr key={s.id}>
                <td>
                  <strong>{s.name}</strong>
                  <br />
                  <small style={{ color: 'var(--text-muted)' }}>
                    {s.id} {s.employee_id ? `• ${s.employee_id}` : ''}
                  </small>
                </td>

                <td>
                  <div style={{ fontWeight: 500 }}>{s.designation || 'Faculty Member'}</div>
                  <small style={{ color: 'var(--text-muted)' }}>{s.department || '-'}</small>
                </td>

                <td>
                  <span style={{ fontWeight: 500, color: 'var(--primary)' }}>{s.email}</span>
                </td>

                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        background: 'var(--bg)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        border: '1px solid var(--border-solid)',
                        letterSpacing: isPasswordVisible ? 'normal' : '2px',
                      }}
                    >
                      {isPasswordVisible ? s.password : '••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(s.id)}
                      title={isPasswordVisible ? 'Hide password' : 'Show password'}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        padding: '2px',
                      }}
                    >
                      {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </td>

                <td>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      background: roleBg,
                      color: roleColor,
                    }}
                  >
                    {roleLabel}
                  </span>
                </td>

                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className={styles.editIcon}
                      onClick={() => openEdit(s)}
                      title="Edit Staff Account"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className={styles.editIcon}
                      onClick={() => handleQuickResetPassword(s)}
                      title="Quick Reset Password"
                      style={{ color: '#eab308' }}
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      className={styles.deleteIcon}
                      onClick={() => handleDelete(s.id, s.name)}
                      title="Delete Staff Account"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}

          {filteredStaffs.length === 0 && (
            <tr>
              <td colSpan="6" className={styles.empty}>
                No staff members found matching search or filter.
              </td>
            </tr>
          )}
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
