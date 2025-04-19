// src/services/AuthService.ts

import { z } from 'zod';
import { VerificationLevel } from '@worldcoin/idkit';
import { userStore, UserData } from './UserStore';

const API_BASE = import.meta.env.VITE_AMPLIFY_API;
if (!API_BASE) {
  throw new Error('Missing env var: VITE_AMPLIFY_API');
}

// Zod schema for your verify endpoint
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

  public async verifyWithWorldID(
    result: z.infer<typeof VerifySchema>
  ): Promise<IVerifiedUser> {
    // Validate
    const parse = VerifySchema.safeParse(result);
    if (!parse.success) {
      console.error('Invalid verify payload', parse.error.issues);
      return { isVerified: false };
    }

    // Call backend
    let resp: Response;
    try {
      resp = await fetch(`${API_BASE}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parse.data),
      });
    } catch (e: any) {
      console.error('Network error verifying WorldID:', e);
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
