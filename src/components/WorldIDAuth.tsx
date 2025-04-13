// src/components/WorldIDAuth.tsx
import React, { useState, useCallback, useEffect } from 'react';
// Import Worldcoin IDKit components and types
import { IDKitWidget, VerificationLevel, ISuccessResult, IErrorState } from '@worldcoin/idkit';
// Import authentication service and related types
import { authService } from '../services/AuthService';
import type { IVerifiedUser } from '../services/AuthService';
import type { UserData } from '../services/UserStore'; // Assuming UserStore provides UserData type

// Define possible verification states using a union type for clarity
type VerificationStatus = 'idle' | 'loading' | 'success' | 'error';

// Define the props accepted by the WorldIDAuth component
interface WorldIDAuthProps {
  onSuccess?: (verification: IVerifiedUser) => void; // Callback for successful verification
  onError?: (error: unknown) => void;             // Callback for verification errors
  buttonText?: string;                             // Optional custom text for the verification button
  className?: string;                              // Optional CSS class for custom styling of the button
}

/**
 * WorldIDAuth Component
 *
 * Handles World ID verification using the IDKitWidget.
 * It checks for existing verification on mount and provides UI states
 * for idle, loading, success, and error scenarios.
 */
const WorldIDAuth: React.FC<WorldIDAuthProps> = ({
  onSuccess,
  onError,
  buttonText = "Verify with World ID", // Default button text
  className = "",                     // Default empty class name
}) => {
  // --- State Variables ---
  // Tracks the current status of the verification process
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
  // Stores the verified user details upon success
  const [verifiedUser, setVerifiedUser] = useState<IVerifiedUser | null>(null);
  // Stores additional user data associated with the verification
  const [userData, setUserData] = useState<UserData | undefined>(undefined);
  // Stores error messages to display to the user
  const [errorMessage, setErrorMessage] = useState('');

  // --- Effects ---
  // Check for existing verification status when the component mounts
  useEffect(() => {
    const checkExistingVerification = async () => {
      console.log("WorldIDAuth: Checking for existing verification on mount..."); // Added log
      try {
        const savedVerification = await authService.getCurrentUser();
        console.log("WorldIDAuth: Existing verification check result:", savedVerification); // Added log

        // If a valid verification is found locally
        if (savedVerification?.isVerified) {
          console.log("WorldIDAuth: Found existing valid verification. Setting internal state."); // Added log
          // Update internal state to reflect the existing verification
          setVerifiedUser(savedVerification);
          setUserData(savedVerification.userData);
          setVerificationStatus('success');

          // *** FIX APPLIED ***
          // Commented out the line below. Calling the parent's onSuccess here
          // was causing the modal in the parent (LandingPage) to close immediately
          // upon mounting this component if a user was already verified.
          // This component should likely only call onSuccess after a *new*
          // verification initiated via the IDKitWidget.
          // onSuccess?.(savedVerification);
          // ******************

        } else {
            console.log("WorldIDAuth: No existing valid verification found."); // Added log
        }
      } catch (error) {
        console.error("WorldIDAuth: Error checking existing verification:", error);
        // Optionally set an error state here if needed
      }
    };

    checkExistingVerification();
    // Dependency array: runs on mount. Including onSuccess might cause re-runs
    // if the parent doesn't memoize it (e.g., with useCallback). Consider removing
    // onSuccess from deps if it's stable or memoized in parent.
  }, [onSuccess]);

  // --- Callbacks ---
  // Handles successful verification result from the IDKitWidget
  const handleSuccess = useCallback(async (result: ISuccessResult) => {
    try {
      console.log("WorldIDAuth: IDKit verification success, processing result:", result);
      setVerificationStatus('loading'); // Set status to loading while verifying with backend/service
      setErrorMessage(''); // Clear previous errors

      // Process the verification result using the authentication service
      const verification = await authService.verifyWithWorldID(result);

      if (verification.isVerified) {
        console.log("WorldIDAuth: Backend/Service verification successful:", verification);
        // Update state with the verified user details
        setVerifiedUser(verification);
        setUserData(verification.userData);
        setVerificationStatus('success');
        // Call the parent component's onSuccess handler - THIS is the correct place
        onSuccess?.(verification);
      } else {
        // Handle cases where the auth service indicates verification failed
        throw new Error("Verification failed after processing result.");
      }
    } catch (error) {
      console.error("WorldIDAuth: Error during verification processing:", error);
      // Set error state and message
      setErrorMessage(error instanceof Error ? error.message : 'Verification processing failed');
      setVerificationStatus('error');
      // Call the parent component's onError handler
      onError?.(error);
    }
  }, [onSuccess, onError]); // Dependencies for the callback

  // Handles errors reported directly by the IDKitWidget
  const handleError = useCallback((error: IErrorState) => {
    console.error("WorldIDAuth: IDKit error:", error);
    // Set error state and message based on IDKit error
    setErrorMessage(error.code || 'Verification failed'); // Use error code or generic message
    setVerificationStatus('error');
    // Call the parent component's onError handler
    onError?.(error);
  }, [onError]); // Dependency for the callback

  // Handles user logout action
  const handleLogout = useCallback(async () => {
    try {
      console.log("WorldIDAuth: Handling logout."); // Added log
      await authService.logout();
      // Reset component state to initial values
      setVerifiedUser(null);
      setUserData(undefined);
      setVerificationStatus('idle');
      setErrorMessage('');
      // Note: We might need to inform the parent about the logout via a prop if necessary
    } catch (error) {
      console.error("WorldIDAuth: Error during logout:", error);
      // Optionally set an error message if logout fails
    }
  }, []); // No dependencies needed

  // Handles retrying verification after an error
  const handleRetry = useCallback(() => {
    console.log("WorldIDAuth: Retrying verification."); // Added log
    // Reset status to allow IDKitWidget to show again
    setVerificationStatus('idle');
    setErrorMessage('');
  }, []); // No dependencies needed

  // --- Render Logic ---
  // Determine if the component is in a loading state
  const isLoading = verificationStatus === 'loading';

  // Helper function to format verification level for display
  const getVerificationLevelDisplay = (level?: string): string => {
    if (!level) return 'Unknown Level';

    switch (level.toLowerCase()) {
      case 'orb':
        return 'Orb Verified';
      case 'device':
        return 'Device Verified';
      default:
        return level; // Return the level string if not recognized
    }
  };

  // --- JSX ---
  return (
    // Main container for the component
    <div className="worldid-auth">
      {/* State: Idle - Show the IDKitWidget button */}
      {verificationStatus === 'idle' && (
        <IDKitWidget
          app_id="app_46c9cdd743f94cc48093f843aca6b5a6" // Replace with your actual App ID from Worldcoin Developer Portal
          action="login" // Specify the action (e.g., login, register)
          verification_level={VerificationLevel.Orb} // Set required verification level (Orb or Device)
          onSuccess={handleSuccess} // Callback for successful verification from IDKit
          onError={handleError}     // Callback for errors from IDKit
          handleVerify={(verification_level) => {
            // This function is called when IDKit needs to verify the proof with your backend.
            // It should return a Promise. In many basic cases, it might just resolve.
            // For backend verification (recommended), you'd call your backend here.
            console.log("WorldIDAuth: IDKit handleVerify triggered for level:", verification_level);
            // Example: Replace with actual backend verification call if needed
            return Promise.resolve();
          }}
        >
          {/* Render prop function to render the trigger button */}
          {({ open }) => (
            <button
              onClick={() => {
                console.log("WorldIDAuth: Verify button clicked, opening IDKit modal.");
                open(); // Function provided by IDKitWidget to open the modal
              }}
              className={className || "worldid-button"} // Apply custom or default class
              disabled={isLoading} // Disable button while loading
              type="button" // Ensure it's not treated as a form submit button
            >
              {buttonText} {/* Display custom or default button text */}
            </button>
          )}
        </IDKitWidget>
      )}

      {/* State: Loading - Show a loading indicator */}
      {verificationStatus === 'loading' && (
        <div className="worldid-loading">
          <div className="loading-spinner"></div>
          <p>Verifying with World ID...</p>
        </div>
      )}

      {/* State: Success - Show verification details and logout button */}
      {verificationStatus === 'success' && verifiedUser && (
        <div className="worldid-success">
          {/* Display a success badge with verification level */}
          <div className="success-badge">
            <svg viewBox="0 0 24 24" fill="currentColor" className="verified-icon">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
            <span>
              {/* Show formatted verification level */}
              {getVerificationLevelDisplay(verifiedUser.details?.verificationLevel)}
            </span>
          </div>

          {/* Display user information if available */}
          {userData && (
            <div className="user-info">
              {/* Show partial user ID */}
              <div className="user-id">ID: {userData.id.substring(0, 8)}...</div>
              {/* Show display name if present */}
              {userData.displayName && <div className="display-name">{userData.displayName}</div>}
            </div>
          )}

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="logout-button"
            type="button"
          >
            Log Out
          </button>
        </div>
      )}

      {/* State: Error - Show error message and retry button */}
      {verificationStatus === 'error' && (
        <div className="worldid-error">
          <p>{errorMessage || 'Verification failed. Please try again.'}</p>
          {/* Retry button */}
          <button
            onClick={handleRetry}
            className="retry-button"
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      {/* Inline styles for the component's different states */}
      {/* Consider moving these to a separate CSS file for larger applications */}
      <style>{`
        .worldid-auth {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem; /* Space between elements */
          min-height: 50px; /* Ensure container has some height */
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif; /* Match font */
        }

        .worldid-button {
          background-color: #1a73e8; /* Blue background */
          color: white;
          padding: 0.6rem 1.2rem; /* Slightly larger padding */
          border-radius: 0.375rem; /* Slightly more rounded */
          font-weight: 500;
          cursor: pointer;
          border: none;
          display: inline-flex; /* Use inline-flex for alignment */
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: background-color 0.2s; /* Add transition */
          min-height: 38px; /* Ensure minimum height */
        }
        .worldid-button:hover {
            background-color: #185abc; /* Darker blue on hover */
        }
        .worldid-button:disabled {
            background-color: #cccccc; /* Grey out when disabled */
            cursor: not-allowed;
        }

        .worldid-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem; /* Increased gap */
          color: #5f6368; /* Grey text */
        }

        .loading-spinner {
          width: 1.75rem; /* Slightly larger spinner */
          height: 1.75rem;
          border: 3px solid rgba(0, 0, 0, 0.1); /* Thicker border */
          border-top-color: #1a73e8; /* Blue top border */
          border-radius: 50%;
          animation: spin 0.8s linear infinite; /* Faster spin */
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .worldid-success {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem; /* Increased gap */
        }

        .success-badge {
          display: inline-flex; /* Use inline-flex */
          align-items: center;
          gap: 0.35rem; /* Slightly increased gap */
          background-color: rgba(52, 168, 83, 0.1); /* Light green background */
          color: #34a853; /* Green text */
          padding: 0.35rem 0.7rem; /* Adjusted padding */
          border-radius: 0.25rem;
          font-size: 0.875rem;
          font-weight: 500; /* Medium weight */
        }

        .verified-icon {
          width: 1.1em; /* Adjust icon size relative to font */
          height: 1.1em;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 0.8rem; /* Slightly larger font */
          color: #5f6368;
          margin-top: 0.25rem;
          text-align: center;
        }

        .user-id {
          font-family: monospace;
          font-size: 0.75rem; /* Slightly larger monospace font */
          word-break: break-all; /* Prevent long IDs from overflowing */
        }

        .display-name {
          font-weight: 500;
          margin-top: 0.1rem;
        }

        .logout-button {
          background-color: transparent;
          color: #1a73e8;
          border: 1px solid #e0e0e0; /* Lighter border */
          padding: 0.3rem 0.6rem; /* Adjusted padding */
          border-radius: 0.25rem;
          font-size: 0.75rem;
          cursor: pointer;
          transition: background-color 0.2s, border-color 0.2s; /* Add transition */
        }
        .logout-button:hover {
            background-color: rgba(26, 115, 232, 0.05); /* Light blue background on hover */
            border-color: #1a73e8; /* Blue border on hover */
        }

        .worldid-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem; /* Increased gap */
          color: #d93025; /* Red error color */
          font-size: 0.875rem;
          text-align: center;
          padding: 0.5rem;
          border: 1px solid #f B C C C; /* Light red border */
          background-color: #fef7f7; /* Very light red background */
          border-radius: 0.25rem;
          max-width: 90%; /* Prevent overly wide error box */
        }

        .retry-button {
          background-color: #d93025;
          color: white;
          padding: 0.3rem 0.6rem; /* Adjusted padding */
          border-radius: 0.25rem;
          font-size: 0.75rem;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s; /* Add transition */
        }
        .retry-button:hover {
            background-color: #b0261c; /* Darker red on hover */
        }
      `}</style>
    </div>
  );
};

export default WorldIDAuth;
