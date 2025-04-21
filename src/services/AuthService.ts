// src/services/AuthService.ts
import { z } from 'zod';
// Keep VerificationLevel import as the *backend response* uses it
import { VerificationLevel } from '@worldcoin/idkit';
import { userStore, UserData } from './UserStore';

// --- Config constants ---
console.log("AuthService: Reading VITE_AMPLIFY_API:", import.meta.env.VITE_AMPLIFY_API);
const API_BASE = import.meta.env.VITE_AMPLIFY_API;
const CONFIG_ENDPOINT = `${API_BASE}/config`;

// ***** MODIFIED Zod Schema *****
const VerifySchema = z.object({
  merkle_root: z.string().min(1),
  nullifier_hash: z.string().min(1),
  proof: z.string().min(1),
  // REMOVED: verification_level: z.nativeEnum(VerificationLevel),
  action: z.string().min(1),
  signal: z.string().optional(),
});

// --- Backend response types (Keep as is) ---
type VerifySuccess = {
  success: true;
  nullifier_hash: string;
  verification_level: VerificationLevel; // Backend tells us the level!
};
type VerifyError = {
  success: false;
  code: string;
  detail: string;
};

// --- IVerifiedUser type (Keep as is) ---
export type IVerifiedUser = {
  isVerified: boolean;
  details?: {
    nullifierHash: string;
    merkleRoot: string;
    proof: string;
    verificationLevel: VerificationLevel; // This comes from backend response
    action: string;
    signal?: string;
    timestamp: number;
    code?: string; // Error code
    detail?: string; // Error detail
  };
  userData?: UserData;
};

class AuthService {
  private static instance: AuthService;
  private STORAGE_KEY = 'worldfund_verification_v2';

  private constructor() {}

  public static getInstance() {
    return this.instance ?? (this.instance = new AuthService());
  }

  private async getServerConfig(): Promise<any> {
    if (!API_BASE) {
      console.error('AuthService: API_BASE is not defined, cannot fetch server config.');
      return null;
    }
    try {
      const response = await fetch(CONFIG_ENDPOINT);
      if (!response.ok) {
        throw new Error(`Config endpoint returned status ${response.status}`);
      }
      const config = await response.json();
      console.log("AuthService: Fetched server config:", config);
      return config;
    } catch (error) {
      console.error('AuthService: Failed to fetch server config:', error);
      return null;
    }
  }

