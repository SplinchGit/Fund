// src/components/UserDisplay.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { ensService } from '../services/EnsService';

interface UserDisplayProps {
  address: string;
  className?: string;
  showAvatar?: boolean;
  maxLength?: number;
}

interface UserInfo {
  username?: string;
  profilePictureUrl?: string;
  walletAddress?: string;
}

export const UserDisplay: React.FC<UserDisplayProps> = ({ 
  address, 
  className = '', 
  showAvatar = false,
  maxLength = 20
}) => {
  const [displayName, setDisplayName] = useState<string>('');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Cache for username lookups to avoid repeated API calls
  const [usernameCache] = useState<Map<string, UserInfo>>(new Map());

  const truncateAddress = useCallback((addr: string): string => {
    if (!addr) return 'Unknown';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }, []);

  const getUserInfo = useCallback(async (walletAddress: string): Promise<UserInfo | null> => {
    // Check cache first
    if (usernameCache.has(walletAddress)) {
      return usernameCache.get(walletAddress)!;
    }

    let userInfo: UserInfo = { walletAddress };

    try {
      // Priority 1: Try World ID username via MiniKit
      if (typeof window !== 'undefined' && (window as any).MiniKit) {
        try {
          const MiniKit = (window as any).MiniKit;
          if (MiniKit.getUserByAddress && typeof MiniKit.getUserByAddress === 'function') {
            const worldIdUser = await MiniKit.getUserByAddress(walletAddress);
            if (worldIdUser && worldIdUser.username) {
              userInfo.username = worldIdUser.username;
              userInfo.profilePictureUrl = worldIdUser.profilePictureUrl;
              console.log(`[UserDisplay] World ID username found for ${walletAddress}: ${worldIdUser.username}`);
            }
          }
        } catch (miniKitError) {
          console.warn(`[UserDisplay] MiniKit getUserByAddress failed for ${walletAddress}:`, miniKitError);
        }
      }

      // Priority 2: Try ENS resolution if no World ID username
      if (!userInfo.username) {
        try {
          const ensName = await ensService.lookupEnsAddress(walletAddress);
          if (ensName) {
            userInfo.username = ensName;
            console.log(`[UserDisplay] ENS name found for ${walletAddress}: ${ensName}`);
          }
        } catch (ensError) {
          console.warn(`[UserDisplay] ENS lookup failed for ${walletAddress}:`, ensError);
        }
      }

      // Cache the result
      usernameCache.set(walletAddress, userInfo);
      return userInfo;

    } catch (error) {
      console.error(`[UserDisplay] Error getting user info for ${walletAddress}:`, error);
      return { walletAddress };
    }
  }, [usernameCache]);

  useEffect(() => {
    const resolveUserInfo = async () => {
      if (!address || address.length < 42 || !address.startsWith('0x')) {
        console.warn(`[UserDisplay] Invalid address provided: ${address}`);
        setDisplayName(address || 'Unknown');
        setLoading(false);
        return;
      }

      setLoading(true);
      
      try {
        const info = await getUserInfo(address);
        setUserInfo(info);
        
        if (info?.username) {
          // Truncate long usernames
          const username = info.username.length > maxLength 
            ? `${info.username.slice(0, maxLength - 3)}...` 
            : info.username;
          setDisplayName(username);
        } else {
          // Fallback to truncated address
          setDisplayName(truncateAddress(address));
        }
      } catch (error) {
        console.error(`[UserDisplay] Error resolving user info:`, error);
        setDisplayName(truncateAddress(address));
      } finally {
        setLoading(false);
      }
    };

    resolveUserInfo();
  }, [address, getUserInfo, truncateAddress, maxLength]);

  const handleClick = useCallback(() => {
    // Copy address to clipboard on click
    if (address && navigator.clipboard) {
      navigator.clipboard.writeText(address).then(() => {
        console.log(`[UserDisplay] Copied address to clipboard: ${address}`);
      }).catch((err) => {
        console.warn(`[UserDisplay] Failed to copy address to clipboard:`, err);
      });
    }
  }, [address]);

  if (loading) {
    return (
      <span className={`inline-flex items-center ${className}`}>
        {showAvatar && (
          <div className="w-6 h-6 bg-gray-200 rounded-full mr-2 animate-pulse" />
        )}
        <span className="bg-gray-200 rounded h-4 w-20 animate-pulse" />
      </span>
    );
  }

  return (
    <span 
      className={`inline-flex items-center cursor-pointer hover:opacity-75 transition-opacity ${className}`}
      onClick={handleClick}
      title={`${displayName} (${address})\nClick to copy address`}
    >
      {showAvatar && userInfo?.profilePictureUrl && (
        <img 
          src={userInfo.profilePictureUrl} 
          alt={`${displayName} avatar`}
          className="w-6 h-6 rounded-full mr-2 object-cover"
          onError={(e) => {
            // Hide avatar if image fails to load
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      {showAvatar && !userInfo?.profilePictureUrl && (
        <div className="w-6 h-6 bg-gray-300 rounded-full mr-2 flex items-center justify-center text-xs text-gray-600">
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="font-medium">{displayName}</span>
    </span>
  );
};

export default UserDisplay;