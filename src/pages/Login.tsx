// src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/AuthService';
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
  userData?: any;
}

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsConfirmation(false);

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.login(username, password);
      if (result.success) {
        navigate('/dashboard');
      } else if (result.requiresConfirmation) {
        setNeedsConfirmation(true);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

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
        <div className="mb-4">
          <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            required
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            required
          />
        </div>
        
        {error && (
          <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded-md text-white font-medium
            ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isLoading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <span className="text-gray-600">Don't have an account? </span>
        <Link to="/register" className="text-blue-600 hover:text-blue-800">
          Register here
        </Link>
      </div>
    </div>
  );
};

export default Login;
