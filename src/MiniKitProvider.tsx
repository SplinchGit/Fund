// src/MiniKitProvider.tsx

// # ############################################################################ #
// # #         SECTION 1 - VITE CLIENT REFERENCE & TYPE DEFINITIONS (ENV)         #
// # ############################################################################ #
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

// # ############################################################################ #
// # #                     SECTION 2 - TYPE IMPORTS                             #
// # ############################################################################ #
import type { ReactNode } from 'react';
import React, { useEffect, useState, useCallback } from 'react';
// Import MiniKit and necessary types
import { MiniKit, MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';
// Import the useAuth hook to access context methods
import { useAuth } from './components/AuthContext';

// # ############################################################################ #
// # #                     SECTION 3 - GLOBAL CONSTANTS                         #
// # ############################################################################ #
// Constants
const DEFAULT_APP_ID = 'app_0de9312869c4818fc1a1ec64306551b69';
const MAX_RETRIES = 2;
const AUTH_EXPIRY_MINUTES = 10;

// # ############################################################################ #
// # #                   SECTION 4 - INTERFACE: PROVIDER PROPS                  #
// # ############################################################################ #
interface MiniKitProviderProps {
  children: ReactNode;
  appId?: string; // Allow passing App ID via prop as fallback
}

// # ############################################################################ #
// # #                   SECTION 5 - INTERFACE: MINIKIT FINAL PAYLOAD             #
// # ############################################################################ #
// Define a more general type for the finalPayload to handle success and error cases better for TS
// This is a presumed structure for non-success cases. Refer to MiniKit docs for actual error payload type.
interface MiniKitFinalPayload {
  status: 'success' | 'error' | 'cancelled' | string; // Add other potential statuses
  error_code?: string; // error_code might be optional or exist on non-success payloads
  message?: any; // Allow any type for internal processing, we'll stringify before returning
  signature?: string;
  address?: string; // Add address property
  version?: string | number; // Updated to allow both string and number types
  // Include other properties that might be common or specific to error payloads
  [key: string]: any; // Allow other properties
}

// # ############################################################################ #
// # #                 SECTION 6 - UTILITY FUNCTION: ENSURE STRING              #
// # ############################################################################ #
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

// # ############################################################################ #
// # #                 SECTION 7 - UTILITY FUNCTION: IS VALID NONCE             #
// # ############################################################################ #
/**
 * Validate nonce format - must be a hexadecimal string of proper length
 */
function isValidNonce(nonce: string): boolean {
  return /^[a-f0-9]{8,64}$/i.test(nonce);
}

// # ############################################################################ #
// # #             SECTION 8 - UTILITY FUNCTION: SANITIZE WALLET PAYLOAD        #
// # ############################################################################ #
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

// # ############################################################################ #
// # #         SECTION 9 - UTILITY FUNCTION: EXTRACT NONCE FROM MESSAGE         #
// # ############################################################################ #
/**
 * Extract nonce from wallet message in different formats
 */
function extractNonceFromMessage(message: any): string {
  if (!message) return '';

  console.log('[extractNonceFromMessage] Attempting to extract nonce, message type:', typeof message);

  // Direct string case
  if (typeof message === 'string') {
    // SIWE format - exact match for "Nonce: hexvalue" as seen in logs
    const siweNonceMatch = message.match(/Nonce:\s*([a-f0-9]{8,64})/i);
    if (siweNonceMatch && siweNonceMatch[1]) {
      console.log('[extractNonceFromMessage] Found nonce in SIWE format:', siweNonceMatch[1]);
      return siweNonceMatch[1];
    }

    // Try splitting by lines (SIWE message is often multiline)
    const lines = message.split(/\r?\n/);
    for (const line of lines) {
      const lineMatch = line.match(/^\s*Nonce:\s*([a-f0-9]{8,64})\s*$/i);
      if (lineMatch && lineMatch[1]) {
        console.log('[extractNonceFromMessage] Found nonce in multiline SIWE format:', lineMatch[1]);
        return lineMatch[1];
      }
    }

    // Fallback to general patterns
    const patterns = [
      /nonce["']?\s*[:=]\s*["']?([a-f0-9]{8,64})["']?/i,   // JSON format
      /nonce=([a-f0-9]{8,64})/i,   // URL param format
      /\bnonce\b[^a-f0-9]*([a-f0-9]{8,64})/i   // General format with word boundary
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        console.log('[extractNonceFromMessage] Found nonce with pattern:', match[1]);
        return match[1];
      }
    }

    // Try parsing as JSON if it looks like JSON
    try {
      const parsed = JSON.parse(message);
      if (parsed && typeof parsed === 'object' && parsed.nonce && typeof parsed.nonce === 'string') {
        console.log('[extractNonceFromMessage] Found nonce in parsed JSON:', parsed.nonce);
        return parsed.nonce;
      }
    } catch (e) {
      // Not JSON, use as is if it looks like a nonce (simple validation)
      if (/^[a-f0-9]{8,64}$/i.test(message)) {
        console.log('[extractNonceFromMessage] Message is a pure nonce hex string');
        return message;
      }
    }
  }
  // Object case
  else if (typeof message === 'object' && message !== null) {
    // Standard nonce property
    if (message.nonce && typeof message.nonce === 'string') {
      console.log('[extractNonceFromMessage] Found nonce in object property:', message.nonce);
      return message.nonce;
    }

    // SIWE format
    if (message.domain && message.nonce && typeof message.nonce === 'string') {
      console.log('[extractNonceFromMessage] Found nonce in SIWE object:', message.nonce);
      return message.nonce;
    }
  }

  console.warn('[extractNonceFromMessage] Could not extract nonce from message:',
    typeof message === 'object' ? JSON.stringify(message).substring(0, 100) : message);
  return '';
}

