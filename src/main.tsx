// src/main.tsx

/**
 * 🛠️ IMPORTANT SETUP:
 * 1. Wrap <App/> in <MiniKitProvider> so World ID’s context initializes properly.
 * 2. Global error listeners print full, source-mapped stack traces.
 * 3. Ensure VITE_WORLD_APP_ID is injected into window.__ENV__ before render.
 */

// 3) Global error listeners
window.addEventListener('error', (event) => {
  console.error('🔥 Caught error stack:', event.error?.stack);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('🔥 Unhandled promise rejection:', event.reason?.stack || event.reason);
});

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { configureAmplify } from './aws-config';      // AWS Amplify setup
import ErudaProvider from './debug/ErudaProvider';   // In-app debug console
import MiniKitProvider from './MiniKitProvider';     // Official World ID MiniKit provider

// Extend window typing for injected env vars
declare global {
  interface Window {
    __ENV__?: Record<string, string>;
  }
}

// 1) Initialize Amplify
try {
  configureAmplify();
  console.log('Amplify configured successfully');
} catch (error) {
  console.error('Failed to configure Amplify:', error);
}

// Log key env variables
console.log('main.tsx - VITE_AMPLIFY_API:', import.meta.env.VITE_AMPLIFY_API);
console.log('main.tsx - VITE_WORLD_APP_ID:', import.meta.env.VITE_WORLD_APP_ID);
console.log('main.tsx - VITE_WORLD_ACTION_ID:', import.meta.env.VITE_WORLD_ACTION_ID);

// 2) Inject WORLD_APP_ID into global scope for MiniKitProvider
const envAppId = import.meta.env.VITE_WORLD_APP_ID
  || import.meta.env.VITE_WORLD_ID_APP_ID;
if (envAppId) {
  window.__ENV__ = { ...(window.__ENV__ || {}), WORLD_APP_ID: envAppId };
  console.log('Injected WORLD_APP_ID into window.__ENV__:', envAppId);
} else {
  console.warn('No VITE_WORLD_APP_ID found; MiniKitProvider may error if not passed via props');
}

// A simple React error boundary
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
          padding: '20px',
          margin: '0 auto',
          maxWidth: '500px',
          textAlign: 'center',
          color: '#e53e3e',
          backgroundColor: '#fff',
          borderRadius: '5px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
        }}>
          <h1>Something went wrong</h1>
          <p>Please try reloading the page.</p>
          <pre style={{
            textAlign: 'left',
            backgroundColor: '#f7fafc',
            padding: '10px',
            borderRadius: '5px',
            overflow: 'auto',
            fontSize: '12px'
          }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
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

// Render application
const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    {/* In-app debug console via Eruda */}
    <ErudaProvider />

    <BrowserRouter>
      {/* Wrap the entire app in MiniKitProvider for World ID context */}
      <ErrorBoundary>
        <MiniKitProvider>
          <App />
        </MiniKitProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
