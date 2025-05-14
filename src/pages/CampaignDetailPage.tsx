// src/pages/CampaignDetailPage.tsx

// # ############################################################################ #
// # #                             SECTION 1 - IMPORTS                            #
// # ############################################################################ #
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { campaignService, Campaign } from '../services/CampaignService';

// # ############################################################################ #
// # #                            SECTION 2 - STYLES                             #
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
    width: '100%', 
    maxWidth: '100vw', 
    minHeight: '100vh', 
    display: 'flex', 
    flexDirection: 'column' as const 
  },
  container: { 
    margin: '0 auto', 
    width: '100%', 
    padding: '0 0.5rem', 
    boxSizing: 'border-box' as const, 
    maxWidth: '1200px', 
    flexGrow: 1 
  },
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
  buttonDanger: { 
    backgroundColor: '#ea4335', 
    color: 'white', 
    borderColor: '#ea4335' 
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 600,
    color: '#202124',
    marginBottom: '0.5rem',
    textAlign: 'left' as const
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    marginTop: '1rem',
    marginBottom: '1rem',
  },
  cardImage: {
    width: '100%',
    height: '300px',
    objectFit: 'cover' as const,
    backgroundColor: '#f5f7fa'
  },
  noImage: {
    width: '100%',
    height: '300px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f7fa',
    color: '#9aa0a6',
    fontSize: '1rem'
  },
  cardContent: {
    padding: '1.5rem'
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.875rem',
    color: '#5f6368',
    marginBottom: '1rem',
    flexWrap: 'wrap' as const
  },
  metaSeparator: {
    margin: '0 0.5rem'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 500,
    textTransform: 'capitalize' as const
  },
  statusActive: {
    backgroundColor: 'rgba(52, 168, 83, 0.1)',
    color: '#34a853'
  },
  statusCompleted: {
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    color: '#4285f4'
  },
  statusCancelled: {
    backgroundColor: 'rgba(234, 67, 53, 0.1)',
    color: '#ea4335'
  },
  description: {
    fontSize: '1rem',
    lineHeight: 1.6,
    color: '#202124',
    marginBottom: '1.5rem',
    whiteSpace: 'pre-line' as const,
    textAlign: 'left' as const
  },
  progressSection: {
    marginBottom: '1.5rem',
    textAlign: 'left' as const
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
    marginBottom: '0.75rem'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34a853',
    borderRadius: '9999px',
    transition: 'width 0.4s ease-in-out'
  },
  progressStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.875rem',
    fontWeight: 500
  },
  progressGoal: {
    color: '#5f6368'
  },
  progressRaised: {
    color: '#202124'
  },
  divider: {
    height: '1px',
    backgroundColor: '#dadce0',
    margin: '1.5rem 0'
  },
  donationSection: {
    marginTop: '1.5rem',
    textAlign: 'left' as const
  },
  donationTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#202124',
    marginBottom: '1rem'
  },
  donationSuccess: {
    padding: '1rem',
    backgroundColor: 'rgba(52, 168, 83, 0.1)',
    border: '1px solid rgba(52, 168, 83, 0.2)',
    borderRadius: '8px',
    marginBottom: '1rem',
    color: '#202124',
    fontSize: '0.875rem'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#202124',
    marginBottom: '0.5rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    boxSizing: 'border-box' as const
  },
  inputHelper: {
    fontSize: '0.75rem',
    color: '#5f6368',
    marginTop: '0.25rem'
  },
  donationsListSection: {
    marginTop: '1.5rem',
    textAlign: 'left' as const
  },
  donationsListTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#202124',
    marginBottom: '1rem'
  },
  donationItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 0',
    borderBottom: '1px solid #f1f3f4'
  },
  donorInfo: {
    fontSize: '0.875rem'
  },
  donorAddress: {
    fontWeight: 500,
    color: '#202124'
  },
  donationDate: {
    fontSize: '0.75rem',
    color: '#5f6368',
    marginTop: '0.25rem'
  },
  donationAmount: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#34a853'
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    width: '100%'
  },
  errorContainer: {
    padding: '1rem',
    backgroundColor: 'rgba(234, 67, 53, 0.1)',
    border: '1px solid rgba(234, 67, 53, 0.2)',
    borderRadius: '8px',
    margin: '1rem 0',
    color: '#ea4335',
    textAlign: 'center' as const
  },
  notFoundContainer: {
    padding: '3rem 1rem',
    textAlign: 'center' as const,
    color: '#5f6368'
  }
};

