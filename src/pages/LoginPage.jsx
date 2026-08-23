import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, Lock, Mail, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { login, loading, error, setError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) navigate('/dashboard');
  };

  return (
    <div className={styles.page}>
      {/* Background Blobs */}
      <div className={styles.blob1} />
      <div className={styles.blob2} />
      <div className={styles.blob3} />

      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoSection}>
          <div className={styles.logoIcon}>
            <GraduationCap size={28} color="#fff" />
          </div>
          <div>
            <h1 className={styles.appName}>NSCET-MarkHub</h1>
            <p className={styles.appSub}>Centralized Academic Mark Entry & Management System</p>
          </div>
        </div>

        <h2 className={styles.heading}>Welcome back 👋</h2>
        <p className={styles.subheading}>Sign in to your faculty portal to continue</p>

        {/* Demo Hint */}
     

        <form onSubmit={handleSubmit} className={styles.form} id="login-form">
          {/* Email */}
          <div className={styles.field}>
            <label htmlFor="login-email" className={styles.label}>Email Address</label>
            <div className={styles.inputWrap}>
              <Mail size={16} className={styles.inputIcon} />
              <input
                id="login-email"
                type="email"
                className={styles.input}
                placeholder="faculty@nscet.org"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label htmlFor="login-password" className={styles.label}>Password</label>
            <div className={styles.inputWrap}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                className={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPass((s) => !s)}
                id="toggle-password-btn"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && <div className={styles.error}>{error}</div>}

          {/* Submit */}
          <button
            type="submit"
            id="login-submit-btn"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader size={18} className={styles.spinner} />
                Signing in...
              </>
            ) : (
              'Sign In to Portal'
            )}
          </button>
        </form>

        <p className={styles.footer}>
          College Marks Management System &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
