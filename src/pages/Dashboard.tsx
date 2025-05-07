// src/pages/Dashboard.tsx (Updated)
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { CampaignTracker } from './CampaignTracker';

export const Dashboard: React.FC = () => {
  const { walletAddress, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await logout();
    navigate('/landing');
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          
          <Link
            to="/new-campaign"
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
          >
            Create New Campaign
          </Link>
        </div>
        
        <CampaignTracker />
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
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
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Getting Started</h2>
            <p className="text-gray-600 mb-4">
              Create and manage campaigns to raise funds for your projects using WLD tokens.
            </p>
            <div className="space-y-2">
              <a
                href="https://www.worldcoin.org/blog/engineering/wld-token"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-600 hover:text-blue-800"
              >
                Learn About WLD Tokens
              </a>
              <a
                href="https://docs.worldcoin.org/token"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-600 hover:text-blue-800"
              >
                WLD Documentation
              </a>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-sm text-gray-500 text-center">
            &copy; {new Date().getFullYear()} WorldFund. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;