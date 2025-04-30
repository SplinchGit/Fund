// src/components/WorldIDAuth.tsx
import React, { useEffect, useState } from 'react';
import { IDKitWidget, ISuccessResult } from '@worldcoin/idkit';
import { authService } from '../services/AuthService';

export interface IVerifiedUser {
  success: boolean;
  details: ISuccessResult;
}

export interface WorldIDAuthProps {
  onSuccess?: (verification: IVerifiedUser) => void;
  onError?: (error: unknown) => void;
  buttonText?: string;
  className?: string;
  onLogout?: () => void;
}

const WorldIDAuth: React.FC<WorldIDAuthProps> = ({
  onSuccess,
  onError,
  buttonText = 'Verify with World ID',
  className,
  onLogout,
}) => {
  const [verification, setVerification] = useState<IVerifiedUser | null>(null);
  const [signal, setSignal] = useState<string>('');

  const appId = import.meta.env.VITE_WORLD_APP_ID;
  const actionName = import.meta.env.VITE_WORLD_ACTION_ID;

  useEffect(() => {
    if (!appId) {
      const err = new Error('Missing VITE_WORLD_APP_ID');
      console.error(err);
      onError?.(err);
    }
    if (!actionName) {
      const err = new Error('Missing VITE_WORLD_ACTION_ID');
      console.error(err);
      onError?.(err);
    }

    authService
      .checkAuthStatus()
      .then(({ isAuthenticated, username }) => {
        if (!isAuthenticated || !username) {
          const err = new Error('User must be logged in to verify World ID');
          console.error(err);
          onError?.(err);
        } else {
          setSignal(username);
        }
      })
      .catch((e) => {
        console.error('Error checking auth status:', e);
        onError?.(e);
      });
  }, [appId, actionName, onError]);

  const handleSuccess = async (result: ISuccessResult) => {
    try {
      const serverResult = await authService.verifyWorldId(result);
      if (!serverResult.success) {
        throw new Error('Server rejected World ID proof');
      }

      await authService.attachNullifier(result.nullifier_hash);

      const verifiedUser: IVerifiedUser = { success: true, details: result };
      setVerification(verifiedUser);
      onSuccess?.(verifiedUser);
    } catch (e) {
      console.error('World ID full verification failed:', e);
      onError?.(e);
    }
  };

  const handleError = (e: unknown) => {
    console.error('World ID widget error:', e);
    onError?.(e);
  };

  const handleLogoutClick = () => {
    setVerification(null);
    onLogout?.();
  };

  if (verification) {
    return (
      <div className={className}>
        <span>✅ World ID verified</span>
        {onLogout && (
          <button onClick={handleLogoutClick} style={{ marginLeft: 8 }}>
            Logout
          </button>
        )}
      </div>
    );
  }

  return (
    <IDKitWidget
      app_id={appId as `app_${string}`}
      action={actionName!}
      signal={signal}
      onSuccess={handleSuccess}
      onError={handleError}
    >
      {({ open }) => (
        <button
          type="button"
          onClick={() => {
            if (!signal) {
              const err = new Error(
                'Cannot open World ID widget without user signal'
              );
              console.error(err);
              onError?.(err);
              return;
            }
            open();
          }}
          className={className}
        >
          {buttonText}
        </button>
      )}
    </IDKitWidget>
  );
};

export default WorldIDAuth;
