// src/App.tsx
import React from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';

// Import the AuthProvider and useAuth hook
import { AuthProvider, useAuth } from './components/AuthContext'; 

// Import pages and components
import LandingPage from './pages/LandingPage'; 
import TipJar from './pages/TipJar';
import { CreateCampaignForm } from './components/CreateCampaignForm';
import { Dashboard } from './pages/Dashboard'; // New import

/** Debug Utility – Can be kept or removed */
const debug = (message: string, data?: any) => {
  console.log(`[Debug] ${message}`, data || '');
  try {
    const debugEl = document.getElementById('debug-output');
    if (debugEl) {
      debugEl.innerHTML += `<div>${message}: ${data ? JSON.stringify(data) : ''}</div>`;
    }
  } catch {
    /* silently ignore */
  }
};

/**
 * ProtectedRoute Component
 * Ensures that a route can only be accessed by authenticated users.
 * Now uses the AuthContext to check authentication status.
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get authentication state and loading status from the context
  const { isAuthenticated, isLoading } = useAuth(); 

  debug('ProtectedRoute: Checking context auth status...', { isAuthenticated, isLoading });

  // Display loading indicator while the context is initializing or checking session
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'sans-serif',
      }}>
        Loading Session… 
      </div>
    );
  }

  // Render children if authenticated, otherwise redirect to landing page
  return isAuthenticated
    ? <>{children}</>
    // Redirect to landing page if not authenticated
    : <Navigate to="/landing" replace />; 
};

/**
 * App Component
 * Wraps the application routes with AuthProvider.
 */
const App: React.FC = () => {
  debug('App component mounted');

  // Debug output panel (optional)
  const debugOutput = (
    <div
      id="debug-output"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        maxHeight: '150px', overflowY: 'auto',
        backgroundColor: 'rgba(0,0,0,0.75)', color: '#e0e0e0', 
        padding: '8px 12px', fontSize: '11px', fontFamily: 'monospace', 
        zIndex: 9999, borderTop: '1px solid #444', 
        display: process.env.NODE_ENV === 'development' ? 'block' : 'none', 
      }}
    />
  );

  return (
    // Wrap the entire application or just the Routes with AuthProvider
    <AuthProvider> 
      <> 
        {/* --- Application Routes --- */}
        <Routes>
          {/* Redirect base path to landing page */}
          <Route path="/" element={<Navigate to="/landing" replace />} />

          {/* Public Routes */}
          <Route path="/landing" element={<LandingPage />} />
          
          {/* Public campaign detail view */}
          <Route path="/campaigns/:id" element={<div>Campaign Detail - Coming Soon</div>} />

          {/* Protected Routes - Now protected by AuthContext state */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tip-jar"
            element={
              <ProtectedRoute>
                <TipJar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/new-campaign"
            element={
              <ProtectedRoute> 
                <CreateCampaignForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns/:id/edit"
            element={
              <ProtectedRoute>
                <div>Edit Campaign - Coming Soon</div>
              </ProtectedRoute>
            }
          />

          {/* Fallback route: Redirect any unmatched paths to landing */}
          <Route path="*" element={<Navigate to="/landing" replace />} />
        </Routes>
        {/* --- End Routes --- */}

        {/* Render debug output panel */}
        {debugOutput}
      </>
    </AuthProvider> 
  );
};

export default App;