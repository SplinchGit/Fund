// src/pages/TipJar.tsx

// # ############################################################################ #
// # #                               SECTION 1 - IMPORTS                                #
// # ############################################################################ #
import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { IDKitWidget, VerificationLevel, ISuccessResult } from '@worldcoin/idkit';
import { useAuth } from '../components/AuthContext';

// ############################################################################ #
// # #             SECTION 1.5 - HELPER FOR WORLD ID APP ID                 #
// # ############################################################################ #
const getVerifiedAppId = (): `app_${string}` => {
  const appIdFromEnv = process.env.REACT_APP_WORLD_ID_APP_ID;
  if (appIdFromEnv && appIdFromEnv.startsWith('app_')) {
    return appIdFromEnv as `app_${string}`;
  }
  // Fallback to a generic staging or test ID if the env var is missing/invalid
  // IMPORTANT: Replace "app_staging_123abc" with your actual default/staging app_id
  return "app_staging_123abc";
};
const worldIDAppIdToUse = getVerifiedAppId();


// # ############################################################################ #
// # #                               SECTION 2 - STYLES                                #
// # ############################################################################ #
const styles: { [key: string]: React.CSSProperties } = {
  page: {
    textAlign: 'center' as const,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif',
    color: '#202124',
    backgroundColor: '#f5f7fa',
    margin: 0,
    padding: 0,
    overflowX: 'hidden' as const,
    width: '100vw', // MODIFIED
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxSizing: 'border-box' as const, // ADDED
  },
  container: {
    margin: '0 auto',
    width: '100%',
    padding: '0 0.5rem',
    boxSizing: 'border-box' as const,
    maxWidth: '600px',
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    background: 'white',
    padding: '0.5rem 0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    width: '100%', // ADDED
    boxSizing: 'border-box' as const, // ADDED
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 0.5rem',
    boxSizing: 'border-box' as const, // ADDED
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    color: '#1a73e8',
    fontWeight: 700,
    fontSize: '1.125rem',
    textDecoration: 'none',
  },
  logoSpan: {
    color: '#202124',
  },
  button: {
    padding: '0.5rem 0.75rem',
    borderRadius: '0.25rem',
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center' as const,
    fontSize: '0.875rem',
    transition: 'background-color 0.2s, border-color 0.2s',
    border: '1px solid transparent',
    minHeight: '36px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  buttonPrimary: {
    backgroundColor: '#1a73e8',
    color: 'white',
    borderColor: '#1a73e8',
  },
  buttonSecondary: {
    backgroundColor: '#f1f3f4',
    color: '#202124',
    borderColor: '#dadce0',
  },
  donationCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    margin: '1.5rem 0',
    width: '100%',
    boxSizing: 'border-box' as const,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  cardHeader: {
    padding: '1.5rem',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e9ecef',
    textAlign: 'center' as const,
    boxSizing: 'border-box' as const,
  },
  cardTitle: {
    fontSize: '1.375rem',
    fontWeight: 600,
    color: '#202124',
    margin: 0,
  },
  cardSubtitle: {
    fontSize: '0.9rem',
    color: '#5f6368',
    marginTop: '0.25rem',
  },
  cardContent: {
    padding: '1.5rem',
    flexGrow: 1,
    boxSizing: 'border-box' as const,
  },
  formGroup: {
    marginBottom: '1.5rem',
    textAlign: 'left' as const,
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#3c4043',
    marginBottom: '0.5rem',
  },
  amountSelector: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap' as const,
    marginBottom: '1rem',
  },
  amountButton: {
    flex: '1 1 auto',
    padding: '0.625rem 1rem',
    fontSize: '0.875rem',
    backgroundColor: '#f1f3f4',
    color: '#202124',
    border: '1px solid #dadce0',
    borderRadius: '6px',
    cursor: 'pointer',
    minWidth: '70px',
    textAlign: 'center' as const,
    boxSizing: 'border-box' as const,
    transition: 'background-color 0.2s, border-color 0.2s, color 0.2s',
  },
  amountButtonSelected: {
    backgroundColor: 'rgba(26, 115, 232, 0.1)',
    color: '#1a73e8',
    borderColor: 'rgba(26, 115, 232, 0.5)',
    fontWeight: 500,
  },
  customAmount: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #dadce0',
    borderRadius: '6px',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  addressBox: {
    padding: '0.75rem 1rem',
    backgroundColor: '#f8f9fa',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    fontSize: '0.875rem',
    wordBreak: 'break-all' as const,
    textAlign: 'left' as const,
    fontFamily: 'monospace, "Courier New", Courier',
    lineHeight: 1.4,
    boxSizing: 'border-box' as const,
  },
  copyButton: {
    display: 'inline-flex', // Changed for icon alignment
    alignItems: 'center', // For icon
    fontSize: '0.75rem',
    color: '#1a73e8',
    backgroundColor: 'transparent',
    border: 'none',
    padding: '0.25rem', // Minimal padding around icon
    cursor: 'pointer',
    textAlign: 'right' as const,
    marginLeft: '0.5rem',
  },
  instructionsList: {
    textAlign: 'left' as const,
    margin: '1.5rem 0',
    padding: '0 0 0 1.25rem',
    fontSize: '0.875rem',
    color: '#3c4043',
    lineHeight: 1.6,
  },
  instructionItem: {
    marginBottom: '0.75rem',
  },
  txHashInput: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #dadce0',
    borderRadius: '6px',
    boxSizing: 'border-box' as const,
    fontFamily: 'monospace, "Courier New", Courier',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  verifyButton: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '0.9rem',
    color: 'white',
    backgroundColor: '#34a853',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'background-color 0.2s',
  },
  spinnerIcon: { // Simple CSS spinner
    width:'1.25em',
    height:'1.25em',
    marginRight:'0.5em',
    border: '2px solid rgba(255,255,255,0.3)',
    borderRadius: '50%',
    borderTopColor: '#fff',
    animation: 'spinAnimation 0.8s linear infinite'
  },
  successMessage: {
    backgroundColor: 'rgba(52, 168, 83, 0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(52, 168, 83, 0.15)',
    padding: '2rem',
    marginBottom: '1.5rem',
    textAlign: 'center' as const,
    boxSizing: 'border-box' as const,
  },
  successIcon: {
    width: '3rem',
    height: '3rem',
    color: '#34a853',
    margin: '0 auto 1rem',
  },
  successTitle: {
    fontSize: '1.375rem',
    fontWeight: 600,
    color: '#202124',
    marginBottom: '0.5rem',
  },
  successMessageText: { // Changed from successMessage2
    fontSize: '0.9rem',
    color: '#3c4043',
    marginBottom: '1.5rem',
  },
  errorMessage: {
    backgroundColor: 'rgba(234, 67, 53, 0.05)',
    borderRadius: '8px',
    border: '1px solid rgba(234, 67, 53, 0.2)',
    padding: '1rem',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
    color: '#c53929',
    textAlign: 'left' as const,
    boxSizing: 'border-box' as const,
  },
  worldIdContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
    padding: '2rem',
    marginBottom: '1.5rem',
    textAlign: 'center' as const,
    boxSizing: 'border-box' as const,
  },
  worldIdText: {
    fontSize: '0.9rem',
    color: '#3c4043',
    marginBottom: '1.5rem',
    lineHeight: 1.5,
  },
  worldIdButton: {
    backgroundColor: 'rgb(23, 25, 35)',
    color: 'white',
    borderRadius: '999px',
    padding: '0.875rem 1.75rem',
    fontSize: '0.9rem',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    margin: '0 auto',
    transition: 'background-color 0.2s',
  },
  worldIdButtonIcon: { // Style for the SVG icon in World ID button
    width: '20px',
    height: '20px',
    fill: 'currentColor', // Inherits color from button text
    // marginRight: '8px', // Gap is handled by parent's gap style
  },
  tabs: {
    display: 'flex',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderTop: '1px solid #e0e0e0',
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    width: '100%',
    zIndex: 100,
    padding: '0.75rem 0',
    boxShadow: '0 -1px 3px rgba(0,0,0,0.1)',
    boxSizing: 'border-box' as const,
  },
  tab: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    fontSize: '0.65rem',
    color: '#5f6368',
    textDecoration: 'none',
    padding: '0.1rem 0.5rem',
    flexGrow: 1,
    textAlign: 'center' as const,
    transition: 'color 0.2s',
  },
  tabActive: {
    color: '#1a73e8',
  },
  tabIcon: {
    width: '1.125rem',
    height: '1.125rem',
    marginBottom: '0.125rem',
  },
  bottomSpacer: {
    height: '80px',
    flexShrink: 0,
  },
};

