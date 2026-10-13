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

        const processed = data
          .filter(n => !delSet.has(n.id))
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
