// src/pages/TipJar.tsx

// # ############################################################################ #
// # #                             SECTION 1 - IMPORTS                            #
// # ############################################################################ #
import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { IDKitWidget, VerificationLevel } from '@worldcoin/idkit';
import { useAuth } from '../components/AuthContext';

// # ############################################################################ #
// # #                            SECTION 2 - STYLES                             #
// # ############################################################################ #
const styles: { [key: string]: React.CSSProperties } = {
  page: { 
    textAlign: 'center', 
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif', 
    color: '#202124', 
    backgroundColor: '#f5f7fa', 
    margin: 0, 
    padding: 0, 
    overflowX: 'hidden', 
    width: '100%', 
    maxWidth: '100vw', 
    minHeight: '100vh', 
    display: 'flex', 
    flexDirection: 'column'
  },
  container: { 
    margin: '0 auto', 
    width: '100%', 
    padding: '0 0.5rem', 
    boxSizing: 'border-box', 
    maxWidth: '600px', 
    flexGrow: 1 
  },
  header: { 
    background: 'white', 
    padding: '0.5rem 0', 
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
    position: 'sticky', 
    top: 0, 
    zIndex: 100 
  },
  headerContent: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    maxWidth: '1200px', 
    margin: '0 auto', 
    padding: '0 0.5rem' 
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
  button: { 
    padding: '0.5rem 0.75rem', 
    borderRadius: '0.25rem', 
    fontWeight: 500, 
    cursor: 'pointer', 
    textDecoration: 'none', 
    textAlign: 'center', 
    fontSize: '0.875rem', 
    transition: 'background-color 0.2s, border-color 0.2s', 
    border: '1px solid transparent', 
    minHeight: '36px', 
    display: 'inline-flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    lineHeight: 1 
  },
  buttonPrimary: { 
    backgroundColor: '#1a73e8', 
    color: 'white', 
    borderColor: '#1a73e8' 
  },
  buttonSecondary: {
    backgroundColor: '#f1f3f4',
    color: '#202124',
    borderColor: '#dadce0'
  },
  donationCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    margin: '1.5rem 0'
  },
  cardHeader: {
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #f1f3f4',
    textAlign: 'center'
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#202124',
    margin: 0
  },
  cardSubtitle: {
    fontSize: '0.875rem',
    color: '#5f6368',
    marginTop: '0.5rem'
  },
  cardContent: {
    padding: '1.5rem'
  },
  formGroup: {
    marginBottom: '1.5rem',
    textAlign: 'left'
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#202124',
    marginBottom: '0.5rem'
  },
  amountSelector: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    marginBottom: '0.75rem'
  },
  amountButton: {
    flex: '1 0 auto',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    backgroundColor: '#f1f3f4',
    color: '#202124',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    cursor: 'pointer',
    minWidth: '60px'
  },
  amountButtonSelected: {
    backgroundColor: 'rgba(26, 115, 232, 0.1)',
    color: '#1a73e8',
    borderColor: '#1a73e8'
  },
  customAmount: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    boxSizing: 'border-box'
  },
  addressBox: {
    padding: '0.75rem',
    backgroundColor: '#f8f9fa',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    fontSize: '0.875rem',
    wordBreak: 'break-all',
    textAlign: 'left',
    fontFamily: 'monospace'
  },
  copyButton: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#1a73e8',
    backgroundColor: 'transparent',
    border: 'none',
    padding: '0.5rem 0',
    cursor: 'pointer',
    textAlign: 'right',
    width: '100%',
    marginTop: '0.25rem'
  },
  instructionsList: {
    textAlign: 'left',
    margin: '1.5rem 0',
    padding: '0 0 0 1.5rem',
    fontSize: '0.875rem',
    color: '#202124',
    lineHeight: 1.5
  },
  instructionItem: {
    marginBottom: '0.75rem'
  },
  txHashInput: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    boxSizing: 'border-box',
    fontFamily: 'monospace'
  },
  verifyButton: {
    width: '100%',
    padding: '0.5rem',
    fontSize: '0.875rem',
    color: '#1a73e8',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    marginTop: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  },
  successMessage: {
    backgroundColor: 'rgba(52, 168, 83, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(52, 168, 83, 0.2)',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    textAlign: 'center'
  },
  successIcon: {
    width: '3rem',
    height: '3rem',
    color: '#34a853',
    margin: '0 auto 1rem'
  },
  successTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#202124',
    marginBottom: '0.5rem'
  },
  successMessage2: {
    fontSize: '0.875rem',
    color: '#5f6368',
    marginBottom: '1rem'
  },
  errorMessage: {
    backgroundColor: 'rgba(234, 67, 53, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(234, 67, 53, 0.2)',
    padding: '1rem',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
    color: '#ea4335',
    textAlign: 'left'
  },
  worldIdContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #dadce0',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    textAlign: 'center'
  },
  worldIdText: {
    fontSize: '0.875rem',
    color: '#5f6368',
    marginBottom: '1rem'
  },
  worldIdButton: {
    backgroundColor: 'rgb(23, 25, 35)',
    color: 'white',
    borderRadius: '999px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.875rem',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    margin: '0 auto'
  },
  tabs: { 
    display: 'flex', 
    justifyContent: 'space-around', 
    backgroundColor: '#fff', 
    borderTop: '1px solid #e0e0e0', 
    position: 'fixed', 
    bottom: 0, 
    left: 0, 
    width: '100%', 
    zIndex: 100, 
    padding: '0.75rem 0', 
    boxShadow: '0 -1px 3px rgba(0,0,0,0.1)' 
  },
  tab: { 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    fontSize: '0.65rem', 
    color: '#5f6368', 
    textDecoration: 'none', 
    padding: '0.1rem 0.5rem', 
    flexGrow: 1, 
    textAlign: 'center', 
    transition: 'color 0.2s' 
  },
  tabActive: { 
    color: '#1a73e8' 
  },
  tabIcon: { 
    width: '1.125rem', 
    height: '1.125rem', 
    marginBottom: '0.125rem'
  },
  bottomSpacer: {
    height: '80px' // Space to clear the bottom tabs
  }
};

