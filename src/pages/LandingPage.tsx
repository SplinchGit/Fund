// -----------------------------
// WORLDFund - Landing Page Component - LandingPage.tsx
// -----------------------------

import * as React from 'react';
import { useState, useEffect, useCallback, JSX, } from 'react';
import { Dialog } from '@headlessui/react';
import WorldIDAuth from '../components/WorldIDAuth';
import { cognitoAuth, IVerifiedUser } from '../services/AuthService';

// -----------------------------
// INTERFACES
// -----------------------------

interface LandingPageProps {
  initialVerification: IVerifiedUser | null;
  onVerificationChange: (verification: IVerifiedUser | null) => void;
  onNavigate?: (page: string) => void; // Add this new prop
}

interface Campaign {
  id: number;
  title: string;
  creator: string;
  raised: string;
  goal: string;
  image: string;
  description: string;
  daysLeft: number;
  isVerified: boolean;
}

// -----------------------------
// MAIN COMPONENT
// -----------------------------

export default function LandingPage({
  initialVerification = null,
  onVerificationChange,
  onNavigate // Add this
}: LandingPageProps): JSX.Element {

  // -----------------------------
  // STATE MANAGEMENT
  // -----------------------------
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userVerification, setUserVerification] = useState(initialVerification as IVerifiedUser | null);

  // Monitor modal state for debugging
  useEffect(() => {
    console.log("[Effect] Modal state changed:", isAuthModalOpen);
  }, [isAuthModalOpen]);

  // -----------------------------
  // EVENT HANDLERS
  // -----------------------------
  
  // Handle successful verification
  const handleVerificationSuccess = useCallback((verifiedUser: IVerifiedUser) => {
    console.log("LandingPage: Verification successful callback received:", verifiedUser);
    setUserVerification(verifiedUser);
    if (onVerificationChange) {
      onVerificationChange(verifiedUser);
    }
    setIsAuthModalOpen(false);
  }, [onVerificationChange]);

  // Handle logout
  const handleLogout = () => {
    cognitoAuth.logout().then(() => {
      console.log("Logout successful");
      setUserVerification(null);
      if (onVerificationChange) {
        onVerificationChange(null);
      }
    }).catch((error: any) => {
      console.error("Error during logout:", error);
    });
  };

  // Handle verify button click - Fixed implementation
  const handleVerifyButtonClick = useCallback(() => {
    // Simpler implementation without try/catch and extra logging
    setIsAuthModalOpen(true);
  }, []);

  // -----------------------------
  // DATA & UTILITIES
  // -----------------------------
  
  // Sample campaign data
  const campaigns: Campaign[] = [
    {
      id: 1,
      title: "PC Monitor",
      creator: "John Adams",
      raised: "£57",
      goal: "£300",
      image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150&q=80",
      description: "Help me upgrade my workstation with a new monitor for coding and design projects.",
      daysLeft: 14,
      isVerified: true
    },
    {
      id: 2,
      title: "Desk",
      creator: "Rachel Scott",
      raised: "£17",
      goal: "£50",
      image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150&q=80",
      description: "Looking to replace my broken desk with a sturdy new one for my home office setup.",
      daysLeft: 21,
      isVerified: true
    },
    {
      id: 3,
      title: "Coffee",
      creator: "Gary Thomas",
      raised: "£0.5",
      goal: "£3",
      image: "https://images.unsplash.com/photo-1461988625982-7e46a099bf4f?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150&q=80",
      description: "Just need a coffee to get through this coding session. Every little helps!",
      daysLeft: 1,
      isVerified: true
    },
    {
      id: 4,
      title: "New Windows",
      creator: "Jenny Smith",
      raised: "£60",
      goal: "£750",
      image: "https://images.unsplash.com/photo-1581345628965-9adb6a0195b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150&q=80",
      description: "Raising funds to replace the old windows in my apartment with energy-efficient ones.",
      daysLeft: 30,
      isVerified: true
    },
  ];

  // Calculate progress percentage for campaign cards
  const calculateProgressPercentage = (raised: string, goal: string): string => {
    const raisedValue = parseFloat(raised.slice(1));
    const goalValue = parseFloat(goal.slice(1));
    if (isNaN(raisedValue) || isNaN(goalValue) || goalValue <= 0) {
      return '0%';
    }
    const percentage = Math.min((raisedValue / goalValue * 100), 100);
    return `${percentage.toFixed(0)}%`;
  };

  // -----------------------------
  // STYLING
  // -----------------------------
  
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
      maxWidth: '100vw'
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
      alignItems: 'center'
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
      gap: '0.5rem'
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
      transition: 'all 0.2s',
      border: 'none',
      minHeight: '36px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonOutline: {
      border: '1px solid #1a73e8',
      color: '#1a73e8',
      background: 'transparent'
    },
    buttonPrimary: {
      backgroundColor: '#1a73e8',
      color: 'white'
    },
    
    // Hero section styles
    hero: {
      background: '#f5f7fa',
      padding: '0.75rem 0 1rem',
      textAlign: 'center' as const
    },
    heroTitle: {
      fontSize: '1.25rem',
      marginBottom: '0.25rem',
      color: '#202124',
      padding: 0
    },
    heroSubtitle: {
      fontSize: '0.75rem',
      color: '#5f6368',
      margin: '0 auto 0.75rem',
      padding: 0
    },
    trustBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.7)',
      padding: '0.25rem 0.5rem',
      borderRadius: '1rem',
      fontSize: '0.7rem',
      color: '#5f6368',
      marginTop: '0.5rem'
    },

    // User verified badge
    userVerifiedBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: 'rgba(52,168,83,0.1)',
      color: '#34a853',
      fontSize: '0.65rem',
      padding: '0.1rem 0.25rem',
      borderRadius: '0.125rem',
      marginLeft: '0.2rem'
    },

    // Campaigns section styles
    campaignsSection: {
      padding: '0.75rem 0 1rem'
    },
    sectionHeader: {
      textAlign: 'center' as const,
      marginBottom: '0.5rem'
    },
    sectionTitle: {
      fontSize: '1.125rem',
      marginBottom: '0.125rem',
      padding: 0
    },
    sectionSubtitle: {
      color: '#5f6368',
      fontSize: '0.7rem',
      margin: '0 auto 0.5rem',
      padding: 0
    },
    campaignsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '0.5rem',
      justifyContent: 'center',
      width: '100%'
    },

    // Campaign card styles
    campaignCard: {
      width: '100%',
      background: 'white',
      borderRadius: '0.375rem',
      boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      textAlign: 'left' as const,
      marginBottom: '0.25rem'
    },
    cardImage: {
      height: '90px',
      width: '100%',
      objectFit: 'cover' as const
    },
    cardContent: {
      padding: '0.375rem 0.5rem'
    },
    cardTitle: {
      fontSize: '0.8rem',
      fontWeight: 600,
      marginBottom: '0.125rem',
      color: '#202124',
      padding: 0,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    cardDesc: {
      fontSize: '0.7rem',
      color: '#5f6368',
      marginBottom: '0.375rem',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical' as const,
      lineHeight: '1.2',
      minHeight: 'calc(2 * 1.2 * 0.7rem)',
      padding: 0
    },
    progressBar: {
      width: '100%',
      height: '0.25rem',
      backgroundColor: '#f8f9fa',
      borderRadius: '9999px',
      overflow: 'hidden',
      marginBottom: '0.2rem'
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#34a853',
      borderRadius: '9999px',
      transition: 'width 0.3s ease-in-out'
    },
    campaignMeta: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '0.65rem',
      color: '#5f6368',
      marginBottom: '0.15rem'
    },
    campaignCreator: {
      display: 'flex',
      alignItems: 'center',
      marginTop: '0.25rem',
      fontSize: '0.65rem'
    },
    creatorAvatar: {
      width: '0.875rem',
      height: '0.875rem',
      borderRadius: '50%',
      backgroundColor: '#e5e7eb',
      marginRight: '0.25rem'
    },
    verifiedBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: 'rgba(52,168,83,0.1)',
      color: '#34a853',
      fontSize: '0.55rem',
      padding: '0.075rem 0.175rem',
      borderRadius: '0.125rem',
      marginLeft: '0.2rem'
    },

    // Bottom navigation tabs styles
    tabs: {
      display: 'flex',
      justifyContent: 'space-around',
      backgroundColor: '#fff',
      borderTop: '1px solid #e5e7eb',
      position: 'fixed' as const,
      bottom: 0,
      left: 0,
      width: '100%',
      zIndex: 100,
      padding: '0.25rem 0'
    },
    tab: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      fontSize: '0.6rem',
      color: '#5f6368',
      textDecoration: 'none',
      padding: '0.1rem 0.5rem'
    },
    tabActive: {
      color: '#1a73e8'
    },
    tabIcon: {
      width: '1rem',
      height: '1rem',
      marginBottom: '0.125rem'
    },

    // Footer/Legal notice styles
    legalNotice: {
      fontSize: '0.65rem',
      color: '#5f6368',
      padding: '0.5rem',
      marginTop: '0.5rem',
      marginBottom: '3.5rem'
    }
  };

  // Global styles and mobile overrides
  const mobileStyles = `
    /* Basic CSS reset */
    html, body {
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      width: 100%;
      max-width: 100vw;
      box-sizing: border-box;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    @media (max-width: 360px) {
      .campaigns-grid {
        grid-template-columns: 1fr !important;
      }
    }

    .snap-container {
      overflow-x: hidden;
      max-width: 100vw;
      width: 100%;
    }

    button:focus-visible, a:focus-visible {
        outline: 2px solid #1a73e8;
        outline-offset: 2px;
    }
    
    button:focus, a:focus {
        outline: none;
    }
  `;

  // -----------------------------
  // RENDER JSX
  // -----------------------------
  
  return (
    <div style={styles.page} className="snap-container">
      <style>{mobileStyles}</style>

      {/* --- Header --- */}
      <header style={styles.header}>
        <div style={styles.container}>
          <div style={styles.headerContent}>
            {/* Logo */}
            <a href="#" style={styles.logo}>
              World<span style={styles.logoSpan}>Fund</span>
            </a>

            {/* Auth Buttons */}
            <div style={styles.authButtons}>
              {userVerification ? (
                // If user IS verified
                <>
                  <div style={styles.userVerifiedBadge}>
                    <svg
                      style={{ width: '12px', height: '12px', marginRight: '0.1rem' }}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    Verified with World ID
                  </div>
                  <button
                    style={{ ...styles.button, ...styles.buttonOutline }}
                    onClick={handleLogout}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                // If user is NOT verified
                <button
                  style={{ ...styles.button, ...styles.buttonPrimary }}
                  onClick={handleVerifyButtonClick}
                >
                  Verify ID
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* --- Hero Section --- */}
      <section style={styles.hero} className="snap-section">
        <div style={styles.container}>
          <h1 className="hero-title" style={styles.heroTitle}>Fund Projects That Matter</h1>
          <p style={styles.heroSubtitle}>Secure crowdfunding with World verification</p>

          {/* Trust badge */}
          <div style={styles.trustBadge}>
            <svg
              style={{ width: '16px', height: '16px', marginRight: '0.25rem', color: '#1a73e8' }}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-14c2.209 0 4 1.791 4 4s-1.791 4-4 4-4-1.791-4-4 1.791-4 4-4z" />
            </svg>
            Verified by World
          </div>
        </div>
      </section>

      {/* --- Campaigns Section --- */}
      <section style={styles.campaignsSection} className="snap-section">
        <div style={styles.container}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Featured Campaigns</h2>
            <p style={styles.sectionSubtitle}>Projects from verified creators</p>
          </div>

          {/* Grid displaying campaign cards */}
          <div className="campaigns-grid" style={styles.campaignsGrid}>
            {campaigns.map((campaign) => (
              <div key={campaign.id} style={styles.campaignCard}>
                <img
                  src={campaign.image}
                  alt={campaign.title}
                  style={styles.cardImage}
                  onError={(e) => (e.currentTarget.src = 'https://placehold.co/200x150/e5e7eb/5f6368?text=Image+Error')}
                />
                <div style={styles.cardContent}>
                  <h3 style={styles.cardTitle}>
                    {campaign.title}
                  </h3>
                  <p style={styles.cardDesc}>
                    {campaign.description}
                  </p>

                  <div style={styles.progressBar}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: calculateProgressPercentage(campaign.raised, campaign.goal)
                      }}
                    ></div>
                  </div>

                  <div style={styles.campaignMeta}>
                    <span>{calculateProgressPercentage(campaign.raised, campaign.goal)} funded</span>
                    <span>{campaign.daysLeft > 0 ? `${campaign.daysLeft} days left` : 'Completed'}</span>
                  </div>

                  <div style={styles.campaignCreator}>
                    <div style={styles.creatorAvatar}></div>
                    <span>{campaign.creator}</span>
                    {campaign.isVerified && (
                      <span style={styles.verifiedBadge}>
                        ✓ Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Legal Footer --- */}
      <div style={styles.legalNotice}>
        <div>All donations are at donor's discretion.</div>
        <div>WorldFund does not guarantee success of campaigns or donations.</div>
        <div>&copy; {new Date().getFullYear()} WorldFund</div>
      </div>

      {/* --- Bottom Navigation Tabs --- */}
      <div style={styles.tabs}>
        <a href="#" style={{ ...styles.tab, ...styles.tabActive }}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span>Home</span>
        </a>
        <a href="#" style={styles.tab}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <span>Search</span>
        </a>
        <a href="#" style={{
          ...styles.tab,
          ...(userVerification ? styles.tabActive : {})
        }}>
          <svg
            style={{
              ...styles.tabIcon,
              color: userVerification ? '#1a73e8' : 'currentColor'
            }}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <span>{userVerification ? 'Verified' : 'Account'}</span>
        </a>
      </div>

      {/* --- Debug Indicator --- */}
      <div style={{
        position: 'fixed',
        bottom: '50px',
        right: '10px',
        padding: '4px 8px',
        backgroundColor: isAuthModalOpen ? 'green' : 'red',
        color: 'white',
        borderRadius: '4px',
        fontSize: '10px',
        opacity: 0.7,
        zIndex: 1000
      }}>
        Modal: {isAuthModalOpen ? 'OPEN' : 'CLOSED'}
      </div>

      {/* --- World ID Authentication Modal --- */}
      {/* FIXED: Removed unnecessary key prop and simplified Dialog implementation */}
      <Dialog 
        open={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        className="relative z-[110]"
      >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        {/* Modal Panel Container */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          {/* Modal Panel Content */}
          <Dialog.Panel className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="text-center mb-4">
              <Dialog.Title className="text-xl font-bold mb-2 text-gray-900">Verify with World ID</Dialog.Title>
              <p className="text-sm text-gray-600">Verify your identity to unlock all features</p>
            </div>

            {/* WorldIDAuth Component */}
            <div className="py-4 flex justify-center">
              <WorldIDAuth
                onSuccess={handleVerificationSuccess}
                onError={(error) => {
                  console.error('WorldID verification error:', error);
                }}
              />
            </div>

            {/* Informational text about World ID benefits */}
            <div className="mt-4 text-center">
              <div className="flex flex-col gap-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2 justify-center">
                  <svg style={{ width: '14px', height: '14px', color: '#34a853' }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  Verify you're human
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <svg style={{ width: '14px', height: '14px', color: '#34a853' }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  Prove your uniqueness
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <svg style={{ width: '14px', height: '14px', color: '#34a853' }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  Protect your privacy
                </div>
              </div>

              {/* Cancel button */}
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition duration-150 ease-in-out"
                onClick={() => setIsAuthModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </Dialog.Panel> 
        </div>
      </Dialog>
    </div>
  );
}