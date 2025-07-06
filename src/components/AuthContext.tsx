// src/components/AuthContext.tsx

// Imports


import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
  useRef
} from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/AuthService';
import { MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';
import { ISuccessResult, VerificationLevel } from '@worldcoin/idkit'; // 🆕 NEW: Import ISuccessResult and VerificationLevel


// Auth state interface with additional fields
interface AuthState {
  isAuthenticated: boolean;
  walletAddress: string | null;
  username: string | null;
  sessionToken: string | null;
  isLoading: boolean;
  error: string | null;
  nonce: string | null;
  lastAuthAttempt: number | null; // Track last auth attempt timestamp
}

// Auth context interface
interface AuthContextType extends AuthState {
  login: (token: string, address: string, username?: string, shouldNavigate?: boolean) => void;
  logout: () => Promise<void>;
  loginWithWallet: (authResult: MiniAppWalletAuthSuccessPayload) => Promise<void>;
  getNonceForMiniKit: () => Promise<string>;
  clearError: () => void; // New function to clear errors
  
  // 🆕 NEW: Global World ID State
  isWorldIdVerifiedGlobally: boolean;
  setWorldIdVerifiedGlobally: (status: boolean) => void;
  worldIdProofResult: ISuccessResult | null;
  setWorldIdProofResult: (result: ISuccessResult | null) => void;
}

// Provider component props interface
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Context Instantiation
// Create context with undefined default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Global Constants
// Storage keys with namespace
const STORAGE_NAMESPACE = 'worldfund_';
const SESSION_TOKEN_KEY = `${STORAGE_NAMESPACE}session_token`;
const WALLET_ADDRESS_KEY = `${STORAGE_NAMESPACE}wallet_address`;
const USERNAME_KEY = `${STORAGE_NAMESPACE}username`;

// Utility: Nonce Validation
// Improved nonce validation - strict hexadecimal format check
const isValidNonce = (nonce: string): boolean => {
  return /^[a-f0-9]{8,64}$/i.test(nonce);
};

// Utility: Nonce Extraction
/**
 * Helper to safely extract nonce from different message formats with enhanced SIWE handling
 */
const extractNonceFromMessage = (message: string): string => {
  if (!message) return '';

  // SIWE format - exactly matching the format seen in the logs
  // Look for "Nonce: [hexadecimal]" pattern
  const siweNonceMatch = message.match(/Nonce:\s*([a-f0-9]{8,64})/i);
  if (siweNonceMatch && siweNonceMatch[1] && isValidNonce(siweNonceMatch[1])) {
    console.log('[AuthContext] Extracted nonce from SIWE message format:', siweNonceMatch[1]);
    return siweNonceMatch[1];
  }

  // Try line-by-line scanning for SIWE format (which is often multi-line)
  const lines = message.split(/\r?\n/);
  for (const line of lines) {
    const lineMatch = line.match(/^\s*Nonce:\s*([a-f0-9]{8,64})\s*$/i);
    if (lineMatch && lineMatch[1] && isValidNonce(lineMatch[1])) {
      console.log('[AuthContext] Extracted nonce from multiline SIWE message:', lineMatch[1]);
      return lineMatch[1];
    }
  }

  // Try parsing as JSON
  try {
    const parsed = JSON.parse(message);
    if (parsed && typeof parsed === 'object' && parsed.nonce && isValidNonce(String(parsed.nonce))) {
      console.log('[AuthContext] Extracted nonce from JSON message:', parsed.nonce);
      return String(parsed.nonce);
    }
  } catch (e) {
    // Not JSON, continue with other methods
  }

  // Check if the message itself looks like a nonce (hexadecimal string)
  if (isValidNonce(message)) {
    console.log('[AuthContext] Message is a hex string nonce:', message);
    return message;
  }

  // Look for nonce pattern in the message with more generic format
  const nonceMatch = message.match(/nonce["']?\s*[:=]\s*["']?([a-f0-9]{8,64})["']?/i);
  if (nonceMatch && nonceMatch[1] && isValidNonce(nonceMatch[1])) {
    console.log('[AuthContext] Extracted nonce from generic pattern:', nonceMatch[1]);
    return nonceMatch[1];
  }

  console.warn('[AuthContext] Could not extract nonce from message:',
    message.substring(0, 100) + (message.length > 100 ? '...' : ''));

  // If all extraction methods fail, return empty string
  return '';
};

// # ############################################################################ #
// # #                 SECTION 7 - UTILITY: SESSION DATA STORAGE                #
// # ############################################################################ #
// Store session data helper - Using sessionStorage for tokens for better security
const storeSessionData = (token: string, address: string, username?: string): void => {
  try {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    localStorage.setItem(WALLET_ADDRESS_KEY, address);
    if (username) {
      localStorage.setItem(USERNAME_KEY, username);
    }
    console.log('[AuthContext] Session data stored in storage');
  } catch (error) {
    console.error("[AuthContext] Error storing session data:", error);
  }
};

// Get stored session data helper
const getStoredSessionData = (): { token: string | null, address: string | null, username: string | null } => {
  try {
    // Try sessionStorage first, then fall back to localStorage for backwards compatibility
    let token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (!token) {
      token = localStorage.getItem(SESSION_TOKEN_KEY);
      // Migrate to sessionStorage if found in localStorage
      if (token) {
        sessionStorage.setItem(SESSION_TOKEN_KEY, token);
        localStorage.removeItem(SESSION_TOKEN_KEY);
      }
    }

    const address = localStorage.getItem(WALLET_ADDRESS_KEY);
    const username = localStorage.getItem(USERNAME_KEY);
    return { token, address, username };
  } catch (error) {
    console.error("[AuthContext] Error getting session data:", error);
    return { token: null, address: null, username: null };
  }
};

// Clear stored session data helper
const clearStoredSessionData = (): void => {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(WALLET_ADDRESS_KEY);
    localStorage.removeItem(USERNAME_KEY);
    console.log('[AuthContext] Session data cleared from storage');
  } catch (error) {
    console.error("[AuthContext] Error clearing session data:", error);
  }
};

