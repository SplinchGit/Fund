// src/App.tsx
import React, { useState, useEffect } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';

// Use correct import for Login based on how it's exported
// For a default export:
import Login from './pages/Login';

import Register from './pages/Register';
import LandingPage from './pages/LandingPage';
import TipJar from './pages/TipJar';
import { CreateCampaignForm } from './components/CreateCampaignForm';

// Import the authService instance directly
import { authService, IVerifiedUser } from './services/AuthService';

/** Debug Utility */
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
 * ProtectedRoute
 * Wraps any children that require authentication.
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading]             = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Use the checkAuthStatus method instead of getCurrentUser
        const { isAuthenticated } = await authService.checkAuthStatus();
        setIsAuthenticated(isAuthenticated);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}>
        Loading…
      </div>
    );
  }

  return isAuthenticated
    ? <>{children}</>
    : <Navigate to="/login" replace />;
};

/**
 * Dashboard
 * A simple protected dashboard screen.
 */
const Dashboard: React.FC = () => {
  debug('Dashboard rendered');
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '500px',
      margin: '0 auto',
      textAlign: 'center',
    }}>
      <h1 style={{ marginBottom: '20px' }}>WorldFund Dashboard</h1>
      <p style={{ marginBottom: '20px' }}>
        You&apos;ve successfully authenticated with World ID!
      </p>
      <button
        onClick={handleLogout}
        style={{
          padding: '10px 20px',
          backgroundColor: '#e53e3e',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        Logout
      </button>
    </div>
  );
};

/**
 * App
 * The only default export, handles all routing.
 */
const App: React.FC = () => {
  const [verification, setVerification] = useState<IVerifiedUser | null>(null);
  debug('App component mounted');

  const debugOutput = (
    <div
      id="debug-output"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '200px',
        overflowY: 'auto',
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        fontSize: '12px',
        zIndex: 9999,
        display: 'none', // flip to 'block' to see logs
      }}
    />
  );

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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
          path="/landing"
          element={
            <LandingPage
              initialVerification={verification}
              onVerificationChange={setVerification}
            />
          }
        />

        {/* Keep your campaign form demo route if you like */}
        <Route path="/new-campaign" element={<CreateCampaignForm />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      {debugOutput}
    </>
  );
};

export default App;