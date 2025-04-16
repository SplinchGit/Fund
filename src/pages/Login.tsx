import React, { useState } from 'react';
import { IDKitWidget } from '@worldcoin/idkit';

// Define the verification types and interfaces
interface VerificationProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level?: string;
  signal?: string;
}

interface VerificationResponse {
  verified: boolean;
  nullifierHash?: string;
  error?: string;
  detail?: string;
}

const Login: React.FC = () => {
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Handler for successful verification
  const handleVerify = async (proof: VerificationProof) => {
    try {
      setVerificationStatus('verifying');
      console.log("Verification started with proof:", proof);
      
      const response = await fetch('/api/verify-worldid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merkle_root: proof.merkle_root,
          nullifier_hash: proof.nullifier_hash,
          proof: proof.proof,
          verification_level: proof.verification_level || '',
          action: import.meta.env.VITE_WORLD_ACTION_ID || '',
          signal: proof.signal || '',
        }),
      });

      const data = await response.json() as VerificationResponse;
      console.log("Verification response:", data);
      
      if (data.verified) {
        setVerificationStatus('success');
        localStorage.setItem('worldcoinAuth', JSON.stringify({
          verified: true,
          nullifierHash: data.nullifierHash,
          timestamp: Date.now()
        }));
        
        // Redirect or update UI - App.tsx will handle this
        console.log('Authentication successful');
      } else {
        setVerificationStatus('error');
        setErrorMessage(data.detail || data.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to connect to verification service');
    }
  };

  // Properly type the error
  const handleError = (error: { code: string; message?: string }) => {
    console.error("IDKit error:", error);
    setVerificationStatus('error');
    setErrorMessage(error.message || 'Unknown error');
  };

  // Cast the app_id as any to avoid TypeScript errors
  // This is not ideal but works around the typing issue
  const appId = import.meta.env.VITE_WORLD_APP_ID as string;
  const actionId = import.meta.env.VITE_WORLD_ACTION_ID as string;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-md dark:border-gray-700 dark:bg-gray-800">
        <h1 className="mb-6 text-center text-2xl font-bold">WorldFund</h1>
        
        {verificationStatus === 'success' && (
          <div className="mb-4 rounded bg-green-100 p-3 text-green-700 dark:bg-green-900 dark:text-green-300">
            Verification successful!
          </div>
        )}
        
        {verificationStatus === 'error' && (
          <div className="mb-4 rounded bg-red-100 p-3 text-red-700 dark:bg-red-900 dark:text-red-300">
            {errorMessage || 'Verification failed'}
          </div>
        )}
        
        <div className="flex justify-center">
          <IDKitWidget
            app_id={appId as any}
            action={actionId}
            onSuccess={handleVerify}
            onError={handleError}
          >
            {({ open }) => (
              <button 
                onClick={open}
                disabled={verificationStatus === 'verifying'}
                className="focus:ring-primary-500 rounded-lg bg-blue-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-4 disabled:opacity-50"
              >
                {verificationStatus === 'verifying' ? 'Verifying...' : 'Verify with World ID'}
              </button>
            )}
          </IDKitWidget>
        </div>
      </div>
    </div>
  );
};

export default Login;