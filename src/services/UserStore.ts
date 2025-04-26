// src/services/UserStore.ts
export interface IWorldIDVerificationDetails {
  nullifierHash: string;
  verificationLevel: string;
  timestamp: number;
}
// Define user data structure
export interface UserData {
  id: string; // The nullifier hash from World ID
  verificationLevel: string;
  verifiedAt: number; // Timestamp
  displayName?: string; // Optional user profile data
  campaigns?: string[]; // IDs of campaigns created by user
}

export class UserStore {
  private users: Record<string, UserData> = {};
  private readonly STORAGE_KEY = "worldfund_users";
  
  constructor() {
    // Load existing users on initialization
    this.loadUsers();
  }
  
  /**
   * Create or update a user from World ID verification data
   * Note: This now takes a UserData object directly, not the full verification details
   */
  saveUser(userData: UserData): UserData {
    if (!userData.id) {
      throw new Error("Missing user ID (nullifier hash)");
    }
    
    // Check if user already exists
    const existingUser = this.getUser(userData.id);
    
    // Merge existing user data with new data if it exists
    const mergedUserData: UserData = {
      ...(existingUser || {}),
      ...userData,
      // Always use the latest timestamp
      verifiedAt: userData.verifiedAt || Date.now()
    };
    
    // Store in memory
    this.users[mergedUserData.id] = mergedUserData;
    
    // Persist to localStorage
    this.persistUsers();
    
    return mergedUserData;
  }
  
  /**
   * Get a user by their World ID nullifier hash
   */
  getUser(worldIdHash: string): UserData | null {
    return this.users[worldIdHash] || null;
  }
  
  /**
   * Update user data
   */
  updateUser(worldIdHash: string, data: Partial<UserData>): UserData | null {
    const user = this.getUser(worldIdHash);
    if (!user) return null;
    
    // Update user data
    const updatedUser = { ...user, ...data };
    this.users[worldIdHash] = updatedUser;
    
    // Persist changes
    this.persistUsers();
    
    return updatedUser;
  }
  
  /**
   * Remove a user
   */
  removeUser(worldIdHash: string): boolean {
    if (!this.users[worldIdHash]) return false;
    
    delete this.users[worldIdHash];
    this.persistUsers();
    
    return true;
  }
  
  /**
   * Get all users (for admin purposes)
   * NOTE: Ensure this is under admin control only, not exposed to regular users.
   * For GDPR compliance, consider adding anonymization or data minimization.
   */
  getAllUsers(): UserData[] {
    return Object.values(this.users);
  }
  
  /**
   * Save to localStorage
   */
  private persistUsers(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.users));
      } catch (error) {
        console.error("Failed to persist users to localStorage:", error);
      }
    }
  }
  
  /**
   * Load from localStorage 
   */
  private loadUsers(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          this.users = JSON.parse(stored);
        }
      } catch (error) {
        console.error("Failed to load users from localStorage:", error);
      }
    }
  }
}

// Create a singleton instance
export const userStore = new UserStore();