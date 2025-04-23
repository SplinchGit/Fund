// src/pages/Register.tsx
import React, { useState } from 'react';
import { cognitoAuth, IVerifiedUser } from '../services/AuthService';
import WorldIDAuth from '../components/WorldIDAuth';

const Register: React.FC = () => {
  // --- Form state ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- World ID verification state ---
  const [verification, setVerification] = useState<IVerifiedUser | null>(null);
  const [worldError, setWorldError] = useState<string | null>(null);

  // --- Registration state ---
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Called when WorldIDAuth succeeds
  const handleWorldSuccess = (v: IVerifiedUser) => {
    setVerification(v);
    setWorldError(null);
  };

  // Called when WorldIDAuth errors
  const handleWorldError = (err: unknown) => {
    setVerification(null);
    setWorldError('World ID verification failed. Please try again.');
  };

  // Handle the full registration flow
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Basic form validation
    if (!email || !password) {
      setSubmitError('Email and password are required.');
      return;
    }
    if (!verification) {
      setSubmitError('Please complete World ID verification first.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1) (Optional) re-verify the proof server-side
      await cognitoAuth.verifyWorldId(verification.details);

      // 2) register in Cognito, passing the proof nullifier
      const result = await cognitoAuth.register(
        email,
        password,
        email,
      );
      if (!result.success) {
        throw new Error(result.error || 'Registration failed');
      }

      // Success!
      alert('Registration successful! Please check your email to confirm.');
      // Reset form & state
      setEmail('');
      setPassword('');
      setVerification(null);
    } catch (err: any) {
      setSubmitError(err.message || 'Registration encountered an error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: '1rem', border: '1px solid #ccc', borderRadius: 8 }}>
      <h2 style={{ textAlign: 'center' }}>Create Account</h2>

      <form onSubmit={handleSubmit} noValidate>
        {/* Email */}
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="email">Email</label><br />
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
            required
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="password">Password</label><br />
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
            required
            minLength={8}
          />
        </div>

        {/* World ID Verification */}
        <div style={{ margin: '1rem 0' }}>
          <label>World ID Verification</label><br />
          <WorldIDAuth
            onSuccess={handleWorldSuccess}
            onError={handleWorldError}
            buttonText="Verify with World ID"
          />
          {worldError && (
            <div style={{ color: 'red', marginTop: 4 }}>{worldError}</div>
          )}
        </div>

        {/* Submission error */}
        {submitError && (
          <div style={{ color: 'red', marginBottom: 8 }}>{submitError}</div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: isSubmitting ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: isSubmitting ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? 'Registering…' : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default Register;