// # ############################################################################ #
// # #                 SECTION 8 - AUTHPROVIDER: INITIALIZATION                 #
// # ############################################################################ #
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const navigate = useNavigate();

  // Initial auth state with new lastAuthAttempt field
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    walletAddress: null,
    username: null,
    sessionToken: null,
    isLoading: true, // Start loading until we check session
    error: null,
    nonce: null,
    lastAuthAttempt: null,
  });

  // 🆕 NEW: Global World ID State
  const [isWorldIdVerifiedGlobally, setIsWorldIdVerifiedGlobally] = useState<boolean>(false);
  const [worldIdProofResult, setWorldIdProofResult] = useState<ISuccessResult | null>(null);

  // Active operation tracking refs to prevent race conditions
  const isLoginInProgressRef = useRef(false);
  const nonceRequestInProgressRef = useRef<Promise<string> | null>(null);

  // Maximum retries for API calls
  const MAX_RETRIES = 2;

// # ############################################################################ #
// # #                 SECTION 9 - AUTHPROVIDER: STATE MANAGEMENT               #
// # ############################################################################ #
  // Function to safely update state that prevents race conditions
  const updateAuthState = useCallback((
    updates: Partial<AuthState>,
    resetError: boolean = false
  ) => {
    setAuthState(prev => {
      // Always reset error if requested
      const errorUpdate = resetError ? { error: null } : {};
      return { ...prev, ...updates, ...errorUpdate };
    });
  }, []);

  // Clear error function
  const clearError = useCallback(() => {
    updateAuthState({ error: null });
  }, [updateAuthState]);

