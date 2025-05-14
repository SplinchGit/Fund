// src/services/AuthService.ts

// # ############################################################################ #
// # #                      SECTION 1 - FILE HEADER COMMENT                     #
// # ############################################################################ #
// Enhanced service for handling authentication with the backend

// # ############################################################################ #
// # #                          SECTION 2 - TYPE IMPORTS                          #
// # ############################################################################ #
import type { MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';
import type { ISuccessResult as IDKitSuccessResult } from '@worldcoin/idkit';

// # ############################################################################ #
// # #                SECTION 3 - GLOBAL CONSTANTS (STORAGE KEYS)               #
// # ############################################################################ #
// Constants
const SESSION_TOKEN_KEY = 'worldfund_session_token';
const WALLET_ADDRESS_KEY = 'worldfund_wallet_address';

// # ############################################################################ #
// # #    SECTION 4 - CONFIGURATION: RETRY LOGIC (INTERFACE & DEFAULTS)     #
// # ############################################################################ #
// Configuration for retry logic and timeouts
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
}

// Default configuration values - reduce default retries
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 1, // Reduced from 3 to 1
  baseDelayMs: 300,
  maxDelayMs: 2000, // Reduced from 5000 to 2000
  timeoutMs: 15000
};

// # ############################################################################ #
// # #                    SECTION 5 - ENUMERATIONS: ERROR TYPES                   #
// # ############################################################################ #
// Error types for better error handling
enum ErrorType {
  NETWORK = 'network_error',
  TIMEOUT = 'timeout_error',
  SERVER = 'server_error',
  AUTH = 'authentication_error',
  VALIDATION = 'validation_error',
  CORS = 'cors_error',
  UNKNOWN = 'unknown_error'
}

// # ############################################################################ #
// # #                 SECTION 6 - INTERFACES: REQUEST METADATA                 #
// # ############################################################################ #
// Interface for correlation tracking
interface RequestMetadata {
  requestId: string;
  endpoint: string;
  startTime: number;
  attempts: number;
}

// # ############################################################################ #
// # #                SECTION 7 - SERVICE CLASS: CORE DEFINITION                #
// # ############################################################################ #
// Class for authentication service
class AuthService {
  private static instance: AuthService;
  private API_BASE: string;
  private API_KEY?: string;
  private activeRequests: Map<string, RequestMetadata>;
  private retryConfig: RetryConfig;

// # ############################################################################ #
// # #      SECTION 8 - SERVICE CLASS: CONSTRUCTOR (INITIALIZATION LOGIC)     #
// # ############################################################################ #
  private constructor() {
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

    // Initialize request tracking
    this.activeRequests = new Map();

    // Initialize retry configuration
    this.retryConfig = DEFAULT_RETRY_CONFIG;

    console.log('[AuthService] Initialized with API base:', this.API_BASE);
  }

// # ############################################################################ #
// # #    SECTION 9 - SERVICE CLASS: GET INSTANCE METHOD (SINGLETON ACCESSOR)   #
// # ############################################################################ #
  /** Get singleton instance */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

// # ############################################################################ #
// # #  SECTION 10 - SERVICE CLASS: CONFIGURATION METHOD (CONFIGURE RETRY)  #
// # ############################################################################ #
  /** Configure retry parameters */
  public configureRetry(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
    console.log('[AuthService] Retry configuration updated:', this.retryConfig);
  }

// # ############################################################################ #
// # #          SECTION 11 - PRIVATE HELPERS: STORAGE & REQUEST ID          #
// # ############################################################################ #
  /** Safely access localStorage with error handling */
  private safeLocalStorage = {
    getItem: (key: string): string | null => {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn(`[AuthService] Error getting ${key} from localStorage:`, error);
        return null;
      }
    },
    setItem: (key: string, value: string): boolean => {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (error) {
        console.warn(`[AuthService] Error setting ${key} in localStorage:`, error);
        return false;
      }
    },
    removeItem: (key: string): boolean => {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.warn(`[AuthService] Error removing ${key} from localStorage:`, error);
        return false;
      }
    }
  };

  /** Generate a unique request ID */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

