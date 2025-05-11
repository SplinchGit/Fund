// src/services/CampaignService.ts

import { authService } from './AuthService';

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
  ownerId: string;
  image?: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  donations: Donation[];
  currency: 'WLD';
}

export interface CampaignPayload {
  title: string;
  description?: string;
  goal: number;
  image?: string;
}

class CampaignService {
  private static instance: CampaignService;
  private API_BASE: string;
  private API_KEY?: string;

  private constructor() {
    // Determine API base URL from env and fallback to /api
    const envApi = import.meta.env.VITE_AMPLIFY_API || import.meta.env.VITE_APP_BACKEND_API_URL;
    if (envApi) {
      this.API_BASE = envApi;
    } else {
      console.warn('[CampaignService] No VITE_AMPLIFY_API or VITE_APP_BACKEND_API_URL set; defaulting to /api');
      this.API_BASE = '/api';
    }
    // Optional API key
    this.API_KEY = import.meta.env.VITE_WORLD_APP_API || import.meta.env.VITE_APP_BACKEND_API_KEY;
    console.log('[CampaignService] Initialized with API base:', this.API_BASE);
  }

  /** Get singleton instance */
  public static getInstance(): CampaignService {
    if (!CampaignService.instance) {
      CampaignService.instance = new CampaignService();
    }
    return CampaignService.instance;
  }

  /** Build headers including auth token and API key */
  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    // auth token
    const { token } = await authService.checkAuthStatus();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // api key
    if (this.API_KEY) {
      headers['x-api-key'] = this.API_KEY;
    }
    return headers;
  }

  /** Create a new campaign */
  public async createCampaign(
    payload: CampaignPayload
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(`${this.API_BASE}/campaigns`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((body as any).message || `Failed to create campaign (${res.status})`);
      }
      return { success: true, id: (body as any).id };
    } catch (error: any) {
      console.error('[CampaignService] createCampaign error:', error);
      return { success: false, error: error.message || 'Failed to create campaign' };
    }
  }

  /** Fetch all campaigns */
  public async fetchAllCampaigns(): Promise<{ success: boolean; campaigns?: Campaign[]; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(`${this.API_BASE}/campaigns`, {
        method: 'GET',
        headers,
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch campaigns (${res.status})`);
      }
      const data = await res.json();
      return { success: true, campaigns: data.campaigns };
    } catch (error: any) {
      console.error('[CampaignService] fetchAllCampaigns error:', error);
      return { success: false, error: error.message || 'Failed to fetch campaigns' };
    }
  }

  /** Fetch single campaign by ID */
  public async fetchCampaign(
    id: string
  ): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(`${this.API_BASE}/campaigns/${id}`, {
        method: 'GET',
        headers,
      });
      if (!res.ok) {
        throw new Error(`Campaign not found (${res.status})`);
      }
      const campaign = await res.json();
      return { success: true, campaign };
    } catch (error: any) {
      console.error('[CampaignService] fetchCampaign error:', error);
      return { success: false, error: error.message || 'Failed to fetch campaign' };
    }
  }

  /** Update an existing campaign */
  public async updateCampaign(
    id: string,
    payload: Partial<CampaignPayload>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(`${this.API_BASE}/campaigns/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((body as any).message || `Failed to update campaign (${res.status})`);
      }
      return { success: true };
    } catch (error: any) {
      console.error('[CampaignService] updateCampaign error:', error);
      return { success: false, error: error.message || 'Failed to update campaign' };
    }
  }

  /** Delete a campaign by ID */
  public async deleteCampaign(
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(`${this.API_BASE}/campaigns/${id}`, {
        method: 'DELETE',
        headers,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((body as any).message || `Failed to delete campaign (${res.status})`);
      }
      return { success: true };
    } catch (error: any) {
      console.error('[CampaignService] deleteCampaign error:', error);
      return { success: false, error: error.message || 'Failed to delete campaign' };
    }
  }

  /** Record a donation for a campaign */
  public async recordDonation(
    campaignId: string,
    amount: number,
    txHash: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(`${this.API_BASE}/campaigns/${campaignId}/donate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount, txHash }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((body as any).message || `Failed to record donation (${res.status})`);
      }
      return { success: true };
    } catch (error: any) {
      console.error('[CampaignService] recordDonation error:', error);
      return { success: false, error: error.message || 'Failed to record donation' };
    }
  }

  /** Fetch campaigns belonging to a specific user */
  public async fetchUserCampaigns(
    walletAddress: string
  ): Promise<{ success: boolean; campaigns?: Campaign[]; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const res = await fetch(`${this.API_BASE}/users/${walletAddress}/campaigns`, {
        method: 'GET',
        headers,
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch user campaigns (${res.status})`);
      }
      const data = await res.json();
      return { success: true, campaigns: data.campaigns };
    } catch (error: any) {
      console.error('[CampaignService] fetchUserCampaigns error:', error);
      return { success: false, error: error.message || 'Failed to fetch user campaigns' };
    }
  }
}

export const campaignService = CampaignService.getInstance();
