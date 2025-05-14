// src/components/WorldIDAuth.tsx

// # ############################################################################ #
// # #                             SECTION 1 - IMPORTS                            #
// # ############################################################################ #
import React, { useEffect, useState, useCallback } from 'react';
import { IDKitWidget, ISuccessResult, VerificationLevel } from '@worldcoin/idkit';
// Removed authService import - parent component handles backend calls
// import { authService } from '../services/AuthService';
// Import useAuth to get wallet address and authentication status
import { useAuth } from './AuthContext';

// Removed local IVerifiedUser interface definition

// # ############################################################################ #
// # #                  SECTION 2 - INTERFACE: COMPONENT PROPS                  #
// # ############################################################################ #
// Define the props this component expects
export interface WorldIDAuthProps {
  // Callback function when IDKit returns a successful proof
  onSuccess: (result: ISuccessResult) => void;
  // Callback function for errors within this component or IDKit
  onError?: (error: unknown) => void;
  // Optional props for customization
  buttonText?: string;
  className?: string;
  // Optional props to pass to IDKitWidget
  action: string; // Action ID is now required via props
  app_id: `app_${string}`; // App ID is now required via props
  verification_level?: VerificationLevel; // Optional verification level
  // Removed onLogout prop
}

// # ############################################################################ #
// # #      SECTION 3 - COMPONENT: DEFINITION & PROPS DESTRUCTURING       #
// # ############################################################################ #
const WorldIDAuth: React.FC<WorldIDAuthProps> = ({
  onSuccess, // Renamed handleSuccess internally
  onError,
  buttonText = 'Verify with World ID',
  className,
  action, // Destructure required props
  app_id,
  verification_level = VerificationLevel.Device // Device set temporarily as default for MVP
}) => {
// # ############################################################################ #
// # #                  SECTION 4 - COMPONENT: STATE MANAGEMENT                 #
// # ############################################################################ #
  // Removed local verification state
  // const [verification, setVerification] = useState<IVerifiedUser | null>(null);

  // State to hold the signal (wallet address)
  const [signal, setSignal] = useState<string>('');
  // Get auth state from context
  const { isAuthenticated, walletAddress } = useAuth();

// # ############################################################################ #
// # #          SECTION 5 - EFFECT: PROPS VALIDATION & SIGNAL SETUP           #
// # ############################################################################ #
  // Validate required props and set signal based on auth state
  useEffect(() => {
    // Check required props passed from parent
    if (!app_id) {
      const err = new Error('WorldIDAuth component requires an app_id prop.');
      console.error(err);
      onError?.(err);
      return; // Stop if essential props are missing
    }
    if (!action) {
      const err = new Error('WorldIDAuth component requires an action prop.');
      console.error(err);
      onError?.(err);
      return; // Stop if essential props are missing
    }

    // Check if user is authenticated via context
    if (!isAuthenticated || !walletAddress) {
      const err = new Error('User must be authenticated (wallet connected) to verify World ID.');
      console.error('[WorldIDAuth]', err.message);
      // Don't immediately call onError here, let the button click handle it
      // onError?.(err);
      setSignal(''); // Ensure signal is empty if not authenticated
    } else {
      // Use the authenticated wallet address as the signal
      console.log('[WorldIDAuth] Setting signal to wallet address:', walletAddress);
      setSignal(walletAddress);
    }
    // Dependencies: Run when auth state changes or required props change
  }, [isAuthenticated, walletAddress, app_id, action, onError]);

// # ############################################################################ #
// # #               SECTION 6 - CALLBACK: IDKIT SUCCESS HANDLER                #
// # ############################################################################ #
  // Simplified handleSuccess: Directly call the onSuccess prop passed by the parent
  const handleIDKitSuccess = useCallback((result: ISuccessResult) => {
    console.log('[WorldIDAuth] IDKit verification successful, returning proof:', result);
    // Pass the raw proof result to the parent component
    onSuccess(result);
    // Parent component (e.g., VerifyAccount) is now responsible for:
    // 1. Calling authService.verifyWorldIdProof(result)
    // 2. Handling the backend response
    // 3. Updating global state if needed
  }, [onSuccess]); // Dependency: onSuccess prop

// # ############################################################################ #
// # #                SECTION 7 - CALLBACK: IDKIT ERROR HANDLER                 #
// # ############################################################################ #
  // Simplified handleError: Directly call the onError prop
  const handleIDKitError = useCallback((error: unknown) => {
    console.error('[WorldIDAuth] IDKit widget error:', error);
    onError?.(error); // Pass the error up to the parent
  }, [onError]); // Dependency: onError prop

  // Removed handleLogoutClick and the conditional rendering based on local state

// # ############################################################################ #
// # #      SECTION 8 - CONDITIONAL RENDERING: CONFIGURATION ERROR        #
// # ############################################################################ #
  // Check if essential props are missing before rendering IDKit
  if (!app_id || !action) {
      return <button disabled className={className}>World ID Widget Configuration Error</button>;
  }

// # ############################################################################ #
// # #       SECTION 9 - MAIN JSX RETURN: IDKIT WIDGET & TRIGGER BUTTON       #
// # ############################################################################ #
  // Render the IDKitWidget
  return (
    <IDKitWidget
      app_id={app_id}
      action={action}
      signal={signal} // Use walletAddress as signal
      onSuccess={handleIDKitSuccess} // Pass the simplified success handler
      onError={handleIDKitError}     // Pass the simplified error handler
      verification_level={verification_level} // Pass verification level
      // Other IDKit props like `theme`, `enableTelemetry` can be added here
    >
      {({ open }) => (
        <button
          type="button"
          onClick={() => {
            // Check for authentication / signal *before* opening the modal
            if (!isAuthenticated || !signal) {
              const err = new Error(
                'User must be authenticated with a wallet address to verify.'
              );
              console.error('[WorldIDAuth]', err.message);
              onError?.(err); // Notify parent of the error
              return; // Don't open if not ready
            }
            console.log('[WorldIDAuth] Opening IDKit modal...');
            open(); // Open the IDKit modal
          }}
          className={className}
          // Disable button if not authenticated or signal isn't ready
          disabled={!isAuthenticated || !signal}
        >
          {buttonText}
        </button>
      )}
    </IDKitWidget>
  );
};

// # ############################################################################ #
// # #                         SECTION 10 - DEFAULT EXPORT                        #
// # ############################################################################ #
export default WorldIDAuth;