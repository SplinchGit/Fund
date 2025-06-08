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
  WORLD_APP = 'world_app_error',
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
  private isWorldApp: boolean;

// # ############################################################################ #
// # #      SECTION 8 - SERVICE CLASS: CONSTRUCTOR (INITIALIZATION LOGIC)     #
// # ############################################################################ #
  private constructor() {
    // Detect if running in World App webview
    this.isWorldApp = this.detectWorldApp();

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

    // Initialize retry configuration - Enhanced for World App
    this.retryConfig = this.isWorldApp ? 
      { ...DEFAULT_RETRY_CONFIG, maxRetries: 3, timeoutMs: 25000 } : 
      DEFAULT_RETRY_CONFIG;

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
  /** Detect if running in World App webview */
  private detectWorldApp(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check for MiniKit
    if (typeof (window as any).MiniKit !== 'undefined') {
      try {
        const MiniKit = (window as any).MiniKit;
        if (MiniKit && typeof MiniKit.isInstalled === 'function') {
          return MiniKit.isInstalled();
        }
      } catch (e) {
        console.warn('[AuthService] Error checking MiniKit:', e);
      }
    }
    
    // Check user agent patterns for World App
    const userAgent = navigator.userAgent || '';
    const isWorldAppUA = userAgent.includes('WorldApp') || 
                        userAgent.includes('Worldcoin') ||
                        userAgent.includes('MiniKit');
    
    // Check for webview indicators
    const isWebView = userAgent.includes('wv') || 
                     userAgent.includes('WebView') ||
                     window.location.protocol === 'worldapp:';
    
    console.log('[AuthService] World App detection:', {
      userAgent: userAgent.substring(0, 100),
      isWorldAppUA,
      isWebView,
      hasMiniKit: typeof (window as any).MiniKit !== 'undefined'
    });
    
    return isWorldAppUA || isWebView;
  }

  /** Safely access localStorage and sessionStorage with improved error handling */
  private safeLocalStorage = {
    // Get item with session storage priority
    getItem: (key: string): string | null => {
      try {
        // First try from sessionStorage (more secure for auth tokens)
        let value = sessionStorage.getItem(key);
        if (value) {
          console.log(`[AuthService] Retrieved ${key} from sessionStorage`);
          return value;
        }
        
        // Fall back to localStorage if not in sessionStorage
        value = localStorage.getItem(key);
        if (value) {
          console.log(`[AuthService] Retrieved ${key} from localStorage`);
          
          // If this is a token, migrate it to sessionStorage
          if (key === SESSION_TOKEN_KEY) {
            try {
              sessionStorage.setItem(key, value);
              localStorage.removeItem(key);
              console.log(`[AuthService] Migrated ${key} from localStorage to sessionStorage`);
            } catch (migrationError) {
              console.warn(`[AuthService] Failed to migrate ${key} to sessionStorage:`, migrationError);
            }
          }
          
          return value;
        }
        
        console.log(`[AuthService] ${key} not found in storage`);
        return null;
      } catch (error) {
        console.warn(`[AuthService] Error accessing ${key} from storage:`, error);
        return null;
      }
    },
    
    // Set item in appropriate storage based on key
    setItem: (key: string, value: string): boolean => {
      try {
        // Store tokens in sessionStorage (more secure but cleared on tab close)
        if (key === SESSION_TOKEN_KEY) {
          sessionStorage.setItem(key, value);
          console.log(`[AuthService] Stored ${key} in sessionStorage`);
        } else {
          // Store other data in localStorage
          localStorage.setItem(key, value);
          console.log(`[AuthService] Stored ${key} in localStorage`);
        }
        return true;
      } catch (error) {
        console.warn(`[AuthService] Error setting ${key} in storage:`, error);
        return false;
      }
    },
    
    // Remove item from both storage types
    removeItem: (key: string): boolean => {
      try {
        // Remove from both storage types to ensure it's fully cleared
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
        console.log(`[AuthService] Removed ${key} from storage`);
        return true;
      } catch (error) {
        console.warn(`[AuthService] Error removing ${key} from storage:`, error);
        return false;
      }
    },
    
    // Check if an item exists in either storage
    hasItem: (key: string): boolean => {
      try {
        return sessionStorage.getItem(key) !== null || localStorage.getItem(key) !== null;
      } catch (error) {
        console.warn(`[AuthService] Error checking ${key} in storage:`, error);
        return false;
      }
    }
  };

  /** Generate a unique request ID with additional entropy */
  private generateRequestId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    
// Add safety checks for the crypto API to generate a part of the request ID
    let entropyStr = '';
    try {
      // Check if running in a browser environment and the crypto API is available and functional.
      // The non-null assertion operator (!) is used on window.crypto below
      // because TypeScript might not fully infer its guaranteed availability within this
      // block despite the preceding checks. This assertion confirms our understanding
      // that if these conditions pass, window.crypto is indeed defined.
      if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
        // Use crypto API for stronger entropy if available
        const crypto = window.crypto;
        if (crypto) {
          const entropyArray = new Uint32Array(1);
          crypto.getRandomValues(entropyArray); // Applied non-null assertion to window.crypto
          entropyStr = entropyArray[0]!.toString(36);
        }
      } else {
        // Fallback if crypto API is not available (e.g., older browser, non-browser environment like Node.js during SSR)
        // console.log('[AuthService] crypto.getRandomValues not available, using Math.random() fallback for entropy.'); // Optional: for more detailed logging
        entropyStr = Date.now().toString(36) + Math.random().toString(36).substr(2);
      }
    } catch (error) {
      // Fallback if crypto.getRandomValues is available but throws an unexpected error during its execution
      entropyStr = Math.floor(Math.random() * 1000000).toString(36);
      console.warn('[AuthService] Error using crypto.getRandomValues, resorting to Math.random() fallback:', error);
    }
    
    // The 'timestamp' and 'random' variables are assumed to be defined 
    // earlier in this function's scope.
    return `req_${timestamp}_${random}_${entropyStr}`;
  }
  
  /** Get current auth token with logging */
  private getAuthToken(): string | null {
    const token = this.safeLocalStorage.getItem(SESSION_TOKEN_KEY);
    if (!token) {
      console.warn('[AuthService] No authentication token found in storage');
    } else {
      console.log('[AuthService] Authentication token retrieved from storage');
    }
    return token;
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

    // World App specific errors
    if (this.isWorldApp && errorMsg.includes('ERR_NAME_NOT_RESOLVED')) {
      return ErrorType.WORLD_APP;
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

    // World App specific errors may be retryable
    if (errorType === ErrorType.WORLD_APP) return true;

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

    // Add World App indicator
    if (this.isWorldApp) {
      headers['X-World-App'] = 'true';
      headers['Cache-Control'] = 'no-cache';
      headers['Pragma'] = 'no-cache';
    }

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

        // Enhanced timeout for World App
        const timeoutMs = this.isWorldApp ? this.retryConfig.timeoutMs * 1.5 : this.retryConfig.timeoutMs;

        // Set timeout to abort request after specified time
        timeoutId = window.setTimeout(() => {
          controller.abort();
          console.warn(`[AuthService] ${requestId} - Request timeout after ${timeoutMs}ms`);
        }, timeoutMs);

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

        // World App specific configurations
        if (this.isWorldApp) {
          fetchOptions.credentials = 'omit'; // Don't send credentials for World App
          fetchOptions.cache = 'no-store'; // Prevent caching issues in webview
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

        // Handle World App specific network errors
        if (this.isWorldApp && error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
          console.error('[AuthService] DNS resolution failed in World App - check domain whitelist');
          lastError = new Error('Network error: Please check your internet connection or domain configuration');
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
      } else if (errorType === ErrorType.WORLD_APP) {
        friendlyError = `World App connection issue. Please check your internet connection and try again.`;
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
      } else if (errorType === ErrorType.WORLD_APP) {
        friendlyError = `World App connection issue. Please try again.`;
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
      } else if (errorType === ErrorType.WORLD_APP) {
        friendlyError = `World App connection issue. Please try again.`;
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
  /** 
   * Checks if the user is authenticated with improved token validation
   * This method is critical for determining authentication state throughout the app
   */
  public async checkAuthStatus(): Promise<{
    isAuthenticated: boolean;
    token: string | null;
    walletAddress: string | null;
  }> {
    console.log('[AuthService] Checking auth status...');

    try {
      // Use the existing safeLocalStorage
      const token = this.safeLocalStorage.getItem(SESSION_TOKEN_KEY);
      const walletAddress = this.safeLocalStorage.getItem(WALLET_ADDRESS_KEY);
      
      // Log what we found without exposing the actual token
      console.log(`[AuthService] Token found: ${Boolean(token)}, Wallet address found: ${Boolean(walletAddress)}`);

      // Basic JWT validation (token should be in format: header.payload.signature)
      let hasValidFormat = false;
      if (token) {
        const parts = token.split('.');
        hasValidFormat = parts.length === 3;
        
        if (!hasValidFormat) {
          console.warn('[AuthService] Retrieved token has invalid format, not a proper JWT');
        } else {
          try {
            // Only proceed if we have at least 3 parts and the payload part exists
            if (parts.length >= 3 && parts[1]) {
              // Try to decode the middle (payload) part to check expiration
              const payloadBase64 = parts[1];
              
              // Fix base64 padding if needed - with additional safety checks
              let payloadJson = '';
              try {
                // Handle base64 correctly
                const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
                const paddingLength = (4 - (base64.length % 4)) % 4;
                const paddedBase64 = base64 + '='.repeat(paddingLength);
                
                // Decode safely
                payloadJson = atob(paddedBase64);
              } catch (base64Error) {
                console.error('[AuthService] Error decoding base64 payload:', base64Error);
                hasValidFormat = false;
                throw new Error('Invalid token format: could not decode payload');
              }
              
              // Parse JSON safely
              if (payloadJson) {
                let payload: any;
                try {
                  payload = JSON.parse(payloadJson);
                } catch (jsonError) {
                  console.error('[AuthService] Error parsing token JSON payload:', jsonError);
                  hasValidFormat = false;
                  throw new Error('Invalid token format: could not parse payload JSON');
                }
                
                // Check expiration if present
                if (payload && payload.exp) {
                  const expTime = payload.exp * 1000; // Convert to milliseconds
                  const now = Date.now();
                  
                  if (expTime < now) {
                    console.warn(`[AuthService] Token expired at ${new Date(expTime).toISOString()}`);
                    return {
                      isAuthenticated: false,
                      token: null,
                      walletAddress: null
                    };
                  }
                }
                
                // Log successful validation without revealing sensitive info
                console.log('[AuthService] Token passed basic JWT validation');
              } else {
                console.warn('[AuthService] Empty payload after decoding');
                hasValidFormat = false;
              }
            } else {
              console.warn('[AuthService] Invalid token structure - missing payload part');
              hasValidFormat = false;
            }
          } catch (parseError) {
            console.error('[AuthService] Error validating token:', parseError);
            hasValidFormat = false;
          }
        }
      }

      // Determine authentication state based on token validity and wallet address
      const isAuthenticated = Boolean(token && hasValidFormat && walletAddress);
      
      console.log(`[AuthService] Auth status → ${isAuthenticated ? 'Authenticated' : 'Not authenticated'}`);
      
      if (!isAuthenticated && (token || walletAddress)) {
        console.warn('[AuthService] Not authenticated because: ' + 
          (!token ? 'Token missing' : 
            !hasValidFormat ? 'Token has invalid format' : 
              !walletAddress ? 'Wallet address missing' : 'Unknown reason'));
      }

      return {
        isAuthenticated,
        // Only return the token if it's valid, otherwise return null
        token: (token && hasValidFormat) ? token : null,
        walletAddress
      };
    } catch (error) {
      console.error('[AuthService] Error checking auth status:', error);
      return {
        isAuthenticated: false,
        token: null,
        walletAddress: null
      };
    }
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