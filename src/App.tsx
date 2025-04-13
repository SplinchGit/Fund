// src/App.tsx
import { useEffect, useState } from 'react'
import LandingPage from './pages/LandingPage'
import ErudaProvider from './erudadebug/ErudaProvider'
import MiniKitProvider from './MiniKitProvider'
import { authService, IVerifiedUser } from './services/AuthService'

export default function App() {
  const [userVerification, setUserVerification] = useState<IVerifiedUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Log to verify the component is mounting
    console.log('App component mounted');
    
    // Check for existing verification on app mount
    const checkVerification = async () => {
      try {
        console.log("Checking for existing user verification on app mount");
        const verifiedUser = await authService.getCurrentUser();
        console.log("Retrieved user verification:", verifiedUser ? "Found" : "Not found");
        if (verifiedUser) {
          console.log("User verified with level:", verifiedUser.details?.verificationLevel);
        }
        setUserVerification(verifiedUser);
      } catch (error) {
        console.error("Error checking user verification:", error);
      } finally {
        setIsInitializing(false);
      }
    };
    
    // Add a small delay to ensure everything is initialized
    setTimeout(() => {
      checkVerification();
    }, 500);
  }, []);

  const handleVerificationChange = (newVerification: IVerifiedUser | null) => {
    console.log("Verification changed:", newVerification ? "Verified" : "Not verified");
    setUserVerification(newVerification);
  };

  return (
    <MiniKitProvider>
      {/* Add ErudaProvider for debugging */}
      <ErudaProvider />
      
      {isInitializing ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '1rem'
        }}>
          <div style={{
            width: '2rem',
            height: '2rem',
            border: '3px solid rgba(0, 0, 0, 0.1)',
            borderTopColor: '#1a73e8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p>Loading WorldFund...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg) }
            }
          `}</style>
        </div>
      ) : (
        <LandingPage 
          initialVerification={userVerification} 
          onVerificationChange={handleVerificationChange} 
        />
      )}
    </MiniKitProvider>
  )
}