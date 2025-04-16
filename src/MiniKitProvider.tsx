'use client' // Required for Next.js

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
  appId = import.meta.env.VITE_WORLD_APP_ID
}: MiniKitProviderProps) {
  // DEBUG: Expression expected. No longer hardcoded. Imports from vercel, check implementation.

  useEffect(() => {
    const initializeMiniKit = async () => {
      try {
        if (!MiniKit.isInstalled || !MiniKit.isInstalled()) {
          await MiniKit.install(appId);
          // DEBUG: Is this correct?
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