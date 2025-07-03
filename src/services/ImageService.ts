// src/services/ImageService.ts
// Service for handling campaign image URLs and display

import { getUrl } from 'aws-amplify/storage';

class ImageService {
  private static instance: ImageService;
  private imageCache = new Map<string, string>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION = 3600000; // 1 hour in milliseconds

  private constructor() {}

  public static getInstance(): ImageService {
    if (!ImageService.instance) {
      ImageService.instance = new ImageService();
    }
    return ImageService.instance;
  }

  /**
   * Get a display URL for a campaign image
   * Handles both S3 paths and already-resolved URLs
   */
  public async getCampaignImageUrl(imagePath: string | undefined): Promise<string | null> {
    if (!imagePath) {
      return null;
    }

    // If it's already a full URL, return as-is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    // Check cache first and if it's still valid
    const now = Date.now();
    if (this.imageCache.has(imagePath)) {
      const expiry = this.cacheExpiry.get(imagePath);
      if (expiry && now < expiry) {
        return this.imageCache.get(imagePath)!;
      } else {
        // Cache expired, remove it
        this.imageCache.delete(imagePath);
        this.cacheExpiry.delete(imagePath);
      }
    }

    try {
      console.log('[ImageService] Getting URL for path:', imagePath);
      
      // Get the signed URL from Amplify Storage
      const urlResult = await getUrl({
        path: imagePath,
        options: {
          expiresIn: 3600 // 1 hour cache
        }
      });

      const displayUrl = urlResult.url.toString();
      
      // Cache the result with expiry
      this.imageCache.set(imagePath, displayUrl);
      this.cacheExpiry.set(imagePath, now + this.CACHE_DURATION);
      
      console.log('[ImageService] Generated display URL:', displayUrl);
      return displayUrl;
    } catch (error) {
      console.error('[ImageService] Failed to get image URL for path:', imagePath, error);
      return null;
    }
  }

  /**
   * Get a thumbnail-sized image URL (for cards)
   * For now, returns the same URL but could be extended for thumbnail generation
   */
  public async getThumbnailUrl(imagePath: string | undefined): Promise<string | null> {
    return this.getCampaignImageUrl(imagePath);
  }

  /**
   * Validate if an image path looks valid
   */
  public isValidImagePath(imagePath: string | undefined): boolean {
    if (!imagePath) return false;
    
    // Check if it's a URL or S3 path
    return (
      imagePath.startsWith('http://') || 
      imagePath.startsWith('https://') || 
      imagePath.startsWith('public/') ||
      imagePath.startsWith('campaign-images/')
    );
  }

  /**
   * Get fallback placeholder image URL
   */
  public getFallbackImageUrl(width: number = 400, height: number = 200): string {
    return `https://placehold.co/${width}x${height}/e5e7eb/9aa0a6?text=No+Image`;
  }

  /**
   * Clear the image cache (useful for memory management)
   */
  public clearCache(): void {
    this.imageCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Remove expired entries from cache
   */
  public cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [path, expiry] of this.cacheExpiry.entries()) {
      if (now >= expiry) {
        this.imageCache.delete(path);
        this.cacheExpiry.delete(path);
      }
    }
  }

  /**
   * Preload multiple images (useful for campaign lists)
   */
  public async preloadImages(imagePaths: (string | undefined)[]): Promise<void> {
    const validPaths = imagePaths.filter(this.isValidImagePath);
    
    // Load all images in parallel
    const results = await Promise.allSettled(
      validPaths.map(path => this.getCampaignImageUrl(path))
    );

    // Log any failures for debugging
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn('[ImageService] Failed to preload image:', validPaths[index], result.reason);
      }
    });
  }

  /**
   * Get cache statistics for debugging
   */
  public getCacheStats(): { size: number; items: string[] } {
    return {
      size: this.imageCache.size,
      items: Array.from(this.imageCache.keys())
    };
  }

  /**
   * Force refresh an image URL (bypass cache)
   */
  public async refreshImageUrl(imagePath: string): Promise<string | null> {
    // Remove from cache first
    this.imageCache.delete(imagePath);
    this.cacheExpiry.delete(imagePath);
    
    // Get fresh URL
    return this.getCampaignImageUrl(imagePath);
  }
}

export const imageService = ImageService.getInstance();

// Clean up expired cache entries every 30 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    imageService.cleanupExpiredCache();
  }, 30 * 60 * 1000);
}