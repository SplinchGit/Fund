// src/services/AuthService.ts

// # ############################################################################ #
// # #                               SECTION 1 - FILE HEADER COMMENT                                #
// # ############################################################################ #
// Enhanced service for handling authentication with the backend

// # ############################################################################ #
// # #                                  SECTION 2 - TYPE IMPORTS                                  #
// # ############################################################################ #
import type { MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';
import type { ISuccessResult as IDKitSuccessResult } from '@worldcoin/idkit';

// # ############################################################################ #
// # #                           SECTION 3 - GLOBAL CONSTANTS (STORAGE KEYS)                          #
// # ############################################################################ #
// Constants
const SESSION_TOKEN_KEY = 'fund_session_token';
const WALLET_ADDRESS_KEY = 'fund_wallet_address';

// # ############################################################################ #
// # #                SECTION 4 - CONFIGURATION: RETRY LOGIC (INTERFACE & DEFAULTS)                   #
// # ############################################################################ #
// Configuration for retry logic and timeouts
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
}

// Default configuration values
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 1,
  baseDelayMs: 300,
  maxDelayMs: 2000,
  timeoutMs: 15000,
};

// # ############################################################################ #
// # #                             SECTION 5 - ENUMERATIONS: ERROR TYPES                              #
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
  UNKNOWN = 'unknown_error',
}

// # ############################################################################ #
// # #                            SECTION 6 - INTERFACES: REQUEST METADATA                            #
// # ############################################################################ #
// Interface for correlation tracking
interface RequestMetadata {
  requestId: string;
  endpoint: string;
  startTime: number;
  attempts: number;
}

