// src/pages/TipJar.tsx 
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { IDKitWidget, VerificationLevel } from '@worldcoin/idkit';

type TipCurrency = 'USDC' | 'BTC';

interface TipJarProps {
  // Optionally add onNavigate prop to allow bottom nav links to trigger navigation.
  onNavigate?: (route: string) => void;
}

const TipJar: React.FC<TipJarProps> = ({ onNavigate }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<TipCurrency>('USDC');
  const [tipAmount, setTipAmount] = useState<number | ''>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); // for bottom nav modal example
  const navigate = useNavigate();

  // Your donation addresses hardcoded
  const USDC_ADDRESS = '0x5816E346C014e4BE06bA48de8c0Bf08A61f9033F';
  const BTC_ADDRESS = 'bc1ql4jewr8xndqtn90k58n5lky42gjf3tas26u58j';

  // Optionally check for existing verification at mount here
  useEffect(() => {
    // Placeholder: check if the user is already verified (e.g., via your authService)
  }, []);

  // Handler for successful World ID verification
  const handleVerificationSuccess = useCallback(() => {
    setVerificationLoading(false);
    setIsVerified(true);
    setErrorMessage('');
  }, []);

  // Handler for World ID verification error
  const handleVerificationError = useCallback((error: unknown) => {
    console.error('World ID verification error:', error);
    setErrorMessage('Verification error. Please try again.');
    setVerificationLoading(false);
  }, []);

  // Preset tip handler
  const handlePresetTip = (amount: number) => {
    setTipAmount(amount);
    setErrorMessage('');
  };

  // Submit tip handler; in production replace with API call
  const handleTipSubmit = async () => {
    if (!isVerified) {
      setErrorMessage('Please verify your identity first.');
      return;
    }
    if (!tipAmount || tipAmount <= 0) {
      setErrorMessage('Enter a valid tip amount.');
      return;
    }
    try {
      setErrorMessage('');
      console.log(
        `Processing tip of $${tipAmount} in ${selectedCurrency} to address: ${
          selectedCurrency === 'USDC' ? USDC_ADDRESS : BTC_ADDRESS
        }`
      );
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setShowThankYou(true);
      setTipAmount('');
    } catch (error) {
      console.error(error);
      setErrorMessage('Failed to process tip. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-grow">
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-8">
          <h2 className="text-xl font-semibold text-center mb-2 text-blue-900">
            Support WorldFund
          </h2>
          <p className="text-center text-sm text-gray-600 mb-6">
            Your contribution helps us build a better platform.
          </p>

          {/* World ID Verification */}
          {!isVerified && !showThankYou && (
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
              <p className="text-center text-gray-700 mb-3">
                Please verify with World ID to continue.
              </p>
              <IDKitWidget
                app_id={import.meta.env.VITE_WORLD_APP_ID as `app_${string}`}
                action={import.meta.env.VITE_WORLD_ID_ACTION}
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
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                    disabled={verificationLoading}
                  >
                    {verificationLoading ? 'Verifying...' : 'Verify Identity'}
                  </button>
                )}
              </IDKitWidget>
            </div>
          )}

          {/* Tip Form */}
          {isVerified && !showThankYou && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4 text-center">
                <p className="font-medium text-gray-700">You are verified!</p>
              </div>

              <div className="flex justify-center items-center mb-4 gap-2">
                <button
                  onClick={() => setSelectedCurrency('USDC')}
                  className={`px-3 py-1 rounded ${
                    selectedCurrency === 'USDC'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  USDC
                </button>
                <button
                  onClick={() => setSelectedCurrency('BTC')}
                  className={`px-3 py-1 rounded ${
                    selectedCurrency === 'BTC'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  BTC
                </button>
              </div>

              <div className="text-center mb-4">
                {selectedCurrency === 'USDC' ? (
                  <p className="text-sm text-gray-600 break-all">
                    USDC Address:{' '}
                    <span className="font-medium">{USDC_ADDRESS}</span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 break-all">
                    BTC Address:{' '}
                    <span className="font-medium">{BTC_ADDRESS}</span>
                  </p>
                )}
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Tip Amount:
                </p>
                <div className="flex justify-center gap-2 mb-2">
                  {[5, 10, 20].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => handlePresetTip(amt)}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="number"
                    className="border border-gray-300 rounded px-2 py-1 w-24 text-center"
                    placeholder="Custom"
                    value={tipAmount === '' ? '' : tipAmount}
                    onChange={(e) => setTipAmount(Number(e.target.value))}
                  />
                  <button
                    onClick={handleTipSubmit}
                    className="bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 transition-colors"
                  >
                    Donate
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Thank You Message */}
          {showThankYou && (
            <div className="bg-green-50 border border-green-200 rounded p-4 text-center mb-4">
              <h3 className="text-green-700 font-medium mb-2">Thank You!</h3>
              <p className="text-gray-700 mb-2">
                Your contribution helps support our mission.
              </p>
              <button
                onClick={() => {
                  setShowThankYou(false);
                  setErrorMessage('');
                }}
                className="underline text-blue-600 text-sm"
              >
                Make Another Donation
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-center text-red-700 text-sm mt-2">
              {errorMessage}
            </div>
          )}

          {/* Bottom Navigation Tabs */}
          <div className="flex justify-around items-center border-t border-gray-200 mt-6 pt-4">
            <a href="#" className="flex flex-col items-center">
              <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
              <span className="text-sm font-medium text-blue-600">Home</span>
            </a>
            <a href="#" className="flex flex-col items-center">
              <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <span className="text-sm font-medium text-gray-600">Search</span>
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onNavigate ? onNavigate('tipjar') : navigate('/tip-jar');
              }}
              className="flex flex-col items-center"
            >
              <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
              </svg>
              <span className="text-sm font-medium text-blue-600">Tip Jar</span>
            </a>
            <a href="#" className="flex flex-col items-center">
              <svg
                className={`w-6 h-6 ${isVerified ? 'text-blue-600' : 'text-gray-600'}`}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              <span className="text-sm font-medium">
                {isVerified ? 'Verified' : 'Account'}
              </span>
            </a>
          </div>

          {/* Debug Indicator (Optional) */}
          <div
            className="fixed bottom-12 right-2 px-2 py-1 rounded bg-black text-white text-xs opacity-70 z-50"
          >
            Modal: {verificationLoading ? 'OPEN' : 'CLOSED'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TipJar;
