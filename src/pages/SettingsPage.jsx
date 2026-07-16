import { useAuth } from '../context/AuthContext';
import { User, Mail, Building, Award, Shield, Bell, Eye, Download } from 'lucide-react';
import styles from './SettingsPage.module.css';

function SettingsSection({ title, children }) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  );
}

function SettingsRow({ icon: Icon, label, value, type = 'text', readonly = false }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowLeft}>
        <div className={styles.rowIcon}><Icon size={16} /></div>
        <label className={styles.rowLabel}>{label}</label>
      </div>
      <div className={styles.rowRight}>
        {readonly ? (
          <span className={styles.readonlyVal}>{value}</span>
        ) : (
          <input
            type={type}
            className={styles.rowInput}
            defaultValue={value}
            readOnly={readonly}
          />
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className={styles.wrapper}>
      {/* Profile Header */}
      <div className={styles.profileHeader}>
        <div className={styles.profileAvatar}>
          {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'FA'}
        </div>
        <div>
          <h2 className={styles.profileName}>{user?.name}</h2>
          <p className={styles.profileDesig}>{user?.designation} · {user?.department}</p>
          <span className={styles.empId}>ID: {user?.employeeId}</span>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Profile Section */}
        <SettingsSection title="Profile Information">
          <SettingsRow icon={User} label="Full Name" value={user?.name} />
          <SettingsRow icon={Mail} label="Email Address" value={user?.email} type="email" />
          <SettingsRow icon={Building} label="Department" value={user?.department} readonly />
          <SettingsRow icon={Award} label="Designation" value={user?.designation} readonly />
          <SettingsRow icon={Shield} label="Employee ID" value={user?.employeeId} readonly />
        </SettingsSection>

        {/* Preferences */}
        <SettingsSection title="Preferences">
          <div className={styles.toggleRow}>
            <div>
              <p className={styles.toggleLabel}>Email Notifications</p>
              <p className={styles.toggleSub}>Receive alerts for pending submissions</p>
            </div>
            <label className={styles.toggle} id="email-notif-toggle">
              <input type="checkbox" defaultChecked />
              <span className={styles.toggleSlider} />
            </label>
          </div>
          <div className={styles.toggleRow}>
            <div>
              <p className={styles.toggleLabel}>Auto-Save Drafts</p>
              <p className={styles.toggleSub}>Auto-save marks entries as draft</p>
            </div>
            <label className={styles.toggle} id="autosave-toggle">
              <input type="checkbox" defaultChecked />
              <span className={styles.toggleSlider} />
            </label>
          </div>
          <div className={styles.toggleRow}>
            <div>
              <p className={styles.toggleLabel}>Show Grade Labels</p>
              <p className={styles.toggleSub}>Show descriptive labels beside grade letters</p>
            </div>
            <label className={styles.toggle} id="grade-label-toggle">
              <input type="checkbox" />
              <span className={styles.toggleSlider} />
            </label>
          </div>
        </SettingsSection>

        {/* Quick Actions */}
        <SettingsSection title="Quick Actions">
          <div className={styles.actionsList}>
            {[
              { icon: Download, label: 'Export My Data', sub: 'Download all entries as CSV', color: '#6C63FF' },
              { icon: Bell, label: 'Test Notification', sub: 'Send a test notification', color: '#22D3EE' },
              { icon: Eye, label: 'View Audit Log', sub: 'See all your recent actions', color: '#10B981' },
            ].map((a) => (
              <button key={a.label} className={styles.actionBtn} id={`action-${a.label.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className={styles.actionIcon} style={{ background: `${a.color}18`, color: a.color }}>
                  <a.icon size={18} />
                </div>
                <div>
                  <p className={styles.actionLabel}>{a.label}</p>
                  <p className={styles.actionSub}>{a.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </SettingsSection>
      </div>

      {/* Save Button */}
      <div className={styles.saveRow}>
        <button className={styles.saveBtn} id="save-settings-btn">
          Save Changes
        </button>
        <button className={styles.cancelBtn} id="cancel-settings-btn">
          Cancel
        </button>
      </div>
    </div>
  );
}
