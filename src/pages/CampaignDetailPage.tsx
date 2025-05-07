// src/components/CampaignDetail.tsx - Updated
import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { campaignService, Campaign } from '../services/CampaignService';
import { WLDDonationForm } from '../components/WLDDonationForm';

export const CampaignDetail: React.FC<{ id: string }> = ({ id }) => {
  const { isAuthenticated } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleDonationSuccess = async () => {
    // Refresh campaign data after successful donation
    try {
      const result = await campaignService.fetchCampaign(id);
      if (result.success && result.campaign) {
        setCampaign(result.campaign);
      }
    } catch (err) {
      console.error('Error refreshing campaign data:', err);
    }
  };

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

  const progressPercentage = Math.min(
    Math.round((campaign.raised / campaign.goal) * 100),
    100
  );

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
            <span>Created by: {campaign.ownerId.slice(0, 6)}...{campaign.ownerId.slice(-4)}</span>
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
              
              {isAuthenticated ? (
                <WLDDonationForm 
                  campaignId={id} 
                  onDonationSuccess={handleDonationSuccess}
                />
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-yellow-700">
                    Please sign in to donate to this campaign.
                  </p>
                </div>
              )}
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
                        {donation.donor.slice(0, 6)}...{donation.donor.slice(-4)}
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