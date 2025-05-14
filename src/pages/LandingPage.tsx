// src/pages/LandingPage.tsx

// # ############################################################################ #
// # #                             SECTION 1 - IMPORTS                            #
// # ############################################################################ #
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/AuthContext';
import { campaignService, Campaign as CampaignData } from '../services/CampaignService';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { triggerMiniKitWalletAuth } from '../MiniKitProvider';
import { MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';

// # ############################################################################ #
// # #               SECTION 2 - INTERFACE: CAMPAIGN DISPLAY DATA               #
// # ############################################################################ #
// Campaign Interface
interface CampaignDisplay extends CampaignData {
  daysLeft: number;
  creator: string;
  isVerified: boolean;
}

// # ############################################################################ #
// # #      SECTION 3 - COMPONENT: PAGE DEFINITION & INITIALIZATION       #
// # ############################################################################ #
const LandingPage: React.FC = () => {
  // Log environment variables for debugging
  useEffect(() => {
    console.log('[LandingPage] Environment variables:', {
      VITE_AMPLIFY_API: import.meta.env.VITE_AMPLIFY_API,
      VITE_APP_BACKEND_API_URL: import.meta.env.VITE_APP_BACKEND_API_URL,
      MODE: import.meta.env.MODE,
      DEV: import.meta.env.DEV
    });
  }, []);

  const { isAuthenticated, walletAddress, loginWithWallet, getNonceForMiniKit, isLoading: authIsLoading, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

// # ############################################################################ #
// # #                  SECTION 4 - COMPONENT: STATE MANAGEMENT                 #
// # ############################################################################ #
  const [campaigns, setCampaigns] = useState<CampaignDisplay[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0); // Track connection attempts

// # ############################################################################ #
// # #                 SECTION 5 - EFFECT: AUTH ERROR HANDLING                  #
// # ############################################################################ #
  // Effect to display auth errors from context
  useEffect(() => {
    if (authError) {
      console.log('[LandingPage] AuthContext error:', authError);
      setPageError(authError);
    }
  }, [authError]);

// # ############################################################################ #
// # #                 SECTION 6 - EFFECT: AUTH STATUS LOGGING                  #
// # ############################################################################ #
  // Log authentication status changes
  useEffect(() => {
    console.log('[LandingPage] Auth state from context changed:', {
      isAuthenticated,
      walletAddress: walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : null,
      authIsLoading
    });
  }, [isAuthenticated, walletAddress, authIsLoading]);

// # ############################################################################ #
// # #                    SECTION 7 - EFFECT: FETCH CAMPAIGNS                   #
// # ############################################################################ #
  // Fetch campaigns on component mount
  useEffect(() => {
    const fetchCampaigns = async () => {
      console.log('[LandingPage] Attempting to fetch campaigns...');
      setLoadingCampaigns(true);
      setPageError(null);

      try {
        // Only attempt to fetch if we're not in a test environment
        if (import.meta.env.MODE === 'test') {
          console.log('[LandingPage] Test mode detected, skipping API call');
          setCampaigns([]);
          return;
        }

        const result = await campaignService.fetchAllCampaigns();
        if (result.success && result.campaigns) {
          const displayCampaigns: CampaignDisplay[] = result.campaigns.map(campaign => ({
            ...campaign,
            daysLeft: calculateDaysLeft(campaign.createdAt),
            creator: formatAddress(campaign.ownerId),
            isVerified: true,
          }));
          setCampaigns(displayCampaigns);
          console.log('[LandingPage] Campaigns fetched successfully.');
        } else {
          const campaignError = result.error || 'Failed to load campaigns';
          console.error('[LandingPage] Error fetching campaigns (from service):', campaignError);
          setPageError(campaignError);
        }
      } catch (err) {
        console.error('[LandingPage] Exception while fetching campaigns:', err);
        setPageError(err instanceof Error ? err.message : 'An unknown error occurred while loading campaigns.');
      } finally {
        setLoadingCampaigns(false);
      }
    };

    fetchCampaigns();
  }, []);

// # ############################################################################ #
// # #                    SECTION 8 - CALLBACK: CONNECT WALLET                    #
// # ############################################################################ #
  // Enhanced wallet connection with retries and improved error handling
  const handleConnectWallet = useCallback(async () => {
    if (isConnectingWallet || authIsLoading) {
      console.log('[LandingPage] handleConnectWallet: Already connecting or auth is loading. Aborting.');
      return;
    }

    console.log('[LandingPage] handleConnectWallet: Starting wallet connection flow...');
    setIsConnectingWallet(true);
    setPageError(null);
    setConnectionAttempts(prev => prev + 1);

    try {
      // Debug path (conditionally compiled or based on dev environment)
      if (import.meta.env.DEV && (window as any).__triggerWalletAuth) {
        console.log("[LandingPage] handleConnectWallet: Using window.__triggerWalletAuth (debug mode)");
        const success = await (window as any).__triggerWalletAuth();
        if (!success) {
          console.error('[LandingPage] handleConnectWallet: window.__triggerWalletAuth returned false.');
          throw new Error('Wallet authentication via debug trigger failed. Check console.');
        }
      } else {
        // Log API base URL before making any requests
        console.log("[LandingPage] API URL check:", {
          VITE_AMPLIFY_API: import.meta.env.VITE_AMPLIFY_API,
          VITE_APP_BACKEND_API_URL: import.meta.env.VITE_APP_BACKEND_API_URL
        });

        // Standard production flow
        console.log("[LandingPage] handleConnectWallet: Fetching nonce for MiniKit auth...");
        let serverNonce;
        try {
          serverNonce = await getNonceForMiniKit();
          console.log("[LandingPage] handleConnectWallet: Nonce received:", serverNonce);
        } catch (nonceError) {
          console.error("[LandingPage] Failed to get nonce:", nonceError);
          throw new Error(`Failed to get authentication nonce: ${nonceError instanceof Error ? nonceError.message : 'Unknown error'}`);
        }

        if (!serverNonce) {
          throw new Error("Server didn't return a valid nonce");
        }

        console.log("[LandingPage] handleConnectWallet: Calling triggerMiniKitWalletAuth with fetched nonce...");
        let authPayload;
        try {
          authPayload = await triggerMiniKitWalletAuth(serverNonce);
          console.log("[LandingPage] handleConnectWallet: Auth payload received:",
            authPayload ? "Valid payload" : "Invalid/empty payload");
        } catch (walletError) {
          console.error("[LandingPage] Wallet auth failed:", walletError);
          throw new Error(`Wallet authentication failed: ${walletError instanceof Error ? walletError.message : 'Unknown error'}`);
        }

        if (!authPayload) {
          throw new Error("Wallet didn't return a valid authentication payload");
        }

        console.log("[LandingPage] handleConnectWallet: MiniKit auth success, calling loginWithWallet from AuthContext.");
        try {
          await loginWithWallet(authPayload);
        } catch (loginError) {
          console.error("[LandingPage] Login with wallet failed:", loginError);
          throw new Error(`Login failed: ${loginError instanceof Error ? loginError.message : 'Unknown error'}`);
        }
      }

      console.log("[LandingPage] handleConnectWallet: Wallet connection and login process successfully completed.");
    } catch (error) {
      console.error("[LandingPage] handleConnectWallet: Error during wallet connection/login process:", error);

      // Format a more user-friendly error message
      let userErrorMessage = "Connection failed";
      if (error instanceof Error) {
        if (error.message.includes("https://")) {
          // Special case for the "Unexpected token 'h', "https://ma"..." error
          userErrorMessage = "API connection error. Please try again or contact support.";
        } else {
          userErrorMessage = error.message;
        }
      }

      setPageError(userErrorMessage);

      // Suggest refresh if multiple attempts have failed
      if (connectionAttempts > 2) {
        setPageError(`${userErrorMessage}. You may need to refresh the page.`);
      }
    } finally {
      setIsConnectingWallet(false);
    }
  }, [isConnectingWallet, authIsLoading, getNonceForMiniKit, loginWithWallet, connectionAttempts]);

// # ############################################################################ #
// # #                 SECTION 9 - CALLBACK: ACCOUNT NAVIGATION                 #
// # ############################################################################ #
  // Navigation handler for the Account tab
  const handleAccountNavigation = useCallback(async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    console.log('[LandingPage] handleAccountNavigation: Clicked. Auth state:', { isAuthenticated, authIsLoading });

    if (authIsLoading) {
      console.log('[LandingPage] handleAccountNavigation: Auth state is loading. Please wait.');
      return;
    }

    if (isAuthenticated) {
      console.log('[LandingPage] handleAccountNavigation: User is authenticated. Navigating to /dashboard.');
      navigate('/dashboard', { replace: true });
    } else {
      console.log('[LandingPage] handleAccountNavigation: User is NOT authenticated. Initiating connect wallet flow.');
      await handleConnectWallet();
    }
  }, [isAuthenticated, authIsLoading, navigate, handleConnectWallet]);

// # ############################################################################ #
// # #        SECTION 10 - CALLBACK: DASHBOARD HEADER NAVIGATION          #
// # ############################################################################ #
  // Direct navigation for the Dashboard button
  const goToDashboardHeader = useCallback(() => {
    console.log('[LandingPage] goToDashboardHeader: Navigating to /dashboard.');
    navigate('/dashboard', { replace: true });
  }, [navigate]);

// # ############################################################################ #
// # #                       SECTION 11 - HELPER FUNCTIONS                      #
// # ############################################################################ #
  // --- Helper Functions ---
  const calculateProgressPercentage = (raised: number, goal: number): string => {
    if (goal <= 0) return '0%';
    return Math.min(Math.round((raised / goal) * 100), 100) + '%';
  };

  const calculateDaysLeft = (createdAt: string): number => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = 30 * 24 * 60 * 60 * 1000 - (now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const formatAddress = (address: string): string => {
    if (!address) return 'Anonymous';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isActivePath = (path: string): boolean =>
    location.pathname === path ||
    (path === '/' && location.pathname === '/landing') ||
    (path === '/campaigns' && location.pathname.startsWith('/campaigns/'));

// # ############################################################################ #
// # #                    SECTION 12 - INLINE STYLES OBJECT                     #
// # ############################################################################ #
  // --- Styles object (keeping the existing implementation) ---
  const styles: { [key: string]: React.CSSProperties } = { /* ... Your full styles object ... */
    page: { textAlign: 'center' as const, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif', color: '#202124', backgroundColor: '#ffffff', margin: 0, padding: 0, overflowX: 'hidden' as const, width: '100%', maxWidth: '100vw', minHeight: '100vh', display: 'flex', flexDirection: 'column' as const },
    container: { margin: '0 auto', width: '100%', padding: '0 0.5rem', boxSizing: 'border-box' as const, maxWidth: '1200px', flexGrow: 1 },
    header: { background: 'white', padding: '0.5rem 0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'sticky' as const, top: 0, zIndex: 100 },
    headerContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto', padding: '0 0.5rem' },
    logo: { display: 'flex', alignItems: 'center', color: '#1a73e8', fontWeight: 700, fontSize: '1.125rem', textDecoration: 'none' },
    logoSpan: { color: '#202124' },
    button: { padding: '0.5rem 0.75rem', borderRadius: '0.25rem', fontWeight: 500, cursor: 'pointer', textDecoration: 'none', textAlign: 'center' as const, fontSize: '0.75rem', transition: 'background-color 0.2s, border-color 0.2s', border: '1px solid transparent', minHeight: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 },
    buttonPrimary: { backgroundColor: '#1a73e8', color: 'white', borderColor: '#1a73e8' },
    hero: { background: '#f5f7fa', padding: '1.5rem 0 2rem', textAlign: 'center' as const },
    heroTitle: { fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#202124', padding: 0 },
    heroSubtitle: { fontSize: '0.875rem', color: '#5f6368', margin: '0 auto 1rem', maxWidth: '500px', padding: 0 },
    trustBadge: { display: 'inline-flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.8)', padding: '0.3rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', color: '#5f6368', marginTop: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    campaignsSection: { padding: '1.5rem 0 2rem' },
    sectionHeader: { textAlign: 'center' as const, marginBottom: '1rem' },
    sectionTitle: { fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem', padding: 0 },
    sectionSubtitle: { color: '#5f6368', fontSize: '0.8rem', margin: '0 auto 1rem', padding: 0 },
    campaignsGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', justifyContent: 'center', width: '100%' },
    campaignCard: { width: '100%', background: 'white', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden', textAlign: 'left' as const, display: 'flex', flexDirection: 'column' as const, transition: 'transform 0.2s ease, box-shadow 0.2s ease' },
    cardImage: { height: '120px', width: '100%', objectFit: 'cover' as const },
    cardContent: { padding: '0.75rem', flexGrow: 1, display: 'flex', flexDirection: 'column' as const },
    cardTitle: { fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem', color: '#202124', padding: 0, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' },
    cardDesc: { fontSize: '0.75rem', color: '#5f6368', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, lineHeight: '1.4', minHeight: 'calc(2 * 1.4 * 0.75rem)', flexGrow: 1, padding: 0 },
    progressBar: { width: '100%', height: '0.375rem', backgroundColor: '#e9ecef', borderRadius: '9999px', overflow: 'hidden', marginBottom: '0.3rem' },
    progressFill: { height: '100%', backgroundColor: '#28a745', borderRadius: '9999px', transition: 'width 0.4s ease-in-out' },
    campaignMeta: { display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#5f6368', marginBottom: '0.25rem' },
    campaignCreator: { display: 'flex', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem', fontSize: '0.7rem' },
    creatorAvatar: { width: '1.25rem', height: '1.25rem', borderRadius: '50%', backgroundColor: '#e5e7eb', marginRight: '0.375rem', display: 'inline-block' },
    verifiedBadge: { display: 'inline-flex', alignItems: 'center', backgroundColor: 'rgba(52, 168, 83, 0.1)', color: '#34a853', fontSize: '0.6rem', padding: '0.1rem 0.25rem', borderRadius: '0.125rem', marginLeft: '0.25rem', fontWeight: 500 },
    tabs: { display: 'flex', justifyContent: 'space-around', backgroundColor: '#fff', borderTop: '1px solid #e0e0e0', position: 'fixed' as const, bottom: 0, left: 0, width: '100%', zIndex: 100, padding: '0.75rem 0', boxShadow: '0 -1px 3px rgba(0,0,0,0.1)' },
    tab: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', fontSize: '0.65rem', color: '#5f6368', textDecoration: 'none', padding: '0.1rem 0.5rem', flexGrow: 1, textAlign: 'center' as const, transition: 'color 0.2s' },
    tabActive: { color: '#1a73e8' },
    tabIcon: { width: '1.125rem', height: '1.125rem', marginBottom: '0.125rem' },
    legalNotice: { fontSize: '0.7rem', color: '#5f6368', padding: '1rem', marginTop: '1rem', marginBottom: '4.5rem', borderTop: '1px solid #eee' },
    errorMessage: { textAlign: 'center', padding: '1rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '0.5rem', margin: '1rem 0', fontSize: '0.9rem' }
  };

  const responsiveStyles = ` html, body { font-family: ${styles.page?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif'}; } `;

// # ############################################################################ #
// # #          SECTION 13 - JSX RETURN: PAGE STRUCTURE & CONTENT           #
// # ############################################################################ #
  return (
    <div style={styles.page}>
      <style>{responsiveStyles}</style>

      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
          {isAuthenticated ? (
            <button style={{ ...styles.button, ...styles.buttonPrimary }} onClick={goToDashboardHeader}>
              Dashboard
            </button>
          ) : (
            <button
              onClick={handleConnectWallet}
              disabled={isConnectingWallet || authIsLoading}
              style={{ ...styles.button, ...styles.buttonPrimary }}
            >
              {(isConnectingWallet || authIsLoading) ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </header>

      <section style={styles.hero}>
        <h1 style={styles.heroTitle}>Support Global Initiatives</h1>
        <p style={styles.heroSubtitle}>Fund projects that make a difference with transparent and secure donations</p>
      </section>

      <section style={styles.campaignsSection}>
        <div style={styles.container}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Featured Campaigns</h2>
            <p style={styles.sectionSubtitle}>Discover projects making a difference</p>
          </div>

          {/* Error display with more helpful messages */}
          {pageError && (
            <div style={styles.errorMessage}>
              <p>{pageError}</p>
              {connectionAttempts > 2 && (
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.8rem',
                    backgroundColor: '#e57373',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}
                >
                  Refresh Page
                </button>
              )}
            </div>
          )}

          {loadingCampaigns && <div style={{ textAlign: 'center', padding: '2rem' }}>Loading campaigns...</div>}

          {!loadingCampaigns && !pageError && (
            <div style={styles.campaignsGrid}>
              {campaigns.length > 0 ?
                campaigns.map(campaign => (
                  <div key={campaign.id} style={styles.campaignCard}>
                    {campaign.image ? (
                      <img src={campaign.image} alt={campaign.title} style={styles.cardImage} />
                    ) : (
                      <div style={{...styles.cardImage, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7fa'}}>
                        <span style={{color: '#9aa0a6'}}>No Image</span>
                      </div>
                    )}
                    <div style={styles.cardContent}>
                      <h3 style={styles.cardTitle}>{campaign.title}</h3>
                      <p style={styles.cardDesc}>{campaign.description || 'No description provided.'}</p>
                      <div style={styles.progressBar}>
                        <div style={{...styles.progressFill, width: calculateProgressPercentage(campaign.raised, campaign.goal)}}></div>
                      </div>
                      <div style={styles.campaignMeta}>
                        <span>{campaign.raised} / {campaign.goal} WLD</span>
                        <span>{calculateProgressPercentage(campaign.raised, campaign.goal)}</span>
                      </div>
                      <div style={styles.campaignCreator}>
                        <span style={styles.creatorAvatar}></span>
                        <span>{campaign.creator}</span>
                        {campaign.isVerified && (
                          <span style={styles.verifiedBadge}>Verified</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
                :
                <p style={{textAlign: 'center', padding: '2rem', color: '#5f6368'}}>No campaigns found. Check back soon!</p>
              }
            </div>
          )}
        </div>
      </section>

      <footer style={styles.legalNotice}>
        &copy; {new Date().getFullYear()} WorldFund. All rights reserved.
      </footer>

      {/* Bottom Navigation Tabs */}
      <nav style={styles.tabs}>
        <Link to="/" style={{ ...styles.tab, ...(isActivePath('/') ? styles.tabActive : {}) }}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
          <span>Home</span>
        </Link>
        <Link to="/campaigns" style={{ ...styles.tab, ...(isActivePath('/campaigns') ? styles.tabActive : {}) }}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
          <span>Explore</span>
        </Link>
        {/* Account tab with improved error handling */}
        <button
          onClick={handleAccountNavigation}
          disabled={authIsLoading && !isAuthenticated}
          style={{
            ...styles.tab,
            ...(isActivePath('/dashboard') ? styles.tabActive : {}),
            background: 'none', border: 'none', fontFamily: 'inherit', cursor: 'pointer',
            padding: '0.1rem 0.5rem', margin: 0,
          }}
        >
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
          <span>Account</span>
        </button>
      </nav>
    </div>
  );
};

// # ############################################################################ #
// # #                         SECTION 14 - DEFAULT EXPORT                        #
// # ############################################################################ #
export default LandingPage;