// src/pages/CampaignsPage.tsx

// # ############################################################################ #
// # #                             SECTION 1 - IMPORTS                            #
// # ############################################################################ #
import React from 'react';
import { Link } from 'react-router-dom';
import { CampaignList } from '../components/CampaignList';
import { useAuth } from '../components/AuthContext';

// # ############################################################################ #
// # #                  SECTION 2 - COMPONENT: PAGE DEFINITION                  #
// # ############################################################################ #
const CampaignsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

// # ############################################################################ #
// # #                   SECTION 3 - JSX RETURN: PAGE LAYOUT                    #
// # ############################################################################ #
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white shadow-sm mb-6">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-blue-600">
            WorldFund
          </Link>

          <div className="flex space-x-4">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Dashboard
                </Link>
                <Link
                  to="/new-campaign"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
                >
                  Create Campaign
                </Link>
              </>
            ) : (
              <Link
                to="/landing"
                className="text-gray-600 hover:text-gray-900"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Browse Campaigns
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Discover projects worth supporting with WLD tokens
          </p>
        </div>

        <CampaignList />
      </main>
    </div>
  );
};

// # ############################################################################ #
// # #                        SECTION 4 - DEFAULT EXPORT                        #
// # ############################################################################ #
export default CampaignsPage;