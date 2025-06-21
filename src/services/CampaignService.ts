// src/services/CampaignService.ts

// # ############################################################################ #
// # #                     SECTION 1 - IMPORTS                                  #
// # ############################################################################ #
import { authService } from './AuthService';

// # ############################################################################ #
// # #                 SECTION 2 - INTERFACE DEFINITIONS                        #
// # ############################################################################ #
export interface Donation {
  id: string;
  amount: number;
  donor: string; // Should be walletAddress of donor
  txHash: string;
  createdAt: string;
  currency: 'WLD';
  onChainAmountSmallestUnit?: string;
  verifiedStatus?: 'VERIFIED' | 'PENDING' | 'FAILED';
  verifiedAt?: string;
  chainId?: number;
  blockNumber?: string;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  goal: number;
  raised: number;
  ownerId: string;
  category: string;
  image?: string;
  status: 'active' | 'completed' | 'cancelled' | 'PENDING_REVIEW';
  createdAt: string;
  updatedAt: string;
  donations: Donation[];
  currency: 'WLD';
}

export interface CampaignPayload {
  title: string;
  description: string;
  goal: number;
  category: string;
  ownerId: string;
  image?: string;
}

export interface UpdateCampaignPayload {
  title?: string;
  description?: string;
  goal?: number;
  category?: string;
  image?: string;
  status?: 'active' | 'completed' | 'cancelled' | 'PENDING_REVIEW';
}

// # ############################################################################ #
// # #           SECTION 3 - SERVICE CLASS: CAMPAIGNSERVICE - DEFINITION        #
// # ############################################################################ #
class CampaignService {
  private static instance: CampaignService;
  private API_BASE: string;
  private isWorldApp: boolean;
  private requestIdCounter: number;

  // # ############################################################################ #
  // # #           SECTION 4 - SERVICE CLASS: CAMPAIGNSERVICE - CONSTRUCTOR       #
  // # ############################################################################ #
  private constructor() {
    // Initialize request counter
    this.requestIdCounter = 0;

    // Get the API base URL from environment variables
    const envApi = import.meta.env.VITE_AMPLIFY_API;

    if (!envApi) {
      console.error('[CampaignService] CRITICAL: VITE_AMPLIFY_API environment variable not set.');
      throw new Error('VITE_AMPLIFY_API environment variable is required but not configured.');
    }

    // Validate and normalize the URL
    try {
      const testUrl = new URL(envApi);
      if (!testUrl.protocol.startsWith('http')) {
        throw new Error('VITE_AMPLIFY_API must use HTTP or HTTPS protocol');
      }
      this.API_BASE = envApi.endsWith('/') ? envApi.slice(0, -1) : envApi;
      console.log('[CampaignService] API Base URL configured:', this.API_BASE);
    } catch (error) {
      console.error('[CampaignService] Invalid VITE_AMPLIFY_API URL format:', envApi, error);
      throw new Error(`Invalid VITE_AMPLIFY_API URL format: ${envApi}`);
    }

    // Detect World App environment
    this.isWorldApp = this.detectWorldApp();
    console.log('[CampaignService] World App detected:', this.isWorldApp);
  }

  // # ############################################################################ #
  // # #         SECTION 5 - SERVICE CLASS: CAMPAIGNSERVICE - GET INSTANCE        #
  // # ############################################################################ #
  public static getInstance(): CampaignService {
    if (!CampaignService.instance) {
      CampaignService.instance = new CampaignService();
    }
    return CampaignService.instance;
  }

  // # ############################################################################ #
  // # #             SECTION 6 - PRIVATE HELPER: WORLD APP DETECTION              #
  // # ############################################################################ #
  private detectWorldApp(): boolean {
    if (typeof window === 'undefined') return false;

    // Check for MiniKit
    if (typeof (window as any).MiniKit !== 'undefined') {
      try {
        const MiniKit = (window as any).MiniKit;
        if (MiniKit && typeof MiniKit.isInstalled === 'function') {
          return MiniKit.isInstalled();
        }
      } catch (e) {
        console.warn('[CampaignService] Error checking MiniKit:', e);
      }
    }

    // Check user agent patterns for World App
    const userAgent = navigator.userAgent || '';
    const isWorldAppUA = userAgent.includes('WorldApp') ||
      userAgent.includes('Worldcoin') ||
      userAgent.includes('MiniKit');

    // Check for webview indicators
    const isWebView = userAgent.includes('wv') ||
      userAgent.includes('WebView') ||
      window.location.protocol === 'worldapp:';

    return isWorldAppUA || isWebView;
  }

