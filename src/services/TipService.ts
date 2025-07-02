// src/services/TipService.ts

import { authService } from './AuthService';

interface SubmitTipPayload {
  amount: number;
  txHash: string;
  message?: string;
}

class TipService {
  private static instance: TipService;
  private API_BASE: string;

  private constructor() {
    const envApi = import.meta.env.VITE_AMPLIFY_API;

    if (!envApi) {
      console.error('[TipService] CRITICAL: VITE_AMPLIFY_API environment variable not set.');
      throw new Error('VITE_AMPLIFY_API environment variable is required but not configured.');
    }

    try {
      const testUrl = new URL(envApi);
      if (!testUrl.protocol.startsWith('http')) {
        throw new Error('VITE_AMPLIFY_API must use HTTP or HTTPS protocol');
      }
      this.API_BASE = envApi.endsWith('/') ? envApi.slice(0, -1) : envApi;
      console.log('[TipService] API Base URL configured:', this.API_BASE);
    } catch (error) {
      console.error('[TipService] Invalid VITE_AMPLIFY_API URL format:', envApi, error);
      throw new Error(`Invalid VITE_AMPLIFY_API URL format: ${envApi}`);
    }
  }

  public static getInstance(): TipService {
    if (!TipService.instance) {
      TipService.instance = new TipService();
    }
    return TipService.instance;
  }

  private async getHeaders(includeAuth: boolean = true): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (includeAuth) {
      try {
        const authData = await authService.checkAuthStatus();
        if (authData.token) {
          headers['Authorization'] = `Bearer ${authData.token}`;
        }
      } catch (error) {
        console.warn('[TipService] Could not get auth token:', error);
      }
    }
    return headers;
  }

  public async submitTip(payload: SubmitTipPayload): Promise<{ success: boolean; error?: string }> {
    // NOTE: Bad words filtering should be implemented on the backend for security and efficiency.
    // The frontend sends the message, and the backend should handle validation and sanitization.
    try {
      const headers = await this.getHeaders(true);
      const response = await fetch(`${this.API_BASE}/tips`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage: string;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || `HTTP ${response.status}: ${response.statusText}`;
        } catch (e) {
          errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
        }
        return { success: false, error: errorMessage };
      }

      return { success: true };
    } catch (error: any) {
      console.error('[TipService] Error submitting tip:', error);
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  }
}

export const tipService = TipService.getInstance();