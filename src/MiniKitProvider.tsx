// src/MiniKitProvider.tsx

// # ############################################################################ #
// # # 	 	 	 	 	 SECTION 2 - TYPE IMPORTS 	 	 	 	 	 	 #
// # ############################################################################ #
import type { ReactNode } from 'react';
import React, { useEffect, useState, useCallback } from 'react';
// Import MiniKit and necessary types
import { MiniKit, MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js';
// Import the useAuth hook to access context methods
import { useAuth } from './components/AuthContext';
import { installMiniKit, triggerMiniKitWalletAuth } from './utils/minikit';

// # ############################################################################ #
// # # 	 	 	 	 SECTION 3 - GLOBAL CONSTANTS 	 	 	 	 	 #
// # ############################################################################ #
// Constants
const DEFAULT_APP_ID = 'app_0de9312869c4818fc1a1ec64306551b69';
const MAX_RETRIES = 2;
const AUTH_EXPIRY_MINUTES = 10;

// # ############################################################################ #
// # # 	 	 	 	 SECTION 4 - INTERFACE: PROVIDER PROPS 	 	 	 	 #
// # ############################################################################ #
interface MiniKitProviderProps {
	 children: ReactNode;
	 appId?: string; // Allow passing App ID via prop as fallback
}

// # ############################################################################ #
// # # 	 	 	 SECTION 15 - PROVIDER COMPONENT: DEFINITION & STATE 	 	 	 #
// # ############################################################################ #
export default function MiniKitProvider({
	 children,
	 appId
}: MiniKitProviderProps) {
	 const [appIdToUse, setAppIdToUse] = useState<string | undefined>(appId);
	 const [isMiniKitInitialized, setIsMiniKitInitialized] = useState(false);
	 const [isAttemptingAuthViaWindow, setIsAttemptingAuthViaWindow] = useState(false);

// # ############################################################################ #
// # # 	 	 	SECTION 16 - PROVIDER COMPONENT: AUTH CONTEXT HOOK 	 	 	 #
// # ############################################################################ #
	 // Ensure getNonceForMiniKit is available from AuthContext
	 const { loginWithWallet, getNonceForMiniKit } = useAuth();

// # ############################################################################ #
// # # 	 	 	SECTION 17 - PROVIDER COMPONENT: EFFECT - APP ID SETUP 	 	 	 #
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
// # # 	 	 SECTION 18 - PROVIDER COMPONENT: EFFECT - MINIKIT INITIALIZATION #
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
// # # SECTION 19 - PROVIDER COMPONENT: EFFECT - WINDOW AUTH FUNCTION SETUP 	 	 #
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
// # # 	 	 	 	 SECTION 20 - PROVIDER COMPONENT: JSX RETURN 	 	 	 	 #
// # ############################################################################ #
	 return <>{children}</>;
}

// # ############################################################################ #
// # # 	 	 	 	 SECTION 21 - GLOBAL TYPE DECLARATION (WINDOW) 	 	 	 	 	 #
// # ############################################################################ #
declare global {
	 interface Window {
	 	 __triggerWalletAuth?: () => Promise<boolean>; // Returns boolean for success/failure
	 	 __ENV__?: Record<string, string>;
	 }
}

// # ############################################################################ #
// # # 	 	 	 	 SECTION 22 - DEFAULT EXPORT (MINIKITPROVIDER) 	 	 	 	 	 #
// # ############################################################################ #
// Default export is the MiniKitProvider function itself, covered by its definition section.
// If this was a separate named export, it would go here.
// The actual export is `export default function MiniKitProvider...`
// which is handled by the component definition itself.