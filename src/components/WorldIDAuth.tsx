// src/components/WorldIDAuth.tsx

import React, { useState, useCallback, useEffect } from 'react';
// Keep VerificationLevel needed for displaying result from AuthService
import { IDKitWidget, VerificationLevel, ISuccessResult, IErrorState } from '@worldcoin/idkit';
import { authService } from '../services/AuthService';
import type { IVerifiedUser } from '../services/AuthService';
import type { UserData } from '../services/UserStore';

// Component Props Interface
interface WorldIDAuthProps {
  onSuccess?: (verification: IVerifiedUser) => void;
  onError?: (error: unknown) => void;
  buttonText?: string;
  className?: string;
  onLogout?: () => void;
}

// State Type Alias
type VerificationStatus = 'idle' | 'loading' | 'success' | 'error';

// REMOVED HELPER FUNCTION mapCredentialTypeToVerificationLevel

// The React Component
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


  // useEffect for env vars
   useEffect(() => {
       const appId = import.meta.env.VITE_WORLD_APP_ID;
       const actionId = import.meta.env.VITE_WORLD_ID_ACTION;
       if (!appId || !actionId) {
         console.error('WorldIDAuth: Missing required environment variables VITE_WORLD_APP_ID or VITE_WORLD_ID_ACTION.');
         setErrorMessage('Configuration error: Missing World ID App ID or Action ID.');
         setVerificationStatus('error');
       }
        if (appId && !appId.startsWith('app_')) {
           console.warn(`WorldIDAuth: VITE_WORLD_APP_ID (${appId}) may not follow the 'app_...' format.`);
        }
     }, []);

  // useEffect for checking existing verification
   useEffect(() => {
       const checkExistingVerification = async () => {
         if (verificationStatus !== 'error') {
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
                 setVerificationStatus('idle');
               }
             } catch (error) {
               console.error("WorldIDAuth: Error checking existing verification:", error);
               setErrorMessage("Failed to check verification status.");
               setVerificationStatus('error');
             }
         }
       };
       checkExistingVerification();
     // eslint-disable-next-line react-hooks/exhaustive-deps
     }, []);


  // ***** CORRECTED handleSuccess FUNCTION *****
  const handleSuccess = useCallback(async (result: ISuccessResult) => {
    try {
      console.log("WorldIDAuth: IDKit verification success callback triggered, processing result:", result);
      setVerificationStatus('loading');
      setErrorMessage('');

      const action = import.meta.env.VITE_WORLD_ID_ACTION;
      // Signal is not available in result based on errors, send undefined
      const signal = undefined;

      // Validate essential fields from result (merkle_root, nullifier_hash, proof)
      // DO NOT use credential_type or signal here as they don't exist on result
      if (!result.merkle_root || !result.nullifier_hash || !result.proof) {
           console.error("WorldIDAuth: Received incomplete verification result from IDKit:", result)
           throw new Error("Incomplete proof received from World ID. Missing required fields.");
      }
      if (!action) {
          throw new Error("Configuration Error: VITE_WORLD_ID_ACTION is missing.");
      }

      // REMOVED: Mapping credential_type to enum

      // ***** CREATE PAYLOAD OBJECT (Matches *new* AuthService Schema) *****
      const verificationPayload = {
          merkle_root: result.merkle_root,
          nullifier_hash: result.nullifier_hash,
          proof: result.proof,
          // REMOVED: verification_level field
          action: action,
          signal: signal, // Send undefined as signal isn't available
      };

      console.log(`WorldIDAuth: Calling authService.verifyWithWorldID with payload:`, verificationPayload);

      // Call AuthService with the single payload object
      const verification = await authService.verifyWithWorldID(verificationPayload); // PASSING 1 ARGUMENT HERE

      // Handle response from AuthService
      if (verification.isVerified) {
        console.log("WorldIDAuth: Backend/Service verification successful:", verification);
        setVerifiedUser(verification);
        setUserData(verification.userData);
        setVerificationStatus('success');
        onSuccess?.(verification);
      } else {
         const failureReason = verification.details?.detail || verification.details?.code || "Verification failed";
        console.error("WorldIDAuth: authService.verifyWithWorldID indicated verification failed.", failureReason, verification);
        setErrorMessage(`Verification Failed: ${failureReason}`);
        setVerificationStatus('error');
        onError?.(verification.details || new Error(String(failureReason)));
      }
    } catch (error) {
      console.error("WorldIDAuth: Error during verification processing:", error);
      const errorMessageText = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setErrorMessage(errorMessageText);
      setVerificationStatus('error');
      onError?.(error);
    }
  }, [onSuccess, onError]); // Dependencies

  // Handle errors directly from the IDKit Widget
  const handleError = useCallback((error: IErrorState) => {
    console.error("WorldIDAuth: IDKit widget reported an error:", error);
    const code = (error as any)?.code;
    setErrorMessage(`Verification process failed${code ? `: ${code}` : '. Please try again.'}`);
    setVerificationStatus('error');
    onError?.(error);
  }, [onError]);

  // Handle logout action
  const handleLogout = useCallback(async () => {
    try {
      console.log("WorldIDAuth: Handling logout.");
      await authService.logout();
      setVerifiedUser(null);
      setUserData(undefined);
      setVerificationStatus('idle');
      setErrorMessage('');
      onLogout?.();
      console.log("WorldIDAuth: Logout successful, state reset.");
    } catch (error) {
      console.error("WorldIDAuth: Error during logout:", error);
    }
  }, [onLogout]);

  // Handle retry action after an error
  const handleRetry = useCallback(() => {
    console.log("WorldIDAuth: Retrying verification.");
    setVerificationStatus('idle');
    setErrorMessage('');
  }, []);

  // Component state flags for rendering logic
  const isLoading = verificationStatus === 'loading';
  const isError = verificationStatus === 'error';
  const isSuccess = verificationStatus === 'success';
  const isIdle = verificationStatus === 'idle';
  const canAttemptVerification = !!import.meta.env.VITE_WORLD_APP_ID && !!import.meta.env.VITE_WORLD_ID_ACTION;


  // --- Component Return JSX ---
  return (
    <div className={`worldid-auth ${className}`}>
       {/* Idle State */}
       {isIdle && canAttemptVerification && (
         <IDKitWidget
           app_id={import.meta.env.VITE_WORLD_APP_ID as `app_${string}`}
           action={import.meta.env.VITE_WORLD_ID_ACTION}
           signal={undefined} // Pass undefined signal if not used/available
           verification_level={VerificationLevel.Device} // Request desired level
           onSuccess={handleSuccess}
           onError={handleError}
         >
           {({ open }) => ( <button onClick={open} className="worldid-button" type="button">{buttonText}</button> )}
         </IDKitWidget>
       )}
       {/* Loading State */}
       {isLoading && ( <div className="worldid-loading"><div className="loading-spinner"></div><p>Verifying...</p></div> )}
       {/* Success State - Reads verificationLevel from AuthService response */}
       {isSuccess && verifiedUser && (
         <div className="worldid-success">
           <div className="success-badge">
             <svg viewBox="0 0 24 24" fill="currentColor" className="verified-icon" aria-hidden="true"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>
             <span>{verifiedUser.details?.verificationLevel === VerificationLevel.Orb ? 'Orb Verified' : 'Device Verified'}</span>
           </div>
           {userData && ( <div className="user-info">{userData.displayName && <div className="display-name">{userData.displayName}</div>}<div className="user-id" title={`User ID: ${userData.id}`}>ID: {userData.id?.substring(0, 6)}...{userData.id?.substring(userData.id.length - 4)}</div></div> )}
           {onLogout && ( <button onClick={handleLogout} className="logout-button" type="button">Log Out</button> )}
         </div>
       )}
       {/* Error State */}
       {isError && (
         <div className="worldid-error">
           <p>{errorMessage || 'An unknown error occurred.'}</p>
           {errorMessage !== 'Configuration error: Missing World ID App ID or Action ID.' && (
             <button onClick={handleRetry} className="retry-button" type="button">Retry</button>
           )}
         </div>
       )}
      {/* Styles */}
      <style>{`
        /* Styles */
        .worldid-auth { display: flex; flex-direction: column; align-items: center; gap: 1rem; min-height: 50px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif; width: 100%; box-sizing: border-box; padding: 0.5rem; }
        .worldid-button { background-color: #1a73e8; color: white; padding: 0.6rem 1.2rem; border-radius: 0.375rem; font-weight: 500; font-size: 0.875rem; line-height: 1.25rem; cursor: pointer; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; transition: background-color 0.2s ease-in-out; min-height: 38px; text-align: center; white-space: nowrap; }
        .worldid-button:hover { background-color: #185abc; }
        .worldid-button:disabled { background-color: #cccccc; color: #666666; cursor: not-allowed; }
        .worldid-loading { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; color: #5f6368; padding: 1rem 0; }
        .loading-spinner { width: 1.75rem; height: 1.75rem; border: 3px solid rgba(0, 0, 0, 0.1); border-top-color: #1a73e8; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .worldid-success { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border: 1px solid #dadce0; border-radius: 0.5rem; background-color: #f8f9fa; width: auto; max-width: 90%; box-shadow: 0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15); }
        .success-badge { display: inline-flex; align-items: center; gap: 0.4rem; background-color: #e6f4ea; color: #188038; padding: 0.35rem 0.8rem; border-radius: 999px; font-size: 0.875rem; font-weight: 500; }
        .verified-icon { width: 1.2em; height: 1.2em; fill: currentColor; }
        .user-info { display: flex; flex-direction: column; align-items: center; font-size: 0.8rem; color: #5f6368; margin-top: 0.25rem; text-align: center; max-width: 100%; }
        .user-id { font-family: monospace; font-size: 0.8rem; word-break: break-all; color: #3c4043; margin-top: 0.2rem; }
        .display-name { font-weight: 500; font-size: 0.9rem; color: #202124; }
        .logout-button { background-color: transparent; color: #1a73e8; border: 1px solid #dadce0; padding: 0.4rem 0.9rem; border-radius: 0.25rem; font-size: 0.8rem; font-weight: 500; cursor: pointer; margin-top: 0.5rem; transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out; }
        .logout-button:hover { background-color: rgba(26, 115, 232, 0.05); border-color: #1a73e8; }
        .worldid-error { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; color: #d93025; font-size: 0.875rem; text-align: center; padding: 0.75rem 1rem; border: 1px solid #f28b82; background-color: #fce8e6; border-radius: 0.5rem; width: auto; max-width: 90%; }
        .worldid-error p { word-break: break-word; margin: 0 0 0.5rem 0; line-height: 1.3; }
        .retry-button { background-color: #1a73e8; color: white; padding: 0.5rem 1rem; border-radius: 0.25rem; font-size: 0.8rem; font-weight: 500; border: none; cursor: pointer; transition: background-color 0.2s ease-in-out; }
        .retry-button:hover { background-color: #185abc; }
      `}</style>
    </div>
  );
};

export default WorldIDAuth;