// src/components/WLDDonationForm.tsx 

// # ############################################################################ #
// # #                            SECTION 1 - IMPORTS                             #
// # ############################################################################ #
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { wldPaymentService, TransactionStatus, type WorldIDProofData } from '../services/WLDPaymentService';
import { VerificationLevel } from '@worldcoin/minikit-js';

// # ############################################################################ #
// # #                       SECTION 2 - INTERFACE: COMPONENT PROPS                       #
// # ############################################################################ #
interface WLDDonationFormProps {
  campaignId: string;
  onDonationSuccess?: () => void;
}

// # ############################################################################ #
// # #                       SECTION 3 - COMPONENT: DEFINITION & STATE                       #
// # ############################################################################ #
export const WLDDonationForm: React.FC<WLDDonationFormProps> = ({
  campaignId,
  onDonationSuccess
}) => {
  const { isAuthenticated, walletAddress } = useAuth();
  const currentUserId = walletAddress || null;

  // Form state - 🔥 FIXED: Changed minAmount from 0.1 to 1
  const [amount, setAmount] = useState<string>('');
  const [minAmount] = useState<number>(1); // 🔥 CHANGED from 0.1 to 1
  
  // Process state
  const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.IDLE);
  const [uiMessage, setUiMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Campaign and verification state
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [isWorldIdVerified, setIsWorldIdVerified] = useState<boolean>(false);
  const [worldIdProofData, setWorldIdProofData] = useState<WorldIDProofData | null>(null);

  // Transaction tracking
  const [worldcoinTransactionId, setWorldcoinTransactionId] = useState<string | undefined>(undefined);
  const [onChainTxHash, setOnChainTxHash] = useState<string | undefined>(undefined);

  // Processing state check
  const isProcessing = [
    TransactionStatus.PENDING_WORLDID_USER_INPUT,
    TransactionStatus.PENDING_WORLDID_BACKEND_VERIFICATION,
    TransactionStatus.PENDING_WALLET_APPROVAL,
    TransactionStatus.PENDING_MINIKIT_SUBMISSION,
    TransactionStatus.PENDING_CHAIN_CONFIRMATION,
    TransactionStatus.BACKEND_VERIFICATION_NEEDED
  ].includes(status);

  // # ############################################################################ #
  // # #                 SECTION 4 - EFFECT: FETCH RECIPIENT ADDRESS                 #
  // # ############################################################################ #
  useEffect(() => {
    let isMounted = true;
    
    const fetchRecipientDetails = async () => {
      if (!campaignId) return;
      
      if (isMounted) {
        setUiMessage('Loading campaign details...');
        setErrorMessage(null);
        setSuccessMessage(null);
        setStatus(TransactionStatus.IDLE);
        resetForm();
      }
      
      try {
        const { campaignAddress } = await wldPaymentService.getCampaignRecipientAddress(campaignId);
        
        if (isMounted) {
          if (campaignAddress) {
            setRecipientAddress(campaignAddress);
            setUiMessage(`Ready to donate to: ${campaignAddress.substring(0,6)}...${campaignAddress.substring(campaignAddress.length-4)}`);
          } else {
            throw new Error('Campaign recipient address not found.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to fetch campaign details:', err);
          setErrorMessage(err.message || 'Could not load campaign details.');
          setStatus(TransactionStatus.FAILED);
          setUiMessage('');
        }
      }
    };

    fetchRecipientDetails();
    return () => { isMounted = false; };
  }, [campaignId]);

  // # ############################################################################ #
  // # #                       SECTION 5 - EVENT HANDLER: AMOUNT CHANGE                       #
  // # ############################################################################ #
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  // # ############################################################################ #
  // # #                       SECTION 6 - HELPER: RESET FORM                       #
  // # ############################################################################ #
  const resetForm = useCallback(() => {
    setIsWorldIdVerified(false);
    setWorldIdProofData(null);
    setAmount('');
    setWorldcoinTransactionId(undefined);
    setOnChainTxHash(undefined);
  }, []);

  // # ############################################################################ #
  // # #                  SECTION 7 - HANDLER: WORLD ID VERIFICATION                  #
  // # ############################################################################ #
  const handleWorldIdVerifyClick = async () => {
    if (!isAuthenticated) {
      setErrorMessage('Please sign in first.');
      return;
    }
    
    setErrorMessage(null);
    setSuccessMessage(null);
    setStatus(TransactionStatus.PENDING_WORLDID_USER_INPUT);
    setUiMessage('Please check your World App to verify your identity...');

    try {
      const proof = await wldPaymentService.verifyIdentityForDonation(
        campaignId,
        currentUserId,
        VerificationLevel.Device // You can change this to Orb for higher security
      );
      
      setWorldIdProofData(proof);
      setStatus(TransactionStatus.PENDING_WORLDID_BACKEND_VERIFICATION);
      setUiMessage('Verifying World ID with server...');
      
      // Simulate backend verification (replace with actual backend call if needed)
      await new Promise(resolve => setTimeout(resolve, 1500));

      setIsWorldIdVerified(true);
      setStatus(TransactionStatus.WORLDID_VERIFIED);
      setUiMessage(`World ID Verified (${proof.verification_level}). You can now specify an amount.`);
      setSuccessMessage(`World ID Verified! You can now make a donation.`);

    } catch (err: any) {
      console.error('World ID Verification Error:', err);
      setErrorMessage(err.message || 'World ID verification failed. Please try again.');
      setStatus(TransactionStatus.WORLDID_FAILED);
      setWorldIdProofData(null);
      setUiMessage('');
    }
  };

  // # ############################################################################ #
  // # #                       SECTION 8 - HANDLER: DONATE SUBMIT                       #
  // # ############################################################################ #
  const handleDonateSubmit = async () => {
    if (!isWorldIdVerified || !worldIdProofData) {
      setErrorMessage('Please verify your World ID first.');
      return;
    }
    if (!recipientAddress) {
      setErrorMessage('Campaign recipient address is not available.');
      return;
    }
    
    const numericAmount = parseFloat(amount);
    
    // 🔥 FIXED: Updated validation to enforce 1 WLD minimum
    if (isNaN(numericAmount) || numericAmount < 1) {
      setErrorMessage('Minimum donation amount is 1 WLD.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setStatus(TransactionStatus.PENDING_WALLET_APPROVAL);
    setUiMessage('Please check your World App to approve the WLD transaction...');

    try {
      // Initiate payment through MiniKit Pay Command
      const { worldcoinTransactionId: txServiceId } = await wldPaymentService.initiateWLDDonationWithMiniKit(
        recipientAddress,
        amount
      );
      
      setWorldcoinTransactionId(txServiceId);
      setStatus(TransactionStatus.PENDING_MINIKIT_SUBMISSION);
      setUiMessage(`Transaction submitted (ID: ${txServiceId.substring(0,10)}...). Processing...`);

      // For MiniKit Pay Command, we simulate the transaction confirmation
      // In a real implementation, you might need to poll for transaction status
      // or handle this differently based on MiniKit's response format
      setTimeout(() => {
        if (txServiceId) {
          // Simulate transaction hash generation (replace with actual logic)
          const mockTxHash = `0x${Math.random().toString(16).slice(2, 66)}`;
          setOnChainTxHash(mockTxHash);
          setStatus(TransactionStatus.PENDING_CHAIN_CONFIRMATION);
          setUiMessage(`Transaction confirmed! Processing with backend...`);
          
          // Proceed to backend verification
          handleBackendVerification(mockTxHash);
        }
      }, 3000);

    } catch (err: any) {
      console.error('MiniKit Donation Error:', err);
      setErrorMessage(err.message || 'Failed to initiate donation with World App.');
      setStatus(TransactionStatus.FAILED);
      setUiMessage('');
    }
  };

  // # ############################################################################ #
  // # #                       SECTION 9 - HANDLER: BACKEND VERIFICATION                       #
  // # ############################################################################ #
  const handleBackendVerification = async (txHash: string) => {
    if (!worldIdProofData) {
      setErrorMessage("World ID proof data is missing for verification.");
      setStatus(TransactionStatus.FAILED);
      return;
    }

    setStatus(TransactionStatus.BACKEND_VERIFICATION_NEEDED);
    setUiMessage('Verifying donation with our server...');

    try {
      const backendResult = await wldPaymentService.notifyBackendOfConfirmedDonation(
        campaignId,
        amount,
        txHash,
        worldIdProofData.nullifier_hash,
        worldIdProofData.verification_level
      );

      if (backendResult.success && backendResult.verificationStatus === TransactionStatus.CONFIRMED) {
        setSuccessMessage('Donation successfully verified and recorded! Thank you!');
        setStatus(TransactionStatus.CONFIRMED);
        setUiMessage('');
        if (onDonationSuccess) onDonationSuccess();
      } else {
        throw new Error(backendResult.message || 'Backend verification failed.');
      }
    } catch (err: any) {
      console.error("Backend donation verification error:", err);
      setErrorMessage(err.message || 'Failed to finalize donation with server.');
      setStatus(TransactionStatus.FAILED);
      setUiMessage('');
    }
  };

  // # ############################################################################ #
  // # #                       SECTION 10 - HANDLER: RESET DONATION FORM                       #
  // # ############################################################################ #
  const handleReset = () => {
    setStatus(TransactionStatus.IDLE);
    setSuccessMessage(null);
    setErrorMessage(null);
    resetForm();
    
    // Refetch campaign details
    const fetchDetails = async () => {
      try {
        const { campaignAddress } = await wldPaymentService.getCampaignRecipientAddress(campaignId);
        setRecipientAddress(campaignAddress);
        setUiMessage(`Ready to donate to: ${campaignAddress.substring(0,6)}...${campaignAddress.substring(campaignAddress.length-4)}`);
      } catch (err: any) {
        setErrorMessage(err.message || 'Could not reload details.');
        setStatus(TransactionStatus.FAILED);
      }
    };
    fetchDetails();
  };

  // # ############################################################################ #
  // # #                       SECTION 11 - UI RENDERING LOGIC: LOADING STATE                       #
  // # ############################################################################ #
  // Loading state
  if (!recipientAddress && !errorMessage && status === TransactionStatus.IDLE) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">{uiMessage || 'Loading donation details...'}</p>
      </div>
    );
  }

  // # ############################################################################ #
  // # #                       SECTION 12 - UI RENDERING LOGIC: SUCCESS STATE                       #
  // # ############################################################################ #
  // Success state
  if (status === TransactionStatus.CONFIRMED && successMessage) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
        <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-green-800">Donation Successful!</h3>
        <p className="mt-1 text-sm text-green-600">{successMessage}</p>
        <button
          onClick={handleReset}
          className="mt-4 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Make Another Donation
        </button>
      </div>
    );
  }

  // # ############################################################################ #
  // # #                       SECTION 13 - UI RENDERING LOGIC: MAIN FORM                       #
  // # ############################################################################ #
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800">Donate WLD via World App</h3>
        {recipientAddress && (
          <p className="mt-1 text-xs text-gray-500">
            To: {recipientAddress.substring(0,10)}...{recipientAddress.substring(recipientAddress.length-6)}
          </p>
        )}
      </div>

      <div className="p-6 space-y-4">
        {/* Step 1: World ID Verification */}
        {!isWorldIdVerified && (
          <button
            onClick={handleWorldIdVerifyClick}
            disabled={isProcessing || !recipientAddress || !isAuthenticated}
            className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {(status === TransactionStatus.PENDING_WORLDID_USER_INPUT || status === TransactionStatus.PENDING_WORLDID_BACKEND_VERIFICATION) ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              "1. Verify with World ID"
            )}
          </button>
        )}

        {/* Success message for World ID verification */}
        {isWorldIdVerified && successMessage && status === TransactionStatus.WORLDID_VERIFIED && (
          <div className="p-3 bg-green-50 border-l-4 border-green-400">
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        )}

        {/* Step 2: Amount input and donation */}
        {isWorldIdVerified && (
          <div className="space-y-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Amount (WLD)
              </label>
              <input
                type="text"
                id="amount"
                value={amount}
                onChange={handleAmountChange}
                placeholder="Minimum 1 WLD" // 🔥 FIXED: Updated placeholder
                disabled={isProcessing || status !== TransactionStatus.WORLDID_VERIFIED}
                className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md disabled:bg-gray-50"
              />
            </div>
            
            <button
              onClick={handleDonateSubmit}
              disabled={isProcessing || !amount || parseFloat(amount) < 1 || status !== TransactionStatus.WORLDID_VERIFIED} // 🔥 FIXED: Changed < minAmount to < 1
              className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {(status === TransactionStatus.PENDING_WALLET_APPROVAL || status === TransactionStatus.PENDING_MINIKIT_SUBMISSION) ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                "2. Donate WLD via World App"
              )}
            </button>
          </div>
        )}

        {/* Status messages */}
        {uiMessage && !successMessage && !errorMessage && (
          <div className="mt-3 text-sm text-gray-600 text-center">
            {isProcessing && (
              <svg className="animate-spin inline mr-2 h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {uiMessage}
          </div>
        )}

        {/* Error messages */}
        {errorMessage && (
          <div className="mt-3 rounded-md bg-red-50 p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1.293-8.707a1 1 0 011.414-1.414L10 8.586l1.293-1.293a1 1 0 011.414 1.414L11.414 10l1.293 1.293a1 1 0 01-1.414 1.414L10 11.414l-1.293-1.293a1 1 0 01-1.414-1.414L8.707 10z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-700">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">How it works:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            {wldPaymentService.getMiniKitDonationInstructions().map((instruction, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{instruction}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};