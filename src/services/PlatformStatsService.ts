// src/services/PlatformStatsService.ts

import { authService } from './AuthService';

export interface PlatformStats {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalDonations: number;
  totalAmountRaised: number;
  totalUsers: number;
  averageDonationAmount: number;
  topCategories: CategoryStat[];
  recentActivity: ActivityItem[];
  conversionRate: number; // successful campaigns / total campaigns
}

export interface CategoryStat {
  category: string;
  count: number;
  totalRaised: number;
  percentage: number;
}

export interface ActivityItem {
  type: 'campaign_created' | 'donation_made' | 'campaign_completed';
  timestamp: string;
  description: string;
  amount?: number;
  campaignId?: string;
}

export interface AdminUserStats {
  totalUsers: number;
  activeUsers: number; // users with activity in last 30 days
  bannedUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  topDonors: UserStat[];
  topCampaignCreators: UserStat[];
}

export interface UserStat {
  userId: string;
  walletAddress: string;
  ensName?: string;
  totalDonated?: number;
  totalRaised?: number;
  campaignCount?: number;
  lastActivity: string;
}

export interface TimeSeriesData {
  date: string;
  campaigns: number;
  donations: number;
  amount: number;
}

class PlatformStatsService {
  private static instance: PlatformStatsService;
  private readonly API_BASE: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.API_BASE = import.meta.env.VITE_AMPLIFY_API || '';
    console.log('[PlatformStatsService] Service initialized');
  }

  public static getInstance(): PlatformStatsService {
    if (!PlatformStatsService.instance) {
      PlatformStatsService.instance = new PlatformStatsService();
    }
    return PlatformStatsService.instance;
  }

  private async makeAuthenticatedRequest(endpoint: string): Promise<any> {
    const token = await authService.getAccessToken();
    if (!token) {
      throw new Error('Authentication required for platform stats');
    }

    const response = await fetch(`${this.API_BASE}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  public async getPlatformStats(): Promise<PlatformStats> {
    const cacheKey = 'platform_stats';
    const cached = this.getCachedData<PlatformStats>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      console.log('[PlatformStatsService] Fetching platform statistics...');
      
      // For now, return mock data until backend implements these endpoints
      const mockStats: PlatformStats = {
        totalCampaigns: 127,
        activeCampaigns: 45,
        completedCampaigns: 82,
        totalDonations: 1543,
        totalAmountRaised: 45672.34,
        totalUsers: 289,
        averageDonationAmount: 29.60,
        conversionRate: 0.646, // 82/127
        topCategories: [
          { category: 'Technology & Innovation', count: 32, totalRaised: 15234.56, percentage: 25.2 },
          { category: 'Community & Social Causes', count: 28, totalRaised: 12456.78, percentage: 22.0 },
          { category: 'Creative Works', count: 24, totalRaised: 8765.43, percentage: 18.9 },
          { category: 'Health & Wellness', count: 21, totalRaised: 6789.01, percentage: 16.5 },
          { category: 'Small Business & Entrepreneurship', count: 15, totalRaised: 2426.56, percentage: 11.8 },
          { category: 'Other', count: 7, totalRaised: 1000.00, percentage: 5.5 }
        ],
        recentActivity: [
          {
            type: 'donation_made',
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
            description: 'Anonymous donation to "Clean Water Initiative"',
            amount: 50,
            campaignId: 'camp_123'
          },
          {
            type: 'campaign_created',
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            description: 'New campaign "Solar Panels for Schools" created',
            campaignId: 'camp_124'
          },
          {
            type: 'campaign_completed',
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            description: 'Campaign "Emergency Food Relief" reached its goal',
            campaignId: 'camp_122'
          }
        ]
      };

      // In the future, this would be:
      // const stats = await this.makeAuthenticatedRequest('/admin/platform-stats');
      
      this.setCachedData(cacheKey, mockStats);
      return mockStats;
    } catch (error) {
      console.error('[PlatformStatsService] Error fetching platform stats:', error);
      throw error;
    }
  }

  public async getAdminUserStats(): Promise<AdminUserStats> {
    const cacheKey = 'admin_user_stats';
    const cached = this.getCachedData<AdminUserStats>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      console.log('[PlatformStatsService] Fetching admin user statistics...');
      
      // Mock data until backend implementation
      const mockUserStats: AdminUserStats = {
        totalUsers: 289,
        activeUsers: 156,
        bannedUsers: 3,
        newUsersToday: 7,
        newUsersThisWeek: 23,
        newUsersThisMonth: 89,
        topDonors: [
          {
            userId: 'user_1',
            walletAddress: '0x1234...5678',
            ensName: 'cryptophilanthropist.eth',
            totalDonated: 1250.50,
            lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
          },
          {
            userId: 'user_2',
            walletAddress: '0x2345...6789',
            totalDonated: 980.25,
            lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString()
          }
        ],
        topCampaignCreators: [
          {
            userId: 'user_3',
            walletAddress: '0x3456...7890',
            ensName: 'changemaker.eth',
            totalRaised: 5670.80,
            campaignCount: 4,
            lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString()
          }
        ]
      };

      // Future implementation:
      // const userStats = await this.makeAuthenticatedRequest('/admin/user-stats');
      
      this.setCachedData(cacheKey, mockUserStats);
      return mockUserStats;
    } catch (error) {
      console.error('[PlatformStatsService] Error fetching user stats:', error);
      throw error;
    }
  }

  public async getTimeSeriesData(days: number = 30): Promise<TimeSeriesData[]> {
    const cacheKey = `time_series_${days}`;
    const cached = this.getCachedData<TimeSeriesData[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      console.log(`[PlatformStatsService] Fetching time series data for ${days} days...`);
      
      // Generate mock time series data
      const data: TimeSeriesData[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        data.push({
          date: date.toISOString().split('T')[0],
          campaigns: Math.floor(Math.random() * 5) + 1,
          donations: Math.floor(Math.random() * 20) + 5,
          amount: Math.floor(Math.random() * 1000) + 100
        });
      }

      // Future implementation:
      // const data = await this.makeAuthenticatedRequest(`/admin/time-series?days=${days}`);
      
      this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.error('[PlatformStatsService] Error fetching time series data:', error);
      throw error;
    }
  }

  public async refreshStats(): Promise<void> {
    console.log('[PlatformStatsService] Clearing cache and refreshing stats...');
    this.cache.clear();
    
    // Pre-load fresh data
    await Promise.all([
      this.getPlatformStats(),
      this.getAdminUserStats(),
      this.getTimeSeriesData()
    ]);
  }

  public clearCache(): void {
    this.cache.clear();
    console.log('[PlatformStatsService] Cache cleared');
  }
}

export const platformStatsService = PlatformStatsService.getInstance();