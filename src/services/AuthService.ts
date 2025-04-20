// src/services/AuthService.ts
import { z } from 'zod';
import { VerificationLevel } from '@worldcoin/idkit';
import { userStore, UserData } from './UserStore';

// Configuration constants
// --- Debugging log added here ---
console.log("AuthService: Reading VITE_AMPLIFY_API:", import.meta.env.VITE_AMPLIFY_API);
// --- End of debugging log ---
const API_BASE = import.meta.env.VITE_AMPLIFY_API; // <<< Log is ABOVE this line
const CONFIG_ENDPOINT = `${API_BASE}/config`;

// Zod schema for verify endpoint
const VerifySchema = z.object({
  merkle_root: z.string().min(1),
  nullifier_hash: z.string().min(1),
  proof: z.string().min(1),
  verification_level: z.nativeEnum(VerificationLevel),
  action: z.string().min(1),
  signal: z.string().optional(),
});

// Types for backend responses
type VerifySuccess = {
  success: true;
  nullifier_hash: string;
  verification_level: VerificationLevel;
};

type VerifyError = {
  success: false;
  code: string;
  detail: string;
};

export type IVerifiedUser = {
  isVerified: boolean;
  details?: {
    nullifierHash: string;
    merkleRoot: string;
    proof: string;
    verificationLevel: VerificationLevel;
    action: string;
    signal?: string;
    timestamp: number;
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
    // Added check for API_BASE before fetching config
    if (!API_BASE) {
      console.error('API_BASE is not defined, cannot fetch server config.');
      return null; 
    }
    try {
      const response = await fetch(CONFIG_ENDPOINT);
      if (!response.ok) {
        throw new Error(`Config endpoint returned status ${response.status}`);
      }
      const config = await response.json();
      return config;
    } catch (error) {
      console.error('Failed to fetch server config:', error);
      return null;
    }
  }

  public async verifyWithWorldID(
    result: z.infer<typeof VerifySchema>
  ): Promise<IVerifiedUser> {
    // Try to get config from server first
    let serverConfig = null;
    try {
      serverConfig = await this.getServerConfig();
    } catch (error) {
      console.warn('Using client-side config fallback');
    }
    
    // Validate
    const parse = VerifySchema.safeParse(result);
    if (!parse.success) {
      console.error('Invalid verify payload', parse.error.issues);
      return { isVerified: false };
    }

    // Call backend
    let resp: Response;
    try {
      // If server provided a different API endpoint, use it
      const apiEndpoint = serverConfig?.api?.endpoint || API_BASE;

      // Added check before fetch
      if (!apiEndpoint) {
         console.error("API Endpoint is undefined, cannot make verify call.");
         return { isVerified: false };
      }

      resp = await fetch(`${apiEndpoint}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parse.data),
      });
    } catch (e: any) {
      console.error('Network error verifying WorldID:', e);
      return { isVerified: false };
    }

    // Added check for response before calling .json()
    if (!resp) {
       console.error("No response received from fetch.");
       return { isVerified: false };
    }

    const data = await resp.json();
    if (!resp.ok || (data as VerifyError).success === false) {
      console.error('Backend verification failed', data);
      return { isVerified: false };
    }

    // Success!
    const ok = data as VerifySuccess;
    const details = {
      nullifierHash: ok.nullifier_hash,
      merkleRoot: parse.data.merkle_root,
      proof: parse.data.proof,
      verificationLevel: ok.verification_level,
      action: parse.data.action,
      signal: parse.data.signal,
      timestamp: Date.now(),
    };

    // Persist in UserStore
    const userData = userStore.saveUser({
      id: details.nullifierHash,
      verifiedAt: details.timestamp,
      verificationLevel: details.verificationLevel,
    });

    const verifiedUser: IVerifiedUser = {
      isVerified: true,
      details,
      userData,
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(verifiedUser));
    return verifiedUser;
  }

  public getCurrentUser(): IVerifiedUser | null {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return null;

    try {
      const stored = JSON.parse(raw) as IVerifiedUser;
      // expire after 24h
      if (
        !stored.isVerified ||
        Date.now() - (stored.details?.timestamp ?? 0) > 24 * 3600_000
      ) {
        localStorage.removeItem(this.STORAGE_KEY);
        return null;
      }
      // hydrate userData
      if (stored.details?.nullifierHash) {
        stored.userData = userStore.getUser(stored.details.nullifierHash) ?? stored.userData;
      }
      return stored;
    } catch {
      localStorage.removeItem(this.STORAGE_KEY);
      return null;
    }
  }

  public logout() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export const authService = AuthService.getInstance();
export default authService;