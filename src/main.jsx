import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { logException } from './services/logger'
import './index.css'

// Global Uncaught Exception & Promise Rejection Handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    let userRole = 'guest';
    let userName = '';
    let userId = '';
    try {
      const saved = sessionStorage.getItem('cms_user');
      if (saved) {
        const u = JSON.parse(saved);
        userRole = u.role || 'guest';
        userName = u.name || '';
        userId = u.id || '';
      }
    } catch (e) {}

    logException({
      moduleName: `WindowOnError:${window.location.pathname}`,
      userRole,
      userName,
      userId,
      error: event.error || new Error(event.message || 'Window runtime error'),
      url: window.location.href
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    let userRole = 'guest';
    let userName = '';
    let userId = '';
    try {
      const saved = sessionStorage.getItem('cms_user');
      if (saved) {
        const u = JSON.parse(saved);
        userRole = u.role || 'guest';
        userName = u.name || '';
        userId = u.id || '';
      }
    } catch (e) {}

    const err = event.reason instanceof Error ? event.reason : new Error(String(event.reason || 'Unhandled Promise Rejection'));
    logException({
      moduleName: `UnhandledRejection:${window.location.pathname}`,
      userRole,
      userName,
      userId,
      error: err,
      url: window.location.href
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
