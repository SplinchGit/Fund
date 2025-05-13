// src/services/AuthService.ts
// Service for handling authentication with the backend

import type { MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';
import type { ISuccessResult as IDKitSuccessResult } from '@worldcoin/idkit';

// Constants
const SESSION_TOKEN_KEY = 'worldfund_session_token';
const WALLET_ADDRESS_KEY = 'worldfund_wallet_address';
const DEFAULT_TIMEOUT = 15000; // 15 seconds timeout for fetch requests

// Class for authentication service
class AuthService {
  private static instance: AuthService;
  private API_BASE: string;
  private API_KEY?: string;

  private constructor() {
    // Log all environment variables for debugging
    console.log('[AuthService] Environment variables:', {
      VITE_AMPLIFY_API: import.meta.env.VITE_AMPLIFY_API,
      VITE_APP_BACKEND_API_URL: import.meta.env.VITE_APP_BACKEND_API_URL,
      VITE_WORLD_APP_API: import.meta.env.VITE_WORLD_APP_API,
      VITE_APP_BACKEND_API_KEY: import.meta.env.VITE_APP_BACKEND_API_KEY,
      MODE: import.meta.env.MODE,
      DEV: import.meta.env.DEV,
      BASE_URL: import.meta.env.BASE_URL
    });

    // Determine API base URL from env vars, fallback to '/api'
    const envUrl =
      import.meta.env.VITE_AMPLIFY_API ||
      import.meta.env.VITE_APP_BACKEND_API_URL;
    
    if (envUrl) {
      // Normalize the URL - ensure it doesn't end with a slash
      this.API_BASE = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
      
      // Basic URL validation
      try {
        new URL(this.API_BASE); // Will throw if invalid URL
      } catch (error) {
        console.error('[AuthService] Invalid API URL format:', this.API_BASE);
        // Fall back to a relative path if URL is invalid
        this.API_BASE = '/api';
      }
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

  /** Build a properly-formed URL with the API base */
  private buildUrl(path: string): string {
    // Ensure path starts with a slash
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.API_BASE}${normalizedPath}`;
  }

  /** Generate headers with authorization if available */
  private getHeaders(includeAuth: boolean = true): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // Add CORS headers
      'Accept': 'application/json, text/plain, */*',
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

  /** Enhanced fetch with timeout and error handling */
  private async fetchWithTimeout(
    url: string, 
    options: RequestInit, 
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** Fetches a unique nonce from the backend. */
  public async getNonce(): Promise<{ success: boolean; nonce?: string; error?: string }> {
    console.log('[AuthService] Fetching nonce...');
    try {
      // Build URL and log for debugging
      const url = this.buildUrl('/auth/nonce');
      console.log('[AuthService] Fetching from:', url);
      
      // Enhanced fetch with timeout
      const res = await this.fetchWithTimeout(
        url, 
        {
          method: 'GET',
          headers: this.getHeaders(false),
          mode: 'cors', // Explicit CORS mode
          credentials: 'same-origin',
        },
        10000 // 10 second timeout for nonce
      );

      console.log('[AuthService] Response:', {
        status: res.status,
        statusText: res.statusText,
        contentType: res.headers.get('Content-Type'),
        url: res.url,
      });

      // Get response as text first to avoid JSON parsing errors
      const textResponse = await res.text();
      
      if (!textResponse) {
        console.warn('[AuthService] Empty response received');
        return { 
          success: false, 
          error: `Empty response received (Status: ${res.status})` 
        };
      }
      
      // Log first 100 chars of response for debugging
      console.log('[AuthService] Response text (first 100 chars):', 
        textResponse.substring(0, 100) + (textResponse.length > 100 ? '...' : ''));
      
      try {
        // Try to parse as JSON
        const data = JSON.parse(textResponse);
        
        if (!res.ok) {
          console.error('[AuthService] Nonce fetch failed:', data);
          return {
            success: false,
            error: data.message || `Failed to fetch nonce (${res.status} ${res.statusText})`,
          };
        }
        
        if (!data.nonce) {
          console.error('[AuthService] Nonce missing in response', data);
          return { success: false, error: 'Nonce not found in response' };
        }
        
        console.log('[AuthService] Nonce received successfully');
        return { success: true, nonce: data.nonce };
      } catch (parseError) {
        // Not valid JSON - check if it looks like HTML
        const isHtml = textResponse.includes('<html') || textResponse.includes('<!DOCTYPE html');
        const errorDetail = isHtml ? 'Received HTML instead of JSON' : 'Invalid JSON format';
        
        console.error(`[AuthService] ${errorDetail}. First 100 chars:`, 
          textResponse.substring(0, 100) + (textResponse.length > 100 ? '...' : ''));
        
        return { 
          success: false, 
          error: `Invalid response format: ${errorDetail}. This could indicate a configuration issue with your API URL.` 
        };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Network error while fetching nonce';
      const isTimeoutError = errorMessage.includes('timeout');
      const isCorsError = errorMessage.includes('CORS') || errorMessage.includes('cross-origin');
      
      let friendlyError = errorMessage;
      
      if (isTimeoutError) {
        friendlyError = `API request timed out. Please check your network connection and API availability.`;
      } else if (isCorsError) {
        friendlyError = `Cross-origin (CORS) error. This may indicate a configuration issue with your API.`;
      }
      
      console.error('[AuthService] Error fetching nonce:', error);
      console.error('[AuthService] API Base URL:', this.API_BASE);
      
      return {
        success: false,
        error: friendlyError,
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
      const url = this.buildUrl('/auth/verify-signature');
      console.log('[AuthService] Posting to:', url);
      
      // Enhanced fetch with timeout
      const res = await this.fetchWithTimeout(
        url, 
        {
          method: 'POST',
          headers: this.getHeaders(false),
          body: JSON.stringify({ payload, nonce }),
          mode: 'cors',
          credentials: 'same-origin',
        }
      );

      console.log('[AuthService] Response:', {
        status: res.status,
        statusText: res.statusText,
        contentType: res.headers.get('Content-Type'),
      });
      
      // Get response as text first
      const textResponse = await res.text();
      
      if (!textResponse) {
        console.warn('[AuthService] Empty response received');
        return { 
          success: false, 
          error: `Empty response received (Status: ${res.status})` 
        };
      }
      
      // Log first part of response for debugging
      console.log('[AuthService] Response text (first 100 chars):', 
        textResponse.substring(0, 100) + (textResponse.length > 100 ? '...' : ''));
      
      try {
        // Try to parse as JSON
        const data = JSON.parse(textResponse);
        
        if (!res.ok) {
          console.error('[AuthService] Signature verification failed:', data);
          return {
            success: false,
            error: data.message || `Verification failed (${res.status} ${res.statusText})`,
          };
        }

        if (!data.token || !data.walletAddress) {
          console.error('[AuthService] Missing token or walletAddress in:', data);
          return {
            success: false,
            error: 'Token or wallet address missing from response',
          };
        }

        // Persist session
        try {
          localStorage.setItem(SESSION_TOKEN_KEY, data.token);
          localStorage.setItem(WALLET_ADDRESS_KEY, data.walletAddress);
        } catch (storageError) {
          console.error('[AuthService] Error storing session data:', storageError);
          // Continue even if storage fails - might be in incognito mode
        }

        console.log('[AuthService] Signature verified successfully');
        return {
          success: true,
          token: data.token,
          walletAddress: data.walletAddress,
        };
      } catch (parseError) {
        // Not valid JSON - check if it looks like HTML
        const isHtml = textResponse.includes('<html') || textResponse.includes('<!DOCTYPE html');
        const errorDetail = isHtml ? 'Received HTML instead of JSON' : 'Invalid JSON format';
        
        console.error(`[AuthService] ${errorDetail}. First 100 chars:`, 
          textResponse.substring(0, 100) + (textResponse.length > 100 ? '...' : ''));
        
        return {
          success: false,
          error: `Invalid response format: ${errorDetail}. This could indicate a configuration issue with your API URL.`
        };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Network error during verification';
      const isTimeoutError = errorMessage.includes('timeout');
      const isCorsError = errorMessage.includes('CORS') || errorMessage.includes('cross-origin');
      
      let friendlyError = errorMessage;
      
      if (isTimeoutError) {
        friendlyError = `API request timed out. Please check your network connection and API availability.`;
      } else if (isCorsError) {
        friendlyError = `Cross-origin (CORS) error. This may indicate a configuration issue with your API.`;
      }
      
      console.error('[AuthService] Error verifying signature:', error);
      
      return {
        success: false,
        error: friendlyError,
      };
    }
  }

  /** Verifies World ID proof with the backend */
  public async verifyWorldIdProof(
    proof: IDKitSuccessResult
  ): Promise<{ success: boolean; error?: string }> {
    console.log('[AuthService] Verifying World ID proof...');
    try {
      const url = this.buildUrl('/verify-worldid');
      console.log('[AuthService] Posting to:', url);
      
      // Enhanced fetch with timeout
      const res = await this.fetchWithTimeout(
        url, 
        {
          method: 'POST',
          headers: this.getHeaders(true),
          body: JSON.stringify(proof),
          mode: 'cors',
          credentials: 'same-origin',
        }
      );

      console.log('[AuthService] Response:', {
        status: res.status,
        statusText: res.statusText,
        contentType: res.headers.get('Content-Type'),
      });
      
      // Get response as text first
      const textResponse = await res.text();
      
      // Log first part of response for debugging if not empty
      if (textResponse) {
        console.log('[AuthService] Response text (first 100 chars):', 
          textResponse.substring(0, 100) + (textResponse.length > 100 ? '...' : ''));
      } else {
        console.log('[AuthService] Response is empty (possibly a 204 No Content)');
      }
      
      // Empty response is OK for some endpoints
      if (!textResponse && res.ok) {
        console.log('[AuthService] World ID proof verified successfully (empty response)');
        return { success: true };
      }
      
      try {
        // Try to parse as JSON if there's content
        const data = textResponse ? JSON.parse(textResponse) : {};
        
        if (!res.ok) {
          console.error('[AuthService] World ID verification failed:', data);
          return {
            success: false,
            error: data.message || `Verification failed (${res.status} ${res.statusText})`,
          };
        }

        console.log('[AuthService] World ID proof verified successfully');
        return { success: true };
      } catch (parseError) {
        if (!res.ok) {
          // Not valid JSON and not a successful response
          const isHtml = textResponse.includes('<html') || textResponse.includes('<!DOCTYPE html');
          const errorDetail = isHtml ? 'Received HTML instead of JSON' : 'Invalid JSON format';
          
          console.error(`[AuthService] ${errorDetail}. First 100 chars:`, 
            textResponse.substring(0, 100) + (textResponse.length > 100 ? '...' : ''));
          
          return {
            success: false,
            error: `Invalid response format: ${errorDetail}. This could indicate a configuration issue with your API URL.`
          };
        } else {
          // Not valid JSON but successful response - this is unusual but we'll accept it
          console.warn('[AuthService] Successful response but invalid JSON format');
          return { success: true };
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Network error during verification';
      const isTimeoutError = errorMessage.includes('timeout');
      const isCorsError = errorMessage.includes('CORS') || errorMessage.includes('cross-origin');
      
      let friendlyError = errorMessage;
      
      if (isTimeoutError) {
        friendlyError = `API request timed out. Please check your network connection and API availability.`;
      } else if (isCorsError) {
        friendlyError = `Cross-origin (CORS) error. This may indicate a configuration issue with your API.`;
      }
      
      console.error('[AuthService] Error verifying World ID proof:', error);
      
      return {
        success: false,
        error: friendlyError,
      };
    }
  }

  /** Logs the user out */
  public async logout(): Promise<{ success: boolean; error?: string }> {
    console.log('[AuthService] Logging out...');
    try {
      // Clear local session
      try {
        localStorage.removeItem(SESSION_TOKEN_KEY);
        localStorage.removeItem(WALLET_ADDRESS_KEY);
      } catch (storageError) {
        console.warn('[AuthService] Error removing items from localStorage:', storageError);
        // Continue even if this fails
      }
      
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
      let token = null;
      let walletAddress = null;
      
      try {
        token = localStorage.getItem(SESSION_TOKEN_KEY);
        walletAddress = localStorage.getItem(WALLET_ADDRESS_KEY);
      } catch (storageError) {
        console.warn('[AuthService] Error accessing localStorage:', storageError);
        // Continue with null values if this fails
      }
      
      const ok = Boolean(token && walletAddress);
      console.log('[AuthService] Auth status →', ok);
      
      return {
        isAuthenticated: ok,
        token,
        walletAddress,
      };
    } catch (error: any) {
      console.error('[AuthService] Error checking auth status:', error);
      
      try {
        localStorage.removeItem(SESSION_TOKEN_KEY);
        localStorage.removeItem(WALLET_ADDRESS_KEY);
      } catch (storageError) {
        console.warn('[AuthService] Error removing items from localStorage:', storageError);
      }
      
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
      // Basic validation
      if (!token || typeof token !== 'string' || token.trim() === '') {
        return { isValid: false, error: 'No token provided' };
      }
      
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { isValid: false, error: 'Invalid token format (not a JWT)' };
      }

      const payloadPart = parts[1];
      if (!payloadPart) {
        return { isValid: false, error: 'Invalid token format (missing payload)' };
      }

      // Decode + parse
      try {
        const decoded = atob(payloadPart);
        const payload = JSON.parse(decoded);

        if (payload.exp && payload.exp * 1000 < Date.now()) {
          return { isValid: false, error: 'Token expired' };
        }
        if (!payload.walletAddress) {
          return { isValid: false, error: 'Token missing wallet address' };
        }

        return { isValid: true, walletAddress: payload.walletAddress };
      } catch (decodeError) {
        console.error('[AuthService] Error decoding token payload:', decodeError);
        return { isValid: false, error: 'Invalid token format (cannot decode payload)' };
      }
    } catch (error: any) {
      console.error('[AuthService] Error verifying token:', error);
      return { isValid: false, error: error.message || 'Error validating token' };
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
export default AuthService;