// src/components/CampaignTracker.tsx

// # ############################################################################ #
// # #                               SECTION 1 - IMPORTS                                #
// # ############################################################################ #
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext'; // Corrected path assuming AuthContext is in components
import { campaignService, Campaign } from '../services/CampaignService';

// Helper to format date, you can expand this or use a library like date-fns
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Helper for status badge styling (can be expanded)
const getStatusStyles = (status: 'active' | 'completed' | 'cancelled') => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700';
    case 'completed':
      return 'bg-blue-100 text-blue-700';
    case 'cancelled':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};


// # ############################################################################ #
// # #                 SECTION 2 - COMPONENT: DEFINITION & STATE                 #
// # ############################################################################ #
export const CampaignTracker: React.FC = () => {
  const { walletAddress } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Holds ID of campaign being deleted
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Stats are removed from here as they are in Dashboard.tsx now

// # ############################################################################ #
// # #                 SECTION 3 - EFFECT: FETCH USER CAMPAIGNS                 #
// # ############################################################################ #
  useEffect(() => {
    const fetchUserCampaigns = async () => {
      if (!walletAddress) {
        setLoading(false); // Not loading if no wallet address
        // Optionally set an error or specific message if walletAddress is expected but missing
        // setError("Wallet address not found. Please connect your wallet.");
        return;
      }

      setLoading(true);
      setError(null); // Reset error before fetching
      try {
        const result = await campaignService.fetchUserCampaigns(walletAddress);

        if (result.success && result.campaigns) {
          setCampaigns(result.campaigns);
          // Stats calculation removed, will be handled by Dashboard if still needed there globally
        } else {
          setError(result.error || 'Failed to load your campaigns.');
        }
      } catch (error: any) {
        console.error('Failed to load campaigns:', error);
        setError('An unexpected error occurred while fetching your campaigns. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserCampaigns();
  }, [walletAddress]);

// # ############################################################################ #
// # #                 SECTION 4 - EVENT HANDLER: DELETE CAMPAIGN                 #
// # ############################################################################ #
  const handleDeleteCampaign = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete the campaign "${title}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(id);
    setDeleteError(null);

    try {
      const result = await campaignService.deleteCampaign(id);

      if (result.success) {
        setCampaigns(prevCampaigns => prevCampaigns.filter(campaign => campaign.id !== id));
        // Stats update logic removed as stats are no longer local to this component
        console.log(`Campaign "${title}" (${id}) was successfully deleted`);
      } else {
        setDeleteError(result.error || 'Failed to delete the campaign.');
      }
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      setDeleteError(error.message || 'An error occurred while deleting the campaign.');
    } finally {
      setIsDeleting(null);
    }
  };

// # ############################################################################ #
// # #                 SECTION 5 - CONDITIONAL RENDERING: LOADING STATE                 #
// # ############################################################################ #
  if (loading) {
    return (
      <div className="text-center py-10"> {/* Increased padding */}
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div> {/* Slightly larger spinner */}
        <p className="mt-3 text-gray-700">Loading your campaigns...</p> {/* Darker text */}
      </div>
    );
  }

// # ############################################################################ #
// # #                 SECTION 6 - CONDITIONAL RENDERING: ERROR STATE                 #
// # ############################################################################ #
  if (error) {
    return (
      <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg my-4 shadow-sm"> {/* Softer shadow, adjusted colors */}
        <p className="font-medium">Oops! Something went wrong.</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => { // Re-fetch logic
            if (walletAddress) {
                setLoading(true); // Manually trigger loading state for re-fetch
                campaignService.fetchUserCampaigns(walletAddress).then(result => {
                    if (result.success && result.campaigns) {
                        setCampaigns(result.campaigns);
                        setError(null);
                    } else {
                        setError(result.error || 'Failed to reload campaigns.');
                    }
                }).catch(err => {
                    setError('Failed to reload campaigns.');
                }).finally(() => setLoading(false));
            }
          }}
          className="mt-2 text-sm font-semibold text-red-700 hover:text-red-900 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

// # ############################################################################ #
// # #                 SECTION 7 - JSX RETURN: CAMPAIGNS LIST                 #
// # ############################################################################ #
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden"> {/* Card-like container for the whole tracker */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 text-left">Your Campaigns</h2> {/* Title is now part of the tracker */}
      </div>

      {deleteError && (
        <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 m-4 rounded-md" role="alert">
          <p className="font-bold">Deletion Error</p>
          <p>{deleteError}</p>
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="p-6 sm:p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No campaigns yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first campaign.</p>
          <div className="mt-6">
            <Link
              to="/new-campaign"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create Campaign
            </Link>
          </div>
        </div>
      ) : (
        // List of campaign "cards" for mobile
        <ul role="list" className="divide-y divide-gray-200">
          {campaigns.map((campaign) => {
            const progressPercentage = campaign.goal > 0 ? Math.min(
              Math.round((campaign.raised / campaign.goal) * 100),
              100
            ) : 0;

            return (
              <li key={campaign.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {campaign.image ? (
                      <img
                        className="h-12 w-12 rounded-full object-cover"
                        src={campaign.image}
                        alt={campaign.title || "Campaign image"}
                        onError={(e) => { e.currentTarget.src = 'https://placehold.co/48x48/e5e7eb/9aa0a6?text=Img'; }}
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-500 font-semibold text-lg">
                        {campaign.title ? campaign.title.charAt(0).toUpperCase() : 'C'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-blue-600 truncate hover:text-blue-700">
                      <Link to={`/campaigns/${campaign.id}`}>{campaign.title}</Link>
                    </p>
                    <p className="text-xs text-gray-500">
                      Created: {formatDate(campaign.createdAt)}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyles(campaign.status)}`}
                    >
                      {campaign.status}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Raised: {campaign.raised.toLocaleString()} WLD</span>
                    <span>Goal: {campaign.goal.toLocaleString()} WLD</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                  <p className="text-right text-xs text-blue-500 mt-1">{progressPercentage}% funded</p>
                </div>

                <div className="mt-3 flex justify-end space-x-2">
                  <Link
                    to={`/campaigns/${campaign.id}`}
                    className="px-3 py-1 text-xs font-medium text-center text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
                  >
                    View
                  </Link>
                  <Link
                    to={`/campaigns/${campaign.id}/edit`}
                    className="px-3 py-1 text-xs font-medium text-center text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDeleteCampaign(campaign.id, campaign.title)}
                    disabled={isDeleting === campaign.id}
                    className={`px-3 py-1 text-xs font-medium text-center text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors ${
                      isDeleting === campaign.id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isDeleting === campaign.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};