import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Sun, Moon, Menu, FileText, Users, BookOpen, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './Header.module.css';
import NotificationsDropdown from './NotificationsDropdown';

const pageTitles = {
  '/dashboard': { title: 'Dashboard', sub: 'Welcome back! Here\'s your overview.' },
  '/marks-entry': { title: '2025 Reg. Marks', sub: 'Continuous Assessment mark entry for II Year.' },
  '/marks-entry-2021': { title: '2021 Reg. Marks', sub: 'Assessment mark entry for III & IV Year (2021 Regulation).' },
  '/students': { title: 'Students', sub: 'View and manage your student roster.' },
  '/reports': { title: 'Reports & Analytics', sub: 'Insights and performance data.' },
  '/settings': { title: 'Settings', sub: 'Manage your account and preferences.' },
};

const searchablePages = [
  { name: 'Dashboard Overview', path: '/dashboard', cat: 'Page', icon: FileText },
  { name: '2025 Reg. Marks (II Year)', path: '/marks-entry', cat: 'Action', icon: BookOpen },
  { name: '2021 Reg. Marks (III & IV Year)', path: '/marks-entry-2021', cat: 'Action', icon: BookOpen },
  { name: 'Manage Classes & Subjects', path: '/admin/classes', cat: 'Admin', icon: BookOpen },
  { name: 'Manage Staff Members & Credentials', path: '/admin/staffs', cat: 'Admin', icon: Users },
  { name: 'Manage Students Roster', path: '/admin/students', cat: 'Admin', icon: Users },
  { name: 'Official Reports & Analytics', path: '/reports', cat: 'Reports', icon: FileText },
  { name: 'Account Settings & Profile', path: '/settings', cat: 'Settings', icon: FileText },
];

export default function Header({ onMobileToggle, darkMode, onToggleDark }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const pageInfo = pageTitles[location.pathname] || { title: 'NSCET-MarkHub', sub: 'Centralized Academic Mark Entry & Management System' };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'FA';

  const filteredResults = searchVal.trim()
    ? searchablePages.filter(p => p.name.toLowerCase().includes(searchVal.toLowerCase()) || p.cat.toLowerCase().includes(searchVal.toLowerCase()))
    : [];

  const handleSelectResult = (path) => {
    navigate(path);
    setSearchVal('');
    setSearchOpen(false);
  };

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

      {/* Aligned Left: Search, Theme Toggle, Notifications, User Chip */}
      <div className={styles.leftActions}>
        {/* Search Bar with Live Results */}
        <div className={`${styles.searchBox} ${searchOpen ? styles.searchOpen : ''}`}>
          <button
            className={styles.iconBtn}
            onClick={() => setSearchOpen(!searchOpen)}
            id="search-toggle-btn"
            title="Search Portal"
          >
            <Search size={18} />
          </button>
          {searchOpen && (
            <div className={styles.searchWrapper}>
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Search pages, actions, settings..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                autoFocus
                id="header-search-input"
              />
              {searchVal && (
                <button className={styles.clearSearchBtn} onClick={() => setSearchVal('')}>
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* Live Search Results Dropdown */}
          {searchOpen && searchVal && (
            <div className={styles.searchResultsDropdown}>
              {filteredResults.length > 0 ? (
                filteredResults.map((res) => (
                  <div 
                    key={res.path} 
                    className={styles.searchResultItem}
                    onClick={() => handleSelectResult(res.path)}
                  >
                    <res.icon size={16} className={styles.searchResultIcon} />
                    <div className={styles.searchResultText}>
                      <span className={styles.searchResultTitle}>{res.name}</span>
                      <span className={styles.searchResultCategory}>{res.cat}</span>
                    </div>
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </div>
                ))
              ) : (
                <div className={styles.noSearchResult}>No pages or records found</div>
              )}
            </div>
          )}
        </div>

        {/* Dark / Light Theme Toggle */}
        <button className={styles.iconBtn} onClick={onToggleDark} title="Toggle Theme" id="dark-mode-btn">
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Real Working Notifications Dropdown */}
        <NotificationsDropdown />

        {/* User Profile Chip (Navigates to Settings on Click) */}
        <div 
          className={styles.userChip} 
          onClick={() => navigate('/settings')} 
          title="Click to view Account Settings"
        >
          <div className={styles.avatarSmall}>
            {initials}
          </div>
          <div className={styles.userMeta}>
            <span className={styles.userName}>{user?.name || 'Faculty Staff'}</span>
            <span className={styles.userDept}>{user?.department || 'Information Technology'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
