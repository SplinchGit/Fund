import * as React from 'react';
import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import WorldIDAuth from '../components/WorldIDAuth'; // Import WorldID component
import { authService, IVerifiedUser } from '../services/AuthService'; // Import auth service

// LandingPage props interface
interface LandingPageProps {
  initialVerification: IVerifiedUser | null;
  onVerificationChange: (verification: IVerifiedUser | null) => void;
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

export default function LandingPage({ 
  initialVerification = null, 
  onVerificationChange 
}: LandingPageProps): React.JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userVerification, setUserVerification] = useState(initialVerification as IVerifiedUser | null);

  // Handle successful verification
  const handleVerificationSuccess = (verifiedUser: IVerifiedUser) => {
    setUserVerification(verifiedUser);
    if (onVerificationChange) {
      onVerificationChange(verifiedUser);
    }
    setIsAuthModalOpen(false);
  };

  // Handle logout
  const handleLogout = () => {
    authService.logout().then(() => {
      setUserVerification(null);
      if (onVerificationChange) {
        onVerificationChange(null);
      }
    }).catch(error => {
      console.error("Error during logout:", error);
    });
  };

  // Campaigns data
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
    {
      id: 5,
      title: "Phone",
      creator: "Thomas Edison",
      raised: "£30",
      goal: "£450",
      image: "https://images.unsplash.com/photo-1529675641475-78780f1fd4b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150&q=80",
      description: "My phone finally died after 6 years. Need a new one for work and staying connected.",
      daysLeft: 25,
      isVerified: true
    },
    {
      id: 6,
      title: "College Laptop",
      creator: "Noel Sweden",
      raised: "£500",
      goal: "£500",
      image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=150&q=80",
      description: "Successfully funded! Got the laptop I needed for my computer science degree. Thank you!",
      daysLeft: 0,
      isVerified: true
    }
  ];

  const calculateProgressPercentage = (raised: string, goal: string): string => {
    const raisedValue = parseFloat(raised.slice(1));
    const goalValue = parseFloat(goal.slice(1));
    return `${Math.min((raisedValue / goalValue * 100), 100).toFixed(0)}%`;
  };

  // Define styles - optimized for mobile and World's design guidelines
  const styles = {
    // Core layout
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
    nav: {
      display: 'flex',
      listStyle: 'none',
      gap: '1rem',
      justifyContent: 'center',
      margin: '0',
      padding: '0'
    },
    navLink: {
      textDecoration: 'none',
      color: '#202124',
      fontWeight: 500,
      fontSize: '0.875rem',
      padding: '0.25rem 0.5rem'
    },
    authButtons: {
      display: 'flex',
      gap: '0.5rem'
    },
    
    // Button styles
    button: {
      padding: '0.5rem 0.75rem',
      borderRadius: '0.25rem',
      fontWeight: 500,
      cursor: 'pointer',
      textDecoration: 'none',
      textAlign: 'center' as const,
      fontSize: '0.75rem',
      transition: 'all 0.2s',
      border: 'none'
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
    buttonAccent: {
      backgroundColor: '#ff6b00',
      color: 'white'
    },
    
    // Hero section
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
    heroButtons: {
      display: 'flex',
      justifyContent: 'center',
      gap: '0.5rem',
      marginBottom: '0.75rem'
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
    
    // Verification banner styles
    verificationBanner: {
      backgroundColor: 'rgba(26,115,232,0.1)',
      padding: '0.5rem 0.75rem',
      borderRadius: '0.25rem',
      marginTop: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    verificationText: {
      fontSize: '0.7rem',
      color: '#1a73e8',
      textAlign: 'left' as const
    },
    
    // User verification badge
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
    
    // Campaigns section
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
    
    // Campaign cards
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
      padding: 0
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
      borderRadius: '9999px'
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
    
    // Tabs for navigation - per World guidelines
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
      textDecoration: 'none'
    },
    tabActive: {
      color: '#1a73e8'
    },
    tabIcon: {
      width: '1rem',
      height: '1rem',
      marginBottom: '0.125rem'
    },
    
    // Compact legal notice
    legalNotice: {
      fontSize: '0.7rem',
      color: '#5f6368',
      padding: '0.75rem',
      marginTop: '1rem',
      marginBottom: '3.5rem' // Space for bottom tabs
    }
  };

  // Mobile-first styles
  const mobileStyles = `
    html, body {
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      width: 100%;
      max-width: 100vw;
      box-sizing: border-box;
    }
    
    * {
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
      scroll-snap-type: y mandatory;
      overflow-x: hidden;
      max-width: 100vw;
      width: 100%;
    }
    
    .snap-section {
      scroll-snap-align: start;
    }
    
    button:focus, a:focus {
      outline: none;
    }
    
    button, a, .nav-link {
      min-height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  `;

  return (
    <div style={styles.page} className="snap-container">
      <style>
        {mobileStyles}
      </style>

      <header style={styles.header}>
        <div style={styles.container}>
          <div style={styles.headerContent}>
            <a href="#" style={styles.logo}>
              World<span style={styles.logoSpan}>Fund</span>
            </a>
            
            <div style={styles.authButtons}>
              {userVerification ? (
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
                    style={{...styles.button, ...styles.buttonOutline}}
                    onClick={handleLogout}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button 
                    style={{...styles.button, ...styles.buttonOutline}}
                    onClick={() => setIsModalOpen(true)}
                  >
                    Sign In
                  </button>
                  <button 
                    style={{...styles.button, ...styles.buttonPrimary}}
                    onClick={() => setIsAuthModalOpen(true)}
                  >
                    Verify ID
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <section style={styles.hero} className="snap-section">
        <div style={styles.container}>
          <h1 className="hero-title" style={styles.heroTitle}>Fund Projects That Matter</h1>
          <p style={styles.heroSubtitle}>Secure crowdfunding with World verification</p>
          
          <div className="hero-buttons" style={styles.heroButtons}>
            <button style={{...styles.button, ...styles.buttonAccent}}>
              Start a Campaign
            </button>
            <button style={{...styles.button, ...styles.buttonOutline}}>
              Explore Projects
            </button>
          </div>
          
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
          
          {!userVerification && (
            <div style={styles.verificationBanner}>
              <div style={styles.verificationText}>
                <strong>Verify your identity with World ID</strong>
                <div>Get priority access to create campaigns and donate.</div>
              </div>
              <button 
                style={{...styles.button, ...styles.buttonPrimary, fontSize: '0.65rem'}}
                onClick={() => setIsAuthModalOpen(true)}
              >
                Verify Now
              </button>
            </div>
          )}
        </div>
      </section>
      
      <section style={styles.campaignsSection} className="snap-section">
        <div style={styles.container}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Featured Campaigns</h2>
            <p style={styles.sectionSubtitle}>Projects from verified creators</p>
          </div>
          
          <div className="campaigns-grid" style={styles.campaignsGrid}>
            {campaigns.map((campaign) => (
              <div key={campaign.id} style={styles.campaignCard}>
                <img
                  src={campaign.image}
                  alt={campaign.title}
                  style={styles.cardImage}
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
          
          <div style={{ textAlign: 'center', marginTop: '0.75rem', marginBottom: '0.75rem' }}>
            {/* No button here as requested */}
          </div>
        </div>
      </section>
      
      <div style={{...styles.legalNotice, fontSize: '0.65rem', padding: '0.5rem', marginTop: '0.5rem', marginBottom: '3.5rem'}}>
        <div>All donations are at donor's discretion.</div>
        <div>WorldFund does not guarantee success of campaigns or donations.</div>
        <div>&copy; 2025 WorldFund</div>
      </div>
      
      <div style={styles.tabs}>
        <a href="#" style={styles.tab}>
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

      {/* Sign In Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-xl bg-white p-6">
            <h2 className="text-xl font-bold mb-4 text-center">Log in to WorldFund</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-center">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-center">Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                />
              </div>
              <div className="pt-2 text-center">
                <p className="text-sm text-gray-600 mb-2">-- OR --</p>
                <button
                  type="button"
                  className="w-full py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex justify-center items-center gap-2"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsAuthModalOpen(true);
                  }}
                >
                  <svg 
                    style={{ width: '16px', height: '16px' }}
                    viewBox="0 0 24 24" 
                    fill="currentColor"
                  >
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-14c2.209 0 4 1.791 4 4s-1.791 4-4 4-4-1.791-4-4 1.791-4 4-4z" />
                  </svg>
                  Verify with World ID
                </button>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg border"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Sign in
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* World ID Authentication Modal */}
      <Dialog open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-xl bg-white p-6">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold mb-2">Verify with World ID</h2>
              <p className="text-sm text-gray-600">Verify your identity to unlock all features</p>
            </div>
            
            <div className="py-4 flex justify-center">
              <WorldIDAuth 
                onSuccess={handleVerificationSuccess}
                onError={(error) => console.error('WorldID verification error:', error)}
              />
            </div>
            
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
              
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg border"
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