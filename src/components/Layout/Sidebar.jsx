import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardEdit,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  GraduationCap,
  BookOpen,
  Bell,
  KeyRound,
  BookMarked,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './Sidebar.module.css';

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';

  const isPrincipal = user?.role === 'principal' || user?.role === 'vice_principal';

  const navItems = isAdmin
    ? [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/admin/classes', icon: BookOpen, label: 'Manage Classes' },
        { to: '/admin/subjects', icon: ClipboardEdit, label: 'Manage Subjects' },
        { to: '/admin/staffs', icon: Users, label: 'Manage Staffs' },
        { to: '/admin/students', icon: GraduationCap, label: 'Manage Students' },
        { to: '/reports', icon: BarChart3, label: 'Reports' },
        { to: '/settings', icon: Settings, label: 'Settings' },
      ]
    : [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/marks-entry', icon: ClipboardEdit, label: '2025 Reg. Marks' },
        { to: '/marks-entry-2021', icon: BookMarked, label: '2021 Reg. Marks' },
        { to: '/settings', icon: Settings, label: 'Settings' },
      ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'FA';

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Top Section: User Profile & First-Letter Avatar */}
      <div className={styles.sidebarUserHeader}>
        <div className={styles.headerAvatar} title={user?.name || 'User'}>
          {initials}
        </div>
        {!collapsed && (
          <div className={styles.headerUserInfo}>
            <span className={styles.headerUserName}>{user?.name || 'Faculty'}</span>
            <span className={styles.headerUserSub}>
              {user?.role === 'principal' ? 'Principal' : user?.role === 'vice_principal' ? 'Vice Principal' : user?.role === 'hod' ? 'HOD' : user?.isClassCoordinator ? 'Class In-charge' : 'Staff'} · {user?.department || 'IT'}
            </span>
          </div>
        )}
      </div>

      {/* Sleek Collapse/Expand Toggle Button */}
      <button
        className={`${styles.toggleBtn} ${collapsed ? styles.toggleCollapsed : ''}`}
        onClick={onToggle}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeft size={15} />
      </button>

      {/* Navigation */}
      <nav className={styles.nav}>
        {!collapsed && <span className={styles.navLabel}>MAIN MENU</span>}
        {navItems.map(({ to, icon: Icon, label }) => (
          <div key={to}>

            <NavLink
              to={to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
              title={collapsed ? label : undefined}
            >
              <span className={styles.navIcon}>
                <Icon size={20} />
              </span>
              {!collapsed && <span className={styles.navItemLabel}>{label}</span>}
            </NavLink>
          </div>
        ))}
      </nav>


      {/* Logout Action */}
      <div className={styles.bottomBar}>
        <button className={styles.logoutFullBtn} onClick={handleLogout} title="Logout">
          <LogOut size={18} />
          {!collapsed && <span>Logout Account</span>}
        </button>
      </div>
    </aside>
  );
}
