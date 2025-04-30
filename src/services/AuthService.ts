// src/services/AuthService.ts

// --- IMPORTANT NOTE ---
// Reads environment variables directly inside functions where needed
// to mitigate potential timing issues in certain environments.
// --- END NOTE ---

import type { MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';
import type { ISuccessResult as IDKitSuccessResult } from '@worldcoin/idkit';

/// -----------------------------------------------------------------------------
/// ENV VARS EXPECTED FROM AMPLIFY BUILD SETTINGS:
///    VITE_AMPLIFY_API       ← Your backend API base URL
///    VITE_WORLD_APP_API     ← Your backend API key (if required)
/// -----------------------------------------------------------------------------

// --- Session Token Storage (Using localStorage) ---
const SESSION_TOKEN_KEY = 'app_session_token';

const getStoredSessionToken = (): string | null => {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch (error) {
    console.error("Error getting session token from localStorage:", error);
    return null;
  }
};

const storeSessionToken = (token: string): void => {
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch (error) {
    console.error("Error storing session token in localStorage:", error);
  }
};

const clearStoredSessionToken = (): void => {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch (error) {
    console.error("Error clearing session token from localStorage:", error);
  }
};
// --- End Session Token Storage ---

// --- Type for Backend Verification Result ---
export interface IVerifiedWorldIdResult {
  success: boolean;
  // Add any other relevant details returned by your backend /verify-worldid endpoint
  // e.g., message?: string; verificationLevel?: string;
}
// --- End Type ---


// --- Service Class ---
class AuthService {
  private static instance: AuthService;
  // Removed class properties for env vars - will read directly in methods
  // private API_BASE = import.meta.env.VITE_AMPLIFY_API!; 
  // private API_KEY = import.meta.env.VITE_WORLD_APP_API; 

  private constructor() {
    // Log env vars during construction just for initial check
    console.log('[AuthService Constructor] VITE_AMPLIFY_API Check:', import.meta.env.VITE_AMPLIFY_API);
    console.log('[AuthService Constructor] VITE_WORLD_APP_API Check:', import.meta.env.VITE_WORLD_APP_API ? 'Exists' : 'MISSING/UNDEFINED');
  }

  /** Get singleton instance */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /** Fetches a unique nonce from the backend. */
  public async getNonce(): Promise<string> {
    console.log('[AuthService] Fetching nonce...');
    let responseText = '';

    try {
        // *** Read environment variables directly inside the function ***
        const apiBase = import.meta.env.VITE_AMPLIFY_API;
        const apiKey = import.meta.env.VITE_WORLD_APP_API;

        // *** Add check right after reading ***
        if (!apiBase) {
            console.error('[AuthService getNonce] VITE_AMPLIFY_API is missing or undefined!');
            throw new Error('Backend API URL is not configured.');
        }
        console.log(`[AuthService getNonce] Using API Base URL: ${apiBase}`);
        if (!apiKey) {
            console.warn('[AuthService getNonce] VITE_WORLD_APP_API key is missing.');
        }

        const headers: Record<string, string> = {};
        if (apiKey) headers['x-api-key'] = apiKey; // Use locally read variable

        const requestUrl = `${apiBase}/auth/nonce`; // Use locally read variable
        console.log(`[AuthService] Requesting nonce from URL: ${requestUrl}`);

        const res = await fetch(requestUrl, {
          method: 'GET',
          headers,
        });

        console.log(`[AuthService] Nonce response status: ${res.status}`);
        console.log(`[AuthService] Nonce response content-type: ${res.headers.get('content-type')}`);
        responseText = await res.clone().text();

        if (!res.ok) {
          console.error(`[AuthService] Failed to fetch nonce. Status: ${res.status}. Response: ${responseText}`);
          throw new Error(`Failed to fetch nonce (Status: ${res.status})`);
        }

        const body = await res.json();

        if (!body.nonce) {
           console.error('[AuthService] Nonce key not found in backend JSON response:', body);
           throw new Error('Nonce key not found in backend response');
        }
        console.log('[AuthService] Nonce received successfully.');
        return body.nonce;

    } catch (error) {
        // Keep the detailed error logging
        if (error instanceof SyntaxError) {
            console.error('[AuthService] Failed to parse nonce response as JSON. Response might not be valid JSON.');
            console.error('[AuthService] Nonce raw response text:', responseText);
            throw new Error('Failed to parse nonce response from backend.');
        } else {
            console.error(`[AuthService] Error during nonce fetch/processing (Type: ${error instanceof Error ? error.constructor.name : typeof error}):`, error);
            // Re-throw the specific error encountered (could be the new Error from missing apiBase)
            throw error; 
        }
    }
  }

  /** Sends the signed SIWE message payload to the backend for verification. */
  public async verifyWalletSignature(
    payload: MiniAppWalletAuthSuccessPayload,
    nonce: string
  ): Promise<{ success: boolean; error?: string; token?: string; walletAddress?: string }> {
    console.log('[AuthService] Verifying wallet signature...');
    let responseText = '';

    try {
        // *** Read environment variables directly inside the function ***
        const apiBase = import.meta.env.VITE_AMPLIFY_API;
        const apiKey = import.meta.env.VITE_WORLD_APP_API;

        if (!apiBase) {
            console.error('[AuthService verifyWalletSignature] VITE_AMPLIFY_API is missing or undefined!');
            throw new Error('Backend API URL is not configured.');
        }
         if (!apiKey) {
            console.warn('[AuthService verifyWalletSignature] VITE_WORLD_APP_API key is missing.');
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (apiKey) headers['x-api-key'] = apiKey; // Use locally read variable

        const requestUrl = `${apiBase}/auth/verify-signature`; // Use locally read variable
        console.log(`[AuthService] Verifying signature at URL: ${requestUrl}`);

        const res = await fetch(requestUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ payload, nonce }),
        });

        console.log(`[AuthService] Verify signature response status: ${res.status}`);
        console.log(`[AuthService] Verify signature response content-type: ${res.headers.get('content-type')}`);
        responseText = await res.clone().text();

        if (!res.ok) {
          console.error(`[AuthService] Wallet signature verification failed. Status: ${res.status}. Response: ${responseText}`);
          let errorMsg = 'Wallet signature verification failed';
          try { const errorBody = JSON.parse(responseText); errorMsg = errorBody.message || errorMsg; } catch (_) { /* Ignore */ }
          throw new Error(errorMsg);
        }

        const body = await res.json();

        if (body.token && body.walletAddress) {
          storeSessionToken(body.token);
          console.log('[AuthService] Signature verified, session token stored.');
          return { success: true, token: body.token, walletAddress: body.walletAddress };
        } else {
           console.error('[AuthService] Session token or wallet address missing in backend response:', body);
           throw new Error('Session token or wallet address not found in backend response');
        }

    } catch (error: any) {
       if (error instanceof SyntaxError) {
            console.error('[AuthService] Failed to parse verify-signature response as JSON.');
            console.error('[AuthService] Verify signature raw response text:', responseText);
            return { success: false, error: 'Failed to parse signature verification response from backend.' };
       } else {
            console.error(`[AuthService] Error during wallet signature verification (Type: ${error.constructor.name}):`, error);
            return { success: false, error: error.message || 'An unknown error occurred during signature verification' };
       }
    }
  }

  /** Sends World ID proof details (e.g., from IDKit) to the backend */
  public async verifyWorldIdProof(details: IDKitSuccessResult): Promise<IVerifiedWorldIdResult> {
    console.log('[AuthService] Verifying World ID proof...');
    const token = getStoredSessionToken();
    if (!token) {
      console.error('[AuthService] Cannot verify World ID proof: User not authenticated.');
      return { success: false };
    }

    let responseText = '';
    try {
        // *** Read environment variables directly inside the function ***
        const apiBase = import.meta.env.VITE_AMPLIFY_API;
        const apiKey = import.meta.env.VITE_WORLD_APP_API;

        if (!apiBase) {
            console.error('[AuthService verifyWorldIdProof] VITE_AMPLIFY_API is missing or undefined!');
            throw new Error('Backend API URL is not configured.');
        }
         if (!apiKey) {
            console.warn('[AuthService verifyWorldIdProof] VITE_WORLD_APP_API key is missing.');
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        };
        if (apiKey) headers['x-api-key'] = apiKey; // Use locally read variable

        const requestUrl = `${apiBase}/verify-worldid`; // Use locally read variable
        console.log(`[AuthService] Verifying World ID proof at URL: ${requestUrl}`);

        const res = await fetch(requestUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(details),
        });
        responseText = await res.clone().text();

        const body = await res.json();

        if (!res.ok) {
          console.error(`[AuthService] Backend World ID verification failed. Status: ${res.status}. Response: ${responseText}`);
          throw new Error(body.message || 'Backend World ID verification failed');
        }

        console.log('[AuthService] Backend World ID verification successful:', body);
        return body as IVerifiedWorldIdResult;

    } catch (error: any) {
        if (error instanceof SyntaxError) {
            console.error('[AuthService] Failed to parse verify-worldid response as JSON.');
            console.error('[AuthService] Verify World ID raw response text:', responseText);
            return { success: false };
        } else {
            console.error(`[AuthService] Error sending World ID proof for verification (Type: ${error.constructor.name}):`, error);
            return { success: false };
        }
    }
  }


  /** Clears the stored application session token. */
  public async logout(): Promise<{ success: boolean; error?: string }> {
    console.log('[AuthService] Logging out, clearing session token...');
    try {
      clearStoredSessionToken();
      console.log('[AuthService] Session token cleared.');
      return { success: true };
    } catch (e: any) {
      console.error('[AuthService] Logout failed:', e);
      return { success: false, error: e.message || 'Logout failed' };
    }
  }

  /** Checks if a user session token exists locally and returns it. */
  public async checkAuthStatus(): Promise<{ isAuthenticated: boolean; token: string | null }> {
    try {
      const token = getStoredSessionToken();
      if (token) {
        return { isAuthenticated: true, token: token };
      }
      return { isAuthenticated: false, token: null };
    } catch (error) {
      console.error("[AuthService] Error checking auth status:", error);
      clearStoredSessionToken();
      return { isAuthenticated: false, token: null };
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
export default AuthService;
