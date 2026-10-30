import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, staffsAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    // Persist login across page refresh
    const saved = sessionStorage.getItem('cms_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Dynamically synchronize current user's role, department, and postings in real-time
  useEffect(() => {
    if (!user?.id) return;
    const syncProfile = async () => {
      try {
        const all = await staffsAPI.getAll();
        if (Array.isArray(all)) {
          const fresh = all.find(s => s.id === user.id || (s.email && user.email && s.email.toLowerCase() === user.email.toLowerCase()));
          if (fresh) {
            setUser(prev => {
              if (!prev) return fresh;
              const hasChange = prev.role !== fresh.role || prev.department !== fresh.department || prev.name !== fresh.name || prev.designation !== fresh.designation;
              if (!hasChange) return prev;
              const updated = {
                ...prev,
                name: fresh.name || prev.name,
                role: fresh.role || prev.role,
                department: fresh.department || prev.department,
                designation: fresh.designation || prev.designation
              };
              sessionStorage.setItem('cms_user', JSON.stringify(updated));
              return updated;
            });
          }
        }
      } catch (e) {}
    };

    syncProfile();
    window.addEventListener('focus', syncProfile);
    return () => window.removeEventListener('focus', syncProfile);
  }, [user?.id, user?.email]);

  const login = async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const data = await authAPI.login(email, password);
      setUser(data.user);
      sessionStorage.setItem('cms_user', JSON.stringify(data.user));
      return true;
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('cms_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