  // Function signature still expects ONE object, matching the *modified* schema
  public async verifyWithWorldID(
    payload: z.infer<typeof VerifySchema> // Type matches the *modified* schema
  ): Promise<IVerifiedUser> {
    console.log("AuthService: verifyWithWorldID received payload:", payload);

    // Validate payload against the *modified* schema
    const parse = VerifySchema.safeParse(payload);
    if (!parse.success) {
      console.error('AuthService: Invalid verify payload received:', payload, parse.error.format());
      return {
        isVerified: false,
        details: { code: 'validation_error', detail: 'Invalid payload provided.', timestamp: Date.now() } as any
      };
    }
    const validatedData = parse.data; // Has no verification_level now
    console.log("AuthService: Payload validated successfully:", validatedData);

    // --- Server config fetching logic (Keep as is) ---
    let serverConfig = null;
    try { serverConfig = await this.getServerConfig(); } catch (error) { console.warn('AuthService: Could not fetch server config, using client fallback.'); }


    // Call backend API
    let resp: Response | undefined;
    try {
      const apiEndpoint = serverConfig?.api?.endpoint || API_BASE;
      if (!apiEndpoint) { throw new Error("API Endpoint is undefined"); } // Throw error instead of return

      console.log(`AuthService: Sending verification request to ${apiEndpoint}/verify`);
      resp = await fetch(`${apiEndpoint}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedData), // Send validated data (no level)
      });
      console.log(`AuthService: Received response status ${resp.status} from verify endpoint`);

    } catch (e: any) {
      console.error('AuthService: Network or config error verifying WorldID:', e);
      return { isVerified: false, details: { code: e.message.includes("API Endpoint") ? 'config_error' : 'network_error', detail: e.message || 'Request failed.', timestamp: Date.now() } as any };
    }

    // Process response
    if (!resp) { /* Should be caught above */ return { isVerified: false, details: { code: 'internal_error', detail: 'No response.', timestamp: Date.now() } as any }; }

    let data: any;
    try { data = await resp.json(); } catch (err) {
        console.error("AuthService: Failed to parse JSON response:", err);
        return { isVerified: false, details: { code: 'invalid_json', detail: `Failed to parse server response (Status: ${resp.status}).`, timestamp: Date.now() } as any };
    }

    // Check backend failure
    if (!resp.ok || (data as VerifyError).success === false) {
      const errorData = data as VerifyError;
      console.error('AuthService: Backend verification failed:', errorData);
      return {
          isVerified: false,
          details: { // Include original data + error info
              nullifierHash: validatedData.nullifier_hash,
              merkleRoot: validatedData.merkle_root,
              proof: validatedData.proof,
              action: validatedData.action,
              signal: validatedData.signal,
              code: errorData.code || `http_${resp.status}`,
              detail: errorData.detail || `Verification failed with status ${resp.status}`,
              timestamp: Date.now()
          } as any // Cast needed as verificationLevel is missing
       };
    }

    // --- Verification Success ---
    console.log("AuthService: Backend verification successful:", data);
    const ok = data as VerifySuccess; // ok now contains the verification_level from backend

    // Construct success details object
    const details: IVerifiedUser['details'] = { // Use type for safety
      nullifierHash: ok.nullifier_hash,
      merkleRoot: validatedData.merkle_root, // from original payload
      proof: validatedData.proof,           // from original payload
      verificationLevel: ok.verification_level, // ***** FROM BACKEND RESPONSE *****
      action: validatedData.action,         // from original payload
      signal: validatedData.signal,         // from original payload
      timestamp: Date.now(),
      code: undefined, // Ensure no error fields
      detail: undefined,
    };

    // Persist user data
    const userData = userStore.saveUser({
      id: details.nullifierHash,
      verifiedAt: details.timestamp,
      verificationLevel: details.verificationLevel, // Use level from backend
    });
    console.log("AuthService: User data saved/updated:", userData);

    const verifiedUser: IVerifiedUser = { isVerified: true, details, userData };

    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(verifiedUser)); console.log("AuthService: Verification details stored."); } catch (storageError) { console.error("AuthService: Failed to write to localStorage:", storageError); }

    return verifiedUser;
  } // End of verifyWithWorldID function

  // getCurrentUser function (with fix for return value)
  public getCurrentUser(): IVerifiedUser | null {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) {
        return null; // Returns null if no item - OK
    }
    try {
      const stored = JSON.parse(raw) as IVerifiedUser;
      const expiryTime = (stored.details?.timestamp ?? 0) + (24 * 3600 * 1000);
      if (!stored.isVerified || Date.now() > expiryTime ) {
        console.log("AuthService: Stored user verification expired or invalid. Clearing.");
        localStorage.removeItem(this.STORAGE_KEY);
        return null; // Returns null if expired/invalid - OK
      }
      if (stored.details?.nullifierHash) {
        stored.userData = userStore.getUser(stored.details.nullifierHash) ?? stored.userData;
      }
      return stored; // Returns the valid user object - OK
    } catch (error) {
      console.error("AuthService: Error parsing user from localStorage:", error);
      localStorage.removeItem(this.STORAGE_KEY);
      return null; // Explicitly return null if any error occurred in the try block - OK
    }
  } // End of getCurrentUser function

  // ***** LOGOUT FUNCTION ADDED HERE *****
  public logout() {
    console.log("AuthService: logout called. Clearing user from localStorage.");
    localStorage.removeItem(this.STORAGE_KEY);
    // Add any other related logout logic if needed (e.g., clearing userStore state)
  }
  // ***** END OF LOGOUT FUNCTION *****

} // End of AuthService class

export const authService = AuthService.getInstance();