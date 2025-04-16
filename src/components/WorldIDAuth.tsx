import React, { useState, useCallback, useEffect } from 'react';
import { IDKitWidget, VerificationLevel, ISuccessResult, IErrorState } from '@worldcoin/idkit';
// Assuming authService is correctly imported from your project structure, check.
import { authService } from '../services/AuthService';
// Assuming IVerifiedUser and UserData types are correctly imported. Check.
import type { IVerifiedUser } from '../services/AuthService';
import type { UserData } from '../services/UserStore';

// Define possible verification states using a union type for clarity. Well I mean here, it would be device and orb, yes and x or no.
type VerificationStatus = 'idle' | 'loading' | 'success' | 'error';

// Define the props accepted by the WorldIDAuth component - whole section sus
interface WorldIDAuthProps {
  // Callback function triggered upon successful verification and processing
  onSuccess?: (verification: IVerifiedUser) => void;
  // Callback function triggered upon any error during verification
  onError?: (error: unknown) => void;
  // Optional custom text for the World ID verification button
  buttonText?: string;
  // Optional CSS class name to apply custom styling to the button/component container
  className?: string;
}

/**
 * WorldIDAuth Component
 *
 * Handles World ID verification using the IDKitWidget.
 * It checks for existing verification status on mount and provides UI feedback
 * for idle, loading, success, and error states during the verification process.
 */
