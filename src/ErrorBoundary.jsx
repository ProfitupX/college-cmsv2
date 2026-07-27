import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#fef2f2', color: '#991b1b', fontFamily: 'sans-serif', minHeight: '100vh' }}>
          <h2>Something went wrong in React.</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', background: '#fff', padding: '1rem', border: '1px solid #fca5a5' }}>
            <summary style={{ fontWeight: 'bold', cursor: 'pointer', marginBottom: '0.5rem' }}>View Error Details</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
