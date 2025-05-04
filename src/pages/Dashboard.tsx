// src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { campaignService, Campaign } from '../services/CampaignService';

export const Dashboard: React.FC = () => {
  const { walletAddress, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalRaised: 0,
    activeCampaigns: 0
  });

  useEffect(() => {
    if (!isAuthenticated || !walletAddress) {
      navigate('/landing');
      return;
    }

    loadUserCampaigns();
  }, [isAuthenticated, walletAddress, navigate]);

  const loadUserCampaigns = async () => {
    if (!walletAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await campaignService.fetchUserCampaigns(walletAddress);
      
      if (result.success && result.campaigns) {
        setCampaigns(result.campaigns);
        
        // Calculate stats
        const totalRaised = result.campaigns.reduce((sum, c) => sum + (c.raised || 0), 0);
        const activeCampaigns = result.campaigns.filter(c => c.status === 'active').length;
        
        setStats({
          totalCampaigns: result.campaigns.length,
          totalRaised,
          activeCampaigns
        });
      } else {
        setError(result.error || 'Failed to load campaigns');
      }
    } catch (error: any) {
      console.error('Failed to load campaigns:', error);
      setError('Failed to load campaigns. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) {
      return;
    }

    try {
      const result = await campaignService.deleteCampaign(campaignId);
      
      if (result.success) {
        alert('Campaign deleted successfully');
        // Reload campaigns after deletion
        loadUserCampaigns();
      } else {
        alert(result.error || 'Failed to delete campaign');
      }
    } catch (error: any) {
      console.error('Failed to delete campaign:', error);
      alert('Failed to delete campaign');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/landing');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'sans-serif',
      }}>
        Loading your campaigns...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ 
        marginBottom: '30px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h1 style={{ marginBottom: '10px', fontSize: '2rem', color: '#202124' }}>Your Dashboard</h1>
          <p style={{ color: '#5f6368' }}>Manage your campaigns and track donations</p>
          {walletAddress && (
            <p style={{ fontSize: '0.8em', color: '#777', marginTop: '5px' }}>
              Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          )}
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Logout
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          color: '#991b1b',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #fee2e2',
        }}>
          {error}
          <button
            onClick={loadUserCampaigns}
            style={{
              marginLeft: '10px',
              padding: '5px 10px',
              backgroundColor: '#991b1b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
        }}>
          <h3 style={{ marginBottom: '10px', color: '#5f6368' }}>Total Campaigns</h3>
          <p style={{ fontSize: '2em', fontWeight: 'bold', color: '#1a73e8', margin: 0 }}>
            {stats.totalCampaigns}
          </p>
        </div>
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
        }}>
          <h3 style={{ marginBottom: '10px', color: '#5f6368' }}>Total Raised</h3>
          <p style={{ fontSize: '2em', fontWeight: 'bold', color: '#34a853', margin: 0 }}>
            {stats.totalRaised} WLD
          </p>
        </div>
        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
        }}>
          <h3 style={{ marginBottom: '10px', color: '#5f6368' }}>Active Campaigns</h3>
          <p style={{ fontSize: '2em', fontWeight: 'bold', color: '#673ab7', margin: 0 }}>
            {stats.activeCampaigns}
          </p>
        </div>
      </div>

      {/* Create Campaign Button */}
      <div style={{ marginBottom: '20px' }}>
        <Link
          to="/new-campaign"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#1a73e8',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            fontWeight: '500',
          }}
        >
          Create New Campaign
        </Link>
      </div>

      {/* Campaigns List */}
      <div style={{ 
        background: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
      }}>
        <div style={{ 
          padding: '20px', 
          borderBottom: '1px solid #e5e7eb',
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#202124' }}>Your Campaigns</h2>
        </div>
        
        {campaigns.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#5f6368' }}>
            You haven't created any campaigns yet.
          </div>
        ) : (
          <div>
            {campaigns.map((campaign, index) => (
              <div 
                key={campaign.id} 
                style={{ 
                  padding: '20px', 
                  borderBottom: index < campaigns.length - 1 ? '1px solid #e5e7eb' : 'none',
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '15px',
                }}
              >
                <div style={{ flex: '1 1 300px' }}>
                  <h3 style={{ marginBottom: '5px', fontSize: '1.2rem', color: '#202124' }}>
                    {campaign.title}
                  </h3>
                  <p style={{ color: '#5f6368', marginBottom: '5px' }}>
                    {campaign.raised || 0} / {campaign.goal} WLD raised
                  </p>
                  <p style={{ fontSize: '0.9em', color: '#5f6368' }}>
                    Status: <span style={{ 
                      color: campaign.status === 'active' ? '#34a853' : '#ea4335',
                      fontWeight: '500',
                    }}>
                      {campaign.status}
                    </span>
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <Link
                    to={`/campaigns/${campaign.id}`}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f1f3f4',
                      color: '#202124',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    View
                  </Link>
                  <Link
                    to={`/campaigns/${campaign.id}/edit`}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#e8f0fe',
                      color: '#1a73e8',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(campaign.id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#fce8e6',
                      color: '#d93025',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};