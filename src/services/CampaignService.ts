// src/services/CampaignService.ts

// # ############################################################################ #
// # #                               SECTION 1 - IMPORTS                                #
// # ############################################################################ #
import { authService } from './AuthService';

// # ############################################################################ #
// # #                            SECTION 2 - INTERFACE DEFINITIONS                             #
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
// # #                     SECTION 3 - SERVICE CLASS: CAMPAIGNSERVICE - DEFINITION                      #
// # ############################################################################ #
class CampaignService {
  private static instance: CampaignService;
  private API_BASE: string;
  private API_KEY?: string;

  // # ############################################################################ #
  // # #                     SECTION 4 - SERVICE CLASS: CAMPAIGNSERVICE - CONSTRUCTOR                     #
  // # ############################################################################ #
  private constructor() {
    // --- START OF APPLIED FIX ---
    // This logic ensures the app fails immediately if the API URL is not configured,
    // preventing silent errors and relative path fallbacks.
    const envApi =
      import.meta.env.VITE_AMPLIFY_API ||
      import.meta.env.VITE_APP_BACKEND_API_URL;

    if (!envApi) {
      console.error(
        '[CampaignService] CRITICAL: Backend API URL not configured. Please set VITE_AMPLIFY_API environment variable.'
      );
      throw new Error(
        'Backend API URL not configured. Please check your hosting environment variables.'
      );
    }

    // Validate and normalize the URL
    try {
      const testUrl = new URL(envApi);
      if (!testUrl.protocol.startsWith('http')) {
        throw new Error('API URL must use HTTP or HTTPS protocol');
      }
      this.API_BASE = envApi.endsWith('/') ? envApi.slice(0, -1) : envApi;
      console.log('[CampaignService] API Base URL configured successfully:', this.API_BASE);
    } catch (error) {
      console.error('[CampaignService] Invalid API URL format in environment variable:', envApi, error);
      throw new Error(
        `Invalid API URL format: ${envApi}. Please check your hosting environment variables.`
      );
    }
    // --- END OF APPLIED FIX ---

    // API_KEY usage depends on your backend API Gateway setup for specific endpoints
    this.API_KEY =
      import.meta.env.VITE_WORLD_APP_API ||
      import.meta.env.VITE_APP_BACKEND_API_KEY;
  }

  // # ############################################################################ #
  // # #                      SECTION 5 - SERVICE CLASS: CAMPAIGNSERVICE - GET INSTANCE                       #
  // # ############################################################################ #
  public static getInstance(): CampaignService {
    if (!CampaignService.instance) {
      CampaignService.instance = new CampaignService();
    }
    return CampaignService.instance;
  }

