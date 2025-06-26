// # ############################################################################ #
// # #                           SECTION 1 - IMPORTS                            #
// # ############################################################################ #
import { authService } from './AuthService';

// # ############################################################################ #
// # #                       SECTION 2 - INTERFACE DEFINITIONS                  #
// # ############################################################################ #
export interface AdminBanUserRequest {
  walletAddress: string;
  reason?: string;
}

export interface AdminUnbanUserRequest {
  walletAddress: string;
}

export interface AdminDeleteCampaignRequest {
  campaignId: string;
  reason?: string;
}

export interface AdminBanResult {
  success: boolean;
  message?: string;
  banRecord?: {
    walletAddress: string;
    bannedAt: string;
    bannedBy: string;
    reason: string;
    isActive: boolean;
  };
  error?: string;
}

export interface AdminUnbanResult {
  success: boolean;
  message?: string;
  record?: any;
  error?: string;
}

export interface AdminDeleteCampaignResult {
  success: boolean;
  message?: string;
  campaignId?: string;
  deletedBy?: string;
  reason?: string;
  error?: string;
}

export interface AdminActionsSummary {
  campaignDeleted: boolean;
  userBanned: boolean;
  campaignDeleteError?: string;
  banError?: string;
  campaignId?: string;
  bannedUser?: string;
  reason?: string;
}

export interface AdminStatusResponse {
  isAdmin: boolean;
  walletAddress?: string;
  message?: string;
}

// # ############################################################################ #
// # #                   SECTION 3 - SERVICE CLASS DEFINITION                   #
// # ############################################################################ #
class AdminService {
  private static instance: AdminService;
  private API_BASE: string;

  // # ############################################################################ #
  // # #                   SECTION 4 - SERVICE CLASS CONSTRUCTOR                  #
  // # ############################################################################ #
  private constructor() {
    const envApi = import.meta.env.VITE_AMPLIFY_API;

    if (!envApi) {
      console.error('[AdminService] CRITICAL: VITE_AMPLIFY_API environment variable not set.');
      throw new Error('VITE_AMPLIFY_API environment variable is required but not configured.');
    }

    // Validate and normalize the URL
    try {
      const testUrl = new URL(envApi);
      if (!testUrl.protocol.startsWith('http')) {
        throw new Error('VITE_AMPLIFY_API must use HTTP or HTTPS protocol');
      }
      this.API_BASE = envApi.endsWith('/') ? envApi.slice(0, -1) : envApi;
      console.log('[AdminService] API Base URL configured:', this.API_BASE);
    } catch (error) {
      console.error('[AdminService] Invalid VITE_AMPLIFY_API URL format:', envApi, error);
      throw new Error(`Invalid VITE_AMPLIFY_API URL format: ${envApi}`);
    }
  }

