// # ############################################################################ #
// # #                   SECTION 1 - IMPORTS: CAMPAIGN LIST                     #
// # ############################################################################ #
// src/components/CampaignList.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { campaignService, Campaign } from '../services/CampaignService';
import UserDisplay from './UserDisplay';

// # ############################################################################ #
// # #        SECTION 2 - COMPONENT: CAMPAIGNLIST - DEFINITION & STATE        #
// # ############################################################################ #
export const CampaignList: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

// # ############################################################################ #
// # #            SECTION 3 - COMPONENT: CAMPAIGNLIST - DATA FETCHING           #
// # ############################################################################ #
  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      try {
        const result = await campaignService.fetchAllCampaigns();
        if (result.success && result.campaigns) {
          setCampaigns(result.campaigns);
        } else {
          setError(result.error || 'Failed to load campaigns');
        }
      } catch (err: any) {
        console.error('Error fetching campaigns:', err);
        setError(err.message || 'An error occurred while fetching campaigns');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

// # ############################################################################ #
// # #      SECTION 4 - COMPONENT: CAMPAIGNLIST - CONDITIONAL RENDERING       #
// # ############################################################################ #
  if (loading) {
    return <div className="text-center py-10">Loading campaigns...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative my-4">
        {error}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return <div className="text-center py-10">No campaigns found. Create one!</div>;
  }

// # ############################################################################ #
// # #             SECTION 5 - COMPONENT: CAMPAIGNLIST - JSX RETURN             #
// # ############################################################################ #
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
  );
};

