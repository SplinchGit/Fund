// src/pages/TipJar.tsx

import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { wldPaymentService, TransactionStatus, type WorldIDProofData } from '../services/WLDPaymentService';
import { VerificationLevel } from '@worldcoin/minikit-js';

// Constants
const PRESET_AMOUNTS = [5, 10, 25, 50, 100];
const TIP_RECIPIENT_ADDRESS = '0x28043f711ab042b1780ede66d317929693f59c87';


const TipJar: React.FC = () => {
  const { isAuthenticated, walletAddress } = useAuth();
  const currentUserId = walletAddress || null;

  // Form state
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [tipMessage, setTipMessage] = useState<string>('');
  
  // Process state
  const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.IDLE);
  const [uiMessage, setUiMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Processing state check
  const isProcessing = [
    TransactionStatus.PENDING_WALLET_APPROVAL,
    TransactionStatus.PENDING_MINIKIT_SUBMISSION,
    TransactionStatus.PENDING_CHAIN_CONFIRMATION
  ].includes(status);

  // Initialize component
  useEffect(() => {
    if (isAuthenticated) {
      setUiMessage('Select an amount to support WorldFund.');
    } else {
      setUiMessage('Please sign in to support WorldFund.');
    }
  }, [isAuthenticated]);

  // Get final tip amount
  const getFinalAmount = (): number => {
    if (showCustomInput && customAmount) {
      return parseFloat(customAmount);
    }
    return selectedAmount || 0;
  };

  // Amount selection handlers
  const handlePresetAmountClick = (amount: number) => {
    setSelectedAmount(amount);
    setShowCustomInput(false);
    setCustomAmount('');
    setErrorMessage(null);
  };

  const handleCustomClick = () => {
    setSelectedAmount(null);
    setShowCustomInput(true);
    setErrorMessage(null);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setCustomAmount(value);
    }
  };


  // Message change handler
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTipMessage(e.target.value);
  };

  // Tip submission handler
  const handleTipSubmit = async () => {
    if (!isAuthenticated) {
      setErrorMessage('Please sign in first.');
      return;
    }
    
    const finalAmount = getFinalAmount();
    
    if (isNaN(finalAmount) || finalAmount < 1) {
      setErrorMessage('Minimum tip amount is 1 WLD.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setStatus(TransactionStatus.PENDING_WALLET_APPROVAL);
    setUiMessage('Please check your World App to approve the WLD transaction...');

    try {
      // Initiate payment through MiniKit
      const { worldcoinTransactionId: txServiceId } = await wldPaymentService.initiateWLDDonationWithMiniKit(
        TIP_RECIPIENT_ADDRESS,
        finalAmount.toString()
      );
      
      setStatus(TransactionStatus.PENDING_MINIKIT_SUBMISSION);
      setUiMessage(`Transaction submitted. Processing...`);

      // Simulate transaction confirmation
      setTimeout(() => {
        if (txServiceId) {
          setStatus(TransactionStatus.CONFIRMED);
          setSuccessMessage(`Thank you for your ${finalAmount} WLD tip! It helps us improve WorldFund for everyone.`);
          setUiMessage('');
        }
      }, 3000);

    } catch (err: any) {
      console.error('MiniKit Tip Error:', err);
      setErrorMessage(err.message || 'Failed to process tip with World App.');
      setStatus(TransactionStatus.FAILED);
      setUiMessage('');
    }
  };

  // Reset handler
  const handleReset = useCallback(() => {
    setStatus(TransactionStatus.IDLE);
    setSelectedAmount(null);
    setCustomAmount('');
    setShowCustomInput(false);
    setTipMessage('');
    setErrorMessage(null);
    setSuccessMessage(null);
    setUiMessage('Select an amount to support WorldFund.');
  }, []);


  // Success state
  if (status === TransactionStatus.CONFIRMED && successMessage) {
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

        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-6">{successMessage}</p>
            <button
              onClick={handleReset}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Send Another Tip
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        {/* Hero Section */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Support WorldFund</h1>
          <p className="text-lg text-gray-600 mb-8">
            Help us maintain and improve the platform for everyone.
          </p>

          {/* Amount Selection */}
          {isAuthenticated && (
            <div className="mb-8">
              <label className="block text-lg font-medium text-gray-700 mb-4 text-center">
                Choose Amount
              </label>
              
              {/* Preset Amounts */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {PRESET_AMOUNTS.map(amount => (
                  <button
                    key={amount}
                    onClick={() => handlePresetAmountClick(amount)}
                    className={`p-4 rounded-lg border-2 font-medium transition-all ${
                      selectedAmount === amount
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                    disabled={isProcessing}
                  >
                    {amount} WLD
                  </button>
                ))}
                <button
                  onClick={handleCustomClick}
                  className={`p-4 rounded-lg border-2 font-medium transition-all ${
                    showCustomInput
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                  disabled={isProcessing}
                >
                  Custom
                </button>
              </div>
              
              {/* Custom Amount Input */}
              {showCustomInput && (
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Enter custom amount (min. 1 WLD)"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg"
                    disabled={isProcessing}
                  />
                </div>
              )}

              {/* Optional Message */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add a message (optional)
                </label>
                <textarea
                  value={tipMessage}
                  onChange={handleMessageChange}
                  placeholder="Thank you for building such an amazing platform!"
                  maxLength={100}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isProcessing}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {tipMessage.length}/100 characters
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleTipSubmit}
                disabled={!getFinalAmount() || getFinalAmount() < 1 || isProcessing}
                className={`w-full py-4 px-6 rounded-lg font-medium text-lg transition-colors ${
                  !getFinalAmount() || getFinalAmount() < 1 || isProcessing
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  `Support with ${getFinalAmount() || 0} WLD`
                )}
              </button>
            </div>
          )}

          {/* Sign In Required */}
          {!isAuthenticated && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Please sign in to support WorldFund</p>
              <Link 
                to="/landing" 
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Sign In
              </Link>
            </div>
          )}

        </div>

        {/* Status Messages */}
        {uiMessage && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6 text-center">
            {isProcessing && (
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
            )}
            {uiMessage}
          </div>
        )}

        {/* Error Messages */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {errorMessage}
          </div>
        )}

        {/* How it Works */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">How it Works</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start">
              <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium mr-3 mt-0.5">1</div>
              <div>Choose a preset amount or enter a custom tip (minimum 1 WLD)</div>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium mr-3 mt-0.5">2</div>
              <div>Complete payment through your World App using MiniKit</div>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium mr-3 mt-0.5">3</div>
              <div>Your tip helps us improve WorldFund for everyone!</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TipJar;