// src/pages/CampaignDetailPage.tsx

// # ############################################################################ #
// # #                     SECTION 1 - IMPORTS                                  #
// # ############################################################################ #
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { campaignService, Campaign, Donation } from '../services/CampaignService';
import { MiniKit, tokenToDecimals, Tokens, PayCommandInput } from '@worldcoin/minikit-js';

// # ############################################################################ #
// # #                     SECTION 2 - TYPE DEFINITIONS                         #
// # ############################################################################ #
// Extended Donation interface to include missing properties
interface ExtendedDonation extends Donation {
  transactionId?: string; // Optional transaction ID for unique keys
}

// # ############################################################################ #
// # #                     SECTION 3 - STYLES                                   #
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
  container: {
    margin: '0 auto',
    width: '100%',
    padding: '0 0.5rem',
    boxSizing: 'border-box' as const,
    maxWidth: '1200px',
    flexGrow: 1,
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
  title: {
    fontSize: '1.75rem',
    fontWeight: 600,
    color: '#202124',
    marginBottom: '0.5rem',
    textAlign: 'left' as const,
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    marginTop: '1rem',
    marginBottom: '1rem',
    boxSizing: 'border-box' as const,
  },
  cardImage: {
    width: '100%',
    height: '300px',
    objectFit: 'cover' as const,
    backgroundColor: '#f5f7fa',
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
    boxSizing: 'border-box' as const,
  },
  cardContent: {
    padding: '1.5rem',
    boxSizing: 'border-box' as const,
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
  donationForm: {
    backgroundColor: '#f8f9fa',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  formGroup: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#3c4043',
    marginBottom: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #dadce0',
    borderRadius: '6px',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  donateButton: {
    width: '100%',
    padding: '0.875rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 500,
    color: 'white',
    backgroundColor: '#34a853',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s, opacity 0.2s',
    textAlign: 'center' as const,
    minHeight: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 'normal',
  },
  donateButtonDisabled: {
    backgroundColor: '#adb5bd',
    color: '#e9ecef',
    cursor: 'not-allowed' as const,
    opacity: 0.7,
  },
  donationsListSection: {
    marginTop: '1.5rem',
    textAlign: 'left' as const,
    backgroundColor: '#f8f9fa',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
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
    alignItems: 'flex-start',
    padding: '1rem',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
    marginBottom: '1rem',
    gap: '1rem',
  },
  donorInfo: {
    flex: 1,
    minWidth: 0,
  },
  donorAddress: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#202124',
    marginBottom: '0.25rem',
  },
  donationDate: {
    fontSize: '0.75rem',
    color: '#5f6368',
    marginBottom: '0.5rem',
  },
  donationMessage: {
    fontSize: '0.875rem',
    color: '#4a5568',
    fontStyle: 'italic',
    padding: '0.5rem',
    backgroundColor: '#f7fafc',
    borderRadius: '4px',
    borderLeft: '3px solid #1a73e8',
    maxWidth: '300px',
    wordWrap: 'break-word' as const,
  },
  donationAmount: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#34a853',
    flexShrink: 0,
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e0e0e0',
  },
  paginationButton: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    backgroundColor: '#1a73e8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  paginationButtonDisabled: {
    backgroundColor: '#e0e0e0',
    color: '#9e9e9e',
    cursor: 'not-allowed',
  },
  paginationText: {
    fontSize: '0.875rem',
    color: '#5f6368',
    fontWeight: 500,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '3rem 0',
    minHeight: '300px',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  errorContainer: {
    padding: '1.5rem',
    backgroundColor: 'rgba(234, 67, 53, 0.1)',
    border: '1px solid rgba(234, 67, 53, 0.2)',
    borderRadius: '8px',
    margin: '2rem auto',
    color: '#ea4335',
    textAlign: 'center' as const,
    maxWidth: '600px',
    boxSizing: 'border-box' as const,
  },
  notFoundContainer: {
    padding: '3rem 1rem',
    textAlign: 'center' as const,
    color: '#5f6368',
    minHeight: '300px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    boxSizing: 'border-box' as const,
  },
  successMessage: {
    backgroundColor: 'rgba(52, 168, 83, 0.1)',
    border: '1px solid rgba(52, 168, 83, 0.2)',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
    color: '#34a853',
    fontSize: '0.875rem',
  },
  errorMessage: {
    backgroundColor: 'rgba(234, 67, 53, 0.1)',
    border: '1px solid rgba(234, 67, 53, 0.2)',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
    color: '#ea4335',
    fontSize: '0.875rem',
  },
  worldAppNotice: {
    backgroundColor: 'rgba(26, 115, 232, 0.1)',
    border: '1px solid rgba(26, 115, 232, 0.2)',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
    color: '#1a73e8',
    fontSize: '0.875rem',
    textAlign: 'center' as const,
  }
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
  input:focus {
    border-color: #1a73e8;
    box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.2);
    outline: none;
  }
