// src/services/AuthService.ts
// Service for handling authentication with the backend

import type { MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';
import type { ISuccessResult as IDKitSuccessResult } from '@worldcoin/idkit';

// Constants
const SESSION_TOKEN_KEY = 'worldfund_session_token';
const WALLET_ADDRESS_KEY = 'worldfund_wallet_address';

// Class for authentication service
class AuthService {
  private static instance: AuthService;
  private API_BASE: string;
  private API_KEY?: string;

  private constructor() {
    // Get API base URL from environment or use a default
    this.API_BASE = import.meta.env.VITE_AMPLIFY_API || import.meta.env.VITE_APP_BACKEND_API_URL || '';
    this.API_KEY = import.meta.env.VITE_WORLD_APP_API || import.meta.env.VITE_APP_BACKEND_API_KEY;
    
    if (!this.API_BASE) {
      console.warn('[AuthService] No API base URL configured. Using fallback: /api');
      this.API_BASE = '/api'; // Fallback to relative path
    }
    
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
      const headers = this.getHeaders(false); // Don't include auth token for nonce
      
      const res = await fetch(`${this.API_BASE}/auth/nonce`, {
        method: 'GET',
        headers,
      });
      
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        console.error('[AuthService] Nonce fetch failed:', errorBody);
        return { 
          success: false, 
          error: errorBody.message || `Failed to fetch nonce (${res.status})` 
        };
      }
      
      const data = await res.json();
      
      if (!data.nonce) {
        return { success: false, error: 'Nonce not found in response' };
      }
      
      console.log('[AuthService] Nonce received successfully');
      return { success: true, nonce: data.nonce };
    } catch (error: any) {
      console.error('[AuthService] Error fetching nonce:', error);
      return { 
        success: false, 
        error: error.message || 'Network error while fetching nonce' 
      };
    }
  }

  /** Verifies a wallet signature with the backend */
  public async verifyWalletSignature(
    payload: MiniAppWalletAuthSuccessPayload,
    nonce: string
  ): Promise<{ 
    success: boolean; 
    error?: string; 
    token?: string; 
    walletAddress?: string 
  }> {
    console.log('[AuthService] Verifying wallet signature...');
    
    try {
      const headers = this.getHeaders(false); // Don't include auth token for verification
      
      const res = await fetch(`${this.API_BASE}/auth/verify-signature`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ payload, nonce }),
      });
      
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        console.error('[AuthService] Signature verification failed:', errorBody);
        return { 
          success: false, 
          error: errorBody.message || `Verification failed (${res.status})` 
        };
      }
      
      const data = await res.json();
      
      if (!data.token || !data.walletAddress) {
        return { 
          success: false, 
          error: 'Token or wallet address missing from response' 
        };
      }
      
      // Store session data in localStorage
      localStorage.setItem(SESSION_TOKEN_KEY, data.token);
      localStorage.setItem(WALLET_ADDRESS_KEY, data.walletAddress);
      
      console.log('[AuthService] Signature verified successfully');
      return { 
        success: true, 
        token: data.token, 
        walletAddress: data.walletAddress 
      };
    } catch (error: any) {
      console.error('[AuthService] Error verifying signature:', error);
      return { 
        success: false, 
        error: error.message || 'Network error during verification' 
      };
    }
  }

  /** Verifies World ID proof with the backend */
  public async verifyWorldIdProof(
    proof: IDKitSuccessResult
  ): Promise<{ success: boolean; error?: string }> {
    console.log('[AuthService] Verifying World ID proof...');
    
    try {
      const headers = this.getHeaders(true); // Include auth token
      
      const res = await fetch(`${this.API_BASE}/verify-worldid`, {
        method: 'POST',
        headers,
        body: JSON.stringify(proof),
      });
      
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        console.error('[AuthService] World ID verification failed:', errorBody);
        return { 
          success: false, 
          error: errorBody.message || `Verification failed (${res.status})` 
        };
      }
      
      const data = await res.json();
      console.log('[AuthService] World ID proof verified successfully');
      
      return { success: true };
    } catch (error: any) {
      console.error('[AuthService] Error verifying World ID proof:', error);
      return { 
        success: false, 
        error: error.message || 'Network error during verification' 
      };
    }
  }

  /** Logs the user out */
  public async logout(): Promise<{ success: boolean; error?: string }> {
    console.log('[AuthService] Logging out...');
    
    try {
      // Clear local storage first (in case backend call fails)
      localStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(WALLET_ADDRESS_KEY);
      
      try {
        // Optional: Call backend logout endpoint
        // const headers = this.getHeaders(true);
        // await fetch(`${this.API_BASE}/auth/logout`, {
        //   method: 'POST',
        //   headers,
        // });
      } catch (backendError) {
        console.warn('[AuthService] Backend logout failed, but local logout succeeded');
        // Continue with local logout even if backend logout fails
      }
      
      console.log('[AuthService] Logout successful');
      return { success: true };
    } catch (error: any) {
      console.error('[AuthService] Error during logout:', error);
      return { 
        success: false, 
        error: error.message || 'Logout failed' 
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
      
      if (token && walletAddress) {
        console.log('[AuthService] Found valid session data');
        return { 
          isAuthenticated: true, 
          token, 
          walletAddress 
        };
      }
      
      console.log('[AuthService] No valid session found');
      return { 
        isAuthenticated: false, 
        token: null, 
        walletAddress: null 
      };
    } catch (error) {
      console.error('[AuthService] Error checking auth status:', error);
      // Clear potentially corrupted data
      localStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(WALLET_ADDRESS_KEY);
      
      return { 
        isAuthenticated: false, 
        token: null, 
        walletAddress: null 
      };
    }
  }

  /** Verifies that a token is valid (optional backend call) */
  public async verifyToken(token: string): Promise<{ 
    isValid: boolean; 
    error?: string;
    walletAddress?: string;
  }> {
    console.log('[AuthService] Verifying token validity...');
    
    try {
      // Option 1: Simple client-side validation by decoding JWT
      try {
        const parts = token.split('.');
        if (parts.length !== 3) {
          return { isValid: false, error: 'Invalid token format' };
        }
        
        // Make sure the payload part exists and is a string before calling atob
        const payloadPart = parts[1];
        if (!payloadPart) {
          return { isValid: false, error: 'Invalid token format: missing payload' };
        }
        
        // Now payloadPart is guaranteed to be a string
        const payload = JSON.parse(atob(payloadPart));
        
        // Check token expiry
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          return { isValid: false, error: 'Token expired' };
        }
        
        // Check if payload contains wallet address
        if (!payload.walletAddress) {
          return { isValid: false, error: 'Token missing wallet address' };
        }
        
        return { 
          isValid: true, 
          walletAddress: payload.walletAddress 
        };
      } catch (decodeError) {
        console.error('[AuthService] Error decoding token:', decodeError);
        return { isValid: false, error: 'Invalid token format' };
      }
      
      // Option 2: Verify with backend (commented out for now)
      /*
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      
      if (this.API_KEY) {
        headers['x-api-key'] = this.API_KEY;
      }
      
      const res = await fetch(`${this.API_BASE}/auth/verify-token`, {
        method: 'GET',
        headers,
      });
      
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        return { 
          isValid: false, 
          error: errorBody.message || `Token validation failed (${res.status})` 
        };
      }
      
      const data = await res.json();
      
      return { 
        isValid: true, 
        walletAddress: data.walletAddress 
      };
      */
    } catch (error: any) {
      console.error('[AuthService] Error verifying token:', error);
      return { 
        isValid: false, 
        error: error.message || 'Network error during token validation' 
      };
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
export default AuthService;