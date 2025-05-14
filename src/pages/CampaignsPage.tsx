// src/pages/CampaignsPage.tsx

// # ############################################################################ #
// # #                             SECTION 1 - IMPORTS                            #
// # ############################################################################ #
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { campaignService, Campaign } from '../services/CampaignService';

// # ############################################################################ #
// # #                            SECTION 2 - STYLES                             #
// # ############################################################################ #
// Basic styles without media queries
const styles: { [key: string]: React.CSSProperties } = {
  page: { 
    textAlign: 'center', 
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif', 
    color: '#202124', 
    backgroundColor: '#f5f7fa', 
    margin: 0, 
    padding: 0, 
    overflowX: 'hidden', 
    width: '100%', 
    maxWidth: '100vw', 
    minHeight: '100vh', 
    display: 'flex', 
    flexDirection: 'column'
  },
  container: { 
    margin: '0 auto', 
    width: '100%', 
    padding: '0 0.5rem', 
    boxSizing: 'border-box', 
    maxWidth: '1200px', 
    flexGrow: 1 
  },
  header: { 
    background: 'white', 
    padding: '0.5rem 0', 
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
    position: 'sticky', 
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
  button: { 
    padding: '0.5rem 0.75rem', 
    borderRadius: '0.25rem', 
    fontWeight: 500, 
    cursor: 'pointer', 
    textDecoration: 'none', 
    textAlign: 'center', 
    fontSize: '0.875rem', 
    transition: 'background-color 0.2s, border-color 0.2s', 
    border: '1px solid transparent', 
    minHeight: '36px', 
    display: 'inline-flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    lineHeight: 1 
  },
  buttonPrimary: { 
    backgroundColor: '#1a73e8', 
    color: 'white', 
    borderColor: '#1a73e8' 
  },
  buttonSecondary: {
    backgroundColor: '#f1f3f4',
    color: '#202124',
    borderColor: '#dadce0'
  },
  navItem: {
    marginLeft: '1rem',
    fontSize: '0.875rem',
    color: '#5f6368',
    textDecoration: 'none',
    transition: 'color 0.2s'
  },
  navItemActive: {
    color: '#1a73e8',
    fontWeight: 500
  },
  hero: {
    backgroundColor: 'white',
    padding: '2rem 1rem',
    textAlign: 'center',
    marginBottom: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  heroTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#202124',
    marginBottom: '0.5rem'
  },
  heroSubtitle: {
    fontSize: '1.125rem',
    color: '#5f6368',
    maxWidth: '800px',
    margin: '0 auto'
  },
  mainTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#202124',
    marginBottom: '0.5rem',
    textAlign: 'center'
  },
  mainSubtitle: {
    fontSize: '1rem',
    color: '#5f6368',
    marginBottom: '2rem',
    textAlign: 'center'
  },
  // Fixed grid layout without media queries
  campaignsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, 1fr)',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  // For medium screens
  campaignsGridMd: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  // For large screens
  campaignsGridLg: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  campaignCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  // Separate hover styles to apply programmatically
  campaignCardHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  cardImage: {
    width: '100%',
    height: '160px',
    objectFit: 'cover'
  },
  noImagePlaceholder: {
    width: '100%',
    height: '160px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f3f4',
    color: '#9aa0a6',
    fontSize: '0.875rem'
  },
  cardContent: {
    padding: '1rem'
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#202124',
    marginBottom: '0.5rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'left'
  },
  cardDescription: {
    fontSize: '0.875rem',
    color: '#5f6368',
    marginBottom: '0.75rem',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    height: '2.625rem',
    lineHeight: 1.5,
    textAlign: 'left'
  },
  progressBar: {
    width: '100%',
    height: '4px',
    backgroundColor: '#e9ecef',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '0.5rem'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34a853',
    borderRadius: '2px'
  },
  progressStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: '#5f6368',
    marginBottom: '0.75rem',
    textAlign: 'left'
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 1rem',
    borderTop: '1px solid #f1f3f4',
    backgroundColor: '#fafafa'
  },
  creatorInfo: {
    fontSize: '0.75rem',
    color: '#5f6368'
  },
  viewButton: {
    fontSize: '0.75rem',
    padding: '0.25rem 0.5rem',
    backgroundColor: '#1a73e8',
    color: 'white',
    borderRadius: '4px',
    textDecoration: 'none'
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '3rem 0'
  },
  errorContainer: {
    padding: '1.5rem',
    backgroundColor: 'rgba(234, 67, 53, 0.1)',
    border: '1px solid rgba(234, 67, 53, 0.2)',
    borderRadius: '8px',
    color: '#ea4335',
    maxWidth: '600px',
    margin: '0 auto',
    textAlign: 'center'
  },
  emptyContainer: {
    padding: '3rem 1rem',
    textAlign: 'center',
    color: '#5f6368'
  },
  tabs: { 
    display: 'flex', 
    justifyContent: 'space-around', 
    backgroundColor: '#fff', 
    borderTop: '1px solid #e0e0e0', 
    position: 'fixed', 
    bottom: 0, 
    left: 0, 
    width: '100%', 
    zIndex: 100, 
    padding: '0.75rem 0', 
    boxShadow: '0 -1px 3px rgba(0,0,0,0.1)' 
  },
  tab: { 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    fontSize: '0.65rem', 
    color: '#5f6368', 
    textDecoration: 'none', 
    padding: '0.1rem 0.5rem', 
    flexGrow: 1, 
    textAlign: 'center', 
    transition: 'color 0.2s' 
  },
  tabActive: { 
    color: '#1a73e8' 
  },
  tabIcon: { 
    width: '1.125rem', 
    height: '1.125rem', 
    marginBottom: '0.125rem'
  }
};

