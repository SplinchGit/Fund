// src/services/CognitoAuthService.ts
import { signIn, signUp, confirmSignUp, signOut, getCurrentUser } from 'aws-amplify/auth';
import { z } from 'zod';
import { VerificationLevel } from '@worldcoin/idkit';
import { userStore, UserData } from '../services/UserStore';


// World ID verification schema
const VerifySchema = z.object({
  merkle_root: z.string().min(1),
  nullifier_hash: z.string().min(1),
  proof: z.string().min(1),
  action: z.string().min(1),
  signal: z.string().optional(),
});

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
    code?: string;
    detail?: string;
  };
  userData?: UserData;
};

class CognitoAuthService {
  private static instance: CognitoAuthService;
  private WORLD_ID_STORAGE_KEY = 'worldfund_verification_v2';
  private API_BASE = import.meta.env.VITE_AMPLIFY_API;

  private constructor() {
    console.log("CognitoAuthService: Initialized");
  }

  public static getInstance(): CognitoAuthService {
    if (!CognitoAuthService.instance) {
      CognitoAuthService.instance = new CognitoAuthService();
    }
    return CognitoAuthService.instance;
  }

  // Login with Cognito
  public async login(username: string, password: string) {
    try {
      const { isSignedIn, nextStep } = await signIn({ username, password });
      
      if (isSignedIn) {
        return { success: true };
      } else if (nextStep.signInStep === 'CONFIRM_SIGN_UP') {
        return { success: false, requiresConfirmation: true };
      }
      
      return { success: false, error: 'Unknown login state' };
    } catch (error: any) {
      console.error('CognitoAuthService: Login error:', error);
      return { 
        success: false, 
        error: error.message || 'Login failed' 
      };
    }
  }

  // Register with Cognito
  public async register(username: string, password: string, email: string) {
    try {
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username,
        password,
        options: {
          userAttributes: {
            email
          }
        }
      });

      return { 
        success: true, 
        isComplete: isSignUpComplete,
        userId,
        nextStep
      };
    } catch (error: any) {
      console.error('CognitoAuthService: Registration error:', error);
      return { 
        success: false, 
        error: error.message || 'Registration failed' 
      };
    }
  }

  // Confirm registration with code
  public async confirmRegistration(username: string, code: string) {
    try {
      const { isSignUpComplete } = await confirmSignUp({
        username,
        confirmationCode: code
      });
      
      return { success: isSignUpComplete };
    } catch (error: any) {
      console.error('CognitoAuthService: Confirmation error:', error);
      return { 
        success: false, 
        error: error.message || 'Confirmation failed' 
      };
    }
  }

  // Get current Cognito user
  public async getCognitoUser() {
    try {
      const currentUser = await getCurrentUser();
      return { 
        success: true, 
        user: currentUser 
      };
    } catch (error) {
      console.log('CognitoAuthService: No authenticated user');
      return { success: false };
    }
  }

  // Logout
  public async logout() {
    try {
      await signOut();
      
      // Also clear World ID verification
      localStorage.removeItem(this.WORLD_ID_STORAGE_KEY);
      
      return { success: true };
    } catch (error: any) {
      console.error('CognitoAuthService: Logout error:', error);
      return { 
        success: false, 
        error: error.message || 'Logout failed' 
      };
    }
  }

  // World ID verification - leveraging existing functionality
  public async verifyWithWorldID(
    payload: z.infer<typeof VerifySchema>
  ): Promise<IVerifiedUser> {
    console.log("CognitoAuthService: verifyWithWorldID received payload:", payload);

    // Simple placeholder implementation for World ID verification
    try {
      // Validate payload
      const parse = VerifySchema.safeParse(payload);
      if (!parse.success) {
        return {
          isVerified: false,
          details: { code: 'validation_error', detail: 'Invalid payload provided.', timestamp: Date.now() } as any
        };
      }

      // For now, this is a simplified placeholder
      return {
        isVerified: true,
        details: {
          nullifierHash: payload.nullifier_hash,
          merkleRoot: payload.merkle_root,
          proof: payload.proof,
          verificationLevel: VerificationLevel.Device,
          action: payload.action,
          signal: payload.signal,
          timestamp: Date.now()
        }
      };
    } catch (error: any) {
      console.error("CognitoAuthService: World ID verification error:", error);
      return {
        isVerified: false,
        details: {
          code: 'error',
          detail: error.message || 'Verification failed',
          timestamp: Date.now()
        } as any
      };
    }
  }

  // Get World ID verification from local storage
  public getWorldIdVerification(): IVerifiedUser | null {
    const raw = localStorage.getItem(this.WORLD_ID_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const stored = JSON.parse(raw) as IVerifiedUser;
      const expiryTime = (stored.details?.timestamp ?? 0) + (24 * 3600 * 1000);
      if (!stored.isVerified || Date.now() > expiryTime) {
        localStorage.removeItem(this.WORLD_ID_STORAGE_KEY);
        return null;
      }
      return stored;
    } catch (error) {
      localStorage.removeItem(this.WORLD_ID_STORAGE_KEY);
      return null;
    }
  }
}

export const cognitoAuth = CognitoAuthService.getInstance();
export default Login;