// # ############################################################################ #
// # #                SECTION 3 - COMPONENT: DEFINITION & STATE                 #
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
// # #                 SECTION 4 - CONSTANTS: DONATION ADDRESS                  #
// # ############################################################################ #
  // Your hardcoded WLD address
  const WLD_ADDRESS = '0x28043f711ab042b1780ede66d317929693f59c87';
  
  // Preset amounts
  const PRESET_AMOUNTS = [5, 10, 20];

// # ############################################################################ #
// # #        SECTION 5 - CALLBACK: WORLD ID VERIFICATION SUCCESS         #
// # ############################################################################ #
  const handleVerificationSuccess = useCallback(() => {
    setVerificationLoading(false);
    setIsVerified(true);
    setErrorMessage('');
  }, []);

// # ############################################################################ #
// # #         SECTION 6 - CALLBACK: WORLD ID VERIFICATION ERROR          #
// # ############################################################################ #
  const handleVerificationError = useCallback((error: unknown) => {
    console.error('World ID verification error:', error);
    setErrorMessage('Verification error. Please try again.');
    setVerificationLoading(false);
  }, []);

// # ############################################################################ #
// # #            SECTION 7 - EVENT HANDLER: PRESET TIP SELECTION             #
// # ############################################################################ #
  const handlePresetTip = (amount: number) => {
    setTipAmount(amount);
    setCustomAmount('');
    setErrorMessage('');
  };

// # ############################################################################ #
// # #           SECTION 8 - EVENT HANDLER: CUSTOM TIP AMOUNT            #
// # ############################################################################ #
  const handleCustomAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimals
    if (/^[0-9]*\.?[0-9]*$/.test(value)) {
      setCustomAmount(value);
      setTipAmount(value === '' ? '' : parseFloat(value));
    }
  };

