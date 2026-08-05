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
        { to: '/marks-entry', icon: ClipboardEdit, label: isPrincipal ? 'Student Marks' : 'Marks Entry' },
        { to: '/marks-entry-2021', icon: BookMarked, label: isPrincipal ? 'Student Marks (2021)' : '2021 Reg. Marks' },
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
          <>
            {/* Section divider before 2021 Reg link */}
            {to === '/marks-entry-2021' && !collapsed && (
              <div style={{
                fontSize: '0.65rem',
                color: 'var(--text-secondary)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '10px 14px 4px',
                opacity: 0.6,
              }}>2021 Regulation</div>
            )}
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
              {!collapsed && to === '/marks-entry-2021' && (
                <span className={styles.badge} style={{ background: '#7c3aed' }}>3rd/4th</span>
              )}
            </NavLink>
          </>
        ))}
      </nav>

      {/* Notifications quick card (bottom) */}
      {!collapsed && (
        <div className={styles.notifCard}>
          <div className={styles.notifIcon}>
            <Bell size={18} color="#fff" />
          </div>
          <div className={styles.notifContent}>
            <p className={styles.notifTitle}>Notifications</p>
            <p className={styles.notifSub}>3 updates pending</p>
          </div>
        </div>
      )}

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
