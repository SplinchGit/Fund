// src/pages/LandingPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { campaignService, Campaign as CampaignData } from '../services/CampaignService';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { triggerMiniKitWalletAuth } from '../MiniKitProvider';

// --- Campaign Interface ---
interface CampaignDisplay extends CampaignData {
  daysLeft: number;
  creator: string;
  isVerified: boolean;
}

const LandingPage: React.FC = () => {
  const { isAuthenticated, walletAddress, loginWithWallet, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [campaigns, setCampaigns] = useState<CampaignDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);

  // Enhanced authentication status logging
  useEffect(() => {
    console.log('[LandingPage] Auth state changed:', {
      isAuthenticated,
      walletAddress,
      isAuthLoading,
      currentPath: location.pathname
    });
  }, [isAuthenticated, walletAddress, isAuthLoading, location]);

  // Enhanced campaign fetching with better error logging
  useEffect(() => {
    const fetchCampaigns = async () => {
      console.log('[LandingPage] Fetching campaigns...');
      setLoading(true);
      setError(null);
      
      try {
        console.log('[LandingPage] Calling campaignService.fetchAllCampaigns');
        const result = await campaignService.fetchAllCampaigns();
        console.log('[LandingPage] Campaign fetch result:', {
          success: result.success,
          campaignCount: result.campaigns?.length,
          error: result.error
        });
        
        if (result.success && result.campaigns) {
          const displayCampaigns: CampaignDisplay[] = result.campaigns.map(campaign => ({
            ...campaign,
            daysLeft: calculateDaysLeft(campaign.createdAt),
            creator: formatAddress(campaign.ownerId),
            isVerified: true
          }));
          setCampaigns(displayCampaigns);
          console.log('[LandingPage] Campaigns loaded successfully:', displayCampaigns.length);
        } else {
          const errorMessage = result.error || 'Failed to load campaigns';
          console.error('[LandingPage] Campaign fetch failed:', errorMessage);
          setError(errorMessage);
        }
      } catch (err) {
        console.error('[LandingPage] Error fetching campaigns:', err);
        console.error('[LandingPage] Error details:', {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        });
        setError('Failed to load campaigns. Please check your network connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  // Enhanced wallet connection with comprehensive logging
  const handleConnectWallet = async () => {
    if (isConnectingWallet) {
      console.log('[LandingPage] Wallet connection already in progress');
      return;
    }

    console.log('[LandingPage] Starting wallet connection flow...');
    setIsConnectingWallet(true);
    setError(null);

    try {
      // Debug path using window.__triggerWalletAuth
      if ((window as any).__triggerWalletAuth) {
        console.log("[LandingPage] Using window.__triggerWalletAuth (debug mode)");
        const success = await (window as any).__triggerWalletAuth();
        console.log("[LandingPage] Debug auth result:", success);
        
        if (!success) {
          throw new Error('Wallet authentication via debug trigger failed');
        }
      }
      // Standard flow using triggerMiniKitWalletAuth
      else {
        console.log("[LandingPage] Using standard triggerMiniKitWalletAuth flow");
        
        // Step 1: Get auth payload from MiniKit
        console.log("[LandingPage] Calling triggerMiniKitWalletAuth...");
        const authPayload = await triggerMiniKitWalletAuth();
        console.log("[LandingPage] MiniKit auth payload received:", {
          status: authPayload?.status,
          errorCode: authPayload?.error_code,
          hasAddress: !!authPayload?.address,
          hasSignature: !!authPayload?.signature
        });

        // Step 2: Validate payload
        if (authPayload && authPayload.status === 'success') {
          console.log("[LandingPage] MiniKit auth successful, calling loginWithWallet");
          
          // Step 3: Pass to AuthContext for verification
          await loginWithWallet(authPayload);
          console.log("[LandingPage] loginWithWallet completed successfully");
        } else {
          const errorMessage = authPayload?.error_code || 'Wallet authentication failed or was cancelled';
          console.error("[LandingPage] MiniKit auth failed:", errorMessage);
          throw new Error(errorMessage);
        }
      }
      
      console.log("[LandingPage] Wallet connection flow completed successfully");
    } catch (error) {
      console.error("[LandingPage] Error during wallet connection:", error);
      console.error("[LandingPage] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error
      });
      
      // Set user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('Internal server error')) {
          setError('Server error occurred. Please try again in a moment.');
        } else if (error.message.includes('Network Error')) {
          setError('Network error. Please check your connection.');
        } else {
          setError(error.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsConnectingWallet(false);
    }
  };

  // Enhanced Account tab click handler
  const handleAccountTabClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('[LandingPage] Account tab clicked:', {
      isAuthenticated,
      isAuthLoading,
      currentPath: location.pathname
    });
    
    if (isAuthLoading) {
      console.log('[LandingPage] Auth still loading, waiting...');
      return;
    }
    
    if (isAuthenticated) {
      console.log('[LandingPage] Already authenticated, navigating to dashboard');
      navigate('/dashboard', { replace: true });
    } else {
      console.log('[LandingPage] Not authenticated, starting wallet connection');
      await handleConnectWallet();
    }
  };

  // --- Helper Functions ---
  const calculateProgressPercentage = (raised: number, goal: number): string => {
    if (goal <= 0) return '0%';
    return Math.min(Math.round((raised / goal) * 100), 100) + '%';
  };

  const calculateDaysLeft = (createdAt: string): number => {
    try {
      const created = new Date(createdAt);
      const now = new Date();
      const diffTime = 30 * 24 * 60 * 60 * 1000 - (now.getTime() - created.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } catch (error) {
      console.error('[LandingPage] Error calculating days left:', error);
      return 0;
    }
  };

  const formatAddress = (address: string): string => {
    if (!address) return 'Anonymous';
    try {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    } catch (error) {
      console.error('[LandingPage] Error formatting address:', error);
      return 'Anonymous';
    }
  };

  const isActivePath = (path: string): boolean => {
    try {
      return (
        location.pathname === path ||
        (path === '/' && location.pathname === '/landing') ||
        (path === '/campaigns' && location.pathname.startsWith('/campaigns/'))
      );
    } catch (error) {
      console.error('[LandingPage] Error checking active path:', error);
      return false;
    }
  };

  // [Keep all your existing styles...]
  const styles = {
    // ... your existing styles
  };

  // Enhanced error display with more details in development mode
  const renderError = () => {
    if (!error) return null;
    
    const isDev = import.meta.env.DEV;
    
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '1rem', 
        backgroundColor: '#ffebee', 
        color: '#c62828', 
        borderRadius: '0.5rem', 
        margin: '1rem 0' 
      }}>
        <div>{error}</div>
        {isDev && (
          <details style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
            <summary>Debug Info</summary>
            <pre style={{ textAlign: 'left', overflow: 'auto' }}>
              Auth State: {JSON.stringify({ isAuthenticated, walletAddress, isAuthLoading }, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  };

  return (
    <div style={styles.page}>
      {/* Header with enhanced status indicators */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/" style={styles.logo}>
            World<span style={styles.logoSpan}>Fund</span>
          </Link>
          {isAuthLoading ? (
            <div style={{ fontSize: '0.75rem', color: '#5f6368' }}>Loading...</div>
          ) : isAuthenticated ? (
            <button
              style={{ ...styles.button, ...styles.buttonPrimary }}
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </button>
          ) : (
            <button
              onClick={handleConnectWallet}
              disabled={isConnectingWallet}
              style={{ 
                ...styles.button, 
                ...styles.buttonPrimary,
                opacity: isConnectingWallet ? 0.7 : 1 
              }}
            >
              {isConnectingWallet ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </header>

      {/* Rest of your components with the enhanced error display */}
      {/* ... */}
      
      {/* Enhanced campaigns section with loading states */}
      <section style={styles.campaignsSection}>
        <div style={styles.container}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Featured Campaigns</h2>
            <p style={styles.sectionSubtitle}>Discover projects making a difference</p>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              Loading campaigns...
            </div>
          )}
          
          {renderError()}

          <div className="campaigns-grid" style={styles.campaignsGrid}>
            {!loading && !error && (campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <Link key={campaign.id} to={`/campaigns/${campaign.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  {/* Your campaign card component */}
                </Link>
              ))
            ) : (
              <p style={{ color: '#5f6368', gridColumn: '1 / -1', textAlign: 'center' }}>
                No campaigns available right now. {isAuthenticated ? (
                  <Link to="/new-campaign" style={{ color: '#1a73e8', textDecoration: 'none' }}>Create the first one!</Link>
                ) : 'Sign in to create one!'}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Rest of your components... */}
    </div>
  );
};

export default LandingPage;