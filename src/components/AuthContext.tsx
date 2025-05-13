// src/components/AuthContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect
} from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/AuthService';
import { MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';

// Auth state interface
interface AuthState {
  isAuthenticated: boolean;
  walletAddress: string | null;
  sessionToken: string | null;
  isLoading: boolean;
  error: string | null;
  nonce: string | null;
}

// Auth context interface
interface AuthContextType extends AuthState {
  login: (token: string, address: string, shouldNavigate?: boolean) => void;
  logout: () => Promise<void>;
  loginWithWallet: (authResult: MiniAppWalletAuthSuccessPayload) => Promise<void>;
  getNonceForMiniKit: () => Promise<string>;
}

// Create context with undefined default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session storage keys
const SESSION_TOKEN_KEY = 'worldfund_session_token';
const WALLET_ADDRESS_KEY = 'worldfund_wallet_address';

/**
 * Helper to safely extract nonce from different message formats
 */
const extractNonceFromMessage = (message: string): string => {
  if (!message) return '';
  
  // SIWE format - exactly matching the format seen in the logs
  // Look for "Nonce: [hexadecimal]" pattern
  const siweNonceMatch = message.match(/Nonce:\s*([a-f0-9]{8,64})/i);
  if (siweNonceMatch && siweNonceMatch[1]) {
    console.log('[AuthContext] Extracted nonce from SIWE message format:', siweNonceMatch[1]);
    return siweNonceMatch[1];
  }
  
  // Try parsing as JSON
  try {
    const parsed = JSON.parse(message);
    if (parsed && typeof parsed === 'object' && parsed.nonce) {
      console.log('[AuthContext] Extracted nonce from JSON message:', parsed.nonce);
      return String(parsed.nonce);
    }
  } catch (e) {
    // Not JSON, continue with other methods
  }
  
  // Check if the message itself looks like a nonce (hexadecimal string)
  if (/^[a-f0-9]{8,64}$/i.test(message)) {
    console.log('[AuthContext] Message is a hex string nonce:', message);
    return message;
  }
  
  // Look for nonce pattern in the message with more generic format
  const nonceMatch = message.match(/nonce["']?\s*[:=]\s*["']?([a-f0-9]{8,64})["']?/i);
  if (nonceMatch && nonceMatch[1]) {
    console.log('[AuthContext] Extracted nonce from generic pattern:', nonceMatch[1]);
    return nonceMatch[1];
  }
  
  console.warn('[AuthContext] Could not extract nonce from message:', 
    message.substring(0, 100) + (message.length > 100 ? '...' : ''));
  
  // If all extraction methods fail, return empty string
  return '';
};

// Store session data helper
const storeSessionData = (token: string, address: string): void => {
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
    localStorage.setItem(WALLET_ADDRESS_KEY, address);
    console.log('[AuthContext] Session data stored in localStorage');
  } catch (error) {
    console.error("[AuthContext] Error storing session data:", error);
  }
};

// Get stored session data helper
const getStoredSessionData = (): { token: string | null, address: string | null } => {
  try {
    const token = localStorage.getItem(SESSION_TOKEN_KEY);
    const address = localStorage.getItem(WALLET_ADDRESS_KEY);
    return { token, address };
  } catch (error) {
    console.error("[AuthContext] Error getting session data:", error);
    return { token: null, address: null };
  }
};

