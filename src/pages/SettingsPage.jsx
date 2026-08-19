import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
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

        {/* Change Password */}
        <SettingsSection title="Security (One-Time Password Change)">
          {user?.isPasswordChanged ? (
            <div className={styles.passwordChangedBanner}>
              <Shield size={16} />
              You have already updated your password. For security reasons, any further changes must be requested through the System Administrator.
            </div>
          ) : (
            <div className={styles.passwordChangeForm}>
              <div className={styles.row}>
                <div className={styles.rowLeft}>
                  <label className={styles.rowLabel}>Current Password</label>
                </div>
                <div className={styles.rowRight}>
                  <input type="password" id="old-pwd" className={styles.rowInput} placeholder="Enter current password" />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.rowLeft}>
                  <label className={styles.rowLabel}>New Password</label>
                </div>
                <div className={styles.rowRight}>
                  <input type="password" id="new-pwd" className={styles.rowInput} placeholder="Enter new password" />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.rowLeft}>
                  <label className={styles.rowLabel}>Confirm Password</label>
                </div>
                <div className={styles.rowRight}>
                  <input type="password" id="confirm-pwd" className={styles.rowInput} placeholder="Confirm new password" />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button 
                  className={styles.saveBtn} 
                  id="change-pwd-btn"
                  onClick={async () => {
                    const oldPassword = document.getElementById('old-pwd').value;
                    const newPassword = document.getElementById('new-pwd').value;
                    const confirmPassword = document.getElementById('confirm-pwd').value;
                    
                    if (!oldPassword || !newPassword || !confirmPassword) {
                      return alert('Please fill all password fields.');
                    }
                    if (newPassword !== confirmPassword) {
                      return alert('New passwords do not match.');
                    }
                    
                    try {
                      const res = await authAPI.changePassword({ userId: user.id, oldPassword, newPassword });
                      if (res.success) {
                        alert('Password changed successfully! You will be logged out to apply changes.');
                        window.location.reload();
                      } else {
                        alert(res.error || 'Failed to change password.');
                      }
                    } catch (err) {
                      alert(err.message || 'An error occurred.');
                    }
                  }}
                >
                  Change Password
                </button>
              </div>
            </div>
          )}
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