// # ############################################################################ #
// # #               SECTION 10 - AUTHPROVIDER: ASYNC OPERATION UTILITY         #
// # ############################################################################ #
  // Helper function to retry an async operation with improved error handling
  const retryOperation = async <T,>(
    operation: () => Promise<T>,
    maxRetries: number,
    delayMs: number = 300,
    operationName: string = 'Operation'
  ): Promise<T> => {
    let lastError: Error | unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.warn(`[AuthContext] ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error);

        if (attempt < maxRetries) {
          // Wait before retrying with increasing backoff
          await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(1.5, attempt)));
        }
      }
    }

    throw lastError;
  };

// # ############################################################################ #
// # #                SECTION 11 - AUTHPROVIDER: CORE LOGIN FUNCTION            #
// # ############################################################################ #
  // Login function - Improved with atomic state updates
  const login = useCallback((token: string, address: string, username?: string, shouldNavigate: boolean = true) => {
    console.log('[AuthContext] Login called with:', { hasToken: !!token, address, username, shouldNavigate });

    if (!token || !address) {
      console.error('[AuthContext] Invalid login parameters', { hasToken: !!token, hasAddress: !!address });
      updateAuthState({
        isLoading: false,
        error: 'Invalid login credentials',
        lastAuthAttempt: Date.now()
      });
      return;
    }

    // Store session data
    storeSessionData(token, address, username);

    // Update auth state atomically
    updateAuthState({
      isAuthenticated: true,
      walletAddress: address,
      username: username || null,
      sessionToken: token,
      isLoading: false,
      lastAuthAttempt: Date.now()
    }, true);

    // 🆕 Check if this login included World ID verification
    // (You can add a parameter or check proof result to handle it here, e.g., if login payload contains World ID proof)
    // Example: if (loginPayload.worldIdProof) handleWorldIdVerificationSuccess(loginPayload.worldIdProof);
    
    console.log('[AuthContext] Auth state updated, user is now authenticated');

    // Navigate to dashboard if requested
    if (shouldNavigate) {
      console.log('[AuthContext] Navigating to dashboard after login');
      // Use navigate directly - no need for setTimeout
      navigate('/dashboard', { replace: true });
    } else {
      console.log('[AuthContext] Navigation skipped as shouldNavigate is false');
    }
  }, [navigate, updateAuthState]);

// # ############################################################################ #
// # #                SECTION 12 - AUTHPROVIDER: NONCE RETRIEVAL                #
// # ############################################################################ #
  // Get nonce for MiniKit with deduplication to prevent race conditions
  const getNonceForMiniKit = useCallback(async (): Promise<string> => {
    console.log('[AuthContext] getNonceForMiniKit: Fetching nonce...');

    // If a nonce request is already in progress, return the existing promise
    if (nonceRequestInProgressRef.current) {
      console.log('[AuthContext] Reusing in-progress nonce request');
      return nonceRequestInProgressRef.current;
    }

    // Start loading state
    updateAuthState({ isLoading: true }, true);

    // Create a new promise for the nonce request
    const noncePromise = (async () => {
      try {
        // Log API environment variables for debugging
        console.log('[AuthContext] API environment variables:', {
          VITE_AMPLIFY_API: import.meta.env.VITE_AMPLIFY_API,
          VITE_APP_BACKEND_API_URL: import.meta.env.VITE_APP_BACKEND_API_URL
        });

        // Try to get nonce from the backend with retries
        const nonceResult = await retryOperation(
          () => authService.getNonce(),
          MAX_RETRIES,
          300,
          'Get nonce'
        );

        // Check if the request was successful
        if (!nonceResult.success) {
          const errorMessage = nonceResult.error || 'Failed to fetch nonce';
          console.error('[AuthContext] getNonceForMiniKit: Request failed -', errorMessage);
          updateAuthState({ isLoading: false, error: errorMessage });

          // Convert to user-friendly message if it appears to be a URL or HTML
          let userErrorMsg = errorMessage;
          if (errorMessage.includes('Invalid response format') ||
              errorMessage.includes('https://') ||
              errorMessage.includes('<!DOCTYPE')) {
            userErrorMsg = 'Backend connection error. Please check your network and API configuration.';
          }

          throw new Error(userErrorMsg);
        }

        // Check if we actually got a nonce back and validate it
        const fetchedNonce = nonceResult.nonce;
        if (!fetchedNonce || !isValidNonce(fetchedNonce)) {
          const errorMessage = 'Backend returned invalid nonce format';
          console.error('[AuthContext] getNonceForMiniKit:', errorMessage, fetchedNonce);
          updateAuthState({ isLoading: false, error: errorMessage });
          throw new Error(errorMessage);
        }

        console.log('[AuthContext] getNonceForMiniKit: Nonce received successfully:', fetchedNonce);
        updateAuthState({ isLoading: false, nonce: fetchedNonce });
        return fetchedNonce;
      } catch (error) {
        console.error('[AuthContext] getNonceForMiniKit: Error fetching nonce.', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching nonce';
        updateAuthState({ isLoading: false, error: errorMessage });
        throw error;
      } finally {
        // Clear the in-progress reference after completion
        nonceRequestInProgressRef.current = null;
      }
    })();

    // Store the promise in the ref to deduplicate concurrent calls
    nonceRequestInProgressRef.current = noncePromise;

    return noncePromise;
  }, [updateAuthState]);

// # ############################################################################ #
// # #                  SECTION 13 - AUTHPROVIDER: WALLET LOGIN                 #
// # ############################################################################ #
  // Login with wallet with protection against concurrent calls
  const loginWithWallet = useCallback(async (authResult: MiniAppWalletAuthSuccessPayload) => {
    console.log('[AuthContext] loginWithWallet: Starting wallet login process');

    // Prevent concurrent login attempts
    if (isLoginInProgressRef.current) {
      console.warn('[AuthContext] Login already in progress, skipping new attempt');
      throw new Error('Another login is already in progress');
    }

    isLoginInProgressRef.current = true;
    updateAuthState({ isLoading: true }, true);

    try {
      // Validate the wallet auth result
      if (!authResult || authResult.status !== 'success') {
        console.error('[AuthContext] Invalid authentication result:', authResult);
        throw new Error('Invalid wallet authentication result');
      }

      // Check required fields
      if (!authResult.message) {
        console.error('[AuthContext] Message missing from wallet auth result');
        throw new Error('Authentication payload missing message data');
      }

      if (!authResult.signature) {
        console.error('[AuthContext] Signature missing from wallet auth result');
        throw new Error('Authentication payload missing signature');
      }

      // Log payload structure (safely)
      console.log('[AuthContext] Auth payload structure:', {
        type: typeof authResult.message,
        length: authResult.message.length,
        address: authResult.address ? `${authResult.address.substring(0, 6)}...` : 'none',
        version: authResult.version
      });

      // Extract nonce from the SIWE message
      const signedNonce = extractNonceFromMessage(authResult.message);

      if (!signedNonce) {
        console.error('[AuthContext] Could not extract nonce from message');
        // Log a snippet of the message to help with debugging
        console.error('[AuthContext] Message snippet:',
          typeof authResult.message === 'string'
            ? authResult.message.substring(0, 100) + '...'
            : String(authResult.message).substring(0, 100) + '...');
        throw new Error('Failed to parse authentication message from wallet');
      }

      console.log('[AuthContext] Extracted nonce from wallet message:', signedNonce);

      // Verify signature with backend with retries
      console.log('[AuthContext] Verifying wallet signature with backend...');
      const verifyResult = await retryOperation(
        () => authService.verifyWalletSignature(authResult, signedNonce),
        MAX_RETRIES,
        500,
        'Verify wallet signature'
      );
      console.log('[AuthContext] Verification result:', verifyResult.success);

      if (verifyResult.success && verifyResult.walletAddress && verifyResult.token) {
        console.log('[AuthContext] Signature verification successful, logging in...');
        
        // FIXED: Make the formatting async
        const formatAddressOrEns = async (address: string): Promise<string> => {
          // For now, just return the address formatted
          // You can add ENS resolution logic here later if needed
          return address;
        };

        // Resolve ENS name for the address before updating state
        const formattedAddress = await formatAddressOrEns(verifyResult.walletAddress);

        // Try to get username from AuthService response (which now includes World ID username resolution)
        const authStatus = await authService.checkAuthStatus();
        const username = authStatus.username;
        
        // 🆕 NEW: Handle World ID verification status from backend
        if (verifyResult.isWorldIdVerified) {
          console.log('[AuthContext] World ID verification confirmed by backend');
          setIsWorldIdVerifiedGlobally(true);
          
          // Create a proof result object for state management
          const proofResult: ISuccessResult = {
            merkle_root: '',
            nullifier_hash: '',
            proof: '',
            verification_level: (verifyResult.worldIdLevel as VerificationLevel) || 'device',
            // Add any other required fields based on ISuccessResult interface
          };
          setWorldIdProofResult(proofResult);
          
          // Store World ID verification in session (backup to what AuthService already did)
          try {
            sessionStorage.setItem('worldId_verified', 'true');
            sessionStorage.setItem('worldId_proof', JSON.stringify({
              verification_level: verifyResult.worldIdLevel || 'device',
              verifiedAt: verifyResult.verifiedAt || new Date().toISOString()
            }));
            console.log('[AuthContext] World ID verification status stored in session');
          } catch (error) {
            console.warn('[AuthContext] Could not persist World ID state:', error);
          }
        }
        
        // Update auth state atomically
        login(verifyResult.token, formattedAddress, username || undefined, true);
      } else {
        // Enhanced error with clearer user message
        let errorMsg = verifyResult.error || 'Wallet signature verification failed';
        if (errorMsg.includes('Invalid response format') ||
            errorMsg.includes('https://') ||
            errorMsg.includes('<!DOCTYPE')) {
          errorMsg = 'Backend connection error. Please check API configuration.';
        }
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('[AuthContext] Wallet login failed:', error);
      updateAuthState({
        isLoading: false,
        error: error.message || 'Wallet login failed',
        lastAuthAttempt: Date.now()
      });
      throw error;
    } finally {
      isLoginInProgressRef.current = false;
    }
  }, [login, updateAuthState]);

// # ############################################################################ #
// # #                  SECTION 14 - AUTHPROVIDER: LOGOUT FUNCTION              #
// # ############################################################################ #
  // Logout function with improved error handling
  const logout = useCallback(async (): Promise<void> => {
    console.log('[AuthContext] Logging out...');
    updateAuthState({ isLoading: true }, true);

    try {
      // Clear local storage
      clearStoredSessionData();

      // 🆕 Clear World ID state
      setIsWorldIdVerifiedGlobally(false);
      setWorldIdProofResult(null);
      // Also clear from sessionStorage
      sessionStorage.removeItem('worldId_verified');
      sessionStorage.removeItem('worldId_proof');

      // Try backend logout, continue if it fails
      try {
        await authService.logout();
      } catch (logoutError) {
        console.warn('[AuthContext] Backend logout failed, continuing local logout:', logoutError);
      }

      // Update auth state atomically
      updateAuthState({
        isAuthenticated: false,
        walletAddress: null,
        username: null,
        sessionToken: null,
        isLoading: false,
        nonce: null,
      }, true);

      console.log('[AuthContext] User logged out successfully, redirecting to landing');
      navigate('/landing', { replace: true });
    } catch (error: any) {
      console.error('[AuthContext] Logout failed:', error);
      updateAuthState({
        isLoading: false,
        error: error.message || 'Logout failed',
        lastAuthAttempt: Date.now()
      });
      // Re-throw the error to maintain the Promise rejection
      throw error;
    }
  }, [navigate, updateAuthState]);

// # ############################################################################ #
// # #                  SECTION 15 - AUTHPROVIDER: SESSION CHECK LOGIC          #
// # ############################################################################ #
  // Check session on mount with improved validation
  const checkSession = useCallback(async () => {
    console.log('[AuthContext] Checking session...');
    updateAuthState({ isLoading: true }, true);

    try {
      const { token, address, username } = getStoredSessionData();

      if (!token || !address) {
        console.log('[AuthContext] No session data found');
        updateAuthState({
          isAuthenticated: false,
          walletAddress: null,
          username: null,
          sessionToken: null,
          isLoading: false,
        }, true);
        
        // 🆕 Clear World ID state if no session
        setIsWorldIdVerifiedGlobally(false);
        setWorldIdProofResult(null);
        sessionStorage.removeItem('worldId_verified');
        sessionStorage.removeItem('worldId_proof');

        return;
      }

      console.log('[AuthContext] Session data found in storage');

      // First set authenticated state for quick UI update
      updateAuthState({
        isAuthenticated: true,
        walletAddress: address,
        username: username,
        sessionToken: token,
        isLoading: true, // Keep loading while we verify
      }, true);

      // 🆕 Restore World ID state from sessionStorage
      try {
        const storedVerified = sessionStorage.getItem('worldId_verified');
        const storedProof = sessionStorage.getItem('worldId_proof');
        
        if (storedVerified === 'true') {
          setIsWorldIdVerifiedGlobally(true);
          if (storedProof) {
            const proofData = JSON.parse(storedProof);
            // Create ISuccessResult object
            const restoredProof: ISuccessResult = {
              merkle_root: '',
              nullifier_hash: '',
              proof: '',
              verification_level: (proofData.verification_level as VerificationLevel) || 'device',
            };
            setWorldIdProofResult(restoredProof);
          }
          console.log('[AuthContext] Restored World ID verification state from session');
        }
      } catch (error) {
        console.warn('[AuthContext] Could not restore World ID state:', error);
        // Clear potentially corrupted World ID session data
        sessionStorage.removeItem('worldId_verified');
        sessionStorage.removeItem('worldId_proof');
        setIsWorldIdVerifiedGlobally(false);
        setWorldIdProofResult(null);
      }
      
      // Then validate token asynchronously
      try {
        const verifyResult = await retryOperation(
          () => authService.verifyToken(token),
          1, // Fewer retries for token verification
          200,
          'Verify token'
        );

        if (!verifyResult.isValid) {
          console.log('[AuthContext] Session token invalid, logging out:', verifyResult.error);
          clearStoredSessionData();
          setIsWorldIdVerifiedGlobally(false); // Clear World ID on invalid token
          setWorldIdProofResult(null);
          sessionStorage.removeItem('worldId_verified');
          sessionStorage.removeItem('worldId_proof');

          updateAuthState({
            isAuthenticated: false,
            walletAddress: null,
            username: null,
            sessionToken: null,
            isLoading: false,
            error: 'Session expired. Please login again.'
          });

          // Optional - navigate to login page
          // navigate('/login', { replace: true });
          return;
        }

        // Token is valid, update final state
        updateAuthState({ isLoading: false });
        console.log('[AuthContext] Session token verified successfully');
        
        // 🆕 NEW: Also check auth status from service which includes World ID
        const fullAuthStatus = await authService.checkAuthStatus();
        if (fullAuthStatus.isWorldIdVerified) {
          setIsWorldIdVerifiedGlobally(true);
          console.log('[AuthContext] World ID verification status confirmed from auth service');
        }

      } catch (verifyError) {
        console.error('[AuthContext] Error verifying token:', verifyError);
        // Continue with authentication on network errors, but set a warning
        updateAuthState({
          isLoading: false,
          error: 'Could not verify session. You may need to login again if you encounter issues.'
        });
      }
    } catch (error) {
      console.error('[AuthContext] Session check failed:', error);
      updateAuthState({
        isAuthenticated: false,
        walletAddress: null,
        username: null,
        sessionToken: null,
        isLoading: false,
        error: 'Failed to check authentication status'
      });
      // Ensure World ID state is cleared on general session check failure
      setIsWorldIdVerifiedGlobally(false);
      setWorldIdProofResult(null);
      sessionStorage.removeItem('worldId_verified');
      sessionStorage.removeItem('worldId_proof');
    }
  }, [updateAuthState, navigate]);

// # ############################################################################ #
// # #                SECTION 16 - AUTHPROVIDER: LIFECYCLE & EFFECTS            #
// # ############################################################################ #
  // Check session on mount and when storage changes
  useEffect(() => {
    checkSession();

    // Listen for storage events (e.g. other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SESSION_TOKEN_KEY || e.key === WALLET_ADDRESS_KEY || e.key?.startsWith('worldId_')) { // 🆕 Listen for World ID storage changes
        console.log('[AuthContext] Session storage changed, re-checking session');
        checkSession();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkSession]);

  // Log auth state changes
  useEffect(() => {
    console.log('[AuthContext] Auth state updated:', {
      isAuthenticated: authState.isAuthenticated,
      hasWalletAddress: !!authState.walletAddress,
      hasUsername: !!authState.username,
      hasSessionToken: !!authState.sessionToken,
      isLoading: authState.isLoading,
      hasError: !!authState.error,
      hasNonce: !!authState.nonce,
      lastAuthAttempt: authState.lastAuthAttempt,
      // 🆕 NEW: World ID state logging
      isWorldIdVerifiedGlobally: isWorldIdVerifiedGlobally,
      hasWorldIdProofResult: !!worldIdProofResult,
    });
  }, [authState, isWorldIdVerifiedGlobally, worldIdProofResult]);

// # ############################################################################ #
// # #               SECTION 17 - AUTHPROVIDER: CONTEXT VALUE & RETURN          #
// # ############################################################################ #
  // Provide context value
  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    loginWithWallet,
    getNonceForMiniKit,
    clearError,
    // 🆕 NEW: World ID properties and methods
    isWorldIdVerifiedGlobally,
    setWorldIdVerifiedGlobally: setIsWorldIdVerifiedGlobally, // Use the correct setter for boolean status
    worldIdProofResult,
    setWorldIdProofResult, // Provide direct setter for cases where it's not a full success flow
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// # ############################################################################ #
// # #                  SECTION 18 - CUSTOM AUTH HOOK                           #
// # ############################################################################ #
// Hook for using auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};