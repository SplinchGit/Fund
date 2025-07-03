// src/pages/CampaignTracker.tsx
// (UPDATED: Removed large icon from empty state for cleaner UI)

// # ############################################################################ #
// # #                          SECTION 1 - IMPORTS                             #
// # ############################################################################ #
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { campaignService, Campaign } from '../services/CampaignService';
// Import the reusable CampaignCard and its interface
import { CampaignCard, CampaignDisplayInfo } from '../components/CampaignCard';
import { ensService } from '../services/EnsService';

// ############################################################################ #
// # #                        SECTION 1.5 - HELPER FUNCTIONS                     #
// # ############################################################################ #

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

// REMOVED: calculateDaysLeft function as it's no longer used for card display
// and CampaignCard.tsx no longer displays it.

// Removed formatAddress as ensService.formatAddressOrEns will handle it

// # ############################################################################ #
// # #                 SECTION 2 - COMPONENT: DEFINITION & STATE                  #
// # ############################################################################ #

interface CampaignTrackerProps {
  deleteButtonStyle?: React.CSSProperties;
  statusFilter?: 'active' | 'completed'; // New prop for filtering campaigns by status
}

export const CampaignTracker: React.FC<CampaignTrackerProps> = ({ deleteButtonStyle, statusFilter = 'active' }) => {
  const { walletAddress } = useAuth();
  const navigate = useNavigate();
  const [userCampaigns, setUserCampaigns] = useState<CampaignDisplayInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

// # ############################################################################ #
// # #                 SECTION 3 - EFFECT: FETCH USER CAMPAIGNS                 #
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
          const filteredCampaigns = result.campaigns.filter(campaign => {
            if (statusFilter === 'active') {
              return campaign.status === 'active';
            } else if (statusFilter === 'completed') {
              return campaign.status === 'completed';
            }
            return true; // No filter applied if statusFilter is not 'active' or 'completed'
          });

          const transformedCampaigns: CampaignDisplayInfo[] = await Promise.all(filteredCampaigns.map(async campaign => ({
            ...campaign,
            progressPercentage: campaign.goal > 0 ? Math.min(Math.round((campaign.raised / campaign.goal) * 100), 100) : 0,
            creator: campaign.ownerId ? await ensService.formatAddressOrEns(campaign.ownerId) : 'You',
            isVerified: true,
          })));
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
  }, [walletAddress, statusFilter]);

// # ############################################################################ #
// # #                 SECTION 4 - EVENT HANDLER: DELETE CAMPAIGN                 #
// # ############################################################################ #
  const handleDeleteCampaign = async (id: string) => {
    const campaignToDelete = userCampaigns.find(c => c.id === id);
    const title = campaignToDelete ? campaignToDelete.title : 'this campaign';

    if (!window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }
    setIsDeleting(id);
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
      setIsDeleting(null);
    }
  };

  const handleEditCampaign = (id: string) => {
    navigate(`/campaigns/${id}/edit`);
  };

// # ############################################################################ #
// # #                 SECTION 5 - CONDITIONAL RENDERING: LOADING STATE         #
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
// # #                 SECTION 6 - CONDITIONAL RENDERING: ERROR STATE             #
// # ############################################################################ #
  if (error && !loading) {
    return (
      <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg my-4 shadow-sm text-left">
        <p className="font-medium">Error Loading Campaigns</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={async () => {
            if (walletAddress) {
              setLoading(true);
              try {
                const result = await campaignService.fetchUserCampaigns(walletAddress, statusFilter);
                if (result.success && result.campaigns) {
                    const transformedCampaigns: CampaignDisplayInfo[] = await Promise.all(result.campaigns.map(async campaign => ({
                        ...campaign,
                        progressPercentage: campaign.goal > 0 ? Math.min(Math.round((campaign.raised / campaign.goal) * 100), 100) : 0,
                        creator: campaign.ownerId ? await ensService.formatAddressOrEns(campaign.ownerId) : 'You',
                        isVerified: true,
                    })));
                    setUserCampaigns(transformedCampaigns);
                    setError(null);
                } else { setError(result.error || 'Failed to reload campaigns.'); }
              } catch (err) {
                setError('Failed to reload campaigns.');
              } finally {
                setLoading(false);
              }
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
// # #                  SECTION 7 - JSX RETURN: CAMPAIGNS LIST (CLEANED UP)      #
// # ############################################################################ #
  return (
    <div>
      {deleteError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md" role="alert">
          <p className="font-bold">Could not delete campaign:</p>
          <p>{deleteError}</p>
        </div>
      )}

      {userCampaigns.length === 0 && !loading ? (
        <div className="py-6 text-center">
          {/* REMOVED: Large SVG icon that was cluttering the UI */}
          <h3 className="mt-2 text-lg font-medium text-gray-900">No campaigns created yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first campaign.</p>
          <div className="mt-6">
            <Link
              to="/new-campaign"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              {/* REMOVED: SVG plus icon that was too large and unnecessary */}
              Create New Campaign
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {userCampaigns.map((campaign) => (
            <Link
              to={`/campaigns/${campaign.id}`}
              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              key={campaign.id}
            >
              <CampaignCard
                campaign={campaign} // Pass the transformed campaign data
                showAdminActions={true}
                onDelete={() => {
                  handleDeleteCampaign(campaign.id);
                }}
                deleteButtonStyle={deleteButtonStyle}
                onEdit={() => {
                  handleEditCampaign(campaign.id);
                }}
                showViewDetailsButton={false} // Can be false since entire card is clickable
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};