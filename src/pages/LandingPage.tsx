// src/pages/LandingPage.tsx
// --- IMPORTANT NOTE ---
// This component is now a public landing page.
// It does NOT manage authentication or verification state directly.
// Authentication status (isAuthenticated, loginWithWallet) should be accessed
// via the useAuth hook.
// --- END NOTE ---

import React, { useState, useEffect, CSSProperties } from 'react';
import { useAuth } from '../components/AuthContext';
import { campaignService, Campaign as CampaignData } from '../services/CampaignService';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { triggerMiniKitWalletAuth } from '../MiniKitProvider';

// Extend campaign data for UI
interface CampaignDisplay extends CampaignData {
  daysLeft: number;
  creator: string;
  isVerified: boolean;
}

const LandingPage: React.FC = () => {
  const { isAuthenticated, loginWithWallet } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [campaigns, setCampaigns] = useState<CampaignDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);

  // Load campaigns once
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
        console.error('[LandingPage] fetch campaigns error', e);
        setError('Failed to load campaigns');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Connect wallet and login
  const handleConnectWallet = async () => {
    if (isConnectingWallet) return;
    setIsConnectingWallet(true);
    setError(null);
    try {
      const authResult = window.__triggerWalletAuth
        ? await window.__triggerWalletAuth()
        : await triggerMiniKitWalletAuth();
      console.log('[LandingPage] authResult', authResult);
      await loginWithWallet(authResult);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      console.error('[LandingPage] wallet connect error', e);
      setError('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnectingWallet(false);
    }
  };

  // Account tab click
  const handleAccountClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    } else {
      handleConnectWallet();
    }
  };

  // Helpers
  const calculateDaysLeft = (date: string) => {
    const created = new Date(date);
    const now = Date.now();
    const diff = 30 * 24 * 60 * 60 * 1000 - (now - created.getTime());
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };
  const calculateProgressPercentage = (raised: number, goal: number) =>
    goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) + '%' : '0%';
  const formatAddress = (a: string) => (a ? `${a.slice(0,6)}...${a.slice(-4)}` : 'Anonymous');
  const isActive = (p: string) =>
    location.pathname === p ||
    (p === '/' && location.pathname === '/landing') ||
    (p === '/campaigns' && location.pathname.startsWith('/campaigns/'));
  const placeholder = 'https://placehold.co/200x120/e5e7eb/5f6368?text=No+Image';

  return (
    <div style={styles.page}>
      <style>{responsiveStyles}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/" style={styles.logo}>
            World<span style={styles.logoSpan}>Fund</span>
          </Link>
          {isAuthenticated ? (
            <Link to="/dashboard" style={{ ...styles.button, ...styles.buttonPrimary }}>
              Dashboard
            </Link>
          ) : (
            <button
              style={{ ...styles.button, ...styles.buttonPrimary }}
              onClick={handleConnectWallet}
              disabled={isConnectingWallet}
            >
              {isConnectingWallet ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </header>

      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.container}>
          <h1 style={styles.heroTitle}>Fund Projects That Matter</h1>
          <p style={styles.heroSubtitle}>Support verified creators and initiatives securely with World ID.</p>
          <div style={styles.trustBadge}>
            <svg viewBox="0 0 24 24" style={{ width:'16px', marginRight:'4px' }}>
              <circle cx="12" cy="12" r="10" fill="currentColor" />
            </svg>
            Secured by World ID
          </div>
        </div>
      </section>

      {/* Campaigns */}
      <section style={styles.campaignsSection}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>Featured Campaigns</h2>
          {loading ? (
            <p>Loading campaigns...</p>
          ) : error ? (
            <p style={{ color: 'red' }}>{error}</p>
          ) : (
            <div style={styles.campaignsGrid}>
              {campaigns.map(c => (
                <Link key={c.id} to={`/campaigns/${c.id}`} style={styles.cardLink}>
                  <div style={styles.campaignCard}>
                    <img src={c.image||placeholder} alt={c.title} style={styles.cardImage}/>
                    <div style={styles.cardContent}>
                      <h3 style={styles.cardTitle}>{c.title}</h3>
                      <p style={styles.cardDesc}>{c.description}</p>
                      <div style={styles.progressBar}>
                        <div style={{ width:calculateProgressPercentage(c.raised,c.goal), ...styles.progressFill }}/> 
                      </div>
                      <div style={styles.campaignMeta}>
                        <span>{c.daysLeft} days left</span>
                        <span>{formatAddress(c.ownerId)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>&copy; {new Date().getFullYear()} WorldFund. All rights reserved.</p>
      </footer>

      {/* Bottom nav */}
      <nav style={styles.tabs}>
        <Link to="/" style={{ ...styles.tab, ...(isActive('/')?styles.tabActive:{}) }}>Home</Link>
        <Link to="/campaigns" style={{ ...styles.tab, ...(isActive('/campaigns')?styles.tabActive:{}) }}>Explore</Link>
        <a href="#" onClick={handleAccountClick} style={{ ...styles.tab, ...(isActive('/dashboard')?styles.tabActive:{}) }}>
          {isConnectingWallet? 'Connecting...' : 'Account'}
        </a>
      </nav>
    </div>
  );
};

export default LandingPage;

/* Styles */
const styles: Record<string, CSSProperties> = {
  page: { fontFamily:'-apple-system, BlinkMacSystemFont,Segoe UI,Roboto,sans-serif', margin:0, padding:0, background:'#fff' },
  header:{ background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.1)', position:'sticky', top:0, zIndex:100 },
  headerContent:{ maxWidth:1200, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 1rem' },
  logo:{ fontSize:'1.25rem', fontWeight:700, color:'#1a73e8', textDecoration:'none' },
  button:{ padding:'0.5rem 1rem', border:'none', borderRadius:4, cursor:'pointer' },
  buttonPrimary:{ background:'#1a73e8', color:'#fff' },
  hero:{ background:'#f5f7fa', textAlign:'center', padding:'2rem 1rem' },
  container:{ maxWidth:1200, margin:'0 auto' },
  heroTitle:{ fontSize:'2rem', margin:0 },
  heroSubtitle:{ fontSize:'1rem', color:'#555', margin:'0.5rem 0' },
  trustBadge:{ display:'inline-flex', alignItems:'center', fontSize:'0.875rem', gap:4 },
  campaignsSection:{ padding:'2rem 1rem' },
  sectionTitle:{ textAlign:'center', fontSize:'1.5rem', margin:0 },
  campaignsGrid:{ display:'grid', gap:16, gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))' },
  cardLink:{ textDecoration:'none' },
  campaignCard:{ background:'#fff', borderRadius:8, overflow:'hidden', boxShadow:'0 2px 4px rgba(0,0,0,0.1)' },
  cardImage:{ width:'100%', height:140, objectFit:'cover' },
  cardContent:{ padding:16, display:'flex', flexDirection:'column', gap:8 },
  cardTitle:{ fontSize:'1rem', margin:0 },
  cardDesc:{ fontSize:'0.875rem', color:'#666', flexGrow:1 },
  progressBar:{ height:8, background:'#e0e0e0', borderRadius:4, overflow:'hidden' },
  progressFill:{ height:'100%', background:'#34a853' },
  campaignMeta:{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'#555' },
  footer:{ textAlign:'center', padding:'1rem', fontSize:'0.75rem', color:'#777' },
  tabs:{ position:'fixed', bottom:0, left:0, right:0, background:'#fff', display:'flex', justifyContent:'space-around', padding:'0.5rem 0', boxShadow:'0 -1px 3px rgba(0,0,0,0.1)' },
  tab:{ textDecoration:'none', fontSize:'0.875rem', color:'#555' },
  tabActive:{ color:'#1a73e8', fontWeight:600 }
};

/* Responsive */
const responsiveStyles = `
  *,*::before,*::after{box-sizing:border-box;}
  html,body,#root{height:100%;margin:0;padding:0;}
`;
