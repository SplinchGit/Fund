// src/services/CampaignService.ts
// (MODIFIED to include category in payloads and update fetchAllCampaigns for filtering)

// # ############################################################################ #
// # #                           SECTION 1 - IMPORTS                           #
// # ############################################################################ #
import { authService } from './AuthService';

// # ############################################################################ #
// # #                   SECTION 2 - INTERFACE DEFINITIONS                   #
// # ############################################################################ #
export interface Donation {
  id: string;
  amount: number;
  donor: string; // Should be walletAddress of donor
  txHash: string;
  createdAt: string;
  currency: 'WLD';
  // Added from your Lambda's verifiedDonation structure for completeness
  onChainAmountSmallestUnit?: string;
  verifiedStatus?: 'VERIFIED' | 'PENDING' | 'FAILED';
  verifiedAt?: string;
  chainId?: number;
  blockNumber?: string;
}

export interface Campaign {
  id: string; // Or campaignId, ensure consistency with backend
  title: string;
  description: string;
  goal: number;
  raised: number;
  ownerId: string;
  category: string; // <<<< ADDED category here for full Campaign object
  image?: string;   // This would be the final S3 URL of the processed image, or the S3 key
  status: 'active' | 'completed' | 'cancelled' | 'PENDING_REVIEW'; // Added PENDING_REVIEW
  createdAt: string;
  updatedAt: string;
  donations: Donation[];
  currency: 'WLD';
}

// Payload for creating a new campaign
export interface CampaignPayload {
  title: string;
  description: string;
  goal: number;
  category: string;   // <<<< ADDED category (mandatory for new campaigns)
  ownerId: string;    // This was correctly added by you previously
  image?: string;      // Optional: This will be the S3 key of the raw uploaded image
  // Status is usually set by the backend on creation (e.g., to 'PENDING_REVIEW' or 'active')
}

// Payload for updating an existing campaign
export interface UpdateCampaignPayload {
  title?: string;
  description?: string;
  goal?: number;
  category?: string;   // <<<< ADDED optional category for updates
  image?: string;      // Optional: New S3 key if image is changed
  status?: 'active' | 'completed' | 'cancelled' | 'PENDING_REVIEW';
  // ownerId is typically NOT updatable
}


// # ############################################################################ #
// # #             SECTION 3 - SERVICE CLASS: CAMPAIGNSERVICE - DEFINITION             #
// # ############################################################################ #
class CampaignService {
  private static instance: CampaignService;
  private API_BASE: string;
  private API_KEY?: string;

// # ############################################################################ #
// # #           SECTION 4 - SERVICE CLASS: CAMPAIGNSERVICE - CONSTRUCTOR           #
// # ############################################################################ #
  private constructor() {
    const envApi = import.meta.env.VITE_AMPLIFY_API || import.meta.env.VITE_APP_BACKEND_API_URL;
    if (envApi) {
      this.API_BASE = envApi;
    } else {
      console.warn('[CampaignService] No VITE_AMPLIFY_API or VITE_APP_BACKEND_API_URL set; defaulting to /api');
      this.API_BASE = '/api'; // Should not happen if VITE_AMPLIFY_API is correctly set
    }
    // API_KEY usage depends on your backend API Gateway setup for specific endpoints
    this.API_KEY = import.meta.env.VITE_WORLD_APP_API || import.meta.env.VITE_APP_BACKEND_API_KEY;
    console.log('[CampaignService] Initialized with API base:', this.API_BASE);
  }

// # ############################################################################ #
// # #         SECTION 5 - SERVICE CLASS: CAMPAIGNSERVICE - GET INSTANCE         #
// # ############################################################################ #
  public static getInstance(): CampaignService {
    if (!CampaignService.instance) {
      CampaignService.instance = new CampaignService();
    }
    return CampaignService.instance;
  }

// # ############################################################################ #
// # #                   SECTION 6 - PRIVATE HELPER: GET HEADERS                   #
// # ############################################################################ #
  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    // Assuming authService.checkAuthStatus() correctly provides the current token
    // or authService has a method like authService.getToken()
    const authData = await authService.checkAuthStatus(); 
    if (authData.token) {
      headers['Authorization'] = `Bearer ${authData.token}`;
    }
    // Only add x-api-key if your specific endpoint is configured to require it
    // AND it's not mutually exclusive with Bearer token auth.
    // Typically, for user actions, Bearer token is sufficient if endpoint is protected by an authorizer.
    // if (this.API_KEY) {
    //   headers['x-api-key'] = this.API_KEY;
    // }
    return headers;
  }

