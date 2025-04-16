import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import WorldIDAuth from '../components/WorldIDAuth';
import { authService, IVerifiedUser } from '../services/AuthService';

// -----------------------------
// INTERFACES
// -----------------------------

interface TipJarProps {
  initialVerification: IVerifiedUser | null;
  onTipComplete?: (amount: string) => void;
}

// -----------------------------
// MAIN COMPONENT
// -----------------------------

export default function TipJar({
  initialVerification = null,
  onTipComplete
}: TipJarProps): React.JSX.Element {

  // -----------------------------
  // STATE MANAGEMENT
  // -----------------------------
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userVerification, setUserVerification] = useState(initialVerification as IVerifiedUser | null);
  const [selectedAmount, setSelectedAmount] = useState('5');
  const [customAmount, setCustomAmount] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // -----------------------------
  // EVENT HANDLERS
  // -----------------------------
  
  // Handle successful verification
  const handleVerificationSuccess = useCallback((verifiedUser: IVerifiedUser) => {
    console.log("TipJar: Verification successful:", verifiedUser);
    setUserVerification(verifiedUser);
    setIsAuthModalOpen(false);
  }, []);

  // Handle verify button click
  const handleVerifyButtonClick = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  // Handle preset amount selection
  const handleSelectAmount = (amount: string) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setErrorMessage('');
  };

  // Handle custom amount input
  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+(\.\d{0,2})?$/.test(value)) {
      setCustomAmount(value);
      setSelectedAmount('custom');
      setErrorMessage('');
    }
  };

  // Handle form submission for tip
  const handleSubmitTip = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const finalAmount = selectedAmount === 'custom' ? customAmount : selectedAmount;
    
    // Validate amount
    if (!finalAmount || isNaN(parseFloat(finalAmount)) || parseFloat(finalAmount) <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }

    try {
      setProcessingPayment(true);
      
      // Simulate payment processing
      // In a real implementation, you would call your payment API here
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log(`Processing payment of £${finalAmount}`);
      setPaymentComplete(true);
      
      // Reset form after a delay
      setTimeout(() => {
        setPaymentComplete(false);
        setSelectedAmount('5');
        setCustomAmount('');
        if (onTipComplete) {
          onTipComplete(finalAmount);
        }
      }, 3000);
    } catch (error) {
      console.error('Payment error:', error);
      setErrorMessage('There was an error processing your payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  // -----------------------------
  // STYLING
  // -----------------------------
  
  const styles: { [key: string]: React.CSSProperties } = {
    // Core layout styles
    page: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif',
      color: '#202124',
      backgroundColor: '#ffffff',
      margin: 0,
      padding: '0.5rem',
      width: '100%',
      maxWidth: '100%',
    },
    
    // Header styles
    header: {
      padding: '0.5rem 0',
      marginBottom: '1rem',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      color: '#1a73e8',
      fontWeight: 700,
      fontSize: '1.125rem',
      textDecoration: 'none'
    },
    logoSpan: {
      color: '#202124'
    },
    
    // Content section styles
    content: {
      backgroundColor: '#f5f7fa',
      borderRadius: '0.5rem',
      padding: '1.25rem 1rem',
      marginBottom: '1rem'
    },
    title: {
      fontSize: '1.25rem',
      fontWeight: 600,
      marginBottom: '0.5rem',
      textAlign: 'center' as const
    },
    subtitle: {
      fontSize: '0.875rem',
      color: '#5f6368',
      marginBottom: '1.25rem',
      textAlign: 'center' as const
    },
    
    // Form styles
    formGroup: {
      marginBottom: '1.25rem'
    },
    label: {
      display: 'block',
      marginBottom: '0.5rem',
      fontSize: '0.875rem',
      fontWeight: 500
    },
    amountContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.5rem',
      justifyContent: 'center'
    },
    amountButton: {
      padding: '0.5rem 0',
      minWidth: '4rem',
      backgroundColor: 'white',
      border: '1px solid #1a73e8',
      color: '#1a73e8',
      borderRadius: '0.25rem',
      fontSize: '0.875rem',
      fontWeight: 500,
      cursor: 'pointer'
    },
    amountButtonSelected: {
      backgroundColor: '#1a73e8',
      color: 'white'
    },
    customAmountContainer: {
      display: 'flex',
      marginTop: '1rem',
      maxWidth: '12rem',
      margin: '1rem auto 0'
    },
    currencySymbol: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f1f3f4',
      width: '2.5rem',
      borderTopLeftRadius: '0.25rem',
      borderBottomLeftRadius: '0.25rem',
      borderTop: '1px solid #ddd',
      borderLeft: '1px solid #ddd',
      borderBottom: '1px solid #ddd',
      fontSize: '0.875rem',
      color: '#5f6368'
    },
    customAmountInput: {
      flex: 1,
      padding: '0.5rem',
      border: '1px solid #ddd',
      borderTopRightRadius: '0.25rem',
      borderBottomRightRadius: '0.25rem',
      fontSize: '0.875rem'
    },
    
    // Button styles
    button: {
      width: '100%',
      padding: '0.75rem 1rem',
      backgroundColor: '#1a73e8',
      color: 'white',
      border: 'none',
      borderRadius: '0.25rem',
      fontSize: '0.875rem',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    buttonDisabled: {
      backgroundColor: '#c1d1f0',
      cursor: 'not-allowed'
    },
    verifyButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      padding: '0.5rem 1rem',
      backgroundColor: '#1a73e8',
      color: 'white',
      border: 'none',
      borderRadius: '0.25rem',
      fontSize: '0.875rem',
      fontWeight: 500,
      cursor: 'pointer',
      margin: '1.5rem auto 0'
    },
    
    // Message styles
    errorMessage: {
      marginTop: '0.75rem',
      padding: '0.5rem',
      backgroundColor: '#fce8e6',
      color: '#ea4335',
      borderRadius: '0.25rem',
      fontSize: '0.75rem',
      textAlign: 'center' as const
    },
    successMessage: {
      marginTop: '0.75rem',
      padding: '0.75rem',
      backgroundColor: '#e6f4ea',
      color: '#34a853',
      borderRadius: '0.25rem',
      fontSize: '0.875rem',
      textAlign: 'center' as const,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem'
    },
    
    // Verification prompt styles
    verificationPrompt: {
      backgroundColor: '#fff8e1',
      borderRadius: '0.25rem',
      padding: '1rem',
      textAlign: 'center' as const,
      marginBottom: '1rem'
    },
    verificationPromptText: {
      fontSize: '0.875rem',
      marginBottom: '0.75rem'
    },
    
    // Footer styles
    footer: {
      marginTop: '1.5rem',
      fontSize: '0.75rem',
      color: '#5f6368',
      textAlign: 'center' as const,
      lineHeight: 1.5
    },
    
    // Badge styles
    verifiedBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: 'rgba(52,168,83,0.1)',
      color: '#34a853',
      fontSize: '0.65rem',
      padding: '0.2rem 0.4rem',
      borderRadius: '0.25rem',
      fontWeight: 500
    }
  };

  // -----------------------------
  // RENDER JSX
  // -----------------------------
  
  return (
    <div style={styles.page}>
      {/* --- Header --- */}
      <header style={styles.header}>
        <a href="#" style={styles.logo}>
          World<span style={styles.logoSpan}>Fund</span>
        </a>
        {userVerification && (
          <div style={styles.verifiedBadge}>
            <svg
              style={{ width: '12px', height: '12px', marginRight: '0.1rem' }}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            Verified with World ID
          </div>
        )}
      </header>

      {/* --- Content Section --- */}
      <main style={styles.content}>
        <h1 style={styles.title}>Support WorldFund</h1>
        <p style={styles.subtitle}>Your contribution helps creators achieve their goals</p>

        {!userVerification ? (
          // User not verified - show verification prompt
          <div style={styles.verificationPrompt}>
            <p style={styles.verificationPromptText}>
              Please verify your identity with World ID to continue
            </p>
            <p style={{fontSize: '0.75rem', marginBottom: '0.75rem', color: '#5f6368'}}>
              WorldFund uses World ID to ensure all contributions are from real humans
            </p>
            <button
              style={styles.verifyButton}
              onClick={handleVerifyButtonClick}
            >
              <svg
                style={{ width: '16px', height: '16px' }}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L9 14.17l6.59-6.59L17 9l-7 7z" />
              </svg>
              Verify with World ID
            </button>
          </div>
        ) : (
          // User verified - show tip form
          <form onSubmit={handleSubmitTip}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Select an amount:</label>
              <div style={styles.amountContainer}>
                {['2', '5', '10', '20'].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    style={{
                      ...styles.amountButton,
                      ...(selectedAmount === amount ? styles.amountButtonSelected : {})
                    }}
                    onClick={() => handleSelectAmount(amount)}
                  >
                    £{amount}
                  </button>
                ))}
                <button
                  type="button"
                  style={{
                    ...styles.amountButton,
                    ...(selectedAmount === 'custom' ? styles.amountButtonSelected : {})
                  }}
                  onClick={() => setSelectedAmount('custom')}
                >
                  Custom
                </button>
              </div>
              
              {selectedAmount === 'custom' && (
                <div style={styles.customAmountContainer}>
                  <div style={styles.currencySymbol}>£</div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    placeholder="Amount"
                    style={styles.customAmountInput}
                    autoFocus
                  />
                </div>
              )}
              
              {errorMessage && (
                <div style={styles.errorMessage}>{errorMessage}</div>
              )}
            </div>
            
            <button
              type="submit"
              style={{
                ...styles.button,
                ...(processingPayment ? styles.buttonDisabled : {})
              }}
              disabled={processingPayment}
            >
              {processingPayment ? 'Processing...' : 'Send Tip'}
            </button>
            
            {paymentComplete && (
              <div style={styles.successMessage}>
                <svg
                  style={{ width: '16px', height: '16px' }}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                Thank you for your contribution!
              </div>
            )}
          </form>
        )}
      </main>

      {/* --- Footer --- */}
      <footer style={styles.footer}>
        <p>All donations are processed securely.</p>
        <p>WorldFund does not charge any fees on tips.</p>
        <p>&copy; {new Date().getFullYear()} WorldFund</p>
      </footer>

      {/* --- World ID Authentication Modal --- */}
      <Dialog 
        open={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        className="relative z-[110]"
      >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        {/* Modal Panel Container */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          {/* Modal Panel Content */}
          <Dialog.Panel className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="text-center mb-4">
              <Dialog.Title className="text-xl font-bold mb-2 text-gray-900">Verify with World ID</Dialog.Title>
              <p className="text-sm text-gray-600">Verify your identity to contribute</p>
            </div>

            {/* WorldIDAuth Component */}
            <div className="py-4 flex justify-center">
              <WorldIDAuth
                onSuccess={handleVerificationSuccess}
                onError={(error) => {
                  console.error('WorldID verification error:', error);
                  setIsAuthModalOpen(false);
                }}
              />
            </div>

            {/* Informational text about World ID benefits */}
            <div className="mt-4 text-center">
              <div className="flex flex-col gap-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2 justify-center">
                  <svg style={{ width: '14px', height: '14px', color: '#34a853' }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  Prevent duplicate contributions
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <svg style={{ width: '14px', height: '14px', color: '#34a853' }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  Ensure all donors are real humans
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <svg style={{ width: '14px', height: '14px', color: '#34a853' }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  Protect your privacy
                </div>
              </div>

              {/* Cancel button */}
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition duration-150 ease-in-out"
                onClick={() => setIsAuthModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </Dialog.Panel> 
        </div>
      </Dialog>
    </div>
  );
}