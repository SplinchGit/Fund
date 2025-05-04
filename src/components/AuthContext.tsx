// src/components/AuthContext.tsx
import React, { 
  createContext, 
  useState, 
  useContext, 
  ReactNode, 
  useCallback, 
  useEffect 
} from 'react';
import { useNavigate } from 'react-router-dom'; // Add navigation
import { authService } from '../services/AuthService'; 
import { MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';

// --- Type Definitions ---

interface AuthState {
  isAuthenticated: boolean;
  walletAddress: string | null;
  sessionToken: string | null;
  isLoading: boolean;
  error: string | null;
  nonce: string | null; // Add nonce to state
}

interface AuthContextType extends AuthState {
  login: (token: string, address: string) => void;
  logout: () => Promise<void>;
  loginWithWallet: (authResult: MiniAppWalletAuthSuccessPayload) => Promise<void>; // Add method for wallet login
}

// --- Context Creation ---

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Provider Component ---

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const navigate = useNavigate(); // Add navigate hook

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
    setAuthState({
      isAuthenticated: true,
      walletAddress: address,
      sessionToken: token,
      isLoading: false,
      error: null,
      nonce: null,
    });
    console.log('[AuthContext] User logged in:', { walletAddress: address });
    
    // Navigate to dashboard after successful login
    navigate('/dashboard');
  }, [navigate]);

  // Login with wallet function: Handles the complete wallet auth flow
  const loginWithWallet = useCallback(async (authResult: MiniAppWalletAuthSuccessPayload) => {
    console.log('[AuthContext] Starting wallet login flow...');
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Get nonce
      const nonceResult = await authService.getNonce();
      if (!nonceResult.success || !nonceResult.nonce) {
        throw new Error(nonceResult.error || 'Failed to fetch nonce');
      }

      // Verify signature
      const verifyResult = await authService.verifyWalletSignature(authResult, nonceResult.nonce);
      
      if (verifyResult.success && verifyResult.walletAddress && verifyResult.token) {
        // Use the login function which handles state update and navigation
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
      navigate('/landing');
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
    setAuthState(prevState => ({ ...prevState, isLoading: true, error: null }));
    
    try {
      const { isAuthenticated, token } = await authService.checkAuthStatus();
      
      if (isAuthenticated && token) {
        // Decode JWT to get wallet address or make an API call to get user info
        try {
          // Simple JWT decode with proper null checking
          const tokenParts = token.split('.');
          const payload = tokenParts[1];
          
          if (tokenParts.length === 3 && payload) {
            const decodedPayload = JSON.parse(atob(payload));
            if (decodedPayload?.walletAddress) {
              setAuthState({
                isAuthenticated: true,
                walletAddress: decodedPayload.walletAddress,
                sessionToken: token,
                isLoading: false,
                error: null,
                nonce: null,
              });
              console.log('[AuthContext] Session restored for wallet:', decodedPayload.walletAddress);
              return;
            }
          }
        } catch (e) {
          console.error('[AuthContext] Failed to decode token:', e);
        }
        
        // If we can't get wallet address from token, still consider authenticated
        setAuthState({
          isAuthenticated: true,
          walletAddress: null,
          sessionToken: token,
          isLoading: false,
          error: null,
          nonce: null,
        });
      } else {
        // No valid session
        setAuthState({
          isAuthenticated: false,
          walletAddress: null,
          sessionToken: null,
          isLoading: false,
          error: null,
          nonce: null,
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
  }, []);

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