// # ############################################################################ #
// # #               SECTION 9 - EVENT HANDLER: COPY ADDRESS               #
// # ############################################################################ #
  const handleCopyAddress = () => {
    navigator.clipboard.writeText(WLD_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

// # ############################################################################ #
// # #              SECTION 10 - EVENT HANDLER: VERIFY TRANSACTION             #
// # ############################################################################ #
  const handleVerifyTransaction = async () => {
    if (!txHash) {
      setErrorMessage('Please enter a transaction hash');
      return;
    }

    setVerifyingTx(true);
    setErrorMessage('');

    try {
      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock verification - in production, this would check with blockchain
      if (txHash.startsWith('0x') && txHash.length > 20) {
        console.log('Transaction verified successfully:', txHash);
        setShowThankYou(true);
        setTipAmount('');
        setCustomAmount('');
        setTxHash('');
      } else {
        setErrorMessage('Invalid transaction hash format');
      }
    } catch (error) {
      console.error('Transaction verification error:', error);
      setErrorMessage('Failed to verify transaction. Please try again.');
    } finally {
      setVerifyingTx(false);
    }
  };

// # ############################################################################ #
// # #                   SECTION 11 - EVENT HANDLER: RESET                    #
// # ############################################################################ #
  const handleReset = () => {
    setShowThankYou(false);
    setTipAmount('');
    setCustomAmount('');
    setTxHash('');
    setErrorMessage('');
  };

// # ############################################################################ #
// # #              SECTION 12 - JSX RETURN: TIP JAR COMPONENT              #
// # ############################################################################ #
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/" style={styles.logo}>World<span style={styles.logoSpan}>Fund</span></Link>
          <div>
            <Link to="/campaigns" style={{...styles.button, ...styles.buttonSecondary, marginRight: '0.5rem'}}>
              All Campaigns
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
            <p style={styles.cardSubtitle}>Your contribution helps us build a better platform.</p>
          </div>
          
          <div style={styles.cardContent}>
            {/* World ID Verification */}
            {!isVerified && !showThankYou && (
              <div style={styles.worldIdContainer}>
                <p style={styles.worldIdText}>
                  Please verify with World ID to continue.
                </p>
                <IDKitWidget
                  app_id="app_0de9312869c4818fc1a1ec64306551b69" // Example app ID
                  action="verify-user"
                  verification_level={VerificationLevel.Device}
                  onSuccess={handleVerificationSuccess}
                  onError={handleVerificationError}
                >
                  {({ open }) => (
                    <button
                      onClick={() => {
                        setVerificationLoading(true);
                        open();
                      }}
                      style={styles.worldIdButton}
                      disabled={verificationLoading}
                    >
                      {verificationLoading ? 'Verifying...' : 'Verify Identity'}
                    </button>
                  )}
                </IDKitWidget>
              </div>
            )}
            
            {/* Thank You Message */}
            {showThankYou && (
              <div style={styles.successMessage}>
                <svg style={styles.successIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <h3 style={styles.successTitle}>Thank You!</h3>
                <p style={styles.successMessage2}>
                  Your contribution helps support our mission.
                </p>
                <button
                  onClick={handleReset}
                  style={{...styles.button, ...styles.buttonPrimary}}
                >
                  Make Another Donation
                </button>
              </div>
            )}
            
            {/* Donation Form */}
            {isVerified && !showThankYou && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Amount (WLD)</label>
                  <div style={styles.amountSelector}>
                    {PRESET_AMOUNTS.map(amount => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => handlePresetTip(amount)}
                        style={{
                          ...styles.amountButton,
                          ...(tipAmount === amount ? styles.amountButtonSelected : {})
                        }}
                      >
                        {amount} WLD
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Custom Amount (WLD)"
                    value={customAmount}
                    onChange={handleCustomAmount}
                    style={styles.customAmount}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Send WLD to:</label>
                  <div style={styles.addressBox}>
                    {WLD_ADDRESS}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    style={styles.copyButton}
                  >
                    {copied ? 'Copied!' : 'Copy Address'}
                  </button>
                </div>
                
                <ol style={styles.instructionsList}>
                  <li style={styles.instructionItem}>
                    Send {tipAmount ? `${tipAmount} WLD` : 'WLD tokens'} to the address above using your wallet
                  </li>
                  <li style={styles.instructionItem}>
                    Copy the transaction hash once the transaction is confirmed
                  </li>
                  <li style={styles.instructionItem}>
                    Paste the transaction hash below to verify your donation
                  </li>
                </ol>
                
                <div style={styles.formGroup}>
                  <label htmlFor="txHash" style={styles.label}>
                    Transaction Hash
                  </label>
                  <input
                    type="text"
                    id="txHash"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="0x..."
                    style={styles.txHashInput}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyTransaction}
                    disabled={!txHash || verifyingTx}
                    style={styles.verifyButton}
                  >
                    {verifyingTx ? 'Verifying...' : 'Verify Transaction'}
                  </button>
                </div>
                
                {errorMessage && (
                  <div style={styles.errorMessage}>
                    {errorMessage}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        <div style={styles.bottomSpacer}></div>
      </div>
      
      {/* Bottom Navigation Tabs */}
      <nav style={styles.tabs}>
        <Link to="/" style={styles.tab}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path>
          </svg>
          <span>Home</span>
        </Link>
        <Link to="/campaigns" style={styles.tab}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
          </svg>
          <span>Explore</span>
        </Link>
        <Link to="/tip-jar" style={{...styles.tab, ...styles.tabActive}}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"></path>
          </svg>
          <span>Tip Jar</span>
        </Link>
        <Link to={isAuthenticated ? "/dashboard" : "/landing"} style={styles.tab}>
          <svg style={styles.tabIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
          </svg>
          <span>Account</span>
        </Link>
      </nav>
    </div>
  );
};

// # ############################################################################ #
// # #                         SECTION 13 - DEFAULT EXPORT                        #
// # ############################################################################ #
export default TipJar;