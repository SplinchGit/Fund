// src/components/WorldIDAuth.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { IDKitWidget, VerificationLevel, ISuccessResult, IErrorState } from '@worldcoin/idkit';
import { authService } from '../services/AuthService';
import type { IVerifiedUser } from '../services/AuthService';
import type { UserData } from '../services/UserStore';

// Define verification status with a union type
type VerificationStatus = 'idle' | 'loading' | 'success' | 'error';

interface WorldIDAuthProps {
  onSuccess?: (verification: IVerifiedUser) => void;
  onError?: (error: unknown) => void;
  buttonText?: string;
  className?: string;
}

const WorldIDAuth: React.FC<WorldIDAuthProps> = ({
  onSuccess,
  onError,
  buttonText = "Verify with World ID",
  className = "",
}) => {
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
  const [verifiedUser, setVerifiedUser] = useState<IVerifiedUser | null>(null);
  const [userData, setUserData] = useState<UserData | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Check for existing verification on mount
  useEffect(() => {
    const checkExistingVerification = async () => {
      try {
        const savedVerification = await authService.getCurrentUser();
        if (savedVerification?.isVerified) {
          setVerifiedUser(savedVerification);
          setUserData(savedVerification.userData);
          setVerificationStatus('success');
          onSuccess?.(savedVerification);
        }
      } catch (error) {
        console.error("Error checking existing verification:", error);
      }
    };

    checkExistingVerification();
  }, [onSuccess]);

  const handleSuccess = useCallback(async (result: ISuccessResult) => {
    try {
      console.log("WorldID verification success, processing result:", result);
      setVerificationStatus('loading');
      
      // Process the verification result with our auth service
      const verification = await authService.verifyWithWorldID(result);
      
      if (verification.isVerified) {
        console.log("Verification successful:", verification);
        setVerifiedUser(verification);
        setUserData(verification.userData);
        setVerificationStatus('success');
        onSuccess?.(verification);
      } else {
        throw new Error("Verification failed");
      }
    } catch (error) {
      console.error("Error during WorldID verification:", error);
      setErrorMessage(error instanceof Error ? error.message : 'Verification failed');
      setVerificationStatus('error');
      onError?.(error);
    }
  }, [onSuccess, onError]);

  const handleError = useCallback((error: IErrorState) => {
    console.error("IDKit error:", error);
    setErrorMessage(error.toString() || 'Verification failed');
    setVerificationStatus('error');
    onError?.(error);
  }, [onError]);

  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
      setVerifiedUser(null);
      setUserData(undefined);
      setVerificationStatus('idle');
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setVerificationStatus('idle');
    setErrorMessage('');
  }, []);

  const isLoading = verificationStatus === 'loading';
  
  // Format verification level for display
  const getVerificationLevelDisplay = (level?: string) => {
    if (!level) return '';
    
    switch (level.toLowerCase()) {
      case 'orb':
        return 'Orb Verified';
      case 'device':
        return 'Device Verified';
      default:
        return level;
    }
  };

  return (
    <div className="worldid-auth">
      {verificationStatus === 'idle' && (
        <IDKitWidget
          app_id="app_46c9cdd743f94cc48093f843aca6b5a6"
          action="login"
          verification_level={VerificationLevel.Orb}
          onSuccess={handleSuccess}
          onError={handleError}
          handleVerify={(verification_level) => {
            // This function needs to return a Promise
            console.log("Handling verification for level:", verification_level);
            return Promise.resolve();
          }}
        >
          {({ open }) => (
            <button 
              onClick={() => {
                console.log("WorldID button clicked, opening IDKit");
                open();
              }}
              className={className || "worldid-button"}
              disabled={isLoading}
              type="button"
            >
              {buttonText}
            </button>
          )}
        </IDKitWidget>
      )}

      {verificationStatus === 'loading' && (
        <div className="worldid-loading">
          <div className="loading-spinner"></div>
          <p>Verifying with World ID...</p>
        </div>
      )}

      {verificationStatus === 'success' && verifiedUser && (
        <div className="worldid-success">
          <div className="success-badge">
            <svg viewBox="0 0 24 24" fill="currentColor" className="verified-icon" style={{ width: '1rem', height: '1rem' }}>
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
            <span>
              {getVerificationLevelDisplay(verifiedUser.details?.verificationLevel)}
            </span>
          </div>
          
          {userData && (
            <div className="user-info">
              <div className="user-id">ID: {userData.id.substring(0, 8)}...</div>
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

      <style>{`
        .worldid-auth {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        
        .worldid-button {
          background-color: #1a73e8;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          font-weight: 500;
          cursor: pointer;
          border: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .worldid-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        
        .loading-spinner {
          width: 1.5rem;
          height: 1.5rem;
          border: 2px solid rgba(0, 0, 0, 0.1);
          border-top-color: #1a73e8;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg) }
        }
        
        .worldid-success {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        
        .success-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background-color: rgba(52, 168, 83, 0.1);
          color: #34a853;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }
        
        .user-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 0.75rem;
          color: #5f6368;
          margin-top: 0.25rem;
        }
        
        .user-id {
          font-family: monospace;
          font-size: 0.7rem;
        }
        
        .display-name {
          font-weight: 500;
        }
        
        .verified-icon {
          width: 1rem;
          height: 1rem;
        }
        
        .logout-button {
          background-color: transparent;
          color: #1a73e8;
          border: 1px solid #1a73e8;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          cursor: pointer;
        }
        
        .worldid-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: #d93025;
          font-size: 0.875rem;
        }
        
        .retry-button {
          background-color: #d93025;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          border: none;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default WorldIDAuth;