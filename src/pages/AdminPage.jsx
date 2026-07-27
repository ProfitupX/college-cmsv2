import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Shield, Key, Search, Loader, AlertCircle } from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resettingId, setResettingId] = useState(null);
  const [newPassword, setNewPassword] = useState('');

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

  const filteredStaffs = staffs.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Shield size={28} color="#6C63FF" />
        <h2 style={{ margin: 0 }}>System Administrator Panel</h2>
      </div>

      <div style={{ 
        background: 'var(--surface)', borderRadius: '12px', padding: '20px', 
        boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-solid)' 
      }}>
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
      </div>
    </div>
  );
}
