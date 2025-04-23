// src/services/AuthService.ts

// Import specific functions from aws-amplify/auth for v6+
import {
  signUp,
  signIn,
  confirmSignUp,
  getCurrentUser,
  updateUserAttributes,
  signOut,
  type SignUpInput,
  type SignUpOutput,
  type SignInInput,
  type ConfirmSignUpInput,
  type UpdateUserAttributesInput,
  // You might need specific types for errors if you want more granular handling
} from 'aws-amplify/auth';
import type { ISuccessResult } from '@worldcoin/idkit';

/** A verified World ID proof (used later, not at sign-up) */
export interface IVerifiedUser {
  success: boolean;
  details: ISuccessResult;
}

/** Result of a Cognito registration attempt */
export interface IRegisterResult {
  success: boolean;
  error?: string;
  // The nextStep type in v6 is SignUpOutput
  nextStep?: SignUpOutput;
}

/** Result of a Cognito login attempt */
export interface ILoginResult {
  success: boolean;
  requiresConfirmation?: boolean;
  error?: string;
}

class AuthService {
  private static instance: AuthService;
  // Ensure VITE_AMPLIFY_API is correctly defined in your .env file
  private API_BASE = import.meta.env.VITE_AMPLIFY_API!;

  private constructor() {}

  public static getInstance(): AuthService {
      if (!AuthService.instance) {
          AuthService.instance = new AuthService();
      }
      return AuthService.instance;
  }

  /** (Later) Verify a World ID proof server-side */
  public async verifyWorldId(details: ISuccessResult): Promise<IVerifiedUser> {
      const res = await fetch(`${this.API_BASE}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(details),
      });
      if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          // Use the error message from the body if available
          throw new Error(body?.error || 'World ID verification failed');
      }
      // Assuming the endpoint returns an object matching IVerifiedUser
      return (await res.json()) as IVerifiedUser;
  }

  /** Register in Cognito — no proof required here */
  public async register(
      username: string,
      password: string,
      email: string
  ): Promise<IRegisterResult> {
      try {
          // v6+ signature uses an object argument
          const input: SignUpInput = {
              username,
              password,
              options: {
                  userAttributes: { email },
                  // Add autoSignIn if desired, e.g.:
                  // autoSignIn: true
              }
          };
          const output = await signUp(input);
          return { success: true, nextStep: output };
      } catch (e: any) {
          // It's good practice to log the actual error for debugging
          console.error("Registration failed:", e);
          return { success: false, error: e.message || 'Sign-up failed' };
      }
  }

  /** Sign in an existing user */
  public async login(
      username: string,
      password: string
  ): Promise<ILoginResult> {
      try {
          // v6+ signature uses an object argument
          const input: SignInInput = { username, password };
          const { isSignedIn, nextStep } = await signIn(input);

          if (isSignedIn) {
              return { success: true };
          } else {
              // Handle cases like needing confirmation, MFA setup, etc.
              // Check nextStep.signInStep if needed for more complex flows
              if (nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
                  console.log('Sign in requires confirmation');
                   // Resend code if needed: await resendSignUpCode({ username });
                  return { success: false, requiresConfirmation: true };
              }
              // Handle other potential next steps if necessary
              console.error("Sign in attempt resulted in next step:", nextStep);
              return { success: false, error: 'Sign-in requires additional steps.' };
          }

      } catch (e: any) {
           // Specific check for UserNotConfirmedException remains similar
          if (e.name === 'UserNotConfirmedException') {
              console.log('Sign in caught UserNotConfirmedException');
               // Optionally resend code here too: await resendSignUpCode({ username });
              return { success: false, requiresConfirmation: true };
          }
          console.error("Sign-in failed:", e);
          return { success: false, error: e.message || 'Sign-in failed' };
      }
  }

  /** Confirm a new user’s signup with their confirmation code */
  public async confirmSignUp(
      username: string,
      code: string
  ): Promise<IRegisterResult> { // Reusing IRegisterResult as it fits
      try {
          // v6+ signature uses an object argument
          const input: ConfirmSignUpInput = {
              username,
              confirmationCode: code
          };
          await confirmSignUp(input);
          return { success: true };
      } catch (e: any) {
          console.error("Confirmation failed:", e);
          return { success: false, error: e.message || 'Confirmation failed' };
      }
  }

  /** After verifying proof, attach the nullifierHash to the current user */
  public async attachNullifier(
      nullifier: string
  ): Promise<{ success: boolean; error?: string }> {
      try {
          // No need to fetch the user first in v6 for this operation
          const input: UpdateUserAttributesInput = {
              userAttributes: {
                  'custom:nullifierHash': nullifier,
              }
          };
          await updateUserAttributes(input);
          return { success: true };
      } catch (e: any) {
          console.error("Attach nullifier failed:", e);
          // Check if the error is related to authentication state
          if (e.name === 'NotAuthorizedException' || e.message?.includes('logged out')) {
               return { success: false, error: 'User is not authenticated.' };
          }
          return { success: false, error: e.message || 'Attach failed' };
      }
  }

  /** Sign the user out of Cognito */
  public async logout(): Promise<{ success: boolean; error?: string }> {
      try {
          // v6+ signature - signOut() might take an options object { global: true } for everywhere
          await signOut(/* { global: true } */);
          return { success: true };
      } catch (e: any) {
          console.error("Sign-out failed:", e);
          return { success: false, error: e.message || 'Sign-out failed' };
      }
  }

   /** Helper to check current auth status (optional but useful) */
   public async checkAuthStatus(): Promise<{isAuthenticated: boolean, username?: string}> {
      try {
          const { username, userId } = await getCurrentUser();
          console.log(`User ${username} (${userId}) is authenticated.`);
          return { isAuthenticated: true, username };
      } catch (error) {
          console.log("User is not authenticated.");
          return { isAuthenticated: false };
      }
  }
}

export const cognitoAuth = AuthService.getInstance();
export default AuthService; // Exporting class remains the same