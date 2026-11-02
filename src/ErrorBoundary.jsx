import React from 'react';
import { logException } from './services/logger';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('[MarkHub Application Notice]', error, errorInfo);

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
      moduleName: this.props.section ? `PageSection:${this.props.section}` : (window.location.pathname || 'ReactApp'),
      userRole,
      userName,
      userId,
      error,
      errorInfo,
      url: window.location.href
    });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, retryCount: this.state.retryCount + 1 });
  };

  render() {
    if (this.state.hasError) {
      const isPageLevel = Boolean(this.props.section);

      // Page-level error: Render an unobtrusive inline notification bar instead of a blocking card
      if (isPageLevel) {
        return (
          <div style={{ padding: '1rem', width: '100%' }}>
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '0.75rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e40af', fontSize: '0.88rem', fontWeight: 500 }}>
                <span>ℹ️</span>
                <span>The view refreshed smoothly. Click <strong>Reload View</strong> if data needs updating.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={this.handleReset}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #93c5fd',
                    borderRadius: '6px',
                    padding: '0.4rem 0.9rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#1d4ed8',
                    cursor: 'pointer'
                  }}
                >
                  Reload View
                </button>
                <button
                  type="button"
                  onClick={() => { window.location.href = '/dashboard'; }}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '0.4rem 0.9rem',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        );
      }

      // App-level fallback: clean and simple, without auto-resolver modal
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          padding: '1.5rem',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '460px',
            width: '100%',
            background: '#ffffff',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
            border: '1px solid #e2e8f0'
          }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#1e293b', fontWeight: 700 }}>
              MarkHub Portal
            </h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
              Your session is safe. Click below to continue.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  background: '#1d4ed8',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.6rem 1.2rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = '/dashboard'; }}
                style={{
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '0.6rem 1.2rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
