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
  message?: any; // Allow any type for internal processing, we'll stringify before returning
  signature?: string;
  address?: string; // Add address property
  version?: string; // Add version property
  // Include other properties that might be common or specific to error payloads
  [key: string]: any; // Allow other properties
}

/**
 * Safely extract a string from various types
 */
function ensureString(value: any): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return '';
}

/**
 * Sanitize wallet payload for security
 */
function sanitizeWalletPayload(payload: any): MiniKitFinalPayload {
  if (!payload) return { status: 'error', error_code: 'empty_payload' };
  
  const sanitized: MiniKitFinalPayload = {
    status: typeof payload.status === 'string' ? payload.status : 'error'
  };

  // Preserve the original message format for internal processing
  if (payload.message !== undefined) {
    sanitized.message = payload.message;
  }
  
  // Add all properties needed for MiniAppWalletAuthSuccessPayload
  if (typeof payload.signature === 'string') {
    sanitized.signature = payload.signature;
  }
  
  if (typeof payload.address === 'string') {
    sanitized.address = payload.address;
  }
  
  if (typeof payload.version === 'string') {
    sanitized.version = payload.version;
  }
  
  if (typeof payload.error_code === 'string') {
    sanitized.error_code = payload.error_code;
  }
  
  return sanitized;
}

/**
 * Extract nonce from wallet message in different formats
 */
function extractNonceFromMessage(message: any): string {
  if (!message) return '';

  // Direct string case
  if (typeof message === 'string') {
    // Try parsing as JSON first
    try {
      const parsed = JSON.parse(message);
      if (parsed && typeof parsed === 'object' && parsed.nonce && typeof parsed.nonce === 'string') {
        return parsed.nonce;
      }
    } catch (e) {
      // Not JSON, use as is if it looks like a nonce (simple validation)
      if (/^[a-f0-9]{8,64}$/i.test(message)) {
        return message;
      }
    }
  } 
  // Object case
  else if (typeof message === 'object' && message !== null) {
    // Standard nonce property
    if (message.nonce && typeof message.nonce === 'string') {
      return message.nonce;
    }
    
    // SIWE format
    if (message.domain && message.nonce && typeof message.nonce === 'string') {
      return message.nonce;
    }
  }
  
  console.warn('[extractNonceFromMessage] Could not extract nonce from message:', 
    typeof message === 'object' ? JSON.stringify(message).substring(0, 100) : message);
  return '';
}

/**
 * Extract wallet address from message or payload in different formats
 */
function extractAddress(payload: any): string {
  if (!payload) return '';
  
  // Direct address property
  if (payload.address && typeof payload.address === 'string') {
    return payload.address;
  }
  
  // Try to extract from message object
  if (payload.message && typeof payload.message === 'object') {
    // EIP-4361 (SIWE) format may include address
    if (payload.message.address && typeof payload.message.address === 'string') {
      return payload.message.address;
    }
    
    // Other possible formats
    if (payload.message.wallet && typeof payload.message.wallet === 'string') {
      return payload.message.wallet;
    }
  }
  
  // Try to parse message if it's a string
  if (payload.message && typeof payload.message === 'string') {
    try {
      const parsed = JSON.parse(payload.message);
      if (parsed && typeof parsed === 'object') {
        if (parsed.address && typeof parsed.address === 'string') {
          return parsed.address;
        }
        if (parsed.wallet && typeof parsed.wallet === 'string') {
          return parsed.wallet;
        }
      }
    } catch (e) {
      // Not valid JSON, continue with other methods
    }
  }
  
  // If all else fails, try to extract an Ethereum address pattern from message
  if (payload.message && typeof payload.message === 'string') {
    const ethAddressMatch = payload.message.match(/0x[a-fA-F0-9]{40}/);
    if (ethAddressMatch) {
      return ethAddressMatch[0];
    }
  }
  
  return '';
}

