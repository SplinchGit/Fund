// src/pages/CampaignDetailPage.tsx

// # ############################################################################ #
// # #                     SECTION 1 - IMPORTS                                  #
// # ############################################################################ #
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { campaignService, Campaign, Donation } from '../services/CampaignService';
import { adminService } from '../services/AdminService'; // ADDED
import { MiniKit, tokenToDecimals, Tokens, PayCommandInput } from '@worldcoin/minikit-js';
import { ensService } from '../services/EnsService';

// # ############################################################################ #
// # #                     SECTION 2 - TYPE DEFINITIONS                         #
// # ############################################################################ #
// Extended Donation interface to include missing properties
interface ExtendedDonation extends Donation {
  transactionId?: string; // Optional transaction ID for unique keys
}

// # ############################################################################ #
// # #                     SECTION 3 - STYLES                                   #
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
  socialShareSection: {
    marginTop: '1.5rem',
    marginBottom: '1.5rem',
    textAlign: 'center' as const,
  },
  socialShareTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#202124',
    marginBottom: '1rem',
  },
  socialButtonsContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    flexWrap: 'wrap' as const,
  },
  socialButton: {
    padding: '0.75rem 1.25rem',
    borderRadius: '6px',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    color: 'white',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
    textDecoration: 'none',
  },
  twitterButton: {
    backgroundColor: '#1DA1F2',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  copyLinkButton: {
    backgroundColor: '#607D8B',
  },
  socialIcon: {
    marginRight: '0.5rem',
    width: '1.25rem',
    height: '1.25rem',
    fill: 'currentColor',
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
  },
  // ADMIN STYLES ADDED
  adminSection: {
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '2px solid #ea4335',
    textAlign: 'center' as const,
  },
  adminButton: {
    padding: '0.75rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'white',
    backgroundColor: '#ea4335',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
    position: 'relative' as const,
  },
  modalHeader: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#ea4335',
    marginBottom: '1rem',
    textAlign: 'center' as const,
  },
  modalWarning: {
    backgroundColor: 'rgba(234, 67, 53, 0.1)',
    border: '1px solid rgba(234, 67, 53, 0.2)',
    borderRadius: '6px',
    padding: '1rem',
    marginBottom: '1.5rem',
    color: '#ea4335',
    fontSize: '0.875rem',
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1rem',
    padding: '0.75rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
  },
  checkbox: {
    marginRight: '0.75rem',
    transform: 'scale(1.2)',
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  modalButtonCancel: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#f1f3f4',
    color: '#202124',
    border: '1px solid #dadce0',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  modalButtonConfirm: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#ea4335',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  modalButtonDisabled: {
    backgroundColor: '#adb5bd',
    color: '#e9ecef',
    cursor: 'not-allowed' as const,
  },
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
// # #           SECTION 4 - COMPONENT: DEFINITION & STATE                      #
// # ############################################################################ #
const CampaignDetail: React.FC<{ id: string }> = ({ id }) => {
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

  // Admin functionality state ADDED
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminDeleteCampaign, setAdminDeleteCampaign] = useState(false);
  const [adminBanUser, setAdminBanUser] = useState(false);
  const [adminReason, setAdminReason] = useState('');
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [adminActionSuccess, setAdminActionSuccess] = useState('');
  const [adminActionError, setAdminActionError] = useState('');

  // Social sharing state
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // # ############################################################################ #
  // # #           SECTION 9.5 - SOCIAL SHARING HANDLERS                        #
  // # ############################################################################ #
  const handleShareTwitter = useCallback(() => {
    if (!campaign) return;
    const tweetText = `Support ${campaign.title} on WorldFund!`;
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`, '_blank');
  }, [campaign]);

  const handleShareFacebook = useCallback(() => {
    if (!campaign) return;
    const url = window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  }, [campaign]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopySuccess('Link copied!');
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      setCopySuccess('Failed to copy!');
      setTimeout(() => setCopySuccess(null), 2000);
    }
  }, []);

  // # ############################################################################ #
  // # #           SECTION 5 - EFFECT: FETCH CAMPAIGN DATA                        #
  // # ############################################################################ #
  useEffect(() => {
    const fetchCampaign = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log(`[CampaignDetail] Fetching campaign: ${id}`);
        const result = await campaignService.fetchCampaign(id);

        if (result.success && result.campaign) {
          const fetchedCampaign = result.campaign;

          // Resolve ENS name for campaign owner
          if (fetchedCampaign.ownerId) {
            const ownerEns = await ensService.formatAddressOrEns(fetchedCampaign.ownerId);
            fetchedCampaign.ownerId = ownerEns; // Update ownerId to display ENS name
          }

          setCampaign(fetchedCampaign);

          // Handle donations - they should be in campaign.donations array
          if (fetchedCampaign.donations && Array.isArray(fetchedCampaign.donations)) {
            console.log(`[CampaignDetail] Found ${fetchedCampaign.donations.length} donations in campaign data`);

            // Convert to ExtendedDonation format and add transactionId if missing, and resolve donor ENS
            const extendedDonations: ExtendedDonation[] = await Promise.all(fetchedCampaign.donations.map(async (donation, index) => {
              const donorEns = donation.donor ? await ensService.formatAddressOrEns(donation.donor) : 'Anonymous';
              return {
                ...donation,
                donor: donorEns,
                transactionId: donation.txHash || `donation-${index}-${Date.now()}`
              };
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
  // # #           SECTION 6.5 - EFFECT: CHECK ADMIN STATUS                       #
  // # ############################################################################ #
  // ADDED
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (isAuthenticated) {
        try {
          const adminStatus = await adminService.checkAdminStatus();
          setIsAdmin(adminStatus);
          console.log(`[CampaignDetail] Admin status: ${adminStatus}`);
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [isAuthenticated]);

  // # ############################################################################ #
  // # #           SECTION 6 - EFFECT: CHECK WORLD APP                            #
  // # ############################################################################ #
  useEffect(() => {
    setIsInWorldApp(MiniKit.isInstalled());
  }, []);

  // # ############################################################################ #
  // # #           SECTION 7 - PAGINATION HANDLERS                                #
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
  // # #           SECTION 8 - DONATION SUCCESS HANDLER                           #
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
  // # #            SECTION 9 - DONATION SUBMIT HANDLER                             #
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
  
    // 🔥 ENFORCE 1 WLD MINIMUM - Updated validation
    if (isNaN(numericAmount) || numericAmount < 1) {
      setDonationError('Minimum donation amount is 1 WLD.');
      return;
    }

    if (!campaign?.ownerId) {
      setDonationError('Campaign owner address not found.');
      return;
    }

    // Rest of your donation logic...
    setDonating(true);
    setDonationError(null);
    setDonationSuccess(false);

    try {
      // Your existing MiniKit payment logic
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
              480,
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
  // # #           SECTION 11.5 - ADMIN ACTION HANDLERS                           #
  // # ############################################################################ #
  // ADDED
  const handleAdminModalOpen = () => {
    setShowAdminModal(true);
    setAdminDeleteCampaign(true);
    setAdminBanUser(false);
    setAdminReason('');
    setAdminActionSuccess('');
    setAdminActionError('');
  };

  const handleAdminModalClose = () => {
    setShowAdminModal(false);
    setAdminDeleteCampaign(false);
    setAdminBanUser(false);
    setAdminReason('');
    setAdminActionSuccess('');
    setAdminActionError('');
  };

  const handleAdminActions = async () => {
    if (!adminDeleteCampaign && !adminBanUser) {
      setAdminActionError('Please select at least one action.');
      return;
    }

    setAdminActionLoading(true);
    setAdminActionError('');
    setAdminActionSuccess('');

    try {
      const summary = await adminService.performAdminActions(
        id,
        campaign?.ownerId || '',
        {
          deleteCampaign: adminDeleteCampaign,
          banUser: adminBanUser,
          reason: adminReason
        }
      );

      const actions = [];
      if (summary.campaignDeleted) actions.push('Campaign deleted');
      if (summary.userBanned) actions.push('User banned');
      
      if (summary.campaignDeleteError) {
        setAdminActionError(`Delete failed: ${summary.campaignDeleteError}`);
        return;
      }
      if (summary.banError) {
        setAdminActionError(`Ban failed: ${summary.banError}`);
        return;
      }

      setAdminActionSuccess(actions.join(', ') + ' successfully.');
      
      setTimeout(() => {
        navigate('/campaigns');
      }, 2000);
      
    } catch (error: any) {
      console.error('Admin action error:', error);
      setAdminActionError(error.message || 'Failed to execute admin actions.');
    } finally {
      setAdminActionLoading(false);
    }
  };

  // # ############################################################################ #
  // # #           SECTION 10 - CONDITIONAL RENDERING: LOADING STATE              #
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
  // # #           SECTION 11 - CALCULATED VALUES                                 #
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
  // # #           SECTION 12 - MAIN JSX RETURN: CAMPAIGN DETAILS & DONATION      #
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
              <span>Created by: {campaign.ownerId || 'N/A'}</span>
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

            {/* Social Share Section */}
            <div style={styles.socialShareSection}>
              <h2 style={styles.socialShareTitle}>Share This Campaign</h2>
              <div style={styles.socialButtonsContainer}>
                <button
                  style={{ ...styles.socialButton, ...styles.twitterButton }}
                  onClick={handleShareTwitter}
                >
                  <svg style={styles.socialIcon} viewBox="0 0 24 24"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.37-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.4 7.5 3.53 4.73c-.36.62-.56 1.35-.56 2.14 0 1.48.75 2.79 1.91 3.56-.7-.02-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.81 3.44 4.2-.36.1-.74.15-1.13.15-.28 0-.55-.03-.81-.08 1.46 4.28 5.68 7.4 10.65 7.4-4.67 3.67-10.5 5.85-16.9 5.85-1.1 0-2.16-.06-3.2-.18C2.8 20.8 8.3 23 14.2 23c6.2 0 11.6-4.07 11.6-11.47 0-.17 0-.34-.01-.51.8-.58 1.49-1.3 2.04-2.13z"/></svg>
                  Share on Twitter
                </button>
                <button
                  style={{ ...styles.socialButton, ...styles.facebookButton }}
                  onClick={handleShareFacebook}
                >
                  <svg style={styles.socialIcon} viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                  Share on Facebook
                </button>
                <button
                  style={{ ...styles.socialButton, ...styles.copyLinkButton }}
                  onClick={handleCopyLink}
                >
                  <svg style={styles.socialIcon} viewBox="0 0 24 24"><path d="M16 1H8C6.34 1 5 2.34 5 4v14c0 1.66 1.34 3 3 3h8c1.66 0 3-1.34 3-3V4c0-1.66-1.34-3-3-3zm-2 14h-4v-2h4v2zm0-4h-4V9h4v2zm0-4h-4V5h4v2z"/></svg>
                  Copy Link
                </button>
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
                      min="1"        // 🔥 Updated from "0.01" to "1"
                      step="0.01"
                      value={donationAmount}
                      onChange={e => setDonationAmount(e.target.value)}
                      placeholder="Minimum 1 WLD"  // 🔥 Updated placeholder
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
                          {donation.donor || 'Anonymous'}
                        </div>
                        <div style={styles.donationDate}>
                          {donation.createdAt ? new Date(donation.createdAt).toLocaleString() : ''}
                        </div>
                        {donation.message && donation.message.trim() && (
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

        {/* Admin Section */}
        {isAdmin && (
          <div style={styles.adminSection}>
            <button
              style={styles.adminButton}
              onClick={handleAdminModalOpen}
            >
              ⚠️ Admin Functions
            </button>
          </div>
        )}

        {/* Admin Modal */}
        {showAdminModal && (
          <div style={styles.modalOverlay} onClick={handleAdminModalClose}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>⚠️ WARNING: ADMIN FUNCTIONS</div>
              
              <div style={styles.modalWarning}>
                <strong>Campaign:</strong> {campaign?.title}<br/>
                <strong>Owner:</strong> {campaign?.ownerId || 'N/A'}
              </div>

              {adminActionSuccess && (
                <div style={styles.successMessage}>
                  {adminActionSuccess}
                </div>
              )}
              
              {adminActionError && (
                <div style={styles.errorMessage}>
                  {adminActionError}
                </div>
              )}

              <div style={styles.checkboxContainer}>
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={adminDeleteCampaign}
                  onChange={(e) => setAdminDeleteCampaign(e.target.checked)}
                  disabled={adminActionLoading}
                />
                <label>Delete this campaign</label>
              </div>

              <div style={styles.checkboxContainer}>
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={adminBanUser}
                  onChange={(e) => setAdminBanUser(e.target.checked)}
                  disabled={adminActionLoading}
                />
                <label>Also ban user: {campaign?.ownerId ? `${campaign.ownerId.slice(0, 6)}...${campaign.ownerId.slice(-4)}` : 'N/A'}</label>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Reason (optional):</label>
                <input
                  style={styles.input}
                  type="text"
                  value={adminReason}
                  onChange={(e) => setAdminReason(e.target.value)}
                  placeholder="Enter reason for admin action"
                  disabled={adminActionLoading}
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  style={styles.modalButtonCancel}
                  onClick={handleAdminModalClose}
                  disabled={adminActionLoading}
                >
                  Cancel
                </button>
                <button
                  style={{
                    ...styles.modalButtonConfirm,
                    ...(adminActionLoading ? styles.modalButtonDisabled : {})
                  }}
                  onClick={handleAdminActions}
                  disabled={adminActionLoading || (!adminDeleteCampaign && !adminBanUser)}
                >
                  {adminActionLoading ? 'Processing...' : 'Confirm Admin Actions'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignDetail;