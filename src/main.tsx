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
import './amplify-config';      // AWS Amplify setup
import ErudaProvider from './debug/ErudaProvider';   // In-app debug console
import MiniKitProvider from './MiniKitProvider';     // Official World ID MiniKit provider
// Import the AuthProvider
import { AuthProvider } from './components/AuthContext';
import LoadingFallback from './components/LoadingFallback';
import ErrorBoundary from './components/ErrorBoundary';
import testAPIConnectivity from './services/ConnectivityService';
import isMobile from './utils/device';

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
// # #                      SECTION 5 - AMPLIFY INITIALIZATION                       #
// # ############################################################################ #
// Initialize Amplify (Keep if needed for backend)
// Amplify configuration skipped: './aws-config' is not a module.
// try {
//   configureAmplify();
//   console.log('[main.tsx] Amplify configured successfully');
// } catch (error) {
//   console.error('[main.tsx] Failed to configure Amplify:', error);
// }

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
// # #                       SECTION 9 - APP INITIALIZATION                        #
// # ############################################################################ #
// Initialize app with API connectivity test
const initializeApp = async () => {
  if (!isMobile()) {
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.innerHTML = `
        <div style="padding: 20px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif;">
          <h1>Access Restricted</h1>
          <p>This application is designed to be accessed only from a mobile device.</p>
          <p>Please open this link on your smartphone or tablet.</p>
        </div>
      `;
    }
    console.warn('Access restricted: Not a mobile device.');
    return; // Stop further initialization
  }

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

// # ######### ################################################################### #
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