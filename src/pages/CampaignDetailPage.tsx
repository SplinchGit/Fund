// src/pages/CampaignDetailPage.tsx

// # ############################################################################ #
// # #                               SECTION 1 - IMPORTS                                #
// # ############################################################################ #
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Removed useParams as 'id' is a prop
import { useAuth } from '../components/AuthContext';
import { campaignService, Campaign } from '../services/CampaignService';
import { WLDDonationForm } from '../components/WLDDonationForm';

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
    width: '100vw', // MODIFIED
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxSizing: 'border-box' as const, // ADDED
  },
  container: { // For the main content area
    margin: '0 auto',
    width: '100%',
    padding: '0 0.5rem', // Horizontal padding for the content block
    boxSizing: 'border-box' as const,
    maxWidth: '1200px', // Content itself is constrained
    flexGrow: 1, // Allows this container to fill vertical space
  },
  header: {
    background: 'white',
    padding: '0.5rem 0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    width: '100%', // ADDED
    boxSizing: 'border-box' as const, // ADDED
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 0.5rem',
    boxSizing: 'border-box' as const, // ADDED
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    color: '#1a73e8',
    fontWeight: 700,
    fontSize: '1.125rem',
    textDecoration: 'none',
  },
  logoSpan: {
    color: '#202124',
  },
  button: {
    padding: '0.5rem 0.75rem',
    borderRadius: '0.25rem',
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center' as const,
    fontSize: '0.875rem',
    transition: 'background-color 0.2s, border-color 0.2s',
    border: '1px solid transparent',
    minHeight: '36px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  buttonPrimary: {
    backgroundColor: '#1a73e8',
    color: 'white',
    borderColor: '#1a73e8',
  },
  buttonSecondary: {
    backgroundColor: '#f1f3f4',
    color: '#202124',
    borderColor: '#dadce0',
  },
  buttonDanger: {
    backgroundColor: '#ea4335',
    color: 'white',
    borderColor: '#ea4335',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 600,
    color: '#202124',
    marginBottom: '0.5rem',
    textAlign: 'left' as const,
  },
  detailCard: { // This wraps the main content of the detail page
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    marginTop: '1rem',
    marginBottom: '1rem',
    boxSizing: 'border-box' as const, // ADDED
  },
  cardImage: {
    width: '100%',
    height: '300px', // Consider making this responsive or aspect ratio based
    objectFit: 'cover' as const,
    backgroundColor: '#f5f7fa', // Fallback bg for image area
  },
  noImage: {
    width: '100%',
    height: '300px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f7fa',
    color: '#9aa0a6',
    fontSize: '1rem',
    boxSizing: 'border-box' as const, // ADDED
  },
  cardContent: {
    padding: '1.5rem',
    boxSizing: 'border-box' as const, // ADDED
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.875rem',
    color: '#5f6368',
    marginBottom: '1rem',
    flexWrap: 'wrap' as const,
  },
  metaSeparator: {
    margin: '0 0.5rem',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 500,
    textTransform: 'capitalize' as const,
  },
  statusActive: {
    backgroundColor: 'rgba(52, 168, 83, 0.1)',
    color: '#34a853',
  },
  statusCompleted: {
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    color: '#4285f4',
  },
  statusCancelled: {
    backgroundColor: 'rgba(234, 67, 53, 0.1)',
    color: '#ea4335',
  },
  description: {
    fontSize: '1rem',
    lineHeight: 1.6,
    color: '#202124',
    marginBottom: '1.5rem',
    whiteSpace: 'pre-line' as const,
    textAlign: 'left' as const,
  },
  progressSection: {
    marginBottom: '1.5rem',
    textAlign: 'left' as const,
  },
  progressTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#202124',
    marginBottom: '0.75rem',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e9ecef',
    borderRadius: '9999px',
    overflow: 'hidden',
    marginBottom: '0.75rem',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34a853',
    borderRadius: '9999px',
    transition: 'width 0.4s ease-in-out',
  },
  progressStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  progressGoal: {
    color: '#5f6368',
  },
  progressRaised: {
    color: '#202124',
  },
  divider: {
    height: '1px',
    backgroundColor: '#dadce0',
    margin: '1.5rem 0',
  },
  donationSection: {
    marginTop: '1.5rem',
    textAlign: 'left' as const,
  },
  donationTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#202124',
    marginBottom: '1rem',
  },
  donationsListSection: {
    marginTop: '1.5rem',
    textAlign: 'left' as const,
  },
  donationsListTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#202124',
    marginBottom: '1rem',
  },
  donationItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 0',
    borderBottom: '1px solid #f1f3f4',
  },
  donorInfo: {
    fontSize: '0.875rem',
  },
  donorAddress: {
    fontWeight: 500,
    color: '#202124',
  },
  donationDate: {
    fontSize: '0.75rem',
    color: '#5f6368',
    marginTop: '0.25rem',
  },
  donationAmount: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#34a853',
  },
  loadingContainer: { // Used within styles.container
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '3rem 0', // ADDED padding for better spacing
    minHeight: '300px', // ADDED minHeight
    width: '100%',
    boxSizing: 'border-box' as const, // ADDED
  },
  errorContainer: { // Used within styles.container
    padding: '1.5rem', // Increased padding
    backgroundColor: 'rgba(234, 67, 53, 0.1)',
    border: '1px solid rgba(234, 67, 53, 0.2)',
    borderRadius: '8px',
    margin: '2rem auto', // ADDED auto for horizontal centering and vertical margin
    color: '#ea4335',
    textAlign: 'center' as const,
    maxWidth: '600px', // ADDED maxWidth
    boxSizing: 'border-box' as const, // ADDED
  },
  notFoundContainer: { // Used within styles.container
    padding: '3rem 1rem',
    textAlign: 'center' as const,
    color: '#5f6368',
    minHeight: '300px', // ADDED minHeight
    display: 'flex', // ADDED for centering content
    flexDirection: 'column' as const, // ADDED
    justifyContent: 'center' as const, // ADDED
    alignItems: 'center' as const, // ADDED
    boxSizing: 'border-box' as const, // ADDED
  }
};