  // # ############################################################################ #
  // # #                   SECTION 5 - SERVICE CLASS GET INSTANCE                 #
  // # ############################################################################ #
  public static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }

  // # ############################################################################ #
  // # #                   SECTION 6 - PRIVATE HELPER: GET HEADERS                #
  // # ############################################################################ #
  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    try {
      const authData = await authService.checkAuthStatus();
      if (authData.token) {
        headers['Authorization'] = `Bearer ${authData.token}`;
      } else {
        console.warn('[AdminService] No auth token available for admin request');
      }
    } catch (error) {
      console.warn('[AdminService] Could not get auth token:', error);
    }

    return headers;
  }

  // # ############################################################################ #
  // # #                   SECTION 7 - PRIVATE HELPER: MAKE REQUEST               #
  // # ############################################################################ #
  private async makeRequest<T>(
    endpoint: string,
    method: string = 'POST',
    body?: any
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const headers = await this.getHeaders();
      const url = `${this.API_BASE}${endpoint}`;

      console.log(`[AdminService] Making ${method} request to: ${url}`);

      const requestOptions: RequestInit = {
        method,
        headers,
        mode: 'cors',
        credentials: 'same-origin',
      };

      if (body && method !== 'GET') {
        requestOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, requestOptions);

      console.log(`[AdminService] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage: string;

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || `HTTP ${response.status}: ${response.statusText}`;
        } catch (e) {
          errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
        }

        console.error(`[AdminService] Request failed:`, errorMessage);
        return { success: false, error: errorMessage };
      }

      // Handle empty responses (like 204 No Content)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return { success: true };
      }

      const data = await response.json();
      console.log(`[AdminService] Request successful`);
      return { success: true, data };

    } catch (error: any) {
      const errorMessage = error.message || 'Network error occurred';
      console.error(`[AdminService] Request error:`, error);

      // Provide user-friendly error messages
      let friendlyError = errorMessage;
      if (errorMessage.includes('Failed to fetch')) {
        friendlyError = 'Network connection failed. Please check your internet connection and try again.';
      } else if (errorMessage.includes('TypeError')) {
        friendlyError = 'Network request error. Please try again.';
      }

      return { success: false, error: friendlyError };
    }
  }

  // # ############################################################################ #
  // # #                   SECTION 8 - PUBLIC METHOD: CHECK ADMIN STATUS (UPDATED) #
  // # ############################################################################ #
  public async checkAdminStatus(): Promise<boolean> {
    try {
      const authData = await authService.checkAuthStatus();
      if (!authData.isAuthenticated || !authData.walletAddress) {
        console.log('[AdminService] User not authenticated, cannot check admin status');
        return false;
      }

      console.log(`[AdminService] Checking admin status for wallet ${authData.walletAddress.substring(0, 6)}...`);

      // Call the server-side admin status endpoint (SECURITY FIX)
      const result = await this.makeRequest<AdminStatusResponse>(
        '/auth/admin/status',
        'GET'
      );

      if (result.success && result.data) {
        const isAdmin = result.data.isAdmin;
        console.log(`[AdminService] Server-side admin status check: ${isAdmin} for wallet ${authData.walletAddress.substring(0, 6)}...`);
        return isAdmin;
      } else {
        console.error('[AdminService] Failed to check admin status:', result.error);
        // Fail closed - deny admin access if we can't verify
        return false;
      }

    } catch (error) {
      console.error('[AdminService] Error checking admin status:', error);
      // Fail closed - deny admin access on error
      return false;
    }
  }

  // # ############################################################################ #
  // # #                   SECTION 9 - PUBLIC METHOD: BAN USER                    #
  // # ############################################################################ #
  public async banUser(request: AdminBanUserRequest): Promise<AdminBanResult> {
    console.log(`[AdminService] Banning user: ${request.walletAddress.substring(0, 6)}...`);

    if (!request.walletAddress) {
      return { success: false, error: 'Wallet address is required' };
    }

    if (!request.walletAddress.startsWith('0x') || request.walletAddress.length !== 42) {
      return { success: false, error: 'Invalid wallet address format' };
    }

    try {
      const result = await this.makeRequest<any>(
        '/auth/admin/ban-user',
        'POST',
        {
          walletAddress: request.walletAddress,
          reason: request.reason || 'No reason provided'
        }
      );

      if (result.success && result.data) {
        return {
          success: true,
          message: result.data.message,
          banRecord: result.data.banRecord
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to ban user'
      };

    } catch (error: any) {
      console.error('[AdminService] Error banning user:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred while banning user'
      };
    }
  }

  // # ############################################################################ #
  // # #                   SECTION 10 - PUBLIC METHOD: UNBAN USER                 #
  // # ############################################################################ #
  public async unbanUser(request: AdminUnbanUserRequest): Promise<AdminUnbanResult> {
    console.log(`[AdminService] Unbanning user: ${request.walletAddress.substring(0, 6)}...`);

    if (!request.walletAddress) {
      return { success: false, error: 'Wallet address is required' };
    }

    if (!request.walletAddress.startsWith('0x') || request.walletAddress.length !== 42) {
      return { success: false, error: 'Invalid wallet address format' };
    }

    try {
      const result = await this.makeRequest<any>(
        '/auth/admin/unban-user',
        'POST',
        { walletAddress: request.walletAddress }
      );

      if (result.success && result.data) {
        return {
          success: true,
          message: result.data.message,
          record: result.data.record
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to unban user'
      };

    } catch (error: any) {
      console.error('[AdminService] Error unbanning user:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred while unbanning user'
      };
    }
  }

  // # ############################################################################ #
  // # #                   SECTION 11 - PUBLIC METHOD: DELETE CAMPAIGN            #
  // # ############################################################################ #
  public async deleteCampaign(request: AdminDeleteCampaignRequest): Promise<AdminDeleteCampaignResult> {
    console.log(`[AdminService] Admin deleting campaign: ${request.campaignId}`);

    if (!request.campaignId) {
      return { success: false, error: 'Campaign ID is required' };
    }

    try {
      const result = await this.makeRequest<any>(
        '/auth/admin/delete-campaign',
        'POST',
        {
          campaignId: request.campaignId,
          reason: request.reason || 'No reason provided'
        }
      );

      if (result.success && result.data) {
        return {
          success: true,
          message: result.data.message,
          campaignId: result.data.campaignId,
          deletedBy: result.data.deletedBy,
          reason: result.data.reason
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to delete campaign'
      };

    } catch (error: any) {
      console.error('[AdminService] Error deleting campaign:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred while deleting campaign'
      };
    }
  }

  // # ############################################################################ #
  // # #                   SECTION 12 - PUBLIC METHOD: COMBINED ADMIN ACTIONS     #
  // # ############################################################################ #
  public async performAdminActions(
    campaignId: string,
    campaignOwnerId: string,
    options: {
      deleteCampaign: boolean;
      banUser: boolean;
      reason?: string;
    }
  ): Promise<AdminActionsSummary> {
    console.log(`[AdminService] Performing admin actions on campaign: ${campaignId}`);

    const summary: AdminActionsSummary = {
      campaignDeleted: false,
      userBanned: false,
      campaignId,
      bannedUser: options.banUser ? campaignOwnerId : undefined,
      reason: options.reason
    };

    // Always delete campaign first (as per requirements)
    if (options.deleteCampaign) {
      try {
        const deleteResult = await this.deleteCampaign({
          campaignId,
          reason: options.reason
        });

        if (deleteResult.success) {
          summary.campaignDeleted = true;
          console.log(`[AdminService] Campaign deleted successfully: ${campaignId}`);
        } else {
          summary.campaignDeleteError = deleteResult.error;
          console.error(`[AdminService] Failed to delete campaign: ${deleteResult.error}`);
        }
      } catch (error: any) {
        summary.campaignDeleteError = error.message || 'Unexpected error deleting campaign';
        console.error(`[AdminService] Exception deleting campaign:`, error);
      }
    }

    // Ban user if requested
    if (options.banUser && campaignOwnerId) {
      try {
        const banResult = await this.banUser({
          walletAddress: campaignOwnerId,
          reason: options.reason
        });

        if (banResult.success) {
          summary.userBanned = true;
          console.log(`[AdminService] User banned successfully: ${campaignOwnerId.substring(0, 6)}...`);
        } else {
          summary.banError = banResult.error;
          console.error(`[AdminService] Failed to ban user: ${banResult.error}`);
        }
      } catch (error: any) {
        summary.banError = error.message || 'Unexpected error banning user';
        console.error(`[AdminService] Exception banning user:`, error);
      }
    }

    return summary;
  }
}

// # ############################################################################ #
// # #                   SECTION 13 - SINGLETON INSTANCE EXPORT                 #
// # ############################################################################ #
export const adminService = AdminService.getInstance();