// src/components/GlobalStats.tsx
import React, { useState, useEffect } from 'react';
import { campaignService } from '../services/CampaignService';

interface GlobalStatsData {
  totalCampaigns: number;
  totalRaised: number;
  totalUsers: number;
  activeCampaigns: number;
}

interface GlobalStatsProps {
  style?: React.CSSProperties;
  className?: string;
}

export const GlobalStats: React.FC<GlobalStatsProps> = ({ style, className }) => {
  const [stats, setStats] = useState<GlobalStatsData>({
    totalCampaigns: 0,
    totalRaised: 0,
    totalUsers: 0,
    activeCampaigns: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all campaigns to calculate stats
        const result = await campaignService.fetchAllCampaigns();
        
        if (result.success && result.campaigns) {
          const campaigns = result.campaigns;
          
          // Calculate stats
          const totalCampaigns = campaigns.length;
          const totalRaised = campaigns.reduce((sum, campaign) => sum + campaign.raised, 0);
          const activeCampaigns = campaigns.filter(campaign => 
            campaign.status === 'active' && campaign.raised < campaign.goal
          ).length;
          
          // Get unique users (campaign owners)
          const uniqueUsers = new Set(campaigns.map(campaign => campaign.ownerId)).size;
          
          setStats({
            totalCampaigns,
            totalRaised,
            totalUsers: uniqueUsers,
            activeCampaigns
          });
        } else {
          setError('Failed to load platform statistics');
        }
      } catch (err) {
        console.error('Error fetching global stats:', err);
        setError('Unable to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalStats();
  }, []);

  const statCardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '1rem',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #f0f0f0',
    minHeight: '80px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1a73e8',
    margin: '0 0 0.25rem 0'
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: '#5f6368',
    margin: 0
  };

  const containerStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '1rem',
    width: '100%',
    ...style
  };

  const loadingSpinnerStyle: React.CSSProperties = {
    width: '20px',
    height: '20px',
    border: '2px solid #f0f0f0',
    borderTopColor: '#1a73e8',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto'
  };

  if (error) {
    return (
      <div style={containerStyle} className={className}>
        <div style={{ ...statCardStyle, color: '#ea4335' }}>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Unable to load platform stats</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={containerStyle} className={className}>
        <div style={statCardStyle}>
          {loading ? (
            <div style={loadingSpinnerStyle} />
          ) : (
            <>
              <h3 style={statValueStyle}>{stats.totalCampaigns.toLocaleString()}</h3>
              <p style={statLabelStyle}>Total Campaigns</p>
            </>
          )}
        </div>
        
        <div style={statCardStyle}>
          {loading ? (
            <div style={loadingSpinnerStyle} />
          ) : (
            <>
              <h3 style={statValueStyle}>{stats.totalRaised.toLocaleString()}</h3>
              <p style={statLabelStyle}>Total Raised (WLD)</p>
            </>
          )}
        </div>
        
        <div style={statCardStyle}>
          {loading ? (
            <div style={loadingSpinnerStyle} />
          ) : (
            <>
              <h3 style={statValueStyle}>{stats.totalUsers.toLocaleString()}</h3>
              <p style={statLabelStyle}>Total Users</p>
            </>
          )}
        </div>
        
        <div style={statCardStyle}>
          {loading ? (
            <div style={loadingSpinnerStyle} />
          ) : (
            <>
              <h3 style={statValueStyle}>{stats.activeCampaigns.toLocaleString()}</h3>
              <p style={statLabelStyle}>Active Campaigns</p>
            </>
          )}
        </div>
      </div>
    </>
  );
};