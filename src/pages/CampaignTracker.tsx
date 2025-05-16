// src/components/CampaignTracker.tsx (or src/pages/CampaignTracker.tsx)

// # ############################################################################ #
// # #                          SECTION 1 - IMPORTS                             #
// # ############################################################################ #
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // useNavigate for edit action
import { useAuth } from '../components/AuthContext';
import { campaignService, Campaign } from '../services/CampaignService';
import { CampaignCard, CampaignDisplayInfo } from '../components/CampaignCard'; // Import the reusable card

// ############################################################################ #
// # #                        SECTION 1.5 - HELPER FUNCTIONS                     #
// # ############################################################################ #

// Helper to format date (already present)
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch (e) {
    console.error("Error formatting date:", dateString, e);
    return 'Invalid Date';
  }
};

// Helper to calculate days left (similar to LandingPage)
const calculateDaysLeft = (createdAt: string, endDate?: string | null): number => {
    // If an explicit endDate is provided and valid, use it.
    if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
            const now = new Date();
            const diffTime = end.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return Math.max(0, diffDays);
        }
    }
    // Fallback to 30 days from creation if no valid endDate
    const created = new Date(createdAt);
    if (isNaN(created.getTime())) return 0; // Invalid creation date
    const now = new Date();
    const campaignDurationMs = 30 * 24 * 60 * 60 * 1000; // Default 30 days
    const assumedEndTimeMs = created.getTime() + campaignDurationMs;
    const diffTime = assumedEndTimeMs - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
};

// Helper to format wallet address (similar to LandingPage)
const formatAddress = (address: string): string => {
  if (!address || address.length < 10) return address || 'Unknown'; // Basic check
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};


// (getStatusStyles can be removed if CampaignCard handles status display internally, or kept if needed for other parts)
// For now, CampaignCard doesn't use this specific helper directly for styling status.

// # ############################################################################ #
// # #                 SECTION 2 - COMPONENT: DEFINITION & STATE                  #
// # ############################################################################ #

interface CampaignTrackerProps {
  deleteButtonStyle?: React.CSSProperties;
  // Add editButtonStyle if you define a specific one in Dashboard.tsx
  // editButtonStyle?: React.CSSProperties;
}

export const CampaignTracker: React.FC<CampaignTrackerProps> = ({ deleteButtonStyle }) => {
  const { walletAddress } = useAuth();
  const navigate = useNavigate(); // For edit navigation
  const [userCampaigns, setUserCampaigns] = useState<CampaignDisplayInfo[]>([]); // Use CampaignDisplayInfo
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Tracks ID of campaign being deleted
  const [deleteError, setDeleteError] = useState<string | null>(null);

// # ############################################################################ #
// # #                 SECTION 3 - EFFECT: FETCH USER CAMPAIGNS                 #
// # ############################################################################ #
  useEffect(() => {
    const fetchUserCampaigns = async () => {
      if (!walletAddress) {
        setUserCampaigns([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setDeleteError(null); 
      try {
        const result = await campaignService.fetchUserCampaigns(walletAddress);
        if (result.success && result.campaigns) {
          // Transform Campaign[] to CampaignDisplayInfo[]
          const transformedCampaigns: CampaignDisplayInfo[] = result.campaigns.map(campaign => ({
            ...campaign,
            progressPercentage: campaign.goal > 0 ? Math.min(Math.round((campaign.raised / campaign.goal) * 100), 100) : 0,
            daysLeft: calculateDaysLeft(campaign.createdAt), // Only pass createdAt since endDate does not exist
            creator: campaign.ownerId ? formatAddress(campaign.ownerId) : 'You', // Or keep original ownerId if preferred for display
            isVerified: true, // Assuming user's own campaigns are "verified" in their view, or fetch this status
          }));
          setUserCampaigns(transformedCampaigns);
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
  const handleDeleteCampaign = async (id: string) => {
    // Find campaign title for confirmation - optional, can remove if not needed
    const campaignToDelete = userCampaigns.find(c => c.id === id);
    const title = campaignToDelete ? campaignToDelete.title : 'this campaign';

    if (!window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(id); // Set ID of campaign being deleted
    setDeleteError(null);

    try {
      const result = await campaignService.deleteCampaign(id);
      if (result.success) {
        setUserCampaigns(prevCampaigns => prevCampaigns.filter(campaign => campaign.id !== id));
      } else {
        setDeleteError(result.error || 'Failed to delete the campaign. Please try again.');
      }
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      setDeleteError(error.message || 'An error occurred while deleting the campaign.');
    } finally {
      setIsDeleting(null); // Clear deleting state
    }
  };

  const handleEditCampaign = (id: string) => {
    navigate(`/campaigns/${id}/edit`); // Or your specific edit route
  };

// # ############################################################################ #
// # #                 SECTION 5 - CONDITIONAL RENDERING: LOADING STATE         #
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
// # #                 SECTION 6 - CONDITIONAL RENDERING: ERROR STATE             #
// # ############################################################################ #
  if (error && !loading) { // Check !loading to ensure it's not a brief error before loading finishes
    return (
      <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg my-4 shadow-sm text-left">
        <p className="font-medium">Error Loading Campaigns</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => { // Simple refetch logic, could be more robust
            if (walletAddress) {
              setLoading(true);
              campaignService.fetchUserCampaigns(walletAddress).then(result => {
                  if (result.success && result.campaigns) {
                      const transformedCampaigns: CampaignDisplayInfo[] = result.campaigns.map(campaign => ({
                          ...campaign,
                          progressPercentage: campaign.goal > 0 ? Math.min(Math.round((campaign.raised / campaign.goal) * 100), 100) : 0,
                          daysLeft: calculateDaysLeft(campaign.createdAt),
                          creator: campaign.ownerId ? formatAddress(campaign.ownerId) : 'You',
                          isVerified: true,
                      }));
                      setUserCampaigns(transformedCampaigns);
                      setError(null); // Clear previous error
                  } else { setError(result.error || 'Failed to reload campaigns.'); }
              }).catch(err => { setError('Failed to reload campaigns.');
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
// # #                 SECTION 7 - JSX RETURN: CAMPAIGNS LIST                   #
// # ############################################################################ #
  return (
    <div>
      {/* Title "Your Campaigns" is now in Dashboard.tsx, so we can remove it from here if desired */}
      {/* <div className="border-b border-gray-200 pb-3 mb-3">
        <h2 className="text-xl font-semibold text-gray-800 text-left">Your Campaigns</h2>
      </div> */}

      {deleteError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md" role="alert">
          <p className="font-bold">Could not delete campaign:</p>
          <p>{deleteError}</p>
        </div>
      )}

      {userCampaigns.length === 0 && !loading ? (
        <div className="py-6 text-center">
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
        // Use a div to layout the cards, e.g., a flex column with gaps
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {userCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              showAdminActions={true} // Show Edit/Delete on Dashboard
              onDelete={() => handleDeleteCampaign(campaign.id)} // Pass actual ID
              deleteButtonStyle={deleteButtonStyle} // Pass the style from props
              onEdit={() => handleEditCampaign(campaign.id)} // Pass actual ID
              // You can define an editButtonStyle in Dashboard.tsx and pass it here too
              // editButtonStyle={editButtonStyle} 
              showViewDetailsButton={false} // Hide "View Details" if admin actions are shown
            />
          ))}
        </div>
      )}
    </div>
  );
};