// Export a function to manually trigger wallet auth from anywhere in the app
export const triggerMiniKitWalletAuth = async (
  serverNonce: string
): Promise<MiniAppWalletAuthSuccessPayload> => { // Still promise success payload, but handle errors internally
  console.log('[triggerMiniKitWalletAuth] Function called with nonce:', serverNonce);

  if (!serverNonce || typeof serverNonce !== 'string') {
    console.error('[triggerMiniKitWalletAuth] Invalid nonce format:', serverNonce);
    throw new Error('A valid server-issued nonce is required to trigger wallet auth.');
  }
  
  if (serverNonce.length < 8) {
    console.warn('[triggerMiniKitWalletAuth] Nonce seems suspiciously short:', serverNonce);
  }
  
  if (typeof MiniKit === 'undefined') {
    console.error('[triggerMiniKitWalletAuth] MiniKit is undefined (not loaded)');
    throw new Error('MiniKit script is not available. Please ensure it is properly loaded.');
  }

  let isInstalled = false;
  try {
    console.log('[triggerMiniKitWalletAuth] Checking if MiniKit is installed...');
    console.log('[triggerMiniKitWalletAuth] MiniKit object keys:', Object.keys(MiniKit));
    
    if (typeof MiniKit.isInstalled !== 'function') {
      console.error('[triggerMiniKitWalletAuth] MiniKit.isInstalled is not a function');
      throw new Error('MiniKit API is incomplete or corrupted');
    }
    
    isInstalled = MiniKit.isInstalled();
    console.log(`[triggerMiniKitWalletAuth] MiniKit.isInstalled() check returned: ${isInstalled}`);
  } catch (err) {
    console.error('[triggerMiniKitWalletAuth] Error checking if MiniKit is installed:', err);
    // Continue to installation attempt anyway
  }

  if (!isInstalled) {
    try {
      // Get App ID with more robust fallback chain and logging
      const envAppId = import.meta.env.VITE_WORLD_APP_ID || 
                    import.meta.env.VITE_WORLD_ID_APP_ID;
      const globalEnvAppId = (window as any).__ENV__?.WORLD_APP_ID;
      
      // Use the first available App ID, with default as last resort
      const appId = envAppId || globalEnvAppId || 'app_0de9312869c4818fc1a1ec64306551b69';
      
      console.log('[triggerMiniKitWalletAuth] Installing MiniKit with appId:', appId);
      console.log('[triggerMiniKitWalletAuth] Environment variables available:', {
        VITE_WORLD_APP_ID: import.meta.env.VITE_WORLD_APP_ID,
        VITE_WORLD_ID_APP_ID: import.meta.env.VITE_WORLD_ID_APP_ID,
        WORLD_APP_ID: import.meta.env.WORLD_APP_ID,
        windowEnvVar: (window as any).__ENV__?.WORLD_APP_ID
      });
      
      // Install MiniKit
      await MiniKit.install(String(appId));
      console.log('[triggerMiniKitWalletAuth] MiniKit installed successfully');
    } catch (err) {
      console.error('[triggerMiniKitWalletAuth] Failed to install MiniKit:', err);
      throw new Error('Failed to initialize MiniKit: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  try {
    console.log('[triggerMiniKitWalletAuth] Starting wallet auth flow with provided server nonce...');

    // Check for commands async API
    if (!MiniKit.commandsAsync) {
      console.error('[triggerMiniKitWalletAuth] MiniKit.commandsAsync is undefined');
      throw new Error('MiniKit is initialized but commandsAsync API is not available. Check MiniKit version compatibility.');
    }
    
    // Check for walletAuth command
    if (!MiniKit.commandsAsync.walletAuth) {
      console.error('[triggerMiniKitWalletAuth] MiniKit.commandsAsync.walletAuth is undefined');
      throw new Error('MiniKit wallet authentication command is not available. Check MiniKit version compatibility.');
    }

    console.log('[triggerMiniKitWalletAuth] Calling MiniKit.commandsAsync.walletAuth with serverNonce:', serverNonce);
    
    // Add statement and timeout for better UX
    const result = await MiniKit.commandsAsync.walletAuth({
      nonce: serverNonce,
      statement: 'Sign in to WorldFund to create and support campaigns.',
      expirationTime: new Date(Date.now() + 1000 * 60 * 10), // 10 minutes expiry
    });
    
    console.log('[triggerMiniKitWalletAuth] Wallet auth result:', JSON.stringify(result, null, 2));

    // Better null/undefined handling
    if (!result) {
      console.error('[triggerMiniKitWalletAuth] MiniKit.commandsAsync.walletAuth returned null/undefined');
      throw new Error('MiniKit wallet authentication returned an empty result');
    }
    
    if (!result.finalPayload) {
      console.error('[triggerMiniKitWalletAuth] MiniKit.commandsAsync.walletAuth returned no finalPayload');
      throw new Error('MiniKit wallet authentication did not return a payload. User might have cancelled.');
    }

    // Sanitize the wallet payload for security
    const sanitizedPayload = sanitizeWalletPayload(result.finalPayload);
    
    // More detailed error handling with specific error types
    if (sanitizedPayload.status !== 'success') {
      // Access error_code more safely
      const errorCode = sanitizedPayload.error_code;
      const status = sanitizedPayload.status;
      
      console.error('[triggerMiniKitWalletAuth] MiniKit auth returned non-success status:', {
        status,
        errorCode,
        payload: JSON.stringify(sanitizedPayload, null, 2)
      });
      
      if (status === 'cancelled') {
        throw new Error('Wallet authentication was cancelled by the user.');
      } else if (status === 'error') {
        throw new Error(`MiniKit auth failed: ${errorCode || 'unknown error code'}`);
      } else {
        throw new Error(`MiniKit auth failed with status: ${status || 'unknown status'}`);
      }
    }

    // Validate the payload
    if (!sanitizedPayload.message) {
      console.error('[triggerMiniKitWalletAuth] MiniKit auth successful but missing expected message in payload');
      throw new Error('MiniKit auth successful but returned an incomplete payload without signature data');
    }
    
    if (!sanitizedPayload.signature) {
      console.error('[triggerMiniKitWalletAuth] MiniKit auth successful but missing signature in payload');
      throw new Error('MiniKit auth successful but returned an incomplete payload without signature');
    }
    
    // Extract nonce for validation
    const extractedNonce = extractNonceFromMessage(sanitizedPayload.message);
    if (!extractedNonce) {
      console.warn('[triggerMiniKitWalletAuth] Could not extract nonce from message:',
        typeof sanitizedPayload.message === 'object' 
          ? JSON.stringify(sanitizedPayload.message) 
          : sanitizedPayload.message);
    }

    // Extract address from payload
    const extractedAddress = extractAddress(sanitizedPayload);
    
    // IMPORTANT: Ensure message is a string for MiniAppWalletAuthSuccessPayload
    const messageString = typeof sanitizedPayload.message === 'string'
      ? sanitizedPayload.message
      : JSON.stringify(sanitizedPayload.message);
    
    // Return properly formatted success payload with ALL required properties
const successPayload: MiniAppWalletAuthSuccessPayload = {
  status: 'success',
  message: messageString,
  signature: sanitizedPayload.signature,
  address: extractedAddress || '',
  // Handle different version formats - ensure it's a number
  version: typeof sanitizedPayload.version === 'number' 
    ? sanitizedPayload.version 
    : parseInt(String(sanitizedPayload.version || '1'), 10) || 1
};

    console.log('[triggerMiniKitWalletAuth] Created complete success payload with all required fields');
    return successPayload;
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

  // Better environment variable handling
  useEffect(() => {
    try {
      if (appId) {
        console.log('[MiniKitProvider] Using World App ID from props:', appId);
        setAppIdToUse(appId);
        return;
      }
      
      // Log all possible environment variables for debugging
      console.log('[MiniKitProvider] Environment variables check:', {
        VITE_WORLD_APP_ID: import.meta.env.VITE_WORLD_APP_ID,
        VITE_WORLD_ID_APP_ID: import.meta.env.VITE_WORLD_ID_APP_ID,
        WORLD_APP_ID: import.meta.env.WORLD_APP_ID,
        windowEnvVar: (window as any).__ENV__?.WORLD_APP_ID,
      });
      
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

  // Better initialization handling
  useEffect(() => {
    if (!appIdToUse) {
      console.warn('[MiniKitProvider] Cannot initialize MiniKit: No App ID available yet.');
      return;
    }
    
    let isMounted = true;
    console.log('[MiniKitProvider] Attempting to initialize MiniKit with App ID:', appIdToUse);
    
    const initializeMiniKit = async () => {
      try {
        // Check if MiniKit is defined
        if (typeof MiniKit === 'undefined') {
          console.error('[MiniKitProvider] MiniKit is undefined. Cannot initialize.');
          return;
        }
        
        console.log('[MiniKitProvider] MiniKit object available with keys:', Object.keys(MiniKit));
        
        // Check if already installed
        let isInstalled = false;
        try {
          if (typeof MiniKit.isInstalled === 'function') {
            isInstalled = MiniKit.isInstalled();
            console.log('[MiniKitProvider] MiniKit.isInstalled() check returned:', isInstalled);
          } else {
            console.error('[MiniKitProvider] MiniKit.isInstalled is not a function');
          }
        } catch (err) {
          console.error('[MiniKitProvider] Error checking if MiniKit is installed:', err);
        }

        // Install if needed
        if (!isInstalled) {
          console.log('[MiniKitProvider] Installing MiniKit with appId:', appIdToUse);
          try {
            await MiniKit.install(String(appIdToUse));
            console.log('[MiniKitProvider] MiniKit Install command finished successfully');
          } catch (installError) {
            console.error('[MiniKitProvider] Error installing MiniKit:', installError);
            return; // Exit on install error
          }
        } else {
          console.log('[MiniKitProvider] MiniKit already installed (provider check).');
        }

        // Verify installation was successful
        let verifyInstalled = false;
        try {
          if (typeof MiniKit.isInstalled === 'function') {
            verifyInstalled = MiniKit.isInstalled();
          }
        } catch (err) {
          console.error('[MiniKitProvider] Error verifying MiniKit installation:', err);
        }
        
        if (verifyInstalled) {
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

  // Better window auth function handling
  useEffect(() => {
    // Check if auth functions are available
    if (isMiniKitInitialized && 
        typeof getNonceForMiniKit === 'function' && 
        typeof loginWithWallet === 'function') {
      
      // Set up global auth trigger function
      (window as any).__triggerWalletAuth = async (): Promise<boolean> => {
        console.log('[window.__triggerWalletAuth] Direct wallet auth trigger called');
        
        // Prevent concurrent auth attempts
        if (isAttemptingAuthViaWindow) {
          console.warn('[window.__triggerWalletAuth] Auth already in progress, skipping');
          return false;
        }
        
        setIsAttemptingAuthViaWindow(true);
        
        try {
          // Get nonce from backend
          console.log('[window.__triggerWalletAuth] Fetching nonce via AuthContext...');
          let serverNonce: string;
          try {
            serverNonce = await getNonceForMiniKit();
            console.log('[window.__triggerWalletAuth] Nonce received:', serverNonce);
          } catch (nonceError) {
            console.error('[window.__triggerWalletAuth] Failed to get nonce:', nonceError);
            return false;
          }

          // Get auth payload from wallet
          console.log('[window.__triggerWalletAuth] Triggering MiniKit wallet auth with nonce...');
          let authPayload: MiniAppWalletAuthSuccessPayload;
          try {
            authPayload = await triggerMiniKitWalletAuth(serverNonce);
            console.log('[window.__triggerWalletAuth] Auth payload received');
          } catch (authError) {
            console.error('[window.__triggerWalletAuth] Wallet auth failed:', authError);
            return false;
          }

          // Verify auth with backend and login
          console.log('[window.__triggerWalletAuth] Calling loginWithWallet with auth payload...');
          try {
            await loginWithWallet(authPayload);
            console.log('[window.__triggerWalletAuth] loginWithWallet completed successfully');
            return true;
          } catch (loginError) {
            console.error('[window.__triggerWalletAuth] Login with wallet failed:', loginError);
            return false;
          }
        } catch (error) {
          // Catch-all error handler
          console.error('[window.__triggerWalletAuth] Unexpected error during auth flow:', error);
          return false;
        } finally {
          setIsAttemptingAuthViaWindow(false);
        }
      };
      
      console.log('[MiniKitProvider] Exposed wallet auth function to window.__triggerWalletAuth');
    } else if (isMiniKitInitialized) {
        console.warn('[MiniKitProvider] MiniKit initialized, but auth functions not available:', {
          getNonceAvailable: typeof getNonceForMiniKit === 'function',
          loginWithWalletAvailable: typeof loginWithWallet === 'function'
        });
    }
    
    // Cleanup
    return () => {
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