// # ############################################################################ #
// # #                   SECTION 10 - UTILITY FUNCTION: EXTRACT ADDRESS         #
// # ############################################################################ #
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

// # ############################################################################ #
// # #                 SECTION 11 - UTILITY FUNCTION: SAFE PROMISE              #
// # ############################################################################ #
/**
 * Helper function to handle both Promise and non-Promise returns
 */
function safePromise<T>(fn: () => T | Promise<T>): Promise<T> {
  try {
    const result = fn();
    if (result && typeof (result as any).then === 'function') {
      return result as Promise<T>;
    }
    return Promise.resolve(result);
  } catch (error) {
    return Promise.reject(error);
  }
}

// # ############################################################################ #
// # #                 SECTION 12 - UTILITY FUNCTION: RETRY OPERATION           #
// # ############################################################################ #
/**
 * Utility function to retry an operation with exponential backoff
 */
async function retryOperation<T>(
  operation: () => T | Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = MAX_RETRIES,
    initialDelayMs = 300,
    operationName = 'Operation',
  } = options;

  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await safePromise(operation);
    } catch (error) {
      lastError = error;
      console.warn(`[retryOperation] ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error);

      if (attempt < maxRetries) {
        // Wait before retrying with increasing backoff
        const delayMs = initialDelayMs * Math.pow(1.5, attempt);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

// # ############################################################################ #
// # #           SECTION 13 - UTILITY FUNCTION: INSTALL MINIKIT HELPER          #
// # ############################################################################ #
/**
 * Helper for safer MiniKit installation that handles specific MiniKit return types
 */
async function installMiniKit(appId: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      // Get the result from MiniKit.install
      const installResult = MiniKit.install(String(appId));

      // Case 1: If it's a Promise
      if (installResult &&
          typeof installResult === 'object' &&
          typeof (installResult as any).then === 'function') {
        // Cast to unknown first to satisfy TypeScript
        (installResult as unknown as Promise<any>)
          .then(() => resolve())
          .catch(reject);
        return;
      }

      // Case 2: If it's a synchronous success/error object
      if (installResult && typeof installResult === 'object') {
        // Check for error indicators in the object
        if ('success' in installResult) {
          if (installResult.success === false) {
            // It's an error object
            const errorMessage =
              (installResult as any).errorMessage ||
              'MiniKit installation failed with error code: ' +
              ((installResult as any).errorCode || 'unknown');

            reject(new Error(errorMessage));
            return;
          }
          // Otherwise it's a success object
          resolve();
          return;
        }
      }

      // Case 3: Any other return type - assume success
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// # ############################################################################ #
// # #         SECTION 14 - EXPORTED FUNCTION: TRIGGER MINIKIT WALLET AUTH      #
// # ############################################################################ #
// Export a function to manually trigger wallet auth from anywhere in the app
export const triggerMiniKitWalletAuth = async (
  serverNonce: string,
  maxRetries = 2 // Added retry parameter
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

  // Added better retry handling for installation
  let retryCount = 0;
  let isInstalled = false;

  // Check if MiniKit is installed with retries
  while (retryCount <= maxRetries) {
    try {
      console.log(`[triggerMiniKitWalletAuth] Checking if MiniKit is installed (attempt ${retryCount + 1})...`);

      if (typeof MiniKit.isInstalled !== 'function') {
        console.error('[triggerMiniKitWalletAuth] MiniKit.isInstalled is not a function');
        await new Promise(resolve => setTimeout(resolve, 300));
        retryCount++;
        continue;
      }

      isInstalled = MiniKit.isInstalled();
      console.log(`[triggerMiniKitWalletAuth] MiniKit.isInstalled() check returned: ${isInstalled}`);
      if (isInstalled) break;

      await new Promise(resolve => setTimeout(resolve, 300));
      retryCount++;
    } catch (err) {
      console.error(`[triggerMiniKitWalletAuth] Error checking if MiniKit is installed (attempt ${retryCount + 1}):`, err);
      await new Promise(resolve => setTimeout(resolve, 300));
      retryCount++;
    }
  }

  if (!isInstalled) {
    try {
      const envAppId = import.meta.env.VITE_WORLD_APP_ID ||
                       import.meta.env.VITE_WORLD_ID_APP_ID;
      const globalEnvAppId = (window as any).__ENV__?.WORLD_APP_ID;
      const appId = envAppId || globalEnvAppId || DEFAULT_APP_ID;

      console.log('[triggerMiniKitWalletAuth] Installing MiniKit with appId:', appId);
      console.log('[triggerMiniKitWalletAuth] Environment variables available:', {
        VITE_WORLD_APP_ID: import.meta.env.VITE_WORLD_APP_ID,
        VITE_WORLD_ID_APP_ID: import.meta.env.VITE_WORLD_ID_APP_ID,
        WORLD_APP_ID: import.meta.env.WORLD_APP_ID, // This might be undefined if not set via DefinePlugin or similar
        windowEnvVar: (window as any).__ENV__?.WORLD_APP_ID
      });

      let installRetryCount = 0;
      while (installRetryCount <= maxRetries) {
        try {
          await installMiniKit(appId); // Uses our safer installation method
          console.log('[triggerMiniKitWalletAuth] MiniKit installed successfully');
          break;
        } catch (installError) {
          console.error(`[triggerMiniKitWalletAuth] Failed to install MiniKit (attempt ${installRetryCount + 1}):`, installError);
          if (installRetryCount >= maxRetries) {
            throw new Error('Failed to initialize MiniKit after multiple attempts: ' +
              (installError instanceof Error ? installError.message : String(installError)));
          }
          await new Promise(resolve => setTimeout(resolve, 500));
          installRetryCount++;
        }
      }
    } catch (err) {
      console.error('[triggerMiniKitWalletAuth] Failed to install MiniKit after all retries:', err);
      throw new Error('Failed to initialize MiniKit: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  try {
    console.log('[triggerMiniKitWalletAuth] Starting wallet auth flow with provided server nonce...');

    let apiRetryCount = 0;
    while (!MiniKit.commandsAsync && apiRetryCount <= maxRetries) {
      console.log(`[triggerMiniKitWalletAuth] Waiting for MiniKit.commandsAsync to be available (attempt ${apiRetryCount + 1})...`);
      await new Promise(resolve => setTimeout(resolve, 300));
      apiRetryCount++;
    }

    if (!MiniKit.commandsAsync) {
      console.error('[triggerMiniKitWalletAuth] MiniKit.commandsAsync is undefined after waiting');
      throw new Error('MiniKit is initialized but commandsAsync API is not available. Check MiniKit version compatibility.');
    }

    if (!MiniKit.commandsAsync.walletAuth) {
      console.error('[triggerMiniKitWalletAuth] MiniKit.commandsAsync.walletAuth is undefined');
      throw new Error('MiniKit wallet authentication command is not available. Check MiniKit version compatibility.');
    }

    console.log('[triggerMiniKitWalletAuth] Calling MiniKit.commandsAsync.walletAuth with serverNonce:', serverNonce);

    const result = await MiniKit.commandsAsync.walletAuth({
      nonce: serverNonce,
      statement: 'Sign in to Fund to create and support campaigns.', // Recommended
      expirationTime: new Date(Date.now() + 1000 * 60 * AUTH_EXPIRY_MINUTES),
    });

    // ***** BEGIN CORRECTED DETAILED LOGGING *****
    console.log('[triggerMiniKitWalletAuth] >>> RAW MiniKit.commandsAsync.walletAuth() RESPONSE <<<');
    if (result && result.finalPayload) {
      // Cast with double assertion for safety: first to unknown, then to our interface
      const finalPayload = result.finalPayload as unknown as MiniKitFinalPayload;

      console.log('[triggerMiniKitWalletAuth] Raw result.finalPayload.status:', finalPayload.status);

      if (finalPayload.status === 'success') {
        console.log('[triggerMiniKitWalletAuth] Raw result.finalPayload.message (SUCCESS):', finalPayload.message);
        console.log('[triggerMiniKitWalletAuth] typeof result.finalPayload.message (SUCCESS):', typeof finalPayload.message);
        console.log('[triggerMiniKitWalletAuth] Raw result.finalPayload.signature (SUCCESS):', finalPayload.signature);
        console.log('[triggerMiniKitWalletAuth] Raw result.finalPayload.address (SUCCESS):', finalPayload.address);
        console.log('[triggerMiniKitWalletAuth] Raw result.finalPayload.version (SUCCESS):', finalPayload.version);
      } else if (finalPayload.status === 'error') {
        console.log('[triggerMiniKitWalletAuth] Raw result.finalPayload.error_code (ERROR):', finalPayload.error_code);
        if ('message' in finalPayload && finalPayload.message) {
            console.log('[triggerMiniKitWalletAuth] Raw result.finalPayload.message (ERROR description):', finalPayload.message);
        }
      } else if (finalPayload.status === 'cancelled') {
        console.log('[triggerMiniKitWalletAuth] Wallet auth was cancelled by user (status: cancelled).');
      } else {
        console.log('[triggerMiniKitWalletAuth] Received unknown or unexpected finalPayload status:', finalPayload.status);
        console.log('[triggerMiniKitWalletAuth] Full raw unknown finalPayload (JSON):', JSON.stringify(finalPayload, null, 2));
      }
    } else if (result) {
      console.warn('[triggerMiniKitWalletAuth] MiniKit.commandsAsync.walletAuth() returned a result, but result.finalPayload is missing. Full result:', JSON.stringify(result, null, 2));
    } else {
      console.error('[triggerMiniKitWalletAuth] MiniKit.commandsAsync.walletAuth() returned a null/undefined result.');
    }
    console.log('[triggerMiniKitWalletAuth] >>> END RAW MiniKit.commandsAsync.walletAuth() RESPONSE <<<');
    // ***** END CORRECTED DETAILED LOGGING *****

    // Existing log (good for seeing the whole result object from MiniKit)
    console.log('[triggerMiniKitWalletAuth] Wallet auth result (full object from MiniKit):', JSON.stringify(result, null, 2));

    if (!result) {
      console.error('[triggerMiniKitWalletAuth] MiniKit.commandsAsync.walletAuth returned null/undefined');
      throw new Error('MiniKit wallet authentication returned an empty result');
    }

    if (!result.finalPayload) {
      console.error('[triggerMiniKitWalletAuth] MiniKit.commandsAsync.walletAuth returned no finalPayload');
      console.error('[triggerMiniKitWalletAuth] Full result object when finalPayload was missing:', JSON.stringify(result, null, 2));
      throw new Error('MiniKit wallet authentication did not return a payload. User might have cancelled or an error occurred before payload generation.');
    }

    const sanitizedPayload = sanitizeWalletPayload(result.finalPayload);
    console.log('[triggerMiniKitWalletAuth] Sanitized Payload for further processing:', JSON.stringify(sanitizedPayload, null, 2));

    if (sanitizedPayload.status !== 'success') {
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

    if (!sanitizedPayload.message) {
      console.error('[triggerMiniKitWalletAuth] MiniKit auth successful but missing expected message in payload');
      throw new Error('MiniKit auth successful but returned an incomplete payload without signature data');
    }

    if (!sanitizedPayload.signature) {
      console.error('[triggerMiniKitWalletAuth] MiniKit auth successful but missing signature in payload');
      throw new Error('MiniKit auth successful but returned an incomplete payload without signature');
    }

    // Extract nonce for validation (optional, as server nonce is primary)
    const extractedNonce = extractNonceFromMessage(sanitizedPayload.message);
    if (!extractedNonce) {
      console.warn('[triggerMiniKitWalletAuth] Could not extract nonce from message:',
        typeof sanitizedPayload.message === 'object'
          ? JSON.stringify(sanitizedPayload.message)
          : sanitizedPayload.message);
    }
    // Optionally, you could compare serverNonce with extractedNonce here if needed for stricter validation

    // Extract address from the sanitized payload
    const extractedAddress = extractAddress(sanitizedPayload);

    // Ensure message is a string for MiniAppWalletAuthSuccessPayload
    const messageString = typeof sanitizedPayload.message === 'string'
      ? sanitizedPayload.message
      : JSON.stringify(sanitizedPayload.message);

    if (typeof sanitizedPayload.message === 'object' && sanitizedPayload.message !== null) {
        console.log('[triggerMiniKitWalletAuth] Original sanitizedPayload.message (object) was stringified to:', messageString);
    }

    // Construct the success payload ensuring all required fields are present
    const successPayload: MiniAppWalletAuthSuccessPayload = {
      status: 'success',
      message: messageString,
      signature: sanitizedPayload.signature, // Already checked for existence
      // Use the 'extractedAddress' variable here
      address: extractedAddress || (sanitizedPayload.address || ''), // Fallback to sanitizedPayload.address if extractAddress returns empty
      version: typeof sanitizedPayload.version === 'number'
        ? sanitizedPayload.version
        : Number(sanitizedPayload.version ?? 2) // fallback to 2 if undefined or not a number
    };

    console.log('[triggerMiniKitWalletAuth] FINAL successPayload being returned:', JSON.stringify(successPayload, null, 2));
    return successPayload;

  } catch (error) {
    console.error('[triggerMiniKitWalletAuth] Error during wallet auth process:', error);
    // Ensure the error is re-thrown so the caller can handle it
    if (error instanceof Error) {
        throw error; // rethrow Error instances
    } else {
        throw new Error(String(error)); // wrap other types in an Error
    }
  }
};

// # ############################################################################ #
// # #           SECTION 15 - PROVIDER COMPONENT: DEFINITION & STATE            #
// # ############################################################################ #
export default function MiniKitProvider({
  children,
  appId
}: MiniKitProviderProps) {
  const [appIdToUse, setAppIdToUse] = useState<string | undefined>(appId);
  const [isMiniKitInitialized, setIsMiniKitInitialized] = useState(false);
  const [isAttemptingAuthViaWindow, setIsAttemptingAuthViaWindow] = useState(false);

// # ############################################################################ #
// # #            SECTION 16 - PROVIDER COMPONENT: AUTH CONTEXT HOOK            #
// # ############################################################################ #
  // Ensure getNonceForMiniKit is available from AuthContext
  const { loginWithWallet, getNonceForMiniKit } = useAuth();

// # ############################################################################ #
// # #            SECTION 17 - PROVIDER COMPONENT: EFFECT - APP ID SETUP        #
// # ############################################################################ #
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
      let determinedAppId = DEFAULT_APP_ID; // Default

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

// # ############################################################################ #
// # #         SECTION 18 - PROVIDER COMPONENT: EFFECT - MINIKIT INITIALIZATION #
// # ############################################################################ #
  // Better initialization handling with retry
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
            return;
          }
        } catch (err) {
          console.error('[MiniKitProvider] Error checking if MiniKit is installed:', err);
          return;
        }

        // Install if needed
        if (!isInstalled) {
          console.log('[MiniKitProvider] Installing MiniKit with appId:', appIdToUse);
          try {
            // Use our safer installation method
            await installMiniKit(appIdToUse);
            console.log('[MiniKitProvider] MiniKit Install command finished successfully');
          } catch (installError) {
            console.error('[MiniKitProvider] Error installing MiniKit:', installError);
            return;
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
          return;
        }

        if (verifyInstalled) {
          console.log('[MiniKitProvider] MiniKit is active and ready');
          if (isMounted) setIsMiniKitInitialized(true);
        } else {
          console.error('[MiniKitProvider] MiniKit installation verification failed.');
        }
      } catch (error) {
        console.error('[MiniKitProvider] Failed to initialize/install MiniKit:', error);
      }
    };

    initializeMiniKit();
    return () => { isMounted = false; };
  }, [appIdToUse]);

// # ############################################################################ #
// # # SECTION 19 - PROVIDER COMPONENT: EFFECT - WINDOW AUTH FUNCTION SETUP     #
// # ############################################################################ #
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

// # ############################################################################ #
// # #                   SECTION 20 - PROVIDER COMPONENT: JSX RETURN            #
// # ############################################################################ #
  return <>{children}</>;
}

// # ############################################################################ #
// # #             SECTION 21 - GLOBAL TYPE DECLARATION (WINDOW)                #
// # ############################################################################ #
declare global {
  interface Window {
    __triggerWalletAuth?: () => Promise<boolean>; // Returns boolean for success/failure
    __ENV__?: Record<string, string>;
  }
}

// # ############################################################################ #
// # #             SECTION 22 - DEFAULT EXPORT (MINIKITPROVIDER)                #
// # ############################################################################ #
// Default export is the MiniKitProvider function itself, covered by its definition section.
// If this was a separate named export, it would go here.
// The actual export is `export default function MiniKitProvider...`
// which is handled by the component definition itself.
