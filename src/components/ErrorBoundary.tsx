import React from 'react';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error('React Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px', margin: '0 auto', maxWidth: '500px', textAlign: 'center',
          color: '#e53e3e', backgroundColor: '#fff', borderRadius: '5px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
        }}>
          <h1>Something went wrong</h1>
          <p>Please try reloading the page.</p>
          <pre style={{
            textAlign: 'left', backgroundColor: '#f7fafc', padding: '10px',
            borderRadius: '5px', overflow: 'auto', fontSize: '12px'
          }}>
            {this.state.error?.message || this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px', padding: '10px 20px', backgroundColor: '#3182ce',
              color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