// # ############################################################################ #
// # #                 SECTION 7 - PUBLIC METHOD: CREATE CAMPAIGN                 #
// # ############################################################################ #
  public async createCampaign(
    payload: CampaignPayload 
  ): Promise<{ success: boolean; campaign?: Campaign; id?: string; error?: string }> { // Return full campaign on success
    try {
      const headers = await this.getHeaders();
      const res = await fetch(`${this.API_BASE}/campaigns`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      
      const responseBody = await res.json(); // Try to parse JSON body regardless of res.ok for error details

      if (!res.ok) {
        throw new Error(responseBody?.message || `Failed to create campaign (${res.status})`);
      }
      // Assuming backend returns the full created campaign object upon success (201 status)
      // which now includes id, createdAt, status, category, etc.
      return { success: true, campaign: responseBody as Campaign, id: responseBody.id };
    } catch (error: any) {
      console.error('[CampaignService] createCampaign error:', error);
      return { success: false, error: error.message || 'An unexpected error occurred while creating the campaign.' };
    }
  }

// # ############################################################################ #
// # #               SECTION 8 - PUBLIC METHOD: FETCH ALL CAMPAIGNS               #
// # ############################################################################ #
  public async fetchAllCampaigns(
    category?: string // <<<< ADDED optional category parameter
  ): Promise<{ success: boolean; campaigns?: Campaign[]; error?: string }> {
    try {
      // Public listing of campaigns might not need auth headers,
      // but if your /campaigns endpoint requires it, getHeaders() will add it.
      // const headers = await this.getHeaders(); 
      const headers: HeadersInit = { 'Content-Type': 'application/json' }; // Simpler for public GET

      let url = `${this.API_BASE}/campaigns`;
      if (category && category !== "All Categories") { // Assuming "All Categories" means no filter
        url += `?category=${encodeURIComponent(category)}`;
      }
      console.log(`[CampaignService] Fetching from URL: ${url}`);

      const res = await fetch(url, {
        method: 'GET',
        headers, 
      });

      const responseBody = await res.json();

      if (!res.ok) {
        throw new Error(responseBody?.message || `Failed to fetch campaigns (${res.status})`);
      }
      
      // Ensure backend returns { campaigns: [...] } or just [...]
      // The provided code handles both data.campaigns or data directly being the array.
      const campaignsArray = Array.isArray(responseBody.campaigns) ? responseBody.campaigns : Array.isArray(responseBody) ? responseBody : [];
      return { success: true, campaigns: campaignsArray as Campaign[] };
    } catch (error: any) {
      console.error('[CampaignService] fetchAllCampaigns error:', error);
      return { success: false, error: error.message || 'Failed to fetch campaigns.' };
    }
  }

// # ############################################################################ #
// # #             SECTION 9 - PUBLIC METHOD: FETCH CAMPAIGN (BY ID)             #
// # ############################################################################ #
  public async fetchCampaign(
    id: string
  ): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
    if (!id || id.trim() === "") {
        return { success: false, error: "Campaign ID is required." };
    }
    try {
      // const headers = await this.getHeaders(); // Potentially needed if accessing private campaign details
      const headers: HeadersInit = { 'Content-Type': 'application/json' }; // Simpler for public GET

      const res = await fetch(`${this.API_BASE}/campaigns/${id}`, {
        method: 'GET',
        headers,
      });

      const responseBody = await res.json();

      if (!res.ok) {
        throw new Error(responseBody?.message || (res.status === 404 ? 'Campaign not found' : `Failed to fetch campaign (${res.status})`));
      }
      return { success: true, campaign: responseBody as Campaign };
    } catch (error: any) {
      console.error(`[CampaignService] fetchCampaign (id: ${id}) error:`, error);
      return { success: false, error: error.message || 'An unexpected error occurred while fetching the campaign.' };
    }
  }

// # ############################################################################ #
// # #                 SECTION 10 - PUBLIC METHOD: UPDATE CAMPAIGN                 #
// # ############################################################################ #
  public async updateCampaign(
    id: string,
    payload: UpdateCampaignPayload 
  ): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
    if (!id || id.trim() === "") {
        return { success: false, error: "Campaign ID is required for update." };
    }
    if (Object.keys(payload).length === 0) {
        return { success: false, error: "No update payload provided." };
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
        throw new Error(responseBody?.message || `Failed to update campaign (${res.status})`);
      }
      // Assuming backend returns the full updated campaign object
      return { success: true, campaign: responseBody as Campaign };
    } catch (error: any) {
      console.error(`[CampaignService] updateCampaign (id: ${id}) error:`, error);
      return { success: false, error: error.message || 'An unexpected error occurred while updating the campaign.' };
    }
  }

