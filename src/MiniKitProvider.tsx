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

import type { ReactNode } from 'react';
import React, { useEffect, useState, useCallback } from 'react';
// Import MiniKit and necessary types
import { MiniKit, MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';
// Import the useAuth hook to access context methods
import { useAuth } from './components/AuthContext';

interface MiniKitProviderProps {
  children: ReactNode;
  appId?: string; // Allow passing App ID via prop as fallback
}

// Define a more general type for the finalPayload to handle success and error cases better for TS
// This is a presumed structure for non-success cases. Refer to MiniKit docs for actual error payload type.
interface MiniKitFinalPayload {
  status: 'success' | 'error' | 'cancelled' | string; // Add other potential statuses
  error_code?: string; // error_code might be optional or exist on non-success payloads
  // Include other properties that might be common or specific to error payloads
  [key: string]: any; // Allow other properties
}


// Export a function to manually trigger wallet auth from anywhere in the app
export const triggerMiniKitWalletAuth = async (
  serverNonce: string
): Promise<MiniAppWalletAuthSuccessPayload> => { // Still promise success payload, but handle errors internally
  console.log('[triggerMiniKitWalletAuth] Function called with nonce:', serverNonce);

  if (!serverNonce || typeof serverNonce !== 'string' || serverNonce.length < 8) {
    console.error('[triggerMiniKitWalletAuth] Invalid or missing serverNonce provided.');
    throw new Error('A valid server-issued nonce is required to trigger wallet auth.');
  }

  if (typeof MiniKit === 'undefined') {
    console.error('[triggerMiniKitWalletAuth] MiniKit is undefined');
    throw new Error('MiniKit is not available');
  }

  let isInstalled = false;
  try {
    isInstalled = MiniKit.isInstalled && MiniKit.isInstalled();
    console.log(`[triggerMiniKitWalletAuth] MiniKit.isInstalled() check returned: ${isInstalled}`);
  } catch (err) {
    console.error('[triggerMiniKitWalletAuth] Error checking if MiniKit is installed:', err);
  }

  if (!isInstalled) {
    try {
      const appId = import.meta.env.VITE_WORLD_APP_ID ||
                    import.meta.env.VITE_WORLD_ID_APP_ID ||
                    (window as any).__ENV__?.WORLD_APP_ID ||
                    'app_0de9312869c4818fc1a1ec64306551b69';

      console.log('[triggerMiniKitWalletAuth] Installing MiniKit with appId:', appId);
      await MiniKit.install(String(appId));
      console.log('[triggerMiniKitWalletAuth] MiniKit installed successfully');
    } catch (err) {
      console.error('[triggerMiniKitWalletAuth] Failed to install MiniKit:', err);
      throw new Error('Failed to initialize MiniKit: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  try {
    console.log('[triggerMiniKitWalletAuth] Starting wallet auth flow with provided server nonce...');

    if (!MiniKit.commandsAsync || !MiniKit.commandsAsync.walletAuth) {
      console.error('[triggerMiniKitWalletAuth] MiniKit commands not available');
      throw new Error('MiniKit wallet auth commands not available');
    }

    console.log('[triggerMiniKitWalletAuth] Calling MiniKit.commandsAsync.walletAuth with serverNonce:', serverNonce);
    const result = await MiniKit.commandsAsync.walletAuth({
      nonce: serverNonce,
      // statement: 'Sign in to WorldFund to create and support campaigns.',
      // expirationTime: new Date(Date.now() + 1000 * 60 * 10),
    });
    console.log('[triggerMiniKitWalletAuth] Wallet auth result:', result);

    if (!result || !result.finalPayload) {
      console.warn('[triggerMiniKitWalletAuth] MiniKit.commandsAsync.walletAuth did not return a finalPayload or result.');
      throw new Error('MiniKit wallet authentication did not complete successfully (no payload). User might have cancelled.');
    }

    // Use the more general MiniKitFinalPayload type for initial handling
    const finalPayload: MiniKitFinalPayload = result.finalPayload;

    if (finalPayload.status !== 'success') {
      // Access error_code more safely
      const errorCode = finalPayload.error_code;
      const status = finalPayload.status;
      console.error(`[triggerMiniKitWalletAuth] MiniKit auth returned non-success status: ${status}, error_code: ${errorCode}`);
      throw new Error(`MiniKit auth failed: ${errorCode || status || 'unknown MiniKit error'}`);
    }

    // If status is 'success', we can now be more confident it's MiniAppWalletAuthSuccessPayload
    return finalPayload as MiniAppWalletAuthSuccessPayload;
  } catch (error) {
    console.error('[triggerMiniKitWalletAuth] Error during wallet auth process:', error);
    throw error;
  }
};

export default function MiniKitProvider({
  children,
  appId
}: MiniKitProviderProps) {
  const [appIdToUse, setAppIdToUse] = useState<string | undefined>(appId);
  const [isMiniKitInitialized, setIsMiniKitInitialized] = useState(false);
  const [isAttemptingAuthViaWindow, setIsAttemptingAuthViaWindow] = useState(false);

  // Ensure getNonceForMiniKit is available from AuthContext
  const { loginWithWallet, getNonceForMiniKit } = useAuth();

  useEffect(() => {
    try {
      if (appId) {
        console.log('[MiniKitProvider] Using World App ID from props:', appId);
        setAppIdToUse(appId);
        return;
      }
      const envAppId = import.meta.env.VITE_WORLD_APP_ID ||
                       import.meta.env.VITE_WORLD_ID_APP_ID ||
                       import.meta.env.WORLD_APP_ID;
      const globalEnvAppId = (window as any).__ENV__?.WORLD_APP_ID;
      let determinedAppId = 'app_0de9312869c4818fc1a1ec64306551b69'; // Default

      if (globalEnvAppId) {
        console.log('[MiniKitProvider] Using World App ID from global window.__ENV__:', globalEnvAppId);
        determinedAppId = globalEnvAppId;
      } else if (envAppId) {
        console.log('[MiniKitProvider] Using World App ID from environment variables:', envAppId);
        determinedAppId = envAppId;
      } else {
        console.warn('[MiniKitProvider] No World App ID found, using default.');
      }
      setAppIdToUse(determinedAppId);
    } catch (error) {
      console.error('[MiniKitProvider] Error setting up MiniKit App ID:', error);
    }
  }, [appId]);

  useEffect(() => {
    if (!appIdToUse) {
      console.warn('[MiniKitProvider] Cannot initialize MiniKit: No App ID available yet.');
      return;
    }
    let isMounted = true;
    console.log('[MiniKitProvider] Attempting to initialize MiniKit with App ID:', appIdToUse);
    const initializeMiniKit = async () => {
      try {
        if (typeof MiniKit === 'undefined') {
          console.error('[MiniKitProvider] MiniKit is undefined. Cannot initialize.');
          return;
        }
        let isInstalled = false;
        try {
          isInstalled = MiniKit.isInstalled && MiniKit.isInstalled();
        } catch (err) { /* Error already logged if triggerMiniKitWalletAuth was called */ }

        if (!isInstalled) {
          console.log('[MiniKitProvider] Installing MiniKit (provider)...');
          await MiniKit.install(String(appIdToUse));
          console.log('[MiniKitProvider] MiniKit Install command finished (provider).');
        } else {
          console.log('[MiniKitProvider] MiniKit already installed (provider check).');
        }

        if (MiniKit.isInstalled && MiniKit.isInstalled()) {
          console.log('[MiniKitProvider] MiniKit is active and ready');
          if (isMounted) setIsMiniKitInitialized(true);
        } else {
          console.error('[MiniKitProvider] MiniKit installation check failed after attempt.');
        }
      } catch (error) {
        console.error('[MiniKitProvider] Failed to initialize/install MiniKit:', error);
      }
    };
    initializeMiniKit();
    return () => { isMounted = false; };
  }, [appIdToUse]);

  useEffect(() => {
    if (isMiniKitInitialized && typeof getNonceForMiniKit === 'function' && typeof loginWithWallet === 'function') {
      (window as any).__triggerWalletAuth = async (): Promise<boolean> => { // Ensure boolean return
        console.log('[window.__triggerWalletAuth] Direct wallet auth trigger called');
        if (isAttemptingAuthViaWindow) {
          console.warn('[window.__triggerWalletAuth] Auth already in progress, skipping');
          return false;
        }
        setIsAttemptingAuthViaWindow(true);
        try {
          console.log('[window.__triggerWalletAuth] Fetching nonce via AuthContext...');
          const serverNonce = await getNonceForMiniKit();
          console.log('[window.__triggerWalletAuth] Nonce received:', serverNonce);

          const authPayload = await triggerMiniKitWalletAuth(serverNonce);
          console.log('[window.__triggerWalletAuth] Auth payload received:', authPayload);

          // authPayload here is MiniAppWalletAuthSuccessPayload because triggerMiniKitWalletAuth throws on non-success
          // So, direct call to loginWithWallet is appropriate.
          // The 'status' check was already done inside triggerMiniKitWalletAuth.
          await loginWithWallet(authPayload); // authPayload is MiniAppWalletAuthSuccessPayload here
          console.log('[window.__triggerWalletAuth] loginWithWallet completed successfully');
          return true;

        } catch (error) { // This will catch errors from getNonceForMiniKit or triggerMiniKitWalletAuth or loginWithWallet
          console.error('[window.__triggerWalletAuth] Error during auth:', error);
          return false;
        } finally {
          setIsAttemptingAuthViaWindow(false);
        }
      };
      console.log('[MiniKitProvider] Exposed wallet auth function to window.__triggerWalletAuth');
    } else if (isMiniKitInitialized) {
        console.warn('[MiniKitProvider] MiniKit initialized, but getNonceForMiniKit or loginWithWallet not available from AuthContext for window.__triggerWalletAuth.');
    }
    return () => { // Cleanup
      if ((window as any).__triggerWalletAuth) {
        delete (window as any).__triggerWalletAuth;
        console.log('[MiniKitProvider] Removed window.__triggerWalletAuth');
      }
    };
  }, [isMiniKitInitialized, isAttemptingAuthViaWindow, getNonceForMiniKit, loginWithWallet]);

  return <>{children}</>;
}

declare global {
  interface Window {
    __triggerWalletAuth?: () => Promise<boolean>; // Returns boolean for success/failure
    __ENV__?: Record<string, string>;
  }
}