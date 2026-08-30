import { useState, useEffect } from 'react';
import { adminAPI, settingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Shield, Key, Search, Loader, AlertCircle, Save, Settings } from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resettingId, setResettingId] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Environment Settings State
  const [activeTab, setActiveTab] = useState('staff');
  const [envContent, setEnvContent] = useState('');
  const [envLoading, setEnvLoading] = useState(false);
  const [envSaving, setEnvSaving] = useState(false);

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
    return matchName || matchEmail;
  });

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Shield size={28} color="#6C63FF" />
        <h2 style={{ margin: 0 }}>System Administrator Panel</h2>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
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
      </div>

      <div style={{ 
        background: 'var(--surface)', borderRadius: '12px', padding: '20px', 
        boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-solid)' 
      }}>
        {activeTab === 'staff' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Staff Password Management</h3>
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
    </div>
  );
}
