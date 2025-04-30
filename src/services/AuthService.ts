// src/services/AuthService.ts

import {
  fetchAuthSession,
  getCurrentUser,
  signUp,
  signIn,
  confirmSignUp,
  updateUserAttributes,
  signOut,
} from '@aws-amplify/auth';
import type { ISuccessResult } from '@worldcoin/idkit';

/// -----------------------------------------------------------------------------
/// ENV VARS REQUIRED AT BUILD-TIME (Amplify Hosting → Environment variables):
///   VITE_AMPLIFY_API    ← API Gateway invoke URL (e.g. https://xyz.execute-api.region.amazonaws.com/dev)
///   VITE_API_KEY        ← the API key for your REST endpoint (if required)
/// -----------------------------------------------------------------------------

/**
 * A verified World ID proof (returned by your /verify Lambda)
 */
export interface IVerifiedUser {
  success: boolean;
  details: ISuccessResult;
}

/**
 * Result of a Cognito registration attempt
 */
export interface IRegisterResult {
  success: boolean;
  error?: string;
  nextStep?: any;
}

/**
 * Result of a Cognito login attempt
 */
export interface ILoginResult {
  success: boolean;
  requiresConfirmation?: boolean;
  error?: string;
}

class AuthService {
  private static instance: AuthService;
  private API_BASE = import.meta.env.VITE_AMPLIFY_API!;
  private API_KEY = import.meta.env.VITE_API_KEY;

  private constructor() {
    if (!this.API_BASE) console.error('Missing VITE_AMPLIFY_API');
    if (!this.API_KEY) console.warn('Missing VITE_API_KEY');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Send World ID proof details to backend for server-side verification
   */
  public async verifyWorldId(details: ISuccessResult): Promise<IVerifiedUser> {
    const session = await fetchAuthSession();
    const idTokenObj = session.tokens?.idToken;
    if (!idTokenObj) throw new Error('No ID token available');
    const token = idTokenObj.toString();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    if (this.API_KEY) headers['x-api-key'] = this.API_KEY;

    const res = await fetch(`${this.API_BASE}/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify(details),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'World ID verification failed');
    }
    return (await res.json()) as IVerifiedUser;
  }

  /**
   * Register a new user in Cognito
   */
  public async register(
    username: string,
    password: string,
    email: string
  ): Promise<IRegisterResult> {
    try {
      const nextStep = await signUp({
        username,
        password,
        options: { userAttributes: { email } },
      });
      return { success: true, nextStep };
    } catch (e: any) {
      console.error('Registration failed:', e);
      return { success: false, error: e.message || 'Sign-up failed' };
    }
  }

  /**
   * Sign in an existing Cognito user
   */
  public async login(
    username: string,
    password: string
  ): Promise<ILoginResult> {
    try {
      const result = await signIn({ username, password });
      if (result.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
        return { success: false, requiresConfirmation: true };
      }
      return { success: true };
    } catch (e: any) {
      if (e.name === 'UserNotConfirmedException') {
        return { success: false, requiresConfirmation: true };
      }
      console.error('Sign-in failed:', e);
      return { success: false, error: e.message || 'Sign-in failed' };
    }
  }

  /**
   * Confirm a newly-registered user with their confirmation code
   */
  public async confirmSignUp(
    username: string,
    code: string
  ): Promise<IRegisterResult> {
    try {
      await confirmSignUp({ username, confirmationCode: code });
      return { success: true };
    } catch (e: any) {
      console.error('Confirmation failed:', e);
      return { success: false, error: e.message || 'Confirmation failed' };
    }
  }

  /**
   * Persist World ID nullifier hash to Cognito user attributes
   */
  public async attachNullifier(
    nullifier: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await updateUserAttributes({ 
        userAttributes: { 'custom:nullifierHash': nullifier }
      });
      return { success: true };
    } catch (e: any) {
      console.error('Attach nullifier failed:', e);
      if (e.name === 'NotAuthorizedException') {
        return { success: false, error: 'User not authenticated' };
      }
      return { success: false, error: e.message || 'Attach failed' };
    }
  }

  /**
   * Sign out the current Cognito user
   */
  public async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      await signOut();
      return { success: true };
    } catch (e: any) {
      console.error('Sign-out failed:', e);
      return { success: false, error: e.message || 'Sign-out failed' };
    }
  }

  /**
   * Check if a user is currently authenticated
   */
  public async checkAuthStatus(): Promise<{ isAuthenticated: boolean; username?: string }> {
    try {
      const { username } = await getCurrentUser();
      return { isAuthenticated: true, username };
    } catch {
      return { isAuthenticated: false };
    }
  }
}

export const authService = AuthService.getInstance();
export default AuthService;
