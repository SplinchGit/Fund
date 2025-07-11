// src/pages/LandingPage.tsx - PAGINATION FIX ONLY
// (MODIFIED to fix carousel pagination dots with enhanced error handling)

// # ############################################################################ #
// # #                           SECTION 1 - IMPORTS                           #
// # ############################################################################ #
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
// Ensure CampaignData from CampaignService includes 'category'
import { campaignService, Campaign as CampaignData } from '../services/CampaignService';
// FIXED: Import from the correct path
import { triggerMiniKitWalletAuth } from '../utils/minikit';
// ADDED: Import the type for proper typing
import { MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';
import { ensService } from '../services/EnsService';

// Import Swiper React components and styles
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, A11y } from 'swiper/modules'; // REMOVED: Navigation

import 'swiper/css';
// import 'swiper/css/navigation'; // REMOVED: Navigation CSS import
import 'swiper/css/pagination';

// # ############################################################################ #
// # #                        SECTION 2 - CONSTANTS & TYPES                        #
// # ############################################################################ #
// Define categories (or import from a shared constants file)
const PREDEFINED_CATEGORIES = [
    "Technology & Innovation",
    "Creative Works",
    "Community & Social Causes",
    "Small Business & Entrepreneurship",
    "Health & Wellness",
    "Other"
];
const ALL_CATEGORIES_FILTER_OPTION = "All Categories";

// Interface for campaign display data
interface CampaignDisplay extends CampaignData {
    creator: string;
    isVerified: boolean;
    progressPercentage: number;
    category: string;
}

