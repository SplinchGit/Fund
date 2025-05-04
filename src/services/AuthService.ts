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

// --- Custom Error Class ---
export class AuthServiceError extends Error {
  constructor(
    message: string,
    public code: 'NETWORK' | 'CONFIG' | 'AUTH' | 'PARSE' | 'UNKNOWN',
    public userMessage: string = message // What user should see
  ) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

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
  error?: string;
  // Add any other relevant details returned by your backend /verify-worldid endpoint
  // e.g., message?: string; verificationLevel?: string;
}
// --- End Type ---

// --- Service Class ---
class AuthService {
  private static instance: AuthService;

  private constructor() {
    this.validateConfig();
  }

  private validateConfig(): void {
    const apiBase = import.meta.env.VITE_AMPLIFY_API;
    const apiKey = import.meta.env.VITE_WORLD_APP_API;
    
    console.log('[AuthService] Configuration check:', {
      hasApiBase: !!apiBase,
      hasApiKey: !!apiKey
    });
    
    if (!apiBase) {
      console.error('[AuthService] CRITICAL: VITE_AMPLIFY_API is not configured');
    }
    
    if (!apiKey) {
      console.warn('[AuthService] Warning: VITE_WORLD_APP_API is not configured');
    }
  }

  /** Get singleton instance */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /** Fetches a unique nonce from the backend. */
  public async getNonce(): Promise<{ success: boolean; nonce?: string; error?: string }> {
    console.log('[AuthService] Fetching nonce...');
    let responseText = '';

    try {
      const apiBase = import.meta.env.VITE_AMPLIFY_API;
      const apiKey = import.meta.env.VITE_WORLD_APP_API;

      if (!apiBase) {
        throw new AuthServiceError(
          'Backend API URL is not configured',
          'CONFIG',
          'Unable to connect to server. Please check your configuration.'
        );
      }

      const headers: Record<string, string> = {};
      if (apiKey) headers['x-api-key'] = apiKey;

      const requestUrl = `${apiBase}/auth/nonce`;
      console.log(`[AuthService] Requesting nonce from URL: ${requestUrl}`);

      const res = await fetch(requestUrl, {
        method: 'GET',
        headers,
      });

      console.log(`[AuthService] Nonce response status: ${res.status}`);
      responseText = await res.clone().text();

      if (!res.ok) {
        throw new AuthServiceError(
          `Failed to fetch nonce (Status: ${res.status})`,
          'NETWORK',
          'Unable to reach authentication server. Please try again.'
        );
      }

      let body;
      try {
        body = await res.json();
      } catch (parseError) {
        throw new AuthServiceError(
          'Failed to parse nonce response as JSON',
          'PARSE',
          'Server returned invalid response format.'
        );
      }

      if (!body.nonce) {
        throw new AuthServiceError(
          'Nonce key not found in backend response',
          'AUTH',
          'Authentication initialization failed. Please try again.'
        );
      }

      console.log('[AuthService] Nonce received successfully.');
      return { success: true, nonce: body.nonce };

    } catch (error) {
      if (error instanceof AuthServiceError) {
        console.error(`[AuthService] ${error.code} error:`, error.message);
        return { success: false, error: error.userMessage };
      }
      
      console.error('[AuthService] Unexpected error during nonce fetch:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred. Please try again.' 
      };
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
      const apiBase = import.meta.env.VITE_AMPLIFY_API;
      const apiKey = import.meta.env.VITE_WORLD_APP_API;

      if (!apiBase) {
        throw new AuthServiceError(
          'Backend API URL is not configured',
          'CONFIG',
          'Unable to connect to server. Please check your configuration.'
        );
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) headers['x-api-key'] = apiKey;

      const requestUrl = `${apiBase}/auth/verify-signature`;
      console.log(`[AuthService] Verifying signature at URL: ${requestUrl}`);

      const res = await fetch(requestUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ payload, nonce }),
      });

      console.log(`[AuthService] Verify signature response status: ${res.status}`);
      responseText = await res.clone().text();

      if (!res.ok) {
        let errorMsg = 'Wallet signature verification failed';
        try { 
          const errorBody = JSON.parse(responseText); 
          errorMsg = errorBody.message || errorMsg; 
        } catch (_) { /* Ignore parse error */ }
        
        throw new AuthServiceError(
          errorMsg,
          'AUTH',
          'Unable to verify your wallet. Please try again.'
        );
      }

      let body;
      try {
        body = await res.json();
      } catch (parseError) {
        throw new AuthServiceError(
          'Failed to parse signature verification response as JSON',
          'PARSE',
          'Server returned invalid response format.'
        );
      }

      if (!body.token || !body.walletAddress) {
        throw new AuthServiceError(
          'Session token or wallet address missing in backend response',
          'AUTH',
          'Authentication incomplete. Please try again.'
        );
      }

      storeSessionToken(body.token);
      console.log('[AuthService] Signature verified, session token stored.');
      return { 
        success: true, 
        token: body.token, 
        walletAddress: body.walletAddress 
      };

    } catch (error) {
      if (error instanceof AuthServiceError) {
        console.error(`[AuthService] ${error.code} error:`, error.message);
        return { success: false, error: error.userMessage };
      }
      
      console.error('[AuthService] Unexpected error during signature verification:', error);
      return { 
        success: false, 
        error: 'Failed to verify wallet signature. Please try again.' 
      };
    }
  }

  /** Sends World ID proof details (e.g., from IDKit) to the backend */
  public async verifyWorldIdProof(details: IDKitSuccessResult): Promise<IVerifiedWorldIdResult> {
    console.log('[AuthService] Verifying World ID proof...');
    const token = getStoredSessionToken();
    
    if (!token) {
      console.error('[AuthService] Cannot verify World ID proof: User not authenticated.');
      return { 
        success: false, 
        error: 'Please sign in with your wallet first.' 
      };
    }

    let responseText = '';
    try {
      const apiBase = import.meta.env.VITE_AMPLIFY_API;
      const apiKey = import.meta.env.VITE_WORLD_APP_API;

      if (!apiBase) {
        throw new AuthServiceError(
          'Backend API URL is not configured',
          'CONFIG',
          'Unable to connect to server. Please check your configuration.'
        );
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
      if (apiKey) headers['x-api-key'] = apiKey;

      const requestUrl = `${apiBase}/verify-worldid`;
      console.log(`[AuthService] Verifying World ID proof at URL: ${requestUrl}`);

      const res = await fetch(requestUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(details),
      });
      
      responseText = await res.clone().text();

      if (!res.ok) {
        let errorMsg = 'Backend World ID verification failed';
        try {
          const errorBody = JSON.parse(responseText);
          errorMsg = errorBody.message || errorMsg;
        } catch (_) { /* Ignore parse error */ }
        
        throw new AuthServiceError(
          errorMsg,
          'AUTH',
          'World ID verification failed. Please try again.'
        );
      }

      let body;
      try {
        body = await res.json();
      } catch (parseError) {
        throw new AuthServiceError(
          'Failed to parse World ID verification response as JSON',
          'PARSE',
          'Server returned invalid response format.'
        );
      }

      console.log('[AuthService] Backend World ID verification successful:', body);
      return body as IVerifiedWorldIdResult;

    } catch (error) {
      if (error instanceof AuthServiceError) {
        console.error(`[AuthService] ${error.code} error:`, error.message);
        return { success: false, error: error.userMessage };
      }
      
      console.error('[AuthService] Unexpected error during World ID verification:', error);
      return { 
        success: false, 
        error: 'Failed to verify World ID. Please try again.' 
      };
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
      return { 
        success: false, 
        error: 'Failed to log out. Please try again.' 
      };
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