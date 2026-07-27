import { useState, useEffect, useRef } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
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
    if (!user) return;
    try {
      const data = await notificationsAPI.get(user.role, user.id);
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new notifications
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
    e.stopPropagation();
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await handleMarkRead(notif.id, { stopPropagation: () => {} });
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
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
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <span className={styles.unreadTag}>{unreadCount} unread</span>
            )}
          </div>
          
          <div className={styles.list}>
            {notifications.length === 0 ? (
              <div className={styles.empty}>No notifications yet.</div>
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
                      {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={styles.itemMsg}>{notif.message}</p>
                  
                  <div className={styles.itemActions}>
                    {notif.link && (
                      <span className={styles.linkHint}>
                        <ExternalLink size={12} /> View details
                      </span>
                    )}
                    {!notif.is_read && (
                      <button 
                        className={styles.markReadBtn} 
                        onClick={(e) => handleMarkRead(notif.id, e)}
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
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
