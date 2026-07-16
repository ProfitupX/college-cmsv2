import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import styles from './Layout.module.css';

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Dynamically push/expand main based on sidebar width
  const mainStyle = {
    marginLeft: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
  };

  // Header fills remaining width
  const headerStyle = {
    left: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
  };

  return (
    <div className={`${styles.root} ${darkMode ? styles.dark : ''}`}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <Header
        onMobileToggle={() => setCollapsed((c) => !c)}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        style={headerStyle}
      />
      <main className={styles.main} style={mainStyle}>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
