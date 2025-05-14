// src/components/WLDDonationForm.tsx

// # ############################################################################ #
// # #                             SECTION 1 - IMPORTS                            #
// # ############################################################################ #
import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { wldPaymentService, TransactionStatus } from '../services/WLDPaymentService';

// # ############################################################################ #
// # #                  SECTION 2 - INTERFACE: COMPONENT PROPS                  #
// # ############################################################################ #
interface WLDDonationFormProps {
  campaignId: string;
  onDonationSuccess?: () => void;
}

// # ############################################################################ #
// # #                SECTION 3 - COMPONENT: DEFINITION & STATE                 #
// # ############################################################################ #
export const WLDDonationForm: React.FC<WLDDonationFormProps> = ({
  campaignId,
  onDonationSuccess
}) => {
  const { isAuthenticated, walletAddress } = useAuth();
  const [amount, setAmount] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<{
    campaignAddress: string;
    instructions: string[];
    minAmount: number;
  } | null>(null);

// # ############################################################################ #
// # #            SECTION 4 - EFFECT: FETCH DONATION INSTRUCTIONS             #
// # ############################################################################ #
  useEffect(() => {
    const fetchInstructions = async () => {
      try {
        const donationInstructions = await wldPaymentService.getDonationInstructions(campaignId);
        setInstructions(donationInstructions);
      } catch (error) {
        console.error('Failed to fetch donation instructions:', error);
        setError('Failed to load donation instructions. Please try again.');
      }
    };

    fetchInstructions();
  }, [campaignId]);

// # ############################################################################ #
// # #                 SECTION 5 - EVENT HANDLER: AMOUNT CHANGE                 #
// # ############################################################################ #
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

// # ############################################################################ #
// # #             SECTION 6 - EVENT HANDLER: VERIFY TRANSACTION              #
// # ############################################################################ #
  const handleVerifyTransaction = async () => {
    if (!txHash) {
      setError('Please enter a transaction hash');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const result = await wldPaymentService.verifyTransaction(txHash);

      if (!result.success) {
        throw new Error(result.error || 'Transaction verification failed');
      }

      if (result.transaction?.status !== TransactionStatus.CONFIRMED) {
        throw new Error('Transaction is not confirmed yet. Please wait and try again.');
      }

      // Set verified amount from transaction
      if (result.transaction?.amount) {
        setAmount(result.transaction.amount.toString());
      }

      // Proceed with donation (no error thrown)
    } catch (err: any) {
      console.error('Transaction verification error:', err);
      setError(err.message || 'Failed to verify transaction');
    } finally {
      setVerifying(false);
    }
  };

// # ############################################################################ #
// # #                  SECTION 7 - EVENT HANDLER: FORM SUBMIT                  #
// # ############################################################################ #
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setError('Please sign in to donate');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!txHash) {
      setError('Please enter a transaction hash');
      return;
    }

    if (instructions?.minAmount && parseFloat(amount) < instructions.minAmount) {
      setError(`Minimum donation amount is ${instructions.minAmount} WLD`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await wldPaymentService.donateWLD(
        campaignId,
        parseFloat(amount),
        txHash
      );

      if (!result.success) {
        throw new Error(result.error || 'Donation failed');
      }

      setSuccess(true);
      setAmount('');
      setTxHash('');

      // Call the success callback if provided
      if (onDonationSuccess) {
        onDonationSuccess();
      }
    } catch (err: any) {
      console.error('Donation error:', err);
      setError(err.message || 'Failed to process donation');
    } finally {
      setLoading(false);
    }
  };

// # ############################################################################ #
// # #                 SECTION 8 - UTILITY FUNCTION: RESET FORM                 #
// # ############################################################################ #
  const resetForm = () => {
    setAmount('');
    setTxHash('');
    setSuccess(false);
    setError(null);
  };

// # ############################################################################ #
// # #       SECTION 9 - CONDITIONAL RENDERING: LOADING INSTRUCTIONS        #
// # ############################################################################ #
  if (!instructions) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading donation details...</p>
      </div>
    );
  }

// # ############################################################################ #
// # #          SECTION 10 - CONDITIONAL RENDERING: DONATION SUCCESS          #
// # ############################################################################ #
  if (success) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="text-center mb-4">
          <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-green-800">Thank you for your donation!</h3>
          <p className="mt-1 text-sm text-green-600">Your contribution has been successfully recorded.</p>
        </div>
        <button
          onClick={resetForm}
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Make Another Donation
        </button>
      </div>
    );
  }

// # ############################################################################ #
// # #              SECTION 11 - MAIN JSX RETURN: DONATION FORM               #
// # ############################################################################ #
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b bg-blue-50">
        <h3 className="text-lg font-medium text-blue-800">Donate with WLD</h3>
        <p className="mt-1 text-sm text-blue-600">Support this campaign with WLD tokens</p>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Campaign Address:</p>
          <div className="p-2 bg-gray-50 rounded-md border border-gray-200 text-sm break-all">
            {instructions.campaignAddress}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(instructions.campaignAddress);
              alert('Address copied to clipboard!');
            }}
            className="mt-1 text-xs text-blue-600 hover:text-blue-800"
          >
            Copy Address
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Instructions:</p>
          <ol className="list-decimal list-inside text-sm space-y-1 text-gray-600">
            {instructions.instructions.map((instruction, index) => (
              <li key={index}>{instruction}</li>
            ))}
          </ol>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              Amount (WLD)
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="amount"
                value={amount}
                onChange={handleAmountChange}
                placeholder={`Min: ${instructions.minAmount} WLD`}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="txHash" className="block text-sm font-medium text-gray-700">
              Transaction Hash
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="txHash"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x..."
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                required
              />
            </div>
            {txHash && (
              <button
                type="button"
                onClick={handleVerifyTransaction}
                disabled={verifying}
                className="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center"
              >
                {verifying ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </>
                ) : (
                  'Verify Transaction'
                )}
              </button>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {loading ? 'Processing...' : 'Confirm Donation'}
          </button>
        </form>
      </div>
    </div>
  );
};