  // # ############################################################################ #
  // # #                               SECTION 6 - PRIVATE HELPER: GET HEADERS                                #
  // # ############################################################################ #
  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const authData = await authService.checkAuthStatus();
    if (authData.token) {
      headers['Authorization'] = `Bearer ${authData.token}`;
    }
    return headers;
  }

  // # ############################################################################ #
  // # #                            SECTION 7 - PUBLIC METHOD: CREATE CAMPAIGN                            #
  // # ############################################################################ #
  public async createCampaign(
    payload: CampaignPayload
  ): Promise<{ success: boolean; campaign?: Campaign; id?: string; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(`${this.API_BASE}/campaigns`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const responseBody = await res.json();

      if (!res.ok) {
        throw new Error(
          responseBody?.message || `Failed to create campaign (${res.status})`
        );
      }
      return { success: true, campaign: responseBody as Campaign, id: responseBody.id };
    } catch (error: any) {
      console.error('[CampaignService] createCampaign error:', error);
      return {
        success: false,
        error:
          error.message ||
          'An unexpected error occurred while creating the campaign.',
      };
    }
  }

  // # ############################################################################ #
  // # #                         SECTION 8 - PUBLIC METHOD: FETCH ALL CAMPAIGNS                         #
  // # ############################################################################ #
  public async fetchAllCampaigns(
    category?: string
  ): Promise<{ success: boolean; campaigns?: Campaign[]; error?: string }> {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };

      let url = `${this.API_BASE}/campaigns`;
      if (category && category !== 'All Categories') {
        url += `?category=${encodeURIComponent(category)}`;
      }
      console.log(`[CampaignService] Fetching from URL: ${url}`);

      const res = await fetch(url, {
        method: 'GET',
        headers,
      });

      const responseBody = await res.json();

      if (!res.ok) {
        throw new Error(
          responseBody?.message || `Failed to fetch campaigns (${res.status})`
        );
      }

      const campaignsArray = Array.isArray(responseBody.campaigns)
        ? responseBody.campaigns
        : Array.isArray(responseBody)
        ? responseBody
        : [];
      return { success: true, campaigns: campaignsArray as Campaign[] };
    } catch (error: any) {
      console.error('[CampaignService] fetchAllCampaigns error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch campaigns.',
      };
    }
  }

  // # ############################################################################ #
  // # #                       SECTION 9 - PUBLIC METHOD: FETCH CAMPAIGN (BY ID)                        #
  // # ############################################################################ #
  public async fetchCampaign(
    id: string
  ): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
    if (!id || id.trim() === '') {
      return { success: false, error: 'Campaign ID is required.' };
    }
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };

      const res = await fetch(`${this.API_BASE}/campaigns/${id}`, {
        method: 'GET',
        headers,
      });

      const responseBody = await res.json();

      if (!res.ok) {
        throw new Error(
          responseBody?.message ||
            (res.status === 404
              ? 'Campaign not found'
              : `Failed to fetch campaign (${res.status})`)
        );
      }
      return { success: true, campaign: responseBody as Campaign };
    } catch (error: any) {
      console.error(`[CampaignService] fetchCampaign (id: ${id}) error:`, error);
      return {
        success: false,
        error:
          error.message ||
          'An unexpected error occurred while fetching the campaign.',
      };
    }
  }

  // # ############################################################################ #
  // # #                            SECTION 10 - PUBLIC METHOD: UPDATE CAMPAIGN                             #
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
      const headers = await this.getHeaders(); // Auth is definitely needed here
      const res = await fetch(`${this.API_BASE}/campaigns/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      const responseBody = await res.json();

      if (!res.ok) {
        throw new Error(
          responseBody?.message || `Failed to update campaign (${res.status})`
        );
      }
      return { success: true, campaign: responseBody as Campaign };
    } catch (error: any) {
      console.error(`[CampaignService] updateCampaign (id: ${id}) error:`, error);
      return {
        success: false,
        error:
          error.message ||
          'An unexpected error occurred while updating the campaign.',
      };
    }
  }

  // # ############################################################################ #
  // # #                            SECTION 11 - PUBLIC METHOD: DELETE CAMPAIGN                             #
  // # ############################################################################ #
  public async deleteCampaign(
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!id || id.trim() === '') {
      return { success: false, error: 'Campaign ID is required for deletion.' };
    }
    try {
      const headers = await this.getHeaders(); // Auth needed
      const res = await fetch(`${this.API_BASE}/campaigns/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (res.status === 204) {
        return { success: true };
      }

      const responseBody = await res.json().catch(() => ({ message: res.statusText }));

      if (!res.ok) {
        throw new Error(
          responseBody?.message || `Failed to delete campaign (${res.status})`
        );
      }
      return { success: true };
    } catch (error: any) {
      console.error(`[CampaignService] deleteCampaign (id: ${id}) error:`, error);
      return {
        success: false,
        error:
          error.message ||
          'An unexpected error occurred while deleting the campaign.',
      };
    }
  }

  // # ############################################################################ #
  // # #                            SECTION 12 - PUBLIC METHOD: RECORD DONATION                             #
  // # ############################################################################ #
  public async recordDonation(
    campaignId: string,
    donatedAmount: number,
    transactionHash: string,
    chainId: number
  ): Promise<{ success: boolean; donation?: Donation; error?: string }> {
    if (
      !campaignId ||
      donatedAmount === undefined ||
      !transactionHash ||
      chainId === undefined
    ) {
      return {
        success: false,
        error: 'Campaign ID, donated amount, transaction hash, and chainId are required.',
      };
    }
    if (donatedAmount <= 0) {
      return { success: false, error: 'Donation amount must be positive.' };
    }
    try {
      const headers = await this.getHeaders();
      const res = await fetch(`${this.API_BASE}/campaigns/${campaignId}/donate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ donatedAmount, transactionHash, chainId }),
      });

      const responseBody = await res.json();

      if (!res.ok) {
        throw new Error(
          responseBody?.message || `Failed to record donation (${res.status})`
        );
      }
      return {
        success: true,
        donation: (responseBody.donation || { id: responseBody.donationId }) as any,
      };
    } catch (error: any) {
      console.error(
        `[CampaignService] recordDonation (campaignId: ${campaignId}) error:`,
        error
      );
      return {
        success: false,
        error:
          error.message ||
          'An unexpected error occurred while recording the donation.',
      };
    }
  }

  // # ############################################################################ #
  // # #                         SECTION 13 - PUBLIC METHOD: FETCH USER CAMPAIGNS                         #
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
      const headers = await this.getHeaders(); // Auth needed
      const res = await fetch(
        `${this.API_BASE}/users/${walletAddress}/campaigns`,
        {
          method: 'GET',
          headers,
        }
      );

      const responseBody = await res.json();

      if (!res.ok) {
        throw new Error(
          responseBody?.message || `Failed to fetch user campaigns (${res.status})`
        );
      }
      const campaignsArray = Array.isArray(responseBody.campaigns)
        ? responseBody.campaigns
        : Array.isArray(responseBody)
        ? responseBody
        : [];
      return { success: true, campaigns: campaignsArray as Campaign[] };
    } catch (error: any) {
      console.error(
        `[CampaignService] fetchUserCampaigns (wallet: ${walletAddress}) error:`,
        error
      );
      return {
        success: false,
        error: error.message || 'Failed to fetch user campaigns.',
      };
    }
  }
}

// # ############################################################################ #
// # #                          SECTION 14 - SINGLETON INSTANCE EXPORT                            #
// # ############################################################################ #
export const campaignService = CampaignService.getInstance();