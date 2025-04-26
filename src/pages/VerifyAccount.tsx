// src/pages/VerifyAccount.tsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WorldIDAuth from '../components/WorldIDAuth'
import { cognitoAuth, IVerifiedUser } from '../services/AuthService'

const VerifyAccount: React.FC = () => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSuccess = async (verification: IVerifiedUser) => {
    setError(null)
    setIsVerifying(true)
    try {
      // 1) Call server to double-check proof (optional)
      //    await cognitoAuth.verifyWorldId(verification.details)

      // 2) Attach nullifier to the authenticated Cognito user
      const { success, error } = await cognitoAuth.attachNullifier(
        verification.details.nullifier_hash
      )
      if (!success) throw new Error(error || 'Attach failed')

      setSuccess(true)
      // 3) Redirect back to dashboard after a moment
      setTimeout(() => navigate('/'), 1500)
    } catch (e: any) {
      setError(e.message || 'Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleError = (e: unknown) => {
    console.error('World ID error:', e)
    setError('World ID verification failed. Please try again.')
  }

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', textAlign: 'center' }}>
      <h1>Verify Your Account</h1>
      {success ? (
        <div style={{ color: '#188038', marginTop: '1rem' }}>
          ✅ Successfully verified! Redirecting…
        </div>
      ) : (
        <>
          <p>
            To unlock campaign creation and token transfers, please verify
            that you’re unique with World ID.
          </p>
          <WorldIDAuth
            onSuccess={handleSuccess}
            onError={handleError}
            buttonText={isVerifying ? 'Attaching…' : 'Verify with World ID'}
          />
          {error && (
            <div style={{ color: '#d93025', marginTop: '1rem' }}>{error}</div>
          )}
        </>
      )}
    </div>
  )
}

export default VerifyAccount
