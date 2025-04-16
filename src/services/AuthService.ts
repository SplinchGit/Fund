// src/services/AuthService.ts - Refactored

import type { ISuccessResult, VerificationLevel } from '@worldcoin/idkit';
// Assuming UserStore handles user data persistence based on nullifierHash
import { userStore, UserData } from './UserStore'; // MAKE SURE UserStore has the necessary methods (e.g., saveUser, getUser)

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
  private static instance: AuthService;
  // Key for storing verification details in localStorage
  private readonly STORAGE_KEY = "worldfund_user_verification_v2"; // Consider versioning keys, Yeah I have questions.

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
   * (verify-worldid.ts)
   * * This function handles the verification process by:
   * 1. Validating the proof and action.
   * 2. Sending the proof to the backend for verification.
   * 3. Handling the backend response.
   * 4. Saving the verification status to local storage.
   * 5. Updating the user store with the verification details.
   * 6. Returning the verification status.
   * 
   * If successful, updates user store and saves verification status locally.
   *
   * @param result - The success result from the IDKitWidget.
   * @param action - The action string configured in the IDKitWidget (MUST match backend).
   * @param signal - Optional signal data used in the IDKitWidget (MUST match backend if used).
   * @returns Promise<IVerifiedUser> - The verification status.
   */
  public async verifyWithWorldID(
      result: ISuccessResult,
      action: string, // Pass the action from the component using this service
      signal?: string // Pass the signal if used
  ): Promise<IVerifiedUser> {
    console.log("AuthService: Received verification result from IDKit", {
        nullifier_hash_start: result.nullifier_hash?.substring(0, 10),
        merkle_root_start: result.merkle_root?.substring(0, 10),
        verification_level: result.verification_level,
        action: action,
        signal: signal,
        hasProof: !!result.proof
    });

    // --- Basic Client-Side Validation ---
    if (!result.merkle_root || !result.nullifier_hash || !result.proof || !action) {
      console.error("AuthService Error: Missing required fields in verification result or action.", result);
      // Provide a more specific error message if possible
      return { isVerified: false, details: undefined, userData: undefined }; // Return consistent shape
    }

    // --- Backend Verification Call ---
    // This is the CRITICAL step. You need a backend endpoint (e.g., /api/verify-worldid.ts)
    // that takes the proof details and verifies them server-side with Worldcoin's API.
    try {
      console.log("AuthService: Calling backend verification endpoint...");
      const backendResponse = await this.callBackendVerifyAPI({
        merkle_root: result.merkle_root,
        nullifier_hash: result.nullifier_hash,
        proof: result.proof,
        verification_level: result.verification_level,
        action: action, // Send the action ID
        signal: signal, // Send signal if used
      });

      // Check if backend verification was successful
      if (backendResponse.success) {
        console.log("AuthService: Backend verification successful.", backendResponse);

        // --- Verification Successful ---
        const verificationDetails: IWorldIDVerificationDetails = {
          nullifierHash: backendResponse.nullifier_hash, // Use hash confirmed by backend
          merkleRoot: result.merkle_root, // Can store for reference
          proof: result.proof, // Consider if needed long-term, potential privacy implication
          verificationLevel: backendResponse.verification_level, // Use level confirmed by backend
          action: action, // Store the action context
          signal: signal, // Store signal if used
          timestamp: Date.now() // Timestamp of successful verification
        };

        // *** FIX for Line 131 Error ***
        // DEBUG: NEEDS LOOKING AT. PATCHED NOW?
        // Assuming 'saveUser' expects a single object containing user data, including the hash.
        // !!! YOU MUST VERIFY THIS AGAINST YOUR UserStore.ts IMPLEMENTATION !!!
        // Adjust the structure of this object if 'saveUser' expects something different.
        const userDataPayload = {
            nullifierHash: verificationDetails.nullifierHash, // Include the hash
            lastVerified: verificationDetails.timestamp,
            verificationLevel: verificationDetails.verificationLevel,
            // Add any other default user data properties expected by UserData/saveUser
        };
        const userData = userStore.saveUser(userDataPayload); // Pass the single object

        console.log("AuthService: User data saved/updated in store:", userData?.id?.substring(0, 8)); // Assuming userData has an 'id'

        const verifiedUser: IVerifiedUser = {
          isVerified: true,
          details: verificationDetails,
          userData: userData // Include associated app user data
        };

        // Save the successful verification status to local storage for session persistence
        this.saveVerification(verifiedUser);
        console.log("AuthService: Verification status saved to localStorage.");

        return verifiedUser;

      } else {
        // Backend verification failed
        console.error("AuthService Error: Backend verification failed.", backendResponse);
        // Provide specific feedback based on backendResponse.code / backendResponse.detail
        // Example: throw new Error(`Verification Failed: ${backendResponse.detail}`);
        return { isVerified: false, details: undefined, userData: undefined };
      }

    } catch (error: any) {
      console.error("AuthService Error: Error during backend verification call.", error);
      // Handle network errors or other exceptions during the fetch/API call
      // Example: if (error.message === 'Network Error') ...
      return { isVerified: false, details: undefined, userData: undefined };
    }
  }

  /**
   * Placeholder for the actual API call to your backend verification endpoint.
   * Replace this with your actual fetch/axios call.
   *
   * @param requestData - Data to send to the backend.
   * @returns Promise<BackendVerifyResponse | BackendVerifyErrorResponse>
   */
  private async callBackendVerifyAPI(requestData: BackendVerifyRequest): Promise<BackendVerifyResponse | BackendVerifyErrorResponse> {
      // --- ## IMPLEMENT THIS ## ---
      // This function needs to make a POST request to your backend endpoint (e.g., '/api/verify-worldid.ts')
      // Your backend endpoint MUST securely verify the proof with Worldcoin's /verify API.
      console.log("AuthService: Sending data to backend /api/verify:", requestData);

      // Example using fetch:
      try {
          const response = await fetch('/api/verify', { // Replace with your actual API endpoint
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestData),
          });

          const responseData = await response.json();

          if (!response.ok) {
              console.error("AuthService: Backend API returned an error status:", response.status, responseData);
              // Assuming error response matches BackendVerifyErrorResponse structure
              return responseData as BackendVerifyErrorResponse;
              // Or construct a generic error if structure doesn't match
              // return { success: false, code: 'backend_error', detail: responseData.message || `HTTP error! status: ${response.status}` };
          }

          console.log("AuthService: Received successful response from backend:", responseData);
          // Assuming success response matches BackendVerifyResponse structure
          return responseData as BackendVerifyResponse;

      } catch (error: any) {
          console.error("AuthService: Network error or exception calling backend API.", error);
          return { success: false, code: 'network_error', detail: error.message || 'Failed to connect to verification server.' };
      }
  }

  /**
   * Gets the current user's verification status from local storage, checking expiry.
   * Optionally fetches associated user data.
   */
  public async getCurrentUser(): Promise<IVerifiedUser | null> {
    console.log("AuthService: Checking current user verification status...");
    const verificationStatus = this.getVerificationStatusFromStorage(); // Renamed for clarity

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

    // Verification is valid and not expired, try to fetch associated user data
    try {
      console.log("AuthService: Verification valid, fetching user data for nullifier:", verificationStatus.details.nullifierHash.substring(0, 8));
      // *** Verify UserStore has a 'getUser' method that accepts nullifierHash ***
      const userData = userStore.getUser(verificationStatus.details.nullifierHash); // Assuming sync or async

      if (userData) {
        console.log("AuthService: Found associated user data.");
        // Return the full verified user object including app data
        return {
          ...verificationStatus,
          userData: userData
        };
      } else {
        console.warn("AuthService: Valid verification found, but no associated user data in UserStore for nullifier:", verificationStatus.details.nullifierHash.substring(0, 8));
        // Still return as verified, but without specific app user data
        return verificationStatus;
      }
    } catch (error) {
        console.error("AuthService: Error fetching user data from UserStore.", error);
        // Decide how to handle this - return verified without data, or null?
        // Returning verified status without user data might be safer.
        // DEBUG: Check.
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
      // console.log("AuthService: No stored verification found in localStorage."); // Less verbose
      return { isVerified: false };
    }

    try {
      const verification: IVerifiedUser = JSON.parse(stored);
      // Basic check for essential details property
      if (verification.isVerified && verification.details?.nullifierHash && verification.details?.timestamp) {
         // console.log("AuthService: Found stored verification in localStorage."); // Less verbose
         return verification;
      } else {
         console.warn("AuthService: Stored verification data is incomplete or invalid. Clearing.");
         this.clearVerification(); // Clear invalid data
         return { isVerified: false };
      }
    } catch (error) {
      console.error("AuthService: Error parsing stored verification JSON. Clearing.", error);
      this.clearVerification(); // Clear corrupted data
      return { isVerified: false };
    }
  }


  /**
   * Saves verification status to localStorage.
   * DEBUG: Where and how? Important.
   */
  private saveVerification(verification: IVerifiedUser): void {
    if (typeof localStorage !== 'undefined') {
      try {
        // Ensure we only store necessary details if needed, avoid storing raw proof unless required
        const dataToStore = JSON.stringify(verification);
        localStorage.setItem(this.STORAGE_KEY, dataToStore);
        // console.log("AuthService: Verification saved to localStorage."); // Less verbose
      } catch (error) {
        console.error("AuthService: Error saving verification to localStorage.", error);
        // Handle potential storage quota errors
      }
    } else {
         console.warn("AuthService: localStorage not available, cannot save verification.");
    }
  }

  /**
   * Updates user profile data in the UserStore.
   */
  public async updateUserProfile(data: Partial<UserData>): Promise<UserData | null> {
    const verification = this.getVerificationStatusFromStorage(); // Check local storage directly
    if (!verification.isVerified || !verification.details?.nullifierHash) {
      console.warn("AuthService: Cannot update profile - user not verified or nullifier missing.");
      return null;
    }

    try {
        console.log("AuthService: Updating user profile for nullifier:", verification.details.nullifierHash.substring(0, 8));
        // *** Verify UserStore has an 'updateUser' method ***
        // Assuming userStore.updateUser handles finding the user by nullifier and updating
        const updatedUser = userStore.updateUser(verification.details.nullifierHash, data);
        // Optionally update local storage if userData is stored there too
        if(updatedUser) {
            this.saveVerification({ ...verification, userData: updatedUser });
        }
        return updatedUser;
    } catch(error) {
        console.error("AuthService: Error updating user profile in UserStore.", error);
        return null;
    }
  }

  /**
   * Clears verification from localStorage.
   */
  public async logout(): Promise<void> {
    console.log("AuthService: Logging out user.");
    // Optionally: Call a backend logout endpoint if necessary
    this.clearVerification();
    // Optionally: Clear UserStore data associated with the session if needed
    // userStore.clearUserData(nullifierHash_if_available);
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
// Optional default export
export default authService;
