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
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-md dark:border-gray-700 dark:bg-gray-800">
        <h1 className="mb-6 text-center text-2xl font-bold">WorldFund Dashboard</h1>
        <p className="mb-4 text-center">You've successfully authenticated with World ID!</p>
        <div className="flex justify-center">
          <button 
            onClick={handleLogout}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 dark:bg-red-700 dark:hover:bg-red-800 dark:focus:ring-red-800"
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
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
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Render Login or Dashboard based on authentication state
  return isAuthenticated ? <Dashboard /> : <Login />;
};

export default App;