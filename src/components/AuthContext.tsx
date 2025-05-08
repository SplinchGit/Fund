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

// --- Type Definitions ---
interface AuthState {
  isAuthenticated: boolean;
  walletAddress: string | null;
  sessionToken: string | null;
  isLoading: boolean;
  error: string | null;
  nonce: string | null;
}

interface AuthContextType extends AuthState {
  login: (token: string, address: string) => void;
  logout: () => Promise<void>;
  loginWithWallet: (authResult: MiniAppWalletAuthSuccessPayload) => Promise<void>;
}

// --- Context Creation ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Session Storage Functions ---
const SESSION_TOKEN_KEY = 'worldfund_session_token';
const WALLET_ADDRESS_KEY = 'worldfund_wallet_address';

const storeSessionData = (token: string, address: string): void => {
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
    localStorage.setItem(WALLET_ADDRESS_KEY, address);
    console.log('[AuthContext] Session data stored in localStorage');
  } catch (error) {
    console.error("[AuthContext] Error storing session data:", error);
  }
};

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

const clearStoredSessionData = (): void => {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(WALLET_ADDRESS_KEY);
    console.log('[AuthContext] Session data cleared from localStorage');
  } catch (error) {
    console.error("[AuthContext] Error clearing session data:", error);
  }
};

// --- Provider Component ---
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const navigate = useNavigate();

  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    walletAddress: null,
    sessionToken: null,
    isLoading: true, // Start with loading true until we check session
    error: null,
    nonce: null,
  });
// Login function: Updates state and stores session data
const login = useCallback((token: string, address: string) => {
  console.log('[AuthContext] Login called with:', { hasToken: !!token, address });
  
  // First store the session data in localStorage
  storeSessionData(token, address);
  
  // Then update state
  setAuthState({
    isAuthenticated: true,
    walletAddress: address,
    sessionToken: token,
    isLoading: false,
    error: null,
    nonce: null,
  });
  
  console.log('[AuthContext] Auth state updated, user is now authenticated');
  
  // Force a navigation to dashboard after login with a slightly longer delay
  // to ensure state is fully updated before navigation
  setTimeout(() => {
    console.log('[AuthContext] Navigating to dashboard after login');
    navigate('/dashboard', { replace: true });
  }, 200);  // Increased timeout for more reliability
}, [navigate]);

  // Login with wallet function: Handles the complete wallet auth flow
  const loginWithWallet = useCallback(async (authResult: MiniAppWalletAuthSuccessPayload) => {
    console.log('[AuthContext] Starting wallet login flow...');
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get nonce
      console.log('[AuthContext] Fetching nonce...');
      const nonceResult = await authService.getNonce();
      if (!nonceResult.success || !nonceResult.nonce) {
        throw new Error(nonceResult.error || 'Failed to fetch nonce');
      }
      console.log('[AuthContext] Nonce received:', nonceResult.nonce);

      // Verify signature
      console.log('[AuthContext] Verifying signature with nonce:', nonceResult.nonce);
      const verifyResult = await authService.verifyWalletSignature(authResult, nonceResult.nonce);
      console.log('[AuthContext] Verification result:', verifyResult);

      if (verifyResult.success && verifyResult.walletAddress && verifyResult.token) {
        console.log('[AuthContext] Verification successful, calling login...');
        login(verifyResult.token, verifyResult.walletAddress);
      } else {
        throw new Error(verifyResult.error || 'Verification failed');
      }
    } catch (error: any) {
      console.error('[AuthContext] Wallet login failed:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Login failed',
      }));
    }
  }, [login]);

  // Logout function
  const logout = useCallback(async () => {
    console.log('[AuthContext] Logging out...');
    setAuthState(prevState => ({ ...prevState, isLoading: true }));

    try {
      // First clear localStorage
      clearStoredSessionData();
      
      // Then try to call the backend logout if available
      try {
        await authService.logout();
      } catch (logoutError) {
        console.warn('[AuthContext] Backend logout failed, but continuing with local logout:', logoutError);
        // Continue with local logout even if backend logout fails
      }
      
      // Update state
      setAuthState({
        isAuthenticated: false,
        walletAddress: null,
        sessionToken: null,
        isLoading: false,
        error: null,
        nonce: null,
      });

      console.log('[AuthContext] User logged out successfully');
      navigate('/landing', { replace: true });
    } catch (error: any) {
      console.error('[AuthContext] Logout failed:', error);
      setAuthState(prevState => ({
        ...prevState,
        isLoading: false,
        error: error.message || 'Logout failed'
      }));
    }
  }, [navigate]);

  // Check session on mount
  const checkSession = useCallback(async () => {
    console.log('[AuthContext] Checking session...');
    setAuthState(prevState => ({ ...prevState, isLoading: true }));

    try {
      // 1. First check localStorage directly
      const { token, address } = getStoredSessionData();
      console.log('[AuthContext] Session data from localStorage:', {
        hasToken: !!token,
        hasAddress: !!address
      });

      // If we have both token and address, attempt to restore session
      if (token && address) {
        console.log('[AuthContext] Found session data, validating...');
        
        try {
          // Optionally verify token
          try {
            const verifyResult = await authService.verifyToken(token);
            if (!verifyResult.isValid) {
              throw new Error(verifyResult.error || 'Token validation failed');
            }
          } catch (verifyError) {
            console.warn('[AuthContext] Token validation skipped or failed:', verifyError);
            // Continue with session restoration even if token validation fails
            // This makes development easier - remove in production
          }
          
          console.log('[AuthContext] Session data valid, restoring session');
          setAuthState({
            isAuthenticated: true,
            walletAddress: address,
            sessionToken: token,
            isLoading: false,
            error: null,
            nonce: null,
          });
          console.log('[AuthContext] Session restored successfully');
          return; // Exit early since we've restored the session
        } catch (verifyError) {
          console.error('[AuthContext] Error verifying token:', verifyError);
          // If verification fails, clear stored data and continue as unauthenticated
          clearStoredSessionData();
        }
      }

      // If we get here, no valid session was found or restored
      console.log('[AuthContext] No valid session found');
      setAuthState({
        isAuthenticated: false,
        walletAddress: null,
        sessionToken: null,
        isLoading: false,
        error: null,
        nonce: null,
      });
    } catch (error: any) {
      console.error('[AuthContext] Error checking session:', error);
      clearStoredSessionData(); // Clear any potentially invalid data
      setAuthState({
        isAuthenticated: false,
        walletAddress: null,
        sessionToken: null,
        isLoading: false,
        error: 'Failed to check session',
        nonce: null,
      });
    }
  }, []);

  // Run checkSession on mount
  useEffect(() => {
    checkSession();
    
    // Also listen for storage events (e.g., if user logs out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SESSION_TOKEN_KEY || e.key === WALLET_ADDRESS_KEY) {
        console.log('[AuthContext] Session storage changed in another tab/window');
        checkSession();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkSession]);

  // Debug output - log state changes
  useEffect(() => {
    console.log('[AuthContext] Auth state updated:', {
      isAuthenticated: authState.isAuthenticated,
      hasWalletAddress: !!authState.walletAddress,
      hasToken: !!authState.sessionToken,
      isLoading: authState.isLoading,
      hasError: !!authState.error,
    });
  }, [authState]);

  // Context value
  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    loginWithWallet,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Custom hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};