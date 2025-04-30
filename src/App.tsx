// src/App.tsx
import React from 'react'; // Removed unused useState, useEffect
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';

// Import the AuthProvider and useAuth hook
import { AuthProvider, useAuth } from './components/AuthContext'; 

// Import pages and components
// Removed Login and Register imports
import LandingPage from './pages/LandingPage'; 
import TipJar from './pages/TipJar';
import { CreateCampaignForm } from './components/CreateCampaignForm';

// Removed AuthService import if not used directly here (used via context now)
// import { authService } from './services/AuthService'; 

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
 * Dashboard Component
 * Now uses the logout function from AuthContext.
 */
const Dashboard: React.FC = () => {
  debug('Dashboard rendered');
  const navigate = useNavigate();
  // Get the logout function from the context
  const { logout, walletAddress } = useAuth(); 

  // Handles the logout process using the context's logout function
  const handleLogout = async () => {
    debug('Dashboard: Logging out...');
    await logout(); // Call the logout function from the context
    debug('Dashboard: Logged out, navigating to /landing');
    // Redirect to landing page after logout
    navigate('/landing'); 
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '600px', 
      margin: '40px auto', 
      textAlign: 'center',
      fontFamily: 'sans-serif', 
      border: '1px solid #ccc', 
      borderRadius: '8px', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
    }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>WorldFund Dashboard</h1>
      <p style={{ marginBottom: '10px', color: '#555' }}>
        You&apos;ve successfully authenticated! Welcome back.
      </p>
      {/* Optionally display wallet address */}
      {walletAddress && (
         <p style={{ marginBottom: '20px', color: '#777', fontSize: '0.8em', wordBreak: 'break-all' }}>
           Connected: {walletAddress}
         </p>
      )}
      <button
        onClick={handleLogout}
        style={{
          padding: '12px 25px', 
          backgroundColor: '#dc3545', 
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px', 
          transition: 'background-color 0.2s ease', 
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#c82333')} 
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#dc3545')} 
      >
        Logout
      </button>
    </div>
  );
};

/**
 * App Component
 * Wraps the application routes with AuthProvider.
 */
const App: React.FC = () => {
  // Removed local verification state - should be managed within AuthContext if needed
  // const [verification, setVerification] = useState<IVerifiedUser | null>(null); 
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
          {/* Removed /login and /register routes */}
          <Route
            path="/landing"
            element={
              // Removed props related to local verification state
              <LandingPage /> 
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