const WorldIDAuth: React.FC<WorldIDAuthProps> = ({
  onSuccess,
  onError,
  buttonText = "Verify World ID", // Default button text if not provided
  className = "", // Default empty class name if not provided
}) => {
  // --- State Variables ---
  // Tracks the current status of the verification process ('idle', 'loading', 'success', 'error')
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
  // Stores the verified user details object upon successful verification
  const [verifiedUser, setVerifiedUser] = useState<IVerifiedUser | null>(null);
  // Stores additional user data associated with the verification (if provided by authService)
  const [userData, setUserData] = useState<UserData | undefined>(undefined);
  // Stores error messages to display to the user in case of failure
  const [errorMessage, setErrorMessage] = useState('');

  // --- Effects ---
  // useEffect hook to check for existing verification when the component first mounts
  useEffect(() => {
    const checkExistingVerification = async () => {
      console.log("WorldIDAuth: Checking for existing verification on mount...");
      try {
        // Attempt to get the current user status from the authService
        const savedVerification = await authService.getCurrentUser();
        console.log("WorldIDAuth: Existing verification check result:", savedVerification);

        // If a valid, non-expired verification is found locally
        if (savedVerification?.isVerified) {
          console.log("WorldIDAuth: Found existing valid verification. Setting internal state.");
          // Update the component's internal state to reflect the existing verification
          setVerifiedUser(savedVerification);
          setUserData(savedVerification.userData);
          setVerificationStatus('success'); // Set status to success to show the success UI

          // IMPORTANT FIX: Do NOT call the parent's onSuccess here on mount.
          // This was likely causing issues if the parent component used onSuccess
          // to close a modal or navigate away immediately upon finding an existing session.
          // The parent's onSuccess should typically only be called after a *new*
          // verification initiated via the IDKitWidget button click.
          // onSuccess?.(savedVerification); // <-- This line is intentionally commented out.
          // SUS, need to know what this means. Debug

        } else {
          console.log("WorldIDAuth: No existing valid verification found.");
          // If no valid verification, the state remains 'idle', showing the button
        }
      } catch (error) {
        console.error("WorldIDAuth: Error checking existing verification:", error);
        setErrorMessage("Failed to check verification status.");
        setVerificationStatus('error');
      }
    };

    checkExistingVerification();
    // The dependency array is empty `[]` (or contains only stable functions like `authService` if it were passed as prop)
    // to ensure this effect runs only once when the component mounts.
    // Including `onSuccess` here could cause unnecessary re-runs if the parent component
    // doesn't memoize it (e.g., using useCallback). If `onSuccess` must be in the deps,
    // ensure it's memoized in the parent. For checking existing status, it's usually not needed.
  }, []); // Removed onSuccess from dependency array

  // --- Callbacks ---
  // useCallback hook to handle the successful verification result from the IDKitWidget
  const handleSuccess = useCallback(async (result: ISuccessResult) => {
    try {
      console.log("WorldIDAuth: IDKit verification success callback triggered, processing result:", result);
      setVerificationStatus('loading'); // Update UI to show loading state
      setErrorMessage(''); // Clear any previous error messages

      // --- FIX APPLIED ---
      // Define the action string. This MUST match the 'action' prop passed to IDKitWidget.
      // It's crucial for security (replay protection).
      const action = "login"; // <<<--- CONFIRM this matches your <IDKitWidget action="..."> prop below
      // DEBUG: LATEST action is verify-user, change needed here?

      // Define the signal. This is optional data from your system (e.g., user ID, session ID)
      // cryptographically linked to the proof. Pass `undefined` or `''` if not used.
      const signal = undefined; // <<<--- Use your actual signal value if needed, otherwise undefined or ''

      // Call the authentication service's verify method with the result, action, and signal.
      console.log(`WorldIDAuth: Calling authService.verifyWithWorldID with action: '${action}', signal: '${signal}'`);
      const verification = await authService.verifyWithWorldID(result, action, signal);
      // --- END FIX ---

      // Check if the verification was successful according to the authService logic
      if (verification.isVerified) {
        console.log("WorldIDAuth: Backend/Service verification successful:", verification);
        // Update component state with the verified user details
        setVerifiedUser(verification);
        setUserData(verification.userData);
        setVerificationStatus('success'); // Update UI to show success state

        // Call the parent component's onSuccess handler, passing the verification details.
        // This is the correct place to notify the parent about a *new* successful verification.
        onSuccess?.(verification);

      } else {
        // Handle cases where the auth service processed the result but indicated verification failed
        console.error("WorldIDAuth: authService.verifyWithWorldID indicated verification failed.", verification);
        // Throw an error to be caught by the catch block. Use detail from response if available.
        throw new Error(verification.details?.toString() || "Verification failed after processing result.");
      }
    } catch (error) {
      console.error("WorldIDAuth: Error during verification processing:", error);
      // Determine the error message to display
      const errorMessageText = error instanceof Error ? error.message : 'Verification processing failed';
      setErrorMessage(errorMessageText);
      setVerificationStatus('error'); // Update UI to show error state

      // Call the parent component's onError handler, passing the error object
      onError?.(error);
    }
  }, [onSuccess, onError]); // Dependencies: ensure callbacks from props are stable or included
  // DEBUG, review this, is this in the proper expected order of functions, should we establish wether the function has suceeded or not?

  // useCallback hook to handle errors reported directly by the IDKitWidget itself
  const handleError = useCallback((error: IErrorState) => {
    console.error("WorldIDAuth: IDKit widget reported an error:", error);
    // Set error state and message based on the IDKit error code or a generic message
    setErrorMessage(`IDKit Error: ${error.code || 'Verification failed'}`);
    setVerificationStatus('error'); // Update UI to show error state

    // Call the parent component's onError handler, passing the IDKit error object
    onError?.(error);
  }, [onError]); // Dependency: ensure onError from props is stable or included

  // useCallback hook to handle the user clicking the logout button
  const handleLogout = useCallback(async () => {
    try {
      console.log("WorldIDAuth: Handling logout.");
      await authService.logout(); // Call the service to clear verification data
      // Reset component state back to its initial 'idle' state
      setVerifiedUser(null);
      setUserData(undefined);
      setVerificationStatus('idle');
      setErrorMessage('');
      // Note: If the parent component needs to know about the logout,
      // you might need to add an `onLogout` prop callback here.
      // DEBUG: James agrees, this is a good idea. Add it.
      console.log("WorldIDAuth: Logout successful, state reset.");
    } catch (error) {
      console.error("WorldIDAuth: Error during logout:", error);
      // Optionally set an error message if logout fails, though often it's best to just log
      // setErrorMessage("Logout failed. Please try again.");
      // setVerificationStatus('error'); // Or revert to success state if logout fails? Decide UX.
    }
  }, []); // No external dependencies needed for logout logic. DEBUG: No, but parent component may need to know.

  // useCallback hook to handle the user clicking the retry button after an error
  const handleRetry = useCallback(() => {
    console.log("WorldIDAuth: Retrying verification.");
    // Reset status back to 'idle' to show the IDKitWidget button again
    setVerificationStatus('idle');
    setErrorMessage(''); // Clear the error message
  }, []); // No dependencies needed

  // --- Render Logic ---
  // Determine if the component is currently in a loading state for disabling buttons etc.
  const isLoading = verificationStatus === 'loading';

  // Helper function to format the verification level string for display
  const getVerificationLevelDisplay = (level?: string): string => {
    if (!level) return 'Unknown Level';
    // Convert to lowercase for case-insensitive comparison
    switch (level.toLowerCase()) {
      case 'orb':
        return 'Orb Verified';
      case 'device':
        return 'Device Verified';
      default:
        // Return the original level string if it's not recognized. DEBUG: else reurn function or ok?
        return level;
    }
  };

  // --- JSX ---
  return (
    // Main container div for the component
    // Apply the passed className for external styling, plus the base class
    <div className={`worldid-auth ${className}`}>

      {/* Conditional Rendering: State: Idle */}
      {/* Show the IDKitWidget button only when status is 'idle' */}
      {verificationStatus === 'idle' && (
        <IDKitWidget
          // IMPORTANT DEBUG: Updated, elsewhere in code, check.
          app_id="app_0da912869c4818fc1a1ec64306551b69" 
          // IMPORTANT DEBUG: Updated, elsewhere in code, check.
          action="verify-user"
          // Specify the minimum required verification level (Orb or Device)
          verification_level={VerificationLevel.Device}
          // Callback for successful proof generation by the widget
          onSuccess={handleSuccess}
          // Callback for errors originating from the widget itself
          onError={handleError}
          // DEBUG TO BE RENDERED IN: Handle backend verification within the widget flow (advanced)
          // handleVerify={(verification_level) => {
          //   console.log("WorldIDAuth: IDKit handleVerify triggered for level:", verification_level);
          //   // If your backend performs verification, you might initiate it here.
          //   // Must return a Promise. Often just resolves if verification happens in onSuccess.
          //   return Promise.resolve();
          // }}
        >
          {/* IMPORTANT: Render prop function to customize the trigger button */}
          {({ open }) => (
            <button
              onClick={() => {
                console.log("WorldIDAuth: Verify button clicked, opening IDKit modal.");
                open(); // Call the function provided by IDKitWidget to open the modal
              }}
              // Apply a default class name or use the one passed via props
              className="worldid-button" // Using specific class, ignore className prop here? Or combine?
              disabled={isLoading} // Disable button if already loading (shouldn't happen in 'idle' state)
              type="button" // Explicitly set type to prevent form submission issues
            >
              {buttonText} {/* Display the button text (default or from props) */}
            </button>
          )}
        </IDKitWidget>
      )}

      {/* Conditional Rendering: State: Loading */}
      {/* Show a loading indicator when status is 'loading' */}
      {verificationStatus === 'loading' && (
        <div className="worldid-loading">
          <div className="loading-spinner"></div>
          <p>Verifying with World ID...</p>
        </div>
      )}

      {/* Conditional Rendering: State: Success */}
      {/* Show verification details and logout button when status is 'success' and user data exists */}
      {verificationStatus === 'success' && verifiedUser && (
        <div className="worldid-success">
          {/* Display a success badge showing the verification level */}
          <div className="success-badge">
            <svg viewBox="0 0 24 24" fill="currentColor" className="verified-icon" aria-hidden="true">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
            <span>
              {/* Show the formatted verification level */}
              {getVerificationLevelDisplay(verifiedUser.details?.verificationLevel)}
            </span>
          </div>

          {/* Display additional user information if available from the verification */}
          {userData && (
            <div className="user-info">
              {/* Show a truncated user ID for identification */}
              <div className="user-id" title={userData.id}>ID: {userData.id.substring(0, 8)}...</div>
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

      {/* Conditional Rendering: State: Error */}
      {/* Show error message and a retry button when status is 'error' */}
      {verificationStatus === 'error' && (
        <div className="worldid-error">
          {/* Display the specific error message or a generic fallback */}
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

      {/* Inline styles for the component's elements */}
      {/* For larger applications, consider moving these styles to a separate CSS/SCSS file */}
      {/* or using a CSS-in-JS library or Tailwind CSS. */}
      <style>{`
        .worldid-auth {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem; /* Consistent spacing between elements */
          min-height: 50px; /* Ensure container has some base height */
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif; /* Common sans-serif stack */
          width: 100%; /* Allow component to fill container width */
          box-sizing: border-box; /* Include padding/border in element's total width/height */
        }

        /* Button used to trigger the IDKitWidget */
        .worldid-button {
          background-color: #1a73e8; /* Google Blue */
          color: white;
          padding: 0.6rem 1.2rem;
          border-radius: 0.375rem; /* 6px */
          font-weight: 500; /* Medium weight */
          font-size: 0.875rem; /* 14px */
          cursor: pointer;
          border: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: background-color 0.2s ease-in-out;
          min-height: 38px; /* Ensure consistent height */
          text-align: center;
          white-space: nowrap; /* Prevent text wrapping */
        }
        .worldid-button:hover {
          background-color: #185abc; /* Darker blue on hover */
        }
        .worldid-button:disabled {
          background-color: #cccccc;
          color: #666666;
          cursor: not-allowed;
        }

        /* Loading state container */
        .worldid-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          color: #5f6368; /* Google Grey */
          padding: 1rem 0; /* Add some vertical padding */
        }

        /* Simple CSS spinner animation */
        .loading-spinner {
          width: 1.75rem; /* 28px */
          height: 1.75rem;
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-top-color: #1a73e8; /* Blue spinner accent */
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Success state container */
        .worldid-success {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          border: 1px solid #e0e0e0; /* Light grey border */
          border-radius: 0.375rem; /* 6px */
          background-color: #f8f9fa; /* Very light grey background */
          width: auto; /* Adjust width based on content */
          max-width: 90%; /* Prevent becoming too wide */
        }

        /* Badge displaying verification level */
        .success-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background-color: rgba(52, 168, 83, 0.1); /* Light green background (Google Green) */
          color: #1e8e3e; /* Darker Green text */
          padding: 0.35rem 0.7rem;
          border-radius: 999px; /* Pill shape */
          font-size: 0.875rem; /* 14px */
          font-weight: 500;
        }
        .verified-icon {
          width: 1.1em;
          height: 1.1em;
          fill: currentColor; /* Use the text color */
        }

        /* Container for user-specific info */
        .user-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 0.8rem; /* Smaller font for details */
          color: #5f6368;
          margin-top: 0.25rem;
          text-align: center;
        }
        .user-id {
          font-family: monospace;
          font-size: 0.75rem;
          word-break: break-all; /* Allow long IDs to wrap if needed */
          color: #3c4043; /* Slightly darker grey */
        }
        .display-name {
          font-weight: 500;
          margin-top: 0.1rem;
          color: #202124; /* Dark grey */
        }

        /* Logout button style */
        .logout-button {
          background-color: transparent;
          color: #1a73e8; /* Blue text */
          border: 1px solid #dadce0; /* Google standard border color */
          padding: 0.3rem 0.8rem; /* Adjusted padding */
          border-radius: 0.25rem; /* 4px */
          font-size: 0.75rem; /* 12px */
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out;
        }
        .logout-button:hover {
          background-color: rgba(26, 115, 232, 0.05); /* Very light blue background */
          border-color: #1a73e8;
        }

        /* Error state container */
        .worldid-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          color: #d93025; /* Google Red */
          font-size: 0.875rem; /* 14px */
          text-align: center;
          padding: 0.75rem 1rem; /* More padding for errors */
          border: 1px solid #f B C C C; /* Light red border - Corrected typo */
          background-color: #fef7f7; /* Very light red background */
          border-radius: 0.375rem; /* 6px */
          width: auto; /* Adjust width based on content */
          max-width: 90%; /* Prevent becoming too wide */
        }
         /* Ensure error message text wraps */
        .worldid-error p {
            word-break: break-word;
            margin: 0 0 0.5rem 0; /* Add space below text */
        }

        /* Retry button style */
        .retry-button {
          background-color: #d93025; /* Red background */
          color: white;
          padding: 0.4rem 0.8rem; /* Slightly more padding */
          border-radius: 0.25rem; /* 4px */
          font-size: 0.75rem; /* 12px */
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s ease-in-out;
        }
        .retry-button:hover {
          background-color: #b0261c; /* Darker red on hover */
        }
      `}</style>
    </div>
  );
};

export default WorldIDAuth;
