// src/services/AuthService.ts - Refactored

import type { ISuccessResult, VerificationLevel } from '@worldcoin/idkit';
// Assuming UserStore handles user data persistence based on nullifierHash
import { userStore, UserData } from './UserStore'; // MAKE SURE UserStore has the necessary methods (e.g., saveUser, getUser, updateUser)

// Interface for the data expected by your backend verification endpoint
interface BackendVerifyRequest {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: VerificationLevel;
  action: string; // Action ID used in the IDKitWidget
  signal?: string; // Optional: Signal data if used
}

// Interface for the expected successful response from your backend
interface BackendVerifyResponse {
  success: true;
  nullifier_hash: string; // Backend should return the validated nullifier hash
  verification_level: VerificationLevel;
}

// Interface for the expected error response from your backend
interface BackendVerifyErrorResponse {
  success: false;
  code: string; // e.g., 'verification_failed', 'invalid_proof', 'network_error'
  detail: string;
}

// Interface for the data stored locally after successful verification
// Added action and signal for potential future use or auditing
export interface IWorldIDVerificationDetails {
  nullifierHash: string;
  merkleRoot: string;
  proof: string; // Consider if storing the raw proof long-term is necessary
  verificationLevel: VerificationLevel;
  action: string; // Store the action this proof was for
  signal?: string; // Store the signal if provided
  timestamp: number; // Timestamp of successful verification *by your backend*
}

// User state after verification
export interface IVerifiedUser {
  isVerified: boolean;
  details?: IWorldIDVerificationDetails;
  userData?: UserData; // Associated application user data
}

class AuthService {
  // Remove duplicate stub methods that threw errors
  // getCurrentUser() { throw new Error('Method not implemented.'); }
  // logout() { throw new Error('Method not implemented.'); }

  private static instance: AuthService;
  // Key for storing verification details in localStorage
  private readonly STORAGE_KEY = "worldfund_user_verification_v2"; // Consider versioning keys as needed

  private constructor() {
    // Private constructor for Singleton pattern
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Verifies the World ID proof by sending it to the backend verification endpoint.
   *
   * @param result - The success result from the IDKitWidget.
   * @param action - The action string configured in the IDKitWidget (MUST match backend).
   * @param signal - Optional signal data used in the IDKitWidget (MUST match backend if used).
   * @returns Promise<IVerifiedUser> - The verification status.
   */
  public async verifyWithWorldID(
    result: ISuccessResult,
    action: string,
    signal?: string
  ): Promise<IVerifiedUser> {
    console.log("AuthService: Received verification result from IDKit", {
      nullifier_hash_start: result.nullifier_hash?.substring(0, 10),
      merkle_root_start: result.merkle_root?.substring(0, 10),
      verification_level: result.verification_level,
      action: action,
      signal: signal,
      hasProof: !!result.proof,
    });

    // --- Basic Client-Side Validation ---
    if (!result.merkle_root || !result.nullifier_hash || !result.proof || !action) {
      console.error("AuthService Error: Missing required fields in verification result or action.", result);
      return { isVerified: false, details: undefined, userData: undefined };
    }

    // --- Backend Verification Call ---
    try {
      console.log("AuthService: Calling backend verification endpoint...");
      const backendResponse = await this.callBackendVerifyAPI({
        merkle_root: result.merkle_root,
        nullifier_hash: result.nullifier_hash,
        proof: result.proof,
        verification_level: result.verification_level,
        action: action,
        signal: signal,
      });

      if (backendResponse.success) {
        console.log("AuthService: Backend verification successful.", backendResponse);

        // --- Verification Successful ---
        const verificationDetails: IWorldIDVerificationDetails = {
          nullifierHash: backendResponse.nullifier_hash, // Use hash confirmed by backend
          merkleRoot: result.merkle_root, // For reference
          proof: result.proof, // Consider implications of storing raw proof
          verificationLevel: backendResponse.verification_level, // Use level confirmed by backend
          action: action,
          signal: signal,
          timestamp: Date.now(), // Mark the time of successful verification
        };

        // Save user data via UserStore (verify that userStore.saveUser accepts an object with these properties)
        const userDataPayload = {
          id: verificationDetails.nullifierHash, // Using nullifierHash as unique ID
          verifiedAt: verificationDetails.timestamp,
          verificationLevel: verificationDetails.verificationLevel,
        };
        const userData = userStore.saveUser(userDataPayload); // Adjust payload structure if needed

        console.log("AuthService: User data saved/updated in store:", userData?.id?.substring(0, 8));

        const verifiedUser: IVerifiedUser = {
          isVerified: true,
          details: verificationDetails,
          userData: userData,
        };

        // Save the successful verification status to local storage
        this.saveVerification(verifiedUser);
        console.log("AuthService: Verification status saved to localStorage.");

        return verifiedUser;
      } else {
        console.error("AuthService Error: Backend verification failed.", backendResponse);
        return { isVerified: false, details: undefined, userData: undefined };
      }
    } catch (error: any) {
      console.error("AuthService Error: Error during backend verification call.", error);
      return { isVerified: false, details: undefined, userData: undefined };
    }
  }

  /**
   * Placeholder for the actual API call to your backend verification endpoint.
   *
   * @param requestData - Data to send to the backend.
   * @returns Promise<BackendVerifyResponse | BackendVerifyErrorResponse>
   */
  private async callBackendVerifyAPI(
    requestData: BackendVerifyRequest
  ): Promise<BackendVerifyResponse | BackendVerifyErrorResponse> {
    console.log("AuthService: Sending data to backend /api/verify:", requestData);

    try {
      // FIXED: Correctly formatted fetch call
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error("AuthService: Backend API returned an error status:", response.status, responseData);
        return responseData as BackendVerifyErrorResponse;
      }

      console.log("AuthService: Received successful response from backend:", responseData);
      return responseData as BackendVerifyResponse;
    } catch (error: any) {
      console.error("AuthService: Network error or exception calling backend API.", error);
      return { success: false, code: 'network_error', detail: error.message || 'Failed to connect to verification server.' };
    }
  }

