// src/services/UserStore.ts
import { IWorldIDVerification } from './AuthService';

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
   * Create or update a user from World ID verification
   */
  saveUser(verification: IWorldIDVerification): UserData {
    if (!verification.nullifierHash) {
      throw new Error("Missing nullifier hash");
    }
    
    // Check if user already exists
    const existingUser = this.getUser(verification.nullifierHash);
    
    const userData: UserData = {
      ...(existingUser || {}),
      id: verification.nullifierHash,
      verificationLevel: verification.verificationLevel,
      verifiedAt: Date.now()
    };
    
    // Store in memory
    this.users[userData.id] = userData;
    
    // Persist to localStorage
    this.persistUsers();
    
    return userData;
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