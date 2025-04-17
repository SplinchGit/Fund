// App.tsx
/**
 * WorldFund Application Entry Point
 * 
 * This is the core routing and authentication management component for the WorldFund application.
 * 
 * Key Features:
 * - Secure routing with authentication protection
 * - Debug logging for development
 * - Centralized authentication management
 * - Flexible route handling
 * 
 * The application uses React Router for navigation and a custom authentication service
 * to manage user sessions and access control.
 */

// Import all necessary page components

import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage';
import { authService, IVerifiedUser } from './services/AuthService';
import TipJar from './pages/TipJar';

/**
 * Debug Utility Function
 * 
 * Provides flexible logging mechanism for both console and on-screen debugging
 * Helps in tracking application flow, especially useful for mobile development
 * 
 * @param {string} message - Primary log message
 * @param {any} [data] - Optional additional data to log
 */
const debug = (message: string, data?: any) => {
  console.log(`[Debug] ${message}`, data || '');
  // Attempt to log to on-screen debug element for mobile debugging
  try {
    const debugEl = document.getElementById('debug-output');
    if (debugEl) {
      debugEl.innerHTML += `<div>${message}: ${data ? JSON.stringify(data) : ''}</div>`;
    }
  } catch (e) {
    // Silently handle any logging errors
  }
};

/**
 * ProtectedRoute Component
 * 
 * A higher-order component that wraps routes requiring authentication
 * Checks user's authentication status before rendering child components
 * Redirects to login page if user is not authenticated
 * 
 * @param {Object} props - Component props
 * @param {React.ReactElement} props.children - Child components to render if authenticated
 */
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  // State to track authentication and loading status
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        setIsAuthenticated(!!user?.isVerified);
      } catch (error) {
        console.error('Authentication check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh'
      }}>
        Loading...
      </div>
    );
  }

  // Render children if authenticated, otherwise redirect to login
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

/**
 * Dashboard Component
 * 
 * Provides a simple dashboard view for authenticated users
 * Includes logout functionality
 */
const Dashboard = () => {
  debug('Dashboard rendered');
  const navigate = useNavigate();
  
  // Handle user logout process
  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '20px' }}>WorldFund Dashboard</h1>
      <p style={{ marginBottom: '20px' }}>You've successfully authenticated with World ID!</p>
      <button 
        onClick={handleLogout}
        style={{ 
          padding: '10px 20px', 
          backgroundColor: '#e53e3e', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Logout
      </button>
    </div>
  );
};

/**
 * Main App Component
 * 
 * Manages the entire application's routing and top-level state
 * Provides a centralized point for authentication and navigation
 */
const App: React.FC = () => {
  // State to track user verification across the application
  const [verification, setVerification] = useState<IVerifiedUser | null>(null);
  
  // Log app initialization
  debug('App component mounted');

  /**
   * Debug Output Element
   * 
   * Creates a fixed-position debug log area
   * Can be toggled by changing the display style
   */
  const debugOutput = (
    <div id="debug-output" style={{
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      maxHeight: '200px',
      overflowY: 'auto',
      backgroundColor: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      fontSize: '12px',
      zIndex: 9999,
      display: 'none' // Set to 'block' to show debug output
    }}></div>
  );

  return (
    <>
      {/* Application Routing Configuration */}
      <Routes>
        {/* Default route redirects to login page */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Public Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected Application Routes */}
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
        
        {/* Public Landing Page */}
        <Route 
          path="/landing" 
          element={
            <LandingPage 
              initialVerification={verification} 
              onVerificationChange={setVerification} 
            />
          } 
        />
        
        {/* Catch-all route redirects to login for any undefined routes */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      {/* Debug output element */}
      {debugOutput}
    </>
  );
};

export default App;