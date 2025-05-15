// src/components/CampaignTracker.tsx

// # ############################################################################ #
// # #                               SECTION 1 - IMPORTS                                #
// # ############################################################################ #
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext'; // Corrected path
import { campaignService, Campaign } from '../services/CampaignService';

// Helper to format date
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (e) {
    console.error("Error formatting date:", dateString, e);
    return 'Invalid Date';
  }
};

// Helper for status badge styling
const getStatusStyles = (status: Campaign['status'] | string) => { // Allow string for safety
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
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

// # ############################################################################ #
// # #                 SECTION 3 - EFFECT: FETCH USER CAMPAIGNS                 #
// # ############################################################################ #
  useEffect(() => {
    const fetchUserCampaigns = async () => {
      if (!walletAddress) {
        setCampaigns([]);
        setLoading(false);
        // setError("Please connect your wallet to view your campaigns."); // Consider if this message is desired
        return;
      }

      setLoading(true);
      setError(null);
      setDeleteError(null);
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
      <div className="text-center py-10 px-4">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
        <p className="mt-3 text-gray-700">Loading your campaigns...</p>
      </div>
    );
  }

// # ############################################################################ #
// # #                 SECTION 6 - CONDITIONAL RENDERING: ERROR STATE                 #
// # ############################################################################ #
  if (error && !loading) {
    return (
      <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg my-4 shadow-sm text-left">
        <p className="font-medium">Error Loading Campaigns</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => {
            if (walletAddress) {
              setLoading(true);
              // Re-call the fetch logic, ensuring useEffect will run or calling a dedicated function
              // For now, simple reload for brevity, but a dedicated refetch function is better.
              // This effect re-runs if walletAddress changes; if it's stable, need another trigger or function.
              // A quick way to re-trigger useEffect is to pass a "retry" state to its dependency array.
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
    // Removed the outer bg-white, shadow, etc. as this component is now placed within `styles.contentSection` in Dashboard.tsx
    // which already provides a card-like container.
    <div>
      <div className="border-b border-gray-200 pb-3 mb-3"> {/* Removed p-4 sm:p-6 from here */}
        <h2 className="text-xl font-semibold text-gray-800 text-left">Your Campaigns</h2>
      </div>

      {deleteError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md" role="alert">
          <p className="font-bold">Could not delete campaign:</p>
          <p>{deleteError}</p>
        </div>
      )}

      {campaigns.length === 0 && !loading ? (
        <div className="py-6 text-center"> {/* Adjusted padding */}
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No campaigns yet</h3>
          <p className="mt-1 text-sm text-gray-500">Ready to make an impact?</p>
          <div className="mt-6">
            <Link
              to="/new-campaign"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create Your First Campaign
            </Link>
          </div>
        </div>
      ) : (
        // Use 'list-none' to remove any default list styling (like dots)
        <ul role="list" className="divide-y divide-gray-200 list-none p-0 m-0">
          {campaigns.map((campaign) => {
            const progressPercentage = campaign.goal > 0 ? Math.min(
              Math.round((campaign.raised / campaign.goal) * 100),
              100
            ) : 0;

            return (
              <li key={campaign.id} className="py-4 px-1 hover:bg-gray-50 transition-colors"> {/* Added px-1 for slight horizontal padding within items */}
                {/* Main Info: Image (or placeholder) + Title + Created Date (as link) */}
                <Link to={`/campaigns/${campaign.id}`} className="block group"> {/* group for hover effects if needed */}
                  <div className="flex items-center space-x-3"> {/* Dot removed by list-none on ul */}
                    <div className="flex-shrink-0 h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center text-gray-400 text-xs overflow-hidden">
                      {campaign.image ? (
                        <img
                          className="h-full w-full object-cover" // Ensure image covers the placeholder area
                          src={campaign.image}
                          alt="" // Decorative, or provide campaign.title
                          onError={(e) => { // Fallback for broken image links
                            e.currentTarget.style.display = 'none'; // Hide broken img
                            // Optionally, show a text placeholder if the div is still visible
                            // e.currentTarget.insertAdjacentHTML('afterend', '<div class="h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center text-gray-400 text-xs">Err</div>');
                          }}
                        />
                      ) : (
                        <span>No Img</span> // Simple text placeholder
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-blue-600 truncate group-hover:underline">
                        {campaign.title || 'Untitled Campaign'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Created: {formatDate(campaign.createdAt)}
                      </p>
                    </div>
                  </div>
                </Link>

                {/* Details Section: Status, Progress */}
                <div className="mt-3 space-y-2 pl-0 pr-0 md:pl-13"> {/* Indent content to align with title if image is present, or remove md:pl-13 */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Status:</span>
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
                <div className="mt-4 flex justify-end space-x-2"> {/* space-x-2 for spacing between buttons */}
                  <Link
                    to={`/campaigns/${campaign.id}/edit`}
                    // Consistent button styling: padding, text size, rounding, transition
                    className="px-3 py-1.5 text-xs font-medium text-center text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDeleteCampaign(campaign.id, campaign.title)}
                    disabled={isDeleting === campaign.id}
                    // MODIFIED: Delete button styling to be red but similar form factor
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