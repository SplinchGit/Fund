// src/pages/LandingPage.tsx
// --- IMPORTANT NOTE ---
// This component is now a public landing page. 
// It does NOT manage authentication or verification state directly.
// Authentication status (isAuthenticated, walletAddress) should be accessed 
// via the useAuth hook if needed (e.g., for conditional UI like tabs).
// World ID verification logic has been removed and should be placed
// within a protected component if required after wallet authentication.
// --- END NOTE ---
import React, { useState, useEffect, useRef } from 'react'; 
import { useAuth } from '../components/AuthContext'; 
import { campaignService, Campaign as CampaignData } from '../services/CampaignService';
import { Link, useNavigate, useLocation } from 'react-router-dom';
// Import the wallet auth trigger
import { triggerMiniKitWalletAuth } from '../MiniKitProvider';

// --- Campaign Interface ---
// Using the Campaign type from CampaignService but extending it for UI needs
interface CampaignDisplay extends CampaignData {
  daysLeft: number;
  creator: string;
  isVerified: boolean;
}

// --- LandingPage Component ---
export const LandingPage: React.FC = () => { 
  const { isAuthenticated, walletAddress } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [campaigns, setCampaigns] = useState<CampaignDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  
  // Flag to track if navigation happened
  const hasNavigated = useRef(false);
  
  // Check authentication status and navigate if needed
  useEffect(() => {
    // This effect needs to trigger when isAuthenticated changes
    console.log('[LandingPage] Authentication status changed:', isAuthenticated);
    
    if (isAuthenticated && !hasNavigated.current) {
      console.log('[LandingPage] User is authenticated, redirecting to dashboard');
      hasNavigated.current = true; // Prevent multiple navigations
      
      // Navigate to dashboard with a slight delay to ensure context is fully updated
      setTimeout(() => {
        navigate('/dashboard');
      }, 100);
    }
  }, [isAuthenticated, navigate]);
  
  // Reset navigation flag when component unmounts or path changes
  useEffect(() => {
    return () => {
      hasNavigated.current = false;
    };
  }, [location.pathname]);
  
  // Fetch campaigns on component mount
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const result = await campaignService.fetchAllCampaigns();
        if (result.success && result.campaigns) {
          // Transform campaign data for display
          const displayCampaigns: CampaignDisplay[] = result.campaigns.map(campaign => ({
            ...campaign,
            daysLeft: calculateDaysLeft(campaign.createdAt),
            creator: formatAddress(campaign.ownerId),
            isVerified: true // All creators are verified in our system
          }));
          setCampaigns(displayCampaigns);
        } else {
          setError(result.error || 'Failed to load campaigns');
        }
      } catch (err) {
        console.error('Error fetching campaigns:', err);
        setError('Failed to load campaigns');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  // Handle wallet connection
  const handleConnectWallet = async () => {
    if (isConnectingWallet) return; // Prevent multiple clicks

    console.log('[LandingPage] Starting wallet connection flow...');
    setIsConnectingWallet(true);
    setError(null); // Clear any existing errors
    
    try {
      // Try window.__triggerWalletAuth first if available (for debug)
      if (window.__triggerWalletAuth) {
        console.log("[LandingPage] Using window.__triggerWalletAuth");
        await window.__triggerWalletAuth();
      } 
      // Otherwise use the exported function
      else {
        console.log("[LandingPage] Using triggerMiniKitWalletAuth");
        const authResult = await triggerMiniKitWalletAuth();
        console.log("[LandingPage] Auth result:", authResult);
        
        // Directly check auth status after a delay
        setTimeout(() => {
          if (isAuthenticated) {
            console.log("[LandingPage] User authenticated after wallet connection, navigating");
            navigate('/dashboard');
          }
        }, 500);
      }
    } catch (error) {
      console.error("[LandingPage] Wallet connection error:", error);
      setError("Failed to connect wallet. Please try again.");
    } finally {
      // Even if there's an error, we must reset the connecting state
      setIsConnectingWallet(false);
    }
  };
  
  // Navigation handler for Account tab
  const handleAccountTabClick = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('[LandingPage] Account tab clicked');
    
    if (isAuthenticated) {
      console.log('[LandingPage] User already authenticated, navigating to dashboard');
      navigate('/dashboard');
    } else {
      console.log('[LandingPage] User not authenticated, starting wallet connection');
      handleConnectWallet();
    }
  };
  
  // --- Helper Functions ---
  const calculateProgressPercentage = (raised: number, goal: number): string => {
    if (goal <= 0) return '0%'; 
    return Math.min(Math.round((raised / goal) * 100), 100) + '%';
  };

  const calculateDaysLeft = (createdAt: string): number => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = 30 * 24 * 60 * 60 * 1000 - (now.getTime() - created.getTime()); // 30 days campaign duration
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const formatAddress = (address: string): string => {
    if (!address) return 'Anonymous';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  // Check if current path should have active tab styling
  const isActivePath = (path: string): boolean => {
    return location.pathname === path || 
           (path === '/' && location.pathname === '/landing') ||
           (path === '/campaigns' && location.pathname.startsWith('/campaigns/'));
  };
  
  // --- Styling --- (Updated for viewport layout)
  const styles: { [key: string]: React.CSSProperties } = {
    page: {
      textAlign: 'center' as const, 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif',
      color: '#202124', 
      backgroundColor: '#ffffff', 
      margin: 0, 
      padding: 0, 
      overflowX: 'hidden' as const,
      width: '100%', 
      maxWidth: '100vw',
      minHeight: '100vh', // Ensure minimum height is full viewport
      display: 'flex',    
      flexDirection: 'column' as const 
    },
    container: { 
      margin: '0 auto', 
      width: '100%', 
      padding: '0 0.5rem', 
      boxSizing: 'border-box' as const, 
      maxWidth: '1200px',
      flexGrow: 1 // Make container fill available space
    },
    header: {
      background: 'white', padding: '0.5rem 0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      position: 'sticky' as const, top: 0, zIndex: 100
    },
    headerContent: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      maxWidth: '1200px', margin: '0 auto', padding: '0 0.5rem' 
    },
    logo: { display: 'flex', alignItems: 'center', color: '#1a73e8', fontWeight: 700, fontSize: '1.125rem', textDecoration: 'none' },
    logoSpan: { color: '#202124' },
    button: {
      padding: '0.5rem 0.75rem', borderRadius: '0.25rem', fontWeight: 500, cursor: 'pointer',
      textDecoration: 'none', textAlign: 'center' as const, fontSize: '0.75rem', 
      transition: 'background-color 0.2s, border-color 0.2s', border: '1px solid transparent', 
      minHeight: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1' 
    },
    buttonOutline: { borderColor: '#1a73e8', color: '#1a73e8', background: 'transparent' },
    buttonPrimary: { backgroundColor: '#1a73e8', color: 'white', borderColor: '#1a73e8' },
    hero: { background: '#f5f7fa', padding: '1.5rem 0 2rem', textAlign: 'center' as const },
    heroTitle: { fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#202124', padding: 0 },
    heroSubtitle: { fontSize: '0.875rem', color: '#5f6368', margin: '0 auto 1rem', maxWidth: '500px', padding: 0 },
    trustBadge: {
      display: 'inline-flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.8)', 
      padding: '0.3rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', color: '#5f6368',
      marginTop: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' 
    },
    campaignsSection: { padding: '1.5rem 0 2rem' },
    sectionHeader: { textAlign: 'center' as const, marginBottom: '1rem' },
    sectionTitle: { fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem', padding: 0 },
    sectionSubtitle: { color: '#5f6368', fontSize: '0.8rem', margin: '0 auto 1rem', padding: 0 },
    campaignsGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', justifyContent: 'center', width: '100%' },
    campaignCard: { 
      width: '100%', background: 'white', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
      overflow: 'hidden', textAlign: 'left' as const, display: 'flex', flexDirection: 'column' as const, 
      transition: 'transform 0.2s ease, box-shadow 0.2s ease', 
    },
    cardImage: { height: '120px', width: '100%', objectFit: 'cover' as const },
    cardContent: { padding: '0.75rem', flexGrow: 1, display: 'flex', flexDirection: 'column' as const },
    cardTitle: { fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem', color: '#202124', padding: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    cardDesc: { 
      fontSize: '0.75rem', color: '#5f6368', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis',
      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, lineHeight: '1.4', 
      minHeight: 'calc(2 * 1.4 * 0.75rem)', flexGrow: 1, padding: 0 
    },
    progressBar: { width: '100%', height: '0.375rem', backgroundColor: '#e9ecef', borderRadius: '9999px', overflow: 'hidden', marginBottom: '0.3rem' },
    progressFill: { height: '100%', backgroundColor: '#28a745', borderRadius: '9999px', transition: 'width 0.4s ease-in-out' },
    campaignMeta: { display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#5f6368', marginBottom: '0.25rem' },
    campaignCreator: { display: 'flex', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem', fontSize: '0.7rem' },
    creatorAvatar: { width: '1.25rem', height: '1.25rem', borderRadius: '50%', backgroundColor: '#e5e7eb', marginRight: '0.375rem', display: 'inline-block' },
    verifiedBadge: { 
      display: 'inline-flex', alignItems: 'center', backgroundColor: 'rgba(52, 168, 83, 0.1)', color: '#34a853',
      fontSize: '0.6rem', padding: '0.1rem 0.25rem', borderRadius: '0.125rem', marginLeft: '0.25rem', fontWeight: 500 
    },
    tabs: {
      display: 'flex', justifyContent: 'space-around', backgroundColor: '#fff', borderTop: '1px solid #e0e0e0', 
      position: 'fixed' as const, bottom: 0, left: 0, width: '100%', zIndex: 100, 
      padding: '0.75rem 0', // Increased padding for better touch targets
      boxShadow: '0 -1px 3px rgba(0,0,0,0.1)' // Add shadow for better visibility
    },
    tab: { 
      display: 'flex', flexDirection: 'column' as const, alignItems: 'center', fontSize: '0.65rem', 
      color: '#5f6368', textDecoration: 'none', padding: '0.1rem 0.5rem', flexGrow: 1, 
      textAlign: 'center' as const, transition: 'color 0.2s' 
    },
    tabActive: { color: '#1a73e8' },
    tabIcon: { width: '1.125rem', height: '1.125rem', marginBottom: '0.125rem' },
    legalNotice: { fontSize: '0.7rem', color: '#5f6368', padding: '1rem', marginTop: '1rem', marginBottom: '4.5rem', borderTop: '1px solid #eee' }
  };
  
  // Updated to include proper viewport height handling
  const responsiveStyles = `
    /* Basic CSS reset */
    html, body { margin: 0; padding: 0; overflow-x: hidden; width: 100%; max-width: 100vw; height: 100%; box-sizing: border-box; font-family: ${styles.page?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif'}; }
    body { min-height: 100vh; /* Use viewport height */ background-color: var(--bg-default); }
    #root { min-height: 100vh; display: flex; flex-direction: column; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    
    /* Responsive Grid */
    @media (min-width: 640px) { .campaigns-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 1024px) { .campaigns-grid { grid-template-columns: repeat(3, 1fr); } .page-container, .header-content { padding: 0 1rem; } }
    
    /* Focus styles */
    button:focus-visible, a:focus-visible { outline: 2px solid #1a73e8; outline-offset: 2px; border-radius: 2px; }
    button:focus, a:focus { outline: none; }
    
    /* Hover effects */
    .button-outline:hover { background-color: rgba(26, 115, 232, 0.05); border-color: #1a73e8; }
    .button-primary:hover { background-color: #1765cc; border-color: #1765cc; }
    .campaign-card:hover { transform: translateY(-3px); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
    
    /* Mobile tab button styles */
    .bottom-tab-button {
      border: none;
      background: transparent;
      font: inherit;
      cursor: pointer;
      color: inherit;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }
    
    /* Debug - Add a highlight to see when elements are clicked */
    .debug-click {
      position: relative;
    }
    .debug-click::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(255, 255, 0, 0.2);
      pointer-events: none;
      animation: highlight-fade 0.5s forwards;
    }
    @keyframes highlight-fade {
      0% { opacity: 1; }
      100% { opacity: 0; }
    }
  `;
  
  // --- JSX Rendering ---
  return (
    <div style={styles.page ?? {}}> 
      <style>{responsiveStyles}</style>
      
      {/* --- Header --- */}
      <header style={styles.header}>
        <div style={styles.headerContent} className="header-content"> 
          <Link to="/" style={styles.logo}>
            World<span style={styles.logoSpan}>Fund</span>
          </Link>
          {isAuthenticated ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link 
                to="/dashboard" 
                style={{ ...styles.button, ...styles.buttonPrimary }}
                onClick={(e) => {
                  console.log('[LandingPage] Dashboard button clicked');
                  // Explicit navigation for more reliability
                  e.preventDefault();
                  navigate('/dashboard');
                }}
              >
                Dashboard
              </Link>
            </div>
          ) : (
            <button 
              onClick={handleConnectWallet}
              disabled={isConnectingWallet}
              style={{ ...styles.button, ...styles.buttonPrimary }}
            >
              {isConnectingWallet ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </header>

      {/* --- Hero Section --- */}
      <section style={styles.hero}>
        <div style={styles.container} className="page-container"> 
          <h1 style={styles.heroTitle}>Fund Projects That Matter</h1>
          <p style={styles.heroSubtitle}>Support verified creators and initiatives securely with World ID.</p>
          <div style={styles.trustBadge}>
            <svg style={{ width: '16px', height: '16px', marginRight: '0.25rem', color: '#1a73e8' }} viewBox="0 0 24 24" fill="currentColor">
               <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM8 12a4 4 0 118 0 4 4 0 01-8 0z" />
            </svg>
            Secured by World ID
          </div>
        </div>
      </section>

      {/* --- Campaigns Section --- */}
      <section style={styles.campaignsSection}>
        <div style={styles.container} className="page-container">
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Featured Campaigns</h2>
            <p style={styles.sectionSubtitle}>Discover projects making a difference</p>
          </div>
          
          {/* Loading State */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p>Loading campaigns...</p>
            </div>
          )}
          
          {/* Error State */}
          {error && (
            <div style={{ 
              textAlign: 'center', 
              padding: '1rem', 
              backgroundColor: '#ffebee', 
              color: '#c62828',
              borderRadius: '0.5rem',
              margin: '1rem 0'
            }}>
              {error}
            </div>
          )}
          
          {/* Campaigns Grid */}
          {!loading && !error && (
            <div className="campaigns-grid" style={styles.campaignsGrid}>
              {campaigns.length > 0 ? (
                campaigns.map((campaign) => (
                  <Link 
                    key={campaign.id} 
                    to={`/campaigns/${campaign.id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div style={styles.campaignCard} className="campaign-card"> 
                      <img 
                        src={campaign.image || `https://placehold.co/200x120/e5e7eb/5f6368?text=No+Image`} 
                        alt={campaign.title} 
                        style={styles.cardImage} 
                        onError={(e) => (e.currentTarget.src = `https://placehold.co/200x120/e5e7eb/5f6368?text=Image+Error`)} 
                      />
                      <div style={styles.cardContent}>
                        <h3 style={styles.cardTitle}>{campaign.title}</h3>
                        <p style={styles.cardDesc}>{campaign.description || 'No description available'}</p>
                        <div style={styles.progressBar}>
                          <div style={{ ...styles.progressFill, width: calculateProgressPercentage(campaign.raised, campaign.goal) }}></div>
                        </div>
                        <div style={styles.campaignMeta}>
                          <span>{`${campaign.raised.toLocaleString()} / ${campaign.goal.toLocaleString()} WLD`}</span>
                          <span>{campaign.daysLeft > 0 ? `${campaign.daysLeft} days left` : (campaign.raised >= campaign.goal ? 'Goal Reached!' : 'Ended')}</span>
                        </div>
                        <div style={styles.campaignCreator}>
                          <div style={styles.creatorAvatar}></div> 
                          <span>{campaign.creator}</span>
                          {campaign.isVerified && (
                            <span style={styles.verifiedBadge}> 
                              <svg style={{ width: '10px', height: '10px', marginRight: '2px' }} viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path>
                              </svg>
                              Verified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p style={{ color: '#5f6368', gridColumn: '1 / -1', textAlign: 'center' }}>
                  No campaigns available right now. {isAuthenticated ? (
                    <Link to="/new-campaign" style={{ color: '#1a73e8', textDecoration: 'none' }}>
                      Create the first one!
                    </Link>
                  ) : 'Sign in to create one!'}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* --- Legal Footer --- */}
      <footer style={styles.legalNotice}>
        <div>All donations are processed securely. Campaign success is not guaranteed.</div>
        <div>&copy; {new Date().getFullYear()} WorldFund. All rights reserved.</div>
      </footer>

      {/* --- Bottom Navigation Tabs --- */}
      <nav style={styles.tabs}>
        <Link 
          to="/" 
          style={{ 
            ...styles.tab, 
            ...(isActivePath('/') ? styles.tabActive : {})
          }}
        > 
          <svg 
            style={{
              ...styles.tabIcon,
              color: isActivePath('/') ? styles.tabActive?.color : 'inherit'
            }} 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span>Home</span>
        </Link>
        
        <Link 
          to="/campaigns" 
          style={{ 
            ...styles.tab, 
            ...(isActivePath('/campaigns') ? styles.tabActive : {})
          }}
        >
          <svg 
            style={{
              ...styles.tabIcon,
              color: isActivePath('/campaigns') ? styles.tabActive?.color : 'inherit'
            }} 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <span>Explore</span>
        </Link>
        
        {/* Fixed Account tab with improved handling */}
        {isAuthenticated ? (
          <a 
            href="#"
            onClick={handleAccountTabClick}
            style={{ 
              ...styles.tab, 
              ...(location.pathname === '/dashboard' ? styles.tabActive : {}),
              color: location.pathname === '/dashboard' ? styles.tabActive?.color : undefined
            }}
            className="debug-click" // For debugging - adds highlight when clicked
          >
            <svg 
              style={{
                ...styles.tabIcon,
                color: location.pathname === '/dashboard' ? styles.tabActive?.color : 'inherit'
              }}
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span>Account</span>
          </a>
        ) : (
          <a
            href="#"
            onClick={handleAccountTabClick}
            className="bottom-tab-button debug-click" // For debugging - adds highlight when clicked
            style={{
              ...styles.tab,
              cursor: 'pointer',
              color: isConnectingWallet ? styles.tabActive?.color : undefined
            }}
          >
            <svg 
              style={{
                ...styles.tabIcon,
                color: isConnectingWallet ? styles.tabActive?.color : undefined
              }}
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span>{isConnectingWallet ? 'Connecting...' : 'Account'}</span>
          </a>
        )}
      </nav>
    </div>
  );
};

export default LandingPage;