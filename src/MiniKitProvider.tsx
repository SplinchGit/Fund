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
import { MiniKit, MiniAppWalletAuthSuccessPayload, WalletAuthInput } from '@worldcoin/minikit-js'
// Import the useAuth hook to access the login function and auth state
import { useAuth } from './components/AuthContext';
// Import the authService to call backend functions
import { authService } from './services/AuthService';

interface MiniKitProviderProps {
  children: ReactNode;
  appId?: string; // Allow passing App ID via prop as fallback
}

// Export a function to manually trigger wallet auth from anywhere in the app
export const triggerMiniKitWalletAuth = async (): Promise<any> => {
  console.log('[triggerMiniKitWalletAuth] Function called');
  
  // Check if MiniKit is available
  if (typeof MiniKit === 'undefined') {
    console.error('[triggerMiniKitWalletAuth] MiniKit is undefined');
    throw new Error('MiniKit is not available');
  }
  
  // Ensure MiniKit is installed
  let isInstalled = false;
  try {
    isInstalled = MiniKit.isInstalled && MiniKit.isInstalled();
    console.log(`[triggerMiniKitWalletAuth] MiniKit.isInstalled() check returned: ${isInstalled}`);
  } catch (err) {
    console.error('[triggerMiniKitWalletAuth] Error checking if MiniKit is installed:', err);
  }
  
  // If not installed, try to install it
  if (!isInstalled) {
    try {
      const appId = import.meta.env.VITE_WORLD_APP_ID || 
                    import.meta.env.VITE_WORLD_ID_APP_ID || 
                    window.__ENV__?.WORLD_APP_ID ||
                    'app_0de9312869c4818fc1a1ec64306551b69'; // Default App ID
      
      console.log('[triggerMiniKitWalletAuth] Installing MiniKit with appId:', appId);
      await MiniKit.install(String(appId));
      console.log('[triggerMiniKitWalletAuth] MiniKit installed successfully');
    } catch (err) {
      console.error('[triggerMiniKitWalletAuth] Failed to install MiniKit:', err);
      throw new Error('Failed to initialize MiniKit: ' + (err instanceof Error ? err.message : String(err)));
    }
  }
  
  // Get nonce from backend first
  try {
    console.log('[triggerMiniKitWalletAuth] Fetching nonce');
    const nonceResult = await authService.getNonce();
    if (!nonceResult.success || !nonceResult.nonce) {
      throw new Error(nonceResult.error || 'Failed to fetch nonce');
    }
    
    console.log('[triggerMiniKitWalletAuth] Nonce received:', nonceResult.nonce);
    
    // Ensure MiniKit commands are available
    if (!MiniKit.commandsAsync || !MiniKit.commandsAsync.walletAuth) {
      console.error('[triggerMiniKitWalletAuth] MiniKit commands not available');
      throw new Error('MiniKit wallet auth commands not available');
    }
    
    // Trigger the wallet auth
    console.log('[triggerMiniKitWalletAuth] Calling MiniKit.commandsAsync.walletAuth');
    const result = await MiniKit.commandsAsync.walletAuth({ nonce: nonceResult.nonce });
    console.log('[triggerMiniKitWalletAuth] Wallet auth result:', result);
    
    if (!result || !result.finalPayload) {
      throw new Error('Invalid response from MiniKit wallet auth');
    }
    
    // Process the auth result
    const { finalPayload } = result;
    
    // Handle error status
    if (finalPayload.status !== 'success') {
      throw new Error(`MiniKit auth failed: ${finalPayload.error_code || 'unknown error'}`);
    }
    
    // Verify with backend
    console.log('[triggerMiniKitWalletAuth] Verifying with backend');
    const verifyResult = await authService.verifyWalletSignature(finalPayload, nonceResult.nonce);
    
    if (!verifyResult.success) {
      throw new Error(verifyResult.error || 'Backend verification failed');
    }
    
    return verifyResult;
  } catch (error) {
    console.error('[triggerMiniKitWalletAuth] Error:', error);
    throw error;
  }
};

export default function MiniKitProvider({
  children,
  appId
}: MiniKitProviderProps) {
  const [appIdToUse, setAppIdToUse] = useState<string | undefined>(appId);
  const [isMiniKitInitialized, setIsMiniKitInitialized] = useState(false);
  const [isAttemptingAuth, setIsAttemptingAuth] = useState(false);
  
  // Get login function and auth state from context
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // --- Step 1: Determine the App ID ---
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

        let isInstalled = false;
        try {
          isInstalled = MiniKit.isInstalled && MiniKit.isInstalled();
          console.log(`[MiniKitProvider] MiniKit.isInstalled() check returned: ${isInstalled}`);
        } catch (err) {
          console.error('[MiniKitProvider] Error checking if MiniKit is installed:', err);
        }

        if (!isInstalled) {
          console.log('[MiniKitProvider] Installing MiniKit...');
          await MiniKit.install(String(appIdToUse));
          console.log('[MiniKitProvider] MiniKit Install command finished.');
        } else {
          console.log('[MiniKitProvider] MiniKit was already installed (according to isInstalled check)');
        }

        // Verify MiniKit is available after installation attempt
        let isAvailableNow = false;
        try {
          isAvailableNow = MiniKit.isInstalled && MiniKit.isInstalled();
        } catch (err) {
          console.error('[MiniKitProvider] Error checking if MiniKit is installed after installation:', err);
        }

        if (isAvailableNow) {
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

  // --- Step 3: Process successful authentication ---
  const processAuthResult = useCallback((result: any) => {
    if (result && result.success && result.token && result.walletAddress) {
      console.log('[MiniKitProvider] Auth result is valid, logging in user');
      
      // Call login function from AuthContext
      login(result.token, result.walletAddress);
      return true;
    } else {
      console.error('[MiniKitProvider] Auth result is invalid:', result);
      return false;
    }
  }, [login]);

  // --- Step 4: Expose authentication trigger to window object ---
  useEffect(() => {
    if (isMiniKitInitialized) {
      window.__triggerWalletAuth = async () => {
        console.log('[window.__triggerWalletAuth] Direct wallet auth trigger called');
        
        if (isAttemptingAuth) {
          console.log('[window.__triggerWalletAuth] Auth already in progress, skipping');
          return false;
        }
        
        setIsAttemptingAuth(true);
        
        try {
          // Call the exported function
          const authResult = await triggerMiniKitWalletAuth();
          console.log('[window.__triggerWalletAuth] Auth result:', authResult);
          
          // Process the result
          const success = processAuthResult(authResult);
          setIsAttemptingAuth(false);
          return success;
        } catch (error) {
          console.error('[window.__triggerWalletAuth] Error during auth:', error);
          setIsAttemptingAuth(false);
          return false;
        }
      };
      
      console.log('[MiniKitProvider] Exposed wallet auth function to window.__triggerWalletAuth');
    }
  }, [isMiniKitInitialized, isAttemptingAuth, processAuthResult]);

  return <>{children}</>;
}

// Add TypeScript declaration to avoid errors
declare global {
  interface Window {
    __triggerWalletAuth?: () => Promise<boolean>;
    __ENV__?: Record<string, string>;
  }
}