const responsiveStyles = `
  html, body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
    font-family: ${styles.page?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif'};
    box-sizing: border-box;
  }
  *, *::before, *::after {
    box-sizing: inherit;
  }
  /* Basic focus styles for inputs */
  input[type="text"]:focus, input[type="number"]:focus, textarea:focus {
    border-color: #1a73e8;
    box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
    outline: none;
  }
  /* CSS Spinner Animation */
  @keyframes spinAnimation {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// # ############################################################################ #
// # #                 SECTION 3 - COMPONENT: DEFINITION & STATE                 #
// # ############################################################################ #
const TipJar: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const [isVerified, setIsVerified] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [tipAmount, setTipAmount] = useState<number | ''>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [txHash, setTxHash] = useState('');
  const [verifyingTx, setVerifyingTx] = useState(false);
  const [copied, setCopied] = useState(false);

// # ############################################################################ #
// # #                 SECTION 4 - CONSTANTS: DONATION ADDRESS                 #
// # ############################################################################ #
  const WLD_ADDRESS = '0x28043f711ab042b1780ede66d317929693f59c87';
  const PRESET_AMOUNTS = [5, 10, 20, 50];

// # ############################################################################ #
// # #         SECTION 5 - CALLBACK: WORLD ID VERIFICATION SUCCESS         #
// # ############################################################################ #
  const handleVerificationSuccess = useCallback((result: ISuccessResult) => {
    console.log('World ID Verification Success:', result);
    setVerificationLoading(false);
    setIsVerified(true);
    setErrorMessage('');
  }, []);

// # ############################################################################ #
// # #         SECTION 6 - CALLBACK: WORLD ID VERIFICATION ERROR         #
// # ############################################################################ #
  const handleVerificationError = useCallback((error?: { message?: string } | any) => { // Made error param optional and typed
    console.error('World ID verification error:', error);
    setErrorMessage(error?.message || 'Verification failed. Please try again.');
    setVerificationLoading(false);
  }, []);

// # ############################################################################ #
// # #         SECTION 7 - EVENT HANDLER: PRESET TIP SELECTION         #
// # ############################################################################ #
  const handlePresetTip = (amount: number) => {
    setTipAmount(amount);
    setCustomAmount(amount.toString());
    setErrorMessage('');
  };

// # ############################################################################ #
// # #         SECTION 8 - EVENT HANDLER: CUSTOM TIP AMOUNT         #
// # ############################################################################ #
  const handleCustomAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setCustomAmount(value);
      if (value === '' || value === '.') {
        setTipAmount('');
      } else {
        const numValue = parseFloat(value);
        setTipAmount(isNaN(numValue) ? '' : numValue);
      }
    }
  };

// # ############################################################################ #
// # #                 SECTION 9 - EVENT HANDLER: COPY ADDRESS                 #
// # ############################################################################ #
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(WLD_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address: ', err);
      setErrorMessage('Could not copy address. Please copy it manually.');
    }
  };

// # ############################################################################ #
// # #         SECTION 10 - EVENT HANDLER: VERIFY TRANSACTION         #
// # ############################################################################ #
  const handleVerifyTransaction = async () => {
    if (!txHash.trim()) {
      setErrorMessage('Please enter a valid transaction hash.');
      return;
    }
    if (tipAmount === '' || tipAmount <= 0) { // Ensure tipAmount is a positive number
        setErrorMessage('Please select or enter a valid tip amount.');
        return;
    }

    setVerifyingTx(true);
    setErrorMessage('');

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (txHash.startsWith('0x') && txHash.length >= 66) {
        console.log('Mock Transaction Verified:', { txHash, amount: tipAmount });
        setShowThankYou(true);
        setErrorMessage(''); // Clear any previous error message
      } else {
        setErrorMessage('Invalid transaction hash. Please ensure it is correct and try again.');
      }
    } catch (error) {
      console.error('Transaction verification error:', error);
      setErrorMessage('Failed to verify transaction. An unexpected error occurred.');
    } finally {
      setVerifyingTx(false);
    }
  };

// # ############################################################################ #
// # #                 SECTION 11 - EVENT HANDLER: RESET                 #
// # ############################################################################ #
  const handleReset = () => {
    setShowThankYou(false);
    setTipAmount('');
    setCustomAmount('');
    setTxHash('');
    setErrorMessage('');
    setIsVerified(false); // Reset World ID verification
    setVerificationLoading(false);
  };

// # ############################################################################ #
// # #                 SECTION 12 - JSX RETURN: TIP JAR COMPONENT                 #
// # ############################################################################ #
  return (
    <div style={styles.page}>
      <style>{responsiveStyles}</style>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
          <div>
            <Link to="/campaigns" style={{...styles.button, ...styles.buttonSecondary, marginRight: '0.5rem'}}>
              Campaigns
            </Link>
            {isAuthenticated ? (
              <Link to="/dashboard" style={{...styles.button, ...styles.buttonPrimary}}>
                Dashboard
              </Link>
            ) : (
              <Link to="/landing" style={{...styles.button, ...styles.buttonPrimary}}>
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      <div style={styles.container}>
        <div style={styles.donationCard}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Support WorldFund</h2>
            <p style={styles.cardSubtitle}>Your generous tip helps us maintain and improve the platform.</p>
          </div>

          <div style={styles.cardContent}>
            {errorMessage && !showThankYou && (
                <div style={styles.errorMessage}>{errorMessage}</div>
            )}

            {!isVerified && !showThankYou && (
              <div style={styles.worldIdContainer}>
                <p style={styles.worldIdText}>
                  To ensure transparency and prevent abuse, please verify with World ID before tipping.
                </p>
                <IDKitWidget
                  app_id={worldIDAppIdToUse} // FIXED: Using correctly typed app_id
                  action="tip_jar_donation_v2" // Ensure unique action string per environment/use-case
                  verification_level={VerificationLevel.Device}
                  onSuccess={handleVerificationSuccess}
                  onError={handleVerificationError}
                  // signal={uniqueSignal} // Consider adding a signal if needed
                >
                  {({ open }) => (
                    <button
                      onClick={() => {
                        setVerificationLoading(true);
                        setErrorMessage('');
                        open();
                      }}
                      style={{
                          ...styles.worldIdButton,
                          ...(verificationLoading ? { opacity: 0.7, cursor: 'progress' as const } : {})
                      }}
                      disabled={verificationLoading}
                    >
                      <svg style={styles.worldIdButtonIcon} viewBox="0 0 24 24"> {/* World ID Orb Icon */}
                        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm0-13a5 5 0 100 10 5 5 0 000-10zm0 8a3 3 0 110-6 3 3 0 010 6z"/>
                      </svg>
                      {verificationLoading ? 'Verifying...' : 'Verify with World ID'}
                    </button>
                  )}
                </IDKitWidget>
              </div>
            )}

            {showThankYou && (
              <div style={styles.successMessage}>
                <svg style={styles.successIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <h3 style={styles.successTitle}>Thank You For Your Tip!</h3>
                <p style={styles.successMessageText}>
                  Your contribution is greatly appreciated and helps us continue our work.
                </p>
                <button
                  onClick={handleReset}
                  style={{...styles.button, ...styles.buttonPrimary, marginTop: '1rem'}}
                >
                  Make Another Tip
                </button>
              </div>
            )}

            {isVerified && !showThankYou && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Select or Enter Tip Amount (WLD)</label>
                  <div style={styles.amountSelector}>
                    {PRESET_AMOUNTS.map(amount => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => handlePresetTip(amount)}
                        style={{
                          ...styles.amountButton,
                          ...(tipAmount === amount && customAmount === amount.toString() ? styles.amountButtonSelected : {}),
                        }}
                        disabled={verifyingTx}
                      >
                        {amount} WLD
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Or Enter Custom Amount"
                    value={customAmount}
                    onChange={handleCustomAmount}
                    style={styles.customAmount}
                    disabled={verifyingTx}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>1. Send WLD to this Address:</label>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    <div style={{...styles.addressBox, flexGrow: 1}}>
                      {WLD_ADDRESS}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      style={styles.copyButton}
                      title="Copy Address"
                    >
                      {copied ? 'Copied!' : (
                        <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="#1a73e8"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                      )}
                    </button>
                  </div>
                </div>

                <ol style={styles.instructionsList}>
                  <li style={styles.instructionItem}>
                    After sending {tipAmount ? `${tipAmount} WLD` : 'your chosen WLD amount'} to the address, copy the transaction hash from your wallet.
                  </li>
                  <li style={styles.instructionItem}>
                    Paste the transaction hash below and click "Verify Transaction" to confirm your tip.
                  </li>
                </ol>

                <div style={styles.formGroup}>
                  <label htmlFor="txHash" style={styles.label}>
                    2. Paste Transaction Hash
                  </label>
                  <input
                    type="text"
                    id="txHash"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="0x123abc..."
                    style={styles.txHashInput}
                    disabled={verifyingTx || !tipAmount}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyTransaction}
                    disabled={!txHash.trim() || verifyingTx || tipAmount === '' || tipAmount <= 0}
                    style={{
                        ...styles.verifyButton,
                        ...((!txHash.trim() || verifyingTx || tipAmount === '' || tipAmount <= 0) ? { opacity: 0.6, cursor: 'not-allowed' as const } : {})
                    }}
                  >
                    {verifyingTx ? (
                        <div style={styles.spinnerIcon} role="status" aria-label="Verifying transaction"></div>
                    ) : null}
                    {verifyingTx ? 'Verifying...' : 'Verify Transaction & Complete Tip'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <div style={styles.bottomSpacer}></div>
      </div>

      <nav style={styles.tabs}>
        <Link to="/" style={styles.tab}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path></svg>
          <span>Home</span>
        </Link>
        <Link to="/campaigns" style={styles.tab}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path></svg>
          <span>Explore</span>
        </Link>
        <Link to="/tip-jar" style={{...styles.tab, ...styles.tabActive}}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"></path></svg>
          <span>Tip Jar</span>
        </Link>
        <Link to={isAuthenticated ? "/dashboard" : "/landing"} style={styles.tab}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>
          <span>Account</span>
        </Link>
      </nav>
    </div>
  );
};

// # ############################################################################ #
// # #                               SECTION 13 - DEFAULT EXPORT                                #
// # ############################################################################ #
export default TipJar;