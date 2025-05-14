// src/pages/Dashboard.tsx

// # ############################################################################ #
// # #                             SECTION 1 - IMPORTS                            #
// # ############################################################################ #
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { CampaignTracker } from './CampaignTracker';

// # ############################################################################ #
// # #           SECTION 2 - COMPONENT: PAGE DEFINITION & HOOKS           #
// # ############################################################################ #
const Dashboard: React.FC = () => {
  const { walletAddress, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

// # ############################################################################ #
// # #                 SECTION 3 - EFFECT: AUTHENTICATION CHECK                 #
// # ############################################################################ #
  // Ensure user is authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('[Dashboard] User not authenticated, redirecting to landing page');
      navigate('/landing');
    }
  }, [isAuthenticated, navigate]);

// # ############################################################################ #
// # #                      SECTION 4 - EVENT HANDLER: LOGOUT                     #
// # ############################################################################ #
  const handleLogout = async () => {
    await logout();
    navigate('/landing');
  };

// # ############################################################################ #
// # #      SECTION 5 - CONDITIONAL RENDERING: UNAUTHENTICATED FALLBACK       #
// # ############################################################################ #
  if (!isAuthenticated) {
    // Return a loading state or nothing while the redirect happens
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

// # ############################################################################ #
// # #             SECTION 6 - JSX RETURN: PAGE LAYOUT & CONTENT              #
// # ############################################################################ #
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-blue-600">
            WorldFund
          </Link>

          <div className="flex items-center space-x-4">
            {walletAddress && (
              <span className="text-sm text-gray-600">
                Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            )}

            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Your Dashboard</h1>

          <Link
            to="/new-campaign"
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Create New Campaign
          </Link>
        </div>

        {/* No Campaigns Message */}
        {!walletAddress ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600">Loading your account information...</p>
          </div>
        ) : (
          <CampaignTracker />
        )}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Access</h2>
            <div className="space-y-2">
              <Link
                to="/campaigns"
                className="block text-blue-600 hover:text-blue-800"
              >
                Browse All Campaigns
              </Link>
              <Link
                to="/tip-jar"
                className="block text-blue-600 hover:text-blue-800"
              >
                Tip Jar
              </Link>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Getting Started</h2>
            <p className="text-gray-600 mb-4">
              Create and manage campaigns to raise funds for your projects using WLD tokens.
            </p>
            <Link
              to="/new-campaign"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
            >
              Create Your First Campaign
            </Link>
          </div>
        </div>
      </main>

      {/* Bottom Navigation Tabs */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3 items-center">
        <Link to="/" className="flex flex-col items-center px-3 py-1 text-gray-600">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path>
          </svg>
          <span className="text-xs mt-1">Home</span>
        </Link>

        <Link to="/campaigns" className="flex flex-col items-center px-3 py-1 text-gray-600">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
          </svg>
          <span className="text-xs mt-1">Explore</span>
        </Link>

        <Link to="/dashboard" className="flex flex-col items-center px-3 py-1 text-blue-600">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
          </svg>
          <span className="text-xs mt-1">Account</span>
        </Link>
      </nav>

      <footer className="bg-white border-t border-gray-200 mt-12 py-6 text-center text-sm text-gray-500">
        <div className="mb-12"> 
          &copy; {new Date().getFullYear()} WorldFund. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

// # ############################################################################ #
// # #                        SECTION 7 - DEFAULT EXPORT                        #
// # ############################################################################ #
export default Dashboard;