// # ############################################################################ #
// # #                 SECTION 11 - PUBLIC METHOD: DELETE CAMPAIGN                 #
// # ############################################################################ #
  public async deleteCampaign(
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!id || id.trim() === "") {
        return { success: false, error: "Campaign ID is required for deletion." };
    }
    try {
      const headers = await this.getHeaders(); // Auth needed
      const res = await fetch(`${this.API_BASE}/campaigns/${id}`, {
        method: 'DELETE',
        headers,
      });
      
      if (res.status === 204) { // Successfully deleted, no content
          return { success: true };
      }

      // For other success statuses (like 200 with a body) or error statuses
      const responseBody = await res.json().catch(() => ({ message: res.statusText })); // Graceful fallback

      if (!res.ok) {
        throw new Error(responseBody?.message || `Failed to delete campaign (${res.status})`);
      }
      return { success: true }; // Assuming other 2xx statuses are also success
    } catch (error: any) {
      console.error(`[CampaignService] deleteCampaign (id: ${id}) error:`, error);
      return { success: false, error: error.message || 'An unexpected error occurred while deleting the campaign.' };
    }
  }

// # ############################################################################ #
// # #                 SECTION 12 - PUBLIC METHOD: RECORD DONATION                 #
// # ############################################################################ #
  public async recordDonation(
    campaignId: string,
    donatedAmount: number, // Changed from 'amount' to match Lambda's expected 'donatedAmount'
    transactionHash: string, // Changed from 'txHash'
    chainId: number // Added chainId as per Lambda's expectation
  ): Promise<{ success: boolean; donation?: Donation; error?: string }> { 
    if (!campaignId || donatedAmount === undefined || !transactionHash || chainId === undefined ) {
        return { success: false, error: "Campaign ID, donated amount, transaction hash, and chainId are required." };
    }
    if (donatedAmount <= 0) {
        return { success: false, error: "Donation amount must be positive." };
    }
    try {
      const headers = await this.getHeaders(); 
      const res = await fetch(`${this.API_BASE}/campaigns/${campaignId}/donate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ donatedAmount, transactionHash, chainId }), // Match Lambda payload
      });
      
      const responseBody = await res.json();

      if (!res.ok) {
        throw new Error(responseBody?.message || `Failed to record donation (${res.status})`);
      }
      // Assuming backend returns { verified: true, message: "...", donationId: "..." }
      // and we might want to return a reconstructed/fetched Donation object or just success status
      // For now, let's assume backend might return the donation object or its ID for confirmation
      return { success: true, donation: responseBody.donation || { id: responseBody.donationId } as any };
    } catch (error: any) {
      console.error(`[CampaignService] recordDonation (campaignId: ${campaignId}) error:`, error);
      return { success: false, error: error.message || 'An unexpected error occurred while recording the donation.' };
    }
  }

// # ############################################################################ #
// # #               SECTION 13 - PUBLIC METHOD: FETCH USER CAMPAIGNS               #
// # ############################################################################ #
  public async fetchUserCampaigns(
    walletAddress: string
  ): Promise<{ success: boolean; campaigns?: Campaign[]; error?: string }> {
    if (!walletAddress || walletAddress.trim() === "") {
        return { success: false, error: "Wallet address is required to fetch user campaigns." };
    }
    try {
      const headers = await this.getHeaders(); // Auth needed
      const res = await fetch(`${this.API_BASE}/users/${walletAddress}/campaigns`, {
        method: 'GET',
        headers,
      });
      
      const responseBody = await res.json();

      if (!res.ok) {
        throw new Error(responseBody?.message || `Failed to fetch user campaigns (${res.status})`);
      }
      const campaignsArray = Array.isArray(responseBody.campaigns) ? responseBody.campaigns : Array.isArray(responseBody) ? responseBody : [];
      return { success: true, campaigns: campaignsArray as Campaign[] };
    } catch (error: any) {
      console.error(`[CampaignService] fetchUserCampaigns (wallet: ${walletAddress}) error:`, error);
      return { success: false, error: error.message || 'Failed to fetch user campaigns.' };
    }
  }
}

// # ############################################################################ #
// # #                 SECTION 14 - SINGLETON INSTANCE EXPORT                 #
// # ############################################################################ #
export const campaignService = CampaignService.getInstance();