// src/pages/LandingPage.tsx

// --- IMPORTANT NOTE ---
// This component is now a public landing page. 
// It does NOT manage authentication or verification state directly.
// Authentication status (isAuthenticated, walletAddress) should be accessed 
// via the useAuth hook if needed (e.g., for conditional UI like tabs).
// World ID verification logic has been removed and should be placed
// within a protected component if required after wallet authentication.
// --- END NOTE ---

import React from 'react'; // Removed useState
// Removed Dialog import as modal is removed
// Removed WorldIDAuth import
// Removed IVerifiedUser import

// Import useAuth hook to check authentication status for conditional UI (like tabs)
import { useAuth } from '../components/AuthContext'; 

// Removed LandingPageProps interface

// --- Campaign Interface ---
// Defines the structure for campaign data (Keep this if campaigns are displayed)
interface Campaign {
  id: string;
  title: string;
  description: string;
  image: string;
  raised: number;
  goal: number;
  daysLeft: number;
  creator: string;
  isVerified: boolean; // Indicates if the campaign creator is verified (fetched from backend)
}

// --- LandingPage Component ---
// No longer accepts props related to verification
export const LandingPage: React.FC = () => { 
  // Removed isAuthModalOpen state
  
  // Get authentication status from context for conditional UI elements
  const { isAuthenticated } = useAuth(); 

  // Removed event handlers: 
  // handleVerifyButtonClick, handleVerificationSuccess, handleVerificationError, handleLogout

  // --- Helper Functions --- (Keep if needed for campaign display)
  const calculateProgressPercentage = (raised: number, goal: number): string => {
    if (goal <= 0) return '0%'; 
    return Math.min(Math.round((raised / goal) * 100), 100) + '%';
  };

  // --- Sample Data --- (Keep or replace with actual data fetching)
  const campaigns: Campaign[] = [
    { 
      id: '1', title: 'Clean Water Initiative', description: 'Bringing clean drinking water to remote villages.', 
      image: 'https://placehold.co/200x150/3498db/ffffff?text=Water+Project', raised: 7500, goal: 10000, 
      daysLeft: 15, creator: 'AquaLife Org', isVerified: true 
    },
    { 
      id: '2', title: 'Tech Education for Kids', description: 'Providing coding classes and laptops for underprivileged children.', 
      image: 'https://placehold.co/200x150/2ecc71/ffffff?text=Edu+Tech', raised: 3200, goal: 5000, 
      daysLeft: 22, creator: 'CodeFuture', isVerified: true 
    },
    // Add more sample campaigns if needed
  ];

  // --- Styling --- (Keep styles as they are, unless removing sections)
  const styles: { [key: string]: React.CSSProperties } = {
    // Core layout styles
    page: {
      textAlign: 'center' as const, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif',
      color: '#202124', backgroundColor: '#ffffff', margin: 0, padding: 0, overflowX: 'hidden' as const,
      width: '100%', maxWidth: '100vw'
    },
    container: { margin: '0 auto', width: '100%', padding: '0 0.5rem', boxSizing: 'border-box' as const, maxWidth: '1200px' },
    // Header styles - Consider moving header to a separate Layout component
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
    // Removed authButtons style block - Header buttons logic removed from this component
    // authButtons: { display: 'flex', gap: '0.5rem', alignItems: 'center' }, 

    // Button base styles (kept in case other buttons use them)
    button: {
      padding: '0.5rem 0.75rem', borderRadius: '0.25rem', fontWeight: 500, cursor: 'pointer',
      textDecoration: 'none', textAlign: 'center' as const, fontSize: '0.75rem', 
      transition: 'background-color 0.2s, border-color 0.2s', border: '1px solid transparent', 
      minHeight: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1' 
    },
    buttonOutline: { borderColor: '#1a73e8', color: '#1a73e8', background: 'transparent' },
    buttonPrimary: { backgroundColor: '#1a73e8', color: 'white', borderColor: '#1a73e8' },
    
    // Hero section styles
    hero: { background: '#f5f7fa', padding: '1.5rem 0 2rem', textAlign: 'center' as const },
    heroTitle: { fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#202124', padding: 0 },
    heroSubtitle: { fontSize: '0.875rem', color: '#5f6368', margin: '0 auto 1rem', maxWidth: '500px', padding: 0 },
    trustBadge: {
      display: 'inline-flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.8)', 
      padding: '0.3rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', color: '#5f6368',
      marginTop: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' 
    },
    // Removed userVerifiedBadge style - Logic moved out
    // userVerifiedBadge: { ... },

    // Campaigns section styles
    campaignsSection: { padding: '1.5rem 0 2rem' },
    sectionHeader: { textAlign: 'center' as const, marginBottom: '1rem' },
    sectionTitle: { fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem', padding: 0 },
    sectionSubtitle: { color: '#5f6368', fontSize: '0.8rem', margin: '0 auto 1rem', padding: 0 },
    campaignsGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', justifyContent: 'center', width: '100%' },

    // Campaign card styles
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

    // Bottom navigation tabs styles
    tabs: {
      display: 'flex', justifyContent: 'space-around', backgroundColor: '#fff', borderTop: '1px solid #e0e0e0', 
      position: 'fixed' as const, bottom: 0, left: 0, width: '100%', zIndex: 100, padding: '0.3rem 0' 
    },
    tab: { 
      display: 'flex', flexDirection: 'column' as const, alignItems: 'center', fontSize: '0.65rem', 
      color: '#5f6368', textDecoration: 'none', padding: '0.1rem 0.5rem', flexGrow: 1, 
      textAlign: 'center' as const, transition: 'color 0.2s' 
    },
    tabActive: { color: '#1a73e8' },
    tabIcon: { width: '1.125rem', height: '1.125rem', marginBottom: '0.125rem' },

    // Footer/Legal notice styles
    legalNotice: { fontSize: '0.7rem', color: '#5f6368', padding: '1rem', marginTop: '1rem', marginBottom: '4.5rem', borderTop: '1px solid #eee' }
  };

  // --- Global styles and mobile overrides ---
  const responsiveStyles = `
    /* Basic CSS reset */
    html, body { margin: 0; padding: 0; overflow-x: hidden; width: 100%; max-width: 100vw; box-sizing: border-box; font-family: ${styles.page?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif'}; }
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
  `;

  // --- JSX Rendering ---
  return (
    <div style={styles.page ?? {}}> 
      <style>{responsiveStyles}</style>

      {/* --- Header --- */}
      {/* NOTE: Consider extracting Header into its own component */}
      {/* This header currently has no dynamic auth buttons */}
      <header style={styles.header}>
        <div style={styles.headerContent} className="header-content"> 
          <a href="#" style={styles.logo}>
            World<span style={styles.logoSpan}>Fund</span>
          </a>
          {/* Auth buttons section removed - should be handled by a separate Header component using useAuth() */}
        </div>
      </header>

      {/* --- Hero Section --- (No changes needed) */}
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

      {/* --- Campaigns Section --- (No changes needed) */}
      <section style={styles.campaignsSection}>
        <div style={styles.container} className="page-container">
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Featured Campaigns</h2>
            <p style={styles.sectionSubtitle}>Discover projects making a difference</p>
          </div>
          <div className="campaigns-grid" style={styles.campaignsGrid}>
            {campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <div key={campaign.id} style={styles.campaignCard} className="campaign-card"> 
                  <img src={campaign.image} alt={campaign.title} style={styles.cardImage} onError={(e) => (e.currentTarget.src = `https://placehold.co/200x120/e5e7eb/5f6368?text=Image+Error`)} />
                  <div style={styles.cardContent}>
                    <h3 style={styles.cardTitle}>{campaign.title}</h3>
                    <p style={styles.cardDesc}>{campaign.description}</p>
                    <div style={styles.progressBar}>
                      <div style={{ ...styles.progressFill, width: calculateProgressPercentage(campaign.raised, campaign.goal) }}></div>
                    </div>
                    <div style={styles.campaignMeta}>
                      <span>{`$${campaign.raised.toLocaleString()} / $${campaign.goal.toLocaleString()}`}</span>
                       <span>{campaign.daysLeft > 0 ? `${campaign.daysLeft} days left` : (campaign.raised >= campaign.goal ? 'Goal Reached!' : 'Ended')}</span>
                    </div>
                    <div style={styles.campaignCreator}>
                      <div style={styles.creatorAvatar}></div> 
                      <span>{campaign.creator}</span>
                      {campaign.isVerified && (
                        <span style={styles.verifiedBadge}> 
                           <svg style={{ width: '10px', height: '10px', marginRight: '2px' }} viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg>
                           Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: '#5f6368', gridColumn: '1 / -1' }}>No campaigns available right now.</p> 
            )}
          </div>
        </div>
      </section>

      {/* --- Legal Footer --- (No changes needed) */}
      <footer style={styles.legalNotice}>
        <div>All donations are processed securely. Campaign success is not guaranteed.</div>
        <div>&copy; {new Date().getFullYear()} WorldFund. All rights reserved.</div>
      </footer>

      {/* --- Bottom Navigation Tabs --- */}
      <nav style={styles.tabs}>
        {/* Home Tab */}
        <a href="#" style={{ ...styles.tab, ...styles.tabActive }}> 
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
          <span>Home</span>
        </a>
        {/* Search Tab */}
        <a href="#" style={styles.tab}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
          <span>Search</span>
        </a>
        {/* Account/Verified Tab - Updated to use isAuthenticated from context */}
        <a 
          href="#" 
          // Apply active styles conditionally based on context state
          style={ isAuthenticated ? { ...styles.tab, ...styles.tabActive } : styles.tab } 
        >
          <svg 
            style={{
              ...styles.tabIcon,
              // Conditionally set icon color based on context state
              color: isAuthenticated ? styles.tabActive?.color : styles.tab?.color 
            }}
            viewBox="0 0 24 24" fill="currentColor"
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
           {/* Text changes based on context state */}
          <span>{isAuthenticated ? 'Account' : 'Account'}</span> 
           {/* Or maybe: <span>{isAuthenticated ? 'My Account' : 'Account'}</span> */}
        </a>
      </nav>

      {/* --- World ID Authentication Modal REMOVED --- */}
      {/* The Dialog component and related logic/state are gone */}

    </div>
  );
};

export default LandingPage;
