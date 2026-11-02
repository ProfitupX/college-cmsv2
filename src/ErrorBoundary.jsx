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
    console.error('[MarkHub Application Error Caught]', error, errorInfo);

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
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const isPageLevel = Boolean(this.props.section);

      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: isPageLevel ? '60vh' : '100vh',
          padding: '2rem 1rem',
          background: isPageLevel ? 'transparent' : '#f8fafc',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#1e293b', fontWeight: 700 }}>
              Page Refresh Recommended
            </h3>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
              The current view encountered a temporary loading conflict. Please refresh to load the latest data.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  background: '#1d4ed8',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.65rem 1.4rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🔄</span> Refresh Page
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.65rem 1.2rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Try Again
              </button>

              <button
                type="button"
                onClick={() => { window.location.href = '/dashboard'; }}
                style={{
                  background: '#ffffff',
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.65rem 1.2rem',
                  fontSize: '0.88rem',
                  fontWeight: 500,
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
