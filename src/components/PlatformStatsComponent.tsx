// src/components/PlatformStatsComponent.tsx

import React, { useState, useEffect } from 'react';
import { platformStatsService, PlatformStats, CategoryStat, ActivityItem } from '../services/PlatformStatsService';

interface PlatformStatsComponentProps {
  showAdminControls?: boolean;
  className?: string;
}

const PlatformStatsComponent: React.FC<PlatformStatsComponentProps> = ({ 
  showAdminControls = false,
  className = ''
}) => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await platformStatsService.getPlatformStats();
      setStats(data);
    } catch (err: any) {
      console.error('Error loading platform stats:', err);
      setError(err.message || 'Failed to load platform statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await platformStatsService.refreshStats();
      await loadStats();
    } catch (err: any) {
      console.error('Error refreshing stats:', err);
      setError(err.message || 'Failed to refresh statistics');
    } finally {
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (decimal: number): string => {
    return `${(decimal * 100).toFixed(1)}%`;
  };

  const getActivityIcon = (type: ActivityItem['type']): string => {
    switch (type) {
      case 'campaign_created': return '🎯';
      case 'donation_made': return '💰';
      case 'campaign_completed': return '🎉';
      default: return '📊';
    }
  };

  if (loading) {
    return (
      <div className={`platform-stats-loading ${className}`} style={styles.loading}>
        <div style={styles.loadingSpinner}></div>
        <p>Loading platform statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`platform-stats-error ${className}`} style={styles.error}>
        <p>Error: {error}</p>
        <button onClick={loadStats} style={styles.retryButton}>
          Try Again
        </button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className={`platform-stats ${className}`} style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Platform Statistics</h2>
        {showAdminControls && (
          <button 
            onClick={handleRefresh} 
            disabled={refreshing}
            style={styles.refreshButton}
          >
            {refreshing ? '🔄' : '↻'} Refresh
          </button>
        )}
      </div>

      {/* Key Metrics Grid */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <h3 style={styles.metricValue}>{formatNumber(stats.totalCampaigns)}</h3>
          <p style={styles.metricLabel}>Total Campaigns</p>
          <div style={styles.metricSubtext}>
            {formatNumber(stats.activeCampaigns)} active • {formatNumber(stats.completedCampaigns)} completed
          </div>
        </div>

        <div style={styles.metricCard}>
          <h3 style={styles.metricValue}>{formatCurrency(stats.totalAmountRaised)}</h3>
          <p style={styles.metricLabel}>Total Raised</p>
          <div style={styles.metricSubtext}>
            Avg: {formatCurrency(stats.averageDonationAmount)} per donation
          </div>
        </div>

        <div style={styles.metricCard}>
          <h3 style={styles.metricValue}>{formatNumber(stats.totalDonations)}</h3>
          <p style={styles.metricLabel}>Total Donations</p>
          <div style={styles.metricSubtext}>
            From {formatNumber(stats.totalUsers)} users
          </div>
        </div>

        <div style={styles.metricCard}>
          <h3 style={styles.metricValue}>{formatPercentage(stats.conversionRate)}</h3>
          <p style={styles.metricLabel}>Success Rate</p>
          <div style={styles.metricSubtext}>
            Campaigns reaching their goal
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Top Categories</h3>
        <div style={styles.categoriesGrid}>
          {stats.topCategories.map((category: CategoryStat, index: number) => (
            <div key={category.category} style={styles.categoryCard}>
              <div style={styles.categoryHeader}>
                <span style={styles.categoryName}>{category.category}</span>
                <span style={styles.categoryPercentage}>{category.percentage}%</span>
              </div>
              <div style={styles.categoryStats}>
                <span style={styles.categoryCount}>{formatNumber(category.count)} campaigns</span>
                <span style={styles.categoryAmount}>{formatCurrency(category.totalRaised)}</span>
              </div>
              <div 
                style={{
                  ...styles.categoryBar,
                  width: `${category.percentage}%`
                }}
              ></div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Recent Activity</h3>
        <div style={styles.activityList}>
          {stats.recentActivity.map((activity: ActivityItem, index: number) => (
            <div key={index} style={styles.activityItem}>
              <span style={styles.activityIcon}>
                {getActivityIcon(activity.type)}
              </span>
              <div style={styles.activityContent}>
                <p style={styles.activityDescription}>{activity.description}</p>
                <span style={styles.activityTime}>
                  {new Date(activity.timestamp).toLocaleString()}
                  {activity.amount && (
                    <span style={styles.activityAmount}>
                      • {formatCurrency(activity.amount)}
                    </span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '1.5rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    maxWidth: '1200px',
    margin: '0 auto'
  },

  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },

  loadingSpinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #1a73e8',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem'
  },

  error: {
    padding: '2rem',
    backgroundColor: 'rgba(234, 67, 53, 0.05)',
    border: '1px solid rgba(234, 67, 53, 0.2)',
    borderRadius: '12px',
    textAlign: 'center',
    color: '#c53929'
  },

  retryButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#1a73e8',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '1rem'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },

  title: {
    fontSize: '1.75rem',
    fontWeight: 600,
    color: '#202124',
    margin: 0
  },

  refreshButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f8f9fa',
    border: '1px solid #dadce0',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'background-color 0.2s'
  },

  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },

  metricCard: {
    padding: '1.5rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    textAlign: 'center'
  },

  metricValue: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#1a73e8',
    margin: '0 0 0.5rem 0'
  },

  metricLabel: {
    fontSize: '1rem',
    fontWeight: 500,
    color: '#3c4043',
    margin: '0 0 0.5rem 0'
  },

  metricSubtext: {
    fontSize: '0.75rem',
    color: '#5f6368'
  },

  section: {
    marginBottom: '2rem'
  },

  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#202124',
    marginBottom: '1rem'
  },

  categoriesGrid: {
    display: 'grid',
    gap: '1rem'
  },

  categoryCard: {
    padding: '1rem',
    border: '1px solid #e8eaed',
    borderRadius: '8px',
    position: 'relative'
  },

  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },

  categoryName: {
    fontWeight: 500,
    color: '#202124'
  },

  categoryPercentage: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#1a73e8'
  },

  categoryStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: '#5f6368',
    marginBottom: '0.5rem'
  },

  categoryCount: {},
  categoryAmount: {},

  categoryBar: {
    height: '4px',
    backgroundColor: '#1a73e8',
    borderRadius: '2px',
    transition: 'width 0.3s ease'
  },

  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },

  activityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },

  activityIcon: {
    fontSize: '1.25rem',
    minWidth: '1.5rem'
  },

  activityContent: {
    flex: 1
  },

  activityDescription: {
    margin: '0 0 0.25rem 0',
    color: '#202124',
    fontSize: '0.875rem'
  },

  activityTime: {
    fontSize: '0.75rem',
    color: '#5f6368'
  },

  activityAmount: {
    fontWeight: 500,
    color: '#1a73e8'
  }
};

export default PlatformStatsComponent;