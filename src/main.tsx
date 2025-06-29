// src/main.tsx
console.log('[main.tsx] SCRIPT EXECUTION STARTED - TOP OF FILE'); // <-- ADD THIS VERY FIRST LINE

/**
 * 🛠️ IMPORTANT SETUP:
 * 1. Wrap <AuthProvider> AND <MiniKitProvider> with <BrowserRouter> for correct context access.
 * 2. Global error listeners print full, source-mapped stack traces.
 * 3. Ensure VITE_WORLD_APP_ID is injected into window.__ENV__ before render.
 * 4. Test API connectivity before app initialization.
 */

// # ############################################################################ #
// # #                         SECTION 1 - GLOBAL ERROR LISTENERS                          #
// # ############################################################################ #
// Global error listeners (No changes needed here)
window.addEventListener('error', (event) => {
  console.error('🔥 Caught error stack:', event.error?.stack);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('🔥 Unhandled promise rejection:', event.reason?.stack || event.reason);
});

// # ############################################################################ #
// # #                              SECTION 2 - IMPORTS                               #
// # ############################################################################ #
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

// # ############################################################################ #
// # #                         SECTION 3 - GLOBAL TYPE DECLARATIONS                          #
// # ############################################################################ #
// Extend window typing for injected env vars (No changes needed)
declare global {
  interface Window {
    __ENV__?: Record<string, string>;
  }
}

// # ############################################################################ #
// # #                         SECTION 4 - API CONNECTIVITY TEST                          #
// # ############################################################################ #
// API connectivity test function
const testAPIConnectivity = async (): Promise<void> => {
  const apiBase = import.meta.env.VITE_AMPLIFY_API;
  
  if (!apiBase) {
    console.error('[main.tsx] ❌ VITE_AMPLIFY_API not configured!');
    console.error('[main.tsx] Please add VITE_AMPLIFY_API to your .env.local file');
    return;
  }

  console.log('[main.tsx] 🔍 Testing API connectivity to:', apiBase);
  
  try {
    // Test basic connectivity to campaigns endpoint
    const testUrl = `${apiBase}/campaigns`;
    console.log('[main.tsx] Testing URL:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors'
    });
    
    console.log('[main.tsx] API Test Result:', {
      url: testUrl,
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (response.ok) {
      console.log('[main.tsx] ✅ API connectivity test PASSED');
      try {
        const data = await response.json();
        console.log('[main.tsx] Sample API response:', data);
      } catch (jsonError) {
        console.log('[main.tsx] ⚠️ Response received but not JSON format');
      }
    } else {
      console.warn('[main.tsx] ⚠️ API responded with error status:', response.status);
      const errorText = await response.text().catch(() => 'Unable to read error response');
      console.warn('[main.tsx] Error response:', errorText);
    }
  } catch (error) {
    console.error('[main.tsx] ❌ API connectivity test FAILED:', error);
    
    // Provide specific error guidance
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error('[main.tsx] This is likely a CORS or network connectivity issue');
      console.error('[main.tsx] Check: 1) API Gateway CORS settings, 2) Network connection, 3) API URL correctness');
    } else if (error instanceof TypeError && error.message.includes('NetworkError')) {
      console.error('[main.tsx] Network error - check your internet connection');
    }
  }
};

// # ############################################################################ #
// # #                      SECTION 5 - AMPLIFY INITIALIZATION                       #
// # ############################################################################ #
// Initialize Amplify (Keep if needed for backend)
try {
  configureAmplify();
  console.log('[main.tsx] Amplify configured successfully');
} catch (error) {
  console.error('[main.tsx] Failed to configure Amplify:', error);
}

// # ############################################################################ #
// # #                    SECTION 6 - ENVIRONMENT VARIABLES LOGGING                     #
// # ############################################################################ #
// Log key env variables
console.log('[main.tsx] Environment variables check:', {
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD
});

console.log('[main.tsx] API Configuration:', {
  VITE_AMPLIFY_API: import.meta.env.VITE_AMPLIFY_API,
  VITE_APP_BACKEND_API_URL: import.meta.env.VITE_APP_BACKEND_API_URL
});

console.log('[main.tsx] World ID Configuration:', {
  VITE_WORLD_APP_ID: import.meta.env.VITE_WORLD_APP_ID,
  VITE_WORLD_ID_APP_ID: import.meta.env.VITE_WORLD_ID_APP_ID,
  VITE_WORLD_ACTION_ID: import.meta.env.VITE_WORLD_ACTION_ID
});

// # ############################################################################ #
// # #                   SECTION 7 - WORLD APP ID INJECTION                    #
// # ############################################################################ #
// Inject WORLD_APP_ID into global scope (No changes needed)
const envAppId = import.meta.env.VITE_WORLD_APP_ID
  || import.meta.env.VITE_WORLD_ID_APP_ID;
if (envAppId) {
  window.__ENV__ = { ...(window.__ENV__ || {}), WORLD_APP_ID: envAppId };
  console.log('[main.tsx] Injected WORLD_APP_ID into window.__ENV__:', envAppId);
} else {
  console.warn('[main.tsx] No VITE_WORLD_APP_ID or VITE_WORLD_ID_APP_ID found; MiniKitProvider may error if not passed via props');
}

// # ############################################################################ #
// # #                         SECTION 8 - ERROR BOUNDARY                          #
// # ############################################################################ #
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

// # ############################################################################ #
// # #                       SECTION 9 - APP INITIALIZATION                        #
// # ############################################################################ #
// Initialize app with API connectivity test
const initializeApp = async () => {
  console.log('[main.tsx] Starting app initialization...');
  
  // Run API connectivity test first
  await testAPIConnectivity();
  
  // Render application
  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('Root element not found');

  console.log('[main.tsx] Rendering React application...');
  
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErudaProvider />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <MiniKitProvider>
              <App />
            </MiniKitProvider>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );

  console.log('[main.tsx] React application rendered successfully');
};

// # ############################################################################ #
// # #                         SECTION 10 - APP LAUNCH                            #
// # ############################################################################ #
// Launch the application
initializeApp().catch(error => {
  console.error('[main.tsx] Failed to initialize app:', error);
  
  // Show a simple error message to the user
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #e53e3e;">
        <h1>Failed to Load Application</h1>
        <p>Please check your internet connection and try again.</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #3182ce; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Retry
        </button>
      </div>
    `;
  }
});