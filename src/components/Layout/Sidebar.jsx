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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './Sidebar.module.css';

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';

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
        { to: '/marks-entry', icon: ClipboardEdit, label: 'Marks Entry' },
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
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <GraduationCap size={22} color="#fff" />
        </div>
        {!collapsed && (
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>CMS</span>
            <span className={styles.logoSub}>College Portal</span>
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        className={`${styles.toggleBtn} ${collapsed ? styles.toggleCollapsed : ''}`}
        onClick={onToggle}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeft size={16} />
      </button>

      {/* Navigation */}
      <nav className={styles.nav}>
        {!collapsed && <span className={styles.navLabel}>MENU</span>}
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
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
            {!collapsed && to === '/marks-entry' && (
              <span className={styles.badge}>New</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Notifications quick (bottom) */}
      {!collapsed && (
        <div className={styles.notifCard}>
          <div className={styles.notifIcon}>
            <Bell size={18} color="#6C63FF" />
          </div>
          <div className={styles.notifContent}>
            <p className={styles.notifTitle}>3 Pending</p>
            <p className={styles.notifSub}>Marks submissions due</p>
          </div>
        </div>
      )}

      {/* User Profile */}
      <div className={styles.userSection}>
        <div className={styles.avatar}>{initials}</div>
        {!collapsed && (
          <div className={styles.userInfo}>
            <p className={styles.userName}>{user?.name || 'Faculty'}</p>
            <p className={styles.userRole}>{user?.designation || 'Staff'}</p>
          </div>
        )}
        <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
