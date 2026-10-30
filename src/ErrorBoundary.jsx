import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      isRepairing: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('[MarkHub ErrorBoundary caught]', error, errorInfo);
  }

  handleAutoRepair = async () => {
    this.setState({ isRepairing: true });
    try {
      // 1. Clear service worker caches if any
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      // 2. Clear volatile session storage but preserve active login token
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      sessionStorage.clear();
      if (token) localStorage.setItem('token', token);
      if (user) localStorage.setItem('user', user);
    } catch (e) {
      console.warn('Auto-repair cache clear note:', e);
    }

    // 3. Force clean reload with cache-busting timestamp
    const url = new URL(window.location.href);
    url.searchParams.set('_repair', String(Date.now()));
    window.location.replace(url.toString());
  };

  handleGoDashboard = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  handleResetState = () => {
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
          minHeight: isPageLevel ? '70vh' : '100vh',
          padding: '2rem 1rem',
          background: isPageLevel ? 'transparent' : '#f8fafc',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '680px',
            width: '100%',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            {/* Header banner */}
            <div style={{
              background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
              padding: '1.75rem 2rem',
              color: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.75rem' }}>🛡️</span>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                  MarkHub Self-Healing Protection
                </h2>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#fecaca', lineHeight: 1.4 }}>
                A temporary interface issue was prevented from interrupting your session. Your data is secure.
              </p>
            </div>

            {/* Content area */}
            <div style={{ padding: '2rem' }}>
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '1rem 1.25rem',
                marginBottom: '1.75rem',
                color: '#991b1b',
                fontSize: '0.92rem'
              }}>
                <strong>What happened:</strong> A component encountered a display conflict. Clicking <strong>Auto-Repair</strong> will automatically refresh the latest assets and restore your view.
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  onClick={this.handleAutoRepair}
                  disabled={this.state.isRepairing}
                  style={{
                    flex: '1 1 200px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    background: '#991b1b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1.25rem',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: this.state.isRepairing ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(153, 27, 27, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>🔄</span>
                  {this.state.isRepairing ? 'Auto-Repairing...' : 'Auto-Repair & Refresh'}
                </button>

                <button
                  type="button"
                  onClick={this.handleGoDashboard}
                  style={{
                    flex: '1 1 180px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.75rem 1.25rem',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <span>🏠</span>
                  Go to Dashboard
                </button>

                <button
                  type="button"
                  onClick={this.handleResetState}
                  style={{
                    flex: '0 0 auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    background: '#ffffff',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Try Again
                </button>
              </div>

              {/* Technical details toggle */}
              <details style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.82rem',
                color: '#475569'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#64748b' }}>
                  Technical Details & Diagnostics
                </summary>
                <pre style={{
                  marginTop: '0.75rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                  background: '#1e293b',
                  color: '#f8fafc',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  {this.state.error && this.state.error.toString()}
                  {'\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
