// src/services/WLDPaymentService.ts

// # ############################################################################ #
// # #                            SECTION 1 - IMPORTS                             #
// # ############################################################################ #
import { authService } from './AuthService';
import {
  MiniKit,
  VerificationLevel,
  // Assuming these are the correct importable names for the input parameter types.
  // If these still cause "not exported" errors, you must use "Go to Type Definition"
  // in your IDE on MiniKit.commandsAsync.verify/sendTransaction to find the exact type
  // for their first parameter and define it locally if it's an inline type.
  type VerifyCommandInput,
  type SendTransactionInput,
} from '@worldcoin/minikit-js';
import { ethers } from 'ethers';

// # ############################################################################ #
// # #                       SECTION 2 - ENUMS & INTERFACES                       #
// # ############################################################################ #

export enum TransactionStatus {
  IDLE = 'idle',
  PENDING_WORLDID_USER_INPUT = 'pending_worldid_user_input',
  PENDING_WORLDID_BACKEND_VERIFICATION = 'pending_worldid_backend_verification',
  WORLDID_VERIFIED = 'worldid_verified',
  WORLDID_FAILED = 'worldid_failed',
  PENDING_WALLET_APPROVAL = 'pending_wallet_approval',
  PENDING_MINIKIT_SUBMISSION = 'pending_minikit_submission',
  PENDING_CHAIN_CONFIRMATION = 'pending_chain_confirmation',
  BACKEND_VERIFICATION_NEEDED = 'backend_verification_needed',
  CONFIRMED = 'confirmed',
  FAILED = 'failed'
}

export interface WLDTransaction {
  txHash: string;
  from: string;
  to: string; // This 'to' is for your application's representation of the transaction
  amount: string;
  status: TransactionStatus;
  timestamp: number;
  campaignId?: string;
  worldcoinTransactionId?: string;
  worldIdNullifier?: string;
  worldIdVerificationLevel?: VerificationLevel;
}

// --- Local definition for the structure of a single transaction object ---
// This is for the objects that go into the `transaction` array of `SendTransactionInput`.
// MiniKit's internal `Transaction` type (as per your error) requires 'address' instead of 'to'.
interface MiniKitInternalTransactionObject {
  address: string;                 // CORRECTED: Target contract address (WLD token contract)
  abi: ReadonlyArray<any>;         // ABI fragment for the function being called
  functionName: string;            // Name of the function (e.g., 'transfer')
  args: ReadonlyArray<any>;        // Arguments for the function
  value?: string;                  // Optional: for sending native currency (ETH) with the call
}

// --- Interfaces for MiniKit Command Results' finalPayload CONTENT ---
// Based on Worldcoin Documentation and TypeScript error clues.

interface VerifiedSuccessFinalPayload {
  status: 'success';
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: VerificationLevel;
  version: number;
}
interface CommandErrorFinalPayload {
  status: 'error';
  error_code: string;
  message?: string;
}
type VerifyFinalPayload = VerifiedSuccessFinalPayload | CommandErrorFinalPayload | null;

interface SendTransactionSuccessFinalPayload {
  status: 'success';
  transaction_id: string;
}
type SendTransactionFinalPayload = SendTransactionSuccessFinalPayload | CommandErrorFinalPayload | null;

export interface WorldIDProofData {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: VerificationLevel;
  signalUsed: string;
  version: number;
}

interface MiniKitVerifyCommandReturnObject {
    finalPayload: VerifyFinalPayload;
}
interface MiniKitSendTransactionCommandReturnObject {
    finalPayload: SendTransactionFinalPayload;
}

// # ############################################################################ #
// # #                SECTION 3 - SERVICE CLASS: WLDPAYMENTSERVICE - DEFINITION                #
// # ############################################################################ #
class WLDPaymentService {
  private static instance: WLDPaymentService;

  private WLD_DONATION_ACTION_ID = import.meta.env.VITE_WLD_DONATION_ACTION_ID as string;
  private WLD_CONTRACT_WORLDCHAIN = import.meta.env.VITE_WLD_CONTRACT_WORLDCHAIN as string;
  private WLD_DECIMALS = parseInt(import.meta.env.VITE_WLD_DECIMALS || '6');
  private WORLDCHAIN_CHAIN_ID = parseInt(import.meta.env.VITE_WORLDCHAIN_CHAIN_ID || '0');

  // # ############################################################################ #
  // # #              SECTION 4 - SERVICE CLASS: WLDPAYMENTSERVICE - CONSTRUCTOR              #
  // # ############################################################################ #
  private constructor() {
    if (!this.WLD_DONATION_ACTION_ID) console.error("VITE_WLD_DONATION_ACTION_ID is not configured!");
    if (!this.WLD_CONTRACT_WORLDCHAIN) console.error("VITE_WLD_CONTRACT_WORLDCHAIN is not configured!");
    if (this.WORLDCHAIN_CHAIN_ID === 0) console.error("VITE_WORLDCHAIN_CHAIN_ID is not configured or invalid!");
  }