  /**
   * Gets the current user's verification status from local storage, checking expiry.
   */
  public async getCurrentUser(): Promise<IVerifiedUser | null> {
    console.log("AuthService: Checking current user verification status...");
    const verificationStatus = this.getVerificationStatusFromStorage();

    if (!verificationStatus.isVerified || !verificationStatus.details) {
      console.log("AuthService: No valid verification found in storage.");
      return null;
    }

    // Check expiry (e.g., 24 hours)
    const MAX_AGE_MS = 24 * 60 * 60 * 1000;
    const isExpired = Date.now() - verificationStatus.details.timestamp > MAX_AGE_MS;

    if (isExpired) {
      console.log("AuthService: Stored verification has expired. Clearing.");
      this.clearVerification();
      return null;
    }

    try {
      console.log("AuthService: Verification valid, fetching user data for nullifier:",
        verificationStatus.details.nullifierHash.substring(0, 8));
      // Verify UserStore has a 'getUser' method that accepts the nullifierHash
      const userData = userStore.getUser(verificationStatus.details.nullifierHash);

      if (userData) {
        console.log("AuthService: Found associated user data.");
        return { ...verificationStatus, userData: userData };
      } else {
        console.warn("AuthService: Valid verification found, but no associated user data in UserStore for nullifier:",
          verificationStatus.details.nullifierHash.substring(0, 8));
        return verificationStatus;
      }
    } catch (error) {
      console.error("AuthService: Error fetching user data from UserStore.", error);
      return verificationStatus;
    }
  }

  /**
   * Reads and parses verification status directly from localStorage.
   * Does NOT check expiry here - expiry check is done in getCurrentUser.
   * @returns IVerifiedUser - Parsed status or { isVerified: false }
   */
  private getVerificationStatusFromStorage(): IVerifiedUser {
    if (typeof localStorage === 'undefined') {
      console.warn("AuthService: localStorage not available.");
      return { isVerified: false };
    }

    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) {
      return { isVerified: false };
    }

    try {
      const verification: IVerifiedUser = JSON.parse(stored);
      if (verification.isVerified && verification.details?.nullifierHash && verification.details?.timestamp) {
        return verification;
      } else {
        console.warn("AuthService: Stored verification data is incomplete or invalid. Clearing.");
        this.clearVerification();
        return { isVerified: false };
      }
    } catch (error) {
      console.error("AuthService: Error parsing stored verification JSON. Clearing.", error);
      this.clearVerification();
      return { isVerified: false };
    }
  }

  /**
   * Saves verification status to localStorage.
   */
  private saveVerification(verification: IVerifiedUser): void {
    // FIXED: Correct the check for localStorage availability.
    if (typeof localStorage !== 'undefined') {
      try {
        const dataToStore = JSON.stringify(verification);
        localStorage.setItem(this.STORAGE_KEY, dataToStore);
      } catch (error) {
        console.error("AuthService: Error saving verification to localStorage.", error);
      }
    } else {
      console.warn("AuthService: localStorage not available, cannot save verification.");
    }
  }

  /**
   * Updates user profile data in the UserStore.
   */
  public async updateUserProfile(data: Partial<UserData>): Promise<UserData | null> {
    const verification = this.getVerificationStatusFromStorage();
    if (!verification.isVerified || !verification.details?.nullifierHash) {
      console.warn("AuthService: Cannot update profile - user not verified or nullifier missing.");
      return null;
    }

    try {
      console.log("AuthService: Updating user profile for nullifier:",
        verification.details.nullifierHash.substring(0, 8));
      const updatedUser = userStore.updateUser(verification.details.nullifierHash, data);
      if (updatedUser) {
        this.saveVerification({ ...verification, userData: updatedUser });
      }
      return updatedUser;
    } catch (error) {
      console.error("AuthService: Error updating user profile in UserStore.", error);
      return null;
    }
  }

  /**
   * Logs out the user by clearing verification from localStorage.
   */
  public async logout(): Promise<void> {
    console.log("AuthService: Logging out user.");
    this.clearVerification();
    // Optionally clear UserStore data if needed.
  }

  /**
   * Removes the verification item from localStorage.
   */
  public clearVerification(): void {
    if (typeof localStorage !== 'undefined') {
      console.log("AuthService: Clearing verification from localStorage.");
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }
}

// Export the singleton instance
export const authService = AuthService.getInstance();
export default authService;
