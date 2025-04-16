import React, { useState, useEffect } from 'react';
import Login from './pages/Login';

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

// Simple Dashboard component - replace with your actual app content
const Dashboard = () => {
  debug('Dashboard rendered');
  
  const handleLogout = () => {
    localStorage.removeItem('worldcoinAuth');
    window.location.reload();
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // First render debug
  debug('App component mounted');
  
  useEffect(() => {
    debug('App useEffect running');
    
    // Check if user is authenticated
    const authData = localStorage.getItem('worldcoinAuth');
    debug('Auth data from localStorage', authData);
    
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        debug('Parsed auth data', parsed);
        
        // Verify the authentication is valid and not expired
        const isValid = parsed.verified && 
          parsed.timestamp && 
          (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000); // 24 hour expiry
        
        debug('Auth is valid?', isValid);
        setIsAuthenticated(isValid);
      } catch (e) {
        debug('Error parsing auth data', e);
        // Invalid JSON, remove the item
        localStorage.removeItem('worldcoinAuth');
        setIsAuthenticated(false);
      }
    } else {
      debug('No auth data found');
      setIsAuthenticated(false);
    }
    
    setIsLoading(false);
  }, []);

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

  debug('Rendering main content', { isLoading, isAuthenticated });

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <div>Loading...</div>
        {debugOutput}
      </div>
    );
  }

  // Render Login or Dashboard based on authentication state
  return (
    <>
      {isAuthenticated ? <Dashboard /> : <Login />}
      {debugOutput}
    </>
  );
};

export default App;