  // # ############################################################################ #
  // # #             SECTION 5 - SERVICE CLASS: WLDPAYMENTSERVICE - GET INSTANCE             #
  // # ############################################################################ #
  public static getInstance(): WLDPaymentService {
    if (!WLDPaymentService.instance) {
      WLDPaymentService.instance = new WLDPaymentService();
    }
    return WLDPaymentService.instance;
  }

  // # ############################################################################ #
  // # #                        SECTION 6 - PRIVATE HELPER: GET HEADERS                        #
  // # ############################################################################ #
  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const { token } = await authService.checkAuthStatus();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  // # ############################################################################ #
  // # #                      SECTION 7 - PRIVATE HELPER: GET API BASE                      #
  // # ############################################################################ #
  private getApiBase(): string {
    const apiBase = import.meta.env.VITE_AMPLIFY_API;
    if (!apiBase) throw new Error('Backend API URL (VITE_AMPLIFY_API) is not configured');
    return apiBase;
  }

  // # ############################################################################ #
  // # #          NEW SECTION 7.1 - PUBLIC METHOD: VERIFY IDENTITY FOR DONATION         #
  // # ############################################################################ #
  public async verifyIdentityForDonation(
    campaignId: string,
    userId: string | null,
    requestedLevel: VerificationLevel = VerificationLevel.Orb
  ): Promise<WorldIDProofData> {
    if (!MiniKit.isInstalled()) {
      throw new Error("Please use WorldFund inside the World App to verify your identity.");
    }
    if (!this.WLD_DONATION_ACTION_ID) {
      throw new Error("Donation identity verification is currently misconfigured (Action ID missing).");
    }

    const signalObject = { campaignId, timestamp: Date.now(), userId: userId || undefined, domain: 'worldfund_donation_verification' };
    const signalString = JSON.stringify(signalObject);

    const verifyPayload: VerifyCommandInput = {
      action: this.WLD_DONATION_ACTION_ID,
      signal: signalString,
      verification_level: requestedLevel,
    };

    console.log("Requesting World ID verification with payload:", verifyPayload);
    const rawResult: MiniKitVerifyCommandReturnObject = await MiniKit.commandsAsync.verify(verifyPayload);
    // For debugging: console.log("DEBUG: Raw MiniKit Verify Result:", JSON.stringify(rawResult, null, 2));

    const finalPayload = rawResult.finalPayload;

    if (finalPayload && finalPayload.status === 'success') {
      console.log("World ID Verification Proof Received:", finalPayload);
      return {
        merkle_root: finalPayload.merkle_root,
        nullifier_hash: finalPayload.nullifier_hash,
        proof: finalPayload.proof,
        verification_level: finalPayload.verification_level,
        version: finalPayload.version,
        signalUsed: signalString,
      };
    } else if (finalPayload) {
      console.error("World ID Verification failed or was cancelled by user.", finalPayload);
      throw new Error(finalPayload.error_code || "World ID verification was not completed by user.");
    } else {
      throw new Error("World ID verification returned an unexpected empty or null finalPayload.");
    }
  }

  // # ############################################################################ #
  // # #     NEW SECTION 7.2 - PUBLIC METHOD: INITIATE WLD DONATION WITH MINIKIT    #
  // # ############################################################################ #
  public async initiateWLDDonationWithMiniKit(
    recipientAddress: string, // This is the campaign creator's wallet address
    amountString: string
  ): Promise<{ worldcoinTransactionId: string }> {
    if (!MiniKit.isInstalled()) {
      throw new Error("MiniKit not installed. Please use WorldFund inside the World App to donate.");
    }
    if (!this.WLD_CONTRACT_WORLDCHAIN) {
      throw new Error("Worldchain WLD Contract address is not configured.");
    }

    const amountInSmallestUnit = ethers.parseUnits(amountString, this.WLD_DECIMALS);
    const WLD_TRANSFER_ABI_FRAGMENT = [{ "name": "transfer", "type": "function", "stateMutability": "nonpayable", "inputs": [ { "name": "to", "type": "address" }, { "name": "amount", "type": "uint256" } ], "outputs": [ { "name": "", "type": "bool" } ] }];

    // Constructing the transaction object for MiniKit
    const transactionDetails: MiniKitInternalTransactionObject = { // Using our local interface
      address: this.WLD_CONTRACT_WORLDCHAIN, // CORRECTED: MiniKit expects 'address' for the contract
      abi: WLD_TRANSFER_ABI_FRAGMENT,
      functionName: 'transfer',
      args: [recipientAddress, amountInSmallestUnit.toString()], // 'to' for transfer is the first arg
    };

    const txInput: SendTransactionInput = { transaction: [transactionDetails] };

    console.log("Sending transaction via MiniKit:", txInput);
    const rawResult: MiniKitSendTransactionCommandReturnObject = await MiniKit.commandsAsync.sendTransaction(txInput);
    // For debugging: console.log("DEBUG: Raw MiniKit SendTransaction Result:", JSON.stringify(rawResult, null, 2));

    const finalPayload = rawResult.finalPayload;

    if (finalPayload && finalPayload.status === 'success') {
      return { worldcoinTransactionId: finalPayload.transaction_id };
    } else if (finalPayload) {
      throw new Error((finalPayload as CommandErrorFinalPayload).error_code || 'Transaction submission via MiniKit failed.');
    } else {
      throw new Error('Transaction submission via MiniKit returned an unexpected empty or null finalPayload.');
    }
  }

