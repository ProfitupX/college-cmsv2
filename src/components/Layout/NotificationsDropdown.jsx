import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import styles from './NotificationsDropdown.module.css';

export default function NotificationsDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Helper to determine if a department matches the user's department
  const isDeptMatch = (targetDept, userDept) => {
    if (!targetDept || !userDept) return false;
    const t = targetDept.toLowerCase().trim();
    const u = userDept.toLowerCase().trim();
    if (t === u) return true;
    if (u.includes('science') || u.includes('humanities') || u === 's&h') {
      return t.includes('science') || t.includes('humanities') || t === 's&h' || t === 'first year';
    }
    if (u.includes('computer') || u === 'cse') return t.includes('computer') || t === 'cse';
    if (u.includes('information') || u === 'it') return t.includes('information') || t === 'it';
    if (u.includes('artificial') || u.includes('data') || u === 'ai&ds' || u === 'ad') {
      return t.includes('artificial') || t.includes('data') || t === 'ai&ds' || t === 'ad';
    }
    if (u.includes('communication') || u === 'ece') return t.includes('communication') || t === 'ece';
    if (u.includes('electrical') || u === 'eee') return t.includes('electrical') || t === 'eee';
    if (u.includes('mech')) return t.includes('mech');
    if (u.includes('civil')) return t.includes('civil');
    return false;
  };

  // Detect subject department from legacy message text
  const detectDeptFromText = (text = '') => {
    const t = text.toUpperCase();
    if (t.includes('MA25') || t.includes('PH25') || t.includes('CY25') || t.includes('EN25') || t.includes('UC25') || t.includes('GE25') || t.includes('HS25') ||
        t.includes('MA8') || t.includes('PH8') || t.includes('CY8') || t.includes('GE8') || t.includes('HS8') ||
        t.includes('I YEAR') || t.includes('FIRST YEAR') || t.includes('S&H') || t.includes('SCIENCE AND HUMANITIES')) {
      return 'Science and Humanities';
    }
    if (t.includes('IT25') || t.includes('CW25') || t.includes('IT8') || t.includes('INFORMATION TECHNOLOGY') || t.includes(' IT ') || t.includes('(IT)')) {
      return 'Information Technology';
    }
    if (t.includes('CS25') || t.includes('CS35') || t.includes('CCS') || t.includes('CS8') || t.includes('COMPUTER SCIENCE') || t.includes('CSE')) {
      return 'Computer Science and Engineering';
    }
    if (t.includes('AD25') || t.includes('AD35') || t.includes('AD8') || t.includes('ARTIFICIAL INTELLIGENCE') || t.includes('AI&DS') || t.includes('AIDS')) {
      return 'Artificial Intelligence and Data Science';
    }
    if (t.includes('EC25') || t.includes('EC35') || t.includes('EC8') || t.includes('ELECTRONICS AND COMMUNICATION') || t.includes('ECE')) {
      return 'Electronics and Communication Engineering';
    }
    if (t.includes('EE25') || t.includes('EE35') || t.includes('EE8') || t.includes('ELECTRICAL AND ELECTRONICS') || t.includes('EEE')) {
      return 'Electrical and Electronics Engineering';
    }
    if (t.includes('ME25') || t.includes('ME35') || t.includes('ME37') || t.includes('ME8') || t.includes('MECHANICAL') || t.includes('MECH')) {
      return 'Mechanical Engineering';
    }
    if (t.includes('CE25') || t.includes('CE35') || t.includes('CE8') || t.includes('CIVIL')) {
      return 'Civil Engineering';
    }
    return null;
  };

  const fetchNotifications = async () => {
    if (!user || !user.role || !user.id) return;
    try {
      const data = await notificationsAPI.get(user.role, user.id, user.department);
      if (Array.isArray(data)) {
        const readStorageKey = `cms_read_notifs_${user.id}`;
        const delStorageKey = `cms_deleted_notifs_${user.id}`;
        let locallyRead = [];
        let locallyDeleted = [];
        try {
          locallyRead = JSON.parse(localStorage.getItem(readStorageKey) || '[]');
        } catch {
          locallyRead = [];
        }
        try {
          locallyDeleted = JSON.parse(localStorage.getItem(delStorageKey) || '[]');
        } catch {
          locallyDeleted = [];
        }
        const readSet = new Set(locallyRead);
        const delSet = new Set(locallyDeleted);

        const isSuperUser = ['principal', 'vice_principal', 'admin'].includes(user.role);

        const processed = data
          .filter(n => !delSet.has(n.id))
          .filter(n => {
            // Direct personal notifications always pass
            if (n.target_id === user.id) return true;
            // Superusers see all
            if (isSuperUser) return true;

            // Role hierarchy check
            if (user.role === 'faculty') {
              if (n.target_role === 'hod') return false;
              if (n.target_role === 'class_coordinator' && !user.isClassCoordinator) return false;
            } else if (user.role === 'class_coordinator') {
              if (n.target_role === 'hod') return false;
            }

            // Department isolation check
            const notifDept = n.target_department || detectDeptFromText(`${n.title} ${n.message}`);
            if (notifDept) {
              return isDeptMatch(notifDept, user.department);
            }

            // If notification targets a department-specific role (hod, class_coordinator) but department was not identified, do NOT leak it across departments!
            if (['hod', 'class_coordinator'].includes(n.target_role)) {
              return false;
            }

            // General broadcast notifications (no department specified)
            return n.target_role === 'all' || n.target_role === user.role;
          })
          .map(n => ({
            ...n,
            is_read: n.target_id === user.id ? (n.is_read ? 1 : 0) : (readSet.has(n.id) ? 1 : 0)
          }));
        setNotifications(processed);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id, e) => {
    if (e) {
      if (e.stopPropagation) e.stopPropagation();
      if (e.preventDefault) e.preventDefault();
    }
    try {
      await notificationsAPI.markRead(id);
    } catch (err) {
      console.error(err);
    }

    if (user?.id) {
      const readStorageKey = `cms_read_notifs_${user.id}`;
      try {
        const locallyRead = JSON.parse(localStorage.getItem(readStorageKey) || '[]');
        if (!locallyRead.includes(id)) {
          locallyRead.push(id);
          localStorage.setItem(readStorageKey, JSON.stringify(locallyRead));
        }
      } catch {}
    }

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
  };

  const handleMarkAllRead = async (e) => {
    if (e) {
      if (e.stopPropagation) e.stopPropagation();
      if (e.preventDefault) e.preventDefault();
    }
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    if (user?.id) {
      const readStorageKey = `cms_read_notifs_${user.id}`;
      try {
        const locallyRead = JSON.parse(localStorage.getItem(readStorageKey) || '[]');
        const updated = Array.from(new Set([...locallyRead, ...unreadIds]));
        localStorage.setItem(readStorageKey, JSON.stringify(updated));
      } catch {}
    }

    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));

    for (const id of unreadIds) {
      notificationsAPI.markRead(id).catch(() => {});
    }
  };

  const handleDelete = async (id, e) => {
    if (e) {
      if (e.stopPropagation) e.stopPropagation();
      if (e.preventDefault) e.preventDefault();
    }
    
    // 1. Immediately remove from UI
    setNotifications(prev => prev.filter(n => n.id !== id));

    // 2. Persist in user local storage so it never reappears on refetch
    if (user?.id) {
      const delStorageKey = `cms_deleted_notifs_${user.id}`;
      try {
        const locallyDeleted = JSON.parse(localStorage.getItem(delStorageKey) || '[]');
        if (!locallyDeleted.includes(id)) {
          locallyDeleted.push(id);
          localStorage.setItem(delStorageKey, JSON.stringify(locallyDeleted));
        }
      } catch {}
    }

    // 3. Call backend API to delete from DB
    try {
      await notificationsAPI.delete(id);
    } catch (err) {
      console.warn('Backend notification delete notice:', err.message);
    }
  };

  const handleClearAll = async (e) => {
    if (e) {
      if (e.stopPropagation) e.stopPropagation();
      if (e.preventDefault) e.preventDefault();
    }
    const allIds = notifications.map(n => n.id);
    if (allIds.length === 0) return;

    if (user?.id) {
      const delStorageKey = `cms_deleted_notifs_${user.id}`;
      try {
        const locallyDeleted = JSON.parse(localStorage.getItem(delStorageKey) || '[]');
        const updated = Array.from(new Set([...locallyDeleted, ...allIds]));
        localStorage.setItem(delStorageKey, JSON.stringify(updated));
      } catch {}
    }

    setNotifications([]);

    for (const id of allIds) {
      notificationsAPI.delete(id).catch(() => {});
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await handleMarkRead(notif.id, { stopPropagation: () => {}, preventDefault: () => {} });
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
      
      if (notif.link.includes('#')) {
        const hash = notif.link.split('#')[1];
        setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button 
        className={styles.bellBtn} 
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <h4>Notifications</h4>
              {unreadCount > 0 && (
                <span className={styles.unreadTag}>{unreadCount} new</span>
              )}
            </div>
            {notifications.length > 0 && (
              <div className={styles.headerActions}>
                {unreadCount > 0 && (
                  <button 
                    className={styles.headerActionBtn} 
                    onClick={handleMarkAllRead}
                    title="Mark all notifications as read"
                  >
                    <CheckCheck size={13} /> Mark All Read
                  </button>
                )}
                <button 
                  className={styles.headerClearBtn} 
                  onClick={handleClearAll}
                  title="Clear all notifications"
                >
                  <Trash2 size={13} /> Clear All
                </button>
              </div>
            )}
          </div>
          
          <div className={styles.list}>
            {notifications.length === 0 ? (
              <div className={styles.empty}>
                <Bell size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p>No notifications yet.</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id} 
                  className={`${styles.item} ${!notif.is_read ? styles.unread : ''}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className={styles.itemHeader}>
                    <strong className={styles.itemTitle}>{notif.title}</strong>
                    <span className={styles.itemTime}>
                      {new Date(notif.created_at).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  <p className={styles.itemMsg}>{notif.message}</p>
                  
                  <div className={styles.itemActions}>
                    {notif.link ? (
                      <span className={styles.linkHint}>
                        <ExternalLink size={12} /> View details
                      </span>
                    ) : (
                      <span className={styles.linkHint}></span>
                    )}
                    <div className={styles.actionButtons}>
                      {!notif.is_read ? (
                        <button 
                          className={styles.markReadBtn} 
                          onClick={(e) => handleMarkRead(notif.id, e)}
                          title="Mark notification as read"
                        >
                          <Check size={13} /> Mark Read
                        </button>
                      ) : (
                        <span className={styles.readIndicator} title="Read">
                          <CheckCheck size={13} color="#10B981" /> Read
                        </span>
                      )}
                      <button 
                        className={styles.deleteBtn} 
                        onClick={(e) => handleDelete(notif.id, e)}
                        title="Delete notification"
                      >
                        <Trash2 size={13} color="#EF4444" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
