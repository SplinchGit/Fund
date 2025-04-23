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
} from 'aws-amplify/auth';

import type { ISuccessResult } from '@worldcoin/idkit';

/// -----------------------------------------------------------------------------
/// ENV VARS REQUIRED AT BUILD-TIME (Amplify Hosting → Environment variables):
///   VITE_AMPLIFY_API    ← your API invoke URL + “/dev”
///   VITE_API_KEY        ← the WorldFundAPI key
/// -----------------------------------------------------------------------------

/** A verified World ID proof (returned by your /verify Lambda) */
export interface IVerifiedUser {
  success: boolean;
  details: ISuccessResult;
}

/** Result of a Cognito registration attempt */
export interface IRegisterResult {
  success: boolean;
  error?: string;
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
  private API_BASE = import.meta.env.VITE_AMPLIFY_API!;
  private API_KEY  = import.meta.env.VITE_API_KEY!;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /** Call your /verify Lambda via API Gateway */
  public async verifyWorldId(details: ISuccessResult): Promise<IVerifiedUser> {
    const res = await fetch(`${this.API_BASE}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.API_KEY,
      },
      body: JSON.stringify(details),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'World ID verification failed');
    }
    return (await res.json()) as IVerifiedUser;
  }

  /** Register in Cognito — no proof required here */
  public async register(
    username: string,
    password: string,
    email: string
  ): Promise<IRegisterResult> {
    try {
      const input: SignUpInput = {
        username,
        password,
        options: { userAttributes: { email } },
      };
      const output = await signUp(input);
      return { success: true, nextStep: output };
    } catch (e: any) {
      console.error('Registration failed:', e);
      return { success: false, error: e.message || 'Sign-up failed' };
    }
  }

  /** Sign in an existing user */
  public async login(
    username: string,
    password: string
  ): Promise<ILoginResult> {
    try {
      const input: SignInInput = { username, password };
      const { isSignedIn, nextStep } = await signIn(input);

      if (isSignedIn) {
        return { success: true };
      }
      if (nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
        return { success: false, requiresConfirmation: true };
      }
      return { success: false, error: 'Sign-in requires additional steps.' };
    } catch (e: any) {
      if (e.name === 'UserNotConfirmedException') {
        return { success: false, requiresConfirmation: true };
      }
      console.error('Sign-in failed:', e);
      return { success: false, error: e.message || 'Sign-in failed' };
    }
  }

  /** Confirm a new user’s signup with their code */
  public async confirmSignUp(
    username: string,
    code: string
  ): Promise<IRegisterResult> {
    try {
      const input: ConfirmSignUpInput = { username, confirmationCode: code };
      await confirmSignUp(input);
      return { success: true };
    } catch (e: any) {
      console.error('Confirmation failed:', e);
      return { success: false, error: e.message || 'Confirmation failed' };
    }
  }

  /** Attach the World ID nullifier hash to the current Cognito user */
  public async attachNullifier(
    nullifier: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const input: UpdateUserAttributesInput = {
        userAttributes: { 'custom:nullifierHash': nullifier },
      };
      await updateUserAttributes(input);
      return { success: true };
    } catch (e: any) {
      console.error('Attach nullifier failed:', e);
      if (e.name === 'NotAuthorizedException') {
        return { success: false, error: 'User not authenticated' };
      }
      return { success: false, error: e.message || 'Attach failed' };
    }
  }

  /** Sign the user out of Cognito */
  public async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      await signOut();
      return { success: true };
    } catch (e: any) {
      console.error('Sign-out failed:', e);
      return { success: false, error: e.message || 'Sign-out failed' };
    }
  }

  /** Optional helper to check current auth status */
  public async checkAuthStatus(): Promise<{ isAuthenticated: boolean; username?: string }> {
    try {
      const { username } = await getCurrentUser();
      return { isAuthenticated: true, username };
    } catch {
      return { isAuthenticated: false };
    }
  }
}

export const cognitoAuth = AuthService.getInstance();
export default AuthService;
