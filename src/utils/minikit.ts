import { MiniKit, MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';

const DEFAULT_APP_ID = 'app_0de9312869c4818fc1a1ec64306551b69';
const MAX_RETRIES = 2;
const AUTH_EXPIRY_MINUTES = 10;

export function ensureString(value: any): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return '';
}

export function isValidNonce(nonce: string): boolean {
  return /^[a-f0-9]{8,64}$/i.test(nonce);
}

interface MiniKitFinalPayload {
  status: 'success' | 'error' | 'cancelled' | string;
  error_code?: string;
  message?: any;
  signature?: string;
  address?: string;
  version?: string | number;
  [key: string]: any;
}

export function sanitizeWalletPayload(payload: any): MiniKitFinalPayload {
  if (!payload) return { status: 'error', error_code: 'empty_payload' };

  const sanitized: MiniKitFinalPayload = {
    status: typeof payload.status === 'string' ? payload.status : 'error'
  };

  if (payload.message !== undefined) {
    sanitized.message = payload.message;
  }

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

export function extractNonceFromMessage(message: any): string {
  if (!message) return '';

  console.log('[extractNonceFromMessage] Attempting to extract nonce, message type:', typeof message);

  if (typeof message === 'string') {
    const siweNonceMatch = message.match(/Nonce:\s*([a-f0-9]{8,64})/i);
    if (siweNonceMatch && siweNonceMatch[1]) {
      console.log('[extractNonceFromMessage] Found nonce in SIWE format:', siweNonceMatch[1]);
      return siweNonceMatch[1];
    }

    const lines = message.split(/\r?\n/);
    for (const line of lines) {
      const lineMatch = line.match(/^\s*Nonce:\s*([a-f0-9]{8,64})\s*$/i);
      if (lineMatch && lineMatch[1]) {
        console.log('[extractNonceFromMessage] Found nonce in multiline SIWE format:', lineMatch[1]);
        return lineMatch[1];
      }
    }

    const patterns = [
      /nonce["']?\s*[:=]\s*["']?([a-f0-9]{8,64})["']?/i,
      /nonce=([a-f0-9]{8,64})/i,
      /\bnonce\b[^a-f0-9]*([a-f0-9]{8,64})/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        console.log('[extractNonceFromMessage] Found nonce with pattern:', match[1]);
        return match[1];
      }
    }

    try {
      const parsed = JSON.parse(message);
      if (parsed && typeof parsed === 'object' && parsed.nonce && typeof parsed.nonce === 'string') {
        console.log('[extractNonceFromMessage] Found nonce in parsed JSON:', parsed.nonce);
        return parsed.nonce;
      }
    } catch (e) {
      if (/^[a-f0-9]{8,64}$/i.test(message)) {
        console.log('[extractNonceFromMessage] Message is a pure nonce hex string');
        return message;
      }
    }
  }
  else if (typeof message === 'object' && message !== null) {
    if (message.nonce && typeof message.nonce === 'string') {
      console.log('[extractNonceFromMessage] Found nonce in object property:', message.nonce);
      return message.nonce;
    }

    if (message.domain && message.nonce && typeof message.nonce === 'string') {
      console.log('[extractNonceFromMessage] Found nonce in SIWE object:', message.nonce);
      return message.nonce;
    }
  }

  console.warn('[extractNonceFromMessage] Could not extract nonce from message:',
    typeof message === 'object' ? JSON.stringify(message).substring(0, 100) : message);
  return '';
}

export function extractAddress(payload: any): string {
  if (!payload) return '';

  if (payload.address && typeof payload.address === 'string') {
    return payload.address;
  }

  if (payload.message && typeof payload.message === 'object') {
    if (payload.message.address && typeof payload.message.address === 'string') {
      return payload.message.address;
    }

    if (payload.message.wallet && typeof payload.message.wallet === 'string') {
      return payload.message.wallet;
    }
  }

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
    }
  }

  if (payload.message && typeof payload.message === 'string') {
    const ethAddressMatch = payload.message.match(/0x[a-fA-F0-9]{40}/);
    if (ethAddressMatch) {
      return ethAddressMatch[0];
    }
  }

  return '';
}

export function safePromise<T>(fn: () => T | Promise<T>): Promise<T> {
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

export async function retryOperation<T>(
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
        const delayMs = initialDelayMs * Math.pow(1.5, attempt);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

export async function installMiniKit(appId: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      const installResult = MiniKit.install(String(appId));

      if (installResult &&
          typeof installResult === 'object' &&
          typeof (installResult as any).then === 'function') {
        (installResult as unknown as Promise<any>)
          .then(() => resolve())
          .catch(reject);
        return;
      }

      if (installResult && typeof installResult === 'object') {
        if ('success' in installResult) {
          if (installResult.success === false) {
            const errorMessage =
              (installResult as any).errorMessage ||
              'MiniKit installation failed with error code: ' +
              ((installResult as any).errorCode || 'unknown');

            reject(new Error(errorMessage));
            return;
          }
          resolve();
          return;
        }
      }

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export const triggerMiniKitWalletAuth = async (
  serverNonce: string,
  maxRetries = 2
): Promise<MiniAppWalletAuthSuccessPayload> => {
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

  let retryCount = 0;
  let isInstalled = false;

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
        WORLD_APP_ID: import.meta.env.WORLD_APP_ID,
        windowEnvVar: (window as any).__ENV__?.WORLD_APP_ID
      });

      let installRetryCount = 0;
      while (installRetryCount <= maxRetries) {
        try {
          await installMiniKit(appId);
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
      statement: 'Sign in to Fund to create and support campaigns.',
      expirationTime: new Date(Date.now() + 1000 * 60 * AUTH_EXPIRY_MINUTES),
    });

    console.log('[triggerMiniKitWalletAuth] >>> RAW MiniKit.commandsAsync.walletAuth() RESPONSE <<<');
    if (result && result.finalPayload) {
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

    const extractedNonce = extractNonceFromMessage(sanitizedPayload.message);
    if (!extractedNonce) {
      console.warn('[triggerMiniKitWalletAuth] Could not extract nonce from message:',
        typeof sanitizedPayload.message === 'object'
          ? JSON.stringify(sanitizedPayload.message)
          : sanitizedPayload.message);
    }

    const extractedAddress = extractAddress(sanitizedPayload);

    const messageString = typeof sanitizedPayload.message === 'string'
      ? sanitizedPayload.message
      : JSON.stringify(sanitizedPayload.message);

    if (typeof sanitizedPayload.message === 'object' && sanitizedPayload.message !== null) {
        console.log('[triggerMiniKitWalletAuth] Original sanitizedPayload.message (object) was stringified to:', messageString);
    }

    const successPayload: MiniAppWalletAuthSuccessPayload = {
      status: 'success',
      message: messageString,
      signature: sanitizedPayload.signature,
      address: extractedAddress || (sanitizedPayload.address || ''),
      version: typeof sanitizedPayload.version === 'number'
        ? sanitizedPayload.version
        : Number(sanitizedPayload.version ?? 2)
    };

    console.log('[triggerMiniKitWalletAuth] FINAL successPayload being returned:', JSON.stringify(successPayload, null, 2));
    return successPayload;

  } catch (error) {
    console.error('[triggerMiniKitWalletAuth] Error during wallet auth process:', error);
    if (error instanceof Error) {
        throw error;
    } else {
        throw new Error(String(error));
    }
  }
};