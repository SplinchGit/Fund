import React, { useState } from 'react';
import { IDKitWidget, IErrorState } from '@worldcoin/idkit';

const Login: React.FC = () => {
  const [status, setStatus] = useState<string>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  console.log("Login component rendered");
  
  // Very simple implementation to avoid any potential issues
  const handleVerify = async (proof: any) => {
    console.log("Verification initiated with proof:", proof);
    setStatus('verifying');
    
    try {
      const response = await fetch('/api/verify-worldid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merkle_root: proof.merkle_root,
          nullifier_hash: proof.nullifier_hash,
          proof: proof.proof,
          verification_level: proof.verification_level || '',
          action: import.meta.env.VITE_WORLD_ACTION_ID || '',
          signal: proof.signal || '',
        }),
      });
      
      const data = await response.json();
      console.log("API response:", data);
      
      if (data.verified) {
        console.log("Verification successful");
        setStatus('success');
        localStorage.setItem('worldcoinAuth', JSON.stringify({
          verified: true,
          nullifierHash: data.nullifierHash,
          timestamp: Date.now()
        }));
        
        // Force reload to update the app state
        window.location.reload();
      } else {
        console.log("Verification failed:", data.error || data.detail);
        setStatus('error');
        setErrorMsg(data.error || data.detail || 'Verification failed');
      }
    } catch (error) {
      console.error("Error during verification:", error);
      setStatus('error');
      setErrorMsg(error instanceof Error ? error.message : 'Unknown error');
    }
  };
  
  // Updated to use the correct type for the error state
  const handleError = (error: IErrorState) => {
    console.error("IDKit error:", error);
    setStatus('error');
    // Access the error message depending on the error structure
    const errorMessage = typeof error === 'string' 
      ? error 
      : error.message || error.code || 'Unknown error';
    setErrorMsg(errorMessage);
  };

  // Basic styles in-line to avoid any CSS issues
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      padding: '20px' 
    }}>
      <div style={{ 
        maxWidth: '400px', 
        width: '100%', 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)' 
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>WorldFund</h1>
        
        {status === 'success' && (
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#d1fae5', 
            color: '#065f46', 
            borderRadius: '5px', 
            marginBottom: '20px' 
          }}>
            Verification successful!
          </div>
        )}
        
        {status === 'error' && (
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#fee2e2', 
            color: '#b91c1c', 
            borderRadius: '5px', 
            marginBottom: '20px' 
          }}>
            {errorMsg || 'Verification failed'}
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <IDKitWidget
            app_id={import.meta.env.VITE_WORLD_APP_ID as any}
            action={import.meta.env.VITE_WORLD_ACTION_ID as string}
            onSuccess={handleVerify}
            onError={handleError}
          >
            {({ open }) => (
              <button 
                onClick={open}
                disabled={status === 'verifying'}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '10px 20px',
                  cursor: status === 'verifying' ? 'not-allowed' : 'pointer',
                  opacity: status === 'verifying' ? 0.7 : 1
                }}
              >
                {status === 'verifying' ? 'Verifying...' : 'Verify with World ID'}
              </button>
            )}
          </IDKitWidget>
        </div>
      </div>
    </div>
  );
};

export default Login;