// # ############################################################################ #
// # #           SECTION 12 - PRIVATE HELPERS: REQUEST TRACKING           #
// # ############################################################################ #
  /** Track a new request */
  private trackRequest(requestId: string, endpoint: string): void {
    this.activeRequests.set(requestId, {
      requestId,
      endpoint,
      startTime: Date.now(),
      attempts: 0
    });
  }

  /** Update tracking for a request attempt */
  private updateRequestAttempt(requestId: string): void {
    const metadata = this.activeRequests.get(requestId);
    if (metadata) {
      metadata.attempts += 1;
      this.activeRequests.set(requestId, metadata);
    }
  }

  /** Complete tracking for a request */
  private completeRequest(requestId: string, success: boolean, error?: any): void {
    const metadata = this.activeRequests.get(requestId);
    if (metadata) {
      const duration = Date.now() - metadata.startTime;
      console.log(`[AuthService] Request ${requestId} to ${metadata.endpoint} completed in ${duration}ms after ${metadata.attempts} attempt(s). Success: ${success}${error ? `. Error: ${error.message || JSON.stringify(error)}` : ''}`);
      this.activeRequests.delete(requestId);
    }
  }

// # ############################################################################ #
// # #       SECTION 13 - PRIVATE HELPERS: ERROR PARSING & RETRY LOGIC      #
// # ############################################################################ #
  /** Parse error from fetch response or exception */
  private parseErrorType(error: any, status?: number): ErrorType {
    if (!error) return ErrorType.UNKNOWN;

    const errorMsg = error.message || String(error);

    if (errorMsg.includes('timeout') || error.name === 'AbortError') {
      return ErrorType.TIMEOUT;
    }

    if (errorMsg.includes('networkerror') || errorMsg.includes('failed to fetch') || errorMsg.includes('network request failed')) {
      return ErrorType.NETWORK;
    }

    if (errorMsg.includes('cors') || errorMsg.includes('cross-origin')) {
      return ErrorType.CORS;
    }

    if (status) {
      if (status >= 400 && status < 500) {
        return ErrorType.VALIDATION;
      }
      if (status >= 500) {
        return ErrorType.SERVER;
      }
      if (status === 401 || status === 403) {
        return ErrorType.AUTH;
      }
    }

    return ErrorType.UNKNOWN;
  }

  /** Calculate backoff delay with jitter */
  private calculateBackoff(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      this.retryConfig.maxDelayMs,
      this.retryConfig.baseDelayMs * Math.pow(2, attempt)
    );

    // Add jitter (0-20% randomness)
    const jitter = exponentialDelay * 0.2 * Math.random();
    return exponentialDelay + jitter;
  }

  /** Determine if an error is retryable */
  private isRetryableError(errorType: ErrorType, status?: number): boolean {
    // Network errors are generally retryable
    if (errorType === ErrorType.NETWORK) return true;

    // Timeouts are retryable
    if (errorType === ErrorType.TIMEOUT) return true;

    // Server errors (5xx) are retryable
    if (errorType === ErrorType.SERVER) return true;

    // Some specific status codes might be retryable
    if (status === 429 || status === 503) return true;

    // All other errors are not retryable by default
    return false;
  }

