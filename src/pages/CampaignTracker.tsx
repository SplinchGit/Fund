// src/components/CampaignTracker.tsx

// # ############################################################################ #
// # #                             SECTION 1 - IMPORTS                            #
// # ############################################################################ #
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { campaignService, Campaign } from '../services/CampaignService';

// # ############################################################################ #
// # #                SECTION 2 - COMPONENT: DEFINITION & STATE                 #
// # ############################################################################ #
export const CampaignTracker: React.FC = () => {
  const { walletAddress } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalRaised: 0,
    activeCampaigns: 0,
    totalContributors: 0
  });

// # ############################################################################ #
// # #      SECTION 3 - EFFECT: FETCH USER CAMPAIGNS & CALCULATE STATS      #
// # ############################################################################ #
  useEffect(() => {
    const fetchUserCampaigns = async () => {
      if (!walletAddress) return;

      setLoading(true);
      try {
        const result = await campaignService.fetchUserCampaigns(walletAddress);

        if (result.success && result.campaigns) {
          setCampaigns(result.campaigns);

          // Calculate stats
          const totalRaised = result.campaigns.reduce((sum, c) => sum + (c.raised || 0), 0);
          const activeCampaigns = result.campaigns.filter(c => c.status === 'active').length;

          // Count unique contributors across all campaigns
          const allContributors = new Set<string>();
          result.campaigns.forEach(campaign => {
            campaign.donations.forEach(donation => {
              allContributors.add(donation.donor);
            });
          });

          setStats({
            totalCampaigns: result.campaigns.length,
            totalRaised,
            activeCampaigns,
            totalContributors: allContributors.size
          });
        } else {
          setError(result.error || 'Failed to load campaigns');
        }
      } catch (error: any) {
        console.error('Failed to load campaigns:', error);
        setError('Failed to load your campaigns. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserCampaigns();
  }, [walletAddress]);

// # ############################################################################ #
// # #            SECTION 4 - EVENT HANDLER: DELETE CAMPAIGN             #
// # ############################################################################ #
  const handleDeleteCampaign = async (id: string, title: string) => {
    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete the campaign "${title}"? This action cannot be undone.`)) {
      return;
    }
    
    setIsDeleting(id);
    setDeleteError(null);
    
    try {
      const result = await campaignService.deleteCampaign(id);
      
      if (result.success) {
        // Find the campaign before removing it to update stats
        const campaign = campaigns.find(c => c.id === id);
        
        // Remove the campaign from the local state to update UI immediately
        setCampaigns(campaigns.filter(campaign => campaign.id !== id));
        
        // Update stats after successful deletion
        setStats(prev => ({
          ...prev,
          totalCampaigns: prev.totalCampaigns - 1,
          totalRaised: prev.totalRaised - (campaign?.raised || 0),
          activeCampaigns: prev.activeCampaigns - (campaign?.status === 'active' ? 1 : 0)
        }));
        
        console.log(`Campaign "${title}" (${id}) was successfully deleted`);
      } else {
        setDeleteError(result.error || 'Failed to delete campaign');
      }
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      setDeleteError(error.message || 'An error occurred while deleting the campaign');
    } finally {
      setIsDeleting(null);
    }
  };

// # ############################################################################ #
// # #            SECTION 5 - CONDITIONAL RENDERING: LOADING STATE            #
// # ############################################################################ #
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-600">Loading your campaigns...</p>
      </div>
    );
  }

// # ############################################################################ #
// # #             SECTION 6 - CONDITIONAL RENDERING: ERROR STATE             #
// # ############################################################################ #
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md my-4">
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-red-700 underline hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

// # ############################################################################ #
// # #      SECTION 7 - JSX RETURN: STATS OVERVIEW & CAMPAIGNS TABLE      #
// # ############################################################################ #
  return (
    <div>
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500 mb-1">Total Campaigns</p>
          <p className="text-2xl font-bold text-gray-800">{stats.totalCampaigns}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500 mb-1">Active Campaigns</p>
          <p className="text-2xl font-bold text-green-600">{stats.activeCampaigns}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500 mb-1">Total Raised</p>
          <p className="text-2xl font-bold text-blue-600">{stats.totalRaised.toLocaleString()} WLD</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500 mb-1">Contributors</p>
          <p className="text-2xl font-bold text-purple-600">{stats.totalContributors}</p>
        </div>
      </div>

      {/* Deletion Error Message */}
      {deleteError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md my-4">
          <p className="font-medium">Error deleting campaign</p>
          <p>{deleteError}</p>
        </div>
      )}

      {/* Campaigns Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Your Campaigns</h2>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600 mb-4">You haven't created any campaigns yet.</p>
            <Link
              to="/new-campaign"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Your First Campaign
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((campaign) => {
                  const progressPercentage = Math.min(
                    Math.round((campaign.raised / campaign.goal) * 100),
                    100
                  );

                  return (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            {campaign.image ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={campaign.image}
                                alt=""
                                onError={(e) => {
                                  e.currentTarget.src = 'https://placehold.co/40x40/e5e7eb/5f6368?text=N/A';
                                }}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                                N/A
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                              {campaign.title}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {campaign.raised.toLocaleString()} / {campaign.goal.toLocaleString()} WLD ({progressPercentage}%)
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                          campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link
                            to={`/campaigns/${campaign.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </Link>
                          <Link
                            to={`/campaigns/${campaign.id}/edit`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteCampaign(campaign.id, campaign.title)}
                            disabled={isDeleting === campaign.id}
                            className={`text-red-600 hover:text-red-900 ${isDeleting === campaign.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {isDeleting === campaign.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};