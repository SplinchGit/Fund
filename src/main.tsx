// src/main.tsx - Ensuring BrowserRouter is properly set up and Eruda for debugging
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { configureAmplify } from './aws-config';      // Import the configuration
import ErudaProvider from './debug/ErudaProvider';   // Debug console

// Initialize Amplify before the app starts with better error handling
try {
  configureAmplify();
  console.log("Amplify configured successfully");
} catch (error) {
  console.error("Failed to configure Amplify:", error);
}

// Log the Amplify API endpoint and other env vars
console.log("main.tsx - VITE_AMPLIFY_API:", import.meta.env.VITE_AMPLIFY_API);
console.log("main.tsx - VITE_WORLD_APP_ID:", import.meta.env.VITE_WORLD_APP_ID);
console.log("main.tsx - VITE_WORLD_ACTION_ID:", import.meta.env.VITE_WORLD_ACTION_ID);

// Simple error boundary component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean; error: any}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("React Error:", error, errorInfo);
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
            {this.state.error && this.state.error.toString()}
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

try {
  console.log("Starting application...");

  // Check for environment variables that match both naming patterns
  if (typeof window !== 'undefined') {
    console.log("Initializing on platform:", navigator.userAgent);
    console.log("--- Environment Variables Check ---");
    
    // Check World ID variables with both naming conventions
    const worldAppId = import.meta.env.VITE_WORLD_APP_ID || import.meta.env.VITE_WORLD_ID_APP_ID || 'app_0de9312869c4818fc1a1ec64306551b69';
    const worldActionId = import.meta.env.VITE_WORLD_ACTION_ID || import.meta.env.VITE_WORLD_ID_ACTION || 'verify-user';
    
    console.log("World App ID:", worldAppId);
    console.log("World Action ID:", worldActionId);
    console.log("API Endpoint:", import.meta.env.VITE_AMPLIFY_API);
    
    // Make environment variables globally available as a fallback
    // @ts-ignore
    window.__ENV__ = {
      WORLD_APP_ID: worldAppId,
      WORLD_ACTION_ID: worldActionId,
      AMPLIFY_API: import.meta.env.VITE_AMPLIFY_API
    };
    
    console.log("--------------------------------------");
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Failed to find the root element");
  }

  // Always enable Eruda for debugging
  const shouldEnableEruda = true; // Change this to force Eruda to load
  
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {/* Always initialize Eruda for debugging */}
      {shouldEnableEruda && <ErudaProvider />}

      <BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </React.StrictMode>
  );
} catch (e) {
  console.error("Error during initialization:", e);

  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding:20px;margin:0 auto;max-width:500px;text-align:center;color:#e53e3e;">
        <h1>Failed to start application</h1>
        <p>${e instanceof Error ? e.message : String(e)}</p>
        <button onclick="window.location.reload()" style="margin-top:20px;padding:10px 20px;background-color:#3182ce;color:white;border:none;border-radius:5px;cursor:pointer;">
          Reload Page
        </button>
      </div>
    `;
  }
}