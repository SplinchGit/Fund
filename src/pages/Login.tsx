// src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn } from 'aws-amplify/auth';
import { VerificationLevel } from '@worldcoin/idkit';

// Re-export the existing IVerifiedUser type (to maintain compatibility with App.tsx)
export interface IVerifiedUser {
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
  userData?: any; // Using any for simplicity, you might want to define a proper type
}

// Create a minimal version of the Auth service for login functionality
// This is just to make the Login component work until you refactor everything
export const cognitoAuth = {
  async login(username: string, password: string) {
    try {
      const { isSignedIn, nextStep } = await signIn({ username, password });
      
      if (isSignedIn) {
        return { success: true };
      } else if (nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
        return { success: false, requiresConfirmation: true };
      }
      
      return { success: false, error: 'Unknown login state' };
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.message || 'Login failed' 
      };
    }
  },
  // Stub methods to satisfy App.tsx imports (replace with actual implementations as needed)
  async getCognitoUser() {
    // Minimal implementation to prevent errors
    return { success: false };
  },
  getWorldIdVerification() {
    // Minimal implementation to prevent errors
    return null;
  },
  async logout() {
    // Minimal implementation
    return { success: true };
  }
};

// The Login component
export const Login: React.FC = () => {
  // State for form fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // State for form processing and errors
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  
  const navigate = useNavigate();

  // Handle login form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error states
    setError(null);
    setNeedsConfirmation(false);
    
    // Validate input
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Call the auth service to perform login
      const result = await cognitoAuth.login(username, password);
      
      if (result.success) {
        // Successful login - redirect to dashboard
        navigate('/dashboard');
      } else if (result.requiresConfirmation) {
        // User needs to confirm their account
        setNeedsConfirmation(true);
      } else {
        // Handle other login failures
        setError(result.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // If the user needs to confirm their account, show a message
  if (needsConfirmation) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6">Account Confirmation Required</h2>
        <p className="mb-4 text-gray-700">
          Your account needs to be confirmed before you can log in.
          Please check your email for a confirmation code.
        </p>
        <div className="text-center">
          <Link to="/register" className="text-blue-600 hover:text-blue-800">
            Go to Registration to confirm your account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-6">Log In</h2>
      
      <form onSubmit={handleSubmit}>
        {/* Username field */}
        <div className="mb-4">
          <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            required
          />
        </div>
        
        {/* Password field */}
        <div className="mb-6">
          <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            required
          />
        </div>
        
        {/* Error message */}
        {error && (
          <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded-md text-white font-medium
            ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isLoading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
      
      {/* Registration link */}
      <div className="mt-4 text-center">
        <span className="text-gray-600">Don't have an account? </span>
        <Link to="/register" className="text-blue-600 hover:text-blue-800">
          Register here
        </Link>
      </div>
    </div>
  );
};

// Also provide a default export for compatibility
export default Login;