// # ############################################################################ #
// # #        SECTION 14 - PRIVATE HELPERS: URL & HEADER CONSTRUCTION         #
// # ############################################################################ #
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
      // Add correlation ID header for tracing
      'X-Request-ID': this.generateRequestId()
    };

    if (this.API_KEY) {
      headers['x-api-key'] = this.API_KEY;
    }

    if (includeAuth) {
      const token = this.safeLocalStorage.getItem(SESSION_TOKEN_KEY);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

// # ############################################################################ #
// # #          SECTION 15 - CORE PRIVATE METHOD: FETCH WITH RETRY          #
// # ############################################################################ #
  /** Enhanced fetch with retries, timeouts, and detailed logging */
  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    requestId: string,
    endpoint: string
  ): Promise<T> {
    this.trackRequest(requestId, endpoint);

    let attempt = 0;
    let lastError: any;
    let lastStatus: number | undefined;

    // Keep trying until we hit max retries
    while (attempt <= this.retryConfig.maxRetries) {
      this.updateRequestAttempt(requestId);

      // Define timeoutId at the loop level so it's accessible in both try and catch blocks
      let timeoutId: number | undefined = undefined;

      try {
        console.log(`[AuthService] ${requestId} - Attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1} for ${endpoint}`);

        // Create abort controller for this attempt
        const controller = new AbortController();

        // Set timeout to abort request after specified time
        timeoutId = window.setTimeout(() => {
          controller.abort();
          console.warn(`[AuthService] ${requestId} - Request timeout after ${this.retryConfig.timeoutMs}ms`);
        }, this.retryConfig.timeoutMs);

        // Prepare fetch options
        const fetchOptions = {
          ...options,
          signal: controller.signal,
          headers: {
            ...options.headers,
            'X-Attempt-Number': String(attempt + 1)
          }
        };

        // If mode is not specified, set it to cors
        if (!fetchOptions.mode) {
          fetchOptions.mode = 'cors';
        }

        // Log the request details
        console.log(`[AuthService] ${requestId} - Request to ${endpoint}:`, {
          method: fetchOptions.method,
          hasBody: !!fetchOptions.body
        });

        // Attempt the fetch
        const startTime = Date.now();
        const response = await fetch(url, fetchOptions);

        // Clear the timeout since we got a response
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
          timeoutId = undefined; // Set to undefined to indicate it's been cleared
        }

        const duration = Date.now() - startTime;
        console.log(`[AuthService] ${requestId} - Response received in ${duration}ms with status ${response.status}`);

        // Check for error status
        if (!response.ok) {
          lastStatus = response.status;
          const errorBody = await response.text().catch(() => '');
          let errorMessage: string;

          try {
            const errorJson = JSON.parse(errorBody);
            errorMessage = errorJson.message || errorJson.error || `HTTP error ${response.status}`;
          } catch (e) {
            errorMessage = errorBody || `HTTP error ${response.status}`;
          }

          const error = new Error(errorMessage);
          lastError = error;

          // Check if this error is retryable
          const errorType = this.parseErrorType(error, response.status);
          if (!this.isRetryableError(errorType, response.status) || attempt >= this.retryConfig.maxRetries) {
            console.error(`[AuthService] ${requestId} - Non-retryable error (${errorType}) or max retries reached:`, errorMessage);
            this.completeRequest(requestId, false, error);
            throw error;
          }

          // Log and retry after backoff
          const backoffMs = this.calculateBackoff(attempt);
          console.warn(`[AuthService] ${requestId} - Retryable error (${errorType}), retrying in ${backoffMs}ms:`, errorMessage);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          attempt++;
          continue;
        }

        // Handle successful response
        let data: T;

        // Check for empty response (e.g., 204 No Content)
        const contentType = response.headers.get('content-type');
        if (response.status === 204 || !contentType) {
          data = {} as T;
        } else if (contentType && contentType.includes('application/json')) {
          try {
            data = await response.json() as T;
          } catch (jsonError) {
            console.error(`[AuthService] ${requestId} - Failed to parse JSON response:`, jsonError);
            const text = await response.text().catch(() => '');
            throw new Error(`Invalid JSON response: ${(jsonError as Error)?.message || 'Parse error'}`);
          }
        } else {
          // Other response types (text, etc.)
          const text = await response.text();
          try {
            data = JSON.parse(text) as T;
          } catch (e) {
            data = text as unknown as T;
          }
        }

        this.completeRequest(requestId, true);
        return data;
      } catch (error: any) {
        // Clear any pending timeout if it exists
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
          timeoutId = undefined; // Set to undefined to indicate it's been cleared
        }

        // Ensure error has message property
        lastError = error || new Error('Unknown error');
        if (!lastError.message) {
          lastError.message = 'Unknown error';
        }

        // Handle abort/timeout errors specially
        if (error && error.name === 'AbortError') {
          console.error(`[AuthService] ${requestId} - Request aborted (timeout)`);
          lastError = new Error(`Request timeout after ${this.retryConfig.timeoutMs}ms`);
        }

        // Determine error type and if we should retry
        const errorType = this.parseErrorType(lastError);
        if (!this.isRetryableError(errorType) || attempt >= this.retryConfig.maxRetries) {
          console.error(`[AuthService] ${requestId} - Non-retryable error (${errorType}) or max retries reached:`, lastError.message);
          this.completeRequest(requestId, false, lastError);
          throw lastError;
        }

        // Log and retry after backoff
        const backoffMs = this.calculateBackoff(attempt);
        console.warn(`[AuthService] ${requestId} - Retryable error (${errorType}), retrying in ${backoffMs}ms:`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        attempt++;
      }
    }

    // If we get here, we've exceeded retries
    console.error(`[AuthService] ${requestId} - Max retries exceeded`);
    this.completeRequest(requestId, false, lastError);

    if (lastError) {
      throw lastError;
    } else {
      throw new Error(`Failed after ${this.retryConfig.maxRetries} retries`);
    }
  }

