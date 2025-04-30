// src/pages/LandingPage.tsx
import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
// Assuming WorldIDAuth component exists and calls onSuccess with user data
import WorldIDAuth from '../components/WorldIDAuth'; 
// Import the type definition from the AuthService (adjust path if necessary)
import { IVerifiedUser } from '../services/AuthService'; 

// --- Define Props Interface ---
// This interface specifies the props that LandingPage expects to receive from its parent (App.tsx)
interface LandingPageProps {
  initialVerification: IVerifiedUser | null; // The current verification status/data or null
  onVerificationChange: React.Dispatch<React.SetStateAction<IVerifiedUser | null>>; // Function to update the parent's state
}

// --- Campaign Interface ---
// Defines the structure for campaign data
interface Campaign {
  id: string;
  title: string;
  description: string;
  image: string;
  raised: number;
  goal: number;
  daysLeft: number;
  creator: string;
  isVerified: boolean; // Indicates if the campaign creator is verified
}

// --- LandingPage Component ---
// Updated to accept props defined in LandingPageProps
export const LandingPage: React.FC<LandingPageProps> = ({ 
  initialVerification, 
  onVerificationChange 
}) => {
  // State for controlling the visibility of the authentication modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // --- Event Handlers ---

  // Opens the World ID verification modal
  const handleVerifyButtonClick = () => {
    setIsAuthModalOpen(true);
  };

  // Handles successful verification from the WorldIDAuth component
  // Assumes WorldIDAuth calls onSuccess with the IVerifiedUser object
  const handleVerificationSuccess = (verificationData: IVerifiedUser) => {
    onVerificationChange(verificationData); // Update parent state
    setIsAuthModalOpen(false); // Close the modal
    console.log('World ID Verification Successful:', verificationData);
  };

  // Handles World ID verification errors
  const handleVerificationError = (error: any) => {
    console.error('WorldID verification error:', error);
    // Optionally close modal or show error message to user
    setIsAuthModalOpen(false); 
  };

  // Handles user logout/clearing verification
  const handleLogout = () => {
    onVerificationChange(null); // Update parent state to indicate no verification
    console.log('User logged out / verification cleared.');
  };

  // --- Helper Functions ---

  // Calculates the campaign progress percentage
  const calculateProgressPercentage = (raised: number, goal: number): string => {
    if (goal <= 0) return '0%'; // Avoid division by zero
    return Math.min(Math.round((raised / goal) * 100), 100) + '%';
  };

  // --- Sample Data ---
  const campaigns: Campaign[] = [
    { 
      id: '1', 
      title: 'Clean Water Initiative', 
      description: 'Bringing clean drinking water to remote villages.', 
      image: 'https://placehold.co/200x150/3498db/ffffff?text=Water+Project', 
      raised: 7500, 
      goal: 10000, 
      daysLeft: 15, 
      creator: 'AquaLife Org', 
      isVerified: true 
    },
    { 
      id: '2', 
      title: 'Tech Education for Kids', 
      description: 'Providing coding classes and laptops for underprivileged children.', 
      image: 'https://placehold.co/200x150/2ecc71/ffffff?text=Edu+Tech', 
      raised: 3200, 
      goal: 5000, 
      daysLeft: 22, 
      creator: 'CodeFuture', 
      isVerified: true 
    },
    { 
      id: '3', 
      title: 'Animal Shelter Expansion', 
      description: 'Building a new wing for rescued animals.', 
      image: 'https://placehold.co/200x150/e74c3c/ffffff?text=Animal+Shelter', 
      raised: 1800, 
      goal: 8000, 
      daysLeft: 40, 
      creator: 'Paws Rescue', 
      isVerified: false // Example of unverified creator
    },
     { 
      id: '4', 
      title: 'Community Garden Project', 
      description: 'Creating a green space for local residents to grow food.', 
      image: 'https://placehold.co/200x150/f1c40f/ffffff?text=Garden+Project', 
      raised: 4500, 
      goal: 4500, 
      daysLeft: 0, // Example of completed campaign
      creator: 'Green Thumbs', 
      isVerified: true 
    },
  ];

  // --- Styling (using inline styles) ---
  // Removed &:hover properties as they are invalid in inline styles
  // Hover effects are handled by CSS classes in responsiveStyles
  const styles: { [key: string]: React.CSSProperties } = {
    // Core layout styles
    page: {
      textAlign: 'center' as const,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif',
      color: '#202124',
      backgroundColor: '#ffffff',
      margin: 0,
      padding: 0,
      overflowX: 'hidden' as const,
      width: '100%',
      maxWidth: '100vw'
    },
    container: {
      margin: '0 auto',
      width: '100%',
      padding: '0 0.5rem', 
      boxSizing: 'border-box' as const,
      maxWidth: '1200px' 
    },

    // Header styles
    header: {
      background: 'white',
      padding: '0.5rem 0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      position: 'sticky' as const,
      top: 0,
      zIndex: 100
    },
    headerContent: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      maxWidth: '1200px', 
      margin: '0 auto',
      padding: '0 0.5rem' 
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      color: '#1a73e8',
      fontWeight: 700,
      fontSize: '1.125rem', 
      textDecoration: 'none'
    },
    logoSpan: {
      color: '#202124'
    },
    authButtons: {
      display: 'flex',
      gap: '0.5rem', 
      alignItems: 'center' 
    },

    // Button base and variant styles
    button: {
      padding: '0.5rem 0.75rem',
      borderRadius: '0.25rem',
      fontWeight: 500,
      cursor: 'pointer',
      textDecoration: 'none',
      textAlign: 'center' as const,
      fontSize: '0.75rem', 
      transition: 'background-color 0.2s, border-color 0.2s', // Added transition for classes
      border: '1px solid transparent', // Base border
      minHeight: '36px', 
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: '1' 
    },
    buttonOutline: { // Styles for the outline button (hover handled by class)
      borderColor: '#1a73e8',
      color: '#1a73e8',
      background: 'transparent',
    },
    buttonPrimary: { // Styles for the primary button (hover handled by class)
      backgroundColor: '#1a73e8',
      color: 'white',
      borderColor: '#1a73e8', // Ensure border color matches background
    },
    
    // Hero section styles
    hero: {
      background: '#f5f7fa', 
      padding: '1.5rem 0 2rem', 
      textAlign: 'center' as const
    },
    heroTitle: {
      fontSize: '1.5rem', 
      fontWeight: 600, 
      marginBottom: '0.5rem',
      color: '#202124',
      padding: 0
    },
    heroSubtitle: {
      fontSize: '0.875rem', 
      color: '#5f6368',
      margin: '0 auto 1rem', 
      maxWidth: '500px', 
      padding: 0
    },
    trustBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.8)', 
      padding: '0.3rem 0.6rem', 
      borderRadius: '1rem',
      fontSize: '0.75rem', 
      color: '#5f6368',
      marginTop: '0.75rem', 
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)' 
    },

    // User verified badge (in header)
    userVerifiedBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: 'rgba(52, 168, 83, 0.1)', 
      color: '#34a853', 
      fontSize: '0.7rem', 
      padding: '0.2rem 0.4rem', 
      borderRadius: '0.25rem', 
      fontWeight: 500,
      marginRight: '0.5rem' 
    },

    // Campaigns section styles
    campaignsSection: {
      padding: '1.5rem 0 2rem' 
    },
    sectionHeader: {
      textAlign: 'center' as const,
      marginBottom: '1rem' 
    },
    sectionTitle: {
      fontSize: '1.25rem', 
      fontWeight: 600,
      marginBottom: '0.25rem',
      padding: 0
    },
    sectionSubtitle: {
      color: '#5f6368',
      fontSize: '0.8rem', 
      margin: '0 auto 1rem', 
      padding: 0
    },
    campaignsGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr', // Default to 1 column
      gap: '1rem', 
      justifyContent: 'center',
      width: '100%'
    },

    // Campaign card styles
    campaignCard: { // Base card styles (hover handled by class)
      width: '100%',
      background: 'white',
      borderRadius: '0.5rem', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
      overflow: 'hidden',
      textAlign: 'left' as const,
      display: 'flex', 
      flexDirection: 'column' as const, 
      transition: 'transform 0.2s ease, box-shadow 0.2s ease', // Keep transition for class hover
    },
    cardImage: {
      height: '120px', 
      width: '100%',
      objectFit: 'cover' as const
    },
    cardContent: {
      padding: '0.75rem', 
      flexGrow: 1, 
      display: 'flex',
      flexDirection: 'column' as const
    },
    cardTitle: {
      fontSize: '0.9rem', 
      fontWeight: 600,
      marginBottom: '0.25rem',
      color: '#202124',
      padding: 0,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    cardDesc: {
      fontSize: '0.75rem', 
      color: '#5f6368',
      marginBottom: '0.5rem', 
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: '-webkit-box',
      WebkitLineClamp: 2, 
      WebkitBoxOrient: 'vertical' as const,
      lineHeight: '1.4', 
      minHeight: 'calc(2 * 1.4 * 0.75rem)', 
      flexGrow: 1, 
      padding: 0
    },
    progressBar: {
      width: '100%',
      height: '0.375rem', 
      backgroundColor: '#e9ecef', 
      borderRadius: '9999px',
      overflow: 'hidden',
      marginBottom: '0.3rem' 
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#28a745', 
      borderRadius: '9999px',
      transition: 'width 0.4s ease-in-out' 
    },
    campaignMeta: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '0.7rem', 
      color: '#5f6368',
      marginBottom: '0.25rem' 
    },
    campaignCreator: {
      display: 'flex',
      alignItems: 'center',
      marginTop: 'auto', 
      paddingTop: '0.5rem', 
      fontSize: '0.7rem' 
    },
    creatorAvatar: {
      width: '1.25rem', 
      height: '1.25rem',
      borderRadius: '50%',
      backgroundColor: '#e5e7eb', 
      marginRight: '0.375rem', 
      display: 'inline-block' 
    },
    verifiedBadge: { // Badge shown next to creator name
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: 'rgba(52, 168, 83, 0.1)',
      color: '#34a853',
      fontSize: '0.6rem', 
      padding: '0.1rem 0.25rem', 
      borderRadius: '0.125rem',
      marginLeft: '0.25rem', 
      fontWeight: 500
    },

    // Bottom navigation tabs styles
    tabs: {
      display: 'flex',
      justifyContent: 'space-around',
      backgroundColor: '#fff',
      borderTop: '1px solid #e0e0e0', 
      position: 'fixed' as const,
      bottom: 0,
      left: 0,
      width: '100%',
      zIndex: 100,
      padding: '0.3rem 0' 
    },
    tab: { // Base style for all tabs
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      fontSize: '0.65rem', 
      color: '#5f6368', // Default color
      textDecoration: 'none',
      padding: '0.1rem 0.5rem',
      flexGrow: 1, 
      textAlign: 'center' as const,
      transition: 'color 0.2s'
    },
    tabActive: { // Style overrides for the active tab
      color: '#1a73e8' 
    },
    tabIcon: {
      width: '1.125rem', 
      height: '1.125rem',
      marginBottom: '0.125rem'
    },

    // Footer/Legal notice styles
    legalNotice: {
      fontSize: '0.7rem', 
      color: '#5f6368',
      padding: '1rem', 
      marginTop: '1rem',
      marginBottom: '4.5rem', 
      borderTop: '1px solid #eee' 
    }
  };

  // --- Global styles and mobile overrides ---
  // Using a string for media queries and global styles
  const responsiveStyles = `
    /* Basic CSS reset */
    html, body {
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      width: 100%;
      max-width: 100vw;
      box-sizing: border-box;
      /* Apply base font from styles object if it exists, otherwise fallback */
      font-family: ${styles.page?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif'}; 
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    /* Responsive Grid */
    @media (min-width: 640px) { /* sm breakpoint */
      .campaigns-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    @media (min-width: 1024px) { /* lg breakpoint */
      .campaigns-grid {
        grid-template-columns: repeat(3, 1fr);
      }
       /* Increase container padding on larger screens */
       .page-container { 
         padding: 0 1rem;
       }
       .header-content {
         padding: 0 1rem;
       }
    }

    /* Focus styles for accessibility */
    button:focus-visible, a:focus-visible {
        outline: 2px solid #1a73e8;
        outline-offset: 2px;
        border-radius: 2px; 
    }
    
    /* Remove default outline when not using keyboard navigation */
    button:focus, a:focus {
        outline: none;
    }

    /* Hover effects for buttons using CSS classes */
    .button-outline:hover {
       background-color: rgba(26, 115, 232, 0.05);
       border-color: #1a73e8; /* Ensure border stays on hover */
    }
    .button-primary:hover {
       background-color: #1765cc; /* Darken primary button on hover */
       border-color: #1765cc; 
    }
    /* Hover effect for campaign cards */
    .campaign-card:hover {
       transform: translateY(-3px);
       box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
  `;

  // --- JSX Rendering ---
  return (
    // Apply page styles, checking if styles.page exists to satisfy TS
    <div style={styles.page ?? {}}> 
      {/* Inject responsive styles */}
      <style>{responsiveStyles}</style>

      {/* --- Header --- */}
      <header style={styles.header}>
        <div style={styles.headerContent} className="header-content"> 
          <a href="#" style={styles.logo}>
            World<span style={styles.logoSpan}>Fund</span>
          </a>
          <div style={styles.authButtons}>
            {initialVerification ? (
              <>
                <div style={styles.userVerifiedBadge}>
                  <svg 
                    style={{ width: '12px', height: '12px', marginRight: '0.2rem' }}
                    viewBox="0 0 24 24" fill="currentColor"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  Verified
                </div>
                <button 
                  className="button-outline" // Apply class for styling + hover
                  style={{ ...styles.button, ...styles.buttonOutline }}
                  onClick={handleLogout}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button 
                className="button-primary" // Apply class for styling + hover
                style={{ ...styles.button, ...styles.buttonPrimary }}
                onClick={handleVerifyButtonClick}
              >
                Verify with World ID
              </button>
            )}
          </div>
        </div>
      </header>

      {/* --- Hero Section --- */}
      <section style={styles.hero}>
        <div style={styles.container} className="page-container"> 
          <h1 style={styles.heroTitle}>Fund Projects That Matter</h1>
          <p style={styles.heroSubtitle}>Support verified creators and initiatives securely with World ID.</p>
          <div style={styles.trustBadge}>
            <svg 
              style={{ width: '16px', height: '16px', marginRight: '0.25rem', color: '#1a73e8' }}
              viewBox="0 0 24 24" fill="currentColor"
            >
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
          <div className="campaigns-grid" style={styles.campaignsGrid}>
            {campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <div key={campaign.id} style={styles.campaignCard} className="campaign-card"> 
                  <img
                    src={campaign.image}
                    alt={campaign.title}
                    style={styles.cardImage}
                    onError={(e) => (e.currentTarget.src = `https://placehold.co/200x120/e5e7eb/5f6368?text=Image+Error`)}
                  />
                  <div style={styles.cardContent}>
                    <h3 style={styles.cardTitle}>{campaign.title}</h3>
                    <p style={styles.cardDesc}>{campaign.description}</p>
                    <div style={styles.progressBar}>
                      <div
                        style={{
                          ...styles.progressFill,
                          width: calculateProgressPercentage(campaign.raised, campaign.goal)
                        }}
                      ></div>
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

      {/* --- Legal Footer --- */}
      <footer style={styles.legalNotice}>
        <div>All donations are processed securely. Campaign success is not guaranteed.</div>
        <div>&copy; {new Date().getFullYear()} WorldFund. All rights reserved.</div>
      </footer>

      {/* --- Bottom Navigation Tabs --- */}
      <nav style={styles.tabs}>
        {/* Home Tab (Always Active for now) */}
        {/* Explicitly merge base tab style with active style */}
        <a href="#" style={{ ...styles.tab, ...styles.tabActive }}> 
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span>Home</span>
        </a>
        {/* Search Tab */}
        <a href="#" style={styles.tab}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <span>Search</span>
        </a>
        {/* Account/Verified Tab - Apply active styles conditionally */}
        <a 
          href="#" 
          // Merge base styles with active styles only if initialVerification is true
          style={ initialVerification ? { ...styles.tab, ...styles.tabActive } : styles.tab }
        >
          <svg 
            style={{
              ...styles.tabIcon,
              // Conditionally set icon color based on verification status
              color: initialVerification ? styles.tabActive?.color : styles.tab?.color 
            }}
            viewBox="0 0 24 24" fill="currentColor"
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <span>{initialVerification ? 'Verified' : 'Account'}</span> 
        </a>
      </nav>

      {/* --- World ID Authentication Modal --- */}
      {isAuthModalOpen && (
        <Dialog 
          open={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
          className="relative z-50" 
        >
          <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
          <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"> 
              <div className="text-center mb-4">
                <Dialog.Title className="text-lg font-semibold text-gray-900"> 
                  Verify with World ID
                </Dialog.Title>
                <Dialog.Description className="text-sm text-gray-600 mt-1"> 
                  Prove you're a unique human to securely interact.
                </Dialog.Description>
              </div>
              <div className="py-4 flex justify-center">
                <WorldIDAuth
                  onSuccess={handleVerificationSuccess} 
                  onError={handleVerificationError}
                  // Add required props for WorldIDAuth if any
                  // signal="user-signup" actionId="..." app_id="..."
                />
              </div>
              <div className="mt-4 text-center">
                <div className="flex flex-col gap-2 text-xs text-gray-500 mb-4"> 
                  <div className="flex items-center gap-1.5 justify-center">
                    <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    Verify you're human, not a bot
                  </div>
                  <div className="flex items-center gap-1.5 justify-center">
                     <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    Prove your uniqueness anonymously
                  </div>
                   <div className="flex items-center gap-1.5 justify-center">
                     <svg className="w-3.5 h-3.5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    Access exclusive features securely
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-150 ease-in-out"
                  onClick={() => setIsAuthModalOpen(false)} 
                >
                  Cancel
                </button>
              </div>
            </Dialog.Panel> 
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default LandingPage;
