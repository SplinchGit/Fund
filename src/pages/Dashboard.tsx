// src/pages/Dashboard.tsx
// (UPDATED: Removed large icons from empty state for cleaner UI)

// # ############################################################################ #
// # #                     SECTION 1 - IMPORTS                                  #
// # ############################################################################ #
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { CampaignTracker } from './CampaignTracker';
import { campaignService } from '../services/CampaignService';

// # ############################################################################ #
// # # SECTION 2 - STYLES OBJECT DEFINITION (styles BEFORE responsiveStyles)    #
// # ############################################################################ #

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    textAlign: 'center' as const,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif',
    color: '#202124',
    backgroundColor: '#f5f7fa',
    margin: 0,
    padding: 0,
    overflowX: 'hidden' as const,
    width: '100vw',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxSizing: 'border-box' as const,
  },
  container: {
    margin: '0 auto',
    width: '100%',
    padding: '1rem 0.5rem 2rem 0.5rem',
    boxSizing: 'border-box' as const,
    maxWidth: '1200px',
    flexGrow: 1,
  },
  header: {
    background: 'white',
    padding: '0.5rem 0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 0.5rem',
    boxSizing: 'border-box' as const,
  },
  logo: { display: 'flex', alignItems: 'center', color: '#1a73e8', fontWeight: 700, fontSize: '1.125rem', textDecoration: 'none', },
  logoSpan: { color: '#202124', },
  button: {
    padding: '0.5rem 0.75rem',
    borderRadius: '0.25rem',
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center' as const,
    fontSize: '0.875rem',
    transition: 'background-color 0.2s, border-color 0.2s',
    border: '1px solid transparent',
    minHeight: '36px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  buttonPrimary: {
    backgroundColor: '#1a73e8',
    color: 'white',
    borderColor: '#1a73e8',
  },
  buttonDanger: {
    padding: '0.375rem 0.75rem',
    borderRadius: '0.25rem',
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center' as const,
    fontSize: '0.875rem',
    transition: 'background-color 0.2s, border-color 0.2s',
    border: '1px solid #dc3545',
    minHeight: '36px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    backgroundColor: '#dc3545',
    color: 'white',
    borderColor: '#dc3545',
  },
  dashboardHeader: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', marginBottom: '1.5rem', padding: '1rem 0.5rem 0.5rem 0.5rem', boxSizing: 'border-box' as const, textAlign: 'center' as const, },
  dashboardTitle: { fontSize: '1.75rem', fontWeight: 700, color: '#202124', margin: 0, padding: 0, },
  dashboardSubtitle: { fontSize: '0.9rem', color: '#5f6368', marginTop: '0.5rem', maxWidth: '600px', lineHeight: 1.5, },
  walletInfo: { fontSize: '0.8rem', color: '#5f6368', display: 'flex', alignItems: 'center', },
  walletAddress: { marginRight: '1rem', },
  contentSection: { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', padding: '1.5rem', marginBottom: '1.5rem', boxSizing: 'border-box' as const, },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem', },
  statCard: { backgroundColor: '#ffffff', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', textAlign: 'center' as const, boxSizing: 'border-box' as const, },
  statValue: { fontSize: '1.75rem', fontWeight: 700, color: '#1a73e8', margin: '0 0 0.25rem 0', padding: 0, },
  statLabel: { fontSize: '0.8rem', color: '#5f6368', marginTop: '0.25rem', padding: 0, },
  createButtonContainer: { textAlign: 'center' as const, margin: '1.5rem 0 2rem 0', },
  createButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.6rem 1.2rem',
    backgroundColor: '#1a73e8',
    color: 'white',
    borderRadius: '0.25rem',
    fontWeight: 500,
    textDecoration: 'none',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: 'none',
    fontSize: '0.85rem',
    cursor: 'pointer',
    lineHeight: 1.2,
  },
  createButtonIcon: {
    marginRight: '0.5rem',
    width: '1rem',
    height: '1rem',
    fill: 'currentColor',
  },
  tabs: { display: 'flex', justifyContent: 'space-around', backgroundColor: '#fff', borderTop: '1px solid #e0e0e0', position: 'fixed' as const, bottom: 0, left: 0, width: '100%', zIndex: 100, padding: '0.75rem 0', boxShadow: '0 -1px 3px rgba(0,0,0,0.1)', boxSizing: 'border-box' as const, },
  tab: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', fontSize: '0.65rem', color: '#5f6368', textDecoration: 'none', padding: '0.1rem 0.5rem', flexGrow: 1, textAlign: 'center' as const, transition: 'color 0.2s', },
  tabActive: { color: '#1a73e8', },
  tabIcon: { width: '1.125rem', height: '1.125rem', marginBottom: '0.125rem', },
  legalNotice: {
    fontSize: '0.7rem',
    color: '#5f6368',
    padding: '1rem',
    marginTop: 'auto', 
    marginBottom: '1.5rem', // Change #4: Updated marginBottom from '5rem' to '1.5rem'
    borderTop: '1px solid #eee',
    textAlign: 'center' as const,
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  loadingContainer: { display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f5f7fa', boxSizing: 'border-box' as const, },
  loadingSpinner: { borderRadius: '50%', width: '40px', height: '40px', border: '3px solid rgba(0, 0, 0, 0.1)', borderTopColor: '#1a73e8', animation: 'spin 1s ease-in-out infinite', },
  loadingText: { marginTop: '1rem', color: '#5f6368', fontSize: '0.9rem', },
  quickAccessSection: { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', padding: '1.5rem', marginBottom: '1.5rem', boxSizing: 'border-box' as const, },
  sectionTitle: { fontSize: '1.125rem', fontWeight: 600, color: '#202124', marginTop: 0, marginBottom: '1rem', textAlign: 'left' as const, },
  quickLinks: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem', },
  quickLink: { padding: '0.75rem 0.5rem', color: '#1a73e8', textDecoration: 'none', textAlign: 'left' as const, display: 'flex', alignItems: 'center', fontSize: '0.875rem', transition: 'background-color 0.2s, color 0.2s', borderRadius: '4px', },
  quickLinkIcon: { marginRight: '0.75rem', width: '1rem', height: '1rem', flexShrink: 0, },
  infoSection: { 
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxSizing: 'border-box' as const,
  },
  infoText: { 
    fontSize: '0.875rem',
    color: '#5f6368',
    marginBottom: '0rem', 
    lineHeight: '1.6',
    textAlign: 'left' as const,
  },
  errorMessage: {
    backgroundColor: 'rgba(234, 67, 53, 0.1)',
    border: '1px solid rgba(234, 67, 53, 0.2)',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem',
    color: '#c53929',
    fontSize: '0.875rem',
    textAlign: 'left' as const,
    boxSizing: 'border-box' as const,
  },
};

const responsiveStyles = `
  html, body { 
    width: 100%; 
    height: 100%; 
    margin: 0; 
    padding: 0; 
    overflow-x: hidden; 
    font-family: ${styles.page?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif'}; 
    box-sizing: border-box; 
  }
  *, *::before, *::after { 
    box-sizing: inherit; 
  }
  .quickLinkHoverable:hover { 
    background-color: #f0f0f0 !important; 
    color: #1a73e8 !important;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// # ############################################################################ #
// # #       SECTION 3 - COMPONENT: PAGE DEFINITION & HOOKS                     #
// # ############################################################################ #
const Dashboard: React.FC = () => {
  const { walletAddress, isAuthenticated, logout } = useAuth(); 
  const navigate = useNavigate();
  
  // FIXED: Calculate stats from user campaigns instead of separate API call
  const [stats, setStats] = useState({
    totalCampaigns: 0, 
    totalRaised: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

// # ############################################################################ #
// # # SECTION 4 - EFFECT: AUTHENTICATION CHECK & CALCULATE STATS FROM CAMPAIGNS #
// # ############################################################################ #
  useEffect(() => {
    // ========== DEBUG STEP 1: CHECK WALLET ADDRESS VALIDITY ==========
    console.log('🔍 [DEBUG STEP 1] Dashboard useEffect triggered');
    console.log('🔍 [DEBUG STEP 1] walletAddress:', walletAddress);
    console.log('🔍 [DEBUG STEP 1] isAuthenticated:', isAuthenticated);
    console.log('🔍 [DEBUG STEP 1] typeof walletAddress:', typeof walletAddress);
    console.log('🔍 [DEBUG STEP 1] walletAddress length:', walletAddress?.length);
    console.log('🔍 [DEBUG STEP 1] walletAddress truthy check:', !!walletAddress);
    // ================================================================

    if (!isAuthenticated) {
      console.log('[Dashboard] User not authenticated, redirecting to landing page');
      navigate('/landing');
      return; 
    }

    // FIXED: Fetch user campaigns and calculate stats from them
    const fetchUserCampaignsAndCalculateStats = async () => {
      if (!walletAddress) {
        console.log('🔍 [DEBUG STEP 1] walletAddress is falsy, stopping fetch');
        setIsLoadingStats(false);
        return;
      }

      console.log('🔍 [DEBUG STEP 1] About to call fetchUserCampaigns with walletAddress:', walletAddress);
      
      setIsLoadingStats(true);
      setStatsError(null);
      console.log('[Dashboard] Fetching user campaigns to calculate stats...');
      
      try {
        const result = await campaignService.fetchUserCampaigns(walletAddress);
        
        if (result.success && result.campaigns) {
          const totalCampaigns = result.campaigns.length;
          const totalRaised = result.campaigns.reduce((sum, campaign) => sum + (campaign.raised || 0), 0);
          
          setStats({
            totalCampaigns,
            totalRaised
          });
          
          console.log('[Dashboard] Stats calculated from user campaigns:', { totalCampaigns, totalRaised });
        } else {
          // If campaigns fail to load, we'll still show 0 stats rather than error
          console.warn('[Dashboard] Failed to fetch user campaigns for stats:', result.error);
          setStats({ totalCampaigns: 0, totalRaised: 0 });
        }
      } catch (error) {
        console.error("[Dashboard] Error fetching campaigns for stats:", error);
        // Don't show error for stats calculation - just show 0
        setStats({ totalCampaigns: 0, totalRaised: 0 });
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchUserCampaignsAndCalculateStats();
  }, [isAuthenticated, navigate, walletAddress]);

// # ############################################################################ #
// # #       SECTION 5 - EVENT HANDLER: LOGOUT                                  #
// # ############################################################################ #
  const handleLogout = async () => {
    if (logout) {
      try {
        await logout();
        navigate('/landing');
      } catch (error) {
        console.error("Error during logout:", error);
        navigate('/landing'); 
      }
    } else {
      console.error("Logout function is not available from AuthContext.");
      navigate('/landing'); 
    }
  };

// # ############################################################################ #
// # #       SECTION 6 - CONDITIONAL RENDERING: UNAUTHENTICATED FALLBACK        #
// # ############################################################################ #
  if (!isAuthenticated) {
    return (
      <div style={styles.loadingContainer}>
        <style>{responsiveStyles}</style>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading Dashboard...</p>
      </div>
    );
  }

// # ############################################################################ #
// # #         SECTION 7 - JSX RETURN: PAGE LAYOUT & CONTENT                    #
// # ############################################################################ #
  return (
    <div style={styles.page}>
      <style>{responsiveStyles}</style>

      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/" style={styles.logo}>Fund<span style={styles.logoSpan}></span></Link>
          <div style={styles.walletInfo}>
            {walletAddress && (
                <span style={styles.walletAddress}>
                  Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
            )}
            <button
              style={styles.buttonDanger} 
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={styles.container}>
        <div style={styles.dashboardHeader}>
          <h1 style={styles.dashboardTitle}>Your Dashboard</h1>
          <p style={styles.dashboardSubtitle}>
            Manage your campaigns securely - only you can edit or delete your campaigns from this dashboard.
          </p>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            {isLoadingStats ? (
              <div style={styles.loadingSpinner}></div>
            ) : (
              <h3 style={styles.statValue}>{stats.totalCampaigns}</h3>
            )}
            <p style={styles.statLabel}>Total Campaigns</p>
          </div>
          <div style={styles.statCard}>
             {isLoadingStats ? (
              <div style={styles.loadingSpinner}></div>
            ) : (
              <h3 style={styles.statValue}>{stats.totalRaised.toLocaleString()}</h3>
            )}
            <p style={styles.statLabel}>Total Raised (WLD)</p>
          </div>
        </div>
        
        {stats.totalCampaigns === 0 && !isLoadingStats && (
          <div style={styles.createButtonContainer}>
            <Link to="/new-campaign" style={styles.createButton}>
              <svg style={styles.createButtonIcon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path>
              </svg>
              Create Your First Campaign
            </Link>
          </div>
        )}

        <div style={styles.contentSection}>
          <h2 style={styles.sectionTitle}>Your Campaigns</h2>
          <CampaignTracker deleteButtonStyle={styles.buttonDanger} />
        </div>

        <div style={styles.quickAccessSection}>
          <h2 style={styles.sectionTitle}>Quick Access</h2>
          <div style={styles.quickLinks}>
            {/* Change #6: Added 'Create Campaign' as the FIRST item */}
            <Link to="/new-campaign" style={styles.quickLink} className="quickLinkHoverable">
              <svg style={styles.quickLinkIcon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path>
              </svg>
              Create Campaign
            </Link>
            <Link to="/landing" style={styles.quickLink} className="quickLinkHoverable">
              <svg style={styles.quickLinkIcon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"></path>
              </svg>
              Browse All Campaigns
            </Link>
            <Link to="/tip-jar" style={styles.quickLink} className="quickLinkHoverable">
              <svg style={styles.quickLinkIcon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"></path>
              </svg>
              Tip Jar
            </Link>
          </div>
        </div>

        {stats.totalCampaigns === 0 && !isLoadingStats && (
          <div style={styles.infoSection}>
            <h2 style={styles.sectionTitle}>Getting Started</h2>
            <p style={styles.infoText}>
              Create and manage campaigns to raise funds for your projects using WLD tokens.
              Start by creating a new campaign and sharing it with your network.
            </p>
          </div>
        )}
      </main>

      <footer style={styles.legalNotice}>
        &copy; {new Date().getFullYear()} Fund. All rights reserved.
      </footer>

      <nav style={styles.tabs}>
        <Link to="/" style={styles.tab}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path></svg>
          <span>Home</span>
        </Link>
        <Link to="/dashboard" style={{...styles.tab, ...styles.tabActive}}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>
          <span>Account</span>
        </Link>
      </nav>
    </div>
  );
}

export default Dashboard;