  // # ############################################################################ #
  // # #           SECTION 8 - PUBLIC METHOD: NOTIFY BACKEND OF DONATION                      #
  // # ############################################################################ #
  public async notifyBackendOfDonation(
    campaignId: string,
    amountString: string,
    txHash: string,
    worldIdNullifier: string,
    worldIdVerificationLevel: VerificationLevel
  ): Promise<{ success: boolean; verificationStatus?: TransactionStatus; message?: string }> {
    try {
      const apiBase = this.getApiBase();
      const headers = await this.getHeaders();
      const response = await fetch(`${apiBase}/donations/verify-onchain`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          campaignId,
          donatedAmount: amountString,
          transactionHash: txHash,
          chainId: this.WORLDCHAIN_CHAIN_ID,
          worldIdNullifier,
          worldIdVerificationLevel
        }),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to notify backend or verify donation.');
      }
      return {
        success: responseData.verified === true,
        verificationStatus: responseData.verified ? TransactionStatus.CONFIRMED : TransactionStatus.FAILED,
        message: responseData.message
      };
    } catch (error: any) {
      console.error('Failed to notify backend of donation:', error);
      return { success: false, verificationStatus: TransactionStatus.FAILED, message: error.message || 'Failed to notify backend' };
    }
  }

  // # ############################################################################ #
  // # #          SECTION 9 - PUBLIC METHOD: GET CAMPAIGN RECIPIENT ADDRESS      #
  // # ############################################################################ #
  public async getCampaignRecipientAddress(campaignId: string): Promise<{ campaignAddress: string }> {
    try {
      const apiBase = this.getApiBase();
      const headers = await this.getHeaders();
      const response = await fetch(`${apiBase}/campaigns/${campaignId}/recipient`, { method: 'GET', headers });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to fetch recipient (HTTP ${response.status})` }));
        throw new Error(errorData.message);
      }
      const data = await response.json();
      if (!data.campaignAddress) throw new Error("Campaign recipient address not found in API response.");
      return { campaignAddress: data.campaignAddress };
    } catch (error: any) {
      console.error('Failed to get campaign recipient address:', error);
      throw error;
    }
  }

  // # ############################################################################ #
  // # # SECTION 10 - PUBLIC METHOD: MOCK VERIFY TRANSACTION (Review if still needed) #
  // # ############################################################################ #
  public async verifyTransaction_mock(txHash: string): Promise<{
    success: boolean;
    transaction?: WLDTransaction;
    error?: string;
  }> {
    console.warn("verifyTransaction_mock is a mock and should be replaced by actual backend verification triggered by notifyBackendOfDonation.");
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      success: true,
      transaction: {
        txHash,
        from: '0xMockFromAddr',
        to: '0xMockToCampaignAddr', // This 'to' is for your app's WLDTransaction interface
        amount: (Math.random() * 100).toFixed(2),
        status: TransactionStatus.CONFIRMED,
        timestamp: Date.now(),
        campaignId: 'mockCampaignId',
        worldIdVerificationLevel: VerificationLevel.Orb
      }
    };
  }

  // # ############################################################################ #
  // # #                   NEW SECTION 10.1 - DONATION INSTRUCTIONS                   #
  // # ############################################################################ #
  public getMiniKitDonationInstructions(): string[] {
      return [
          'You will be prompted to verify your World ID within the World App.',
          'Next, you will confirm the WLD donation amount and details in the World App.',
          'Please ensure you have sufficient WLD on the Worldchain network in your World App.'
      ];
  }
}

// # ############################################################################ #
// # #                        SECTION 11 - SINGLETON INSTANCE EXPORT                        #
// # ############################################################################ #
export const wldPaymentService = WLDPaymentService.getInstance();
