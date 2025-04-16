import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import eruda from 'eruda';

// Initialize mobile debugging if in development
if (import.meta.env.DEV) {
  eruda.init();
  console.log('Environment variables:', {
    hasAppId: !!import.meta.env.VITE_WORLD_APP_ID,
    hasActionId: !!import.meta.env.VITE_WORLD_ACTION_ID
  });
}

// Simple Dashboard component - replace with your actual app content
const Dashboard = () => {
  const handleLogout = () => {
    localStorage.removeItem('worldcoinAuth');
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-4">WorldFund Dashboard</h1>
        <p className="text-center mb-4">You've successfully authenticated with World ID!</p>
        <div className="flex justify-center">
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if user is authenticated
    const authData = localStorage.getItem('worldcoinAuth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        // Verify the authentication is valid and not expired
        const isValid = parsed.verified && 
          parsed.timestamp && 
          (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000); // 24 hour expiry
        
        setIsAuthenticated(isValid);
      } catch (e) {
        // Invalid JSON, remove the item
        localStorage.removeItem('worldcoinAuth');
        setIsAuthenticated(false);
      }
    }
  }, []);

  // Render Login or Dashboard based on authentication state
  return isAuthenticated ? <Dashboard /> : <Login />;
};

export default App;