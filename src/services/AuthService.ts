// src/services/AuthService.ts

import {
  signUp,
  signIn,
  confirmSignUp,
  updateUserAttributes,
  signOut,
  getCurrentUser,
  fetchAuthSession
} from 'aws-amplify/auth';
import type { ISuccessResult } from '@worldcoin/idkit';

/// -----------------------------------------------------------------------------
/// ENV VARS REQUIRED AT BUILD-TIME (Amplify Hosting → Environment variables):
///   VITE_AMPLIFY_API    ← your API Gateway invoke URL
///   VITE_API_KEY        ← the API key for your REST endpoint (if used)
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
  nextStep?: any;
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
  private API_KEY = import.meta.env.VITE_API_KEY;

  private constructor() {
    if (!this.API_BASE) console.error('Missing VITE_AMPLIFY_API');
    if (!this.API_KEY) console.warn('Missing VITE_API_KEY');
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Verify World ID proof via backend
   */
  public async verifyWorldId(details: ISuccessResult): Promise<IVerifiedUser> {
    const session = await fetchAuthSession();
    const idTokenObj = session.tokens?.idToken;
    if (!idTokenObj) {
      throw new Error('No ID token available in session');
    }
    const token = idTokenObj.toString();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
    if (this.API_KEY) headers['x-api-key'] = this.API_KEY;

    const res = await fetch(`${this.API_BASE}/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify(details)
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
      const output = await signUp({
        username,
        password,
        options: { userAttributes: { email } }
      });
      return { success: true, nextStep: output };
    } catch (err: any) {
      console.error('Registration failed:', err);
      return { success: false, error: err.message || 'Sign-up failed' };
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
    } catch (err: any) {
      if (err.name === 'UserNotConfirmedException') {
        return { success: false, requiresConfirmation: true };
      }
      console.error('Sign-in failed:', err);
      return { success: false, error: err.message || 'Sign-in failed' };
    }
  }

  /**
   * Confirm user sign-up
   */
  public async confirmSignUp(
    username: string,
    code: string
  ): Promise<IRegisterResult> {
    try {
      await confirmSignUp({ username, confirmationCode: code });
      return { success: true };
    } catch (err: any) {
      console.error('Confirmation failed:', err);
      return { success: false, error: err.message || 'Confirmation failed' };
    }
  }

  /**
   * Persist World ID nullifier for user
   */
  public async attachNullifier(
    nullifier: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // fetch the current authenticated user
      const user = await getCurrentUser();
      // update the custom attribute with the nullifier hash
      await updateUserAttributes({
        userAttributes: { 'custom:nullifierHash': nullifier }
      });
      return { success: true };
    } catch (err: any) {
      console.error('Attach nullifier failed:', err);
      if (err.name === 'NotAuthorizedException') {
        return { success: false, error: 'User not authenticated' };
      }
      return { success: false, error: err.message || 'Attach failed' };
    }
  }public async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      await signOut();
      return { success: true };
    } catch (err: any) {
      console.error('Sign-out failed:', err);
      return { success: false, error: err.message || 'Sign-out failed' };
    }
  }

  /**
   * Check if user is authenticated
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
