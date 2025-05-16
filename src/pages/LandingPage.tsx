// src/pages/LandingPage.tsx (Merged)

// # ############################################################################ #
// # #                          SECTION 1 - IMPORTS                             #
// # ############################################################################ #
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { campaignService, Campaign as CampaignData } from '../services/CampaignService'; // CampaignData is alias for Campaign
import { triggerMiniKitWalletAuth } from '../MiniKitProvider';

// Import Swiper React components and styles
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, A11y } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// # ############################################################################ #
// # #                   SECTION 2 - INTERFACE: CAMPAIGN DISPLAY DATA             #
// # ############################################################################ #
interface CampaignDisplay extends CampaignData {
  daysLeft: number; // From LandingPage
  creator: string; // From LandingPage (formatted ownerId)
  isVerified: boolean; // From LandingPage
  progressPercentage: number; // Standardized as number, will be formatted to string in JSX
  // Note: CampaignsPage had `progressPercentage` as number. LandingPage was formatting it as string.
  // Let's keep it as number in data, format in view.
}

// # ############################################################################ #
// # #                SECTION 3 - COMPONENT: PAGE DEFINITION & INITIALIZATION     #
// # ############################################################################ #
const LandingPage: React.FC = () => {
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

// ############################################################################ #
// # #                         SECTION 4 - COMPONENT: STATE MANAGEMENT            #
// # ############################################################################ #
  const [campaigns, setCampaigns] = useState<CampaignDisplay[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

// # ############################################################################ #
// # #                         SECTION 5 - FILTER FUNCTIONALITY                   #
// # ############################################################################ #
  const filteredCampaigns = useMemo(() => {
    if (!searchQuery) {
      return campaigns;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return campaigns.filter(campaign =>
      campaign.title.toLowerCase().includes(lowercasedQuery) ||
      (campaign.description && campaign.description.toLowerCase().includes(lowercasedQuery))
    );
  }, [campaigns, searchQuery]);

// # ############################################################################ #
// # #                         SECTION 6 - EFFECT: AUTH ERROR HANDLING            #
// # ############################################################################ #
  useEffect(() => {
    if (authError) {
      console.log('[LandingPage] AuthContext error:', authError);
      setPageError(authError);
    }
  }, [authError]);

// # ############################################################################ #
// # #                         SECTION 7 - EFFECT: AUTH STATUS LOGGING            #
// # ############################################################################ #
  useEffect(() => {
    console.log('[LandingPage] Auth state from context changed:', {
      isAuthenticated,
      walletAddress: walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : null,
      authIsLoading
    });
  }, [isAuthenticated, walletAddress, authIsLoading]);

// # ############################################################################ #
// # #                         SECTION 8 - EFFECT: FETCH CAMPAIGNS                #
// # ############################################################################ #
  useEffect(() => {
    const fetchCampaignsData = async () => {
      console.log('[LandingPage] Attempting to fetch campaigns...');
      setLoadingCampaigns(true);
      setPageError(null);

      try {
        if (import.meta.env.MODE === 'test') {
          console.log('[LandingPage] Test mode detected, skipping API call');
          setCampaigns([]);
          return;
        }

        const result = await campaignService.fetchAllCampaigns();
        if (result.success && result.campaigns) {
          const displayCampaigns: CampaignDisplay[] = result.campaigns.map(campaign => ({
            ...campaign,
            daysLeft: calculateDaysLeft(campaign.createdAt), // Helper from LandingPage
            creator: formatAddress(campaign.ownerId), // Helper from LandingPage
            isVerified: true, // Assuming all fetched campaigns are verified for now
            progressPercentage: campaign.goal > 0 ? Math.min(Math.round((campaign.raised / campaign.goal) * 100), 100) : 0, // Calculation from CampaignsPage
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

    fetchCampaignsData();
  }, []);

// # ############################################################################ #
// # #                         SECTION 9 - CALLBACK: CONNECT WALLET              #
// # ############################################################################ #
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
      if (import.meta.env.DEV && (window as any).__triggerWalletAuth) {
        console.log("[LandingPage] handleConnectWallet: Using window.__triggerWalletAuth (debug mode)");
        const success = await (window as any).__triggerWalletAuth();
        if (!success) {
          console.error('[LandingPage] handleConnectWallet: window.__triggerWalletAuth returned false.');
          throw new Error('Wallet authentication via debug trigger failed. Check console.');
        }
      } else {
        console.log("[LandingPage] API URL check:", {
          VITE_AMPLIFY_API: import.meta.env.VITE_AMPLIFY_API,
          VITE_APP_BACKEND_API_URL: import.meta.env.VITE_APP_BACKEND_API_URL
        });
        console.log("[LandingPage] handleConnectWallet: Fetching nonce for MiniKit auth...");
        let serverNonce;
        try {
          serverNonce = await getNonceForMiniKit();
          console.log("[LandingPage] handleConnectWallet: Nonce received:", serverNonce);
        } catch (nonceError) {
          console.error("[LandingPage] Failed to get nonce:", nonceError);
          throw new Error(`Failed to get authentication nonce: ${nonceError instanceof Error ? nonceError.message : 'Unknown error'}`);
        }
        if (!serverNonce) throw new Error("Server didn't return a valid nonce");
        console.log("[LandingPage] handleConnectWallet: Calling triggerMiniKitWalletAuth with fetched nonce...");
        let authPayload;
        try {
          authPayload = await triggerMiniKitWalletAuth(serverNonce);
          console.log("[LandingPage] handleConnectWallet: Auth payload received:", authPayload ? "Valid payload" : "Invalid/empty payload");
        } catch (walletError) {
          console.error("[LandingPage] Wallet auth failed:", walletError);
          throw new Error(`Wallet authentication failed: ${walletError instanceof Error ? walletError.message : 'Unknown error'}`);
        }
        if (!authPayload) throw new Error("Wallet didn't return a valid authentication payload");
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
      let userErrorMessage = "Connection failed";
      if (error instanceof Error) {
        if (error.message.includes("https://")) {
          userErrorMessage = "API connection error. Please try again or contact support.";
        } else {
          userErrorMessage = error.message;
        }
      }
      setPageError(userErrorMessage);
      if (connectionAttempts > 2) {
        setPageError(`${userErrorMessage}. You may need to refresh the page.`);
      }
    } finally {
      setIsConnectingWallet(false);
    }
  }, [isConnectingWallet, authIsLoading, getNonceForMiniKit, loginWithWallet, connectionAttempts]);

// # ############################################################################ #
// # #                         SECTION 10 - CALLBACK: ACCOUNT NAVIGATION          #
// # ############################################################################ #
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
// # #                         SECTION 11 - CALLBACK: DASHBOARD HEADER NAVIGATION #
// # ############################################################################ #
  const goToDashboardHeader = useCallback(() => {
    console.log('[LandingPage] goToDashboardHeader: Navigating to /dashboard.');
    navigate('/dashboard', { replace: true });
  }, [navigate]);

// # ############################################################################ #
// # #                         SECTION 12 - HELPER FUNCTIONS                      #
// # ############################################################################ #
  const calculateDaysLeft = (createdAt: string): number => {
    const created = new Date(createdAt);
    const now = new Date();
    // Assuming campaign duration is 30 days from creation
    const campaignDurationMs = 30 * 24 * 60 * 60 * 1000;
    const endTimeMs = created.getTime() + campaignDurationMs;
    const diffTime = endTimeMs - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const formatAddress = (address: string): string => {
    if (!address) return 'Anonymous';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isActivePath = (path: string): boolean =>
    location.pathname === path ||
    (path === '/' && location.pathname === '/landing') || // Treat /landing as / for active state
    (path === '/campaigns' && (location.pathname === '/campaigns' || location.pathname.startsWith('/campaigns/')));


// # ############################################################################ #
// # #                         SECTION 13 - INLINE STYLES OBJECT                  #
// # ############################################################################ #
  const styles: { [key: string]: React.CSSProperties } = {
    page: {
      textAlign: 'center' as const,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif',
      color: '#202124',
      backgroundColor: '#ffffff', // LandingPage default, CampaignsPage was #f5f7fa
      margin: 0,
      padding: 0,
      overflowX: 'hidden' as const,
      width: '100vw',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column' as const,
      boxSizing: 'border-box' as const,
    },
    container: { // Used for main content sections to constrain width and center
      margin: '0 auto',
      width: '100%',
      padding: '0 0.5rem 6rem 0.5rem', // Bottom padding for fixed tabs
      boxSizing: 'border-box' as const,
      maxWidth: '1200px',
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column' as const,
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
    logo: { display: 'flex', alignItems: 'center', color: '#1a73e8', fontWeight: 700, fontSize: '1.125rem', textDecoration: 'none' },
    logoSpan: { color: '#202124' },
    navActionsContainer: { // Container for multiple buttons/links in header
        display: 'flex',
        alignItems: 'center',
    },
    navItem: { // Style for text links in header like 'Dashboard'
        marginLeft: '1rem', // Applied to subsequent items
        marginRight: '1rem', // Space before a button
        fontSize: '0.875rem',
        color: '#5f6368',
        textDecoration: 'none',
        transition: 'color 0.2s'
    },
    button: { padding: '0.5rem 0.75rem', borderRadius: '0.25rem', fontWeight: 500, cursor: 'pointer', textDecoration: 'none', textAlign: 'center' as const, fontSize: '0.875rem', transition: 'background-color 0.2s, border-color 0.2s', border: '1px solid transparent', minHeight: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 },
    buttonPrimary: { backgroundColor: '#1a73e8', color: 'white', borderColor: '#1a73e8' },
    buttonSecondary: { backgroundColor: '#f1f3f4', color: '#202124', borderColor: '#dadce0' },
    hero: { // LandingPage hero style
      background: '#f5f7fa', // LandingPage hero background
      padding: '1.5rem 1rem 2rem', // Adjusted padding
      textAlign: 'center' as const,
      width: '100%',
      boxSizing: 'border-box' as const,
      marginBottom: '1rem', // Added from CampaignsPage hero
    },
    heroTitle: { fontSize: '2rem', fontWeight: 700, color: '#202124', marginBottom: '0.5rem', padding: 0 }, // CampaignsPage style is a bit larger
    heroSubtitle: { fontSize: '1.125rem', color: '#5f6368', margin: '0 auto 1rem', maxWidth: '800px', padding: 0 }, // CampaignsPage style
    searchContainer: {
      margin: '0 auto 1rem auto',
      width: '100%',
      maxWidth: '500px',
      padding: '0 0.5rem',
      boxSizing: 'border-box' as const,
    },
    searchInput: {
      width: '100%',
      padding: '0.75rem 1rem',
      fontSize: '1rem',
      border: '1px solid #dadce0',
      borderRadius: '2rem',
      boxSizing: 'border-box' as const,
      transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    // Styles for the main campaigns listing section
    campaignsSection: { // This is the main content area below hero
        padding: '1rem 0 2rem', // Reduced top padding as hero has margin-bottom
        flexGrow: 1,
        width: '100%',
        boxSizing: 'border-box' as const,
        // This section will use the page's default background (#ffffff)
    },
    sectionHeader: { textAlign: 'center' as const, marginBottom: '1.5rem' }, // Increased margin
    sectionTitle: { fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.5rem', padding: 0, color: '#202124' }, // Adjusted from CampaignsPage heroTitle
    sectionSubtitle: { color: '#5f6368', fontSize: '1rem', margin: '0 auto 1.5rem', padding: 0, maxWidth: '700px' }, // Adjusted
    
    // Swiper and Campaign Card Styles (largely from CampaignsPage, adapted)
    swiperContainer: {
      width: '100%',
      flexGrow: 1,
      minHeight: 0,
      padding: '0.5rem 0',
      position: 'relative' as const,
    },
    swiperSlide: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'stretch', // Make items stretch to fill slide height
      padding: '0 0.25rem', 
      boxSizing: 'border-box' as const,
    },
    campaignCard: {
      backgroundColor: 'white',
      borderRadius: '12px', // From CampaignsPage
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)', // From CampaignsPage
      overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
      display: 'flex',
      flexDirection: 'column' as const,
      width: '100%',
      height: 'auto', // Let content dictate height
      boxSizing: 'border-box' as const,
    },
    cardImage: { width: '100%', height: '180px', objectFit: 'cover' as const }, // From CampaignsPage
    noImagePlaceholder: { width: '100%', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f3f4', color: '#9aa0a6', fontSize: '0.875rem', boxSizing: 'border-box' as const }, // From CampaignsPage
    cardContent: { padding: '1rem', textAlign: 'left' as const, flexGrow: 1, display: 'flex', flexDirection: 'column' as const, boxSizing: 'border-box' as const }, // From CampaignsPage
    cardTitle: { fontSize: '1.125rem', fontWeight: 600, color: '#202124', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }, // From CampaignsPage
    cardDescription: { fontSize: '0.875rem', color: '#5f6368', marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden', textOverflow: 'ellipsis', minHeight: 'calc(3 * 1.5 * 0.875rem)', lineHeight: 1.5, flexGrow: 1}, // From CampaignsPage
    progressBar: { width: '100%', height: '6px', backgroundColor: '#e9ecef', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.5rem', marginTop: 'auto' }, // marginTop:auto from CampaignsPage
    progressFill: { height: '100%', backgroundColor: '#34a853', borderRadius: '3px',  transition: 'width 0.4s ease-in-out' }, // color from CPage, transition from LPage
    progressStats: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#5f6368', marginBottom: '0.75rem' }, // From CampaignsPage
    cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderTop: '1px solid #f1f3f4', backgroundColor: '#fcfcfc', boxSizing: 'border-box' as const, marginTop: 'auto' }, // From CampaignsPage
    creatorInfo: { fontSize: '0.75rem', color: '#5f6368', display: 'flex', alignItems: 'center' }, // Adapted
    creatorAvatar: { width: '1.25rem', height: '1.25rem', borderRadius: '50%', backgroundColor: '#e5e7eb', marginRight: '0.375rem', display: 'inline-block' }, // From LandingPage card structure
    verifiedBadge: { display: 'inline-flex', alignItems: 'center', backgroundColor: 'rgba(52, 168, 83, 0.1)', color: '#34a853', fontSize: '0.6rem', padding: '0.1rem 0.25rem', borderRadius: '0.125rem', marginLeft: '0.25rem', fontWeight: 500 }, // From LandingPage card structure
    viewButton: { fontSize: '0.8rem', padding: '0.375rem 0.75rem', backgroundColor: '#1a73e8', color: 'white', borderRadius: '4px', textDecoration: 'none', transition: 'background-color 0.2s' }, // From CampaignsPage card footer

    tabs: {
      display: 'flex', justifyContent: 'space-around', backgroundColor: '#fff', borderTop: '1px solid #e0e0e0', position: 'fixed' as const, bottom: 0, left: 0, width: '100%', zIndex: 100, padding: '0.75rem 0', boxShadow: '0 -1px 3px rgba(0,0,0,0.1)', boxSizing: 'border-box' as const,
    },
    tab: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', fontSize: '0.65rem', color: '#5f6368', textDecoration: 'none', padding: '0.1rem 0.5rem', flexGrow: 1, textAlign: 'center' as const, transition: 'color 0.2s' },
    tabActive: { color: '#1a73e8' },
    tabIcon: { width: '1.125rem', height: '1.125rem', marginBottom: '0.125rem' },
    legalNotice: {
      fontSize: '0.7rem', color: '#5f6368', padding: '1rem', marginTop: '1rem', marginBottom: '4.5rem', borderTop: '1px solid #eee', width: '100%', boxSizing: 'border-box' as const, textAlign: 'center' as const, // Added textAlign
    },
    errorMessage: {
      textAlign: 'center' as const, padding: '1rem', backgroundColor: 'rgba(234, 67, 53, 0.1)', border: '1px solid rgba(234, 67, 53, 0.2)', borderRadius: '8px', color: '#c53929', margin: '1rem auto', fontSize: '0.9rem', maxWidth: '1200px', boxSizing: 'border-box' as const, // Mix of CPage and LPage error styles
    },
    emptyStateContainer: { // From CampaignsPage, seems more complete
      display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', alignItems: 'center', padding: '3rem 1rem', textAlign: 'center' as const, color: '#5f6368', flexGrow: 1, minHeight: '300px', boxSizing: 'border-box' as const,
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
    input[type="search"]::-webkit-search-cancel-button {
      -webkit-appearance: none;
      appearance: none;
      height: 1em;
      width: 1em;
      margin-left: .25em;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23777'%3e%3cpath d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/%3e%3c/svg%3e");
      background-size: 1em 1em;
      cursor: pointer;
    }
    .swiper-pagination-bullet {
      background-color: #cccccc !important;
      opacity: 1 !important;
    }
    .swiper-pagination-bullet-active {
      background-color: #1a73e8 !important;
    }
    .swiper-button-next, .swiper-button-prev {
      color: #1a73e8 !important;
      transform: scale(0.7);
    }
    .swiper-slide { 
      overflow: hidden;
    }
  `;

// # ############################################################################ #
// # #         SECTION 13.5 - INNER COMPONENT: CAMPAIGN CARD (from CampaignsPage) #
// # ############################################################################ #
  const CampaignCardComponent: React.FC<{ campaign: CampaignDisplay }> = ({ campaign }) => {
    return (
      <div style={styles.campaignCard}>
        {campaign.image ? (
          <img
            src={campaign.image}
            alt={campaign.title}
            style={styles.cardImage}
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x180/e5e7eb/9aa0a6?text=Img+Error'; }}
          />
        ) : (
          <div style={styles.noImagePlaceholder}>No Image</div>
        )}
        <div style={styles.cardContent}>
          <h3 style={styles.cardTitle}>{campaign.title}</h3>
          <p style={styles.cardDescription}>
            {campaign.description || 'No description provided.'}
          </p>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${campaign.progressPercentage}%` }}></div>
          </div>
          <div style={styles.progressStats}>
            <span>{campaign.raised.toLocaleString()} / {campaign.goal.toLocaleString()} WLD</span>
            <span>{campaign.progressPercentage}%</span>
          </div>
          {/* Days Left could be added here if desired, e.g., in progressStats or separate line */}
          {/* <div style={{fontSize: '0.75rem', color: '#5f6368'}}> {campaign.daysLeft} days left</div> */}
        </div>
        <div style={styles.cardFooter}>
          <div style={styles.creatorInfo}>
            <span style={styles.creatorAvatar}></span> {/* Placeholder for avatar image if available */}
            <span>{campaign.creator}</span>
            {campaign.isVerified && (
              <span style={styles.verifiedBadge}>Verified</span>
            )}
          </div>
          <Link to={`/campaigns/${campaign.id}`} style={styles.viewButton}>
            View Details
          </Link>
        </div>
      </div>
    );
  };


// # ############################################################################ #
// # #                 SECTION 14 - JSX RETURN: PAGE STRUCTURE & CONTENT        #
// # ############################################################################ #
  return (
    <div style={styles.page}>
      <style>{responsiveStyles}</style>

      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
          <div style={styles.navActionsContainer}>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" style={styles.navItem}>Dashboard</Link>
                <Link to="/new-campaign" style={{...styles.button, ...styles.buttonPrimary, marginLeft: '1rem'}}>Create Campaign</Link>
              </>
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
        </div>
      </header>

      <section style={styles.hero}>
        {/* Hero content from original LandingPage */}
        <h1 style={styles.heroTitle}>Support Global Initiatives</h1>
        <p style={styles.heroSubtitle}>Fund projects that make a difference with transparent and secure donations.</p>
        
        {/* Search functionality (already in LandingPage's hero, kept from CampaignsPage logic) */}
        <div style={styles.searchContainer}>
          <input
            type="search"
            placeholder="Search campaigns by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </section>

      {/* This section now serves as the main campaign display area, like CampaignsPage */}
      <main style={styles.campaignsSection}>
        <div style={styles.container}> {/* This container centers content with max-width */}
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Explore Campaigns</h2> {/* Title from CampaignsPage hero */}
            <p style={styles.sectionSubtitle}>Swipe through projects making a difference.</p> {/* Subtitle from CampaignsPage hero */}
          </div>

          {pageError && !loadingCampaigns && ( // Show pageError only if not loading
            <div style={styles.errorMessage}>
              <p>{pageError}</p>
              {connectionAttempts > 2 && !pageError.toLowerCase().includes("api connection error") && ( // Don't show refresh for API error as it might be server-side
                 <button
                   onClick={() => window.location.reload()}
                   style={{...styles.button, ...styles.buttonSecondary, marginTop: '1rem', width: 'auto', padding:'0.5rem 1rem'}}
                 >
                   Try Again or Refresh
                 </button>
              )}
            </div>
          )}
          
          {loadingCampaigns ? (
            <div style={styles.emptyStateContainer}> {/* Use emptyState for loading text too */}
              <div>Loading campaigns...</div>
            </div>
          ) : !pageError && filteredCampaigns.length === 0 ? (
            <div style={styles.emptyStateContainer}>
              <p>{searchQuery ? `No campaigns found for "${searchQuery}".` : "No campaigns available at the moment."}</p>
              {!searchQuery && isAuthenticated && (
                <Link
                  to="/new-campaign"
                  style={{...styles.button, ...styles.buttonPrimary, marginTop: '1rem', width: 'auto', padding:'0.625rem 1.25rem'}}
                >
                  Create First Campaign
                </Link>
              )}
            </div>
          ) : !pageError && filteredCampaigns.length > 0 ? (
            <Swiper
              modules={[Navigation, Pagination, A11y]}
              spaceBetween={16} 
              slidesPerView={1}
              navigation
              pagination={{ clickable: true, dynamicBullets: true }}
              loop={false} // Loop is false, good for a finite list
              style={styles.swiperContainer}
              grabCursor={true}
              key={searchQuery || 'all'} // Re-key swiper if search query changes to help re-render
            >
              {filteredCampaigns.map(campaign => (
                <SwiperSlide key={campaign.id} style={styles.swiperSlide}>
                  <CampaignCardComponent campaign={campaign} />
                </SwiperSlide>
              ))}
            </Swiper>
          ) : null} {/* Fallback for when there's an error but campaigns might still be there (edge case) */}
        </div>
      </main>
      
      <footer style={styles.legalNotice}>
        &copy; {new Date().getFullYear()} WorldFund. All rights reserved.
      </footer>

      <nav style={styles.tabs}>
        <Link to="/" style={{ ...styles.tab, ...(isActivePath('/') ? styles.tabActive : {}) }}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
          <span>Home</span>
        </Link>
        {/* This link now effectively shows this page if routing is set for /campaigns to render LandingPage */}
        <Link to="/campaigns" style={{ ...styles.tab, ...(isActivePath('/campaigns') ? styles.tabActive : {}) }}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
          <span>Explore</span>
        </Link>
        <button
          onClick={handleAccountNavigation}
          disabled={authIsLoading && !isAuthenticated} // Disabled logic from LandingPage
          style={{
            ...styles.tab,
            ...(isActivePath('/dashboard') ? styles.tabActive : {}), // Dashboard active state
            background: 'none', border: 'none', fontFamily: 'inherit', cursor: 'pointer',
            padding: '0.1rem 0.5rem', margin: 0, // Ensure button looks like a tab
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
// # #                         SECTION 15 - DEFAULT EXPORT                      #
// # ############################################################################ #
export default LandingPage;