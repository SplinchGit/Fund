// src/main.tsx

/**
 * 🛠️ IMPORTANT SETUP:
 * 1. Wrap <AuthProvider> AND <MiniKitProvider> with <BrowserRouter> for correct context access.
 * 2. Global error listeners print full, source-mapped stack traces.
 * 3. Ensure VITE_WORLD_APP_ID is injected into window.__ENV__ before render.
 */

// 3) Global error listeners (No changes needed here)
window.addEventListener('error', (event) => {
  console.error('🔥 Caught error stack:', event.error?.stack);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('🔥 Unhandled promise rejection:', event.reason?.stack || event.reason);
});

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter here
import App from './App';
import './index.css';
import { configureAmplify } from './aws-config';      // AWS Amplify setup (Keep if used for backend)
import ErudaProvider from './debug/ErudaProvider';   // In-app debug console
import MiniKitProvider from './MiniKitProvider';     // Official World ID MiniKit provider
// Import the AuthProvider
import { AuthProvider } from './components/AuthContext';

// Extend window typing for injected env vars (No changes needed)
declare global {
  interface Window {
    __ENV__?: Record<string, string>;
  }
}

// 1) Initialize Amplify (Keep if needed for backend)
try {
  configureAmplify();
  console.log('[main.tsx] Amplify configured successfully');
} catch (error) {
  console.error('[main.tsx] Failed to configure Amplify:', error);
}

// Log key env variables
// ADDED a more comprehensive log for all VITE variables
console.log('[main.tsx] Raw import.meta.env:', JSON.stringify(import.meta.env, null, 2));
console.log('[main.tsx] VITE_AMPLIFY_API:', import.meta.env.VITE_AMPLIFY_API);
console.log('[main.tsx] VITE_WORLD_APP_ID (primary check):', import.meta.env.VITE_WORLD_APP_ID);
console.log('[main.tsx] VITE_WORLD_ID_APP_ID (fallback check):', import.meta.env.VITE_WORLD_ID_APP_ID); // Logging the fallback explicitly
console.log('[main.tsx] VITE_WORLD_ACTION_ID:', import.meta.env.VITE_WORLD_ACTION_ID);


// 2) Inject WORLD_APP_ID into global scope (No changes needed)
const envAppId = import.meta.env.VITE_WORLD_APP_ID
  || import.meta.env.VITE_WORLD_ID_APP_ID; // This logic correctly checks both
if (envAppId) {
  window.__ENV__ = { ...(window.__ENV__ || {}), WORLD_APP_ID: envAppId };
  console.log('[main.tsx] Injected WORLD_APP_ID into window.__ENV__:', envAppId);
} else {
  console.warn('[main.tsx] No VITE_WORLD_APP_ID or VITE_WORLD_ID_APP_ID found; MiniKitProvider may error if not passed via props');
}

// A simple React error boundary (No changes needed here)
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
            {/* Display the specific error message that caused the boundary */}
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

// Render application
const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    {/* In-app debug console via Eruda */}
    <ErudaProvider />

    {/* BrowserRouter should wrap everything needing routing context */}
    <BrowserRouter>
      {/* AuthProvider now has access to routing context */}
      <AuthProvider>
        <ErrorBoundary>
          {/* MiniKitProvider also has access */}
          <MiniKitProvider>
            <App /> {/* App component itself no longer needs BrowserRouter */}
          </MiniKitProvider>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
