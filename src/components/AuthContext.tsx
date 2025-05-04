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
    isLoading: true,
    error: null,
    nonce: null,
  });

  // Login function: Updates state and navigates to dashboard
  const login = useCallback((token: string, address: string) => {
    console.log('[AuthContext] Login called with:', { token: !!token, address });
    console.log('[AuthContext] Current pathname:', window.location.pathname);
    
    // Update state and immediately set isAuthenticated to true
    setAuthState({
      isAuthenticated: true,
      walletAddress: address,
      sessionToken: token,
      isLoading: false,
      error: null,
      nonce: null,
    });
    
    console.log('[AuthContext] State updated, scheduling navigation...');
    
    // Force React to flush state updates before navigation
    Promise.resolve().then(() => {
      console.log('[AuthContext] Executing navigation to dashboard');
      navigate('/dashboard', { replace: true });
      console.log('[AuthContext] Navigation completed');
    });
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
      await authService.logout();
      
      setAuthState({
        isAuthenticated: false,
        walletAddress: null,
        sessionToken: null,
        isLoading: false,
        error: null,
        nonce: null,
      });

      console.log('[AuthContext] User logged out successfully.');
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

    try {
      const { isAuthenticated, token } = await authService.checkAuthStatus();
      console.log('[AuthContext] checkAuthStatus result:', { isAuthenticated, hasToken: !!token });

      let sessionRestored = false;
      let restoredAddress: string | null = null;

      if (isAuthenticated && token) {
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
              sessionRestored = true;
              console.log('[AuthContext] Session restored for wallet:', restoredAddress);
            }
          }
        } catch (e) {
          console.error('[AuthContext] Failed to decode token during session check:', e);
          await authService.logout();
        }
      }

      if (!sessionRestored) {
        setAuthState({
          isAuthenticated: false,
          walletAddress: null,
          sessionToken: null,
          isLoading: false,
          error: null,
          nonce: null,
        });
        console.log('[AuthContext] No valid session found or restored.');
      } else {
        console.log('[AuthContext] Session restored, navigating to dashboard...');
        // Use Promise.resolve() for consistency
        Promise.resolve().then(() => {
          navigate('/dashboard', { replace: true });
        });
      }

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
  }, [navigate]);

  // Run checkSession on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

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