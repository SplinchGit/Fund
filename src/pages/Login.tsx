// --------------------------------------
// WorldFund - Login Page with World ID + Username
// --------------------------------------

import React, { useState } from 'react';
import { IDKitWidget } from '@worldcoin/idkit';
import { useNavigate } from 'react-router-dom';

// --------------------------------------
// Interfaces
// --------------------------------------

interface WorldIDProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level?: string;
  signal?: string;
}

interface IDKitWidgetProps {
  open: () => void;
}

// --------------------------------------
// Main Component
// --------------------------------------

const Login = () => {
  const navigate = useNavigate();

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginStatus, setLoginStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [loginError, setLoginError] = useState('');

  // World ID state
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const APP_ID: string = import.meta.env.VITE_WORLD_APP_ID;
  const ACTION_ID: string = import.meta.env.VITE_WORLD_ACTION_ID;

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginStatus('loading');
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      let data: any;
      const contentType = res.headers.get('content-type') || '';
      
      try {
        data = contentType.includes('application/json')
          ? await res.json()
          : { error: await res.text() }; // fallback to text
      } catch {
        data = { error: 'Invalid JSON response from server' };
      }
      
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      

      setLoginStatus('success');
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      setLoginStatus('error');
      setLoginError(err.message || 'Login failed');
    }
  };

  const handleVerify = async (proof: WorldIDProof): Promise<void> => {
    if (!proof) {
      console.error('Proof is undefined');
      setStatus('error');
      setErrorMsg('Verification failed: Invalid proof data');
      return;
    }

    setStatus('verifying');

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merkle_root: proof.merkle_root,
          nullifier_hash: proof.nullifier_hash,
          proof: proof.proof,
          verification_level: proof.verification_level || '',
          action: ACTION_ID,
          signal: proof.signal || '',
        }),
      });

      const data = await response.json();

      if (data.verified) {
        localStorage.setItem('worldfund_user_verification_v2', JSON.stringify({
          isVerified: true,
          details: {
            nullifierHash: data.nullifierHash || '',
            timestamp: Date.now(),
          }
        }));

        setStatus('success');
        navigate('/');
      } else {
        setStatus('error');
        setErrorMsg(data.error || data.detail || 'Verification failed');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setStatus('error');
      setErrorMsg('Failed to verify: Network error');
    }
  };

  const handleError = (error: unknown): void => {
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

        {/* Username/Password Form */}
        <form onSubmit={handlePasswordLogin} style={{ marginBottom: '20px' }}>
          <h2 style={{ marginBottom: '10px' }}>Login with Username</h2>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          />
          <button
            type="submit"
            disabled={loginStatus === 'loading'}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              width: '100%',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            {loginStatus === 'loading' ? 'Logging in...' : 'Login'}
          </button>
          {loginStatus === 'error' && (
            <div style={{ color: 'red', marginTop: '10px' }}>{loginError}</div>
          )}
        </form>

        {/* World ID Verification */}
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
            app_id={APP_ID as `app_${string}`}
            action={ACTION_ID}
            onSuccess={handleVerify}
            onError={handleError}
          >
            {({ open }: IDKitWidgetProps) => (
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
                  fontWeight: 500
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