/// <reference types="vite/client" />

// Define Vite environment variables type
interface ImportMetaEnv {
  readonly VITE_WORLD_APP_ID?: string;
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
  
  // Determine the app ID to use on mount
  useEffect(() => {
    // First check if appId was passed as prop
    if (appId) {
      setAppIdToUse(appId);
      return;
    }
    
    // Then check for Vite environment variables
    const envAppId = import.meta.env.VITE_WORLD_APP_ID || 
                     import.meta.env.WORLD_APP_ID;
                     
    if (envAppId) {
      console.log('Using World App ID from environment variables');
      setAppIdToUse(envAppId);
    } else {
      console.warn('No World App ID found in environment variables or props');
    }
  }, [appId]);

  // Initialize MiniKit when appId is available
  useEffect(() => {
    if (!appIdToUse) {
      console.error('Cannot initialize MiniKit: No App ID available');
      return;
    }
    
    const initializeMiniKit = async () => {
      try {
        if (!MiniKit.isInstalled || !MiniKit.isInstalled()) {
          // Install MiniKit with your app ID
          await MiniKit.install(appIdToUse);
          console.log('MiniKit Installed successfully');
        } else {
          console.log('MiniKit was already installed');
        }
        
        // Check if MiniKit is actually active
        if (MiniKit.isInstalled && MiniKit.isInstalled()) {
          console.log('MiniKit is active and ready');
        } else {
          console.error('MiniKit installation check failed');
        }
      } catch (error) {
        console.error('Failed to initialize MiniKit:', error);
      }
    };

    initializeMiniKit();
  }, [appIdToUse]);

  return <>{children}</>;
}