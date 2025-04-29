/// <reference types="vite/client" />

// Define Vite environment variables type
interface ImportMetaEnv {
  readonly VITE_WORLD_APP_ID?: string;
  readonly VITE_WORLD_ID_APP_ID?: string; // Add this variant
  readonly WORLD_APP_ID?: string; // Possible alternate name
  readonly WORLD_APP_CLIENT_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'
import React from 'react';

interface MiniKitProviderProps {
  children: ReactNode;
  appId?: string;
}

export default function MiniKitProvider({ 
  children, 
  // Use Vite env variable or pass through props, with no hardcoded fallback
  appId
}: MiniKitProviderProps) {
  const [appIdToUse, setAppIdToUse] = useState<string | undefined>(appId);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Determine the app ID to use on mount
  useEffect(() => {
    try {
      // First check if appId was passed as prop
      if (appId) {
        console.log('Using World App ID from props:', appId);
        setAppIdToUse(appId);
        return;
      }
      
      // Then check for Vite environment variables with all possible naming patterns
      const envAppId = import.meta.env.VITE_WORLD_APP_ID || 
                       import.meta.env.VITE_WORLD_ID_APP_ID ||
                       import.meta.env.WORLD_APP_ID || 
                       // Use fallback from Amplify console if available
                       'app_0de9312869c4818fc1a1ec64306551b69';
      
      console.log('MiniKitProvider - Environment App ID:', envAppId);
      
      // Check for global fallback from main.tsx if it exists
      // @ts-ignore - This is set in main.tsx as a global fallback
      const globalEnvAppId = window.__ENV__?.WORLD_APP_ID;
      
      if (globalEnvAppId) {
        console.log('Using World App ID from global window.__ENV__:', globalEnvAppId);
        setAppIdToUse(globalEnvAppId);
      } else if (envAppId) {
        console.log('Using World App ID from environment variables:', envAppId);
        setAppIdToUse(envAppId);
      } else {
        console.warn('No World App ID found in environment variables or props');
      }
    } catch (error) {
      console.error('Error setting up MiniKit App ID:', error);
    }
  }, [appId]);

  // Initialize MiniKit when appId is available
  useEffect(() => {
    if (!appIdToUse) {
      console.error('Cannot initialize MiniKit: No App ID available');
      return;
    }
    
    let isMounted = true;
    console.log('Attempting to initialize MiniKit with App ID:', appIdToUse);
    
    const initializeMiniKit = async () => {
      try {
        // Check if MiniKit is available
        if (typeof MiniKit === 'undefined') {
          console.error('MiniKit is undefined - the library may not be loaded correctly');
          return;
        }
        
        // Check if MiniKit needs to be installed
        const isInstalled = MiniKit.isInstalled && MiniKit.isInstalled();
        
        if (!isInstalled) {
          // Install MiniKit with your app ID
          console.log('Installing MiniKit...');
          await MiniKit.install(appIdToUse);
          console.log('MiniKit Installed successfully');
        } else {
          console.log('MiniKit was already installed');
        }
        
        // Check if MiniKit is actually active
        if (MiniKit.isInstalled && MiniKit.isInstalled()) {
          console.log('MiniKit is active and ready');
          if (isMounted) {
            setIsInitialized(true);
          }
        } else {
          console.error('MiniKit installation check failed');
        }
      } catch (error) {
        console.error('Failed to initialize MiniKit:', error);
        // Log detailed error information
        if (error instanceof Error) {
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
      }
    };

    initializeMiniKit();
    
    // Cleanup function for useEffect
    return () => {
      isMounted = false;
    };
  }, [appIdToUse]);

  return <>{children}</>;
}