// # ############################################################################ #
// # #                SECTION 3 - COMPONENT: DEFINITION & STATE                 #
// # ############################################################################ #
export const CampaignDetail: React.FC<{ id: string }> = ({ id }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [donationAmount, setDonationAmount] = useState<number>(0);
  const [donationTxHash, setDonationTxHash] = useState<string>('');
  const [donating, setDonating] = useState(false);
  const [donationSuccess, setDonationSuccess] = useState(false);

// # ############################################################################ #
// # #                 SECTION 4 - EFFECT: FETCH CAMPAIGN DATA                  #
// # ############################################################################ #
  useEffect(() => {
    const fetchCampaign = async () => {
      setLoading(true);
      try {
        const result = await campaignService.fetchCampaign(id);
        if (result.success && result.campaign) {
          setCampaign(result.campaign);
        } else {
          setError(result.error || 'Failed to load campaign');
        }
      } catch (err: any) {
        console.error('Error fetching campaign:', err);
        setError(err.message || 'An error occurred while fetching campaign');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [id]);

// # ############################################################################ #
// # #                 SECTION 5 - EVENT HANDLER: DONATE SUBMIT                 #
// # ############################################################################ #
  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      navigate('/landing', { state: { redirectTo: `/campaigns/${id}` }});
      return;
    }

    if (!donationAmount || donationAmount <= 0) {
      alert('Please enter a valid donation amount');
      return;
    }

    if (!donationTxHash) {
      alert('Transaction hash is required');
      return;
    }

    setDonating(true);

    try {
      const result = await campaignService.recordDonation(
        id,
        donationAmount,
        donationTxHash
      );

      if (result.success) {
        setDonationSuccess(true);

        // Refresh campaign data
        const refreshResult = await campaignService.fetchCampaign(id);
        if (refreshResult.success && refreshResult.campaign) {
          setCampaign(refreshResult.campaign);
        }

        // Reset form
        setDonationAmount(0);
        setDonationTxHash('');
      } else {
        alert(result.error || 'Failed to process donation');
      }
    } catch (err: any) {
      console.error('Error processing donation:', err);
      alert(err.message || 'An error occurred');
    } finally {
      setDonating(false);
    }
  };

// # ############################################################################ #
// # #            SECTION 6 - CONDITIONAL RENDERING: LOADING STATE            #
// # ############################################################################ #
  if (loading) {
    return (
      <div style={styles.page}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
            <Link to="/campaigns" style={{...styles.button, ...styles.buttonSecondary}}>
              All Campaigns
            </Link>
          </div>
        </header>
        
        <div style={styles.container}>
          <div style={styles.loadingContainer}>
            <div>Loading campaign details...</div>
          </div>
        </div>
      </div>
    );
  }

// # ############################################################################ #
// # #             SECTION 7 - CONDITIONAL RENDERING: ERROR STATE             #
// # ############################################################################ #
  if (error) {
    return (
      <div style={styles.page}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
            <Link to="/campaigns" style={{...styles.button, ...styles.buttonSecondary}}>
              All Campaigns
            </Link>
          </div>
        </header>
        
        <div style={styles.container}>
          <div style={styles.errorContainer}>
            <div>{error}</div>
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
// # #       SECTION 8 - CONDITIONAL RENDERING: CAMPAIGN NOT FOUND        #
// # ############################################################################ #
  if (!campaign) {
    return (
      <div style={styles.page}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
            <Link to="/campaigns" style={{...styles.button, ...styles.buttonSecondary}}>
              All Campaigns
            </Link>
          </div>
        </header>
        
        <div style={styles.container}>
          <div style={styles.notFoundContainer}>
            <div>Campaign not found</div>
            <Link 
              to="/campaigns" 
              style={{...styles.button, ...styles.buttonSecondary, marginTop: '1rem'}}
            >
              View All Campaigns
            </Link>
          </div>
        </div>
      </div>
    );
  }

// # ############################################################################ #
// # #                        SECTION 9 - CALCULATED VALUES                       #
// # ############################################################################ #
  const progressPercentage = Math.min(
    Math.round((campaign.raised / campaign.goal) * 100),
    100
  );

// # ############################################################################ #
// # #      SECTION 10 - MAIN JSX RETURN: CAMPAIGN DETAILS & DONATION      #
// # ############################################################################ #
  return (
    <div style={styles.page}>
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
      
      <div style={styles.container}>
        <div style={styles.detailCard}>
          {campaign.image ? (
            <img
              src={campaign.image}
              alt={campaign.title}
              style={styles.cardImage}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://placehold.co/800x400/e5e7eb/5f6368?text=No+Image';
              }}
            />
          ) : (
            <div style={styles.noImage}>
              No Image
            </div>
          )}
          
          <div style={styles.cardContent}>
            <h1 style={styles.title}>{campaign.title}</h1>
            
            <div style={styles.cardMeta}>
              <span>Created by: {campaign.ownerId.slice(0, 6)}...{campaign.ownerId.slice(-4)}</span>
              <span style={styles.metaSeparator}>•</span>
              <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
              <span style={styles.metaSeparator}>•</span>
              <span style={{
                ...styles.statusBadge,
                ...(campaign.status === 'active' ? styles.statusActive :
                   campaign.status === 'completed' ? styles.statusCompleted :
                   styles.statusCancelled)
              }}>
                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </span>
            </div>
            
            <p style={styles.description}>
              {campaign.description || 'No description provided.'}
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
                <span style={styles.progressRaised}>{campaign.raised} WLD raised</span>
                <span style={styles.progressGoal}>{campaign.goal} WLD goal</span>
              </div>
            </div>
            
            {campaign.status === 'active' && (
              <>
                <div style={styles.divider}></div>
                
                <div style={styles.donationSection}>
                  <h2 style={styles.donationTitle}>Make a Donation</h2>
                  
                  {donationSuccess && (
                    <div style={styles.donationSuccess}>
                      Thank you for your donation! Your contribution has been recorded.
                    </div>
                  )}
                  
                  {isAuthenticated ? (
                    <form onSubmit={handleDonate}>
                      <div style={styles.formGroup}>
                        <label htmlFor="amount" style={styles.label}>
                          Amount (WLD)
                        </label>
                        <input
                          type="number"
                          id="amount"
                          value={donationAmount || ''}
                          onChange={(e) => setDonationAmount(Number(e.target.value))}
                          style={styles.input}
                          placeholder="Enter amount"
                          min="0.01"
                          step="0.01"
                          disabled={donating}
                          required
                        />
                      </div>
                      
                      <div style={styles.formGroup}>
                        <label htmlFor="txHash" style={styles.label}>
                          Transaction Hash
                        </label>
                        <input
                          type="text"
                          id="txHash"
                          value={donationTxHash}
                          onChange={(e) => setDonationTxHash(e.target.value)}
                          style={styles.input}
                          placeholder="Enter transaction hash"
                          disabled={donating}
                          required
                        />
                        <p style={styles.inputHelper}>
                          Enter the transaction hash after sending WLD tokens.
                        </p>
                      </div>
                      
                      <button
                        type="submit"
                        disabled={donating}
                        style={{
                          ...styles.button,
                          ...styles.buttonPrimary,
                          width: '100%',
                          ...(donating ? { opacity: 0.7, cursor: 'not-allowed' } : {})
                        }}
                      >
                        {donating ? 'Processing...' : 'Donate WLD'}
                      </button>
                    </form>
                  ) : (
                    <div style={{
                      padding: '1rem',
                      backgroundColor: 'rgba(251, 188, 5, 0.1)',
                      border: '1px solid rgba(251, 188, 5, 0.2)',
                      borderRadius: '8px',
                      marginBottom: '1rem'
                    }}>
                      <p style={{ marginBottom: '0.75rem' }}>Please sign in to donate to this campaign.</p>
                      <Link
                        to="/landing"
                        style={{...styles.button, ...styles.buttonPrimary}}
                      >
                        Sign In
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {campaign.donations.length > 0 && (
              <>
                <div style={styles.divider}></div>
                
                <div style={styles.donationsListSection}>
                  <h2 style={styles.donationsListTitle}>Recent Donations</h2>
                  <div>
                    {campaign.donations.map((donation) => (
                      <div key={donation.id} style={styles.donationItem}>
                        <div style={styles.donorInfo}>
                          <span style={styles.donorAddress}>
                            {donation.donor.slice(0, 6)}...{donation.donor.slice(-4)}
                          </span>
                          <p style={styles.donationDate}>
                            {new Date(donation.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span style={styles.donationAmount}>
                          {donation.amount} WLD
                        </span>
                      </div>
                    ))}
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