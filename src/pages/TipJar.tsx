// src/pages/TipJar.tsx

// # ############################################################################ #
// # #                     SECTION 1 - IMPORTS                                  #
// # ############################################################################ #
import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IDKitWidget, VerificationLevel, ISuccessResult } from '@worldcoin/idkit';
import { useAuth } from '../components/AuthContext';
import { tipService } from '../services/TipService';
import { contentModerationService, PreviewResult } from '../services/ContentModerationService';

// # ############################################################################ #
// # #                     SECTION 2 - CONSTANTS                                #
// # ############################################################################ #
const WLD_ADDRESS = '0x28043f711ab042b1780ede66d317929693f59c87';
const PRESET_AMOUNTS = [5, 10, 20, 50, 100];

// # ############################################################################ #
// # #             SECTION 3 - HELPER FOR WORLD ID APP ID                       #
// # ############################################################################ #
const getVerifiedAppId = (): `app_${string}` => {
  const appIdFromEnv = import.meta.env.VITE_WORLD_APP_ID;
  if (appIdFromEnv && appIdFromEnv.startsWith('app_')) {
    return appIdFromEnv as `app_${string}`;
  }
  // Fallback to the app ID from your documentation
  return "app_46c9cd743f94cc48093f843aca6b5a6";
};
const worldIDAppIdToUse = getVerifiedAppId();

