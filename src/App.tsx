// src/App.tsx (Fixed)
import React, { Suspense } from 'react';
import {
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

// Import the AuthProvider and useAuth hook
import { AuthProvider, useAuth } from './components/AuthContext';

// Lazy load all pages and components - using consistent import pattern
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const TipJar = React.lazy(() => import('./pages/TipJar'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const CampaignsPage = React.lazy(() => import('./pages/CampaignsPage'));
const CampaignDetailPage = React.lazy(() =>
  import('./pages/CampaignDetailPage').then(module => ({
    default: module.CampaignDetail
  }))
);
const EditCampaignPage = React.lazy(() => import('./pages/EditCampaignPage'));

// Special case for component that doesn't have a default export
const CreateCampaignForm = React.lazy(() =>
  import('./components/CreateCampaignForm').then(module => ({
    default: module.CreateCampaignForm
  }))
);

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

// Loading component
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontFamily: 'sans-serif',
  }}>
    Loading...
  </div>
);

/**
 * ProtectedRoute Component
 * Ensures that a route can only be accessed by authenticated users.
 * Now uses the AuthContext to check authentication status.
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get authentication state and loading status from the context
  const { isAuthenticated, isLoading } = useAuth();

  console.log('[ProtectedRoute] Current state:', {
    isAuthenticated,
    isLoading,
    path: window.location.pathname,
    timestamp: new Date().toISOString()
  });

  debug('ProtectedRoute: Checking context auth status...', { isAuthenticated, isLoading });

  // Display loading indicator while the context is initializing or checking session
  if (isLoading) {
    console.log('[ProtectedRoute] isLoading=true, showing LoadingFallback');
    return <LoadingFallback />;
  }

  // If not authenticated, redirect to landing page
  if (!isAuthenticated) {
    console.log('[ProtectedRoute] isAuthenticated=false, redirecting to /landing');
    return <Navigate to="/landing" replace />;
  }

  // Render children if authenticated
  console.log('[ProtectedRoute] isAuthenticated=true, rendering protected content');
  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>;
};

/**
 * App Component
 * Renders the application routes. Assumes AuthProvider and BrowserRouter are wrapping it higher up.
 */
const App: React.FC = () => {
  console.log('[App] Component mounted');
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

  // No longer needs BrowserRouter or AuthProvider here
  return (
    <>
      {/* --- Application Routes --- */}
      <Routes>
        {/* Redirect base path to landing page */}
        <Route path="/" element={<Navigate to="/landing" replace />} />

        {/* Public Routes with Suspense */}
        <Route
          path="/landing"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <LandingPage />
            </Suspense>
          }
        />

        {/* Public campaign routes */}
        <Route
          path="/campaigns"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <CampaignsPage />
            </Suspense>
          }
        />

        <Route
          path="/campaigns/:id"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <CampaignDetailPage id="" />
            </Suspense>
          }
        />

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
              <EditCampaignPage />
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
  );
};

export default App;