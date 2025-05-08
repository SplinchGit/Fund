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
import { triggerMiniKitWalletAuth } from '../MiniKitProvider';

// --- Campaign Interface ---
interface CampaignDisplay extends CampaignData {
  daysLeft: number;
  creator: string;
  isVerified: boolean;
}

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [campaigns, setCampaigns] = useState<CampaignDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const hasNavigated = useRef(false);

  // Redirect to dashboard upon auth
  useEffect(() => {
    if (isAuthenticated && !hasNavigated.current) {
      hasNavigated.current = true;
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Reset navigation flag on route change
  useEffect(() => {
    hasNavigated.current = false;
  }, [location.pathname]);

  // Fetch campaigns
  useEffect(() => {
    (async () => {
      try {
        const result = await campaignService.fetchAllCampaigns();
        if (result.success && result.campaigns) {
          const display = result.campaigns.map(c => ({
            ...c,
            daysLeft: calculateDaysLeft(c.createdAt),
            creator: formatAddress(c.ownerId),
            isVerified: true
          }));
          setCampaigns(display);
        } else {
          setError(result.error || 'Failed to load campaigns');
        }
      } catch (e) {
        console.error(e);
        setError('Failed to load campaigns');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleConnectWallet = async () => {
    if (isConnectingWallet) return;
    setIsConnectingWallet(true);
    setError(null);
    try {
      if ((window as any).__triggerWalletAuth) {
        await (window as any).__triggerWalletAuth();
      } else {
        await triggerMiniKitWalletAuth();
      }
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
      setError('Connection failed');
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const handleAccountTabClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      handleConnectWallet();
    }
  };

  const isActivePath = (path: string) =>
    location.pathname === path ||
    (path === '/' && location.pathname === '/landing') ||
    (path === '/campaigns' && location.pathname.startsWith('/campaigns/'));

  // Helpers
  const calculateProgressPercentage = (raised: number, goal: number) =>
    goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) + '%' : '0%';
  const calculateDaysLeft = (createdAt: string) => {
    const diff = 30 * 24 * 60 * 60 * 1000 - (Date.now() - new Date(createdAt).getTime());
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };
  const formatAddress = (addr: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'Anonymous';

  // Styles
  const styles: Record<string, React.CSSProperties> = {
    tabs: {
      display: 'flex',
      justifyContent: 'space-around',
      position: 'fixed',
      bottom: 0,
      left: 0,
      width: '100%',
      background: '#fff',
      borderTop: '1px solid #e0e0e0',
      padding: '0.75rem 0'
    },
    tab: {
      flex: 1,
      textAlign: 'center',
      textDecoration: 'none',
      color: '#5f6368',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    },
    tabActive: { color: '#1a73e8' },
    tabIcon: { width: '1.125rem', height: '1.125rem', marginBottom: '0.125rem' }
  };

  return (
    <div>
      {/* ...other page sections omitted for brevity... */}

      {/* Bottom Navigation Tabs */}
      <nav style={styles.tabs}>
        <Link
          to="/"
          style={{
            ...styles.tab,
            ...(isActivePath('/') ? styles.tabActive : {})
          }}
        >
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor">
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
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <span>Explore</span>
        </Link>

        <a
          href="#"
          onClick={handleAccountTabClick}
          style={{
            ...styles.tab,
            ...(isActivePath('/dashboard') ? styles.tabActive : {})
          }}
        >
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <span>Account</span>
        </a>
      </nav>
    </div>
  );
};

export default LandingPage;
