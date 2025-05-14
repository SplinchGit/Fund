// src/pages/EditCampaignPage.tsx

// # ############################################################################ #
// # #                             SECTION 1 - IMPORTS                            #
// # ############################################################################ #
import React from 'react';
import { useParams, Link } from 'react-router-dom';

// # ############################################################################ #
// # #           SECTION 2 - COMPONENT: PAGE DEFINITION & HOOKS           #
// # ############################################################################ #
const EditCampaignPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

// # ############################################################################ #
// # #                SECTION 3 - VALIDATION: CAMPAIGN ID CHECK                 #
// # ############################################################################ #
  if (!id) {
    return <div className="text-center py-10">Campaign ID is missing</div>;
  }

// # ############################################################################ #
// # #                   SECTION 4 - JSX RETURN: PAGE LAYOUT                    #
// # ############################################################################ #
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

        {/* The EditCampaignForm component would typically be rendered here, e.g.: */}
        {/* <EditCampaignForm id={id} /> */}
        {/* For now, this page just provides the layout. */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">Edit Campaign (ID: {id})</h1>
          <p className="text-gray-600">Edit form will be displayed here.</p>
        </div>
      </main>
    </div>
  );
};

// # ############################################################################ #
// # #                        SECTION 5 - DEFAULT EXPORT                        #
// # ############################################################################ #
export default EditCampaignPage;