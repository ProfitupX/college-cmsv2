import { createContext, useContext, useState } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    // Persist login across page refresh
    const saved = sessionStorage.getItem('cms_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

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
