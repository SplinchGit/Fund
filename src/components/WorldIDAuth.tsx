// src/components/WorldIDAuth.tsx
import React, { useEffect, useState } from 'react';
import { IDKitWidget, ISuccessResult } from '@worldcoin/idkit';  // World ID widget and types

// Define the shape of the World ID verification result (proof details)
export interface IVerifiedUser {
  success: boolean;
  details: ISuccessResult;
}

// Define the props for the WorldIDAuth component
export interface WorldIDAuthProps {
  /** Callback when World ID verification succeeds */
  onSuccess?: (verification: IVerifiedUser) => void;
  /** Callback when World ID verification fails or is canceled */
  onError?: (error: unknown) => void;
  /** Custom text to display on the verify button */
  buttonText?: string;
  /** CSS class for styling the verify button (and container) */
  className?: string;
  /** Optional handler for "logout" (reset) action after successful verification */
  onLogout?: () => void;
}

// WorldIDAuth component: renders a World ID verification button or status
const WorldIDAuth: React.FC<WorldIDAuthProps> = ({
  onSuccess,
  onError,
  buttonText = 'Verify with World ID',
  className,
  onLogout
}) => {
  // State to track if a user has been verified via World ID
  const [verification, setVerification] = useState<IVerifiedUser | null>(null);

  const appId = import.meta.env.VITE_WORLD_APP_ID || import.meta.env.VITE_WORLD_ID_APP_ID;
  const actionName = import.meta.env.VITE_WORLD_ACTION_ID || import.meta.env.VITE_WORLD_ID_ACTION_NAME;
  
  // Validate required configuration
  useEffect(() => {
    if (!appId) {
      console.error('Missing World ID App ID environment variable (VITE_WORLD_APP_ID)');
    }
    if (!actionName) {
      console.error('Missing World ID Action ID environment variable (VITE_WORLD_ACTION_ID)');
    }
  }, [appId, actionName]);
  // Handle a successful verification result from World ID widget
  const handleSuccess = (result: ISuccessResult) => {
    const verifiedUser: IVerifiedUser = {
      success: true,
      details: result
    };
    setVerification(verifiedUser);             // update internal state to mark as verified
    if (onSuccess) {
      onSuccess(verifiedUser);                 // propagate result to parent if callback provided
    }
  };

  // Handle an error or closure from the World ID widget
  const handleError = (error: unknown) => {
    if (onError) {
      onError(error);                          // propagate error to parent if callback provided
    }
    // (Optional) You could also handle or log the error internally if needed.
  };

  // Handle logout (reset the verification state)
  const handleLogoutClick = () => {
    setVerification(null);                     // reset internal verification state
    if (onLogout) {
      onLogout();                              // notify parent component about the logout/reset
    }
  };

  // If the user has completed World ID verification, show a verified status and optional logout button
  if (verification) {
    return (
      <div className={className}>
        <span>✅ World ID verified</span>
        {onLogout && (
          <button type="button" onClick={handleLogoutClick} style={{ marginLeft: '0.5em' }}>
            Logout
          </button>
        )}
      </div>
    );
  }

  // Otherwise, render the IDKitWidget which provides the World ID verification modal
  return (
    <IDKitWidget
      app_id={appId}
      action={actionName}
      onSuccess={handleSuccess}
      onError={handleError}
    >
      {({ open }) => (
        // The child is a render-prop: we render a button that opens the World ID modal
        <button type="button" onClick={open} className={className}>
          {buttonText}
        </button>
      )}
    </IDKitWidget>
  );
};

export default WorldIDAuth;
