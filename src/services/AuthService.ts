// src/services/AuthService.ts
// Service for handling authentication with the backend

import type { MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';
import type { ISuccessResult as IDKitSuccessResult } from '@worldcoin/idkit';

// Constants
const SESSION_TOKEN_KEY = 'worldfund_session_token';
const WALLET_ADDRESS_KEY  = 'worldfund_wallet_address';

// Class for authentication service
class AuthService {
  private static instance: AuthService;
  private API_BASE: string;
  private API_KEY?: string;

  private constructor() {
    // Determine API base URL from env vars, fallback to '/api'
    const envUrl =
      import.meta.env.VITE_AMPLIFY_API ||
      import.meta.env.VITE_APP_BACKEND_API_URL;
    if (envUrl) {
      this.API_BASE = envUrl;
    } else {
      console.warn(
        '[AuthService] No VITE_AMPLIFY_API or VITE_APP_BACKEND_API_URL set; defaulting to /api'
      );
      this.API_BASE = '/api';
    }

    // Pick up optional API key
    this.API_KEY =
      import.meta.env.VITE_WORLD_APP_API ||
      import.meta.env.VITE_APP_BACKEND_API_KEY;

    console.log('[AuthService] Initialized with API base:', this.API_BASE);
  }

  /** Get singleton instance */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /** Generate headers with authorization if available */
  private getHeaders(includeAuth: boolean = true): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.API_KEY) {
      headers['x-api-key'] = this.API_KEY;
    }

    if (includeAuth) {
      const token = localStorage.getItem(SESSION_TOKEN_KEY);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /** Fetches a unique nonce from the backend. */
  public async getNonce(): Promise<{ success: boolean; nonce?: string; error?: string }> {
    console.log('[AuthService] Fetching nonce...');
    try {
      const res = await fetch(`${this.API_BASE}/auth/nonce`, {
        method: 'GET',
        headers: this.getHeaders(false),
      });

      const errorBody = !res.ok
        ? await res.json().catch(() => ({}))
        : null;

      if (!res.ok) {
        console.error('[AuthService] Nonce fetch failed:', errorBody);
        return {
          success: false,
          error: (errorBody as any).message || `Failed to fetch nonce (${res.status})`,
        };
      }

      const data = await res.json();
      if (!data.nonce) {
        console.error('[AuthService] Nonce missing in response', data);
        return { success: false, error: 'Nonce not found in response' };
      }

      console.log('[AuthService] Nonce received successfully');
      return { success: true, nonce: data.nonce };
    } catch (error: any) {
      console.error('[AuthService] Error fetching nonce:', error);
      return {
        success: false,
        error: error.message || 'Network error while fetching nonce',
      };
    }
  }

  /** Verifies a wallet signature with the backend */
  public async verifyWalletSignature(
    payload: MiniAppWalletAuthSuccessPayload,
    nonce: string
  ): Promise<{ success: boolean; token?: string; walletAddress?: string; error?: string }> {
    console.log('[AuthService] Verifying wallet signature...');
    try {
      const res = await fetch(`${this.API_BASE}/auth/verify-signature`, {
        method: 'POST',
        headers: this.getHeaders(false),
        body: JSON.stringify({ payload, nonce }),
      });

      const errorBody = !res.ok
        ? await res.json().catch(() => ({}))
        : null;

      if (!res.ok) {
        console.error('[AuthService] Signature verification failed:', errorBody);
        return {
          success: false,
          error: (errorBody as any).message || `Verification failed (${res.status})`,
        };
      }

      const data = await res.json();
      if (!data.token || !data.walletAddress) {
        console.error('[AuthService] Missing token or walletAddress in:', data);
        return {
          success: false,
          error: 'Token or wallet address missing from response',
        };
      }

      // Persist session
      localStorage.setItem(SESSION_TOKEN_KEY, data.token);
      localStorage.setItem(WALLET_ADDRESS_KEY, data.walletAddress);

      console.log('[AuthService] Signature verified successfully');
      return {
        success: true,
        token: data.token,
        walletAddress: data.walletAddress,
      };
    } catch (error: any) {
      console.error('[AuthService] Error verifying signature:', error);
      return {
        success: false,
        error: error.message || 'Network error during verification',
      };
    }
  }

  /** Verifies World ID proof with the backend */
  public async verifyWorldIdProof(
    proof: IDKitSuccessResult
  ): Promise<{ success: boolean; error?: string }> {
    console.log('[AuthService] Verifying World ID proof...');
    try {
      const res = await fetch(`${this.API_BASE}/verify-worldid`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(proof),
      });

      const errorBody = !res.ok
        ? await res.json().catch(() => ({}))
        : null;

      if (!res.ok) {
        console.error('[AuthService] World ID verification failed:', errorBody);
        return {
          success: false,
          error: (errorBody as any).message || `Verification failed (${res.status})`,
        };
      }

      console.log('[AuthService] World ID proof verified successfully');
      return { success: true };
    } catch (error: any) {
      console.error('[AuthService] Error verifying World ID proof:', error);
      return {
        success: false,
        error: error.message || 'Network error during verification',
      };
    }
  }

  /** Logs the user out */
  public async logout(): Promise<{ success: boolean; error?: string }> {
    console.log('[AuthService] Logging out...');
    try {
      // Clear local session
      localStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(WALLET_ADDRESS_KEY);
      console.log('[AuthService] Logout successful');
      return { success: true };
    } catch (error: any) {
      console.error('[AuthService] Error during logout:', error);
      return {
        success: false,
        error: error.message || 'Logout failed',
      };
    }
  }

  /** Checks if the user is authenticated */
  public async checkAuthStatus(): Promise<{
    isAuthenticated: boolean;
    token: string | null;
    walletAddress: string | null;
  }> {
    console.log('[AuthService] Checking auth status...');
    try {
      const token = localStorage.getItem(SESSION_TOKEN_KEY);
      const walletAddress = localStorage.getItem(WALLET_ADDRESS_KEY);
      const ok = Boolean(token && walletAddress);
      console.log('[AuthService] Auth status →', ok);
      return {
        isAuthenticated: ok,
        token: token || null,
        walletAddress: walletAddress || null,
      };
    } catch (error: any) {
      console.error('[AuthService] Error checking auth status:', error);
      localStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(WALLET_ADDRESS_KEY);
      return { isAuthenticated: false, token: null, walletAddress: null };
    }
  }

  /** Verifies that a token is valid (optional JWT‐decode) */
  public async verifyToken(token: string): Promise<{
    isValid: boolean;
    error?: string;
    walletAddress?: string;
  }> {
    console.log('[AuthService] Verifying token validity...');
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { isValid: false, error: 'Invalid token format' };
      }

      const payloadPart = parts[1];
      if (!payloadPart) {
        return { isValid: false, error: 'Invalid token format' };
      }

      // Decode + parse
      const decoded = atob(payloadPart);
      const payload = JSON.parse(decoded);

      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return { isValid: false, error: 'Token expired' };
      }
      if (!payload.walletAddress) {
        return { isValid: false, error: 'Token missing wallet address' };
      }

      return { isValid: true, walletAddress: payload.walletAddress };
    } catch (error: any) {
      console.error('[AuthService] Error decoding/verifying token:', error);
      return { isValid: false, error: error.message || 'Network error during token validation' };
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
export default AuthService;
