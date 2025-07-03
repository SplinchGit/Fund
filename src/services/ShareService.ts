// src/services/ShareService.ts

import { MiniKit, ResponseEvent } from '@worldcoin/minikit-js';

export interface SharePayload {
  files?: File[];
  title?: string;
  text?: string;
  url?: string;
}

export interface ShareResult {
  success: boolean;
  error?: string;
}

class ShareService {
  private static instance: ShareService;
  private isShareSupported: boolean = false;

  private constructor() {
    this.initializeService();
  }

  public static getInstance(): ShareService {
    if (!ShareService.instance) {
      ShareService.instance = new ShareService();
    }
    return ShareService.instance;
  }

  private initializeService(): void {
    try {
      // Check if MiniKit is available and supports sharing
      if (typeof MiniKit !== 'undefined' && MiniKit.isInstalled?.()) {
        this.isShareSupported = true;
        console.log('[ShareService] MiniKit share functionality available');
        
        // Subscribe to share events
        MiniKit.subscribe(ResponseEvent.MiniAppShare, (payload) => {
          console.log('[ShareService] Share event received:', payload);
        });
      } else {
        console.log('[ShareService] MiniKit not available, using fallback share');
        this.isShareSupported = false;
      }
    } catch (error) {
      console.error('[ShareService] Error initializing share service:', error);
      this.isShareSupported = false;
    }
  }

  public async shareCampaign(campaignId: string, title: string, description: string): Promise<ShareResult> {
    const shareUrl = `${window.location.origin}/campaigns/${campaignId}`;
    const shareText = `Check out this campaign: ${title}\n\n${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`;

    return this.share({
      title: `WorldFund - ${title}`,
      text: shareText,
      url: shareUrl
    });
  }

  public async shareTipJar(): Promise<ShareResult> {
    const shareUrl = `${window.location.origin}/tip-jar`;
    const shareText = 'Support me on WorldFund - Send tips with WLD!';

    return this.share({
      title: 'WorldFund - Tip Jar',
      text: shareText,
      url: shareUrl
    });
  }

  public async sharePlatform(): Promise<ShareResult> {
    const shareUrl = window.location.origin;
    const shareText = 'Check out WorldFund - A crowdfunding platform powered by Worldcoin!';

    return this.share({
      title: 'WorldFund - Crowdfunding Platform',
      text: shareText,
      url: shareUrl
    });
  }

  private async share(payload: SharePayload): Promise<ShareResult> {
    try {
      if (this.isShareSupported) {
        // Use MiniKit share
        await MiniKit.commandsAsync.share({
          title: payload.title || 'WorldFund',
          text: payload.text || 'Check out WorldFund!',
          url: payload.url || window.location.origin
        });
        
        console.log('[ShareService] MiniKit share command executed');
        return { success: true };
      } else {
        // Fallback to Web Share API or clipboard
        return this.fallbackShare(payload);
      }
    } catch (error: any) {
      console.error('[ShareService] Share failed:', error);
      return { 
        success: false, 
        error: error.message || 'Share failed' 
      };
    }
  }

  private async fallbackShare(payload: SharePayload): Promise<ShareResult> {
    try {
      // Try Web Share API first
      if (navigator.share) {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: payload.url
        });
        console.log('[ShareService] Web Share API used');
        return { success: true };
      }

      // Fallback to clipboard
      const shareText = `${payload.title}\n\n${payload.text}\n\n${payload.url}`;
      await navigator.clipboard.writeText(shareText);
      console.log('[ShareService] Copied to clipboard');
      return { success: true };
    } catch (error: any) {
      console.error('[ShareService] Fallback share failed:', error);
      return { 
        success: false, 
        error: 'Share not supported on this device' 
      };
    }
  }

  public isSupported(): boolean {
    return this.isShareSupported || !!navigator.share || !!navigator.clipboard;
  }
}

export const shareService = ShareService.getInstance();