// Clear stored session data helper
const clearStoredSessionData = (): void => {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(WALLET_ADDRESS_KEY);
    console.log('[AuthContext] Session data cleared from localStorage');
  } catch (error) {
    console.error("[AuthContext] Error clearing session data:", error);
  }
};

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const navigate = useNavigate();

  // Initial auth state
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    walletAddress: null,
    sessionToken: null,
    isLoading: true, // Start loading until we check session
    error: null,
    nonce: null,
  });

  // Login function
  const login = useCallback((token: string, address: string, shouldNavigate: boolean = true) => {
    console.log('[AuthContext] Login called with:', { hasToken: !!token, address, shouldNavigate });
    
    // Store session data
    storeSessionData(token, address);
    
    // Update auth state
    setAuthState({
      isAuthenticated: true,
      walletAddress: address,
      sessionToken: token,
      isLoading: false,
      error: null,
      nonce: null,
    });
    
    console.log('[AuthContext] Auth state updated, user is now authenticated');
    
    // Navigate to dashboard if requested
    if (shouldNavigate) {
      // Allow state update to complete first
      setTimeout(() => {
        console.log('[AuthContext] Navigating to dashboard after login');
        navigate('/dashboard', { replace: true });
      }, 0);
    } else {
      console.log('[AuthContext] Navigation skipped as shouldNavigate is false');
    }
  }, [navigate]);

  // Get nonce for MiniKit
  const getNonceForMiniKit = useCallback(async (): Promise<string> => {
    console.log('[AuthContext] getNonceForMiniKit: Fetching nonce...');
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Log API environment variables for debugging
      console.log('[AuthContext] API environment variables:', {
        VITE_AMPLIFY_API: import.meta.env.VITE_AMPLIFY_API,
        VITE_APP_BACKEND_API_URL: import.meta.env.VITE_APP_BACKEND_API_URL
      });
      
      // Try to get nonce from the backend
      const nonceResult = await authService.getNonce();
      
      // Check if the request was successful
      if (!nonceResult.success) {
        const errorMessage = nonceResult.error || 'Failed to fetch nonce';
        console.error('[AuthContext] getNonceForMiniKit: Request failed -', errorMessage);
        setAuthState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        
        // Convert to user-friendly message if it appears to be a URL or HTML
        let userErrorMsg = errorMessage;
        if (errorMessage.includes('Invalid response format') || 
            errorMessage.includes('https://') ||
            errorMessage.includes('<!DOCTYPE')) {
          userErrorMsg = 'Backend connection error. Please check your network and API configuration.';
        }
        
        throw new Error(userErrorMsg);
      }
      
      // Check if we actually got a nonce back
      if (!nonceResult.nonce) {
        const errorMessage = 'Backend did not return a nonce';
        console.error('[AuthContext] getNonceForMiniKit:', errorMessage);
        setAuthState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        throw new Error(errorMessage);
      }
      
      const fetchedNonce: string = nonceResult.nonce;
      console.log('[AuthContext] getNonceForMiniKit: Nonce received successfully:', fetchedNonce);
      setAuthState(prev => ({ ...prev, isLoading: false, nonce: fetchedNonce }));
      return fetchedNonce;
    } catch (error) {
      console.error('[AuthContext] getNonceForMiniKit: Error fetching nonce.', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching nonce';
      setAuthState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, []);

  // Login with wallet
  const loginWithWallet = useCallback(async (authResult: MiniAppWalletAuthSuccessPayload) => {
    console.log('[AuthContext] loginWithWallet: Starting wallet login process');
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

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

      // Verify signature with backend
      console.log('[AuthContext] Verifying wallet signature with backend...');
      const verifyResult = await authService.verifyWalletSignature(authResult, signedNonce);
      console.log('[AuthContext] Verification result:', verifyResult.success);

      if (verifyResult.success && verifyResult.walletAddress && verifyResult.token) {
        console.log('[AuthContext] Signature verification successful, logging in...');
        login(verifyResult.token, verifyResult.walletAddress, true);
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
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Wallet login failed',
      }));
      throw error;
    }
  }, [login]);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    console.log('[AuthContext] Logging out...');
    setAuthState(prevState => ({ ...prevState, isLoading: true }));
    
    try {
      // Clear local storage
      clearStoredSessionData();
      
      // Try backend logout, continue if it fails
      try {
        await authService.logout();
      } catch (logoutError) {
        console.warn('[AuthContext] Backend logout failed, continuing local logout:', logoutError);
      }
      
      // Update auth state
      setAuthState({
        isAuthenticated: false,
        walletAddress: null,
        sessionToken: null,
        isLoading: false,
        error: null,
        nonce: null,
      });
      
      console.log('[AuthContext] User logged out successfully, redirecting to landing');
      navigate('/landing', { replace: true });
    } catch (error: any) {
      console.error('[AuthContext] Logout failed:', error);
      setAuthState(prevState => ({ 
        ...prevState, 
        isLoading: false, 
        error: error.message || 'Logout failed' 
      }));
      // Re-throw the error to maintain the Promise rejection
      throw error;
    }
  }, [navigate]);

  // Check session on mount
  const checkSession = useCallback(async () => {
    console.log('[AuthContext] Checking session...');
    setAuthState(prevState => ({ ...prevState, isLoading: true, error: null }));
    
    const { token, address } = getStoredSessionData();

    if (token && address) {
      console.log('[AuthContext] Session data found in localStorage');
      
      // For quick initial load, set authenticated first
      setAuthState({
        isAuthenticated: true,
        walletAddress: address,
        sessionToken: token,
        isLoading: false,
        error: null,
        nonce: null,
      });
      
      // Then validate token asynchronously to ensure it's still valid
      try {
        const verifyResult = await authService.verifyToken(token);
        
        if (!verifyResult.isValid) {
          console.log('[AuthContext] Session token invalid, logging out:', verifyResult.error);
          clearStoredSessionData();
          
          setAuthState({
            isAuthenticated: false,
            walletAddress: null,
            sessionToken: null, 
            isLoading: false,
            error: null,
            nonce: null,
          });
        }
      } catch (verifyError) {
        console.error('[AuthContext] Error verifying token:', verifyError);
        // Continue with authentication on error - we can try again next time
      }
    } else {
      console.log('[AuthContext] No session data found');
      setAuthState({
        isAuthenticated: false,
        walletAddress: null,
        sessionToken: null,
        isLoading: false,
        error: null,
        nonce: null,
      });
    }
  }, []);

  // Check session on mount and when storage changes
  useEffect(() => {
    checkSession();
    
    // Listen for storage events (e.g. other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SESSION_TOKEN_KEY || e.key === WALLET_ADDRESS_KEY) {
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
      hasSessionToken: !!authState.sessionToken,
      isLoading: authState.isLoading,
      hasError: !!authState.error,
      hasNonce: !!authState.nonce,
    });
  }, [authState]);

  // Provide context value
  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    loginWithWallet,
    getNonceForMiniKit,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Hook for using auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};