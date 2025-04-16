import React, { useState, useCallback, useEffect } from 'react';
import { IDKitWidget, VerificationLevel, ISuccessResult, IErrorState } from '@worldcoin/idkit';
import { authService } from '../services/AuthService';
import type { IVerifiedUser } from '../services/AuthService';
import type { UserData } from '../services/UserStore';

// Define possible verification states
type VerificationStatus = 'idle' | 'loading' | 'success' | 'error';

interface WorldIDAuthProps {
  onSuccess?: (verification: IVerifiedUser) => void;
  onError?: (error: unknown) => void;
  buttonText?: string;
  className?: string;
  // Added logout callback prop
  onLogout?: () => void;
}

const WorldIDAuth: React.FC<WorldIDAuthProps> = ({
  onSuccess,
  onError,
  onLogout,
  buttonText = "Verify with World ID",
  className = "",
}) => {
  // State Variables
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
  const [verifiedUser, setVerifiedUser] = useState<IVerifiedUser | null>(null);
  const [userData, setUserData] = useState<UserData | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState('');

  // Check for existing verification on component mount
  useEffect(() => {
    const checkExistingVerification = async () => {
      console.log("WorldIDAuth: Checking for existing verification on mount...");
      try {
        const savedVerification = await authService.getCurrentUser();
        console.log("WorldIDAuth: Existing verification check result:", savedVerification);

        if (savedVerification?.isVerified) {
          console.log("WorldIDAuth: Found existing valid verification. Setting internal state.");
          setVerifiedUser(savedVerification);
          setUserData(savedVerification.userData);
          setVerificationStatus('success');
        } else {
          console.log("WorldIDAuth: No existing valid verification found.");
        }
      } catch (error) {
        console.error("WorldIDAuth: Error checking existing verification:", error);
        setErrorMessage("Failed to check verification status.");
        setVerificationStatus('error');
      }
    };

    checkExistingVerification();
  }, []);

  // Handle successful verification from IDKitWidget
  const handleSuccess = useCallback(async (result: ISuccessResult) => {
    try {
      console.log("WorldIDAuth: IDKit verification success callback triggered, processing result:", result);
      setVerificationStatus('loading');
      setErrorMessage('');

      // IMPORTANT: This action MUST match the 'action' prop passed to IDKitWidget below
      // AND must match the action string defined in your Worldcoin Developer Portal
      const action = import.meta.env.VITE_WORLD_ID_ACTION;

      // Optional signal data - use undefined or empty string if not needed
      const signal = undefined;

      console.log(`WorldIDAuth: Calling authService.verifyWithWorldID with action: '${action}', signal: '${signal}'`);
      const verification = await authService.verifyWithWorldID(result, action, signal);

      if (verification.isVerified) {
        console.log("WorldIDAuth: Backend/Service verification successful:", verification);
        setVerifiedUser(verification);
        setUserData(verification.userData);
        setVerificationStatus('success');

        // Notify parent component of successful verification
        onSuccess?.(verification);
      } else {
        console.error("WorldIDAuth: authService.verifyWithWorldID indicated verification failed.", verification);
        throw new Error(verification.details?.toString() || "Verification failed after processing result.");
      }
    } catch (error) {
      console.error("WorldIDAuth: Error during verification processing:", error);
      const errorMessageText = error instanceof Error ? error.message : 'Verification processing failed';
      setErrorMessage(errorMessageText);
      setVerificationStatus('error');
      onError?.(error);
    }
  }, [onSuccess, onError]);

  // Handle errors from IDKitWidget
  const handleError = useCallback((error: IErrorState) => {
    console.error("WorldIDAuth: IDKit widget reported an error:", error);
    setErrorMessage(`IDKit Error: ${error.code || 'Verification failed'}`);
    setVerificationStatus('error');
    onError?.(error);
  }, [onError]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      console.log("WorldIDAuth: Handling logout.");
      await authService.logout();
      setVerifiedUser(null);
      setUserData(undefined);
      setVerificationStatus('idle');
      setErrorMessage('');
      
      // Notify parent component about logout
      onLogout?.();
      
      console.log("WorldIDAuth: Logout successful, state reset.");
    } catch (error) {
      console.error("WorldIDAuth: Error during logout:", error);
    }
  }, [onLogout]);

  // Handle retry after error
  const handleRetry = useCallback(() => {
    console.log("WorldIDAuth: Retrying verification.");
    setVerificationStatus('idle');
    setErrorMessage('');
  }, []);

  // Helper to format verification level
  const getVerificationLevelDisplay = (level?: string): string => {
    if (!level) return 'Unknown Level';
    switch (level.toLowerCase()) {
      case 'orb':
        return 'Orb Verified';
      case 'device':
        return 'Device Verified';
      default:
        return level;
    }
  };

  // Component is in loading state
  const isLoading = verificationStatus === 'loading';

  return (
    <div className={`worldid-auth ${className}`}>
      {/* Idle State: Show Verification Button */}
      {verificationStatus === 'idle' && (
        <IDKitWidget
          app_id={import.meta.env.VITE_WORLD_APP_ID}
          action={import.meta.env.VITE_WORLD_ID_ACTION}
          verification_level={VerificationLevel.Device}
          onSuccess={handleSuccess}
          onError={handleError}
        >
          {({ open }) => (
            <button
              onClick={() => {
                console.log("WorldIDAuth: Verify button clicked, opening IDKit modal.");
                open();
              }}
              className="worldid-button"
              disabled={isLoading}
              type="button"
            >
              {buttonText}
            </button>
          )}
        </IDKitWidget>
      )}

      {/* Loading State: Show Spinner */}
      {verificationStatus === 'loading' && (
        <div className="worldid-loading">
          <div className="loading-spinner"></div>
          <p>Verifying with World ID...</p>
        </div>
      )}

      {/* Success State: Show Verification Status */}
      {verificationStatus === 'success' && verifiedUser && (
        <div className="worldid-success">
          <div className="success-badge">
            <svg viewBox="0 0 24 24" fill="currentColor" className="verified-icon" aria-hidden="true">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
            <span>
              {getVerificationLevelDisplay(verifiedUser.details?.verificationLevel)}
            </span>
          </div>

          {userData && (
            <div className="user-info">
              <div className="user-id" title={userData.id}>ID: {userData.id.substring(0, 8)}...</div>
              {userData.displayName && <div className="display-name">{userData.displayName}</div>}
            </div>
          )}

          <button
            onClick={handleLogout}
            className="logout-button"
            type="button"
          >
            Log Out
          </button>
        </div>
      )}

      {/* Error State: Show Error Message */}
      {verificationStatus === 'error' && (
        <div className="worldid-error">
          <p>{errorMessage || 'Verification failed. Please try again.'}</p>
          <button
            onClick={handleRetry}
            className="retry-button"
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      {/* Component Styles */}
      <style>{`
        .worldid-auth {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          min-height: 50px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
          width: 100%;
          box-sizing: border-box;
        }

        .worldid-button {
          background-color: #1a73e8;
          color: white;
          padding: 0.6rem 1.2rem;
          border-radius: 0.375rem;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          border: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: background-color 0.2s ease-in-out;
          min-height: 38px;
          text-align: center;
          white-space: nowrap;
        }
        .worldid-button:hover {
          background-color: #185abc;
        }
        .worldid-button:disabled {
          background-color: #cccccc;
          color: #666666;
          cursor: not-allowed;
        }

        .worldid-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          color: #5f6368;
          padding: 1rem 0;
        }

        .loading-spinner {
          width: 1.75rem;
          height: 1.75rem;
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-top-color: #1a73e8;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .worldid-success {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          border: 1px solid #e0e0e0;
          border-radius: 0.375rem;
          background-color: #f8f9fa;
          width: auto;
          max-width: 90%;
        }

        .success-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background-color: rgba(52, 168, 83, 0.1);
          color: #1e8e3e;
          padding: 0.35rem 0.7rem;
          border-radius: 999px;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .verified-icon {
          width: 1.1em;
          height: 1.1em;
          fill: currentColor;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 0.8rem;
          color: #5f6368;
          margin-top: 0.25rem;
          text-align: center;
        }
        .user-id {
          font-family: monospace;
          font-size: 0.75rem;
          word-break: break-all;
          color: #3c4043;
        }
        .display-name {
          font-weight: 500;
          margin-top: 0.1rem;
          color: #202124;
        }

        .logout-button {
          background-color: transparent;
          color: #1a73e8;
          border: 1px solid #dadce0;
          padding: 0.3rem 0.8rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out;
        }
        .logout-button:hover {
          background-color: rgba(26, 115, 232, 0.05);
          border-color: #1a73e8;
        }

        .worldid-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          color: #d93025;
          font-size: 0.875rem;
          text-align: center;
          padding: 0.75rem 1rem;
          border: 1px solid #fbccc;
          background-color: #fef7f7;
          border-radius: 0.375rem;
          width: auto;
          max-width: 90%;
        }
        .worldid-error p {
            word-break: break-word;
            margin: 0 0 0.5rem 0;
        }

        .retry-button {
          background-color: #d93025;
          color: white;
          padding: 0.4rem 0.8rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s ease-in-out;
        }
        .retry-button:hover {
          background-color: #b0261c;
        }
      `}</style>
    </div>
  );
};

export default WorldIDAuth;