  // # ############################################################################ #
  // # #             SECTION 7 - PRIVATE HELPER: GENERATE REQUEST ID              #
  // # ############################################################################ #
  private generateRequestId(): string {
    const timestamp = Date.now();
    const counter = ++this.requestIdCounter;
    const random = Math.random().toString(36).substring(2, 10);
    return `req_${timestamp}_${counter}_${random}`;
  }

  // # ############################################################################ #
  // # #               SECTION 8 - PRIVATE HELPER: GET HEADERS                    #
  // # ############################################################################ #
  private async getHeaders(includeAuth: boolean = false): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add World App specific headers
    if (this.isWorldApp) {
      headers['X-World-App'] = 'true';
      headers['Cache-Control'] = 'no-cache';
      headers['Pragma'] = 'no-cache';
    }

    // Add request ID for tracking
    headers['X-Request-ID'] = this.generateRequestId();

    if (includeAuth) {
      try {
        const authData = await authService.checkAuthStatus();
        if (authData.token) {
          headers['Authorization'] = `Bearer ${authData.token}`;
        }
      } catch (error) {
        console.warn('[CampaignService] Could not get auth token:', error);
      }
    }

    return headers;
  }

  // # ############################################################################ #
  // # #          SECTION 9 - PRIVATE HELPER: ENHANCED FETCH WITH RETRY           #
  // # ############################################################################ #
  private async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    requireAuth: boolean = false,
    maxRetries: number = 2
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const requestId = this.generateRequestId();
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[CampaignService] ${requestId} - Attempt ${attempt + 1}/${maxRetries + 1} for ${url}`);

        const headers = await this.getHeaders(requireAuth);

        const requestOptions: RequestInit = {
          ...options,
          headers: {
            ...headers,
            ...options.headers,
          },
          mode: 'cors',
          credentials: this.isWorldApp ? 'omit' : 'same-origin',
        };
        // Add World App specific options
        if (this.isWorldApp) {
          requestOptions.cache = 'no-store';
        }
        // Add timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        requestOptions.signal = controller.signal;

        // ========== DEBUG STEP 2: CHECK REQUEST DETAILS ==========
        console.log('🔍 [DEBUG STEP 2] About to make fetch request');
        console.log('🔍 [DEBUG STEP 2] URL:', url);
        console.log('🔍 [DEBUG STEP 2] requireAuth:', requireAuth);
        console.log('🔍 [DEBUG STEP 2] Request options:', JSON.stringify(requestOptions, null, 2));
        console.log('🔍 [DEBUG STEP 2] Headers constructed:', requestOptions.headers);

        // Specifically log auth header if it exists
        if (requestOptions.headers && (requestOptions.headers as any)['Authorization']) {
          console.log('🔍 [DEBUG STEP 2] Authorization header present:', (requestOptions.headers as any)['Authorization'].substring(0, 20) + '...');
        } else {
          console.log('🔍 [DEBUG STEP 2] ❌ NO Authorization header found!');
        }
        // =========================================================

        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);
        console.log(`[CampaignService] ${requestId} - Response: ${response.status} ${response.statusText}`);

        // Rest of the method stays the same...
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage: string;

          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || `HTTP ${response.status}: ${response.statusText}`;
          } catch (e) {
            errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
          }
          // Check if this is a retryable error
          const isRetryable = response.status >= 500 || response.status === 429;
          if (isRetryable && attempt < maxRetries) {
            console.warn(`[CampaignService] ${requestId} - Retryable error (${response.status}), retrying...`);
            lastError = new Error(errorMessage);
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            continue;
          }
          console.error(`[CampaignService] ${requestId} - Error:`, errorMessage);
          return { success: false, error: errorMessage };
        }
        // Parse response
        let data: T;
        const contentType = response.headers.get('content-type');

        if (response.status === 204 || !contentType) {
          data = {} as T;
        } else if (contentType && contentType.includes('application/json')) {
          try {
            data = await response.json();
          } catch (jsonError) {
            console.error(`[CampaignService] ${requestId} - JSON parse error:`, jsonError);
            return { success: false, error: 'Invalid JSON response from server' };
          }
        } else {
          const text = await response.text();
          try {
            data = JSON.parse(text) as T;
          } catch (e) {
            data = text as unknown as T;
          }
        }
        console.log(`[CampaignService] ${requestId} - Success`);
        return { success: true, data };
      } catch (error: any) {
        lastError = error;
        console.error(`[CampaignService] ${requestId} - Attempt ${attempt + 1} failed:`, error);

        // Check if this is a retryable error
        const isRetryable = error.name === 'AbortError' ||
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('network');
        if (isRetryable && attempt < maxRetries) {
          console.warn(`[CampaignService] ${requestId} - Retryable error, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          continue;
        }
        break;
      }
    }
    // Handle final error
    let errorMessage = 'Network error occurred';
    if (lastError) {
      if (lastError.name === 'AbortError') {
        errorMessage = 'Request timeout - please check your connection';
      } else if (lastError.message?.includes('Failed to fetch')) {
        errorMessage = 'Network connection failed - please check your internet connection';
      } else if (lastError.message?.includes('CORS')) {
        errorMessage = 'Cross-origin request blocked - please check API configuration';
      } else {
        errorMessage = lastError.message || 'Unknown network error';
      }
    }
    console.error(`[CampaignService] ${requestId} - Final error:`, errorMessage);
    return { success: false, error: errorMessage };
  }

  // # ############################################################################ #
  // # #              SECTION 10 - PUBLIC METHOD: CREATE CAMPAIGN                 #
  // # ############################################################################ #
  public async createCampaign(
    payload: CampaignPayload
  ): Promise<{ success: boolean; campaign?: Campaign; id?: string; error?: string }> {
    try {
      const result = await this.makeRequest<Campaign>(
        `${this.API_BASE}/campaigns`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        true // Require auth
      );

      if (result.success && result.data) {
        return {
          success: true,
          campaign: result.data,
          id: result.data.id
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to create campaign'
      };
    } catch (error: any) {
      console.error('[CampaignService] createCampaign error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred while creating the campaign.',
      };
    }
  }

  // # ############################################################################ #
  // # #           SECTION 11 - PUBLIC METHOD: FETCH ALL CAMPAIGNS                #
  // # ############################################################################ #
  public async fetchAllCampaigns(
    category?: string
  ): Promise<{ success: boolean; campaigns?: Campaign[]; error?: string }> {
    try {
      let url = `${this.API_BASE}/campaigns`;
      if (category && category !== 'All Categories') {
        url += `?category=${encodeURIComponent(category)}`;
      }

      console.log(`[CampaignService] Fetching campaigns from: ${url}`);

      const result = await this.makeRequest<{ campaigns?: Campaign[] } | Campaign[]>(
        url,
        { method: 'GET' }
      );

      if (result.success && result.data) {
        let campaignsArray: Campaign[] = [];

        if (Array.isArray(result.data)) {
          campaignsArray = result.data;
        } else if (result.data && 'campaigns' in result.data && Array.isArray(result.data.campaigns)) {
          campaignsArray = result.data.campaigns;
        }

        return { success: true, campaigns: campaignsArray };
      }

      return {
        success: false,
        error: result.error || 'Failed to fetch campaigns'
      };
    } catch (error: any) {
      console.error('[CampaignService] fetchAllCampaigns error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch campaigns.',
      };
    }
  }

  // # ############################################################################ #
  // # #            SECTION 12 - PUBLIC METHOD: FETCH CAMPAIGN (BY ID)            #
  // # ############################################################################ #
  public async fetchCampaign(
    id: string
  ): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
    if (!id || id.trim() === '') {
      return { success: false, error: 'Campaign ID is required.' };
    }

    try {
      const result = await this.makeRequest<Campaign>(
        `${this.API_BASE}/campaigns/${id}`,
        { method: 'GET' }
      );

      if (result.success && result.data) {
        return { success: true, campaign: result.data };
      }

      return {
        success: false,
        error: result.error || 'Failed to fetch campaign'
      };
    } catch (error: any) {
      console.error(`[CampaignService] fetchCampaign (id: ${id}) error:`, error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred while fetching the campaign.',
      };
    }
  }

  // # ############################################################################ #
  // # #              SECTION 13 - PUBLIC METHOD: UPDATE CAMPAIGN                 #
  // # ############################################################################ #
  public async updateCampaign(
    id: string,
    payload: UpdateCampaignPayload
  ): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
    if (!id || id.trim() === '') {
      return { success: false, error: 'Campaign ID is required for update.' };
    }
    if (Object.keys(payload).length === 0) {
      return { success: false, error: 'No update payload provided.' };
    }

    try {
      const result = await this.makeRequest<Campaign>(
        `${this.API_BASE}/campaigns/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        },
        true // Require auth
      );

      if (result.success && result.data) {
        return { success: true, campaign: result.data };
      }

      return {
        success: false,
        error: result.error || 'Failed to update campaign'
      };
    } catch (error: any) {
      console.error(`[CampaignService] updateCampaign (id: ${id}) error:`, error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred while updating the campaign.',
      };
    }
  }

  // # ############################################################################ #
  // # #              SECTION 14 - PUBLIC METHOD: DELETE CAMPAIGN                 #
  // # ############################################################################ #
  public async deleteCampaign(
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!id || id.trim() === '') {
      return { success: false, error: 'Campaign ID is required for deletion.' };
    }

    try {
      const result = await this.makeRequest<void>(
        `${this.API_BASE}/campaigns/${id}`,
        { method: 'DELETE' },
        true // Require auth
      );

      return {
        success: result.success,
        error: result.error || (result.success ? undefined : 'Failed to delete campaign')
      };
    } catch (error: any) {
      console.error(`[CampaignService] deleteCampaign (id: ${id}) error:`, error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred while deleting the campaign.',
      };
    }
  }

  // # ############################################################################ #
  // # #              SECTION 15 - PUBLIC METHOD: RECORD DONATION                 #
  // # ############################################################################ #
  public async recordDonation(
    campaignId: string,
    donatedAmount: number,
    transactionHash: string,
    chainId: number = 1
  ): Promise<{ success: boolean; donation?: Donation; error?: string }> {
    if (!campaignId || donatedAmount === undefined || !transactionHash) {
      return {
        success: false,
        error: 'Campaign ID, donated amount, and transaction hash are required.',
      };
    }
    if (donatedAmount <= 0) {
      return { success: false, error: 'Donation amount must be positive.' };
    }

    try {
      const result = await this.makeRequest<{ donation?: Donation; donationId?: string }>(
        `${this.API_BASE}/campaigns/${campaignId}/donate`,
        {
          method: 'POST',
          body: JSON.stringify({ donatedAmount, transactionHash, chainId }),
        },
        true // Require auth
      );

      if (result.success && result.data) {
        return {
          success: true,
          donation: result.data.donation || { id: result.data.donationId } as any,
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to record donation'
      };
    } catch (error: any) {
      console.error(`[CampaignService] recordDonation (campaignId: ${campaignId}) error:`, error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred while recording the donation.',
      };
    }
  }

  // # ############################################################################ #
  // # #     SECTION 16 - PUBLIC METHOD: FETCH USER CAMPAIGNS (ENHANCED DEBUG VERSION) #
  // # ############################################################################ #
  public async fetchUserCampaigns(
    walletAddress: string
  ): Promise<{ success: boolean; campaigns?: Campaign[]; error?: string }> {
    if (!walletAddress || walletAddress.trim() === '') {
      return {
        success: false,
        error: 'Wallet address is required to fetch user campaigns.',
      };
    }

    try {
      const url = `${this.API_BASE}/campaigns`;

      // ENHANCED DEBUG: Log everything step by step
      console.log('🔍 [ENHANCED DEBUG] fetchUserCampaigns - Step 1: Starting request');
      console.log('🔍 [ENHANCED DEBUG] URL:', url);
      console.log('🔍 [ENHANCED DEBUG] API_BASE:', this.API_BASE);
      console.log('🔍 [ENHANCED DEBUG] Wallet Address:', walletAddress);

      // Get auth headers with enhanced debugging
      console.log('🔍 [ENHANCED DEBUG] Step 2: Getting headers...');
      const headers = await this.getHeaders(true);
      console.log('🔍 [ENHANCED DEBUG] Headers received:', headers);

      // Check if Authorization header exists
      const authHeader = (headers as any)['Authorization'];
      if (authHeader) {
        console.log('🔍 [ENHANCED DEBUG] Authorization header found:', authHeader.substring(0, 30) + '...');
      } else {
        console.log('🔍 [ENHANCED DEBUG] ❌ NO Authorization header!');
      }

      const secureHeaders = {
        ...headers,
        'X-User-Campaigns-Only': 'true'
      };

      console.log('🔍 [ENHANCED DEBUG] Step 3: Final headers prepared:', secureHeaders);

      // Enhanced fetch options
      const fetchOptions: RequestInit = {
        method: 'GET',
        headers: secureHeaders,
        mode: 'cors',
        credentials: this.isWorldApp ? 'omit' : 'same-origin',
        ...(this.isWorldApp ? { cache: 'no-store' } : {})
      };

      console.log('🔍 [ENHANCED DEBUG] Step 4: Fetch options:', fetchOptions);
      console.log('🔍 [ENHANCED DEBUG] isWorldApp:', this.isWorldApp);

      // Test basic connectivity first
      console.log('🔍 [ENHANCED DEBUG] Step 5: Testing basic connectivity...');
      try {
        const testResponse = await fetch(url.replace('/campaigns', '/health'), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          mode: 'cors'
        });
        console.log('🔍 [ENHANCED DEBUG] Health check response:', testResponse.status, testResponse.statusText);
      } catch (healthError) {
        console.log('🔍 [ENHANCED DEBUG] Health check failed:', healthError);
      }

      console.log('🔍 [ENHANCED DEBUG] Step 6: Making actual request...');
      const response = await fetch(url, fetchOptions);

      console.log('🔍 [ENHANCED DEBUG] Step 7: Response received!');
      console.log('🔍 [ENHANCED DEBUG] Response status:', response.status);
      console.log('🔍 [ENHANCED DEBUG] Response ok:', response.ok);
      console.log('🔍 [ENHANCED DEBUG] Response statusText:', response.statusText);
      console.log('🔍 [ENHANCED DEBUG] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.log('🔍 [ENHANCED DEBUG] Error response text:', errorText);

        let errorMessage: string;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || `HTTP ${response.status}: ${response.statusText}`;
        } catch (e) {
          errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
        }

        console.error('[CampaignService] Secure user campaigns fetch failed:', errorMessage);
        return { success: false, error: errorMessage };
      }

      const data = await response.json();
      console.log('🔍 [ENHANCED DEBUG] Step 8: Data parsed successfully:', data);

      let campaignsArray: Campaign[] = [];

      if (Array.isArray(data)) {
        campaignsArray = data;
      } else if (data && 'campaigns' in data && Array.isArray(data.campaigns)) {
        campaignsArray = data.campaigns;
      }

      console.log('🔍 [ENHANCED DEBUG] Step 9: Final campaigns array:', campaignsArray.length, 'campaigns');
      return { success: true, campaigns: campaignsArray };

    } catch (error: any) {
      console.error('🔍 [ENHANCED DEBUG] CATCH BLOCK - Full error details:');
      console.error('🔍 [ENHANCED DEBUG] Error name:', error.name);
      console.error('🔍 [ENHANCED DEBUG] Error message:', error.message);
      console.error('🔍 [ENHANCED DEBUG] Error stack:', error.stack);
      console.error('🔍 [ENHANCED DEBUG] Full error object:', error);
      console.error('🔍 [ENHANCED DEBUG] Error constructor:', error.constructor.name);

      // Check for specific error types
      if (error.name === 'TypeError') {
        console.error('🔍 [ENHANCED DEBUG] This is a TypeError - likely network/fetch issue');
        if (error.message.includes('Failed to fetch')) {
          console.error('🔍 [ENHANCED DEBUG] "Failed to fetch" - CORS or network connectivity issue');
        } else if (error.message.includes('NetworkError')) {
          console.error('🔍 [ENHANCED DEBUG] "NetworkError" - Network connectivity issue');
        } else {
          console.error('🔍 [ENHANCED DEBUG] Other TypeError:', error.message);
        }
      }

      let friendlyError = 'Failed to fetch user campaigns.';
      if (error.message?.includes('Failed to fetch')) {
        friendlyError = 'Network connection failed. Please check your internet connection and try again.';
      } else if (error.message?.includes('timeout')) {
        friendlyError = 'Request timed out. Please try again.';
      } else if (error.message) {
        friendlyError = error.message;
      }

      return {
        success: false,
        error: friendlyError,
      };
    }
  }


  // # ############################################################################ #
  // # #             SECTION 17 - SINGLETON INSTANCE EXPORT                       #
  // # ############################################################################ #
}

export const campaignService = CampaignService.getInstance();