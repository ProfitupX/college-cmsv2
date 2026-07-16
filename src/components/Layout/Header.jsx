import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, Sun, Moon, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './Header.module.css';

const pageTitles = {
  '/dashboard': { title: 'Dashboard', sub: 'Welcome back! Here\'s your overview.' },
  '/marks-entry': { title: 'Marks Entry', sub: 'Enter and manage student assessment marks.' },
  '/students': { title: 'Students', sub: 'View and manage your student roster.' },
  '/reports': { title: 'Reports & Analytics', sub: 'Insights and performance data.' },
  '/settings': { title: 'Settings', sub: 'Manage your account and preferences.' },
};

export default function Header({ onMobileToggle, darkMode, onToggleDark }) {
  const { user } = useAuth();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);

  const pageInfo = pageTitles[location.pathname] || { title: 'CMS', sub: '' };

  const notifications = [
    { id: 1, text: 'Marks submission for CS301 is pending', time: '2h ago', unread: true },
    { id: 2, text: 'New student added to CS - Sem 3 - A', time: '5h ago', unread: true },
    { id: 3, text: 'Report generated for July session', time: '1d ago', unread: false },
  ];
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className={styles.header}>
      {/* Left: Page Title */}
      <div className={styles.left}>
        <button className={styles.mobileMenu} onClick={onMobileToggle} id="mobile-menu-btn">
          <Menu size={20} />
        </button>
        <div>
          <h1 className={styles.title}>{pageInfo.title}</h1>
          <p className={styles.sub}>{pageInfo.sub}</p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className={styles.right}>
        {/* Search */}
        <div className={`${styles.searchBox} ${searchOpen ? styles.searchOpen : ''}`}>
          <button
            className={styles.iconBtn}
            onClick={() => setSearchOpen(!searchOpen)}
            id="search-toggle-btn"
          >
            <Search size={18} />
          </button>
          {searchOpen && (
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search students, subjects..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              autoFocus
              id="header-search-input"
            />
          )}
        </div>

        {/* Dark Mode */}
        <button className={styles.iconBtn} onClick={onToggleDark} title="Toggle Theme" id="dark-mode-btn">
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <div className={styles.notifWrapper}>
          <button
            className={styles.iconBtn}
            onClick={() => setNotifOpen(!notifOpen)}
            id="notif-btn"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className={styles.notifDot}>{unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className={styles.notifDropdown}>
              <div className={styles.notifHeader}>
                <span>Notifications</span>
                <span className={styles.notifCount}>{unreadCount} new</span>
              </div>
              {notifications.map((n) => (
                <div key={n.id} className={`${styles.notifItem} ${n.unread ? styles.notifUnread : ''}`}>
                  <div className={styles.notifDotSmall} />
                  <div>
                    <p className={styles.notifText}>{n.text}</p>
                    <p className={styles.notifTime}>{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className={styles.userChip}>
          <div className={styles.avatarSmall}>
            {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'FA'}
          </div>
          <div className={styles.userMeta}>
            <span className={styles.userName}>{user?.name?.split(' ')[0] || 'Faculty'}</span>
            <span className={styles.userDept}>{user?.department || 'Department'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
