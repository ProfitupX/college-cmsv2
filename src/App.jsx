import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MarksProvider } from './context/MarksContext';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MarksEntryPage from './pages/MarksEntryPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import ManageClasses from './pages/Admin/ManageClasses';
import ManageStaffs from './pages/Admin/ManageStaffs';
import ManageSubjects from './pages/Admin/ManageSubjects';
import ManageStudents from './pages/Admin/ManageStudents';
import StaffClasses from './pages/Admin/StaffClasses';
import MarksEntryPage2021 from './pages/MarksEntryPage2021';

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

// Public Route — redirects to dashboard if already logged in
function PublicRoute({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

// Admin Route wrapper
function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/marks-entry"
        element={
          <ProtectedRoute>
            <MarksEntryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/marks-entry-2021"
        element={
          <ProtectedRoute>
            <MarksEntryPage2021 />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      {/* Admin Only Routes */}
      <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
      <Route path="/admin/classes" element={<AdminRoute><ManageClasses /></AdminRoute>} />
      <Route path="/admin/staffs" element={<AdminRoute><ManageStaffs /></AdminRoute>} />
      <Route path="/admin/credentials" element={<Navigate to="/admin/staffs" replace />} />
      <Route path="/admin/subjects" element={<AdminRoute><ManageSubjects /></AdminRoute>} />
      <Route path="/admin/students" element={<AdminRoute><ManageStudents /></AdminRoute>} />
      <Route path="/admin/staff-classes" element={<AdminRoute><StaffClasses /></AdminRoute>} />
      <Route path="/admin/staff_classes" element={<AdminRoute><StaffClasses /></AdminRoute>} />
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const stored = localStorage.getItem('markhub_build_time');
          if (stored && data.buildTime && String(data.buildTime) !== stored) {
            console.log('[MarkHub] Newer build detected! Reloading page to update assets...');
            localStorage.setItem('markhub_build_time', String(data.buildTime));
            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map(k => caches.delete(k)));
            }
            window.location.reload();
          } else if (data.buildTime) {
            localStorage.setItem('markhub_build_time', String(data.buildTime));
          }
        }
      } catch (e) {
        // network error / offline
      }
    };

    checkVersion();
    window.addEventListener('focus', checkVersion);
    return () => window.removeEventListener('focus', checkVersion);
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <MarksProvider>
          <AppRoutes />
        </MarksProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
