'use client' // Required for Next.js (optional in Vite but harmless)

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'
import React from 'react';

interface MiniKitProviderProps {
  children: ReactNode;
  appId?: string;
}

export default function MiniKitProvider({ 
  children, 
appId = import.meta.env.VITE_WORLD_APP_ID || "app_46c9cdd743f94cc48093f843aca6b5a6"
}: MiniKitProviderProps) {

  useEffect(() => {
    const initializeMiniKit = async () => {
      try {
        if (!MiniKit.isInstalled || !MiniKit.isInstalled()) {
          // Install MiniKit with your app ID
          await MiniKit.install(appId);
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
  }, [appId]);

  return <>{children}</>
}