// # ############################################################################ #
// # #           SECTION 3 - COMPONENT: PAGE DEFINITION & INITIALIZATION           #
// # ############################################################################ #
const LandingPage: React.FC = () => {
    // # ############################################################################ #
    // # #                   SECTION 4 - COMPONENT: ENVIRONMENT LOGGING                   #
    // # ############################################################################ #
    useEffect(() => {
        console.log('[LandingPage] Environment variables:', {
            VITE_AMPLIFY_API: import.meta.env.VITE_AMPLIFY_API,
            VITE_APP_BACKEND_API_URL: import.meta.env.VITE_APP_BACKEND_API_URL,
            MODE: import.meta.env.MODE,
            DEV: import.meta.env.DEV
        });
    }, []);

    // # ############################################################################ #
    // # #                   SECTION 5 - COMPONENT: HOOKS & STATE                   #
    // # ############################################################################ #
    const { isAuthenticated, walletAddress, loginWithWallet, getNonceForMiniKit, isLoading: authIsLoading, error: authError } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // State management
    const [campaigns, setCampaigns] = useState<CampaignDisplay[]>([]);
    const [loadingCampaigns, setLoadingCampaigns] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);
    const [isConnectingWallet, setIsConnectingWallet] = useState(false);
    const [connectionAttempts, setConnectionAttempts] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>(ALL_CATEGORIES_FILTER_OPTION);

    // # ############################################################################ #
    // # #                   SECTION 6 - FILTER FUNCTIONALITY                   #
    // # ############################################################################ #
    // Search filter will apply ON TOP of the category-filtered data fetched from backend
    const filteredCampaignsBySearch = useMemo(() => {
        if (!searchQuery) {
            return campaigns; // 'campaigns' state is already category-filtered from API
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return campaigns.filter(campaign =>
            campaign.title.toLowerCase().includes(lowercasedQuery) ||
            (campaign.description && campaign.description.toLowerCase().includes(lowercasedQuery))
        );
    }, [campaigns, searchQuery]);

    // # ############################################################################ #
    // # #                 SECTION 7 - EFFECT: AUTH ERROR HANDLING                 #
    // # ############################################################################ #
    useEffect(() => {
        if (authError) {
            console.log('[LandingPage] AuthContext error:', authError);
            setPageError(authError);
        }
    }, [authError]);

    // # ############################################################################ #
    // # #                 SECTION 8 - EFFECT: AUTH STATUS LOGGING                 #
    // # ############################################################################ #
    useEffect(() => {
        console.log('[LandingPage] Auth state from context changed:', {
            isAuthenticated,
            walletAddress: walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : null,
            authIsLoading
        });
    }, [isAuthenticated, walletAddress, authIsLoading]);

    // ############################################################################ #
    // # #                 SECTION 9 - ENHANCED USERNAME RESOLUTION FUNCTION                 #
    // ############################################################################ #
    const resolveUserIdentity = async (address: string): Promise<{ username: string; isVerified: boolean }> => {
        console.log(`[LandingPage] Resolving identity for: ${address}`);

        try {
            // Priority 1: World ID via MiniKit
            if (typeof window !== 'undefined' && (window as any).MiniKit) {
                try {
                    const MiniKit = (window as any).MiniKit;
                    if (MiniKit.getUserByAddress && typeof MiniKit.getUserByAddress === 'function') {
                        const worldIdUser = await MiniKit.getUserByAddress(address);
                        if (worldIdUser?.username) {
                            console.log(`[LandingPage] Found World ID username: ${worldIdUser.username}`);
                            return {
                                username: worldIdUser.username,
                                isVerified: true
                            };
                        }
                    }
                } catch (error) {
                    console.warn(`[LandingPage] World ID lookup failed for ${address}:`, error);
                }
            }

            // Priority 2: ENS resolution
            try {
                const ensName = await ensService.lookupEnsAddress(address);
                if (ensName) {
                    console.log(`[LandingPage] Found ENS name: ${ensName}`);
                    return {
                        username: ensName,
                        isVerified: false
                    };
                }
            } catch (error) {
                console.warn(`[LandingPage] ENS lookup failed for ${address}:`, error);
            }

            // Priority 3: Check if it's already a known username (not an address)
            if (!address.startsWith('0x') && address.length < 42) {
                return {
                    username: address,
                    isVerified: false
                };
            }

            // Fallback: Truncated address
            const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;
            console.log(`[LandingPage] Using truncated address: ${truncated}`);
            return {
                username: truncated,
                isVerified: false
            };

        } catch (error) {
            console.error(`[LandingPage] Error resolving identity for ${address}:`, error);
            return {
                username: `${address.slice(0, 6)}...${address.slice(-4)}`,
                isVerified: false
            };
        }
    };

    // # ############################################################################ #
    // # #                 SECTION 10 - EFFECT: FETCH CAMPAIGNS (ENHANCED)                 #
    // # ############################################################################ #
    useEffect(() => {
        const fetchCampaignsData = async () => {
            console.log(`[LandingPage] Starting campaign fetch for category: ${selectedFilterCategory}`);
            setLoadingCampaigns(true);
            setPageError(null);

            try {
                // Skip API call in test mode
                if (import.meta.env.MODE === 'test') {
                    console.log('[LandingPage] Test mode detected, skipping API call');
                    setCampaigns([]);
                    setLoadingCampaigns(false);
                    return;
                }

                // Verify API configuration
                const apiBase = import.meta.env.VITE_AMPLIFY_API;
                if (!apiBase) {
                    throw new Error('API configuration missing. Please check VITE_AMPLIFY_API environment variable.');
                }

                // Pass category to service if it's not "All Categories"
                const categoryToFetch = selectedFilterCategory === ALL_CATEGORIES_FILTER_OPTION
                    ? undefined
                    : selectedFilterCategory;

                console.log('[LandingPage] Calling campaignService.fetchAllCampaigns with category:', categoryToFetch || 'all');

                // Call the campaign service
                const result = await campaignService.fetchAllCampaigns(categoryToFetch);

                console.log('[LandingPage] Campaign service result:', {
                    success: result.success,
                    campaignCount: result.campaigns ? result.campaigns.length : 0,
                    error: result.error
                });

                if (result.success && result.campaigns) {
                    // Add this debug code right after you get the campaigns from the service:
                    console.log('[DEBUG] Raw campaigns from service:', result.campaigns.map(c => ({
                        id: c.id,
                        title: c.title,
                        ownerId: c.ownerId,
                        ownerIdType: typeof c.ownerId,
                        ownerIdLength: c.ownerId?.length
                    })));

                    // Replace your current campaign transformation with this:
                    const displayCampaigns: CampaignDisplay[] = await Promise.all(
                        result.campaigns.map(async campaign => {
                            console.log(`[DEBUG] Processing campaign ${campaign.id} with ownerId: ${campaign.ownerId}`);
                            const identity = await resolveUserIdentity(campaign.ownerId);
                            console.log(`[DEBUG] Resolved creator: ${identity.username} (original: ${campaign.ownerId})`);

                            return {
                                ...campaign,
                                creator: identity.username,
                                isVerified: identity.isVerified,
                                progressPercentage: campaign.goal > 0 ?
                                    Math.min(Math.round((campaign.raised / campaign.goal) * 100), 100) : 0,
                            };
                        })
                    );

                    console.log('[DEBUG] Final display campaigns:', displayCampaigns.map(c => ({
                        id: c.id,
                        title: c.title,
                        creator: c.creator,
                        isVerified: c.isVerified
                    })));

                    setCampaigns(displayCampaigns);
                    console.log('[LandingPage] Campaigns processed and set successfully:', displayCampaigns.length);

                    // Clear any previous errors
                    setPageError(null);
                } else {
                    const campaignError = result.error || 'Failed to load campaigns';
                    console.error('[LandingPage] Campaign service error:', campaignError);
                    setPageError(campaignError);
                }
            } catch (err) {
                console.error('[LandingPage] Exception while fetching campaigns:', err);

                // Provide user-friendly error messages
                let userFriendlyError = 'An unknown error occurred while loading campaigns.';
                if (err instanceof Error) {
                    if (err.message.includes('Failed to fetch')) {
                        userFriendlyError = 'Network connection failed. Please check your internet connection and try again.';
                    } else if (err.message.includes('CORS')) {
                        userFriendlyError = 'Unable to connect to the server. Please try again later.';
                    } else if (err.message.includes('timeout')) {
                        userFriendlyError = 'Request timed out. Please check your connection and try again.';
                    } else {
                        userFriendlyError = err.message;
                    }
                }

                setPageError(userFriendlyError);
            } finally {
                setLoadingCampaigns(false);
            }
        };

        fetchCampaignsData();
    }, [selectedFilterCategory]);

    // # ############################################################################ #
    // # #                 SECTION 11 - CALLBACK: CONNECT WALLET                 #
    // # ############################################################################ #
    const handleConnectWallet = useCallback(async () => {
        if (isConnectingWallet || authIsLoading) {
            console.log('[LandingPage] handleConnectWallet: Already connecting or auth is loading. Aborting.');
            return;
        }

        console.log('[LandingPage] handleConnectWallet: Starting wallet connection flow...');
        setIsConnectingWallet(true);
        setPageError(null);
        setConnectionAttempts(prev => prev + 1);

        try {
            if (import.meta.env.DEV && (window as any).__triggerWalletAuth) {
                console.log("[LandingPage] handleConnectWallet: Using window.__triggerWalletAuth (debug mode)");
                const success = await (window as any).__triggerWalletAuth();
                if (!success) {
                    console.error('[LandingPage] handleConnectWallet: window.__triggerWalletAuth returned false.');
                    throw new Error('Wallet authentication via debug trigger failed. Check console.');
                }
            } else {
                console.log("[LandingPage] API URL check:", {
                    VITE_AMPLIFY_API: import.meta.env.VITE_AMPLIFY_API,
                    VITE_APP_BACKEND_API_URL: import.meta.env.VITE_APP_BACKEND_API_URL
                });

                console.log("[LandingPage] handleConnectWallet: Fetching nonce for MiniKit auth...");
                let serverNonce: string;
                try {
                    serverNonce = await getNonceForMiniKit();
                    console.log("[LandingPage] handleConnectWallet: Nonce received:", serverNonce);
                } catch (nonceError) {
                    console.error("[LandingPage] Failed to get nonce:", nonceError);
                    throw new Error(`Failed to get authentication nonce: ${nonceError instanceof Error ? nonceError.message : 'Unknown error'}`);
                }

                if (!serverNonce) throw new Error("Server didn't return a valid nonce");

                console.log("[LandingPage] handleConnectWallet: Calling triggerMiniKitWalletAuth with fetched nonce...");
                // FIXED: Added proper typing for authPayload
                let authPayload: MiniAppWalletAuthSuccessPayload;
                try {
                    authPayload = await triggerMiniKitWalletAuth(serverNonce);
                    console.log("[LandingPage] handleConnectWallet: Auth payload received:", authPayload ? "Valid payload" : "Invalid/empty payload");
                } catch (walletError) {
                    console.error("[LandingPage] Wallet auth failed:", walletError);
                    throw new Error(`Wallet authentication failed: ${walletError instanceof Error ? walletError.message : 'Unknown error'}`);
                }

                if (!authPayload) throw new Error("Wallet didn't return a valid authentication payload");

                console.log("[LandingPage] handleConnectWallet: MiniKit auth success, calling loginWithWallet from AuthContext.");
                try {
                    await loginWithWallet(authPayload);
                } catch (loginError) {
                    console.error("[LandingPage] Login with wallet failed:", loginError);
                    throw new Error(`Login failed: ${loginError instanceof Error ? loginError.message : 'Unknown error'}`);
                }
            }

            console.log("[LandingPage] handleConnectWallet: Wallet connection and login process successfully completed.");
        } catch (error) {
            console.error("[LandingPage] handleConnectWallet: Error during wallet connection/login process:", error);
            let userErrorMessage = "Connection failed";
            if (error instanceof Error) {
                userErrorMessage = error.message.includes("https://") ? "API connection error. Please try again or contact support." : error.message;
            }
            setPageError(userErrorMessage);
            if (connectionAttempts > 2) setPageError(`${userErrorMessage}. You may need to refresh the page.`);
        } finally {
            setIsConnectingWallet(false);
        }
    }, [isConnectingWallet, authIsLoading, getNonceForMiniKit, loginWithWallet, connectionAttempts]);

    // # ############################################################################ #
    // # #               SECTION 12 - CALLBACK: ACCOUNT NAVIGATION               #
    // # ############################################################################ #
    const handleAccountNavigation = useCallback(async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        console.log('[LandingPage] handleAccountNavigation: Clicked. Auth state:', { isAuthenticated, authIsLoading });
        if (authIsLoading) {
            console.log('[LandingPage] handleAccountNavigation: Auth state is loading. Please wait.');
            return;
        }
        if (isAuthenticated) {
            console.log('[LandingPage] handleAccountNavigation: User is authenticated. Navigating to /dashboard.');
            navigate('/dashboard', { replace: true });
        } else {
            console.log('[LandingPage] handleAccountNavigation: User is NOT authenticated. Initiating connect wallet flow.');
            await handleConnectWallet();
        }
    }, [isAuthenticated, authIsLoading, navigate, handleConnectWallet]);

    // # ############################################################################ #
    // # #           SECTION 13 - CALLBACK: DASHBOARD HEADER NAVIGATION           #
    // # ############################################################################ #
    const goToDashboardHeader = useCallback(() => {
        console.log('[LandingPage] goToDashboardHeader: Navigating to /dashboard.');
        navigate('/dashboard', { replace: true });
    }, [navigate]);

    // # ############################################################################ #
    // # #                       SECTION 14 - HELPER FUNCTIONS                       #
    // # ############################################################################ #
    const isActivePath = (path: string, locationPathname: string): boolean => locationPathname === path || (path === '/' && locationPathname === '/landing') || (path === '/campaigns' && (locationPathname === '/campaigns' || locationPathname.startsWith('/campaigns/')));

    const formatAddressForDisplay = async (address: string): Promise<string> => {
        return await ensService.formatAddressOrEns(address);
    };

    // # ############################################################################ #
    // # #                     SECTION 15 - INLINE STYLES OBJECT                     #
    // # ############################################################################ #
    const styles: { [key: string]: React.CSSProperties } = {
        page: { textAlign: 'center' as const, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif', color: '#202124', backgroundColor: '#ffffff', margin: 0, padding: 0, overflowX: 'hidden' as const, width: '100vw', minHeight: '100%', display: 'flex', flexDirection: 'column' as const, boxSizing: 'border-box' as const, },
        container: { margin: '0 auto', width: '100%', padding: '0 0.5rem 6rem 0.5rem', boxSizing: 'border-box' as const, maxWidth: '1200px', flexGrow: 1, display: 'flex', flexDirection: 'column' as const, },
        header: { background: 'white', padding: '0.5rem 0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'sticky' as const, top: 0, zIndex: 100, width: '100%', boxSizing: 'border-box' as const, },
        headerContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto', padding: '0 0.5rem', boxSizing: 'border-box' as const, },
        logo: { display: 'flex', alignItems: 'center', color: '#1a73e8', fontWeight: 700, fontSize: '1.125rem', textDecoration: 'none' },
        logoSpan: { color: '#202124' },
        navActionsContainer: { display: 'flex', alignItems: 'center', },
        navItem: { marginLeft: '1rem', marginRight: '1rem', fontSize: '0.875rem', color: '#5f6368', textDecoration: 'none', transition: 'color 0.2s' },
        button: { padding: '0.5rem 0.75rem', borderRadius: '0.25rem', fontWeight: 500, cursor: 'pointer', textDecoration: 'none', textAlign: 'center' as const, fontSize: '0.875rem', transition: 'background-color 0.2s, border-color 0.2s', border: '1px solid transparent', minHeight: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 },
        buttonPrimary: { backgroundColor: '#1a73e8', color: 'white', borderColor: '#1a73e8' },
        buttonSecondary: { backgroundColor: '#f1f3f4', color: '#202124', borderColor: '#dadce0' },
        hero: {
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
            padding: '2rem 1rem 3rem',
            textAlign: 'center' as const,
            width: '100%',
            boxSizing: 'border-box' as const,
            marginBottom: '1rem',
            color: 'white',
        },
        heroTitle: { fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', padding: 0, textShadow: '0 2px 4px rgba(0,0,0,0.2)' },
        heroSubtitle: { fontSize: '1.25rem', margin: '0 auto 1.5rem', maxWidth: '800px', padding: 0, opacity: 0.9 },
        searchAndFilterContainer: {
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '1rem',
            margin: '0.5rem auto 1.5rem auto',
            width: '100%',
            maxWidth: '500px',
            padding: '0 0.5rem',
            boxSizing: 'border-box' as const,
        },
        searchInput: { width: '100%', padding: '0.75rem 1rem', fontSize: '1rem', border: '1px solid #dadce0', borderRadius: '2rem', boxSizing: 'border-box' as const, transition: 'border-color 0.2s, box-shadow 0.2s', },
        categoryFilterSelect: {
            width: '100%',
            padding: '0.75rem 1rem',
            fontSize: '1rem',
            border: '1px solid #dadce0',
            borderRadius: '2rem',
            boxSizing: 'border-box' as const,
            backgroundColor: 'white',
            appearance: 'none' as const,
            backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%235f6368%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22/%3E%3C/svg%3E')`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem center',
            backgroundSize: '0.65em auto',
            paddingRight: '2.5rem',
        },
        campaignsSection: { padding: '0.5rem 0 2rem', flexGrow: 1, width: '100%', boxSizing: 'border-box' as const, },
        sectionHeader: { textAlign: 'center' as const, marginBottom: '1rem' },
        sectionTitle: { fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', padding: 0, color: '#202124' },
        sectionSubtitle: { color: '#5f6368', fontSize: '1.1rem', margin: '0 auto 1.5rem', padding: 0, maxWidth: '700px' },
        swiperContainer: { width: '100%', flexGrow: 1, minHeight: 0, padding: '0.5rem 0', position: 'relative' as const, },
        swiperSlide: { display: 'flex', justifyContent: 'center', alignItems: 'stretch', padding: '0 0.25rem', boxSizing: 'border-box' as const, },
        campaignCard: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 6px 20px rgba(0,0,0,0.15)', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s', display: 'flex', flexDirection: 'column' as const, width: '100%', height: 'auto', boxSizing: 'border-box' as const, },
        cardImage: { width: '100%', height: '180px', objectFit: 'cover' as const },
        noImagePlaceholder: { width: '100%', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f3f4', color: '#9aa0a6', fontSize: '0.875rem', boxSizing: 'border-box' as const },
        cardContent: { padding: '1.25rem', textAlign: 'left' as const, flexGrow: 1, display: 'flex', flexDirection: 'column' as const, boxSizing: 'border-box' as const },
        cardTitle: { fontSize: '1.25rem', fontWeight: 700, color: '#202124', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
        cardDescription: { fontSize: '0.9rem', color: '#5f6368', marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden', textOverflow: 'ellipsis', minHeight: 'calc(3 * 1.5 * 0.875rem)', lineHeight: 1.5, flexGrow: 1 },
        cardCategory: {
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-primary)',
            backgroundColor: 'rgba(66, 133, 244, 0.1)',
            padding: '0.3rem 0.6rem',
            borderRadius: '4px',
            display: 'inline-block',
            marginBottom: '0.6rem',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
        },
        progressBar: { width: '100%', height: '8px', backgroundColor: '#e9ecef', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.6rem', marginTop: 'auto' },
        progressFill: { height: '100%', backgroundColor: 'var(--color-secondary)', borderRadius: '4px', transition: 'width 0.4s ease-in-out' },
        progressStats: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#5f6368', fontWeight: 500, marginBottom: '0.8rem' },
        cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1.25rem', borderTop: '1px solid #f1f3f4', backgroundColor: '#fcfcfc', boxSizing: 'border-box' as const, marginTop: 'auto' },
        creatorInfo: { fontSize: '0.8rem', color: '#5f6368', display: 'flex', alignItems: 'center' },
        creatorAvatar: { width: '1.5rem', height: '1.5rem', borderRadius: '50%', backgroundColor: '#e5e7eb', marginRight: '0.4rem', display: 'inline-block' },
        verifiedBadge: { display: 'inline-flex', alignItems: 'center', backgroundColor: 'rgba(52, 168, 83, 0.1)', color: 'var(--color-secondary)', fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '0.15rem', marginLeft: '0.3rem', fontWeight: 600 },
        viewButton: { fontSize: '0.85rem', padding: '0.4rem 0.9rem', backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: '6px', textDecoration: 'none', transition: 'background-color 0.2s' },
        tabs: { display: 'flex', justifyContent: 'space-around', backgroundColor: '#fff', borderTop: '1px solid #e0e0e0', position: 'fixed' as const, bottom: 0, left: 0, width: '100%', zIndex: 100, padding: '0.75rem 0', boxShadow: '0 -1px 3px rgba(0,0,0,0.1)', boxSizing: 'border-box' as const, },
        tab: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', fontSize: '0.65rem', color: '#5f6368', textDecoration: 'none', padding: '0.1rem 0.5rem', flexGrow: 1, textAlign: 'center' as const, transition: 'color 0.2s' },
        tabActive: { color: 'var(--color-primary)' },
        tabIcon: { width: '1.2rem', height: '1.2rem', marginBottom: '0.15rem' },
        legalNotice: {
            fontSize: '0.75rem',
            color: '#5f6368',
            padding: '1.5rem 1rem',
            marginTop: '0.5rem',
            marginBottom: '4.5rem',
            borderTop: '1px solid #eee',
            width: '100%',
            boxSizing: 'border-box' as const,
            textAlign: 'center' as const,
        },
        errorMessage: { textAlign: 'center' as const, padding: '1rem', backgroundColor: 'rgba(234, 67, 53, 0.1)', border: '1px solid rgba(234, 67, 53, 0.2)', borderRadius: '8px', color: '#c53929', margin: '1rem auto', fontSize: '0.9rem', maxWidth: '1200px', boxSizing: 'border-box' as const, },
        emptyStateContainer: { display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', alignItems: 'center', padding: '4rem 1rem', textAlign: 'center' as const, color: '#5f6368', flexGrow: 1, minHeight: '300px', boxSizing: 'border-box' as const, },
    };

    // # ############################################################################ #
    // # #                     SECTION 16 - RESPONSIVE STYLES                     #
    // # ############################################################################ #
    const responsiveStyles = `
    html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow-x: hidden; font-family: ${styles.page?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif'}; box-sizing: border-box; }
    *, *::before, *::after { box-sizing: inherit; }
    input[type="search"]::-webkit-search-cancel-button { -webkit-appearance: none; appearance: none; height: 1em; width: 1em; margin-left: .25em; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23777'%3e%3cpath d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/%3e%3c/svg>"); background-size: 1em 1em; cursor: pointer; }
    /* Swiper pagination dots - fixed to be small and circular */
    .swiper-pagination-bullet {
      background-color: #cccccc !important;
      opacity: 1 !important;
      width: 6px !important;
      height: 6px !important;
      margin: 0 3px !important;
      border-radius: 50% !important;
      display: inline-block !important;
      transition: all 0.2s ease !important;
    }

    .swiper-pagination-bullet-active {
      background-color: #1a73e8 !important;
      width: 8px !important;
      height: 8px !important;
      transform: scale(1.2) !important;
    }

    .swiper-pagination {
      bottom: 10px !important;
      position: absolute !important;
      text-align: center !important;
      width: 100% !important;
    }
    
    /* Fix for dynamic bullets if enabled */
    .swiper-pagination-bullets-dynamic .swiper-pagination-bullet-active-main {
      width: 8px !important;
      height: 8px !important;
    }
    
    /* Ensure bullets maintain circular shape in horizontal mode */
    .swiper-horizontal > .swiper-pagination-bullets .swiper-pagination-bullet,
    .swiper-pagination-horizontal.swiper-pagination-bullets .swiper-pagination-bullet {
      margin: 0 4px !important;
      width: 6px !important;
      height: 6px !important;
    }

    .swiper-button-next, .swiper-button-prev {
      color: #1a73e8 !important;
      transform: scale(0.7);
    }

    .swiper-slide {
      overflow: hidden;
    }
    select:focus { border-color: #1a73e8; box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.2); outline: none; }
    `;

    // # ############################################################################ #
    // # #             SECTION 17 - INNER COMPONENT: CAMPAIGN CARD             #
    // # ############################################################################ #
    const CampaignCardComponent: React.FC<{ campaign: CampaignDisplay }> = ({ campaign }) => {
        return (
            <Link to={`/campaigns/${campaign.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div style={styles.campaignCard}>
                    {campaign.image ? (
                        <img
                            src={campaign.image}
                            alt={campaign.title}
                            style={styles.cardImage}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/400x180/e5e7eb/9aa0a6?text=Img+Error';
                            }}
                        />
                    ) : (
                        <div style={styles.noImagePlaceholder}>No Image</div>
                    )}
                    <div style={styles.cardContent}>
                        {campaign.category && (
                            <div style={styles.cardCategory}>{campaign.category}</div>
                        )}
                        <h3 style={styles.cardTitle}>{campaign.title}</h3>
                        <p style={styles.cardDescription}>{campaign.description || 'No description provided.'}</p>
                        <div style={styles.progressBar}>
                            <div style={{ ...styles.progressFill, width: `${campaign.progressPercentage}%` }}></div>
                        </div>
                        <div style={styles.progressStats}>
                            <span>{campaign.raised.toLocaleString()} / {campaign.goal.toLocaleString()} WLD</span>
                            <span>{campaign.progressPercentage}%</span>
                        </div>
                    </div>
                    <div style={styles.cardFooter}>
                        <div style={styles.creatorInfo}>
                            <span style={styles.creatorAvatar}></span>
                            <span>{campaign.creator}</span>
                            {campaign.isVerified && (
                                <span style={styles.verifiedBadge}>Verified</span>
                            )}
                        </div>
                    </div>
                </div>
            </Link>
        );
    };

    // # ############################################################################ #
    // # #             SECTION 18 - JSX RETURN: PAGE STRUCTURE & CONTENT             #
    // # ############################################################################ #

    // Swiper debug log as in your original code
    console.log('SWIPER_DEBUG (LandingPage):', {
        loadingCampaigns,
        pageError,
        campaignsCount: campaigns.length,
        filteredCampaignsCount: filteredCampaignsBySearch.length,
        firstFilteredCampaign: filteredCampaignsBySearch.length > 0 ? filteredCampaignsBySearch[0] : undefined
    });

    const categoryFilterOptions = [ALL_CATEGORIES_FILTER_OPTION, ...PREDEFINED_CATEGORIES];

    return (
        <div style={styles.page}>
            <style>{responsiveStyles}</style>

            {/* Header Section */}
            <header style={styles.header}>
                <div style={styles.headerContent}>
                    <Link to="/" style={styles.logo}>
                        Fund<span style={styles.logoSpan}></span> {/* CHANGED: To Fund */}
                    </Link>
                    <div style={styles.navActionsContainer}>
                        {isAuthenticated ? (
                            <>
                                <Link to="/dashboard" style={styles.navItem}>Dashboard</Link>
                                <Link
                                    to="/new-campaign"
                                    style={{ ...styles.button, ...styles.buttonPrimary, marginLeft: '1rem' }}
                                >
                                    Create Campaign
                                </Link>
                            </>
                        ) : (
                            <button
                                onClick={handleConnectWallet}
                                disabled={isConnectingWallet || authIsLoading}
                                style={{
                                    ...styles.button,
                                    ...styles.buttonPrimary,
                                    ...(isConnectingWallet || authIsLoading ? { opacity: 0.7, cursor: 'not-allowed' as const } : {})
                                }}
                            >
                                {(isConnectingWallet || authIsLoading) ? 'Connecting...' : 'Connect Wallet'}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section style={styles.hero}>
                <h1 style={styles.heroTitle}>Support Global Initiatives</h1>
                <p style={styles.heroSubtitle}>
                    Fund projects that make a difference with transparent and secure donations.
                </p>

                {/* Search and Category Filter */}
                <div style={styles.searchAndFilterContainer}>
                    <input
                        type="search"
                        placeholder="Search campaigns by title or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={styles.searchInput}
                    />
                    <select
                        value={selectedFilterCategory}
                        onChange={(e) => setSelectedFilterCategory(e.target.value)}
                        style={styles.categoryFilterSelect}
                    >
                        {categoryFilterOptions.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                </div>
            </section>

            {/* Main Content Section */}
            <main style={styles.campaignsSection}>
                <div style={styles.container}>
                    <div style={styles.sectionHeader}>
                        <h2 style={styles.sectionTitle}>Explore Campaigns</h2>
                        <p style={styles.sectionSubtitle}>
                            Swipe through projects making a difference.
                        </p>
                    </div>

                    {/* Campaign Content */}
                    {loadingCampaigns ? (
                        <div style={styles.emptyStateContainer}>
                            <div>Loading campaigns...</div>
                        </div>
                    ) : pageError ? (
                        <div style={styles.errorMessage}>
                            <p>{pageError}</p>
                            {typeof pageError === 'string' && connectionAttempts > 2 && !pageError.toLowerCase().includes("api connection error") && (
                                <button
                                    onClick={() => window.location.reload()}
                                    style={{
                                        ...styles.button,
                                        ...styles.buttonSecondary,
                                        marginTop: '1rem',
                                        width: 'auto',
                                        padding: '0.5rem 1rem'
                                    }}
                                >
                                    Try Again or Refresh
                                </button>
                            )}
                        </div>
                    ) : filteredCampaignsBySearch.length === 0 ? (
                        <div style={styles.emptyStateContainer}>
                            <p>
                                {searchQuery ? `No campaigns found for "${searchQuery}".` :
                                    (selectedFilterCategory !== ALL_CATEGORIES_FILTER_OPTION ?
                                        `No campaigns found in category "${selectedFilterCategory}".` :
                                        "No campaigns available at the moment.")}
                            </p>
                            {!searchQuery && isAuthenticated && (
                                <Link
                                    to="/new-campaign"
                                    style={{
                                        ...styles.button,
                                        ...styles.buttonPrimary,
                                        marginTop: '1rem',
                                        width: 'auto',
                                        padding: '0.625rem 1.25rem'
                                    }}
                                >
                                    Create First Campaign
                                </Link>
                            )}
                        </div>
                    ) : (
                        <Swiper
                            modules={[Pagination, A11y]} // REMOVED: Navigation
                            spaceBetween={16}
                            slidesPerView={1}
                            // navigation // REMOVED: navigation prop
                            pagination={{ 
                                clickable: true, 
                                dynamicBullets: true,
                                dynamicMainBullets: 3,
                                renderBullet: function (index, className) {
                                    return '<span class="' + className + '" data-slide="' + index + '"></span>';
                                }
                            }}
                            loop={false}
                            style={styles.swiperContainer}
                            grabCursor={true}
                            key={filteredCampaignsBySearch.map(c => c.id).join('-')}
                        >
                            {filteredCampaignsBySearch.map(campaign => (
                                <SwiperSlide key={campaign.id} style={styles.swiperSlide}>
                                    <CampaignCardComponent campaign={campaign} />
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer style={styles.legalNotice}>
                &copy; {new Date().getFullYear()} Fund. All rights reserved. {/* CHANGED: WorldFund to Fund */}
            </footer>

            {/* Bottom Navigation */}
            <nav style={styles.tabs}>
                <Link to="/" style={{ ...styles.tab, ...(isActivePath('/', location.pathname) ? styles.tabActive : {}) }}>
                    <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                    </svg>
                    <span>Home</span>
                </Link>
                <button
                    onClick={handleAccountNavigation}
                    disabled={authIsLoading && !isAuthenticated}
                    style={{
                        ...styles.tab,
                        ...(isActivePath('/dashboard', location.pathname) ? styles.tabActive : {}),
                        background: 'none',
                        border: 'none',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        padding: '0.1rem 0.5rem',
                        margin: 0,
                    }}
                >
                    <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                    <span>Account</span>
                </button>
            </nav>
        </div>
    );
};

// # ############################################################################ #
// # #                       SECTION 19 - DEFAULT EXPORT                       #
// # ############################################################################ #
export default LandingPage;