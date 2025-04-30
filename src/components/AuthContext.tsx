// src/components/AuthContext.tsx
import React, { 
    createContext, 
    useState, 
    useContext, 
    ReactNode, 
    useCallback, 
    useEffect 
} from 'react';
// Assuming AuthService is correctly refactored and handles token storage
import { authService } from '../services/AuthService'; 

// --- Type Definitions ---

// Define the shape of the authentication state managed by the context
interface AuthState {
  isAuthenticated: boolean;
  walletAddress: string | null; // Store the user's wallet address after successful login
  sessionToken: string | null;  // Store the session token from *your* backend
  isLoading: boolean;           // To track initial session check and login attempts
  error: string | null;           // To store any authentication errors
}

// Define the shape of the value provided by the context (state + actions)
interface AuthContextType extends AuthState {
  // Function to call after successful backend signature verification
  // It updates the context state to reflect the logged-in user
  login: (token: string, address: string) => void; 
  // Function to handle logout
  logout: () => Promise<void>; 
  // Optional: Function to manually trigger a session check (used internally on mount)
  // checkSession: () => Promise<void>; 
}

// --- Context Creation ---

// Create the context with an 'undefined' default value
// This helps ensure components consuming the context are wrapped in the provider
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Provider Component ---

// Define props for the provider component (just needs children)
interface AuthProviderProps {
  children: ReactNode;
}

// Create the provider component responsible for managing the auth state
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Initialize the authentication state using useState
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    walletAddress: null,
    sessionToken: null,
    isLoading: true, // Start in loading state to perform initial session check
    error: null,
  });

  // --- Action Functions ---

  // Login function: Called by MiniKitProvider after successful backend verification
  // Updates the context state with the received token and wallet address
  const login = useCallback((token: string, address: string) => {
    // Note: AuthService handles storing the token in localStorage.
    // This function updates the React state to make the app reactive.
    setAuthState({
      isAuthenticated: true,
      walletAddress: address,
      sessionToken: token,
      isLoading: false,
      error: null,
    });
    console.log('[AuthContext] User logged in:', { walletAddress: address });
  }, []); // Empty dependency array: function identity is stable

  // Logout function: Calls AuthService to clear token and updates context state
  const logout = useCallback(async () => {
    console.log('[AuthContext] Logging out...');
    setAuthState(prevState => ({ ...prevState, isLoading: true })); // Set loading during logout
    try {
      await authService.logout(); // AuthService clears the token from storage
      // Reset the state to logged-out values
      setAuthState({
        isAuthenticated: false,
        walletAddress: null,
        sessionToken: null,
        isLoading: false,
        error: null,
      });
      console.log('[AuthContext] User logged out successfully.');
      // Optionally: Add navigation logic here if needed (e.g., redirect to landing)
    } catch (error: any) {
       console.error('[AuthContext] Logout failed:', error);
       // Update state to reflect the error, stop loading
       setAuthState(prevState => ({ 
         ...prevState, 
         isLoading: false, 
         error: error.message || 'Logout failed' 
       }));
    }
  }, []); // Empty dependency array: function identity is stable

  // Check session function: Called on provider mount to handle existing sessions (e.g., page refresh)
  const checkSession = useCallback(async () => {
     console.log('[AuthContext] Checking session...');
     setAuthState(prevState => ({ ...prevState, isLoading: true, error: null }));
     try {
       // Use AuthService to check if a token exists locally
       const { isAuthenticated } = await authService.checkAuthStatus(); 
       
       if (isAuthenticated) {
         // If a token exists, update state.
         // A more robust check would verify the token with the backend here
         // and fetch walletAddress if needed (e.g., by decoding JWT or calling /auth/status).
         const token = localStorage.getItem('sessionToken'); // Get token directly for state
         // TODO: Fetch walletAddress associated with this token if not stored/decoded
         setAuthState(prevState => ({ 
            ...prevState, 
            isAuthenticated: true, 
            sessionToken: token, 
            // walletAddress: fetchedOrDecodedAddress, // Placeholder
            isLoading: false 
         }));
         console.log('[AuthContext] Session check: User appears authenticated locally.');
       } else {
         // No local token found
         setAuthState(prevState => ({ ...prevState, isAuthenticated: false, isLoading: false }));
         console.log('[AuthContext] Session check: No local session found.');
       }
     } catch (error: any) {
       console.error('[AuthContext] Error checking session:', error);
       // Ensure logged-out state if check fails
       setAuthState({
         isAuthenticated: false,
         walletAddress: null,
         sessionToken: null,
         isLoading: false,
         error: 'Failed to check session',
       });
     }
  }, []); // Empty dependency array: function identity is stable

  // Run checkSession once when the AuthProvider mounts
  useEffect(() => {
    checkSession();
  }, [checkSession]); // Run only when checkSession function reference changes (which it won't here)

  // --- Context Value ---

  // Assemble the value to be provided by the context
  const value: AuthContextType = {
    ...authState, // Spread the current state values
    login,        // Provide the login function
    logout,       // Provide the logout function
    // checkSession, // Typically not needed externally, but can be exposed
  };

  // --- Provider Return ---

  // Wrap children with the Context Provider, passing down the state and actions
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- Custom Hook ---

// Create a custom hook for components to easily consume the context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  // Ensure the hook is used within a component wrapped by AuthProvider
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
