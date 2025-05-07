// src/pages/EditCampaignPage.tsx
import React from 'react';
import { useParams, Link } from 'react-router-dom';

const EditCampaignPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  if (!id) {
    return <div className="text-center py-10">Campaign ID is missing</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white shadow-sm mb-6">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-blue-600">
            WorldFund
          </Link>
          
          <div className="flex space-x-4">
            <Link 
              to="/dashboard" 
              className="text-gray-600 hover:text-gray-900"
            >
              Dashboard
            </Link>
            
            <Link 
              to={`/campaigns/${id}`} 
              className="text-gray-600 hover:text-gray-900"
            >
              View Campaign
            </Link>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <svg 
              className="w-4 h-4 mr-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M15 19l-7-7 7-7"
              ></path>
            </svg>
            Back to Dashboard
          </Link>
        </div>
        
      </main>
    </div>
  );
};

export default EditCampaignPage;