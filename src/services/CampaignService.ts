// src/services/CampaignService.ts

import { authService } from './AuthService';

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

export interface Donation {
  id: string;
  amount: number;
  donor: string;
  txHash: string;
  createdAt: string;
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
  
  private constructor() {}

  public static getInstance(): CampaignService {
    if (!CampaignService.instance) {
      CampaignService.instance = new CampaignService();
    }
    return CampaignService.instance;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const { token } = await authService.checkAuthStatus();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const apiKey = import.meta.env.VITE_WORLD_APP_API;
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    return headers;
  }

  private getApiBase(): string {
    const apiBase = import.meta.env.VITE_AMPLIFY_API;
    if (!apiBase) {
      throw new Error('Backend API URL is not configured');
    }
    return apiBase;
  }

  // Create a new campaign
  public async createCampaign(payload: CampaignPayload): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const apiBase = this.getApiBase();
      const headers = await this.getHeaders();

      const response = await fetch(`${apiBase}/campaigns`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create campaign' }));
        throw new Error(error.message);
      }

      const data = await response.json();
      return { success: true, id: data.id };

    } catch (error: any) {
      console.error('Failed to create campaign:', error);
      return { success: false, error: error.message || 'Failed to create campaign' };
    }
  }

  // Get all campaigns
  public async fetchAllCampaigns(): Promise<{ success: boolean; campaigns?: Campaign[]; error?: string }> {
    try {
      const apiBase = this.getApiBase();
      const headers = await this.getHeaders();

      const response = await fetch(`${apiBase}/campaigns`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }

      const data = await response.json();
      return { success: true, campaigns: data.campaigns };

    } catch (error: any) {
      console.error('Failed to fetch campaigns:', error);
      return { success: false, error: error.message || 'Failed to fetch campaigns' };
    }
  }

  // Get a single campaign
  public async fetchCampaign(id: string): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
    try {
      const apiBase = this.getApiBase();
      const headers = await this.getHeaders();

      const response = await fetch(`${apiBase}/campaigns/${id}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Campaign not found');
      }

      const campaign = await response.json();
      return { success: true, campaign };

    } catch (error: any) {
      console.error('Failed to fetch campaign:', error);
      return { success: false, error: error.message || 'Failed to fetch campaign' };
    }
  }

  // Update a campaign
  public async updateCampaign(id: string, payload: Partial<CampaignPayload>): Promise<{ success: boolean; error?: string }> {
    try {
      const apiBase = this.getApiBase();
      const headers = await this.getHeaders();

      const response = await fetch(`${apiBase}/campaigns/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update campaign' }));
        throw new Error(error.message);
      }

      return { success: true };

    } catch (error: any) {
      console.error('Failed to update campaign:', error);
      return { success: false, error: error.message || 'Failed to update campaign' };
    }
  }

  // Delete a campaign
  public async deleteCampaign(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const apiBase = this.getApiBase();
      const headers = await this.getHeaders();

      const response = await fetch(`${apiBase}/campaigns/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete campaign' }));
        throw new Error(error.message);
      }

      return { success: true };

    } catch (error: any) {
      console.error('Failed to delete campaign:', error);
      return { success: false, error: error.message || 'Failed to delete campaign' };
    }
  }

  // Record a donation
  public async recordDonation(campaignId: string, amount: number, txHash: string): Promise<{ success: boolean; error?: string }> {
    try {
      const apiBase = this.getApiBase();
      const headers = await this.getHeaders();

      const response = await fetch(`${apiBase}/campaigns/${campaignId}/donate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount, txHash }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to record donation' }));
        throw new Error(error.message);
      }

      return { success: true };

    } catch (error: any) {
      console.error('Failed to record donation:', error);
      return { success: false, error: error.message || 'Failed to record donation' };
    }
  }

  // Get user's campaigns
  public async fetchUserCampaigns(walletAddress: string): Promise<{ success: boolean; campaigns?: Campaign[]; error?: string }> {
    try {
      const apiBase = this.getApiBase();
      const headers = await this.getHeaders();

      const response = await fetch(`${apiBase}/users/${walletAddress}/campaigns`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user campaigns');
      }

      const data = await response.json();
      return { success: true, campaigns: data.campaigns };

    } catch (error: any) {
      console.error('Failed to fetch user campaigns:', error);
      return { success: false, error: error.message || 'Failed to fetch user campaigns' };
    }
  }
}

export const campaignService = CampaignService.getInstance();