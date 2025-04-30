// src/App.tsx
import React, { useState, useEffect, SetStateAction, Dispatch } from 'react'; // Added SetStateAction, Dispatch for clarity if needed elsewhere, though not strictly for this fix
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';

// Import pages and components
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage'; // Assumes LandingPage is updated to accept props
import TipJar from './pages/TipJar';
import { CreateCampaignForm } from './components/CreateCampaignForm';

// Import services
import { authService, IVerifiedUser } from './services/AuthService';

/** Debug Utility – no changes here */
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
 * Checks authentication status using authService.
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading]           = useState(true);

  useEffect(() => {
    // Asynchronous function to check authentication status
    const checkAuth = async () => {
      try {
        debug('ProtectedRoute: Checking Cognito auth status...');
        const status = await authService.checkAuthStatus();
        debug('ProtectedRoute: Cognito status', status);

        // Determine if authenticated based on Cognito status
        // TODO: Incorporate world-ID verification status if needed
        let ok = status.isAuthenticated;

        setIsAuthenticated(ok);
      } catch (err) {
        debug('ProtectedRoute: Error checking auth', err);
        setIsAuthenticated(false); // Assume not authenticated on error
      } finally {
        setIsLoading(false); // Stop loading indicator
      }
    };

    checkAuth();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Display loading indicator while checking auth status
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'sans-serif', // Basic styling
      }}>
        Loading…
      </div>
    );
  }

  // Render children if authenticated, otherwise redirect to login
  return isAuthenticated
    ? <>{children}</>
    : <Navigate to="/login" replace />; // `replace` avoids adding login to history stack
};

/**
 * Dashboard Component
 * A simple dashboard page displayed after successful authentication.
 * Includes a logout button.
 */
const Dashboard: React.FC = () => {
  debug('Dashboard rendered');
  const navigate = useNavigate();

  // Handles the logout process
  const handleLogout = async () => {
    debug('Dashboard: Logging out...');
    await authService.logout();
    debug('Dashboard: Logged out, navigating to /login');
    navigate('/login'); // Redirect to login page after logout
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '600px', // Slightly wider max-width
      margin: '40px auto', // Added top/bottom margin
      textAlign: 'center',
      fontFamily: 'sans-serif', // Basic styling
      border: '1px solid #ccc', // Added border
      borderRadius: '8px', // Added border radius
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)', // Added subtle shadow
    }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>WorldFund Dashboard</h1>
      <p style={{ marginBottom: '30px', color: '#555' }}>
        You&apos;ve successfully authenticated! Welcome back.
      </p>
      <button
        onClick={handleLogout}
        style={{
          padding: '12px 25px', // Increased padding
          backgroundColor: '#dc3545', // Standard danger color
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px', // Slightly larger font
          transition: 'background-color 0.2s ease', // Smooth transition
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#c82333')} // Darken on hover
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#dc3545')} // Restore original color
      >
        Logout
      </button>
    </div>
  );
};

/**
 * App Component
 * The main application component that sets up routing.
 */
const App: React.FC = () => {
  // State to hold World ID verification details
  const [verification, setVerification] = useState<IVerifiedUser | null>(null);
  debug('App component mounted');

  // Debug output panel (optional)
  const debugOutput = (
    <div
      id="debug-output"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '150px', // Reduced height
        overflowY: 'auto',
        backgroundColor: 'rgba(0,0,0,0.75)', // Slightly less opaque
        color: '#e0e0e0', // Lighter text color
        padding: '8px 12px', // Adjusted padding
        fontSize: '11px', // Smaller font size
        fontFamily: 'monospace', // Monospace font for debug
        zIndex: 9999,
        borderTop: '1px solid #444', // Added top border
        // display: 'block', // Keep it visible if needed for debugging
        display: process.env.NODE_ENV === 'development' ? 'block' : 'none', // Only show in development
      }}
    />
  );

  return (
    <>
      {/* --- Application Routes --- */}
      <Routes>
        {/* Redirect base path to landing page */}
        <Route path="/" element={<Navigate to="/landing" replace />} />

        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/landing"
          element={
            <LandingPage
              initialVerification={verification} // Pass verification state
              onVerificationChange={setVerification} // Pass state setter
            />
          }
        />

        {/* Protected Routes */}
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
            <ProtectedRoute> {/* Assuming this should also be protected */}
              <CreateCampaignForm />
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