`;

// # ############################################################################ #
// # #           SECTION 4 - COMPONENT: DEFINITION & STATE                      #
// # ############################################################################ #
export const CampaignDetail: React.FC<{ id: string }> = ({ id }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Donation form state
  const [donationAmount, setDonationAmount] = useState<string>('');
  const [donationMessage, setDonationMessage] = useState<string>('');
  const [donating, setDonating] = useState(false);
  const [donationSuccess, setDonationSuccess] = useState(false);
  const [donationError, setDonationError] = useState<string | null>(null);
  const [isInWorldApp, setIsInWorldApp] = useState(false);

  // Donations pagination state
  const [donationsPage, setDonationsPage] = useState(1);
  const [donationsList, setDonationsList] = useState<ExtendedDonation[]>([]);
  const donationsPerPage = 5;

  // # ############################################################################ #
  // # #           SECTION 5 - EFFECT: FETCH CAMPAIGN DATA                        #
  // # ############################################################################ #
  useEffect(() => {
    const fetchCampaign = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log(`[CampaignDetail] Fetching campaign: ${id}`);
        const result = await campaignService.fetchCampaign(id);
        
        if (result.success && result.campaign) {
          setCampaign(result.campaign);
          
          // Debug: Log what we got for donations
          console.log('[CampaignDetail] Campaign data received:', {
            id: result.campaign.id,
            title: result.campaign.title,
            donationsExists: !!result.campaign.donations,
            donationsIsArray: Array.isArray(result.campaign.donations),
            donationsLength: result.campaign.donations ? result.campaign.donations.length : 0,
            donationsType: typeof result.campaign.donations,
            firstDonation: result.campaign.donations && result.campaign.donations.length > 0
              ? {
                  id: result.campaign.donations[0]?.id,
                  amount: result.campaign.donations[0]?.amount,
                  donor: result.campaign.donations[0]?.donor,
                  message: result.campaign.donations[0]?.message
                }
              : 'No donations'
          });
          
          // Handle donations - they should be in campaign.donations array
          if (result.campaign.donations && Array.isArray(result.campaign.donations)) {
            console.log(`[CampaignDetail] Found ${result.campaign.donations.length} donations in campaign data`);
            
            // Convert to ExtendedDonation format and add transactionId if missing
            const extendedDonations: ExtendedDonation[] = result.campaign.donations.map((donation, index) => ({
              ...donation,
              transactionId: donation.txHash || `donation-${index}-${Date.now()}`
            }));
            
            // Show first page of donations
            const firstPage = extendedDonations.slice(0, donationsPerPage);
            setDonationsList(firstPage);
            setDonationsPage(1);
          } else {
            console.log('[CampaignDetail] No donations found in campaign data');
            setDonationsList([]);
          }
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

    if (id) {
      fetchCampaign();
    } else {
      setError("Campaign ID is missing.");
      setLoading(false);
    }
  }, [id]);

  // # ############################################################################ #
  // # #           SECTION 6 - EFFECT: CHECK WORLD APP                            #
  // # ############################################################################ #
  useEffect(() => {
    setIsInWorldApp(MiniKit.isInstalled());
  }, []);

  // # ############################################################################ #
  // # #           SECTION 7 - PAGINATION HANDLERS                                #
  // # ############################################################################ #
  const handlePaginateDonations = useCallback((newPage: number) => {
    if (!campaign?.donations || !Array.isArray(campaign.donations)) return;
    
    const startIndex = (newPage - 1) * donationsPerPage;
    const endIndex = startIndex + donationsPerPage;
    
    // Convert to ExtendedDonation format
    const extendedDonations: ExtendedDonation[] = campaign.donations.map((donation, index) => ({
      ...donation,
      transactionId: donation.txHash || `donation-${index}-${Date.now()}`
    }));
    
    const pageData = extendedDonations.slice(startIndex, endIndex);
    
    setDonationsList(pageData);
    setDonationsPage(newPage);
    
    console.log(`[CampaignDetail] Paginated to page ${newPage}, showing ${pageData.length} donations`);
  }, [campaign?.donations, donationsPerPage]);

  // # ############################################################################ #
  // # #           SECTION 8 - DONATION SUCCESS HANDLER                           #
  // # ############################################################################ #
  const handleDonationSuccess = useCallback(async () => {
    console.log('[CampaignDetail] Donation successful, refreshing campaign data');
    setDonationSuccess(true);
    setDonationAmount('');
    setDonationMessage('');
    
    // Re-fetch campaign to get updated data
    try {
      const result = await campaignService.fetchCampaign(id);
      if (result.success && result.campaign) {
        setCampaign(result.campaign);
        
        // Update donations list
        if (result.campaign.donations && Array.isArray(result.campaign.donations)) {
          const extendedDonations: ExtendedDonation[] = result.campaign.donations.map((donation, index) => ({
            ...donation,
            transactionId: donation.txHash || `donation-${index}-${Date.now()}`
          }));
          
          const firstPage = extendedDonations.slice(0, donationsPerPage);
          setDonationsList(firstPage);
          setDonationsPage(1);
        }
      }
    } catch (err) {
      console.error('Error refreshing campaign after donation:', err);
    }
  }, [id, donationsPerPage]);

  // # ############################################################################ #
  // # #           SECTION 9 - DONATION SUBMIT HANDLER                            #
  // # ############################################################################ #
  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setDonationError('Please sign in to make a donation.');
      return;
    }

    if (!isInWorldApp) {
      setDonationError('Donations can only be made from within the World App.');
      return;
    }

    const numericAmount = parseFloat(donationAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setDonationError('Please enter a valid donation amount.');
      return;
    }

    if (!campaign?.ownerId) {
      setDonationError('Campaign owner address not found.');
      return;
    }

    setDonating(true);
    setDonationError(null);
    setDonationSuccess(false);

    try {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 8);
      const paymentReference = `don_${timestamp}_${random}`;

      const paymentPayload: PayCommandInput = {
        reference: paymentReference,
        to: campaign.ownerId,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(numericAmount, Tokens.WLD).toString(),
          }
        ],
        description: `Donation to ${campaign.title}`,
      };

      console.log('[CampaignDetail] Initiating MiniKit payment:', paymentPayload);

      const result = await MiniKit.commandsAsync.pay(paymentPayload);

      if (result.finalPayload?.status === 'success') {
        const transactionId = result.finalPayload.transaction_id || result.finalPayload.reference;

        if (transactionId) {
          console.log('[CampaignDetail] Payment successful, recording donation...', transactionId);

          try {
            const recordResult = await campaignService.recordDonation(
              id,
              numericAmount,
              transactionId,
              1,
              donationMessage.trim() || undefined
            );

            if (recordResult.success) {
              await handleDonationSuccess();
            } else {
              console.error('[CampaignDetail] Backend recording failed:', recordResult.error);
              setDonationError(`Payment completed successfully, but failed to record: ${recordResult.error}`);
            }
          } catch (backendError: any) {
            console.error('[CampaignDetail] Backend recording error:', backendError);
            setDonationError(`Payment completed successfully, but failed to record: ${backendError.message}`);
          }
        } else {
          console.error('[CampaignDetail] No transaction ID received from MiniKit');
          setDonationError('Payment successful but no transaction ID received.');
        }
      } else if (result.finalPayload?.status === 'error') {
        setDonationError(`Payment failed: ${result.finalPayload.error_code || 'Unknown error'}`);
      } else {
        setDonationError('Payment was cancelled or failed.');
      }
    } catch (err: any) {
      console.error('Error processing donation:', err);
      setDonationError(err.message || 'An error occurred while processing the donation.');
    } finally {
      setDonating(false);
    }
  };

  // # ############################################################################ #
  // # #           SECTION 10 - CONDITIONAL RENDERING: LOADING STATE              #
  // # ############################################################################ #
  if (loading) {
    return (
      <div style={styles.page}>
        <style>{responsiveStyles}</style>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
            <Link to="/campaigns" style={{ ...styles.button, ...styles.buttonSecondary }}>
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

  if (error) {
    return (
      <div style={styles.page}>
        <style>{responsiveStyles}</style>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
            <Link to="/campaigns" style={{ ...styles.button, ...styles.buttonSecondary }}>
              All Campaigns
            </Link>
          </div>
        </header>
        <div style={styles.container}>
          <div style={styles.errorContainer}>
            <p>{error}</p>
            <Link
              to="/campaigns"
              style={{ ...styles.button, ...styles.buttonSecondary, marginTop: '1rem' }}
            >
              Back to Campaigns
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div style={styles.page}>
        <style>{responsiveStyles}</style>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
            <Link to="/campaigns" style={{ ...styles.button, ...styles.buttonSecondary }}>
              All Campaigns
            </Link>
          </div>
        </header>
        <div style={styles.container}>
          <div style={styles.notFoundContainer}>
            <h2>Campaign Not Found</h2>
            <p>The campaign you are looking for does not exist or could not be loaded.</p>
            <Link
              to="/campaigns"
              style={{ ...styles.button, ...styles.buttonPrimary, marginTop: '1rem' }}
            >
              View All Campaigns
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // # ############################################################################ #
  // # #           SECTION 11 - CALCULATED VALUES                                 #
  // # ############################################################################ #
  const progressPercentage = campaign.goal > 0 ? Math.min(
    Math.round((campaign.raised / campaign.goal) * 100),
    100
  ) : 0;

  const totalDonations = campaign.donations ? campaign.donations.length : 0;
  const totalPages = Math.ceil(totalDonations / donationsPerPage);
  const hasNextPage = donationsPage < totalPages;
  const hasPrevPage = donationsPage > 1;

  // # ############################################################################ #
  // # #           SECTION 12 - MAIN JSX RETURN: CAMPAIGN DETAILS & DONATION      #
  // # ############################################################################ #
  return (
    <div style={styles.page}>
      <style>{responsiveStyles}</style>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
          <div>
            <Link to="/campaigns" style={{ ...styles.button, ...styles.buttonSecondary, marginRight: '0.5rem' }}>
              All Campaigns
            </Link>
            {isAuthenticated && (
              <Link to="/dashboard" style={{ ...styles.button, ...styles.buttonPrimary }}>
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
                {campaign.status}
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
                <span style={styles.progressGoal}>Goal: {campaign.goal.toLocaleString()} WLD</span>
              </div>
            </div>

            <div style={styles.divider}></div>

            {/* Donation Form Section */}
            {campaign.status === 'active' && (
              <div style={styles.donationSection}>
                <h2 style={styles.donationTitle}>Make a Donation</h2>
                {donationSuccess && (
                  <div style={styles.successMessage}>
                    Thank you for your donation!
                  </div>
                )}
                {donationError && (
                  <div style={styles.errorMessage}>
                    {donationError}
                  </div>
                )}
                {!isInWorldApp && (
                  <div style={styles.worldAppNotice}>
                    Donations can only be made from within the World App.
                  </div>
                )}
                <form style={styles.donationForm} onSubmit={handleDonationSubmit}>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="donationAmount">Amount (WLD)</label>
                    <input
                      style={styles.input}
                      id="donationAmount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={donationAmount}
                      onChange={e => setDonationAmount(e.target.value)}
                      placeholder="Enter amount"
                      disabled={donating || !isInWorldApp}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="donationMessage">Message (optional)</label>
                    <input
                      style={styles.input}
                      id="donationMessage"
                      type="text"
                      value={donationMessage}
                      onChange={e => setDonationMessage(e.target.value)}
                      placeholder="Add a message to your donation"
                      disabled={donating || !isInWorldApp}
                      maxLength={50}
                    />
                  </div>
                  <button
                    type="submit"
                    style={{
                      ...styles.donateButton,
                      ...(donating || !isAuthenticated || !isInWorldApp ? styles.donateButtonDisabled : {})
                    }}
                    disabled={donating || !isAuthenticated || !isInWorldApp}
                  >
                    {donating ? 'Processing...' : 'Donate with World App'}
                  </button>
                  
                  {!isAuthenticated && (
                    <p style={{ fontSize: '0.75rem', color: '#5f6368', marginTop: '0.5rem', textAlign: 'center' }}>
                      Please sign in to make a donation.
                    </p>
                  )}
                </form>
              </div>
            )}

            {/* Donations List Section */}
            <div style={styles.donationsListSection}>
              <h2 style={styles.donationsListTitle}>
                Recent Donations {totalDonations > 0 && `(${totalDonations})`}
              </h2>
              {donationsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#5f6368' }}>
                  No donations yet. Be the first to donate!
                </div>
              ) : (
                <>
                  {donationsList.map((donation, idx) => (
                    <div key={donation.transactionId || donation.id || `donation-${idx}`} style={styles.donationItem}>
                      <div style={styles.donorInfo}>
                        <div style={styles.donorAddress}>
                          {donation.donor ? `${donation.donor.slice(0, 6)}...${donation.donor.slice(-4)}` : 'Anonymous'}
                        </div>
                        <div style={styles.donationDate}>
                          {donation.createdAt ? new Date(donation.createdAt).toLocaleString() : ''}
                        </div>
                        {donation.message && (
                          <div style={styles.donationMessage}>
                            "{donation.message}"
                          </div>
                        )}
                      </div>
                      <div style={styles.donationAmount}>
                        +{donation.amount.toLocaleString()} WLD
                      </div>
                    </div>
                  ))}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div style={styles.paginationContainer}>
                      <button
                        style={{
                          ...styles.paginationButton,
                          ...(donationsPage === 1 ? styles.paginationButtonDisabled : {})
                        }}
                        onClick={() => handlePaginateDonations(donationsPage - 1)}
                        disabled={donationsPage === 1}
                      >
                        Previous
                      </button>
                      <span style={styles.paginationText}>
                        Page {donationsPage} of {totalPages}
                      </span>
                      <button
                        style={{
                          ...styles.paginationButton,
                          ...(donationsPage === totalPages ? styles.paginationButtonDisabled : {})
                        }}
                        onClick={() => handlePaginateDonations(donationsPage + 1)}
                        disabled={donationsPage === totalPages}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;