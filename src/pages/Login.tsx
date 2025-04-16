// src/pages/Login.tsx
import React, { useState } from 'react';
import { IDKitWidget } from '@worldcoin/idkit';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  // Safely load environment variables
  const APP_ID = import.meta.env.VITE_WORLD_APP_ID || '';
  const ACTION_ID = import.meta.env.VITE_WORLD_ACTION_ID || '';

  console.log('Environment vars loaded:', { 
    hasAppId: !!APP_ID, 
    hasActionId: !!ACTION_ID 
  });
  
  const handleVerify = async (proof) => {
    if (!proof) {
      console.error('Proof is undefined');
      setStatus('error');
      setErrorMsg('Verification failed: Invalid proof data');
      return;
    }
    
    setStatus('verifying');
    
    try {
      // Adjust the endpoint if necessary:
      const response = await fetch('/api/verify', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merkle_root: proof.merkle_root || '',
          nullifier_hash: proof.nullifier_hash || '',
          proof: proof.proof || '',
          verification_level: proof.verification_level || '',
          action: ACTION_ID,
          signal: proof.signal || '',
        }),
      });
      
      const data = await response.json();
      
      if (data.verified) {
        setStatus('success');
        // Save verification status (use the same key as your AuthService if needed)
        localStorage.setItem('worldfund_user_verification_v2', JSON.stringify({
          isVerified: true,
          details: {
            nullifierHash: data.nullifierHash || '',
            timestamp: Date.now(),
          }
        }));

        // Navigate to LandingPage after success
        navigate('/');
      } else {
        setStatus('error');
        setErrorMsg(data.error || data.detail || 'Verification failed');
      }
    } catch (error) {
      console.error('Error during verification:', error);
      setStatus('error');
      setErrorMsg('Failed to verify: Network error');
    }
  };
  
  const handleError = (error) => {
    console.error('IDKit error:', error);
    setStatus('error');
    setErrorMsg('Failed to initialize World ID');
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      padding: '20px',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ 
        maxWidth: '400px', 
        width: '100%', 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>WorldFund Login</h1>
        
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
        
        {APP_ID && ACTION_ID ? (
          <IDKitWidget
            app_id={APP_ID}
            action={ACTION_ID}
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
                  opacity: status === 'verifying' ? 0.7 : 1,
                  fontWeight: 'medium'
                }}
              >
                {status === 'verifying' ? 'Verifying...' : 'Verify with World ID'}
              </button>
            )}
          </IDKitWidget>
        ) : (
          <div style={{ color: 'red' }}>
            Missing environment variables. Please check your configuration.
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
