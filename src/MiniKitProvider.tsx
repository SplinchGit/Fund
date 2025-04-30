// src/MiniKitProvider.tsx

/// <reference types="vite/client" />

// Define Vite environment variables type
interface ImportMetaEnv {
  readonly VITE_WORLD_APP_ID?: string;
  readonly VITE_WORLD_ID_APP_ID?: string; // Add this variant
  readonly WORLD_APP_ID?: string; // Possible alternate name
  readonly WORLD_APP_CLIENT_SECRET?: string; // Likely not needed for MiniKit frontend
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import type { ReactNode } from 'react'
import React, { useEffect, useState } from 'react'
// Import MiniKit and necessary types
import { MiniKit, MiniAppWalletAuthPayload, WalletAuthInput } from '@worldcoin/minikit-js' 
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
  const [isMiniKitInitialized, setIsMiniKitInitialized] = useState(false); // Renamed for clarity
  const [isAttemptingAuth, setIsAttemptingAuth] = useState(false); // Local loading state for auth attempt

  // Get login function and auth state from context
  const { login, isAuthenticated, isLoading: isAuthLoading, error: authError } = useAuth(); 

  // --- Step 1: Determine the App ID ---
  useEffect(() => {
    // No changes needed in this effect
    try {
      if (appId) {
        console.log('[MiniKitProvider] Using World App ID from props:', appId);
        setAppIdToUse(appId);
        return;
      }
      const envAppId = import.meta.env.VITE_WORLD_APP_ID || 
                       import.meta.env.VITE_WORLD_ID_APP_ID ||
                       import.meta.env.WORLD_APP_ID || 
                       'app_0de9312869c4818fc1a1ec64306551b69'; // Hardcoded fallback - consider removing
      
      console.log('[MiniKitProvider] Environment App ID check:', envAppId);
      
      // @ts-ignore - Check for global fallback if used
      const globalEnvAppId = window.__ENV__?.WORLD_APP_ID;
      
      if (globalEnvAppId) {
        console.log('[MiniKitProvider] Using World App ID from global window.__ENV__:', globalEnvAppId);
        setAppIdToUse(globalEnvAppId);
      } else if (envAppId) {
        console.log('[MiniKitProvider] Using World App ID from environment variables:', envAppId);
        setAppIdToUse(envAppId);
      } else {
        console.warn('[MiniKitProvider] No World App ID found in environment variables or props');
      }
    } catch (error) {
      console.error('[MiniKitProvider] Error setting up MiniKit App ID:', error);
    }
  }, [appId]);

  // --- Step 2: Initialize MiniKit ---
  useEffect(() => {
    // No changes needed in this effect
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
        
        if (!isInstalled) {
          console.log('[MiniKitProvider] Installing MiniKit...');
          await MiniKit.install(appIdToUse);
          console.log('[MiniKitProvider] MiniKit Installed successfully');
        } else {
          console.log('[MiniKitProvider] MiniKit was already installed');
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
        console.error('[MiniKitProvider] Failed to initialize MiniKit:', error);
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
  useEffect(() => {
    if (isMiniKitInitialized && !isAuthenticated && !isAuthLoading && !isAttemptingAuth) {
      console.log('[MiniKitProvider] Conditions met, attempting Wallet Auth...');
      setIsAttemptingAuth(true); 

      const attemptWalletAuth = async () => {
        try {
          // 1. Get Nonce
          const nonce = await authService.getNonce();

          // 2. Trigger MiniKit Wallet Auth
          console.log('[MiniKitProvider] Triggering MiniKit.commandsAsync.walletAuth...');
          const walletAuthInput: WalletAuthInput = { // Explicitly type input
             nonce: nonce,
             // statement: 'Sign in to WorldFund Mini App', 
          };
          
          // *** FIX: Destructure finalPayload instead of payload ***
          const { finalPayload } = await MiniKit.commandsAsync.walletAuth(walletAuthInput);
          console.log('[MiniKitProvider] MiniKit walletAuth successful.');

          // *** FIX: Check finalPayload structure ***
          // Ensure it's the expected success payload type before proceeding
          // Note: MiniKit might return different structures on error/cancel
          if (!finalPayload || finalPayload.status !== 'success') {
             console.error('[MiniKitProvider] Invalid or non-success payload received from walletAuth:', finalPayload);
             // Handle potential error/cancel status from finalPayload if needed
             const errorMessage = finalPayload && 'error_code' in finalPayload 
                ? `Wallet Auth failed with code: ${finalPayload.error_code}` 
                : 'Invalid or non-success payload received from MiniKit walletAuth.';
             throw new Error(errorMessage);
          }
          
          // Type assertion might be needed if TS still struggles, but checking status is safer
          // const successPayload = finalPayload as MiniAppWalletAuthSuccessPayload; // Use if absolutely necessary

          // 3. Verify Signature with backend, passing the successful finalPayload
          // *** FIX: Pass finalPayload (which should match MiniAppWalletAuthSuccessPayload type expected by AuthService) ***
          const verifyResult = await authService.verifyWalletSignature(finalPayload, nonce); 
          
          // 4. Update Auth Context state
          if (verifyResult.success && verifyResult.token && verifyResult.walletAddress) {
            login(verifyResult.token, verifyResult.walletAddress); 
            console.log('[MiniKitProvider] AuthContext updated with login state.');
          } else {
            console.error('[MiniKitProvider] Backend signature verification failed:', verifyResult.error);
            throw new Error(verifyResult.error || 'Backend signature verification failed.');
          }

        } catch (error: any) {
          console.error('[MiniKitProvider] Wallet Auth flow failed:', error);
          // TODO: Update AuthContext with the error state 
          // Example: setAuthError(error.message || 'Authentication failed'); 
        } finally {
          setIsAttemptingAuth(false); 
          console.log('[MiniKitProvider] Wallet Auth attempt finished.');
        }
      };

      attemptWalletAuth(); 
    } else {
       // Debugging logs (no changes needed here)
       if (!isMiniKitInitialized) console.log('[MiniKitProvider] Skipping Wallet Auth: MiniKit not initialized.');
       if (isAuthenticated) console.log('[MiniKitProvider] Skipping Wallet Auth: Already authenticated.');
       if (isAuthLoading) console.log('[MiniKitProvider] Skipping Wallet Auth: AuthContext is loading.');
       if (isAttemptingAuth) console.log('[MiniKitProvider] Skipping Wallet Auth: Auth attempt already in progress.');
    }
    
  }, [isMiniKitInitialized, isAuthenticated, isAuthLoading, isAttemptingAuth, login]);

  return <>{children}</>; 
}