// # ############################################################################ #
// # #       SECTION 6 - COMPONENT: CAMPAIGNCARD - DEFINITION & PROPS       #
// # ############################################################################ #
// src/components/CampaignCard.tsx
export const CampaignCard: React.FC<{ campaign: Campaign }> = ({ campaign }) => {
  
// # ############################################################################ #
// # #       SECTION 7 - COMPONENT: CAMPAIGNCARD - CALCULATED VALUES        #
// # ############################################################################ #
  const progressPercentage = Math.min(
    Math.round((campaign.raised / campaign.goal) * 100),
    100
  );

// # ############################################################################ #
// # #            SECTION 8 - COMPONENT: CAMPAIGNCARD - JSX RETURN            #
// # ############################################################################ #
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {campaign.image ? (
        <img
          src={campaign.image}
          alt={campaign.title}
          className="w-full h-40 object-cover"
          onError={(e) => {
            e.currentTarget.src = 'https://placehold.co/400x200/e5e7eb/5f6368?text=No+Image';
          }}
        />
      ) : (
        <div className="w-full h-40 bg-gray-200 flex items-center justify-center text-gray-500">
          No Image
        </div>
      )}

      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2 truncate">{campaign.title}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2 h-10">
          {campaign.description || 'No description provided.'}
        </p>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className="bg-green-500 h-2 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        <div className="flex justify-between text-sm text-gray-700 mb-3">
          <span>{campaign.raised} / {campaign.goal} WLD</span>
          <span>{progressPercentage}%</span>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {new Date(campaign.createdAt).toLocaleDateString()}
          </div>
          <Link
            to={`/campaigns/${campaign.id}`}
            className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

// # ############################################################################ #
// # #        SECTION 9 - COMPONENT: CAMPAIGNDETAIL - DEFINITION & STATE        #
// # ############################################################################ #
// src/components/CampaignDetail.tsx
export const CampaignDetail: React.FC<{ id: string }> = ({ id }) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [donationAmount, setDonationAmount] = useState<number>(0);
  const [donationTxHash, setDonationTxHash] = useState<string>('');
  const [donating, setDonating] = useState(false);
  const [donationSuccess, setDonationSuccess] = useState(false);

// # ############################################################################ #
// # #          SECTION 10 - COMPONENT: CAMPAIGNDETAIL - DATA FETCHING          #
// # ############################################################################ #
  useEffect(() => {
    const fetchCampaign = async () => {
      setLoading(true);
      try {
        const result = await campaignService.fetchCampaign(id);
        if (result.success && result.campaign) {
          setCampaign(result.campaign);
        } else {
          setError(result.error || 'Failed to load campaign');
        }
      } catch (err: any) {
        console.error('Error fetching campaign:', err);
        setError(err.message || 'An error occurred while fetching campaign');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [id]);

// # ############################################################################ #
// # #        SECTION 11 - COMPONENT: CAMPAIGNDETAIL - EVENT HANDLERS         #
// # ############################################################################ #
  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!donationAmount || donationAmount <= 0) {
      alert('Please enter a valid donation amount');
      return;
    }

    if (!donationTxHash) {
      alert('Transaction hash is required');
      return;
    }

    setDonating(true);

    try {
      const result = await campaignService.recordDonation(
        id,
        donationAmount,
        donationTxHash
      );

      if (result.success) {
        setDonationSuccess(true);

        // Refresh campaign data
        const refreshResult = await campaignService.fetchCampaign(id);
        if (refreshResult.success && refreshResult.campaign) {
          setCampaign(refreshResult.campaign);
        }

        // Reset form
        setDonationAmount(0);
        setDonationTxHash('');
      } else {
        alert(result.error || 'Failed to process donation');
      }
    } catch (err: any) {
      console.error('Error processing donation:', err);
      alert(err.message || 'An error occurred');
    } finally {
      setDonating(false);
    }
  };

// # ############################################################################ #
// # #    SECTION 12 - COMPONENT: CAMPAIGNDETAIL - CONDITIONAL RENDERING    #
// # ############################################################################ #
  if (loading) {
    return <div className="text-center py-10">Loading campaign details...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative my-4">
        {error}
      </div>
    );
  }

  if (!campaign) {
    return <div className="text-center py-10">Campaign not found</div>;
  }

// # ############################################################################ #
// # #       SECTION 13 - COMPONENT: CAMPAIGNDETAIL - CALCULATED VALUES       #
// # ############################################################################ #
  const progressPercentage = Math.min(
    Math.round((campaign.raised / campaign.goal) * 100),
    100
  );

// # ############################################################################ #
// # #           SECTION 14 - COMPONENT: CAMPAIGNDETAIL - JSX RETURN            #
// # ############################################################################ #
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {campaign.image ? (
          <img
            src={campaign.image}
            alt={campaign.title}
            className="w-full h-64 object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://placehold.co/800x400/e5e7eb/5f6368?text=No+Image';
            }}
          />
        ) : (
          <div className="w-full h-64 bg-gray-200 flex items-center justify-center text-gray-500">
            No Image
          </div>
        )}

        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2">{campaign.title}</h1>

          <div className="flex items-center text-sm text-gray-600 mb-4">
            <span>Created by: <UserDisplay address={campaign.ownerId} className="text-xs" /></span>
            <span className="mx-2">•</span>
            <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
            <span className="mx-2">•</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              campaign.status === 'active' ? 'bg-green-100 text-green-800' :
              campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
              'bg-red-100 text-red-800'
            }`}>
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </span>
          </div>

          <p className="text-gray-700 mb-6 whitespace-pre-line">
            {campaign.description || 'No description provided.'}
          </p>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Funding Progress</h2>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
              <div
                className="bg-green-500 h-4 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-sm font-medium">
              <span>{campaign.raised} WLD raised</span>
              <span>{campaign.goal} WLD goal</span>
            </div>
          </div>

          {campaign.status === 'active' && (
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold mb-4">Make a Donation</h2>

              {donationSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative mb-4">
                  Thank you for your donation! Your contribution has been recorded.
                </div>
              )}

              <form onSubmit={handleDonate} className="space-y-4">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (WLD)
                  </label>
                  <input
                    type="number"
                    id="amount"
                    value={donationAmount || ''}
                    onChange={(e) => setDonationAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter amount"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="txHash" className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Hash
                  </label>
                  <input
                    type="text"
                    id="txHash"
                    value={donationTxHash}
                    onChange={(e) => setDonationTxHash(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter transaction hash"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter the transaction hash after sending WLD tokens.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={donating}
                  className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    donating ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {donating ? 'Processing...' : 'Donate WLD'}
                </button>
              </form>
            </div>
          )}

          {campaign.donations.length > 0 && (
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h2 className="text-lg font-semibold mb-4">Recent Donations</h2>
              <div className="space-y-3">
                {campaign.donations.map((donation) => (
                  <div key={donation.id} className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <div>
                      <span className="text-sm font-medium">
                        <UserDisplay address={donation.donor} className="text-xs" />
                      </span>
                      <p className="text-xs text-gray-500">
                        {new Date(donation.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="font-medium text-green-600">
                      {donation.amount} WLD
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// # ############################################################################ #
// # #                 SECTION 15 - IMPORTS: EDIT CAMPAIGN FORM                 #
// # ############################################################################ #
// src/components/EditCampaignForm.tsx
import { useNavigate } from 'react-router-dom'; // React, useState, useEffect, Campaign, campaignService assumed from above

// # ############################################################################ #
// # #     SECTION 16 - COMPONENT: EDITCAMPAIGNFORM - DEFINITION & STATE      #
// # ############################################################################ #
export const EditCampaignForm: React.FC<{ id: string }> = ({ id }) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    goal: number;
    image: string;
    status: 'active' | 'completed' | 'cancelled';
  }>({
    title: '',
    description: '',
    goal: 0,
    image: '',
    status: 'active'
  });

// # ############################################################################ #
// # #         SECTION 17 - COMPONENT: EDITCAMPAIGNFORM - DATA FETCHING         #
// # ############################################################################ #
  useEffect(() => {
    const fetchCampaign = async () => {
      setLoading(true);
      try {
        const result = await campaignService.fetchCampaign(id);
        if (result.success && result.campaign) {
          setCampaign(result.campaign);
          setFormData({
            title: result.campaign.title,
            description: result.campaign.description,
            goal: result.campaign.goal,
            image: result.campaign.image || '',
            status: result.campaign.status
          });
        } else {
          setError(result.error || 'Failed to load campaign');
        }
      } catch (err: any) {
        console.error('Error fetching campaign:', err);
        setError(err.message || 'An error occurred while fetching campaign');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [id]);

// # ############################################################################ #
// # #       SECTION 18 - COMPONENT: EDITCAMPAIGNFORM - EVENT HANDLERS        #
// # ############################################################################ #
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseFloat(value) : value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const result = await campaignService.updateCampaign(id, formData);

      if (result.success) {
        navigate(`/campaigns/${id}`);
      } else {
        setError(result.error || 'Failed to update campaign');
      }
    } catch (err: any) {
      console.error('Error updating campaign:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

// # ############################################################################ #
// # #  SECTION 19 - COMPONENT: EDITCAMPAIGNFORM - CONDITIONAL RENDERING  #
// # ############################################################################ #
  if (loading) {
    return <div className="text-center py-10">Loading campaign...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative my-4">
        {error}
      </div>
    );
  }

  if (!campaign) {
    return <div className="text-center py-10">Campaign not found</div>;
  }

// # ############################################################################ #
// # #           SECTION 20 - COMPONENT: EDITCAMPAIGNFORM - JSX RETURN          #
// # ############################################################################ #
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Edit Campaign</h2>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="title" className="block text-gray-700 text-sm font-bold mb-2">
            Campaign Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>

        <div className="mb-4">
          <label htmlFor="goal" className="block text-gray-700 text-sm font-bold mb-2">
            Funding Goal (WLD)
          </label>
          <input
            type="number"
            id="goal"
            name="goal"
            value={formData.goal}
            onChange={handleChange}
            min="1"
            step="0.01"
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="image" className="block text-gray-700 text-sm font-bold mb-2">
            Image URL (optional)
          </label>
          <input
            type="url"
            id="image"
            name="image"
            value={formData.image}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="status" className="block text-gray-700 text-sm font-bold mb-2">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={submitting}
            className={`flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${
              submitting ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>

          <button
            type="button"
            onClick={() => navigate(`/campaigns/${id}`)}
            className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};