// # ############################################################################ #
// # #                     SECTION 4 - COMPONENT DEFINITION                     #
// # ############################################################################ #
const TipJar: React.FC = () => {
  // # ############################################################################ #
  // # #                     SECTION 5 - AUTH CONTEXT & STATE                     #
  // # ############################################################################ #
  const {
    isAuthenticated,
    isWorldIdVerifiedGlobally,
    setWorldIdVerifiedGlobally,
    worldIdProofResult
  } = useAuth();

  // 🆕 DEBUG: Log the World ID state
  useEffect(() => {
    console.log('[TipJar] Auth state:', {
      isAuthenticated,
      isWorldIdVerifiedGlobally,
      hasProofResult: !!worldIdProofResult
    });
  }, [isAuthenticated, isWorldIdVerifiedGlobally, worldIdProofResult]);

  // # ############################################################################ #
  // # #                     SECTION 6 - LOCAL STATE                              #
  // # ############################################################################ #
  // Tip state
  const [tipAmount, setTipAmount] = useState<number | ''>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [txHash, setTxHash] = useState('');
  const [tipMessage, setTipMessage] = useState('');
  const [messagePreview, setMessagePreview] = useState<PreviewResult | null>(null);

  // UI state
  const [showThankYou, setShowThankYou] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [verifyingTx, setVerifyingTx] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  // Enhanced features
  const [tipHistory, setTipHistory] = useState<any[]>([]);
  const [totalTipped, setTotalTipped] = useState(0);

  // # ############################################################################ #
  // # #                     SECTION 7 - LIFECYCLE EFFECTS                        #
  // # ############################################################################ #
  // Load tip history on mount
  useEffect(() => {
    loadTipHistory();
  }, []);

  // 🆕 DEBUG: Check session storage on mount
  useEffect(() => {
    const storedVerified = sessionStorage.getItem('worldId_verified');
    const storedProof = sessionStorage.getItem('worldId_proof');
    console.log('[TipJar] Session storage check:', {
      storedVerified,
      hasStoredProof: !!storedProof
    });
  }, []);

  // # ############################################################################ #
  // # #                     SECTION 8 - DATA LOADING FUNCTIONS                   #
  // # ############################################################################ #
  const loadTipHistory = async () => {
    // In a real implementation, this would fetch from your backend
    const mockHistory = [
      { amount: 25, date: new Date().toISOString(), message: 'Great work!' },
      { amount: 10, date: new Date(Date.now() - 86400000).toISOString(), message: 'Keep it up!' },
    ];
    setTipHistory(mockHistory);
    setTotalTipped(mockHistory.reduce((sum, tip) => sum + tip.amount, 0));
  };

  // # ############################################################################ #
  // # #             SECTION 9 - WORLD ID VERIFICATION HANDLERS                   #
  // # ############################################################################ #
  const handleVerificationSuccess = useCallback((result: ISuccessResult) => {
    console.log('[TipJar] World ID Verification Success:', result);
    setWorldIdVerifiedGlobally(true);
    setErrorMessage('');
    
    // 🆕 Store in session for persistence
    try {
      sessionStorage.setItem('worldId_verified', 'true');
      sessionStorage.setItem('worldId_proof', JSON.stringify({
        verification_level: result.verification_level || 'device',
        verifiedAt: new Date().toISOString()
      }));
      console.log('[TipJar] World ID verification stored in session');
    } catch (error) {
      console.warn('[TipJar] Could not persist World ID state:', error);
    }
  }, [setWorldIdVerifiedGlobally]);

  const handleVerificationError = useCallback((error?: { message?: string } | any) => {
    console.error('[TipJar] World ID verification error:', error);
    setErrorMessage(error?.message || 'Verification failed. Please try again.');
  }, []);

  // # ############################################################################ #
  // # #                     SECTION 10 - TIP AMOUNT HANDLERS                     #
  // # ############################################################################ #
  const handlePresetTip = (amount: number) => {
    setTipAmount(amount);
    setCustomAmount(amount.toString());
    setErrorMessage('');
  };

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
  // # #                     SECTION 11 - UTILITY FUNCTIONS                       #
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

  const generateQRCode = () => {
    const qrData = `ethereum:${WLD_ADDRESS}?value=${tipAmount || 0}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
  };

  // # ############################################################################ #
  // # #                     SECTION 12 - MESSAGE HANDLERS                        #
  // # ############################################################################ #
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const message = e.target.value;
    setTipMessage(message);

    if (message.trim()) {
      const preview = contentModerationService.getContentPreview(message.trim());
      setMessagePreview(preview.hasChanges ? preview : null);
    } else {
      setMessagePreview(null);
    }
  };

  // # ############################################################################ #
  // # #                     SECTION 13 - TRANSACTION VERIFICATION                #
  // # ############################################################################ #
  const handleVerifyTransaction = async () => {
    if (!txHash.trim()) {
      setErrorMessage('Please enter a valid transaction hash.');
      return;
    }
    if (tipAmount === '' || tipAmount <= 0) {
      setErrorMessage('Please select or enter a valid tip amount.');
      return;
    }

    // Content moderation
    let messageToSubmit = tipMessage.trim();
    if (messageToSubmit) {
      const preview = contentModerationService.getContentPreview(messageToSubmit);
      if (preview.shouldBlock) {
        setErrorMessage('Your tip message contains inappropriate content and cannot be submitted.');
        return;
      }
      if (preview.hasChanges) {
        messageToSubmit = preview.previewText;
      }
    }

    setVerifyingTx(true);
    setErrorMessage('');

    try {
      // Simulate verification
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (txHash.startsWith('0x') && txHash.length >= 66) {
        const submitResult = await tipService.submitTip({
          amount: tipAmount as number,
          txHash: txHash,
          message: messageToSubmit || undefined,
        });

        if (submitResult.success) {
          setShowThankYou(true);
          setErrorMessage('');
          // Update history
          const newTip = {
            amount: tipAmount as number,
            date: new Date().toISOString(),
            message: messageToSubmit
          };
          setTipHistory(prev => [newTip, ...prev]);
          setTotalTipped(prev => prev + (tipAmount as number));
        } else {
          setErrorMessage(submitResult.error || 'Failed to record tip.');
        }
      } else {
        setErrorMessage('Invalid transaction hash.');
      }
    } catch (error) {
      console.error('Transaction verification error:', error);
      setErrorMessage('Failed to verify transaction.');
    } finally {
      setVerifyingTx(false);
    }
  };

  // # ############################################################################ #
  // # #                     SECTION 14 - RESET HANDLER                           #
  // # ############################################################################ #
  const handleReset = useCallback(() => {
    console.log('[TipJar] Resetting tip jar for new tip...');
    setShowThankYou(false);
    setTipAmount('');
    setCustomAmount('');
    setTxHash('');
    setTipMessage('');
    setVerifyingTx(false);
    setCopied(false);
    setErrorMessage('');
    setMessagePreview(null);
    // Note: We don't reset isWorldIdVerifiedGlobally here
  }, []);

  // # ############################################################################ #
  // # #                     SECTION 15 - RENDER                                  #
  // # ############################################################################ #
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/" className="flex items-center text-blue-600 font-bold text-lg">
            Fund
          </Link>
          <div className="flex gap-2">
            <Link 
              to="/campaigns" 
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Campaigns
            </Link>
            <Link 
              to={isAuthenticated ? "/dashboard" : "/landing"} 
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {isAuthenticated ? "Dashboard" : "Sign In"}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Support Fund</h1>
            <p className="text-gray-600 mb-4">
              Your tips help us maintain and improve the platform for everyone.
            </p>
            
            {/* Stats Display */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{totalTipped}</div>
                <div className="text-sm text-gray-600">Total WLD Tipped</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{tipHistory.length}</div>
                <div className="text-sm text-gray-600">Tips Sent</div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && !showThankYou && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {errorMessage}
          </div>
        )}

        {/* World ID Verification - Only show if not globally verified */}
        {!isWorldIdVerifiedGlobally && !showThankYou && (
          <div className="bg-gray-50 rounded-lg border p-6 mb-6 text-center">
            <p className="text-gray-700 mb-4">
              Verify with World ID to ensure secure, sybil-resistant tipping.
            </p>
            <IDKitWidget
              app_id={worldIDAppIdToUse}
              action="tip_jar_donation_v2"
              verification_level={VerificationLevel.Device}
              onSuccess={handleVerificationSuccess}
              onError={handleVerificationError}
            >
              {({ open }: { open: () => void }) => (
                <button
                  onClick={() => {
                    setErrorMessage('');
                    open();
                  }}
                  className="bg-gray-900 text-white px-6 py-3 rounded-full hover:bg-gray-800 transition-colors inline-flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm0-13a5 5 0 100 10 5 5 0 000-10zm0 8a3 3 0 110-6 3 3 0 010 6z"/>
                  </svg>
                  Verify with World ID
                </button>
              )}
            </IDKitWidget>
          </div>
        )}

        {/* Thank You State */}
        {showThankYou && (
          <div className="bg-green-50 rounded-lg p-8 text-center mb-6">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Thank You For Your Tip!</h3>
            <p className="text-gray-600 mb-6">
              Your contribution helps us continue improving Fund for everyone.
            </p>
            <button
              onClick={handleReset}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Send Another Tip
            </button>
          </div>
        )}

        {/* Tip Form - Show if World ID verified */}
        {isWorldIdVerifiedGlobally && !showThankYou && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
              ✅ World ID Verified! You can now leave a tip.
            </div>

            {/* Amount Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select or Enter Tip Amount (WLD)
              </label>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {PRESET_AMOUNTS.map(amount => (
                  <button
                    key={amount}
                    onClick={() => handlePresetTip(amount)}
                    className={`p-3 text-sm font-medium rounded-lg border transition-colors ${
                      tipAmount === amount && customAmount === amount.toString()
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                    disabled={verifyingTx}
                  >
                    {amount} WLD
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Or enter custom amount"
                value={customAmount}
                onChange={handleCustomAmount}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={verifyingTx}
              />
            </div>

            {/* Wallet Address */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                1. Send WLD to this address:
              </label>
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-gray-50 border rounded-lg font-mono text-sm break-all">
                  {WLD_ADDRESS}
                </div>
                <button
                  onClick={handleCopyAddress}
                  className="px-3 py-2 text-blue-600 hover:text-blue-700"
                  title="Copy Address"
                >
                  {copied ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => setShowQRCode(!showQRCode)}
                  className="px-3 py-2 text-blue-600 hover:text-blue-700"
                  title="Show QR Code"
                >
                  📱
                </button>
              </div>
              
              {showQRCode && tipAmount && (
                <div className="mt-4 text-center">
                  <img 
                    src={generateQRCode()} 
                    alt="Wallet QR Code" 
                    className="mx-auto rounded-lg shadow-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">QR Code for {tipAmount} WLD</p>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message (optional)
              </label>
              <textarea
                value={tipMessage}
                onChange={handleMessageChange}
                placeholder="Add a message with your tip (max 100 characters)"
                maxLength={100}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={verifyingTx}
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500">
                  {tipMessage.length}/100
                  {messagePreview?.hasChanges && (
                    <span className="text-blue-600 font-medium ml-2">• Content will be filtered</span>
                  )}
                </span>
              </div>
              {messagePreview?.hasChanges && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-xs text-blue-700">
                    <strong>Preview:</strong> "{messagePreview.previewText}"
                  </div>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="mb-6 text-sm text-gray-600">
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  After sending {tipAmount ? `${tipAmount} WLD` : 'your chosen WLD amount'} to the address, copy the transaction hash from your wallet.
                </li>
                <li>
                  Paste the transaction hash below and click "Verify Transaction" to confirm your tip.
                </li>
              </ol>
            </div>

            {/* Transaction Hash Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                2. Paste Transaction Hash
              </label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x123abc..."
                className="w-full p-3 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={verifyingTx || !tipAmount}
              />
              
              <button
                onClick={handleVerifyTransaction}
                disabled={!txHash.trim() || verifyingTx || tipAmount === '' || tipAmount <= 0 || messagePreview?.shouldBlock}
                className={`w-full mt-4 py-3 px-4 rounded-lg font-medium transition-colors ${
                  (!txHash.trim() || verifyingTx || tipAmount === '' || tipAmount <= 0 || messagePreview?.shouldBlock)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {verifyingTx ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  'Verify Transaction & Complete Tip'
                )}
              </button>
            </div>

            {/* Advanced Options */}
            <div className="border-t pt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
              >
                <span>Advanced Options</span>
                <svg 
                  className={`ml-1 w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600">Network</label>
                    <select className="mt-1 w-full p-2 border border-gray-300 rounded text-sm" disabled>
                      <option>World Chain (Mainnet)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">Token</label>
                    <select className="mt-1 w-full p-2 border border-gray-300 rounded text-sm" disabled>
                      <option>WLD (Worldcoin)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Tips History */}
        {tipHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Recent Tips</h3>
            <div className="space-y-3">
              {tipHistory.slice(0, 5).map((tip, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{tip.amount} WLD</div>
                    {tip.message && (
                      <div className="text-sm text-gray-600">"{tip.message}"</div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(tip.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t fixed bottom-0 left-0 right-0 px-4 py-3">
        <div className="flex justify-around">
          <Link to="/" className="flex flex-col items-center text-gray-500 text-xs">
            <svg className="w-5 h-5 mb-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            Home
          </Link>
          <Link to="/campaigns" className="flex flex-col items-center text-gray-500 text-xs">
            <svg className="w-5 h-5 mb-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            Explore
          </Link>
          <Link to="/tip-jar" className="flex flex-col items-center text-blue-600 text-xs">
            <svg className="w-5 h-5 mb-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
            </svg>
            Tip Jar
          </Link>
          <Link to={isAuthenticated ? "/dashboard" : "/landing"} className="flex flex-col items-center text-gray-500 text-xs">
            <svg className="w-5 h-5 mb-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            Account
          </Link>
        </div>
      </nav>
    </div>
  );
};

// # ############################################################################ #
// # #                     SECTION 16 - DEFAULT EXPORT                          #
// # ############################################################################ #
export default TipJar;