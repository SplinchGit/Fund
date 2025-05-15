// src/services/CampaignService.ts

// # ############################################################################ #
// # #                               SECTION 1 - IMPORTS                                #
// # ############################################################################ #
import { authService } from './AuthService';

// # ############################################################################ #
// # #                       SECTION 2 - INTERFACE DEFINITIONS                    #
// # ############################################################################ #
export interface Donation {
  id: string;
  amount: number;
  donor: string;
  txHash: string;
  createdAt: string;
  currency: 'WLD';
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  goal: number;
  raised: number;
  ownerId: string; // ownerId is correctly here for the full Campaign object
  image?: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  donations: Donation[];
  currency: 'WLD';
}

// --- MODIFIED CampaignPayload ---
export interface CampaignPayload {
  title: string;
  description: string; // Made description non-optional for creation for consistency, can be empty string. Or keep as string?
  goal: number;
  image?: string;
  ownerId: string;   // <<< THIS IS THE CRUCIAL FIX: ADDED ownerId
  // status?: 'active' | 'completed' | 'cancelled'; // Consider if status can be sent on creation
}

// Consider a separate type for updates if it's different, or use Partial<CampaignPayload>
// If status can be updated, CampaignPayload might need it, or a specific UpdateCampaignPayload type.
// For now, updateCampaign uses Partial<CampaignPayload>, which will now correctly allow ownerId
// if you were to update it, though typically ownerId isn't updated.
// If `status` is updatable via `updateCampaign` and not part of `CampaignPayload`,
// then `Partial<CampaignPayload>` might not be the best type for `updateCampaign`'s payload.
// Let's assume for now `updateCampaign` payload is meant to update fields defined in `CampaignPayload`.
// The `EditCampaignPage.tsx` sends `formData` which includes `status`.
// So, `CampaignPayload` (or a specific `UpdateCampaignPayload`) should ideally include `status` if it's an updatable field.

export interface UpdateCampaignPayload { // More specific type for updates
  title?: string;
  description?: string;
  goal?: number;
  image?: string;
  status?: 'active' | 'completed' | 'cancelled';
  // ownerId is typically NOT updatable, so it's omitted here.
}


// # ############################################################################ #
// # #                 SECTION 3 - SERVICE CLASS: CAMPAIGNSERVICE - DEFINITION                  #
// # ############################################################################ #
class CampaignService {
  private static instance: CampaignService;
  private API_BASE: string;
  private API_KEY?: string;

// # ############################################################################ #
// # #                 SECTION 4 - SERVICE CLASS: CAMPAIGNSERVICE - CONSTRUCTOR                 #
// # ############################################################################ #
  private constructor() {
    const envApi = import.meta.env.VITE_AMPLIFY_API || import.meta.env.VITE_APP_BACKEND_API_URL;
    if (envApi) {
      this.API_BASE = envApi;
    } else {
      console.warn('[CampaignService] No VITE_AMPLIFY_API or VITE_APP_BACKEND_API_URL set; defaulting to /api');
      this.API_BASE = '/api';
    }
    this.API_KEY = import.meta.env.VITE_WORLD_APP_API || import.meta.env.VITE_APP_BACKEND_API_KEY;
    console.log('[CampaignService] Initialized with API base:', this.API_BASE);
  }

// # ############################################################################ #
// # #                 SECTION 5 - SERVICE CLASS: CAMPAIGNSERVICE - GET INSTANCE                  #
// # ############################################################################ #
  public static getInstance(): CampaignService {
    if (!CampaignService.instance) {
      CampaignService.instance = new CampaignService();
    }
    return CampaignService.instance;
  }

// # ############################################################################ #
// # #                         SECTION 6 - PRIVATE HELPER: GET HEADERS                         #
// # ############################################################################ #
  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const authData = await authService.checkAuthStatus(); // Directly use the object
    if (authData.token) {
      headers['Authorization'] = `Bearer ${authData.token}`;
    }
    if (this.API_KEY) {
      headers['x-api-key'] = this.API_KEY;
    }
    return headers;
  }

// # ############################################################################ #
// # #                         SECTION 7 - PUBLIC METHOD: CREATE CAMPAIGN                         #
// # ############################################################################ #
  public async createCampaign(
    payload: CampaignPayload // This now expects ownerId due to the fix above
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(`${this.API_BASE}/campaigns`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      // Improved error handling for JSON parsing and response body
      if (!res.ok) {
        let errorBody;
        try {
          errorBody = await res.json();
        } catch (e) {
          errorBody = { message: res.statusText }; // Fallback if JSON parsing fails
        }
        throw new Error(errorBody?.message || `Failed to create campaign (${res.status})`);
      }
      const body = await res.json(); // Assuming successful response has JSON body with id
      return { success: true, id: body.id };
    } catch (error: any) {
      console.error('[CampaignService] createCampaign error:', error);
      return { success: false, error: error.message || 'An unexpected error occurred while creating the campaign.' };
    }
  }

