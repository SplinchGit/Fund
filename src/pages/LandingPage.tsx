import * as React from 'react';
import { useState, useEffect, useCallback } from 'react'; // Added useCallback
// Import Dialog component from Headless UI for modals
import { Dialog } from '@headlessui/react';
// Import custom components and services (ensure these paths are correct in your project)
// Make sure the path to WorldIDAuth component is correct relative to this file
import WorldIDAuth from '../components/WorldIDAuth'; // <--- ENSURE THIS IS UNCOMMENTED and path is correct
import { authService, IVerifiedUser } from '../services/AuthService'; // Assumed custom service for authentication logic

// --- Interfaces ---

// Props for the LandingPage component
interface LandingPageProps {
  initialVerification: IVerifiedUser | null; // Initial verification status passed from parent
  onVerificationChange: (verification: IVerifiedUser | null) => void; // Callback function when verification status changes
}

// Structure for campaign data
interface Campaign {
  id: number;
  title: string;
  creator: string;
  raised: string; // Using string for currency format (e.g., "£57")
  goal: string;   // Using string for currency format (e.g., "£300")
  image: string;  // URL for the campaign image
  description: string;
  daysLeft: number;
  isVerified: boolean; // Indicates if the campaign creator is verified
}

// --- LandingPage Component ---