// # ############################################################################ #
// # #                            SECTION 7 - SERVICE CLASS: CORE DEFINITION                            #
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
  // # #             SECTION 8 - SERVICE CLASS: CONSTRUCTOR (INITIALIZATION LOGIC)              #
  // # ############################################################################ #
  
  private constructor() {
    // Detect if running in World App webview
    this.isWorldApp = this.detectWorldApp();

    // Get the API base URL from environment variables
    const envUrl = import.meta.env.VITE_AMPLIFY_API;

    if (!envUrl) {
      console.error('[AuthService] CRITICAL: VITE_AMPLIFY_API environment variable not set.');
      throw new Error('VITE_AMPLIFY_API environment variable is required but not configured.');
    }

    // Validate that it's a proper URL
    try {
      const testUrl = new URL(envUrl);
      if (!testUrl.protocol.startsWith('http')) {
        throw new Error('VITE_AMPLIFY_API must use HTTP or HTTPS protocol');
      }
      // Normalize the URL - ensure it doesn't end with a slash
      this.API_BASE = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
      console.log('[AuthService] API Base URL configured:', this.API_BASE);
    } catch (error) {
      console.error('[AuthService] Invalid VITE_AMPLIFY_API URL format:', envUrl, error);
      throw new Error(`Invalid VITE_AMPLIFY_API URL format: ${envUrl}`);
    }

    // Initialize request tracking
    this.activeRequests = new Map();

    // Initialize retry configuration - Enhanced for World App
    this.retryConfig = this.isWorldApp
      ? { ...DEFAULT_RETRY_CONFIG, maxRetries: 3, timeoutMs: 25000 }
      : DEFAULT_RETRY_CONFIG;

    console.log('[AuthService] Initialized successfully for', this.isWorldApp ? 'World App' : 'web browser');
  }

  // # ############################################################################ #
  // # #         SECTION 9 - SERVICE CLASS: GET INSTANCE METHOD (SINGLETON ACCESSOR)          #
  // # ############################################################################ #
  /** Get singleton instance */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // # ############################################################################ #
  // # #           SECTION 10 - SERVICE CLASS: CONFIGURATION METHOD (CONFIGURE RETRY)           #
  // # ############################################################################ #
  /** Configure retry parameters */
  public configureRetry(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
    console.log('[AuthService] Retry configuration updated:', this.retryConfig);
  }

  // # ############################################################################ #
  // # #                 SECTION 11 - PRIVATE HELPERS: STORAGE & REQUEST ID                 #
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
    const isWorldAppUA =
      userAgent.includes('WorldApp') ||
      userAgent.includes('Worldcoin') ||
      userAgent.includes('MiniKit');

    // Check for webview indicators
    const isWebView =
      userAgent.includes('wv') ||
      userAgent.includes('WebView') ||
      window.location.protocol === 'worldapp:';

    console.log('[AuthService] World App detection:', {
      userAgent: userAgent.substring(0, 100),
      isWorldAppUA,
      isWebView,
      hasMiniKit: typeof (window as any).MiniKit !== 'undefined',
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
              console.log(
                `[AuthService] Migrated ${key} from localStorage to sessionStorage`
              );
            } catch (migrationError) {
              console.warn(
                `[AuthService] Failed to migrate ${key} to sessionStorage:`,
                migrationError
              );
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
        return (
          sessionStorage.getItem(key) !== null ||
          localStorage.getItem(key) !== null
        );
      } catch (error) {
        console.warn(`[AuthService] Error checking ${key} in storage:`, error);
        return false;
      }
    },
  };

  /** Generate a unique request ID with additional entropy */
  private generateRequestId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);

    let entropyStr = '';
    try {
      if (
        typeof window !== 'undefined' &&
        window.crypto &&
        typeof window.crypto.getRandomValues === 'function'
      ) {
        const entropyArray = new Uint32Array(1);
        window.crypto.getRandomValues(entropyArray);
        entropyStr = (entropyArray[0] ?? 0).toString(36);
      } else {
        entropyStr = Date.now().toString(36) + Math.random().toString(36).substr(2);
      }
    } catch (error) {
      entropyStr = Math.floor(Math.random() * 1000000).toString(36);
      console.warn(
        '[AuthService] Error using crypto.getRandomValues, resorting to Math.random() fallback:',
        error
      );
    }

    return `req_${timestamp}_${random}_${entropyStr}`;
  }

  /** Get current auth token with logging */
  private getAuthToken(): string | null {
    const token = this.safeLocalStorage.getItem(SESSION_TOKEN_KEY);
    if (!token) {
      console.warn('[AuthService] No authentication token found in storage');
    }
    return token;
  }

  // # ############################################################################ #
  // # #                         SECTION 12 - PRIVATE HELPERS: REQUEST TRACKING                         #
  // # ############################################################################ #
  /** Track a new request */
  private trackRequest(requestId: string, endpoint: string): void {
    this.activeRequests.set(requestId, {
      requestId,
      endpoint,
      startTime: Date.now(),
      attempts: 0,
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
  private completeRequest(
    requestId: string,
    success: boolean,
    error?: any
  ): void {
    const metadata = this.activeRequests.get(requestId);
    if (metadata) {
      const duration = Date.now() - metadata.startTime;
      console.log(
        `[AuthService] Request ${requestId} to ${
          metadata.endpoint
        } completed in ${duration}ms after ${metadata.attempts} attempt(s). Success: ${success}${
          error ? `. Error: ${error.message || JSON.stringify(error)}` : ''
        }`
      );
      this.activeRequests.delete(requestId);
    }
  }

  // # ############################################################################ #
  // # #                      SECTION 13 - PRIVATE HELPERS: ERROR PARSING & RETRY LOGIC                     #
  // # ############################################################################ #
  /** Parse error from fetch response or exception */
  private parseErrorType(error: any, status?: number): ErrorType {
    if (!error) return ErrorType.UNKNOWN;

    const errorMsg = error.message || String(error);

    if (errorMsg.includes('timeout') || error.name === 'AbortError') {
      return ErrorType.TIMEOUT;
    }

    if (
      errorMsg.includes('networkerror') ||
      errorMsg.includes('failed to fetch') ||
      errorMsg.includes('network request failed')
    ) {
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
  // # #                   SECTION 14 - PRIVATE HELPERS: URL & HEADER CONSTRUCTION                  #
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
      Accept: 'application/json, text/plain, */*',
      'X-Request-ID': this.generateRequestId(),
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
  // # #                      SECTION 15 - CORE PRIVATE METHOD: FETCH WITH RETRY                      #
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

    // Keep trying until we hit max retries
    while (attempt <= this.retryConfig.maxRetries) {
      this.updateRequestAttempt(requestId);

      let timeoutId: number | undefined = undefined;

      try {
        console.log(
          `[AuthService] ${requestId} - Attempt ${attempt + 1}/${
            this.retryConfig.maxRetries + 1
          } for ${endpoint}`
        );

        const controller = new AbortController();
        const timeoutMs = this.isWorldApp
          ? this.retryConfig.timeoutMs * 1.5
          : this.retryConfig.timeoutMs;

        timeoutId = window.setTimeout(() => {
          controller.abort();
          console.warn(
            `[AuthService] ${requestId} - Request timeout after ${timeoutMs}ms`
          );
        }, timeoutMs);

        const fetchOptions: RequestInit = {
          ...options,
          signal: controller.signal,
          headers: {
            ...options.headers,
            'X-Attempt-Number': String(attempt + 1),
          },
        };

        if (!fetchOptions.mode) {
          fetchOptions.mode = 'cors';
        }

        if (this.isWorldApp) {
          fetchOptions.credentials = 'omit';
          fetchOptions.cache = 'no-store';
        }

        console.log(`[AuthService] ${requestId} - Request to ${endpoint}:`, {
          method: fetchOptions.method,
          hasBody: !!fetchOptions.body,
        });

        const startTime = Date.now();
        const response = await fetch(url, fetchOptions);
        
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
          timeoutId = undefined;
        }

        const duration = Date.now() - startTime;
        console.log(
          `[AuthService] ${requestId} - Response received in ${duration}ms with status ${response.status}`
        );

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          let errorMessage: string;

          try {
            const errorJson = JSON.parse(errorBody);
            errorMessage =
              errorJson.message || errorJson.error || `HTTP error ${response.status}`;
          } catch (e) {
            errorMessage = errorBody || `HTTP error ${response.status}`;
          }

          const error = new Error(errorMessage);
          lastError = error;

          const errorType = this.parseErrorType(error, response.status);
          if (
            !this.isRetryableError(errorType, response.status) ||
            attempt >= this.retryConfig.maxRetries
          ) {
            console.error(
              `[AuthService] ${requestId} - Non-retryable error (${errorType}) or max retries reached:`,
              errorMessage
            );
            this.completeRequest(requestId, false, error);
            throw error;
          }

          const backoffMs = this.calculateBackoff(attempt);
          console.warn(
            `[AuthService] ${requestId} - Retryable error (${errorType}), retrying in ${backoffMs}ms:`,
            errorMessage
          );
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          attempt++;
          continue;
        }

        let data: T;
        const contentType = response.headers.get('content-type');
        if (response.status === 204 || !contentType) {
          data = {} as T;
        } else if (contentType && contentType.includes('application/json')) {
          try {
            data = (await response.json()) as T;
          } catch (jsonError) {
            console.error(
              `[AuthService] ${requestId} - Failed to parse JSON response:`,
              jsonError
            );
            throw new Error(
              `Invalid JSON response: ${(jsonError as Error)?.message || 'Parse error'}`
            );
          }
        } else {
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
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
          timeoutId = undefined;
        }

        lastError = error || new Error('Unknown error');
        if (!lastError.message) {
          lastError.message = 'Unknown error';
        }

        if (error && error.name === 'AbortError') {
          console.error(`[AuthService] ${requestId} - Request aborted (timeout)`);
          lastError = new Error(
            `Request timeout after ${this.retryConfig.timeoutMs}ms`
          );
        }

        if (
          this.isWorldApp &&
          error.message?.includes('ERR_NAME_NOT_RESOLVED')
        ) {
          console.error(
            '[AuthService] DNS resolution failed in World App - check domain whitelist'
          );
          lastError = new Error(
            'Network error: Please check your internet connection or domain configuration'
          );
        }

        const errorType = this.parseErrorType(lastError);
        if (
          !this.isRetryableError(errorType) ||
          attempt >= this.retryConfig.maxRetries
        ) {
          console.error(
            `[AuthService] ${requestId} - Non-retryable error (${errorType}) or max retries reached:`,
            lastError.message
          );
          this.completeRequest(requestId, false, lastError);
          throw lastError;
        }

        const backoffMs = this.calculateBackoff(attempt);
        console.warn(
          `[AuthService] ${requestId} - Retryable error (${errorType}), retrying in ${backoffMs}ms:`,
          lastError.message
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        attempt++;
      }
    }

    console.error(`[AuthService] ${requestId} - Max retries exceeded`);
    this.completeRequest(requestId, false, lastError);

    if (lastError) {
      throw lastError;
    } else {
      throw new Error(`Failed after ${this.retryConfig.maxRetries} retries`);
    }
  }

  // # ############################################################################ #
  // # #             SECTION 16 - PRIVATE HELPER: PAYLOAD VALIDATION (VALIDATEWALLETPAYLOAD)              #
  // # ############################################################################ #
  /** Validate wallet authentication payload */
  private validateWalletPayload(
    payload: MiniAppWalletAuthSuccessPayload,
    nonce: string
  ): boolean {
    if (!payload) {
      console.error(
        '[AuthService] validateWalletPayload: Payload is null or undefined'
      );
      return false;
    }
    if (payload.status !== 'success') {
      console.error(
        '[AuthService] validateWalletPayload: Payload status is not success:',
        payload.status
      );
      return false;
    }
    if (!payload.message) {
      console.error(
        '[AuthService] validateWalletPayload: Payload message is missing'
      );
      return false;
    }
    if (!payload.signature) {
      console.error(
        '[AuthService] validateWalletPayload: Payload signature is missing'
      );
      return false;
    }
    return true;
  }

  // # ############################################################################ #
  // # #                                 SECTION 17 - PUBLIC METHOD: GET NONCE                                  #
  // # ############################################################################ #
  /** Fetches a unique nonce from the backend. */
  public async getNonce(): Promise<{
    success: boolean;
    nonce?: string;
    error?: string;
  }> {
    console.log('[AuthService] Fetching nonce...');
    const requestId = this.generateRequestId();
    const endpoint = '/auth/nonce';

    try {
      const url = this.buildUrl(endpoint);
      console.log(`[AuthService] ${requestId} - Fetching from: ${url}`);

      const data = await this.fetchWithRetry<any>(
        url,
        {
          method: 'GET',
          headers: {
            ...this.getHeaders(false),
            'X-Request-ID': requestId,
          },
          mode: 'cors',
          credentials: 'same-origin',
          cache: 'no-store',
        },
        requestId,
        endpoint
      );

      if (!data || !data.nonce) {
        console.error(`[AuthService] ${requestId} - Nonce missing in response`, data);
        return { success: false, error: 'Nonce not found in response' };
      }

      console.log(
        `[AuthService] ${requestId} - Nonce received successfully: ${data.nonce}`
      );
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
  // # #                       SECTION 18 - PUBLIC METHOD: VERIFY WALLET SIGNATURE                      #
  // # ############################################################################ #
  /** Verifies a wallet signature with the backend */
  public async verifyWalletSignature(
    payload: MiniAppWalletAuthSuccessPayload,
    nonce: string
  ): Promise<{
    success: boolean;
    token?: string;
    walletAddress?: string;
    error?: string;
  }> {
    console.log('[AuthService] Verifying wallet signature...');

    if (!this.validateWalletPayload(payload, nonce)) {
      return {
        success: false,
        error: 'Invalid wallet authentication payload',
      };
    }

    const requestId = this.generateRequestId();
    const endpoint = '/auth/verify-signature';

    try {
      const requestBody = {
        payload,
        nonce,
      };

      const url = this.buildUrl(endpoint);
      console.log(`[AuthService] ${requestId} - Posting to: ${url}`);

      const data = await this.fetchWithRetry<any>(
        url,
        {
          method: 'POST',
          headers: {
            ...this.getHeaders(false),
            'X-Request-ID': requestId,
          },
          body: JSON.stringify(requestBody),
          mode: 'cors',
          credentials: 'same-origin',
        },
        requestId,
        endpoint
      );

      if (!data || !data.token || !data.walletAddress) {
        console.error(
          `[AuthService] ${requestId} - Missing token or walletAddress in:`,
          data
        );
        return {
          success: false,
          error: 'Token or wallet address missing from response',
        };
      }

      this.safeLocalStorage.setItem(SESSION_TOKEN_KEY, data.token);
      this.safeLocalStorage.setItem(WALLET_ADDRESS_KEY, data.walletAddress);

      console.log(`[AuthService] ${requestId} - Signature verified successfully`);
      return {
        success: true,
        token: data.token,
        walletAddress: data.walletAddress,
      };
    } catch (error: any) {
      const errorMessage =
        error.message || 'Network error during verification';
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

      console.error(
        `[AuthService] ${requestId} - Error verifying signature:`,
        error
      );

      return {
        success: false,
        error: friendlyError,
      };
    }
  }

  // # ############################################################################ #
  // # #                       SECTION 19 - PUBLIC METHOD: VERIFY WORLD ID PROOF                      #
  // # ############################################################################ #
  /** Verifies World ID proof with the backend */
  public async verifyWorldIdProof(
    proof: IDKitSuccessResult
  ): Promise<{ success: boolean; error?: string }> {
    console.log('[AuthService] Verifying World ID proof...');

    if (!proof || !proof.merkle_root || !proof.nullifier_hash || !proof.proof) {
      console.error(
        '[AuthService] verifyWorldIdProof: Invalid or incomplete proof:',
        proof
      );
      return {
        success: false,
        error: 'Invalid or incomplete World ID proof',
      };
    }

    const requestId = this.generateRequestId();
    const endpoint = '/verify-worldid';

    try {
      const url = this.buildUrl(endpoint);
      console.log(`[AuthService] ${requestId} - Posting to: ${url}`);

      await this.fetchWithRetry<any>(
        url,
        {
          method: 'POST',
          headers: {
            ...this.getHeaders(true),
            'X-Request-ID': requestId,
          },
          body: JSON.stringify(proof),
          mode: 'cors',
          credentials: 'same-origin',
        },
        requestId,
        endpoint
      );

      console.log(
        `[AuthService] ${requestId} - World ID proof verified successfully`
      );
      return { success: true };
    } catch (error: any) {
      const errorMessage =
        error.message || 'Network error during verification';
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

      console.error(
        `[AuthService] ${requestId} - Error verifying World ID proof:`,
        error
      );

      return {
        success: false,
        error: friendlyError,
      };
    }
  }

  // # ############################################################################ #
  // # #                                 SECTION 20 - PUBLIC METHOD: LOGOUT                                 #
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
  // # #                             SECTION 21 - PUBLIC METHOD: CHECK AUTH STATUS                            #
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
      const token = this.safeLocalStorage.getItem(SESSION_TOKEN_KEY);
      const walletAddress = this.safeLocalStorage.getItem(WALLET_ADDRESS_KEY);

      console.log(
        `[AuthService] Token found: ${Boolean(
          token
        )}, Wallet address found: ${Boolean(walletAddress)}`
      );

      let hasValidFormat = false;
      if (token) {
        const parts = token.split('.');
        hasValidFormat = parts.length === 3;

        if (!hasValidFormat) {
          console.warn(
            '[AuthService] Retrieved token has invalid format, not a proper JWT'
          );
        } else {
          try {
            if (parts.length >= 3 && parts[1]) {
              const payloadBase64 = parts[1];
              let payloadJson = '';

              try {
                const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
                const paddingLength = (4 - (base64.length % 4)) % 4;
                const paddedBase64 = base64 + '='.repeat(paddingLength);
                payloadJson = atob(paddedBase64);
              } catch (base64Error) {
                console.error(
                  '[AuthService] Error decoding base64 payload:',
                  base64Error
                );
                hasValidFormat = false;
                throw new Error(
                  'Invalid token format: could not decode payload'
                );
              }

              if (payloadJson) {
                let payload: any;
                try {
                  payload = JSON.parse(payloadJson);
                } catch (jsonError) {
                  console.error(
                    '[AuthService] Error parsing token JSON payload:',
                    jsonError
                  );
                  hasValidFormat = false;
                  throw new Error(
                    'Invalid token format: could not parse payload JSON'
                  );
                }

                if (payload && payload.exp) {
                  const expTime = payload.exp * 1000; // Convert to milliseconds
                  const now = Date.now();

                  if (expTime < now) {
                    console.warn(
                      `[AuthService] Token expired at ${new Date(
                        expTime
                      ).toISOString()}`
                    );
                    return {
                      isAuthenticated: false,
                      token: null,
                      walletAddress: null,
                    };
                  }
                }

                console.log('[AuthService] Token passed basic JWT validation');
              } else {
                console.warn('[AuthService] Empty payload after decoding');
                hasValidFormat = false;
              }
            } else {
              console.warn(
                '[AuthService] Invalid token structure - missing payload part'
              );
              hasValidFormat = false;
            }
          } catch (parseError) {
            console.error('[AuthService] Error validating token:', parseError);
            hasValidFormat = false;
          }
        }
      }

      const isAuthenticated = Boolean(token && hasValidFormat && walletAddress);

      console.log(
        `[AuthService] Auth status → ${
          isAuthenticated ? 'Authenticated' : 'Not authenticated'
        }`
      );

      if (!isAuthenticated && (token || walletAddress)) {
        console.warn(
          '[AuthService] Not authenticated because: ' +
            (!token
              ? 'Token missing'
              : !hasValidFormat
              ? 'Token has invalid format'
              : !walletAddress
              ? 'Wallet address missing'
              : 'Unknown reason')
        );
      }

      return {
        isAuthenticated,
        token: token && hasValidFormat ? token : null,
        walletAddress,
      };
    } catch (error) {
      console.error('[AuthService] Error checking auth status:', error);
      return {
        isAuthenticated: false,
        token: null,
        walletAddress: null,
      };
    }
  }

  // # ############################################################################ #
  // # #                        SECTION 22 - PUBLIC METHOD: VERIFY TOKEN (CLIENT-SIDE)                        #
  // # ############################################################################ #
  /** Verifies that a token is valid */
  public async verifyToken(token: string): Promise<{
    isValid: boolean;
    error?: string;
    walletAddress?: string;
  }> {
    console.log('[AuthService] Verifying token validity...');

    try {
      if (!token || typeof token !== 'string' || token.trim() === '') {
        return { isValid: false, error: 'No token provided' };
      }

      const parts = token.split('.');
      if (parts.length !== 3) {
        return { isValid: false, error: 'Invalid token format (not a JWT)' };
      }

      const payloadPart = parts[1];
      if (!payloadPart) {
        return {
          isValid: false,
          error: 'Invalid token format (missing payload)',
        };
      }

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
        console.error(
          '[AuthService] Error decoding token payload:',
          decodeError
        );
        return {
          isValid: false,
          error: 'Invalid token format (cannot decode payload)',
        };
      }
    } catch (error: any) {
      console.error('[AuthService] Error verifying token:', error);
      return {
        isValid: false,
        error: error.message || 'Error validating token',
      };
    }
  }
}

// # ############################################################################ #
// # #                                 SECTION 23 - SINGLETON EXPORT                                  #
// # ############################################################################ #
// Export singleton instance
export const authService = AuthService.getInstance();
export default AuthService;