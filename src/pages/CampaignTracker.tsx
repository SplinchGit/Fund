// src/components/CampaignTracker.tsx

// # ############################################################################ #
// # #                               SECTION 1 - IMPORTS                                #
// # ############################################################################ #
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext'; // Assuming AuthContext is here
import { campaignService, Campaign } from '../services/CampaignService';

// Helper to format date
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-GB', { // Example: DD/MM/YYYY
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (e) {
    return 'Invalid Date';
  }
};

// Helper for status badge styling
const getStatusStyles = (status: 'active' | 'completed' | 'cancelled' | string) => { // Allow string for safety
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700';
    case 'completed':
      return 'bg-blue-100 text-blue-700';
    case 'cancelled':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700'; // Fallback for unknown statuses
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
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

// # ############################################################################ #
// # #                 SECTION 3 - EFFECT: FETCH USER CAMPAIGNS                 #
// # ############################################################################ #
  useEffect(() => {
    const fetchUserCampaigns = async () => {
      if (!walletAddress) {
        setCampaigns([]); // Clear campaigns if no wallet address
        setLoading(false);
        // setError("Please connect your wallet to view your campaigns."); // Optional: specific message
        return;
      }

      setLoading(true);
      setError(null);
      setDeleteError(null); // Clear previous delete errors on fetch
      try {
        const result = await campaignService.fetchUserCampaigns(walletAddress);
        if (result.success && result.campaigns) {
          setCampaigns(result.campaigns);
        } else {
          setError(result.error || 'Failed to load your campaigns.');
        }
      } catch (error: any) {
        console.error('Failed to load campaigns:', error);
        setError('An unexpected error occurred. Please try refreshing.');
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
        // Optionally, show a success toast/notification here
      } else {
        setDeleteError(result.error || 'Failed to delete the campaign. Please try again.');
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
      <div className="text-center py-10">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
        <p className="mt-3 text-gray-700">Loading your campaigns...</p>
      </div>
    );
  }

// # ############################################################################ #
// # #                 SECTION 6 - CONDITIONAL RENDERING: ERROR STATE                 #
// # ############################################################################ #
  if (error && !loading) { // Show general fetch error if not loading
    return (
      <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg my-4 shadow-sm text-left">
        <p className="font-medium">Error Loading Campaigns</p>
        <p className="text-sm">{error}</p>
        {/* Button to re-trigger fetch, simplified */}
        <button
          onClick={() => {
            if (walletAddress) { // Ensure walletAddress is still valid for re-fetch
              setLoading(true); // Re-trigger loading animation
              // Call effect's core logic again by re-triggering or calling a memoized function
              // For simplicity, just resetting state to re-trigger useEffect if walletAddress is stable
              // This is a bit of a hack; a dedicated refetch function is better.
              // Or, just reload for now.
              window.location.reload(); // Simplest retry for now
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
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 text-left">Your Campaigns</h2>
      </div>

      {deleteError && ( // Display delete error prominently if it occurs
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4 rounded-md" role="alert">
          <p className="font-bold">Could not delete campaign:</p>
          <p>{deleteError}</p>
        </div>
      )}

      {campaigns.length === 0 && !loading ? ( // Ensure not loading before showing "no campaigns"
        <div className="p-6 sm:p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No campaigns yet</h3>
          <p className="mt-1 text-sm text-gray-500">Ready to make an impact? Create your first campaign.</p>
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
        <ul role="list" className="divide-y divide-gray-200">
          {campaigns.map((campaign) => {
            const progressPercentage = campaign.goal > 0 ? Math.min(
              Math.round((campaign.raised / campaign.goal) * 100),
              100
            ) : 0;

            return (
              <li key={campaign.id} className="p-4 hover:bg-gray-50 transition-colors">
                {/* Main Info: Image (or placeholder) + Title + Created Date (as link) */}
                <Link to={`/campaigns/${campaign.id}`} className="block">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {campaign.image ? (
                        <img
                          className="h-12 w-12 rounded-md object-cover" // Square with rounded corners
                          src={campaign.image}
                          alt="" // Alt text should be descriptive or empty if purely decorative
                          onError={(e) => {
                            // Simple fallback to a styled div
                            const parent = e.currentTarget.parentNode;
                            if (parent) {
                                const placeholder = document.createElement('div');
                                placeholder.className = "h-12 w-12 rounded-md bg-gray-200 flex items-center justify-center text-gray-400 text-xs";
                                placeholder.textContent = "No Img";
                                parent.replaceChild(placeholder, e.currentTarget);
                            }
                          }}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-md bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0"> {/* For truncation */}
                      <p className="text-sm font-semibold text-blue-600 truncate hover:underline">
                        {campaign.title || 'Untitled Campaign'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Created: {formatDate(campaign.createdAt)}
                      </p>
                    </div>
                  </div>
                </Link>

                {/* Details Section: Status, Progress */}
                <div className="mt-3 space-y-2">
                  <div>
                    <span className="text-xs font-medium text-gray-500 mr-2">Status:</span>
                    <span
                      className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyles(campaign.status)}`}
                    >
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{campaign.raised.toLocaleString()} WLD Raised</span>
                      <span>{progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      Goal: {campaign.goal.toLocaleString()} WLD
                    </p>
                  </div>
                </div>

                {/* Actions: Edit & Delete */}
                <div className="mt-4 flex justify-end space-x-3">
                  <Link
                    to={`/campaigns/${campaign.id}/edit`}
                    className="px-3 py-1.5 text-xs font-medium text-center text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDeleteCampaign(campaign.id, campaign.title)}
                    disabled={isDeleting === campaign.id}
                    className={`px-3 py-1.5 text-xs font-medium text-center text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors ${
                      isDeleting === campaign.id ? 'opacity-70 cursor-not-allowed' : ''
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