export default function LandingPage({
  initialVerification = null, // Default initial verification to null
  onVerificationChange      // Function to notify parent of verification changes
}: LandingPageProps): React.JSX.Element {

  // --- State Variables ---
  const [isModalOpen, setIsModalOpen] = useState(false); // Controls visibility of the standard sign-in modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); // Controls visibility of the World ID auth modal
  const [userVerification, setUserVerification] = useState(initialVerification as IVerifiedUser | null); // Holds the current user verification status

  // --- DEBUG LOG ---
  // Log the state value at the beginning of every render
  console.log(`[Render] LandingPage rendering. isAuthModalOpen: ${isAuthModalOpen}`);

  // --- Event Handlers ---

  // Called when World ID verification is successful
  // Wrapped in useCallback to potentially stabilize the reference passed as prop
  const handleVerificationSuccess = useCallback((verifiedUser: IVerifiedUser) => {
    console.log("LandingPage: Verification successful callback received:", verifiedUser); // Log success
    setUserVerification(verifiedUser); // Update local state
    if (onVerificationChange) {
      onVerificationChange(verifiedUser); // Notify parent component
    }
    setIsAuthModalOpen(false); // Close the World ID modal
  }, [onVerificationChange]); // Dependency: only recreate if onVerificationChange changes

  // Called when the user clicks the logout button
  const handleLogout = () => {
    authService.logout().then(() => {
      console.log("Logout successful"); // Log success
      setUserVerification(null); // Clear local verification state
      if (onVerificationChange) {
        onVerificationChange(null); // Notify parent component
      }
    }).catch(error => {
      // Basic error handling for logout
      console.error("Error during logout:", error);
      // You might want to show a user-facing error message here
    });
  };

  // --- Data ---
  // Static array of campaign data (in a real app, this would likely come from an API)
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
       daysLeft: 0, // Completed campaign
       isVerified: true
     }
   ];

  // --- Utility Function ---
  // Calculates the funding progress percentage for the progress bar
  const calculateProgressPercentage = (raised: string, goal: string): string => {
    // Remove currency symbol and convert to numbers
    const raisedValue = parseFloat(raised.slice(1));
    const goalValue = parseFloat(goal.slice(1));
    // Handle potential division by zero or invalid values
    if (isNaN(raisedValue) || isNaN(goalValue) || goalValue <= 0) {
      return '0%';
    }
    // Calculate percentage, ensuring it doesn't exceed 100%
    const percentage = Math.min((raisedValue / goalValue * 100), 100);
    return `${percentage.toFixed(0)}%`; // Return as a string (e.g., "75%")
  };

  // --- Styling ---
  // TODO: Refactor these styles using Tailwind, CSS Modules, or another method
  const styles: { [key: string]: React.CSSProperties } = {
    // Core layout styles
    page: {
      textAlign: 'center' as const, // Ensures text alignment is centered where not overridden
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif', // Standard system font stack
      color: '#202124', // Default text color
      backgroundColor: '#ffffff', // Default page background
      margin: 0,
      padding: 0,
      overflowX: 'hidden' as const, // Prevents horizontal scrolling
      width: '100%',
      maxWidth: '100vw' // Ensures content doesn't overflow viewport width
    },
    container: {
      margin: '0 auto', // Centers the container
      width: '100%',
      padding: '0 0.5rem', // Horizontal padding for content spacing
      boxSizing: 'border-box' as const, // Includes padding and border in the element's total width and height
      maxWidth: '100vw'
    },

    // Header styles
    header: {
      background: 'white',
      padding: '0.5rem 0', // Vertical padding
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)', // Subtle shadow for depth
      position: 'sticky' as const, // Makes the header stick to the top on scroll
      top: 0,
      zIndex: 100 // Header z-index is 100
    },
    headerContent: {
      display: 'flex',
      justifyContent: 'space-between', // Pushes logo and buttons to opposite ends
      alignItems: 'center' // Vertically aligns items in the header
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      color: '#1a73e8', // Primary brand color for the first part
      fontWeight: 700, // Bold weight
      fontSize: '1.125rem', // Slightly larger font size
      textDecoration: 'none' // Removes underline from the link
    },
    logoSpan: {
      color: '#202124' // Standard text color for the second part
    },
    nav: { // Styles for potential navigation links (currently unused in JSX)
      display: 'flex',
      listStyle: 'none',
      gap: '1rem', // Space between nav items
      justifyContent: 'center',
      margin: 0,
      padding: 0
    },
    navLink: { // Style for individual nav links (currently unused in JSX)
      textDecoration: 'none',
      color: '#202124',
      fontWeight: 500, // Medium weight
      fontSize: '0.875rem', // Smaller font size
      padding: '0.25rem 0.5rem'
    },
    authButtons: {
      display: 'flex',
      gap: '0.5rem' // Space between authentication buttons
    },

    // Button base and variant styles
    button: {
      padding: '0.5rem 0.75rem', // Padding inside buttons
      borderRadius: '0.25rem', // Slightly rounded corners
      fontWeight: 500, // Medium weight
      cursor: 'pointer', // Pointer cursor on hover
      textDecoration: 'none', // Remove underline if used as a link
      textAlign: 'center' as const,
      fontSize: '0.75rem', // Smaller font size for buttons
      transition: 'all 0.2s', // Smooth transition for hover effects
      border: 'none', // Base style removes default border
      // Added minimum height for better touch targets on mobile
      minHeight: '36px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonOutline: {
      border: '1px solid #1a73e8', // Primary color border
      color: '#1a73e8', // Primary color text
      background: 'transparent' // Transparent background
      // Add hover/focus states for better UX (e.g., background color change)
    },
    buttonPrimary: {
      backgroundColor: '#1a73e8', // Primary color background
      color: 'white' // White text
      // Add hover/focus states (e.g., slightly darker background)
    },
    buttonAccent: {
      backgroundColor: '#ff6b00', // Accent color background
      color: 'white' // White text
      // Add hover/focus states
    },

    // Hero section styles
    hero: {
      background: '#f5f7fa', // Light background color for the section
      padding: '0.75rem 0 1rem', // Padding around the hero content
      textAlign: 'center' as const
    },
    heroTitle: {
      fontSize: '1.25rem', // Larger font size for the main title
      marginBottom: '0.25rem',
      color: '#202124',
      padding: 0 // Reset padding
    },
    heroSubtitle: {
      fontSize: '0.75rem', // Smaller font size for the subtitle
      color: '#5f6368', // Grey color for secondary text
      margin: '0 auto 0.75rem', // Centered with bottom margin
      padding: 0 // Reset padding
    },
    heroButtons: {
      display: 'flex',
      justifyContent: 'center', // Center buttons horizontally
      gap: '0.5rem', // Space between hero buttons
      marginBottom: '0.75rem'
    },
    trustBadge: {
      display: 'inline-flex', // Allows alignment of icon and text
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.7)', // Semi-transparent white background
      padding: '0.25rem 0.5rem',
      borderRadius: '1rem', // Pill shape
      fontSize: '0.7rem', // Very small font size
      color: '#5f6368',
      marginTop: '0.5rem'
    },

    // Verification banner styles (shown when user is not verified)
    verificationBanner: {
      backgroundColor: 'rgba(26,115,232,0.1)', // Light blue background
      padding: '0.5rem 0.75rem',
      borderRadius: '0.25rem',
      marginTop: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between' // Pushes text and button apart
    },
    verificationText: {
      fontSize: '0.7rem',
      color: '#1a73e8', // Primary blue color
      textAlign: 'left' as const
    },

    // User verified badge (shown in header when logged in)
    userVerifiedBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: 'rgba(52,168,83,0.1)', // Light green background
      color: '#34a853', // Green color for success/verified status
      fontSize: '0.65rem', // Very small font size
      padding: '0.1rem 0.25rem',
      borderRadius: '0.125rem', // Slightly rounded corners
      marginLeft: '0.2rem' // Space from potential preceding element
    },

    // Campaigns section styles
    campaignsSection: {
      padding: '0.75rem 0 1rem' // Padding for the section
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
      // Responsive grid: 2 columns by default, 1 column on very small screens (see mobileStyles)
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '0.5rem', // Space between grid items
      justifyContent: 'center',
      width: '100%'
    },

    // Campaign card styles
    campaignCard: {
      width: '100%', // Take full width of the grid column
      background: 'white',
      borderRadius: '0.375rem', // Rounded corners
      boxShadow: '0 1px 2px rgba(0,0,0,0.08)', // Subtle shadow
      overflow: 'hidden', // Ensures image corners are rounded
      textAlign: 'left' as const,
      marginBottom: '0.25rem' // Small bottom margin (gap is primary spacing)
    },
    cardImage: {
      height: '90px', // Fixed height for images
      width: '100%',
      objectFit: 'cover' as const // Ensures image covers the area without distortion
    },
    cardContent: {
      padding: '0.375rem 0.5rem' // Padding inside the card content area
    },
    cardTitle: {
      fontSize: '0.8rem', // Slightly larger font for title within card
      fontWeight: 600, // Semi-bold
      marginBottom: '0.125rem',
      color: '#202124',
      padding: 0,
      // Prevent long titles from breaking layout
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    cardDesc: {
      fontSize: '0.7rem',
      color: '#5f6368',
      marginBottom: '0.375rem',
      // Limit description to 2 lines with ellipsis
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: '-webkit-box',
      WebkitLineClamp: 2, // Show max 2 lines
      WebkitBoxOrient: 'vertical' as const,
      lineHeight: '1.2', // Adjust line height for readability
      minHeight: 'calc(2 * 1.2 * 0.7rem)', // Ensure space for 2 lines
      padding: 0
    },
    progressBar: {
      width: '100%',
      height: '0.25rem', // Thin progress bar
      backgroundColor: '#f8f9fa', // Light background for the bar
      borderRadius: '9999px', // Fully rounded ends
      overflow: 'hidden', // Hide the fill overflow
      marginBottom: '0.2rem'
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#34a853', // Green fill for progress
      borderRadius: '9999px',
      transition: 'width 0.3s ease-in-out' // Animate width changes
    },
    campaignMeta: {
      display: 'flex',
      justifyContent: 'space-between', // Pushes funded % and days left apart
      fontSize: '0.65rem', // Very small font size
      color: '#5f6368',
      marginBottom: '0.15rem'
    },
    campaignCreator: {
      display: 'flex',
      alignItems: 'center',
      marginTop: '0.25rem',
      fontSize: '0.65rem'
    },
    creatorAvatar: { // Placeholder for an avatar image
      width: '0.875rem',
      height: '0.875rem',
      borderRadius: '50%', // Circular avatar
      backgroundColor: '#e5e7eb', // Placeholder background color
      marginRight: '0.25rem'
    },
    verifiedBadge: { // Badge shown next to creator name
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: 'rgba(52,168,83,0.1)', // Light green background
      color: '#34a853', // Green text
      fontSize: '0.55rem', // Extremely small font size
      padding: '0.075rem 0.175rem',
      borderRadius: '0.125rem',
      marginLeft: '0.2rem'
    },

    // Bottom navigation tabs styles
    tabs: {
      display: 'flex',
      justifyContent: 'space-around', // Distribute tabs evenly
      backgroundColor: '#fff',
      borderTop: '1px solid #e5e7eb', // Top border for separation
      position: 'fixed' as const, // Fix tabs to the bottom
      bottom: 0,
      left: 0,
      width: '100%',
      zIndex: 100, // Tabs z-index is 100
      padding: '0.25rem 0' // Small vertical padding
    },
    tab: {
      display: 'flex',
      flexDirection: 'column' as const, // Stack icon and text vertically
      alignItems: 'center',
      fontSize: '0.6rem', // Very small text
      color: '#5f6368', // Default grey color
      textDecoration: 'none',
      padding: '0.1rem 0.5rem' // Add some padding for touch targets
    },
    tabActive: { // Style for the active tab (conditionally applied)
      color: '#1a73e8' // Primary blue color for active state
    },
    tabIcon: {
      width: '1rem', // Small icon size
      height: '1rem',
      marginBottom: '0.125rem' // Space between icon and text
    },

    // Footer/Legal notice styles
    legalNotice: {
      fontSize: '0.65rem', // Very small font size
      color: '#5f6368',
      padding: '0.5rem', // Reduced padding
      marginTop: '0.5rem', // Reduced top margin
      marginBottom: '3.5rem' // Ensure space above the fixed bottom tabs
    }
  };


  // --- Global Styles & Mobile Overrides ---
  // TODO: Refactor these global styles (e.g., move to index.css)
  const mobileStyles = `
    /* Basic CSS reset */
    html, body {
      margin: 0;
      padding: 0;
      overflow-x: hidden; /* Prevent horizontal scroll */
      width: 100%;
      max-width: 100vw;
      box-sizing: border-box;
      /* Consider adding scroll-behavior: smooth; */
    }

    *, *::before, *::after { /* Apply box-sizing to all elements */
      box-sizing: border-box;
      margin: 0; /* Reset default margins */
      padding: 0; /* Reset default paddings */
    }

    /* Media query for very small screens (e.g., smaller phones) */
    @media (max-width: 360px) {
      .campaigns-grid {
        grid-template-columns: 1fr !important; /* Stack cards in a single column */
      }
      /* Adjust font sizes slightly if needed */
      /* .hero-title { font-size: 1.1rem; } */
    }

    /* Optional: Scroll snapping for sections */
    .snap-container {
      /* Uncomment for scroll snapping behavior */
      /* scroll-snap-type: y mandatory; */
      /* height: 100vh; */ /* Required for y-snapping */
      /* overflow-y: scroll; */
      overflow-x: hidden;
      max-width: 100vw;
      width: 100%;
    }

    .snap-section {
      /* Uncomment for scroll snapping behavior */
      /* scroll-snap-align: start; */
      /* min-height: 50vh; */ /* Example minimum height */
    }

    /* Improve focus visibility (accessibility) */
    button:focus-visible, a:focus-visible {
        outline: 2px solid #1a73e8; /* Example focus ring */
        outline-offset: 2px;
    }
    /* Hide default outline when focus-visible is not supported/needed */
    button:focus, a:focus {
        outline: none;
    }

    /* Ensure buttons and links have minimum touch target size (accessibility) */
    /* Already handled by min-height in inline styles, but good practice */
    /* button, a, .nav-link { */
      /* min-height: 44px; */ /* Recommended minimum */
      /* min-width: 44px; */ /* Recommended minimum */
    /* } */
  `;

  // --- JSX Structure ---
  return (
    // Main container div with page styles and scroll snap class
    <div style={styles.page} className="snap-container">
      {/* Inject global/mobile styles */}
      <style>{mobileStyles}</style>

      {/* --- Header --- */}
      <header style={styles.header}>
        <div style={styles.container}>
          <div style={styles.headerContent}>
            {/* Logo */}
            <a href="#" style={styles.logo}>
              World<span style={styles.logoSpan}>Fund</span>
            </a>

            {/* Auth Buttons: Show different buttons based on verification status */}
            <div style={styles.authButtons}>
              {userVerification ? (
                // If user IS verified
                <>
                  <div style={styles.userVerifiedBadge}>
                    {/* Checkmark SVG */}
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
                    style={{ ...styles.button, ...styles.buttonOutline }} // Combine base and outline styles
                    onClick={handleLogout} // Call logout handler
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                // If user is NOT verified
                <>
                  <button
                    style={{ ...styles.button, ...styles.buttonOutline }}
                    onClick={() => {
                        console.log("[Click] Sign In button clicked."); // Debug log
                        setIsModalOpen(true);
                    }}
                  >
                    Sign In
                  </button>
                  <button
                    style={{ ...styles.button, ...styles.buttonPrimary }}
                    onClick={() => {
                        // --- DEBUG LOG ---
                        console.log("[Click] Verify ID button clicked (Header). Current isAuthModalOpen:", isAuthModalOpen);
                        setIsAuthModalOpen(true);
                    }}
                  >
                    Verify ID
                  </button>
                </>
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

            {/* Call to action buttons */}
            <div className="hero-buttons" style={styles.heroButtons}>
              <button style={{ ...styles.button, ...styles.buttonAccent }}>
                Start a Campaign
              </button>
              <button style={{ ...styles.button, ...styles.buttonOutline }}>
                Explore Projects
              </button>
            </div>

            {/* Trust badge */}
            <div style={styles.trustBadge}>
              {/* World ID logo SVG */}
              <svg
                style={{ width: '16px', height: '16px', marginRight: '0.25rem', color: '#1a73e8' }}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-14c2.209 0 4 1.791 4 4s-1.791 4-4 4-4-1.791-4-4 1.791-4 4-4z" />
              </svg>
              Verified by World
            </div>

            {/* Conditional banner prompting verification */}
            {!userVerification && (
              <div style={styles.verificationBanner}>
                <div style={styles.verificationText}>
                  <strong>Verify your identity with World ID</strong>
                  <div>Get priority access to create campaigns and donate.</div>
                </div>
                <button
                  style={{ ...styles.button, ...styles.buttonPrimary, fontSize: '0.65rem' }} // Smaller button in banner
                  onClick={() => {
                      // --- DEBUG LOG ---
                      console.log("[Click] Verify Now button clicked (Banner). Current isAuthModalOpen:", isAuthModalOpen);
                      setIsAuthModalOpen(true);
                  }}
                >
                  Verify Now
                </button>
              </div>
            )}
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
              {/* Map over the campaigns data array */}
              {campaigns.map((campaign) => (
                <div key={campaign.id} style={styles.campaignCard}>
                  {/* Campaign image */}
                  <img
                    src={campaign.image}
                    alt={campaign.title} // Alt text for accessibility
                    style={styles.cardImage}
                    // Add onerror handler for broken images
                    onError={(e) => (e.currentTarget.src = 'https://placehold.co/200x150/e5e7eb/5f6368?text=Image+Error')}
                  />
                  <div style={styles.cardContent}>
                    {/* Campaign title */}
                    <h3 style={styles.cardTitle}>
                      {campaign.title}
                    </h3>
                    {/* Campaign description */}
                    <p style={styles.cardDesc}>
                      {campaign.description}
                    </p>

                    {/* Progress bar */}
                    <div style={styles.progressBar}>
                      <div
                        style={{
                          ...styles.progressFill,
                          // Dynamically set width based on funding progress
                          width: calculateProgressPercentage(campaign.raised, campaign.goal)
                        }}
                      ></div>
                    </div>

                    {/* Campaign metadata (funded %, days left) */}
                    <div style={styles.campaignMeta}>
                      <span>{calculateProgressPercentage(campaign.raised, campaign.goal)} funded</span>
                      <span>{campaign.daysLeft > 0 ? `${campaign.daysLeft} days left` : 'Completed'}</span>
                    </div>

                    {/* Campaign creator info */}
                    <div style={styles.campaignCreator}>
                      <div style={styles.creatorAvatar}></div> {/* Placeholder for avatar */}
                      <span>{campaign.creator}</span>
                      {/* Show verified badge if creator is verified */}
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

            {/* Placeholder for a 'Load More' or similar button */}
            <div style={{ textAlign: 'center', marginTop: '0.75rem', marginBottom: '0.75rem' }}>
              {/* <button style={{...styles.button, ...styles.buttonOutline }}>Load More Campaigns</button> */}
            </div>
          </div>
        </section>

      {/* --- Legal Footer --- */}
      <div style={styles.legalNotice}>
        <div>All donations are at donor's discretion.</div>
        <div>WorldFund does not guarantee success of campaigns or donations.</div>
        <div>&copy; {new Date().getFullYear()} WorldFund</div> {/* Dynamic year */}
      </div>

      {/* --- Bottom Navigation Tabs --- */}
      <div style={styles.tabs}>
          {/* Home Tab */}
          <a href="#" style={{ ...styles.tab, ...styles.tabActive }}> {/* Example: Home is active */}
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
          {/* Account/Verified Tab */}
          <a href="#" style={{
            ...styles.tab,
            // Conditionally apply active style if user is verified
            ...(userVerification ? styles.tabActive : {})
          }}>
            <svg
              style={{
                ...styles.tabIcon,
                // Conditionally change icon color if active
                color: userVerification ? '#1a73e8' : 'currentColor'
              }}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            {/* Change tab text based on verification status */}
            <span>{userVerification ? 'Verified' : 'Account'}</span>
          </a>
        </div>

      {/* --- Modals (using Headless UI Dialog) --- */}

      {/* Standard Sign In Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-[110]">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        {/* Modal Panel Container */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          {/* Modal Panel Content - Uses Tailwind classes for styling */}
          <Dialog.Panel className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <Dialog.Title className="text-xl font-bold mb-4 text-center text-gray-900">Log in to WorldFund</Dialog.Title>
            {/* Basic form structure (no actual login logic implemented here) */}
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-center text-gray-700">Email</label>
                <input
                  type="email"
                  // Tailwind classes for input styling
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-center text-gray-700">Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>
              <div className="pt-2 text-center">
                <p className="text-sm text-gray-600 mb-2">-- OR --</p>
                {/* Button to switch to World ID verification */}
                <button
                  type="button"
                  // Tailwind classes for button styling
                  className="w-full py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex justify-center items-center gap-2 transition duration-150 ease-in-out"
                  onClick={() => {
                    console.log("[Click] Verify with World ID button clicked (Sign In Modal)."); // Debug log
                    setIsModalOpen(false); // Close this modal
                    setIsAuthModalOpen(true); // Open World ID modal
                  }}
                >
                  {/* World ID Icon SVG */}
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
              {/* Modal action buttons */}
              <div className="flex justify-center gap-4 mt-4">
                <button
                  type="button"
                  // Tailwind classes for cancel button
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition duration-150 ease-in-out"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit" // Should trigger form submission (needs onSubmit handler on form)
                  // Tailwind classes for primary action button
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition duration-150 ease-in-out"
                  onClick={(e) => {
                      e.preventDefault(); // Prevent default form submission for now
                      console.log("Standard Sign In clicked (no logic implemented)");
                      // Add actual sign-in logic here
                      // setIsModalOpen(false); // Close on successful sign-in
                  }}
                >
                  Sign in
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* World ID Authentication Modal */}
      <Dialog open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} className="relative z-[110]">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        {/* Modal Panel Container */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          {/* Modal Panel Content - Uses Tailwind classes */}
          <Dialog.Panel className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="text-center mb-4">
              <Dialog.Title className="text-xl font-bold mb-2 text-gray-900">Verify with World ID</Dialog.Title>
              <p className="text-sm text-gray-600">Verify your identity to unlock all features</p>
            </div>

            {/* --- THIS IS THE FIXED SECTION --- */}
            <div className="py-4 flex justify-center">
              {/* Render the actual WorldIDAuth component */}
              <WorldIDAuth
                onSuccess={handleVerificationSuccess} // Pass success callback (memoized with useCallback)
                onError={(error) => {
                    console.error('LandingPage: WorldID verification error callback received:', error);
                    // TODO: Add user-facing error handling here if needed
                    // Example: alert('Verification failed. Please try again.');
                    // Optionally close modal on error, or let WorldIDAuth handle retry:
                    // setIsAuthModalOpen(false);
                }}
              />
            </div>
            {/* --- END OF FIXED SECTION --- */}

            {/* Informational text about World ID benefits */}
            <div className="mt-4 text-center">
              <div className="flex flex-col gap-2 text-sm text-gray-600 mb-4">
                {/* Benefit 1 */}
                <div className="flex items-center gap-2 justify-center">
                  <svg style={{ width: '14px', height: '14px', color: '#34a853' }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  Verify you're human
                </div>
                {/* Benefit 2 */}
                <div className="flex items-center gap-2 justify-center">
                  <svg style={{ width: '14px', height: '14px', color: '#34a853' }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  Prove your uniqueness
                </div>
                {/* Benefit 3 */}
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
                // Tailwind classes for cancel button
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

