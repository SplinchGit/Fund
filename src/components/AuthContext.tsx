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
  logout: () => Promise<void>; // This should return Promise<void>
  loginWithWallet: (authResult: MiniAppWalletAuthSuccessPayload) => Promise<void>;
  getNonceForMiniKit: () => Promise<string>;
}

// Create context with undefined default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session storage keys
const SESSION_TOKEN_KEY = 'worldfund_session_token';
const WALLET_ADDRESS_KEY = 'worldfund_wallet_address';

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
      const nonceResult = await authService.getNonce();
      if (!nonceResult.success || !nonceResult.nonce) {
        const errorMessage = nonceResult.error || 'Failed to fetch nonce';
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
    console.log('[AuthContext] loginWithWallet: Starting with payload:', authResult);
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check message validity
      if (!authResult.message) {
        console.error('[AuthContext] loginWithWallet: Invalid authResult.message');
        throw new Error('Invalid authentication payload: message is missing');
      }

      // Extract nonce from the message
      const messageObj = typeof authResult.message === 'object' ? 
        authResult.message : 
        JSON.parse(typeof authResult.message === 'string' ? authResult.message : '{}');
      
      const signedNonce = messageObj.nonce || '';
      
      if (!signedNonce) {
        console.error('[AuthContext] loginWithWallet: Nonce missing in signed message');
        throw new Error('Nonce missing in signed message from wallet');
      }
      
      console.log('[AuthContext] loginWithWallet: Nonce signed by wallet:', signedNonce);

      // Verify signature with backend
      console.log('[AuthContext] loginWithWallet: Verifying signature with signedNonce:', signedNonce);
      const verifyResult = await authService.verifyWalletSignature(authResult, signedNonce);
      console.log('[AuthContext] loginWithWallet: Verification result:', verifyResult);

      if (verifyResult.success && verifyResult.walletAddress && verifyResult.token) {
        console.log('[AuthContext] loginWithWallet: Verification successful, calling login');
        login(verifyResult.token, verifyResult.walletAddress, true);
      } else {
        throw new Error(verifyResult.error || 'Wallet signature verification failed');
      }
    } catch (error: any) {
      console.error('[AuthContext] loginWithWallet: Wallet login process failed:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Wallet login failed',
      }));
      throw error;
    }
  }, [login]);

  // Logout function - FIXED: Return type should be Promise<void>
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
      
      // Don't return any value as the function must return void
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