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
import { authService } from '../services/AuthService'; // Ensure this service is correctly typed
import { MiniAppWalletAuthSuccessPayload, SiweMessage } from '@worldcoin/minikit-js'; // Assuming SiweMessage might be available or a similar type for the message structure

// --- Type Definitions ---
interface AuthState {
  isAuthenticated: boolean;
  walletAddress: string | null;
  sessionToken: string | null;
  isLoading: boolean;
  error: string | null;
  nonce: string | null;
}

// Define what the structure of the 'message' object within MiniAppWalletAuthSuccessPayload should look like
// This is based on typical SIWE EIP-4361 message structure.
// You should verify this against the actual type from @worldcoin/minikit-js if possible,
// or by inspecting a live authResult.message object.
interface SiweMessageObject {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string; // This is what we need
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

interface AuthContextType extends AuthState {
  login: (token: string, address: string, shouldNavigate?: boolean) => void;
  logout: () => Promise<void>;
  loginWithWallet: (authResult: MiniAppWalletAuthSuccessPayload) => Promise<void>;
  getNonceForMiniKit: () => Promise<string>;
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
    isLoading: true,
    error: null,
    nonce: null,
  });

  const login = useCallback((token: string, address: string, shouldNavigate: boolean = true) => {
    console.log('[AuthContext] Login called with:', { hasToken: !!token, address, shouldNavigate });
    storeSessionData(token, address);
    setAuthState({
      isAuthenticated: true,
      walletAddress: address,
      sessionToken: token,
      isLoading: false,
      error: null,
      nonce: null,
    });
    console.log('[AuthContext] Auth state updated, user is now authenticated');
    if (shouldNavigate) {
      setTimeout(() => {
        console.log('[AuthContext] Navigating to dashboard after login');
        navigate('/dashboard', { replace: true });
      }, 200);
    } else {
      console.log('[AuthContext] Navigation skipped as shouldNavigate is false');
    }
  }, [navigate]);

  const getNonceForMiniKit = useCallback(async (): Promise<string> => {
    console.log('[AuthContext] getNonceForMiniKit: Fetching nonce...');
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const nonceResult = await authService.getNonce();
      if (!nonceResult.success || !nonceResult.nonce) {
        const errorMessage = nonceResult.error || 'Failed to fetch nonce (nonce missing or success false)';
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

  const loginWithWallet = useCallback(async (authResult: MiniAppWalletAuthSuccessPayload) => {
    console.log('[AuthContext] loginWithWallet: Starting with payload:', authResult);
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Defensive check for authResult.message structure
      if (!authResult.message || typeof authResult.message !== 'object' || authResult.message === null) {
        console.error('[AuthContext] loginWithWallet: authResult.message is not a valid object.');
        throw new Error('Invalid authentication payload: message is not an object.');
      }

      // Cast to our expected SiweMessageObject type for type safety
      const signedMessageObject = authResult.message as unknown as SiweMessageObject;

      if (typeof signedMessageObject.nonce !== 'string' || !signedMessageObject.nonce) {
        console.error('[AuthContext] loginWithWallet: Nonce missing or invalid in signed message object (authResult.message.nonce).');
        throw new Error('Nonce missing or invalid in signed message from wallet.');
      }
      const signedNonce: string = signedMessageObject.nonce;
      console.log('[AuthContext] loginWithWallet: Nonce signed by wallet:', signedNonce);

      console.log('[AuthContext] loginWithWallet: Verifying signature with signedNonce:', signedNonce);
      const verifyResult = await authService.verifyWalletSignature(authResult, signedNonce);
      console.log('[AuthContext] loginWithWallet: Verification result:', verifyResult);

      if (verifyResult.success && verifyResult.walletAddress && verifyResult.token) {
        console.log('[AuthContext] loginWithWallet: Verification successful, calling login.');
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

  const logout = useCallback(async () => {
    console.log('[AuthContext] Logging out...');
    setAuthState(prevState => ({ ...prevState, isLoading: true }));
    try {
      clearStoredSessionData();
      try {
        await authService.logout();
      } catch (logoutError) {
        console.warn('[AuthContext] Backend logout failed, continuing local logout:', logoutError);
      }
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
      setAuthState(prevState => ({ ...prevState, isLoading: false, error: error.message || 'Logout failed' }));
    }
  }, [navigate]);

  const checkSession = useCallback(async () => {
    console.log('[AuthContext] Checking session...');
    setAuthState(prevState => ({ ...prevState, isLoading: true, error: null }));
    const { token, address } = getStoredSessionData();

    if (token && address) {
      console.log('[AuthContext] Session data found, validating with backend...');
      try {
        const verifyResult = await authService.verifyToken(token);
        if (verifyResult.isValid) {
          console.log('[AuthContext] Session token valid, restoring session.');
          const verifiedAddress = verifyResult.walletAddress || address;
          setAuthState({
            isAuthenticated: true,
            walletAddress: verifiedAddress,
            sessionToken: token,
            isLoading: false,
            error: null,
            nonce: null,
          });
          console.log('[AuthContext] Session restored successfully.');
          return;
        } else {
          console.log('[AuthContext] Session token invalid per backend, clearing session.', verifyResult.error);
          clearStoredSessionData();
        }
      } catch (verifyError) {
        console.error('[AuthContext] Error verifying session token with backend:', verifyError);
        clearStoredSessionData();
      }
    } else {
      console.log('[AuthContext] No session data found in localStorage.');
    }
    setAuthState(prevState => ({
      ...prevState,
      isAuthenticated: false,
      walletAddress: null,
      sessionToken: null,
      isLoading: false,
      nonce: null,
    }));
  }, []);

  useEffect(() => {
    checkSession();
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SESSION_TOKEN_KEY || e.key === WALLET_ADDRESS_KEY) {
        console.log('[AuthContext] Session storage changed, re-checking session.');
        checkSession();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkSession]);

  useEffect(() => {
    console.log('[AuthContext] Auth state updated (debug log):', {
      isAuthenticated: authState.isAuthenticated,
      walletAddress: authState.walletAddress ? 'Exists' : 'None',
      sessionToken: authState.sessionToken ? 'Exists' : 'None',
      isLoading: authState.isLoading,
      error: authState.error,
      nonce: authState.nonce,
    });
  }, [authState]);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    loginWithWallet,
    getNonceForMiniKit,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};