// # ############################################################################ #
// # #  SECTION 16 - PRIVATE HELPER: PAYLOAD VALIDATION (VALIDATEWALLETPAYLOAD) #
// # ############################################################################ #
  /** Validate wallet authentication payload */
  private validateWalletPayload(payload: MiniAppWalletAuthSuccessPayload, nonce: string): boolean {
    // Check required fields
    if (!payload) {
      console.error('[AuthService] validateWalletPayload: Payload is null or undefined');
      return false;
    }

    if (payload.status !== 'success') {
      console.error('[AuthService] validateWalletPayload: Payload status is not success:', payload.status);
      return false;
    }

    if (!payload.message) {
      console.error('[AuthService] validateWalletPayload: Payload message is missing');
      return false;
    }

    if (!payload.signature) {
      console.error('[AuthService] validateWalletPayload: Payload signature is missing');
      return false;
    }

    return true;
  }

// # ############################################################################ #
// # #                  SECTION 17 - PUBLIC METHOD: GET NONCE                   #
// # ############################################################################ #
  /** Fetches a unique nonce from the backend. */
  public async getNonce(): Promise<{ success: boolean; nonce?: string; error?: string }> {
    console.log('[AuthService] Fetching nonce...');
    const requestId = this.generateRequestId();
    const endpoint = '/auth/nonce';

    try {
      // Build URL
      const url = this.buildUrl(endpoint);
      console.log(`[AuthService] ${requestId} - Fetching from: ${url}`);

      // Execute fetch with retry logic
      const data = await this.fetchWithRetry<any>(
        url,
        {
          method: 'GET',
          headers: {
            ...this.getHeaders(false),
            'X-Request-ID': requestId
          },
          mode: 'cors',
          credentials: 'same-origin',
          cache: 'no-store' // Prevent caching of nonce
        },
        requestId,
        endpoint
      );

      if (!data || !data.nonce) {
        console.error(`[AuthService] ${requestId} - Nonce missing in response`, data);
        return { success: false, error: 'Nonce not found in response' };
      }

      console.log(`[AuthService] ${requestId} - Nonce received successfully: ${data.nonce}`);
      return { success: true, nonce: data.nonce };
    } catch (error: any) {
      const errorMessage = error.message || 'Network error while fetching nonce';
      const errorType = this.parseErrorType(error);

      let friendlyError = errorMessage;

      if (errorType === ErrorType.TIMEOUT) {
        friendlyError = `API request timed out. Please check your network connection and API availability.`;
      } else if (errorType === ErrorType.CORS) {
        friendlyError = `Cross-origin (CORS) error. This may indicate a configuration issue with your API.`;
      } else if (errorType === ErrorType.NETWORK) {
        friendlyError = `Network error. Please check your internet connection.`;
      } else if (errorType === ErrorType.SERVER) {
        friendlyError = `Server error. The authentication service is currently experiencing issues.`;
      }

      console.error(`[AuthService] ${requestId} - Error fetching nonce:`, error);
      console.error(`[AuthService] ${requestId} - API Base URL:`, this.API_BASE);

      return {
        success: false,
        error: friendlyError,
      };
    }
  }

