// src/MiniKitProvider.tsx

/// <reference types="vite/client" />

// Define Vite environment variables type
interface ImportMetaEnv {
  readonly VITE_WORLD_APP_ID?: string;
  readonly VITE_WORLD_ID_APP_ID?: string; // Add this variant
  readonly WORLD_APP_ID?: string; // Possible alternate name
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import type { ReactNode } from 'react'
import React, { useEffect, useState, useCallback } from 'react'
// Import MiniKit and necessary types
// *** REMOVED MiniAppPayload from import as it's not exported ***
import { MiniKit, MiniAppWalletAuthSuccessPayload, WalletAuthInput } from '@worldcoin/minikit-js'
// Import the useAuth hook to access the login function and auth state
import { useAuth } from './components/AuthContext';
// Import the authService to call backend functions
import { authService } from './services/AuthService';

interface MiniKitProviderProps {
  children: ReactNode;
  appId?: string; // Allow passing App ID via prop as fallback
}

export default function MiniKitProvider({
  children,
  appId
}: MiniKitProviderProps) {
  const [appIdToUse, setAppIdToUse] = useState<string | undefined>(appId);
  const [isMiniKitInitialized, setIsMiniKitInitialized] = useState(false);
  const [isAttemptingAuth, setIsAttemptingAuth] = useState(false);
  const [authAttemptError, setAuthAttemptError] = useState(false);

  // Get login function and auth state from context
  const { login, isAuthenticated, isLoading: isAuthLoading, error: authError } = useAuth();

  // --- Step 1: Determine the App ID ---
  useEffect(() => {
    // (Logic seems sound)
    try {
      if (appId) {
        console.log('[MiniKitProvider] Using World App ID from props:', appId);
        setAppIdToUse(appId);
        return;
      }
      const envAppId = import.meta.env.VITE_WORLD_APP_ID ||
                       import.meta.env.VITE_WORLD_ID_APP_ID ||
                       import.meta.env.WORLD_APP_ID;

      // @ts-ignore
      const globalEnvAppId = window.__ENV__?.WORLD_APP_ID;

      let determinedAppId = 'app_0de9312869c4818fc1a1ec64306551b69'; // Default App ID

      if (globalEnvAppId) {
        console.log('[MiniKitProvider] Using World App ID from global window.__ENV__:', globalEnvAppId);
        determinedAppId = globalEnvAppId;
      } else if (envAppId) {
        console.log('[MiniKitProvider] Using World App ID from environment variables:', envAppId);
        determinedAppId = envAppId;
      } else {
         console.warn('[MiniKitProvider] No World App ID found in environment variables or props, using default.');
      }
       setAppIdToUse(determinedAppId);

    } catch (error) {
      console.error('[MiniKitProvider] Error setting up MiniKit App ID:', error);
    }
  }, [appId]);

  // --- Step 2: Initialize MiniKit ---
  useEffect(() => {
    // (Logic seems sound)
    if (!appIdToUse) {
      console.error('[MiniKitProvider] Cannot initialize MiniKit: No App ID available');
      return;
    }

    let isMounted = true;
    console.log('[MiniKitProvider] Attempting to initialize MiniKit with App ID:', appIdToUse);

    const initializeMiniKit = async () => {
      try {
        if (typeof MiniKit === 'undefined') {
          console.error('[MiniKitProvider] MiniKit is undefined.');
          return;
        }

        const isInstalled = MiniKit.isInstalled && MiniKit.isInstalled();
        console.log(`[MiniKitProvider] MiniKit.isInstalled() check returned: ${isInstalled}`);

        if (!isInstalled) {
          console.log('[MiniKitProvider] Installing MiniKit...');
          await MiniKit.install(String(appIdToUse));
          console.log('[MiniKitProvider] MiniKit Install command finished.');
        } else {
          console.log('[MiniKitProvider] MiniKit was already installed (according to isInstalled check)');
        }

        if (MiniKit.isInstalled && MiniKit.isInstalled()) {
          console.log('[MiniKitProvider] MiniKit is active and ready');
          if (isMounted) {
            setIsMiniKitInitialized(true);
          }
        } else {
          console.error('[MiniKitProvider] MiniKit installation check failed after attempt.');
        }
      } catch (error) {
        console.error('[MiniKitProvider] Failed to initialize/install MiniKit:', error);
        if (error instanceof Error) {
          console.error('[MiniKitProvider] Error details:', { name: error.name, message: error.message });
        }
      }
    };

    initializeMiniKit();

    return () => {
      isMounted = false;
    };
  }, [appIdToUse]);

  // --- Step 3: Trigger Wallet Auth Automatically ---
  const attemptWalletAuth = useCallback(async () => {
    if (isAttemptingAuth) {
        console.log('[MiniKitProvider] Skipping Wallet Auth: Auth attempt already in progress.');
        return;
    }

    console.log('[MiniKitProvider] Conditions met, attempting Wallet Auth...');
    setIsAttemptingAuth(true);
    setAuthAttemptError(false);

    let currentNonce: string | null = null;

    try {
      // 1. Get Nonce
      console.log('[MiniKitProvider] Fetching nonce via authService...');
      const nonceResult = await authService.getNonce();
      if (!nonceResult.success || !nonceResult.nonce) {
        throw new Error(nonceResult.error || 'Failed to fetch nonce from backend');
      }
      currentNonce = nonceResult.nonce;
      console.log('[MiniKitProvider] Nonce received:', currentNonce);

      // 2. Trigger MiniKit Wallet Auth
      console.log('[MiniKitProvider] Triggering MiniKit.commandsAsync.walletAuth with nonce:', currentNonce);
      const walletAuthInput: WalletAuthInput = { nonce: currentNonce };
      // *** Use 'any' for the result type initially, then check status ***
      const { finalPayload }: { finalPayload: any } = await MiniKit.commandsAsync.walletAuth(walletAuthInput);

      console.log('[MiniKitProvider] Received finalPayload:', JSON.stringify(finalPayload, null, 2));

      // Check finalPayload structure and status before proceeding
      if (!finalPayload || typeof finalPayload !== 'object' || finalPayload.status !== 'success') {
         // Attempt to access error_code safely
         const errorCode = finalPayload && typeof finalPayload === 'object' && 'error_code' in finalPayload
                           ? finalPayload.error_code
                           : 'unknown';
         const errorMessage = `MiniKit Wallet Auth failed with status: ${finalPayload?.status ?? 'undefined'}, code: ${errorCode}`;
         console.error(`[MiniKitProvider] ${errorMessage}`, finalPayload);
         throw new Error(errorMessage);
      }

      // Now we know status is 'success', cast to the success payload type
      const successPayload = finalPayload as MiniAppWalletAuthSuccessPayload;
      console.log('[MiniKitProvider] MiniKit walletAuth successful.');

      // 3. Verify Signature with backend
      console.log('[MiniKitProvider] Calling authService.verifyWalletSignature with payload and nonce:', currentNonce);
      // Ensure authService sends the correct fields (message, signature) from successPayload
      const verifyResult = await authService.verifyWalletSignature(successPayload, currentNonce);
      console.log('[MiniKitProvider] Backend verification result:', verifyResult);

      // 4. Update Auth Context state ONLY on successful verification
      if (verifyResult.success && verifyResult.token && verifyResult.walletAddress) {
        console.log('[MiniKitProvider] Backend verification successful. Calling login function...');
        login(verifyResult.token, verifyResult.walletAddress);
        console.log('[MiniKitProvider] AuthContext updated with login state.');
      } else {
        console.error('[MiniKitProvider] Backend signature verification failed:', verifyResult.error);
        setAuthAttemptError(true);
        throw new Error(verifyResult.error || 'Backend signature verification failed.');
      }

    } catch (error: any) {
      console.error('[MiniKitProvider] Wallet Auth flow failed:', error);
      setAuthAttemptError(true);
    } finally {
      setIsAttemptingAuth(false);
      console.log('[MiniKitProvider] Wallet Auth attempt finished.');
    }
  // *** Removed authService from dependency array as it's likely stable ***
  // *** If authService itself changes based on props/state, add it back ***
  }, [isAttemptingAuth, login]);

  // Effect to trigger the automatic auth attempt
  useEffect(() => {
    const shouldAttemptAuth = isMiniKitInitialized && !isAuthenticated && !isAuthLoading && !isAttemptingAuth && !authAttemptError;

    if (shouldAttemptAuth) {
      attemptWalletAuth();
    } else {
      // Log why it's skipping
      if (!isMiniKitInitialized) console.log('[MiniKitProvider] Skipping Wallet Auth: MiniKit not initialized.');
      if (isAuthenticated) console.log('[MiniKitProvider] Skipping Wallet Auth: Already authenticated.');
      if (isAuthLoading) console.log('[MiniKitProvider] Skipping Wallet Auth: AuthContext is loading.');
      if (isAttemptingAuth) console.log('[MiniKitProvider] Skipping Wallet Auth: Auth attempt already in progress.');
      if (authAttemptError) console.log('[MiniKitProvider] Skipping Wallet Auth: Previous attempt failed.');
    }

  }, [isMiniKitInitialized, isAuthenticated, isAuthLoading, isAttemptingAuth, authAttemptError, attemptWalletAuth]);

  return <>{children}</>;
}
