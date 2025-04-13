// src/services/AuthService.ts - Issues and Fixes

// ISSUE 1: Verification handling needs more robust error checking
// The verifyWithWorldID method should have better error handling
// and logging to help debug issues.

// ISSUE 2: The current user retrieval functionality doesn't handle 
// errors well or provide detailed debugging information.

// ISSUE 3: No additional validation to ensure the World ID verification
// is properly formatted before saving.

// Here's the corrected implementation:

import type { ISuccessResult } from '@worldcoin/idkit';
import { userStore, UserData } from './UserStore';

// Types for WorldID verification
export interface IWorldIDVerification {
  nullifierHash: string;
  merkleRoot: string;
  proof: string;
  verificationLevel: string;
  timestamp: number;
}

// User state after verification
export interface IVerifiedUser {
  isVerified: boolean;
  details?: IWorldIDVerification;
  userData?: UserData;
}

class AuthService {
  private static instance: AuthService;
  private readonly STORAGE_KEY = "worldfund_user_verification";
  
  private constructor() {
    // Singleton pattern
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Verify World ID proof and store user data
   */
  public async verifyWithWorldID(result: ISuccessResult): Promise<IVerifiedUser> {
    try {
      // Log the incoming verification data for debugging
      console.log("Processing World ID verification:", {
        nullifier_hash: result.nullifier_hash ? `${result.nullifier_hash.substring(0, 10)}...` : undefined,
        merkle_root: result.merkle_root ? `${result.merkle_root.substring(0, 10)}...` : undefined, 
        verification_level: result.verification_level,
        hasProof: !!result.proof
      });
      
      // Validate required fields
      if (!result.nullifier_hash || !result.merkle_root || !result.proof) {
        console.error("Invalid World ID verification - missing required fields");
        throw new Error("Invalid verification data received");
      }
      
      // Check if we already have a valid verification
      const storedVerification = this.getVerificationStatus();
      if (storedVerification.isVerified && storedVerification.details) {
        console.log("Using existing verification");
        return storedVerification;
      }

      // Create verification data
      const verificationData: IWorldIDVerification = {
        nullifierHash: result.nullifier_hash,
        merkleRoot: result.merkle_root,
        proof: result.proof,
        verificationLevel: result.verification_level,
        timestamp: Date.now()
      };
      
      // Save the user to our store
      const userData = userStore.saveUser(verificationData);
      console.log("User saved to store:", userData.id.substring(0, 8));
      
      // Create the verified user response
      const verifiedUser: IVerifiedUser = {
        isVerified: true,
        details: verificationData,
        userData: userData
      };

      // Store the verification locally
      this.saveVerification(verifiedUser);
      console.log("Verification saved to localStorage");
      
      return verifiedUser;
    } catch (error) {
      console.error("Verification error:", error);
      return { isVerified: false };
    }
  }

  /**
   * Get current user verification status
   */
  public async getCurrentUser(): Promise<IVerifiedUser | null> {
    try {
      console.log("Checking for existing user verification");
      const verificationStatus = this.getVerificationStatus();
      
      // If not verified, return null
      if (!verificationStatus.isVerified || !verificationStatus.details) {
        console.log("No valid verification found");
        return null;
      }
      
      // Check if verification is still valid (24 hour expiry)
      const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (
        verificationStatus.details?.timestamp && 
        Date.now() - verificationStatus.details.timestamp <= MAX_AGE
      ) {
        // Fetch associated user data
        if (verificationStatus.details.nullifierHash) {
          console.log("Fetching user data for verification");
          const userData = userStore.getUser(verificationStatus.details.nullifierHash);
          if (userData) {
            console.log("Found user data, verification is valid");
            return {
              ...verificationStatus,
              userData
            };
          }
        }
        
        console.log("No user data found for verification");
        return verificationStatus;
      }
      
      console.log("Verification expired, clearing");
      // Session expired, clear verification
      this.clearVerification();
      return null;
    } catch (error) {
      console.error("Error checking user session:", error);
      return null;
    }
  }

  /**
   * Check if user is currently verified (local check only)
   */
  public getVerificationStatus(): IVerifiedUser {
    if (typeof localStorage === 'undefined') {
      console.log("localStorage not available");
      return { isVerified: false };
    }

    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) {
      console.log("No stored verification found");
      return { isVerified: false };
    }

    try {
      const verification: IVerifiedUser = JSON.parse(stored);
      
      // Check if verification has expired locally
      const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (
        verification.details?.timestamp && 
        Date.now() - verification.details.timestamp > MAX_AGE
      ) {
        console.log("Stored verification has expired");
        this.clearVerification();
        return { isVerified: false };
      }
      
      console.log("Found valid stored verification");
      return verification;
    } catch (error) {
      console.error("Error parsing stored verification:", error);
      return { isVerified: false };
    }
  }

  /**
   * Save verification to localStorage
   */
  private saveVerification(verification: IVerifiedUser): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(verification));
      } catch (error) {
        console.error("Error saving verification to localStorage:", error);
      }
    }
  }

  /**
   * Update user profile data
   */
  public async updateUserProfile(data: Partial<UserData>): Promise<UserData | null> {
    const verification = this.getVerificationStatus();
    if (!verification.isVerified || !verification.details?.nullifierHash) {
      console.log("Cannot update profile - user not verified");
      return null;
    }
    
    console.log("Updating user profile");
    return userStore.updateUser(verification.details.nullifierHash, data);
  }

  /**
   * Clear verification from localStorage and logout
   */
  public async logout(): Promise<void> {
    console.log("Logging out user");
    this.clearVerification();
  }

  /**
   * Clear verification from localStorage
   */
  public clearVerification(): void {
    if (typeof localStorage !== 'undefined') {
      console.log("Clearing verification from localStorage");
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }
}

export const authService = AuthService.getInstance();
export default authService;