// ADDED: Global responsive styles
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
`;

// # ############################################################################ #
// # #                 SECTION 3 - COMPONENT: DEFINITION & STATE                 #
// # ############################################################################ #
export const CampaignDetail: React.FC<{ id: string }> = ({ id }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

// # ############################################################################ #
// # #                 SECTION 4 - EFFECT: FETCH CAMPAIGN DATA                 #
// # ############################################################################ #
  useEffect(() => {
    const fetchCampaign = async () => {
      setLoading(true);
      setError(null); // Reset error on new fetch
      try {
        const result = await campaignService.fetchCampaign(id);
        if (result.success && result.campaign) {
          setCampaign(result.campaign);
        } else {
          setError(result.error || 'Failed to load campaign details.');
        }
      } catch (err: any) {
        console.error('Error fetching campaign:', err);
        setError(err.message || 'An error occurred while fetching campaign details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) { // Ensure ID is present before fetching
        fetchCampaign();
    } else {
        setError("Campaign ID is missing.");
        setLoading(false);
    }
  }, [id]);

// # ############################################################################ #
// # #                 SECTION 5 - CONDITIONAL RENDERING: LOADING STATE                 #
// # ############################################################################ #
  if (loading) {
    return (
      <div style={styles.page}>
        <style>{responsiveStyles}</style> {/* ADDED responsive styles */}
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
            <Link to="/campaigns" style={{...styles.button, ...styles.buttonSecondary}}>
              All Campaigns
            </Link>
          </div>
        </header>
        <div style={styles.container}> {/* This container will also grow */}
          <div style={styles.loadingContainer}>
            <div>Loading campaign details...</div> {/* Add spinner if available */}
          </div>
        </div>
      </div>
    );
  }

// # ############################################################################ #
// # #                 SECTION 6 - CONDITIONAL RENDERING: ERROR STATE                 #
// # ############################################################################ #
  if (error) {
    return (
      <div style={styles.page}>
        <style>{responsiveStyles}</style> {/* ADDED responsive styles */}
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
            <Link to="/campaigns" style={{...styles.button, ...styles.buttonSecondary}}>
              All Campaigns
            </Link>
          </div>
        </header>
        <div style={styles.container}> {/* This container will also grow */}
          <div style={styles.errorContainer}>
            <p>{error}</p> {/* Changed div to p for semantic error message */}
            <Link
              to="/campaigns"
              style={{...styles.button, ...styles.buttonSecondary, marginTop: '1rem'}}
            >
              Back to Campaigns
            </Link>
          </div>
        </div>
      </div>
    );
  }

// # ############################################################################ #
// # #         SECTION 7 - CONDITIONAL RENDERING: CAMPAIGN NOT FOUND         #
// # ############################################################################ #
  if (!campaign) {
    return (
      <div style={styles.page}>
        <style>{responsiveStyles}</style> {/* ADDED responsive styles */}
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
            <Link to="/campaigns" style={{...styles.button, ...styles.buttonSecondary}}>
              All Campaigns
            </Link>
          </div>
        </header>
        <div style={styles.container}> {/* This container will also grow */}
          <div style={styles.notFoundContainer}>
            <h2>Campaign Not Found</h2> {/* Changed div to h2 */}
            <p>The campaign you are looking for does not exist or could not be loaded.</p> {/* Added more context */}
            <Link
              to="/campaigns"
              style={{...styles.button, ...styles.buttonPrimary, marginTop: '1rem'}} // Changed to primary button
            >
              View All Campaigns
            </Link>
          </div>
        </div>
      </div>
    );
  }

// # ############################################################################ #
// # #                         SECTION 8 - CALCULATED VALUES                         #
// # ############################################################################ #
  const progressPercentage = campaign.goal > 0 ? Math.min(
    Math.round((campaign.raised / campaign.goal) * 100),
    100
  ) : 0; // Handle goal = 0

// # ############################################################################ #
// # #         SECTION 9 - MAIN JSX RETURN: CAMPAIGN DETAILS & DONATION         #
// # ############################################################################ #
  return (
    <div style={styles.page}>
      <style>{responsiveStyles}</style> {/* ADDED responsive styles */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
          <div>
            <Link to="/campaigns" style={{...styles.button, ...styles.buttonSecondary, marginRight: '0.5rem'}}>
              All Campaigns
            </Link>
            {isAuthenticated && (
              <Link to="/dashboard" style={{...styles.button, ...styles.buttonPrimary}}>
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* styles.container has flexGrow:1 and centers content */}
      <div style={styles.container}>
        <div style={styles.detailCard}>
          {campaign.image ? (
            <img
              src={campaign.image}
              alt={campaign.title}
              style={styles.cardImage}
              onError={(e) => {
                // A more React-friendly way to handle image error might involve state
                // For simplicity, direct DOM manipulation or CSS can be fallback
                (e.target as HTMLImageElement).src = 'https://placehold.co/800x300/e5e7eb/9aa0a6?text=Image+Not+Found';
              }}
            />
          ) : (
            <div style={styles.noImage}>
              No Image Provided
            </div>
          )}

          <div style={styles.cardContent}>
            <h1 style={styles.title}>{campaign.title}</h1>

            <div style={styles.cardMeta}>
              <span>Created by: {campaign.ownerId ? `${campaign.ownerId.slice(0, 6)}...${campaign.ownerId.slice(-4)}` : 'N/A'}</span>
              <span style={styles.metaSeparator}>•</span>
              <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
              <span style={styles.metaSeparator}>•</span>
              <span style={{
                ...styles.statusBadge,
                ...(campaign.status === 'active' ? styles.statusActive :
                  campaign.status === 'completed' ? styles.statusCompleted :
                  styles.statusCancelled)
              }}>
                {campaign.status} {/* Removed charAt(0).toUpperCase + slice(1) as statusBadge has textTransform */}
              </span>
            </div>

            <p style={styles.description}>
              {campaign.description || 'No detailed description has been provided for this campaign.'}
            </p>

            <div style={styles.progressSection}>
              <h2 style={styles.progressTitle}>Funding Progress</h2>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${progressPercentage}%`
                  }}
                ></div>
              </div>
              <div style={styles.progressStats}>
                <span style={styles.progressRaised}>{campaign.raised.toLocaleString()} WLD raised</span>
                <span style={styles.progressGoal}>of {campaign.goal.toLocaleString()} WLD goal ({progressPercentage}%)</span>
              </div>
            </div>

            {campaign.status === 'active' && (
              <>
                <div style={styles.divider}></div>
                <div style={styles.donationSection}>
                  <h2 style={styles.donationTitle}>Make a Donation</h2>
                  <WLDDonationForm 
                    campaignId={id}
                    onDonationSuccess={() => {
                      // Refresh campaign data to show updated raised amount
                      campaignService.fetchCampaign(id).then(result => {
                        if (result.success && result.campaign) {
                          setCampaign(result.campaign);
                        }
                      });
                    }}
                  />
                </div>
              </>
            )}

            {campaign.donations && campaign.donations.length > 0 && (
              <>
                <div style={styles.divider}></div>
                <div style={styles.donationsListSection}>
                  <h2 style={styles.donationsListTitle}>Recent Donations ({campaign.donations.length})</h2>
                  <div>
                    {campaign.donations.slice(0, 10).map((donation) => ( // Show recent, e.g., top 10
                      <div key={donation.id} style={styles.donationItem}>
                        <div style={styles.donorInfo}>
                          <span style={styles.donorAddress}>
                            {donation.donor ? `${donation.donor.slice(0, 6)}...${donation.donor.slice(-4)}` : 'Anonymous'}
                          </span>
                          <p style={styles.donationDate}>
                            {new Date(donation.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span style={styles.donationAmount}>
                          {donation.amount.toLocaleString()} WLD
                        </span>
                      </div>
                    ))}
                    {campaign.donations.length > 10 && (
                        <p style={{textAlign: 'center' as const, marginTop: '1rem', fontSize: '0.8rem', color: '#5f6368'}}>
                            And {campaign.donations.length - 10} more donations.
                        </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;