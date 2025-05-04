// src/components/AuthContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect
} from 'react';
import { useNavigate } from 'react-router-dom'; // Ensure useNavigate is imported
import { authService } from '../services/AuthService';
import { MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';

// --- Type Definitions ---

interface AuthState {
  isAuthenticated: boolean;
  walletAddress: string | null;
  sessionToken: string | null;
  isLoading: boolean;
  error: string | null;
  nonce: string | null; // Keep nonce if needed elsewhere, otherwise can remove
}

interface AuthContextType extends AuthState {
  login: (token: string, address: string) => void;
  logout: () => Promise<void>;
  loginWithWallet: (authResult: MiniAppWalletAuthSuccessPayload) => Promise<void>;
}

// --- Context Creation ---

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Provider Component ---

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const navigate = useNavigate(); // Use navigate hook

  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    walletAddress: null,
    sessionToken: null,
    isLoading: true, // Start as loading
    error: null,
    nonce: null,
  });

  // Login function: Updates state and navigates to dashboard
  const login = useCallback((token: string, address: string) => {
    setAuthState({
      isAuthenticated: true,
      walletAddress: address,
      sessionToken: token,
      isLoading: false,
      error: null,
      nonce: null, // Clear nonce after successful login
    });
    console.log('[AuthContext] User logged in:', { walletAddress: address });

    // Navigate to dashboard after successful login
    // Check if already on dashboard? Optional, but can prevent redundant navigates
    // if (window.location.pathname !== '/dashboard') {
      navigate('/dashboard', { replace: true }); // Use replace to avoid back button going to login page
    // }
  }, [navigate]); // Add navigate to dependency array

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
      console.log('[AuthContext] Verification result:', verifyResult); // Log the result

      if (verifyResult.success && verifyResult.walletAddress && verifyResult.token) {
        // Use the login function which handles state update and navigation
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
  }, [login]); // login already includes navigate in its dependencies

  // Logout function
  const logout = useCallback(async () => {
    console.log('[AuthContext] Logging out...');
    setAuthState(prevState => ({ ...prevState, isLoading: true }));

    try {
      // Clear any local session info FIRST
      await authService.logout(); // Assuming this clears localStorage/sessionStorage

      // Reset state
      setAuthState({
        isAuthenticated: false,
        walletAddress: null,
        sessionToken: null,
        isLoading: false,
        error: null,
        nonce: null,
      });

      console.log('[AuthContext] User logged out successfully.');

      // Navigate to landing page after logout
      navigate('/landing', { replace: true }); // Use replace to avoid back button issues
    } catch (error: any) {
      console.error('[AuthContext] Logout failed:', error);
      setAuthState(prevState => ({
        ...prevState,
        isLoading: false,
        error: error.message || 'Logout failed'
      }));
    }
  }, [navigate]); // Add navigate to dependency array

  // Check session on mount
  const checkSession = useCallback(async () => {
    console.log('[AuthContext] Checking session...');
    // Keep isLoading true until check is complete
    // setAuthState(prevState => ({ ...prevState, isLoading: true, error: null })); // Already starts as true

    try {
      const { isAuthenticated, token } = await authService.checkAuthStatus();
      console.log('[AuthContext] checkAuthStatus result:', { isAuthenticated, hasToken: !!token });

      let sessionRestored = false;
      let restoredAddress: string | null = null;

      if (isAuthenticated && token) {
        // Decode JWT to get wallet address
        try {
          const tokenParts = token.split('.');
          const payload = tokenParts[1];

          if (tokenParts.length === 3 && payload) {
            const decodedPayload = JSON.parse(atob(payload));
            if (decodedPayload?.walletAddress) {
              restoredAddress = decodedPayload.walletAddress;
              setAuthState({
                isAuthenticated: true,
                walletAddress: restoredAddress,
                sessionToken: token,
                isLoading: false,
                error: null,
                nonce: null,
              });
              sessionRestored = true; // Mark session as successfully restored
              console.log('[AuthContext] Session restored for wallet:', restoredAddress);
            } else {
               console.warn('[AuthContext] Token decoded but walletAddress missing in payload.');
            }
          } else {
             console.warn('[AuthContext] Invalid token format found during session check.');
          }
        } catch (e) {
          console.error('[AuthContext] Failed to decode token during session check:', e);
          // Treat as unauthenticated if token is invalid
           await authService.logout(); // Clear potentially bad token
        }
      }

      // If session was not restored (or token was invalid), ensure state is unauthenticated
      if (!sessionRestored) {
         setAuthState({
           isAuthenticated: false,
           walletAddress: null,
           sessionToken: null,
           isLoading: false, // Finished loading check
           error: null,
           nonce: null,
         });
         console.log('[AuthContext] No valid session found or restored.');
      }
      // --- *** ADD NAVIGATION AFTER SESSION RESTORATION *** ---
      else {
        // Only navigate if we successfully restored the session
        console.log('[AuthContext] Session restored, navigating to dashboard...');
        // Check if already on dashboard? Optional.
        // if (window.location.pathname !== '/dashboard') {
           navigate('/dashboard', { replace: true });
        // }
      }
      // --- *** END NAVIGATION CHANGE *** ---

    } catch (error: any) {
      console.error('[AuthContext] Error checking session:', error);
      setAuthState({
        isAuthenticated: false,
        walletAddress: null,
        sessionToken: null,
        isLoading: false,
        error: 'Failed to check session',
        nonce: null,
      });
    }
  }, [navigate]); // Add navigate to dependency array

  // Run checkSession on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]); // checkSession dependency is correct

  // Context value
  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    loginWithWallet,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
