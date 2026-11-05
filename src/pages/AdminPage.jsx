import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, settingsAPI, marksAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Shield, Key, Search, Loader, AlertCircle, Save, Settings, BookMarked, Check, X, Filter, Clock, Lock, Unlock, History, RefreshCw } from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [resettingId, setResettingId] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Environment Settings State
  const [activeTab, setActiveTab] = useState('staff');
  const [envContent, setEnvContent] = useState('');
  const [envLoading, setEnvLoading] = useState(false);
  const [envSaving, setEnvSaving] = useState(false);

  // Frozen Marks Unlock Requests State
  const [unlockRequests, setUnlockRequests] = useState([]);
  const [unlocksLoading, setUnlocksLoading] = useState(false);
  const [unlockDeptFilter, setUnlockDeptFilter] = useState('all');
  const [unlockSearch, setUnlockSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Subject Freeze / Unlock Management State
  const [subjectFreezeList, setSubjectFreezeList] = useState([]);
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [freezeDeptFilter, setFreezeDeptFilter] = useState('all');
  const [freezeRegFilter, setFreezeRegFilter] = useState('all');
  const [freezeSemFilter, setFreezeSemFilter] = useState('all');
  const [freezeSessionLabel, setFreezeSessionLabel] = useState('internal1');
  const [freezeSearch, setFreezeSearch] = useState('');
  const [freezeActionLoadingId, setFreezeActionLoadingId] = useState(null);

  // Audit Log Modal State
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSubjectTitle, setAuditSubjectTitle] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      adminAPI.getStaffs()
        .then(setStaffs)
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'env' && user?.role === 'admin') {
      setEnvLoading(true);
      settingsAPI.getEnv()
        .then(res => setEnvContent(res.value || ''))
        .catch(err => console.error(err))
        .finally(() => setEnvLoading(false));
    }
  }, [activeTab, user]);

  const loadUnlockRequests = () => {
    if (user?.role === 'admin') {
      setUnlocksLoading(true);
      marksAPI.getUnlockRequests()
        .then(res => setUnlockRequests(Array.isArray(res) ? res : []))
        .catch(err => console.error(err))
        .finally(() => setUnlocksLoading(false));
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadUnlockRequests();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'unlocks' && user?.role === 'admin') {
      loadUnlockRequests();
    }
  }, [activeTab]);

  const loadSubjectFreezeStatus = () => {
    if (user?.role === 'admin') {
      setFreezeLoading(true);
      marksAPI.getSubjectFreezeStatus({
        sessionLabel: freezeSessionLabel,
        department: freezeDeptFilter !== 'all' ? freezeDeptFilter : undefined,
        regulation: freezeRegFilter !== 'all' ? freezeRegFilter : undefined,
        semester: freezeSemFilter !== 'all' ? freezeSemFilter : undefined
      })
        .then(res => setSubjectFreezeList(Array.isArray(res) ? res : []))
        .catch(err => console.error(err))
        .finally(() => setFreezeLoading(false));
    }
  };

  useEffect(() => {
    if (activeTab === 'subject_freeze' && user?.role === 'admin') {
      loadSubjectFreezeStatus();
    }
  }, [activeTab, freezeSessionLabel, freezeDeptFilter, freezeRegFilter, freezeSemFilter]);

  const handleToggleSubjectFreeze = async (subject, action) => {
    setFreezeActionLoadingId(subject.subject_id);
    try {
      const res = await marksAPI.toggleSubjectFreeze({
        subjectId: subject.subject_id,
        sessionLabel: freezeSessionLabel,
        action
      });
      alert(res.message || `Subject marks ${action === 'freeze' ? 'frozen' : 'unlocked'} successfully.`);
      loadSubjectFreezeStatus();
    } catch (err) {
      alert('Failed to update freeze status: ' + (err.message || 'Unknown error'));
    } finally {
      setFreezeActionLoadingId(null);
    }
  };

  const handleViewAuditLog = async (sessionId, title) => {
    if (!sessionId) {
      alert('No marks session has been recorded for this subject yet.');
      return;
    }
    setAuditSubjectTitle(title);
    setAuditModalOpen(true);
    setAuditLoading(true);
    try {
      const logs = await marksAPI.getAuditLogs(sessionId);
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (err) {
      alert('Failed to load audit logs: ' + err.message);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleAdminApproveUnlock = async (reqId, sessId, action) => {
    setActionLoadingId(reqId);
    try {
      const res = await marksAPI.approveUnlock({
        requestId: reqId,
        sessionId: sessId,
        action
      });
      alert(res.message || (action === 'approve' ? 'Marks sheet unlocked successfully.' : 'Unlock request rejected.'));
      loadUnlockRequests();
    } catch (err) {
      alert('Failed to process unlock action: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoadingId(null);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)' }}>
        <Shield size={48} />
        <h2>Access Denied</h2>
        <p>You do not have administrative privileges to view this page.</p>
      </div>
    );
  }

  const handleResetPassword = async (staffId) => {
    if (!newPassword) return alert('Please enter a new password');
    try {
      await adminAPI.resetPassword(staffId, newPassword);
      alert('Password reset successfully!');
      setResettingId(null);
      setNewPassword('');
    } catch (err) {
      alert('Failed to reset password.');
    }
  };

  const handleSaveEnv = async () => {
    if (!window.confirm('WARNING: If you enter incorrect database credentials, the system will lose its connection. Are you sure you want to proceed?')) return;
    setEnvSaving(true);
    try {
      const res = await settingsAPI.setEnv(envContent, "");
      alert(res.message || '.env saved successfully!');
    } catch (err) {
      alert(err.message || 'Failed to save .env file.');
    } finally {
      setEnvSaving(false);
    }
  };

  const filteredStaffs = staffs.filter(s => {
    const q = search.toLowerCase();
    const matchName = s.name ? s.name.toLowerCase().includes(q) : false;
    const matchEmail = s.email ? s.email.toLowerCase().includes(q) : false;
    const matchDept = s.department ? s.department.toLowerCase().includes(q) : false;
    const matchesSearch = !q || matchName || matchEmail || matchDept;
    if (!matchesSearch) return false;

    if (statusFilter === 'changed') return !!s.is_password_changed;
    return true;
  });

  const filteredUnlockRequests = unlockRequests.filter(r => {
    const q = (unlockSearch || '').toLowerCase().trim();
    const matchName = r.staff_name ? r.staff_name.toLowerCase().includes(q) : false;
    const matchSubCode = r.subject_code ? r.subject_code.toLowerCase().includes(q) : false;
    const matchSubName = r.subject_name ? r.subject_name.toLowerCase().includes(q) : false;
    const matchClass = r.class_name ? r.class_name.toLowerCase().includes(q) : false;
    const matchReason = r.reason ? r.reason.toLowerCase().includes(q) : false;
    const matchesSearch = !q || matchName || matchSubCode || matchSubName || matchClass || matchReason;
    if (!matchesSearch) return false;

    if (unlockDeptFilter !== 'all') {
      const d = unlockDeptFilter.toLowerCase();
      const subDept = (r.subject_department || '').toLowerCase();
      const staffDept = (r.staff_department || '').toLowerCase();
      return subDept.includes(d) || staffDept.includes(d);
    }
    return true;
  });

  const filteredSubjectFreezeList = subjectFreezeList.filter(item => {
    if (!freezeSearch) return true;
    const q = freezeSearch.toLowerCase().trim();
    const code = (item.subject_code || '').toLowerCase();
    const name = (item.subject_name || '').toLowerCase();
    const cName = (item.class_name || '').toLowerCase();
    const sName = (item.staff_name || '').toLowerCase();
    return code.includes(q) || name.includes(q) || cName.includes(q) || sName.includes(q);
  });

  const changedCount = staffs.filter(s => s.is_password_changed).length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Shield size={28} color="#6C63FF" />
        <h2 style={{ margin: 0 }}>System Administrator Panel</h2>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab('staff')}
          style={{ 
            background: activeTab === 'staff' ? 'var(--primary)' : 'var(--surface)', 
            color: activeTab === 'staff' ? '#fff' : 'var(--text-primary)', 
            border: '1px solid var(--border-solid)', borderRadius: '8px', padding: '10px 16px', 
            cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' 
          }}
        >
          <Shield size={16} /> Staff Management
        </button>
        <button
          onClick={() => setActiveTab('unlocks')}
          style={{
            background: activeTab === 'unlocks' ? 'var(--primary)' : 'var(--surface)',
            color: activeTab === 'unlocks' ? '#fff' : 'var(--text-primary)',
            border: '1px solid var(--border-solid)', borderRadius: '8px', padding: '10px 16px',
            cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Key size={16} color="#D97706" /> Frozen Marks Unlock Requests ({unlockRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('subject_freeze')}
          style={{
            background: activeTab === 'subject_freeze' ? 'var(--primary)' : 'var(--surface)',
            color: activeTab === 'subject_freeze' ? '#fff' : 'var(--text-primary)',
            border: '1px solid var(--border-solid)', borderRadius: '8px', padding: '10px 16px',
            cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Lock size={16} color="#3B82F6" /> Subject Freeze/Unlock Management
        </button>
        <button
          onClick={() => setActiveTab('env')}
          style={{ 
            background: activeTab === 'env' ? 'var(--primary)' : 'var(--surface)', 
            color: activeTab === 'env' ? '#fff' : 'var(--text-primary)', 
            border: '1px solid var(--border-solid)', borderRadius: '8px', padding: '10px 16px', 
            cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' 
          }}
        >
          <Settings size={16} /> Environment Settings (.env)
        </button>
        <button 
          onClick={() => navigate('/admin/staff-classes')}
          style={{ 
            background: 'var(--surface)', 
            color: 'var(--text-primary)', 
            border: '1px solid var(--border-solid)', borderRadius: '8px', padding: '10px 16px', 
            cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
            marginLeft: 'auto'
          }}
        >
          <BookMarked size={16} color="#6366f1" /> Go to Staff Classes Directory →
        </button>
      </div>

      <div style={{ 
        background: 'var(--surface)', borderRadius: '12px', padding: '20px', 
        boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-solid)' 
      }}>
        {activeTab === 'staff' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem' }}>Staff Account & Security Management</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setStatusFilter('all')}
                    style={{
                      padding: '4px 10px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                      border: '1px solid var(--border-solid)',
                      background: 'var(--primary)',
                      color: '#fff'
                    }}
                  >
                    All Staff Directory ({staffs.length})
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-solid)' }}>
                <Search size={16} color="var(--text-muted)" />
                <input 
                  type="text" 
                  placeholder="Search staff..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px' }}>
                <Loader size={20} className="spinner" /> Loading staff directory...
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-solid)' }}>
                    <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Name</th>
                    <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Email</th>
                    <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Department</th>
                    <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Role</th>
                    <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Account Status</th>
                    <th style={{ padding: '12px 8px', color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaffs.map(staff => (
                    <tr key={staff.id} style={{ borderBottom: '1px solid var(--border-solid)' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 600 }}>{staff.name}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{staff.email}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{staff.department || 'IT'}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ 
                          padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                          background: staff.role === 'hod' ? '#FEF3C7' : '#E0E7FF',
                          color: staff.role === 'hod' ? '#B45309' : '#4338CA'
                        }}>
                          {staff.role.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ 
                          padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                          background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC',
                          display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          ● Active Account
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        {resettingId === staff.id ? (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <input 
                              type="password" 
                              placeholder="New Password"
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
                            />
                            <button onClick={() => handleResetPassword(staff.id)} style={{ background: '#10B981', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>Save</button>
                            <button onClick={() => {setResettingId(null); setNewPassword('');}} style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>Cancel</button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setResettingId(staff.id)}
                            style={{ background: 'transparent', border: '1px solid var(--border-solid)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}
                          >
                            <Key size={14} /> Reset Password
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredStaffs.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No staff members found matching "{search}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </>
        ) : activeTab === 'unlocks' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem' }}>Frozen Marks Unlock Request Management</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Review, approve, or reject marks unlock requests across all eight college departments.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Filter size={16} color="var(--text-muted)" />
                  <select
                    value={unlockDeptFilter}
                    onChange={(e) => setUnlockDeptFilter(e.target.value)}
                    aria-label="Filter unlock requests by department"
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-solid)',
                      background: 'var(--bg)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}
                  >
                    <option value="all">All Departments (8)</option>
                    <option value="Computer Science and Engineering">Computer Science and Engineering (CSE)</option>
                    <option value="Information Technology">Information Technology (IT)</option>
                    <option value="Artificial Intelligence and Data Science">Artificial Intelligence and Data Science (AI&DS)</option>
                    <option value="Electronics and Communication Engineering">Electronics and Communication Engineering (ECE)</option>
                    <option value="Electrical and Electronics Engineering">Electrical and Electronics Engineering (EEE)</option>
                    <option value="Civil Engineering">Civil Engineering (Civil)</option>
                    <option value="Mechanical Engineering">Mechanical Engineering (Mech)</option>
                    <option value="Science and Humanities">Science and Humanities (S&H)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-solid)' }}>
                  <Search size={16} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="Search faculty, subject, class..."
                    value={unlockSearch}
                    onChange={e => setUnlockSearch(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', width: '220px' }}
                  />
                </div>
              </div>
            </div>

            {unlocksLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '24px' }}>
                <Loader size={20} className="spinner" /> Loading unlock requests...
              </div>
            ) : filteredUnlockRequests.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                <Clock size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.5 }} />
                No pending frozen marks unlock requests found{unlockDeptFilter !== 'all' ? ` for ${unlockDeptFilter}` : ' across all departments'}.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-solid)' }}>
                      <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Faculty</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Subject</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Class &amp; Reg</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Reason</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Requested On</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnlockRequests.map((req) => {
                      const is2021 = req.regulation === '2021' || req.class_year === 'III' || req.class_year === 'IV' || (req.class_semester && parseInt(req.class_semester, 10) >= 5);
                      const regLabel = is2021 ? '2021' : '2025';
                      const isBusy = actionLoadingId === req.id;
                      return (
                        <tr key={req.id} style={{ borderBottom: '1px solid var(--border-solid)' }}>
                          <td style={{ padding: '12px 8px' }}>
                            <div style={{ fontWeight: 600 }}>{req.staff_name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{req.staff_department || 'Faculty'}</div>
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <div style={{ fontWeight: 600 }}>{req.subject_code ? `${req.subject_code} ` : ''}{req.subject_name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>[{req.subject_department || 'Department'}]</div>
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <div style={{ fontWeight: 500 }}>{req.class_name}</div>
                            <div style={{ marginTop: '2px' }}>
                              <span style={{
                                background: is2021 ? '#EEF2FF' : '#ECFDF5',
                                color: is2021 ? '#4F46E5' : '#059669',
                                border: `1px solid ${is2021 ? '#C7D2FE' : '#A7F3D0'}`,
                                padding: '1px 8px',
                                borderRadius: '10px',
                                fontSize: '0.74rem',
                                fontWeight: 700
                              }}>
                                Regulation {regLabel}
                              </span>
                              {req.session_label && (
                                <span style={{ marginLeft: '6px', fontSize: '0.8rem', opacity: 0.8 }}>({req.session_label})</span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '12px 8px', maxWidth: '240px', fontSize: '0.85rem' }}>
                            "{req.reason}"
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {req.requested_at ? (
                              <>
                                <div>{new Date(req.requested_at).toLocaleDateString()}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(req.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              </>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleAdminApproveUnlock(req.id, req.session_id, 'approve')}
                                disabled={isBusy}
                                style={{
                                  background: '#10B981',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '6px 12px',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  fontSize: '0.8rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Check size={14} /> Approve Unlock
                              </button>
                              <button
                                onClick={() => handleAdminApproveUnlock(req.id, req.session_id, 'reject')}
                                disabled={isBusy}
                                style={{
                                  background: '#EF4444',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '6px 12px',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  fontSize: '0.8rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <X size={14} /> Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : activeTab === 'subject_freeze' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={20} color="#3B82F6" />
                  Subject Freeze &amp; Marks Editing Management
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Directly freeze or unlock continuous assessment marks sheets across all eight departments and regulations without faculty requests.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={loadSubjectFreezeStatus}
                  disabled={freezeLoading}
                  style={{
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-solid)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Refresh subject statuses"
                >
                  <RefreshCw size={14} className={freezeLoading ? 'spinner' : ''} /> Refresh
                </button>
              </div>
            </div>

            {/* Filter Controls Bar */}
            <div style={{
              background: 'var(--bg)',
              border: '1px solid var(--border-solid)',
              borderRadius: '10px',
              padding: '14px 16px',
              marginBottom: '20px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              {/* Session Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Assessment:</span>
                <select
                  value={freezeSessionLabel}
                  onChange={(e) => setFreezeSessionLabel(e.target.value)}
                  aria-label="Filter by assessment session"
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-solid)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    fontWeight: 700
                  }}
                >
                  <option value="internal1">Internal 1 (CA-1)</option>
                  <option value="internal2">Internal 2 (CA-2)</option>
                </select>
              </div>

              {/* Department Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={15} color="var(--text-muted)" />
                <select
                  value={freezeDeptFilter}
                  onChange={(e) => setFreezeDeptFilter(e.target.value)}
                  aria-label="Filter subjects by department"
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-solid)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    fontWeight: 600
                  }}
                >
                  <option value="all">All Departments (8)</option>
                  <option value="Computer Science and Engineering">Computer Science and Engineering (CSE)</option>
                  <option value="Information Technology">Information Technology (IT)</option>
                  <option value="Artificial Intelligence and Data Science">Artificial Intelligence and Data Science (AI&DS)</option>
                  <option value="Electronics and Communication Engineering">Electronics and Communication Engineering (ECE)</option>
                  <option value="Electrical and Electronics Engineering">Electrical and Electronics Engineering (EEE)</option>
                  <option value="Civil Engineering">Civil Engineering (Civil)</option>
                  <option value="Mechanical Engineering">Mechanical Engineering (Mech)</option>
                  <option value="Science and Humanities">Science and Humanities (S&H)</option>
                </select>
              </div>

              {/* Regulation Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <select
                  value={freezeRegFilter}
                  onChange={(e) => setFreezeRegFilter(e.target.value)}
                  aria-label="Filter subjects by regulation"
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-solid)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    fontWeight: 600
                  }}
                >
                  <option value="all">All Regulations</option>
                  <option value="2025">Regulation 2025 (Years I &amp; II)</option>
                  <option value="2021">Regulation 2021 (Years III &amp; IV)</option>
                </select>
              </div>

              {/* Semester Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <select
                  value={freezeSemFilter}
                  onChange={(e) => setFreezeSemFilter(e.target.value)}
                  aria-label="Filter subjects by semester"
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-solid)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    fontWeight: 600
                  }}
                >
                  <option value="all">All Semesters</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--surface)',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-solid)',
                marginLeft: 'auto'
              }}>
                <Search size={15} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search code, name, class..."
                  value={freezeSearch}
                  onChange={e => setFreezeSearch(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', width: '180px' }}
                />
              </div>
            </div>

            {/* Quick Status Count Metrics */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ background: 'var(--bg)', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-solid)', fontSize: '0.82rem', fontWeight: 600 }}>
                Showing: <strong>{filteredSubjectFreezeList.length}</strong> subjects
              </div>
              <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '8px 14px', borderRadius: '8px', border: '1px solid #FECACA', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={13} /> Frozen &amp; Locked: {filteredSubjectFreezeList.filter(s => s.is_frozen).length}
              </div>
              <div style={{ background: '#ECFDF5', color: '#065F46', padding: '8px 14px', borderRadius: '8px', border: '1px solid #A7F3D0', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Unlock size={13} /> Unlocked (Editable): {filteredSubjectFreezeList.filter(s => !s.is_frozen).length}
              </div>
            </div>

            {freezeLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '24px' }}>
                <Loader size={20} className="spinner" /> Loading subject statuses across departments...
              </div>
            ) : filteredSubjectFreezeList.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                <Clock size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.5 }} />
                No subjects found matching the selected filters.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-solid)' }}>
                      <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Subject</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Class &amp; Regulation</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Assessment</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Current Status</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubjectFreezeList.map((sub) => {
                      const is2021 = sub.regulation === '2021';
                      const isBusy = freezeActionLoadingId === sub.subject_id;
                      return (
                        <tr key={sub.subject_id} style={{ borderBottom: '1px solid var(--border-solid)' }}>
                          <td style={{ padding: '12px 8px' }}>
                            <div style={{ fontWeight: 600 }}>{sub.subject_code} — {sub.subject_name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '2px' }}>
                              [{sub.subject_department}]
                            </div>
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <div style={{ fontWeight: 500 }}>{sub.class_name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                              <span style={{
                                background: is2021 ? '#EEF2FF' : '#ECFDF5',
                                color: is2021 ? '#4F46E5' : '#059669',
                                border: `1px solid ${is2021 ? '#C7D2FE' : '#A7F3D0'}`,
                                padding: '1px 8px',
                                borderRadius: '10px',
                                fontSize: '0.74rem',
                                fontWeight: 700
                              }}>
                                Regulation {sub.regulation}
                              </span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Sem {sub.semester || sub.class_semester || sub.subject_semester}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '0.85rem' }}>
                            <strong>{freezeSessionLabel === 'internal2' ? 'Internal 2 (CA-2)' : 'Internal 1 (CA-1)'}</strong>
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            {sub.is_frozen ? (
                              <span style={{
                                background: '#FEE2E2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}>
                                <Lock size={12} /> Frozen &amp; Locked
                              </span>
                            ) : (
                              <span style={{
                                background: '#ECFDF5',
                                color: '#059669',
                                border: '1px solid #A7F3D0',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}>
                                <Unlock size={12} /> Unlocked (Editable)
                              </span>
                            )}
                            {sub.session_updated_at && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                                Updated: {new Date(sub.session_updated_at).toLocaleDateString()}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              {sub.is_frozen ? (
                                <button
                                  onClick={() => handleToggleSubjectFreeze(sub, 'unlock')}
                                  disabled={isBusy}
                                  style={{
                                    background: '#10B981',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    cursor: isBusy ? 'not-allowed' : 'pointer',
                                    opacity: isBusy ? 0.6 : 1,
                                    fontWeight: 600,
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                  }}
                                >
                                  {isBusy ? <Loader size={13} className="spinner" /> : <Unlock size={13} />}
                                  Directly Unlock
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleSubjectFreeze(sub, 'freeze')}
                                  disabled={isBusy}
                                  style={{
                                    background: '#EF4444',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    cursor: isBusy ? 'not-allowed' : 'pointer',
                                    opacity: isBusy ? 0.6 : 1,
                                    fontWeight: 600,
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                  }}
                                >
                                  {isBusy ? <Loader size={13} className="spinner" /> : <Lock size={13} />}
                                  Directly Freeze
                                </button>
                              )}
                              {sub.session_id && (
                                <button
                                  onClick={() => handleViewAuditLog(sub.session_id, `${sub.subject_code} - ${sub.subject_name}`)}
                                  title="View Subject Audit Trail"
                                  style={{
                                    background: 'var(--surface-hover)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-solid)',
                                    borderRadius: '6px',
                                    padding: '6px 8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.78rem'
                                  }}
                                >
                                  <History size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>.env Configuration</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Carefully modify the environment variables below. Saving invalid configurations may crash the server.</span>
              </div>
              <button 
                onClick={handleSaveEnv}
                disabled={envSaving || envLoading}
                style={{ background: '#10B981', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
              >
                {envSaving ? <Loader size={16} className="spinner" /> : <Save size={16} />} 
                {envSaving ? 'Saving & Restarting...' : 'Save Configuration'}
              </button>
            </div>

            {envLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px' }}>
                <Loader size={20} className="spinner" /> Loading environment variables...
              </div>
            ) : (
              <textarea
                value={envContent}
                onChange={(e) => setEnvContent(e.target.value)}
                spellCheck={false}
                style={{
                  width: '100%',
                  height: '400px',
                  fontFamily: 'monospace',
                  padding: '16px',
                  borderRadius: '8px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border-solid)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  resize: 'vertical'
                }}
              />
            )}
            
            <div style={{ marginTop: '16px', padding: '12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ color: '#991B1B', fontSize: '0.85rem' }}>
                <strong>Caution:</strong> When you click Save, the system will instantly reconnect to the database using these exact settings. If you enter an incorrect password or database name, the website will lose its connection until you fix it.
              </div>
            </div>
          </>
        )}
      </div>

      {/* Audit Trail Modal */}
      {auditModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--surface)',
            borderRadius: '12px',
            border: '1px solid var(--border-solid)',
            boxShadow: 'var(--shadow-lg)',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-solid)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={18} color="var(--primary)" /> Audit Trail: {auditSubjectTitle}
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Recorded state transitions and marks modifications in marks_audit_logs
                </span>
              </div>
              <button
                onClick={() => setAuditModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  color: 'var(--text-secondary)'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {auditLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px', justifyContent: 'center' }}>
                  <Loader size={20} className="spinner" /> Loading audit history...
                </div>
              ) : auditLogs.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No audit log entries recorded for this session yet.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-solid)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 6px' }}>Timestamp</th>
                      <th style={{ padding: '8px 6px' }}>Action</th>
                      <th style={{ padding: '8px 6px' }}>Field</th>
                      <th style={{ padding: '8px 6px' }}>Transition</th>
                      <th style={{ padding: '8px 6px' }}>Actor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border-solid)' }}>
                        <td style={{ padding: '8px 6px', color: 'var(--text-secondary)' }}>
                          {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                        </td>
                        <td style={{ padding: '8px 6px' }}>
                          <span style={{
                            background: log.action_type?.includes('FREEZE') ? '#FEE2E2' : '#ECFDF5',
                            color: log.action_type?.includes('FREEZE') ? '#DC2626' : '#059669',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '0.74rem'
                          }}>
                            {log.action_type || 'CHANGE'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 6px', fontWeight: 600 }}>{log.field_name || '-'}</td>
                        <td style={{ padding: '8px 6px' }}>
                          <span style={{ textDecoration: 'line-through', opacity: 0.6, marginRight: '4px' }}>
                            {log.old_value || 'None'}
                          </span>
                          &rarr;
                          <span style={{ fontWeight: 700, marginLeft: '4px' }}>
                            {log.new_value || 'None'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 6px' }}>
                          <div style={{ fontWeight: 600 }}>{log.user_name || log.user_id || 'Admin'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-solid)', textAlign: 'right' }}>
              <button
                onClick={() => setAuditModalOpen(false)}
                style={{
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border-solid)',
                  color: 'var(--text-primary)',
                  padding: '6px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