// # ############################################################################ #
// # #        SECTION 18 - PUBLIC METHOD: VERIFY WALLET SIGNATURE         #
// # ############################################################################ #
  /** Verifies a wallet signature with the backend */
  public async verifyWalletSignature(
    payload: MiniAppWalletAuthSuccessPayload,
    nonce: string
  ): Promise<{ success: boolean; token?: string; walletAddress?: string; error?: string }> {
    console.log('[AuthService] Verifying wallet signature...');

    // Validate payload
    if (!this.validateWalletPayload(payload, nonce)) {
      return {
        success: false,
        error: 'Invalid wallet authentication payload'
      };
    }

    const requestId = this.generateRequestId();
    const endpoint = '/auth/verify-signature';

    try {
      // Build properly formatted request body
      const requestBody = {
        payload,
        nonce
      };

      const url = this.buildUrl(endpoint);
      console.log(`[AuthService] ${requestId} - Posting to: ${url}`);

      // Execute fetch with retry logic
      const data = await this.fetchWithRetry<any>(
        url,
        {
          method: 'POST',
          headers: {
            ...this.getHeaders(false),
            'X-Request-ID': requestId
          },
          body: JSON.stringify(requestBody),
          mode: 'cors',
          credentials: 'same-origin',
        },
        requestId,
        endpoint
      );

      if (!data || !data.token || !data.walletAddress) {
        console.error(`[AuthService] ${requestId} - Missing token or walletAddress in:`, data);
        return {
          success: false,
          error: 'Token or wallet address missing from response'
        };
      }

      // Persist session
      this.safeLocalStorage.setItem(SESSION_TOKEN_KEY, data.token);
      this.safeLocalStorage.setItem(WALLET_ADDRESS_KEY, data.walletAddress);

      console.log(`[AuthService] ${requestId} - Signature verified successfully`);
      return {
        success: true,
        token: data.token,
        walletAddress: data.walletAddress,
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Network error during verification';
      const errorType = this.parseErrorType(error);

      let friendlyError = errorMessage;

      if (errorType === ErrorType.TIMEOUT) {
        friendlyError = `API request timed out. Please check your network connection and try again.`;
      } else if (errorType === ErrorType.CORS) {
        friendlyError = `Cross-origin (CORS) error. This may indicate a configuration issue with your API.`;
      } else if (errorType === ErrorType.NETWORK) {
        friendlyError = `Network error. Please check your internet connection.`;
      } else if (errorType === ErrorType.SERVER) {
        friendlyError = `Server error. The authentication service is currently experiencing issues.`;
      } else if (errorType === ErrorType.VALIDATION) {
        friendlyError = `Validation error: ${errorMessage}`;
      }

      console.error(`[AuthService] ${requestId} - Error verifying signature:`, error);

      return {
        success: false,
        error: friendlyError,
      };
    }
  }

// # ############################################################################ #
// # #         SECTION 19 - PUBLIC METHOD: VERIFY WORLD ID PROOF          #
// # ############################################################################ #
  /** Verifies World ID proof with the backend */
  public async verifyWorldIdProof(
    proof: IDKitSuccessResult
  ): Promise<{ success: boolean; error?: string }> {
    console.log('[AuthService] Verifying World ID proof...');

    // Validate proof
    if (!proof || !proof.merkle_root || !proof.nullifier_hash || !proof.proof) {
      console.error('[AuthService] verifyWorldIdProof: Invalid or incomplete proof:', proof);
      return {
        success: false,
        error: 'Invalid or incomplete World ID proof'
      };
    }

    const requestId = this.generateRequestId();
    const endpoint = '/verify-worldid';

    try {
      const url = this.buildUrl(endpoint);
      console.log(`[AuthService] ${requestId} - Posting to: ${url}`);

      // Execute fetch with retry logic
      await this.fetchWithRetry<any>(
        url,
        {
          method: 'POST',
          headers: {
            ...this.getHeaders(true),
            'X-Request-ID': requestId
          },
          body: JSON.stringify(proof),
          mode: 'cors',
          credentials: 'same-origin',
        },
        requestId,
        endpoint
      );

      console.log(`[AuthService] ${requestId} - World ID proof verified successfully`);
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Network error during verification';
      const errorType = this.parseErrorType(error);

      let friendlyError = errorMessage;

      if (errorType === ErrorType.TIMEOUT) {
        friendlyError = `API request timed out. Please check your network connection and try again.`;
      } else if (errorType === ErrorType.CORS) {
        friendlyError = `Cross-origin (CORS) error. This may indicate a configuration issue with your API.`;
      } else if (errorType === ErrorType.NETWORK) {
        friendlyError = `Network error. Please check your internet connection.`;
      } else if (errorType === ErrorType.SERVER) {
        friendlyError = `Server error. The verification service is currently experiencing issues.`;
      } else if (errorType === ErrorType.AUTH) {
        friendlyError = `Authentication error: ${errorMessage}`;
      }

      console.error(`[AuthService] ${requestId} - Error verifying World ID proof:`, error);

      return {
        success: false,
        error: friendlyError,
      };
    }
  }

// # ############################################################################ #
// # #                    SECTION 20 - PUBLIC METHOD: LOGOUT                    #
// # ############################################################################ #
  /** Logs the user out */
  public async logout(): Promise<{ success: boolean; error?: string }> {
    console.log('[AuthService] Logging out...');

    try {
      // Clear local session
      this.safeLocalStorage.removeItem(SESSION_TOKEN_KEY);
      this.safeLocalStorage.removeItem(WALLET_ADDRESS_KEY);

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

// # ############################################################################ #
// # #              SECTION 21 - PUBLIC METHOD: CHECK AUTH STATUS               #
// # ############################################################################ #
  /** Checks if the user is authenticated */
  public async checkAuthStatus(): Promise<{
    isAuthenticated: boolean;
    token: string | null;
    walletAddress: string | null;
  }> {
    console.log('[AuthService] Checking auth status...');

    const token = this.safeLocalStorage.getItem(SESSION_TOKEN_KEY);
    const walletAddress = this.safeLocalStorage.getItem(WALLET_ADDRESS_KEY);

    const isAuthenticated = Boolean(token && walletAddress);
    console.log(`[AuthService] Auth status → ${isAuthenticated ? 'Authenticated' : 'Not authenticated'}`);

    return {
      isAuthenticated,
      token,
      walletAddress
    };
  }

// # ############################################################################ #
// # #        SECTION 22 - PUBLIC METHOD: VERIFY TOKEN (CLIENT-SIDE)        #
// # ############################################################################ #
  /** Verifies that a token is valid */
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

// # ############################################################################ #
// # #                       SECTION 23 - SINGLETON EXPORT                      #
// # ############################################################################ #
// Export singleton instance
export const authService = AuthService.getInstance();
export default AuthService;