// # ############################################################################ #
// # #                 SECTION 3 - INTERFACE: CAMPAIGN DISPLAY                  #
// # ############################################################################ #
interface CampaignDisplay extends Campaign {
  progressPercentage: number;
}

// # ############################################################################ #
// # #                SECTION 4 - COMPONENT: CAMPAIGNS PAGE                    #
// # ############################################################################ #
const CampaignsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  const [campaigns, setCampaigns] = useState<CampaignDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

// # ############################################################################ #
// # #             SECTION 5 - EFFECT: WINDOW RESIZE HANDLER                  #
// # ############################################################################ #
  // Handle window resize for responsive grid
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Determine grid style based on window width
  const getGridStyle = () => {
    if (windowWidth >= 1024) {
      return styles.campaignsGridLg;
    } else if (windowWidth >= 640) {
      return styles.campaignsGridMd;
    } else {
      return styles.campaignsGrid;
    }
  };

// # ############################################################################ #
// # #                 SECTION 6 - EFFECT: FETCH CAMPAIGNS                   #
// # ############################################################################ #
  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      try {
        const result = await campaignService.fetchAllCampaigns();
        
        if (result.success && result.campaigns) {
          // Transform campaigns to add progressPercentage
          const displayCampaigns = result.campaigns.map(campaign => ({
            ...campaign,
            progressPercentage: Math.min(Math.round((campaign.raised / campaign.goal) * 100), 100)
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
// # #      SECTION 7 - COMPONENT: CAMPAIGN CARD (INNER COMPONENT)       #
// # ############################################################################ #
  const CampaignCard: React.FC<{ campaign: CampaignDisplay }> = ({ campaign }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    // Combine default card style with hover style conditionally
    const cardStyle = {
      ...styles.campaignCard,
      ...(isHovered ? styles.campaignCardHover : {})
    };
    
    return (
      <div 
        style={cardStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {campaign.image ? (
          <img
            src={campaign.image}
            alt={campaign.title}
            style={styles.cardImage}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/400x200/e5e7eb/5f6368?text=No+Image';
            }}
          />
        ) : (
          <div style={styles.noImagePlaceholder}>
            No Image
          </div>
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
            <span>{campaign.raised} / {campaign.goal} WLD</span>
            <span>{campaign.progressPercentage}%</span>
          </div>
        </div>
        
        <div style={styles.cardFooter}>
          <div style={styles.creatorInfo}>
            {campaign.ownerId.slice(0, 6)}...{campaign.ownerId.slice(-4)}
          </div>
          <Link to={`/campaigns/${campaign.id}`} style={styles.viewButton}>
            View Details
          </Link>
        </div>
      </div>
    );
  };

// # ############################################################################ #
// # #             SECTION 8 - JSX RETURN: CAMPAIGNS PAGE LAYOUT              #
// # ############################################################################ #
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>

          <div>
            {isAuthenticated ? (
              <>
                <Link 
                  to="/dashboard" 
                  style={{...styles.navItem, marginRight: '1rem'}}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/new-campaign" 
                  style={{...styles.button, ...styles.buttonPrimary}}
                >
                  Create Campaign
                </Link>
              </>
            ) : (
              <Link 
                to="/landing" 
                style={{...styles.button, ...styles.buttonPrimary}}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>Browse Campaigns</h1>
        <p style={styles.heroSubtitle}>
          Discover projects worth supporting with WLD tokens
        </p>
      </div>

      <main style={styles.container}>
        {loading ? (
          <div style={styles.loadingContainer}>
            <div>Loading campaigns...</div>
          </div>
        ) : error ? (
          <div style={styles.errorContainer}>
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              style={{...styles.button, ...styles.buttonPrimary, marginTop: '1rem'}}
            >
              Try Again
            </button>
          </div>
        ) : campaigns.length === 0 ? (
          <div style={styles.emptyContainer}>
            <p>No campaigns found. Create one!</p>
            {isAuthenticated && (
              <Link 
                to="/new-campaign" 
                style={{...styles.button, ...styles.buttonPrimary, marginTop: '1rem'}}
              >
                Create Campaign
              </Link>
            )}
          </div>
        ) : (
          // Use dynamic grid style based on window width
          <div style={getGridStyle()}>
            {campaigns.map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </main>

      {/* Bottom Navigation Tabs */}
      <nav style={styles.tabs}>
        <Link to="/" style={styles.tab}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path>
          </svg>
          <span>Home</span>
        </Link>
        <Link to="/campaigns" style={{...styles.tab, ...styles.tabActive}}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
          </svg>
          <span>Explore</span>
        </Link>
        <Link to={isAuthenticated ? "/dashboard" : "/landing"} style={styles.tab}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
          </svg>
          <span>Account</span>
       </Link>
      </nav>
    </div>
  );
};

// # ############################################################################ #
// # #                        SECTION 9 - DEFAULT EXPORT                        #
// # ############################################################################ #
export default CampaignsPage;