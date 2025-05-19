// src/components/WLDDonationForm.tsx

// # ############################################################################ #
// # #                            SECTION 1 - IMPORTS                             #
// # ############################################################################ #
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext'; // Assuming this provides { isAuthenticated, walletAddress }
import { wldPaymentService, TransactionStatus, type WorldIDProofData } from '../services/WLDPaymentService';
import { VerificationLevel } from '@worldcoin/minikit-js';

// ACTION: Replace this with the actual hook from @worldcoin/minikit-react or your viem/wagmi setup
const useWaitForTransactionReceiptMock = ({ hash, onSuccess, onError }: {
    hash?: `0x${string}` | undefined;
    onSuccess?: (data: any) => void;
    onError?: (error: Error) => void;
}) => {
    const [isLoadingHook, setIsLoadingHook] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isError, setIsError] = useState(false);
    const [data, setData] = useState<any>(null);
    const [errorData, setErrorData] = useState<Error | null>(null);

    useEffect(() => {
        if (hash) {
            setIsLoadingHook(true);
            setIsSuccess(false);
            setIsError(false);
            setErrorData(null);
            setData(null);
            console.warn(`Mock useWaitForTransactionReceipt: Simulating for hash: ${hash}`);
            const timeoutId = setTimeout(() => {
                const mockReceipt = {
                    status: 'success',
                    transactionHash: hash,
                    blockNumber: BigInt(123456 + Math.floor(Math.random() * 1000)),
                    logs: [],
                };
                if (mockReceipt.status === 'success') {
                    setData(mockReceipt);
                    setIsSuccess(true);
                    if (onSuccess) onSuccess(mockReceipt);
                } else {
                    const err = new Error("Mock Transaction Reverted");
                    setErrorData(err);
                    setIsError(true);
                    if (onError) onError(err);
                }
                setIsLoadingHook(false);
            }, 7000);
            return () => clearTimeout(timeoutId);
        } else {
            setIsLoadingHook(false);
            setIsSuccess(false);
            setIsError(false);
            setData(null);
            setErrorData(null);
        }
    }, [hash, onSuccess, onError]);

    return { data, isLoading: isLoadingHook, isSuccess, isError, error: errorData };
};


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
  // CORRECTED: Assuming useAuth provides walletAddress directly, and 'user' object is not present or not standard.
  const { isAuthenticated, walletAddress } = useAuth();
  // Using walletAddress as the primary identifier for currentUserId if a more specific platform user ID isn't available/needed for the signal.
  const currentUserId = walletAddress || null;

  const [amount, setAmount] = useState<string>('');
  const [minAmount, setMinAmount] = useState<number>(0.01);
  const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.IDLE);
  const [uiMessage, setUiMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [isWorldIdVerified, setIsWorldIdVerified] = useState<boolean>(false);
  const [worldIdProofData, setWorldIdProofData] = useState<WorldIDProofData | null>(null);

  const [worldcoinTransactionId, setWorldcoinTransactionId] = useState<string | undefined>(undefined);
  const [onChainTxHash, setOnChainTxHash] = useState<`0x${string}` | undefined>(undefined);

  // This isLoading is for active processing states (World ID, MiniKit, Chain Confirmation, Backend Verification)
  const isProcessing = status === TransactionStatus.PENDING_WORLDID_USER_INPUT ||
                     status === TransactionStatus.PENDING_WORLDID_BACKEND_VERIFICATION ||
                     status === TransactionStatus.PENDING_WALLET_APPROVAL ||
                     status === TransactionStatus.PENDING_MINIKIT_SUBMISSION ||
                     status === TransactionStatus.PENDING_CHAIN_CONFIRMATION ||
                     status === TransactionStatus.BACKEND_VERIFICATION_NEEDED;

  // # ############################################################################ #
  // # #                 SECTION 4 - EFFECT: FETCH RECIPIENT ADDRESS                 #
  // # ############################################################################ #
  useEffect(() => {
    let isMounted = true;
    const fetchRecipientDetails = async () => {
      if (campaignId) {
        if(isMounted) {
            setUiMessage('Loading campaign details...');
            setErrorMessage(null);
            setSuccessMessage(null);
            setStatus(TransactionStatus.IDLE); // Set to IDLE while fetching
            setIsWorldIdVerified(false);
            setWorldIdProofData(null);
            setAmount('');
            setRecipientAddress(''); // Clear previous recipient
        }
        try {
          const { campaignAddress: fetchedAddress } = await wldPaymentService.getCampaignRecipientAddress(campaignId);
          if (isMounted) {
            if (fetchedAddress) {
              setRecipientAddress(fetchedAddress);
              setUiMessage(`Ready to donate to: ${fetchedAddress.substring(0,6)}...${fetchedAddress.substring(fetchedAddress.length-4)}`);
              // setStatus(TransactionStatus.IDLE); // Already IDLE, or could set to a "LOADED" state if needed
            } else {
              throw new Error('Campaign recipient address not found.');
            }
          }
        } catch (err: any) {
          if (isMounted) {
            console.error('Failed to fetch campaign details:', err);
            setErrorMessage(err.message || 'Could not load campaign details.');
            setStatus(TransactionStatus.FAILED); // Keep FAILED status if fetch fails
            setUiMessage(''); // Clear loading message
          }
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
  // # #                  SECTION 6 - HANDLER: WORLD ID VERIFICATION                  #
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
        currentUserId
      );
      setWorldIdProofData(proof);

      setStatus(TransactionStatus.PENDING_WORLDID_BACKEND_VERIFICATION);
      setUiMessage('Verifying World ID with server (simulated)...');
      // ** ACTION: Replace with actual backend call to verify proof **
      await new Promise(resolve => setTimeout(resolve, 1500));

      setIsWorldIdVerified(true);
      setStatus(TransactionStatus.WORLDID_VERIFIED);
      setUiMessage(`World ID Verified (${proof.verification_level}). You can now specify an amount.`);
      setSuccessMessage(`World ID Verified (${proof.verification_level})! Nullifier: ${proof.nullifier_hash.substring(0,10)}...`);

    } catch (err: any) {
      console.error('World ID Verification Error:', err);
      setErrorMessage(err.message || 'World ID verification failed. Please try again.');
      setStatus(TransactionStatus.WORLDID_FAILED);
      setWorldIdProofData(null);
    }
  };

  // # ############################################################################ #
  // # #                       SECTION 7 - HANDLER: DONATE SUBMIT                       #
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
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Please enter a valid positive amount.');
      return;
    }
    if (numericAmount < minAmount) {
      setErrorMessage(`Minimum donation is ${minAmount} WLD.`);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setStatus(TransactionStatus.PENDING_WALLET_APPROVAL);
    setUiMessage('Please check your World App to approve the WLD transaction...');

    try {
      const { worldcoinTransactionId: txServiceId } = await wldPaymentService.initiateWLDDonationWithMiniKit(
        recipientAddress,
        amount
      );
      setWorldcoinTransactionId(txServiceId);
      setStatus(TransactionStatus.PENDING_MINIKIT_SUBMISSION);
      setUiMessage(`Transaction submitted (ID: ${txServiceId.substring(0,10)}...). Awaiting on-chain details...`);
    } catch (err: any) {
      console.error('MiniKit Donation Error:', err);
      setErrorMessage(err.message || 'Failed to initiate donation with World App.');
      setStatus(TransactionStatus.FAILED);
    }
  };

  // # ############################################################################ #
  // # #        SECTION 8 - EFFECT: POLLING FOR ON-CHAIN TX HASH (SIMULATED)        #
  // # ############################################################################ #
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | undefined;
    if (worldcoinTransactionId && status === TransactionStatus.PENDING_MINIKIT_SUBMISSION) {
      setUiMessage(`Polling for on-chain transaction hash for ID: ${worldcoinTransactionId.substring(0,10)}...`);
      // ** ACTION: Replace with actual polling of Worldcoin API **
      pollingInterval = setInterval(async () => {
        console.log(`Simulating poll for ${worldcoinTransactionId}`);
        const mockApiResponse = {
          transaction_status: 'mined',
          transaction_hash: `0x${Math.random().toString(16).slice(2, 66)}` as `0x${string}`,
        };

        if (mockApiResponse.transaction_status === 'mined' && mockApiResponse.transaction_hash) {
          if (pollingInterval) clearInterval(pollingInterval);
          setOnChainTxHash(mockApiResponse.transaction_hash);
          setStatus(TransactionStatus.PENDING_CHAIN_CONFIRMATION);
          setUiMessage(`On-chain transaction found: ${mockApiResponse.transaction_hash.substring(0,10)}... Waiting for confirmations.`);
        } else if (mockApiResponse.transaction_status === 'failed') {
          if (pollingInterval) clearInterval(pollingInterval);
          setErrorMessage('Transaction failed according to Worldcoin API (simulated).');
          setStatus(TransactionStatus.FAILED);
        }
      }, 3000);
    }
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [worldcoinTransactionId, status]);

  // # ############################################################################ #
  // # #         SECTION 9 - EFFECT: WAIT FOR TRANSACTION RECEIPT & NOTIFY BACKEND        #
  // # ############################################################################ #
  const {
    data: txReceipt,
    isLoading: isLoadingTxReceipt,
    isSuccess: isReceiptSuccess,
    isError: isReceiptError,
    error: receiptErrorHook // Renamed to avoid conflict with component's errorMessage state
  } = useWaitForTransactionReceiptMock({
    hash: onChainTxHash,
    onSuccess: async (receipt) => {
      setUiMessage(`Transaction confirmed on-chain! Block: ${receipt.blockNumber.toString()}. Now verifying with our server...`);
      setStatus(TransactionStatus.BACKEND_VERIFICATION_NEEDED);
      try {
        if (!worldIdProofData) throw new Error("World ID proof data is missing for final verification.");

        const backendResult = await wldPaymentService.notifyBackendOfConfirmedDonation(
          campaignId,
          amount,
          receipt.transactionHash,
          worldIdProofData.nullifier_hash,
          worldIdProofData.verification_level
        );

        if (backendResult.success && backendResult.verificationStatus === TransactionStatus.CONFIRMED) {
          setSuccessMessage('Donation successfully verified and recorded! Thank you!');
          setStatus(TransactionStatus.CONFIRMED);
          setAmount('');
          if (onDonationSuccess) onDonationSuccess();
        } else {
          throw new Error(backendResult.message || 'Backend verification failed.');
        }
      } catch (err: any) {
        console.error("Backend donation notification/verification error:", err);
        setErrorMessage(err.message || 'Failed to finalize donation with server.');
        setStatus(TransactionStatus.FAILED);
      }
    },
    onError: (errorFromHook) => {
      console.error("On-chain transaction error:", errorFromHook);
      setErrorMessage(`On-chain transaction failed: ${errorFromHook.message}`);
      setStatus(TransactionStatus.FAILED);
    },
  });

  useEffect(() => {
    if(isLoadingTxReceipt && status === TransactionStatus.PENDING_CHAIN_CONFIRMATION) {
        // uiMessage is already set when PENDING_CHAIN_CONFIRMATION is entered
        // This effect could be used for other side-effects if needed during isLoadingTxReceipt
    }
    if (receiptErrorHook && status !== TransactionStatus.FAILED) { // Handle error from the hook
        setErrorMessage(`Transaction receipt error: ${receiptErrorHook.message}`);
        setStatus(TransactionStatus.FAILED);
    }
  }, [isLoadingTxReceipt, receiptErrorHook, status]);


  // # ############################################################################ #
  // # #                       SECTION 10 - UI RENDERING LOGIC                       #
  // # ############################################################################ #

  // CORRECTED: Condition for initial loading spinner
  const isInitiallyLoadingDetails = !recipientAddress && !errorMessage && status === TransactionStatus.IDLE;

  if (isInitiallyLoadingDetails) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">{uiMessage || 'Loading donation details...'}</p>
      </div>
    );
  }

  if (status === TransactionStatus.CONFIRMED && successMessage) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
        <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-green-800">Donation Successful!</h3>
        <p className="mt-1 text-sm text-green-600">{successMessage}</p>
        <button
          onClick={() => {
            setStatus(TransactionStatus.IDLE);
            setSuccessMessage(null);
            setErrorMessage(null);
            setIsWorldIdVerified(false);
            setWorldIdProofData(null);
            setWorldcoinTransactionId(undefined);
            setOnChainTxHash(undefined);
            setAmount('');
            // Trigger refetch of recipient details for a fresh start
            const fetchRecipientDetails = async () => {
                if (campaignId) {
                    setUiMessage('Loading campaign details...');
                    try {
                        const { campaignAddress: fetchedAddress } = await wldPaymentService.getCampaignRecipientAddress(campaignId);
                        if (fetchedAddress) {
                        setRecipientAddress(fetchedAddress);
                        setUiMessage(`Ready to donate to: ${fetchedAddress.substring(0,6)}...${fetchedAddress.substring(fetchedAddress.length-4)}`);
                        } else { throw new Error('Campaign recipient address not found.'); }
                    } catch (err:any) { setErrorMessage(err.message || 'Could not reload details.'); setStatus(TransactionStatus.FAILED); }
                }
            };
            fetchRecipientDetails();
          }}
          className="mt-4 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Make Another Donation
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800">Donate WLD via World App</h3>
        {recipientAddress && <p className="mt-1 text-xs text-gray-500">To: {recipientAddress.substring(0,10)}...{recipientAddress.substring(recipientAddress.length-6)}</p>}
      </div>

      <div className="p-6 space-y-4">
        {!isWorldIdVerified && (
          <button
            onClick={handleWorldIdVerifyClick}
            disabled={isProcessing || !recipientAddress || !isAuthenticated}
            className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {(status === TransactionStatus.PENDING_WORLDID_USER_INPUT || status === TransactionStatus.PENDING_WORLDID_BACKEND_VERIFICATION)
              ? <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Processing...</>
              : "1. Verify with World ID"}
          </button>
        )}

        {isWorldIdVerified && successMessage && status === TransactionStatus.WORLDID_VERIFIED && (
             <div className="p-3 bg-green-50 border-l-4 border-green-400">
                <p className="text-sm text-green-700">{successMessage}</p>
             </div>
        )}

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
                placeholder={`Min: ${minAmount} WLD`}
                disabled={isProcessing || status !== TransactionStatus.WORLDID_VERIFIED}
                className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md disabled:bg-gray-50"
              />
            </div>
            <button
              onClick={handleDonateSubmit}
              disabled={isProcessing || !amount || parseFloat(amount) <=0 || parseFloat(amount) < minAmount || status !== TransactionStatus.WORLDID_VERIFIED}
              className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
             {(status === TransactionStatus.PENDING_WALLET_APPROVAL || status === TransactionStatus.PENDING_MINIKIT_SUBMISSION )
              ? <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Processing...</>
              : "2. Donate WLD via World App"}
            </button>
          </div>
        )}

        {uiMessage && !successMessage && !errorMessage && (
          <div className="mt-3 text-sm text-gray-600 text-center">
            {isProcessing && <svg className="animate-spin inline mr-2 h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
            {uiMessage}
          </div>
        )}

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
        {/* Debug Info (Optional) */}
        {/* <pre className="mt-4 p-2 bg-gray-100 text-xs overflow-auto">
            Status: {status} <br />
            Is Authenticated: {isAuthenticated?.toString()} <br />
            User ID: {currentUserId} <br />
            Recipient: {recipientAddress} <br />
            World ID Verified: {isWorldIdVerified.toString()} <br />
            Worldcoin Tx ID: {worldcoinTransactionId} <br />
            On-Chain Hash: {onChainTxHash} <br />
            Receipt Status: {txReceipt ? txReceipt.status : 'N/A'}
        </pre> */}
      </div>
    </div>
  );
};
