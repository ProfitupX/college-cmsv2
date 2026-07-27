import { useState, useEffect, useMemo } from 'react';
import { KeyRound, Plus, Trash2, Edit2, Loader, AlertTriangle, Eye, EyeOff, Lock, CheckCircle2, RotateCcw } from 'lucide-react';
import { adminAPI } from '../../services/api';
import AdminToolbar from '../../components/Admin/AdminToolbar';
import styles from './AdminPages.module.css';

export default function ManageStaffCredentials() {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showForm, setShowForm] = useState(false);
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

  // Search & Filter
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const loadCredentials = () => {
    setLoading(true);
    adminAPI
      .getCredentials()
      .then(setCredentials)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCredentials();
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
        setSuccessMsg(`Credentials for ${formData.name} updated successfully!`);
      } else {
        await adminAPI.createCredential(formData);
        setSuccessMsg(`New staff account created for ${formData.name}!`);
      }
      setShowForm(false);
      loadCredentials();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete account credentials for ${name} (${id})?`)) return;
    setError('');
    setSuccessMsg('');
    try {
      await adminAPI.deleteCredential(id);
      setSuccessMsg(`Account for ${name} deleted successfully.`);
      loadCredentials();
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
      loadCredentials();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEdit = (s) => {
    setFormData({
      id: s.id,
      name: s.name,
      short_name: s.short_name || '',
      designation: s.designation || '',
      email: s.email,
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

  const filteredCredentials = useMemo(() => {
    return credentials.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        (s.employee_id && s.employee_id.toLowerCase().includes(search.toLowerCase()));
      const matchesDept = !deptFilter || s.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [credentials, search, deptFilter]);

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
          <KeyRound size={24} color="var(--primary)" />
          <h2>Manage Staff Passwords & Emails</h2>
        </div>
        <button className={styles.addBtn} onClick={openAdd}>
          <Plus size={16} /> Add Staff Account
        </button>
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
        <div className={styles.error} style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a' }}>
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      {showForm && (
        <form className={styles.formCard} onSubmit={handleSave}>
          <h3>{isEditing ? `Edit Credentials: ${formData.name}` : 'Create New Staff Account'}</h3>
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
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Full Name</label>
              <input
                required
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
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
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Employee ID</label>
              <input
                placeholder="e.g. NSCET123"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>Role</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                <option value="faculty">Faculty</option>
                <option value="hod">HOD</option>
                <option value="class_coordinator">Class In-charge</option>
                <option value="admin">Admin</option>
              </select>
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
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Credentials'}
            </button>
          </div>
        </form>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Staff ID / Name</th>
            <th>Email Address</th>
            <th>Password</th>
            <th>Department</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredCredentials.map((s) => {
            const isPasswordVisible = !!visiblePasswords[s.id];
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
                <td>{s.department || '-'}</td>
                <td>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      background: s.role === 'admin' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(108, 99, 255, 0.1)',
                      color: s.role === 'admin' ? 'var(--danger)' : 'var(--primary)',
                    }}
                  >
                    {s.role}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className={styles.editIcon}
                      onClick={() => openEdit(s)}
                      title="Edit Email & Password"
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
                      title="Delete Account"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {filteredCredentials.length === 0 && (
            <tr>
              <td colSpan="6" className={styles.empty}>
                No staff credentials found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
