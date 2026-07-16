import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MarksProvider } from './context/MarksContext';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MarksEntryPage from './pages/MarksEntryPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import ManageClasses from './pages/Admin/ManageClasses';
import ManageStaffs from './pages/Admin/ManageStaffs';
import ManageSubjects from './pages/Admin/ManageSubjects';
import ManageStudents from './pages/Admin/ManageStudents';

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
      <Route path="/admin/classes" element={<AdminRoute><ManageClasses /></AdminRoute>} />
      <Route path="/admin/staffs" element={<AdminRoute><ManageStaffs /></AdminRoute>} />
      <Route path="/admin/subjects" element={<AdminRoute><ManageSubjects /></AdminRoute>} />
      <Route path="/admin/students" element={<AdminRoute><ManageStudents /></AdminRoute>} />
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
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
