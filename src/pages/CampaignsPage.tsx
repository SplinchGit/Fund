// src/pages/CampaignsPage.tsx

// # ############################################################################ #
// # #                               SECTION 1 - IMPORTS                                #
// # ############################################################################ #
import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { campaignService, Campaign } from '../services/CampaignService';

// Import Swiper React components and styles
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, A11y } from 'swiper/modules'; // Import necessary modules

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// # ############################################################################ #
// # #                               SECTION 2 - STYLES                                #
// # ############################################################################ #
const styles: { [key: string]: React.CSSProperties } = {
  page: {
    textAlign: 'center' as const,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif',
    color: '#202124',
    backgroundColor: '#f5f7fa',
    margin: 0,
    padding: 0,
    overflowX: 'hidden' as const,
    width: '100vw',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxSizing: 'border-box' as const,
  },
  container: { // Main content area for campaigns list/carousel
    margin: '0 auto',
    width: '100%',
    padding: '0 0.5rem 1rem 0.5rem', // Added bottom padding
    boxSizing: 'border-box' as const,
    maxWidth: '1200px', // Max width for the content area
    flexGrow: 1,
    display: 'flex', // Added to help center content if needed
    flexDirection: 'column' as const, // Stack search and carousel
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
  logo: { /* ... (no change) ... */ display: 'flex', alignItems: 'center', color: '#1a73e8', fontWeight: 700, fontSize: '1.125rem', textDecoration: 'none' },
  logoSpan: { /* ... (no change) ... */ color: '#202124' },
  button: { /* ... (no change from previous fixes, ensure textAlign: 'center' as const) ... */ padding: '0.5rem 0.75rem', borderRadius: '0.25rem', fontWeight: 500, cursor: 'pointer', textDecoration: 'none', textAlign: 'center' as const, fontSize: '0.875rem', transition: 'background-color 0.2s, border-color 0.2s', border: '1px solid transparent', minHeight: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 },
  buttonPrimary: { /* ... (no change) ... */ backgroundColor: '#1a73e8', color: 'white', borderColor: '#1a73e8' },
  buttonSecondary: { /* ... (no change) ... */ backgroundColor: '#f1f3f4', color: '#202124', borderColor: '#dadce0' },
  navItem: { /* ... (no change) ... */ marginLeft: '1rem', fontSize: '0.875rem', color: '#5f6368', textDecoration: 'none', transition: 'color 0.2s'},
  navItemActive: { /* ... (no change) ... */ color: '#1a73e8', fontWeight: 500 },
  hero: { // This section contains the page title and search bar
    backgroundColor: 'white',
    padding: '1.5rem 1rem', // Adjusted padding
    textAlign: 'center' as const,
    marginBottom: '1rem', // Reduced margin before carousel
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', // Softer shadow
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  heroTitle: { /* ... (no change) ... */ fontSize: '2rem', fontWeight: 700, color: '#202124', marginBottom: '0.5rem' },
  heroSubtitle: { /* ... (no change) ... */ fontSize: '1.125rem', color: '#5f6368', maxWidth: '800px', margin: '0 auto 1rem' }, // Added bottom margin for search

  searchContainer: { // NEW: For the search input
    margin: '0 auto 1rem auto', // Centered with bottom margin
    width: '100%',
    maxWidth: '500px', // Limit width of search bar
    padding: '0 0.5rem',
    boxSizing: 'border-box' as const,
  },
  searchInput: { // NEW: Style for the search input
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #dadce0',
    borderRadius: '2rem', // Pill shape
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  // REMOVED: campaignsGrid, campaignsGridMd, campaignsGridLg styles

  campaignCard: { // Style for individual cards, used in CampaignCard component
    backgroundColor: 'white',
    borderRadius: '12px', // More rounded
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', // Slightly more prominent shadow for cards
    overflow: 'hidden',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%', // Make card take full height of slide if slides have fixed height
    boxSizing: 'border-box' as const,
  },
  campaignCardHover: { // Kept if you want hover effects (less relevant for swipe on mobile)
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
  },
  cardImage: { width: '100%', height: '180px', objectFit: 'cover' as const }, // Adjusted height
  noImagePlaceholder: { width: '100%', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f3f4', color: '#9aa0a6', fontSize: '0.875rem', boxSizing: 'border-box' as const },
  cardContent: { padding: '1rem', textAlign: 'left' as const, flexGrow: 1, display: 'flex', flexDirection: 'column' as const, boxSizing: 'border-box' as const },
  cardTitle: { fontSize: '1.125rem', fontWeight: 600, color: '#202124', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  cardDescription: { fontSize: '0.875rem', color: '#5f6368', marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden', textOverflow: 'ellipsis', minHeight: 'calc(3 * 1.5 * 0.875rem)', lineHeight: 1.5, flexGrow: 1},
  progressBar: { width: '100%', height: '6px', backgroundColor: '#e9ecef', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.5rem', marginTop: 'auto' },
  progressFill: { height: '100%', backgroundColor: '#34a853', borderRadius: '3px' },
  progressStats: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#5f6368', marginBottom: '0.75rem' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderTop: '1px solid #f1f3f4', backgroundColor: '#fcfcfc', boxSizing: 'border-box' as const, marginTop: 'auto' },
  creatorInfo: { fontSize: '0.75rem', color: '#5f6368' },
  viewButton: { fontSize: '0.8rem', padding: '0.375rem 0.75rem', backgroundColor: '#1a73e8', color: 'white', borderRadius: '4px', textDecoration: 'none', transition: 'background-color 0.2s' },

  swiperContainer: { // NEW: For Swiper component
    width: '100%',
    flexGrow: 1, // Allow swiper to take available vertical space if needed
    padding: '0.5rem 0', // Padding around the swiper
  },
  swiperSlide: { // NEW: Ensure slides are ready for content
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center', // Stretch if campaign card has height:100%
    // You might need to set a height on Swiper or slides if content height varies a lot
    // Or ensure CampaignCard has a consistent min-height.
    padding: '0 0.5rem', // Padding for "peek" effect if slidesPerView is > 1 (not for 1)
    boxSizing: 'border-box' as const,
  },
  emptyStateContainer: { // For loading, error, no campaigns, no search results
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '3rem 1rem',
    textAlign: 'center' as const,
    color: '#5f6368',
    flexGrow: 1, // Takes up space if carousel is empty
    minHeight: '300px', // Ensure it's visible
    boxSizing: 'border-box' as const,
  },
  errorContainer: { padding: '1.5rem', backgroundColor: 'rgba(234, 67, 53, 0.1)', border: '1px solid rgba(234, 67, 53, 0.2)', borderRadius: '8px', color: '#c53929', maxWidth: '600px', margin: '0 auto 1rem auto', textAlign: 'center' as const, boxSizing: 'border-box' as const },
  tabs: { /* ... (no change from previous fixes) ... */ display: 'flex', justifyContent: 'space-around', backgroundColor: '#fff', borderTop: '1px solid #e0e0e0', position: 'fixed' as const, bottom: 0, left: 0, width: '100%', zIndex: 100, padding: '0.75rem 0', boxShadow: '0 -1px 3px rgba(0,0,0,0.1)', boxSizing: 'border-box' as const },
  tab: { /* ... (no change) ... */ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', fontSize: '0.65rem', color: '#5f6368', textDecoration: 'none', padding: '0.1rem 0.5rem', flexGrow: 1, textAlign: 'center' as const, transition: 'color 0.2s' },
  tabActive: { /* ... (no change) ... */ color: '#1a73e8' },
  tabIcon: { /* ... (no change) ... */ width: '1.125rem', height: '1.125rem', marginBottom: '0.125rem' }
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
  input[type="search"]::-webkit-search-cancel-button { /* Style for search cancel button */
    -webkit-appearance: none;
    appearance: none;
    height: 1em;
    width: 1em;
    margin-left: .25em;
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23777'%3e%3cpath d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/%3e%3c/svg%3e");
    background-size: 1em 1em;
    cursor: pointer;
  }
  /* Swiper specific styles for pagination bullets */
  .swiper-pagination-bullet {
    background-color: #cccccc;
    opacity: 1;
  }
  .swiper-pagination-bullet-active {
    background-color: #1a73e8;
  }
`;

// # ############################################################################ #
// # #                 SECTION 3 - INTERFACE: CAMPAIGN DISPLAY                 #
// # ############################################################################ #
interface CampaignDisplay extends Campaign {
  progressPercentage: number;
}

// # ############################################################################ #
// # #                 SECTION 4 - COMPONENT: CAMPAIGNS PAGE                 #
// # ############################################################################ #
const CampaignsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const [campaigns, setCampaigns] = useState<CampaignDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // REMOVED: windowWidth state and useEffect for it, as grid is removed.

  // NEW: State for search
  const [searchQuery, setSearchQuery] = useState('');

  // Use useMemo for filteredCampaigns to optimize filtering
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
// # #                 SECTION 6 - EFFECT: FETCH CAMPAIGNS                 #
// # ############################################################################ #
  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await campaignService.fetchAllCampaigns();
        if (result.success && result.campaigns) {
          const displayCampaigns = result.campaigns.map(campaign => ({
            ...campaign,
            progressPercentage: campaign.goal > 0 ? Math.min(Math.round((campaign.raised / campaign.goal) * 100), 100) : 0,
          }));
          setCampaigns(displayCampaigns);
        } else {
          setError(result.error || 'Failed to load campaigns');
        }
      } catch (err: any) {
        console.error('Error fetching campaigns:', err);
        setError(err.message || 'An error occurred while fetching campaigns');
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

// # ############################################################################ #
// # #         SECTION 7 - COMPONENT: CAMPAIGN CARD (INNER COMPONENT)         #
// # ############################################################################ #
  const CampaignCard: React.FC<{ campaign: CampaignDisplay }> = ({ campaign }) => {
    // Removed isHovered state as it's less relevant for mobile swipe
    // const cardStyle = { ...styles.campaignCard }; // Simpler style application

    return (
      <div style={styles.campaignCard} > {/* Removed hover handlers */}
        {campaign.image ? (
          <img
            src={campaign.image}
            alt={campaign.title}
            style={styles.cardImage}
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x180/e5e7eb/9aa0a6?text=Image+Error'; }}
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
            <div style={{...styles.progressFill, width: `${campaign.progressPercentage}%`}}></div>
          </div>
          <div style={styles.progressStats}>
            <span>{campaign.raised.toLocaleString()} / {campaign.goal.toLocaleString()} WLD</span>
            <span>{campaign.progressPercentage}%</span>
          </div>
        </div>
        <div style={styles.cardFooter}>
          <div style={styles.creatorInfo}>
            By: {campaign.ownerId ? `${campaign.ownerId.slice(0, 6)}...${campaign.ownerId.slice(-4)}` : 'Unknown'}
          </div>
          <Link to={`/campaigns/${campaign.id}`} style={styles.viewButton}>
            View Details
          </Link>
        </div>
      </div>
    );
  };

// # ############################################################################ #
// # #                 SECTION 8 - JSX RETURN: CAMPAIGNS PAGE LAYOUT                 #
// # ############################################################################ #
  return (
    <div style={styles.page}>
      <style>{responsiveStyles}</style>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
          <div>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" style={{...styles.navItem, marginRight: '1rem'}}>Dashboard</Link>
                <Link to="/new-campaign" style={{...styles.button, ...styles.buttonPrimary}}>Create Campaign</Link>
              </>
            ) : (
              <Link to="/landing" style={{...styles.button, ...styles.buttonPrimary}}>Sign In</Link>
            )}
          </div>
        </div>
      </header>

      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>Explore Campaigns</h1>
        <p style={styles.heroSubtitle}>Swipe through projects making a difference.</p>
        {/* NEW: Search Input */}
        <div style={styles.searchContainer}>
          <input
            type="search"
            placeholder="Search by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      <main style={styles.container}>
        {loading ? (
          <div style={styles.emptyStateContainer}> {/* Reused for loading message */}
            <div>Loading campaigns...</div> {/* Add spinner here if available */}
          </div>
        ) : error ? (
          <div style={styles.errorContainer}>
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()} // Simple retry
              style={{...styles.button, ...styles.buttonSecondary, marginTop: '1rem', width: 'auto', padding:'0.5rem 1rem'}}
            >
              Try Again
            </button>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div style={styles.emptyStateContainer}>
            <p>{searchQuery ? `No campaigns found for "${searchQuery}".` : "No campaigns available at the moment."}</p>
            {!searchQuery && isAuthenticated && ( // Show create button only if not searching and authenticated
              <Link
                to="/new-campaign"
                style={{...styles.button, ...styles.buttonPrimary, marginTop: '1rem', width: 'auto', padding:'0.625rem 1.25rem'}}
              >
                Create First Campaign
              </Link>
            )}
          </div>
        ) : (
          // NEW: Swiper Carousel Implementation
          <Swiper
            modules={[Navigation, Pagination, A11y]}
            spaceBetween={16} // Space between slides if you were to show more than one (or for peeking)
            slidesPerView={1} // Show one full slide at a time
            navigation // Show navigation arrows (optional for mobile, swipe is primary)
            pagination={{ clickable: true, dynamicBullets: true }} // Enable clickable pagination dots
            loop={false} // Set to true if you want infinite looping
            style={styles.swiperContainer}
            grabCursor={true}
          >
            {filteredCampaigns.map(campaign => (
              <SwiperSlide key={campaign.id} style={styles.swiperSlide}>
                <CampaignCard campaign={campaign} />
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </main>

      <nav style={styles.tabs}>
        <Link to="/" style={styles.tab}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path></svg>
          <span>Home</span>
        </Link>
        <Link to="/campaigns" style={{...styles.tab, ...styles.tabActive}}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path></svg>
          <span>Explore</span>
        </Link>
        <Link to={isAuthenticated ? "/dashboard" : "/landing"} style={styles.tab}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>
          <span>Account</span>
       </Link>
      </nav>
    </div>
  );
};

// # ############################################################################ #
// # #                 SECTION 9 - DEFAULT EXPORT                 #
// # ############################################################################ #
export default CampaignsPage;