// # ############################################################################ #
// # #                 SECTION 8 - PUBLIC METHOD: FETCH ALL CAMPAIGNS                 #
// # ############################################################################ #
  public async fetchAllCampaigns(): Promise<{ success: boolean; campaigns?: Campaign[]; error?: string }> {
    try {
      const headers = await this.getHeaders(); // No auth needed for public listing usually, but keeping for consistency
      const res = await fetch(`${this.API_BASE}/campaigns`, {
        method: 'GET',
        headers, // Remove if auth is not needed for this public endpoint
      });
      if (!res.ok) {
         let errorBody;
        try { errorBody = await res.json(); } catch (e) { errorBody = { message: res.statusText }; }
        throw new Error(errorBody?.message || `Failed to fetch campaigns (${res.status})`);
      }
      const data = await res.json();
      // Ensure data.campaigns is an array, even if empty, to prevent runtime errors.
      return { success: true, campaigns: Array.isArray(data.campaigns) ? data.campaigns : Array.isArray(data) ? data : [] };
    } catch (error: any) {
      console.error('[CampaignService] fetchAllCampaigns error:', error);
      return { success: false, error: error.message || 'Failed to fetch campaigns.' };
    }
  }

// # ############################################################################ #
// # #                 SECTION 9 - PUBLIC METHOD: FETCH CAMPAIGN (BY ID)                 #
// # ############################################################################ #
  public async fetchCampaign(
    id: string
  ): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
    if (!id || id.trim() === "") { // Basic validation for ID
        return { success: false, error: "Campaign ID is required." };
    }
    try {
      const headers = await this.getHeaders(); // Auth might be needed if details are sensitive or for owner checks later
      const res = await fetch(`${this.API_BASE}/campaigns/${id}`, {
        method: 'GET',
        headers,
      });
      if (!res.ok) {
        let errorBody;
        try { errorBody = await res.json(); } catch (e) { errorBody = { message: res.statusText }; }
        throw new Error(errorBody?.message || (res.status === 404 ? 'Campaign not found' : `Failed to fetch campaign (${res.status})`));
      }
      const campaign: Campaign = await res.json(); // Assuming response directly is the campaign object
      return { success: true, campaign };
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
    payload: UpdateCampaignPayload // MODIFIED to use UpdateCampaignPayload
  ): Promise<{ success: boolean; campaign?: Campaign; error?: string }> { // Return updated campaign
    if (!id || id.trim() === "") {
        return { success: false, error: "Campaign ID is required for update." };
    }
    try {
      const headers = await this.getHeaders(); // Auth is definitely needed here
      const res = await fetch(`${this.API_BASE}/campaigns/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let errorBody;
        try { errorBody = await res.json(); } catch (e) { errorBody = { message: res.statusText }; }
        throw new Error(errorBody?.message || `Failed to update campaign (${res.status})`);
      }
      const updatedCampaign: Campaign = await res.json(); // Assuming backend returns the updated campaign
      return { success: true, campaign: updatedCampaign };
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
      if (!res.ok) {
         // DELETE might return 204 No Content on success, or specific error body
        if (res.status === 204) {
            return { success: true };
        }
        let errorBody;
        try { errorBody = await res.json(); } catch (e) { errorBody = { message: res.statusText }; }
        throw new Error(errorBody?.message || `Failed to delete campaign (${res.status})`);
      }
      // If not 204, but still ok (e.g. 200 with a body), handle as success
      return { success: true };
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
    amount: number,
    txHash: string
    // Consider adding donorWalletAddress if needed by backend and not inferred from auth token
  ): Promise<{ success: boolean; donation?: Donation; error?: string }> { // Return created donation
    if (!campaignId || !amount || !txHash) {
        return { success: false, error: "Campaign ID, amount, and transaction hash are required." };
    }
    if (amount <= 0) {
        return { success: false, error: "Donation amount must be positive." };
    }
    try {
      const headers = await this.getHeaders(); // Auth might be needed to link donation to a user
      const res = await fetch(`${this.API_BASE}/campaigns/${campaignId}/donate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount, txHash }),
      });
      if (!res.ok) {
        let errorBody;
        try { errorBody = await res.json(); } catch (e) { errorBody = { message: res.statusText }; }
        throw new Error(errorBody?.message || `Failed to record donation (${res.status})`);
      }
      const newDonation: Donation = await res.json(); // Assuming backend returns the created donation object
      return { success: true, donation: newDonation };
    } catch (error: any) {
      console.error(`[CampaignService] recordDonation (campaignId: ${campaignId}) error:`, error);
      return { success: false, error: error.message || 'An unexpected error occurred while recording the donation.' };
    }
  }

// # ############################################################################ #
// # #                 SECTION 13 - PUBLIC METHOD: FETCH USER CAMPAIGNS                 #
// # ############################################################################ #
  public async fetchUserCampaigns(
    walletAddress: string
  ): Promise<{ success: boolean; campaigns?: Campaign[]; error?: string }> {
    if (!walletAddress || walletAddress.trim() === "") {
        return { success: false, error: "Wallet address is required to fetch user campaigns." };
    }
    try {
      const headers = await this.getHeaders(); // Auth needed to ensure user can only fetch their own
      const res = await fetch(`${this.API_BASE}/users/${walletAddress}/campaigns`, {
        method: 'GET',
        headers,
      });
      if (!res.ok) {
        let errorBody;
        try { errorBody = await res.json(); } catch (e) { errorBody = { message: res.statusText }; }
        throw new Error(errorBody?.message || `Failed to fetch user campaigns (${res.status})`);
      }
      const data = await res.json();
      return { success: true, campaigns: Array.isArray(data.campaigns) ? data.campaigns : Array.isArray(data) ? data : [] };
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