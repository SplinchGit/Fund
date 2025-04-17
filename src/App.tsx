// App.tsx

import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage';
import { authService, IVerifiedUser } from './services/AuthService';
import TipJar from './pages/TipJar';

// Debug function to log to console
const debug = (message: string, data?: any) => {
  console.log(`[Debug] ${message}`, data || '');
  // Also try to log to document for mobile debugging
  try {
    const debugEl = document.getElementById('debug-output');
    if (debugEl) {
      debugEl.innerHTML += `<div>${message}: ${data ? JSON.stringify(data) : ''}</div>`;
    }
  } catch (e) {
    // Ignore errors during debug
  }
};

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Simple Dashboard component
const Dashboard = () => {
  debug('Dashboard rendered');
  const navigate = useNavigate();
  
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

const App: React.FC = () => {
  const [verification, setVerification] = useState<IVerifiedUser | null>(null);
  
  // First render debug
  debug('App component mounted');

  // Add a visible debug area to the page
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
      <Routes>
        {/* Default route redirects to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
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
        
        {/* Landing page - can be accessed without authentication */}
        <Route 
          path="/landing" 
          element={
            <LandingPage 
              initialVerification={verification} 
              onVerificationChange={setVerification} 
            />
          } 
        />
        
        {/* Catch-all route redirects to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      {debugOutput}
    </>
  );
};

export default App;