// src/pages/VerifyAccount.tsx

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import WorldIDAuth, { IVerifiedUser } from '../components/WorldIDAuth';
import { authService } from '../services/AuthService';

const VerifyAccount: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSuccess = useCallback(
    async (verification: IVerifiedUser) => {
      setError(null);
      setIsVerifying(true);
      try {
        // Optionally double-check proof server-side
        // await authService.verifyWorldId(verification.details);

        // Persist nullifier hash to Cognito user
        const result = await authService.attachNullifier(
          verification.details.nullifier_hash
        );
        if (!result.success) {
          throw new Error(result.error || 'Attach failed');
        }

        setSuccess(true);
        // Redirect to home or dashboard after brief pause
        setTimeout(() => navigate('/'), 1500);
      } catch (e: any) {
        console.error('Verification error:', e);
        setError(e.message || 'Verification failed');
      } finally {
        setIsVerifying(false);
      }
    },
    [navigate]
  );

  const handleError = useCallback((e: unknown) => {
    console.error('World ID verification error:', e);
    setError('World ID verification failed. Please try again.');
  }, []);

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg text-center">
      <h2 className="text-2xl font-bold mb-4">Verify Your Account</h2>

      {success ? (
        <div className="text-green-600 mb-4">✅ Successfully verified! Redirecting…</div>
      ) : (
        <>
          <p className="mb-6">
            To unlock campaign creation and token transfers, please verify your uniqueness with World ID.
          </p>

          <WorldIDAuth
            onSuccess={handleSuccess}
            onError={handleError}
            buttonText={isVerifying ? 'Attaching…' : 'Verify with World ID'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          />

          {error && (
            <div className="text-red-600 mt-4">{error}</div>
          )}
        </>
      )}
    </div>
  );
};

export default VerifyAccount;
