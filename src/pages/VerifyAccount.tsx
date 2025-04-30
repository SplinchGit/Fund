// src/services/AuthService.ts

// --- IMPORTANT NOTE ---
// This AuthService handles communication with the backend for MiniKit 
// Wallet Authentication and optional World ID proof verification.
// It manages frontend session token storage using localStorage.
// --- END NOTE ---

import type { MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';
// Import the type for the proof result from IDKit (adjust if using MiniKit verify payload)
import type { ISuccessResult as IDKitSuccessResult } from '@worldcoin/idkit'; 

/// -----------------------------------------------------------------------------
/// ENV VARS REQUIRED AT BUILD-TIME (e.g., Amplify Hosting → Environment variables):
///    VITE_APP_BACKEND_API_URL  ← Your backend API base URL (e.g. https://xyz.execute-api.region.amazonaws.com/dev)
///    VITE_APP_BACKEND_API_KEY  ← Your backend API key (if required)
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
// Structure expected back from the backend after verifying an IDKit proof.
export interface IVerifiedWorldIdResult {
  success: boolean;
  // Add any other relevant details returned by your backend /verify-worldid endpoint
  // e.g., message?: string; verificationLevel?: string; 
}
// --- End Type ---


// --- Service Class ---
class AuthService {
  private static instance: AuthService;
  private API_BASE = import.meta.env.VITE_APP_BACKEND_API_URL!; 
  private API_KEY = import.meta.env.VITE_APP_BACKEND_API_KEY;

  private constructor() {
    if (!this.API_BASE) console.error('Missing VITE_APP_BACKEND_API_URL');
    if (!this.API_KEY) console.warn('Missing VITE_APP_BACKEND_API_KEY (if required)');
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
    const headers: Record<string, string> = {};
    if (this.API_KEY) headers['x-api-key'] = this.API_KEY;

    const res = await fetch(`${this.API_BASE}/auth/nonce`, { // Example endpoint
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error('[AuthService] Failed to fetch nonce:', body);
      throw new Error(body.message || 'Failed to fetch nonce');
    }

    const { nonce } = await res.json();
    if (!nonce) {
       console.error('[AuthService] Nonce not found in backend response');
       throw new Error('Nonce not found in backend response');
    }
    console.log('[AuthService] Nonce received.');
    return nonce;
  }

  /** Sends the signed SIWE message payload to the backend for verification. */
  public async verifyWalletSignature(
    payload: MiniAppWalletAuthSuccessPayload, 
    nonce: string 
  ): Promise<{ success: boolean; error?: string; token?: string; walletAddress?: string }> {
    console.log('[AuthService] Verifying wallet signature...');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.API_KEY) headers['x-api-key'] = this.API_KEY;

    try {
      const res = await fetch(`${this.API_BASE}/auth/verify-signature`, { // Example endpoint
        method: 'POST',
        headers,
        body: JSON.stringify({ payload, nonce }), 
      });

      const body = await res.json(); 

      if (!res.ok) {
        console.error('[AuthService] Wallet signature verification failed:', body);
        throw new Error(body.message || 'Wallet signature verification failed');
      }
      
      if (body.token && body.walletAddress) {
        storeSessionToken(body.token); 
        console.log('[AuthService] Signature verified, session token stored.');
        return { success: true, token: body.token, walletAddress: body.walletAddress }; 
      } else {
         console.error('[AuthService] Session token or wallet address missing in backend response:', body);
         throw new Error('Session token or wallet address not found in backend response');
      }

    } catch (error: any) {
      console.error('[AuthService] Error during wallet signature verification:', error);
      return { success: false, error: error.message || 'An unknown error occurred' };
    }
  }

  /** * Sends World ID proof details (e.g., from IDKit) to the backend 
   * for server-side verification *after* the user is already logged in.
   */
  public async verifyWorldIdProof(details: IDKitSuccessResult): Promise<IVerifiedWorldIdResult> {
    console.log('[AuthService] Verifying World ID proof...');
    const token = getStoredSessionToken(); // Get the application session token
    if (!token) {
      console.error('[AuthService] Cannot verify World ID proof: User not authenticated.');
      // Return a structured error compatible with IVerifiedWorldIdResult
      // Or throw, depending on how VerifyAccount handles it
      return { success: false /*, message: 'User not authenticated' */ }; 
      // throw new Error('User not authenticated. Cannot verify World ID.'); 
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`, // Use the application session token
    };
    if (this.API_KEY) headers['x-api-key'] = this.API_KEY;

    try {
        const res = await fetch(`${this.API_BASE}/verify-worldid`, { // Example endpoint name
        method: 'POST',
        headers,
        body: JSON.stringify(details), // Send the IDKit proof details
        });

        const body = await res.json(); // Read body regardless of status

        if (!res.ok) {
        console.error('[AuthService] Backend World ID verification failed:', body);
        throw new Error(body.message || 'Backend World ID verification failed');
        }
        
        console.log('[AuthService] Backend World ID verification successful:', body);
        // Assuming backend returns { success: true/false, ... }
        return body as IVerifiedWorldIdResult; 

    } catch (error: any) {
        console.error('[AuthService] Error sending World ID proof for verification:', error);
        // Return a structured error
        return { success: false /*, message: error.message || 'Verification request failed' */ };
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
