// src/services/WLDPaymentService.ts

// # ############################################################################ #
// # #                            SECTION 1 - IMPORTS                             #
// # ############################################################################ #
import { authService } from './AuthService';
// NEW IMPORTS FOR WORLDCOIN & MINIKIT & ETHERS
import {
  MiniKit,
  VerificationLevel,
  // Assuming these are correct based on latest Worldcoin Docs for MiniKit v1.9.x
  // If TypeScript still errors on these specific names, you MUST use your IDE's
  // "Go to Type Definition" on MiniKit.commandsAsync.verify/sendTransaction
  // to find the exact type for their first parameter and define it locally if it's an inline type.
  type VerifyCommandInput,
  type SendTransactionInput,
} from '@worldcoin/minikit-js';
import { ethers } from 'ethers';

// # ############################################################################ #
// # #                       SECTION 2 - ENUMS & INTERFACES                       #
// # ############################################################################ #

// Transaction status enum - EXPANDED for the new MiniKit flow
export enum TransactionStatus {
  IDLE = 'idle',
  PENDING_WORLDID_USER_INPUT = 'pending_worldid_user_input',
  PENDING_WORLDID_BACKEND_VERIFICATION = 'pending_worldid_backend_verification',
  WORLDID_VERIFIED = 'worldid_verified',
  WORLDID_FAILED = 'worldid_failed',
  PENDING_WALLET_APPROVAL = 'pending_wallet_approval',
  PENDING_MINIKIT_SUBMISSION = 'pending_minikit_submission', // After MiniKit returns worldcoinTransactionId
  POLLING_FOR_ONCHAIN_HASH = 'polling_for_onchain_hash',
  PENDING_CHAIN_CONFIRMATION = 'pending_chain_confirmation',
  BACKEND_VERIFICATION_NEEDED = 'backend_verification_needed',
  CONFIRMED = 'confirmed',
  FAILED = 'failed'
}

// Your existing WLDTransaction interface, amount as string is good for precision.
export interface WLDTransaction {
  txHash: string;
  from: string;
  to: string;
  amount: string; // Changed from number to string
  status: TransactionStatus;
  timestamp: number;
  campaignId?: string;
  worldcoinTransactionId?: string;
  worldIdNullifier?: string;
  worldIdVerificationLevel?: VerificationLevel; // Using imported enum
}

// --- Local definition for the structure of a single transaction object for MiniKit ---
// MiniKit's internal `Transaction` type (used by SendTransactionInput) requires 'address'.
interface MiniKitInternalTransactionObject {
  address: string;                 // Target contract address (WLD token contract)
  abi: ReadonlyArray<any>;         // ABI fragment
  functionName: string;            // e.g., 'transfer'
  args: ReadonlyArray<any>;        // Arguments for the function
  value?: string;                  // Optional: for sending native ETH
}

// --- Interfaces for MiniKit Command Results' finalPayload CONTENT ---
// Based on Worldcoin Documentation (e.g., MiniAppVerifySuccessPayload) & error messages

interface VerifiedSuccessFinalPayload {
  status: 'success';
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: VerificationLevel; // Using the enum from @worldcoin/minikit-js
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
  transaction_id: string; // This is Worldcoin's internal ID
}
type SendTransactionFinalPayload = SendTransactionSuccessFinalPayload | CommandErrorFinalPayload | null;

// Data structure returned by our service's verifyIdentityForDonation on success
export interface WorldIDProofData {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: VerificationLevel;
  signalUsed: string;
  version: number;
}

// Wrapper object structure returned by MiniKit commands themselves
interface MiniKitVerifyCommandReturnObject {
    finalPayload: VerifyFinalPayload;
}
interface MiniKitSendTransactionCommandReturnObject {
    finalPayload: SendTransactionFinalPayload;
}

// Response from our backend's /minikit-tx-status endpoint
export interface MiniKitTransactionStatusResponse {
    transaction_status: 'pending' | 'mined' | 'failed';
    transaction_hash: string | null;
    error_message: string | null;
}

// # ############################################################################ #
// # #                SECTION 3 - SERVICE CLASS: WLDPAYMENTSERVICE - DEFINITION                #
// # ############################################################################ #
class WLDPaymentService {
  private static instance: WLDPaymentService;

  // Environment Variables
  private WLD_DONATION_ACTION_ID = import.meta.env.VITE_WLD_DONATION_ACTION_ID as string;
  private WLD_CONTRACT_WORLDCHAIN = import.meta.env.VITE_WLD_CONTRACT_WORLDCHAIN as string;
  // CRITICAL: Ensure VITE_WLD_DECIMALS is set to 18 in your .env for on-chain WLD token math
  private WLD_DECIMALS = parseInt(import.meta.env.VITE_WLD_DECIMALS || '18');
  private WORLDCHAIN_CHAIN_ID = parseInt(import.meta.env.VITE_WORLDCHAIN_CHAIN_ID || '0');


  // # ############################################################################ #
  // # #              SECTION 4 - SERVICE CLASS: WLDPAYMENTSERVICE - CONSTRUCTOR              #
  // # ############################################################################ #
  private constructor() {
    if (!this.WLD_DONATION_ACTION_ID) console.error("VITE_WLD_DONATION_ACTION_ID is not configured!");
    if (!this.WLD_CONTRACT_WORLDCHAIN) console.error("VITE_WLD_CONTRACT_WORLDCHAIN is not configured!");
    if (this.WORLDCHAIN_CHAIN_ID === 0) console.error("VITE_WORLDCHAIN_CHAIN_ID is not configured or invalid!");
    if (this.WLD_DECIMALS !== 18) {
        console.warn(`WARNING: VITE_WLD_DECIMALS is configured as ${this.WLD_DECIMALS}. For accurate on-chain WLD token transactions, this should be 18.`);
    }
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
    const auth = await authService.checkAuthStatus();
    // Use auth.token if your authService.checkAuthStatus() returns an object with a token property
    if (auth && auth.token) { // Use auth.token here
  headers['Authorization'] = `Bearer ${auth.token}`; // And here
}
    // Removed VITE_WORLD_APP_API from headers as it was likely App ID, not an API key for your backend
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
    userId: string | null, // This could be the walletAddress from AuthContext
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
    // console.log("DEBUG: Raw MiniKit Verify Result:", JSON.stringify(rawResult, null, 2));

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
      console.error("World ID Verification failed by user or error.", finalPayload);
      throw new Error(finalPayload.message || finalPayload.error_code || "World ID verification was not completed.");
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
    if (this.WLD_DECIMALS !== 18) { // Critical check
        console.error(`WLD_DECIMALS is ${this.WLD_DECIMALS}, but 18 is required for on-chain parseUnits.`);
        throw new Error("Client-side WLD decimal configuration error for transaction.");
    }

    const amountInSmallestUnit = ethers.parseUnits(amountString, this.WLD_DECIMALS); // Uses 18
    const WLD_TRANSFER_ABI_FRAGMENT = [{ "name": "transfer", "type": "function", "stateMutability": "nonpayable", "inputs": [ { "name": "to", "type": "address" }, { "name": "amount", "type": "uint256" } ], "outputs": [ { "name": "", "type": "bool" } ] }];

    const transactionDetails: MiniKitInternalTransactionObject = {
      address: this.WLD_CONTRACT_WORLDCHAIN,
      abi: WLD_TRANSFER_ABI_FRAGMENT,
      functionName: 'transfer',
      args: [recipientAddress, amountInSmallestUnit.toString()],
    };

    const txInput: SendTransactionInput = { transaction: [transactionDetails] };

    console.log("Sending transaction via MiniKit:", txInput);
    const rawResult: MiniKitSendTransactionCommandReturnObject = await MiniKit.commandsAsync.sendTransaction(txInput);
    // console.log("DEBUG: Raw MiniKit SendTransaction Result:", JSON.stringify(rawResult, null, 2));

    const finalPayload = rawResult.finalPayload;

    if (finalPayload && finalPayload.status === 'success') {
      return { worldcoinTransactionId: finalPayload.transaction_id };
    } else if (finalPayload) {
      throw new Error((finalPayload as CommandErrorFinalPayload).message || (finalPayload as CommandErrorFinalPayload).error_code || 'Transaction submission via MiniKit failed.');
    } else {
      throw new Error('Transaction submission via MiniKit returned an unexpected empty or null finalPayload.');
    }
  }

  // # ############################################################################ #
  // # #    NEW SECTION 7.3 - GET MINIKIT TRANSACTION STATUS (Calls new backend endpoint) #
  // # ############################################################################ #
  public async getMiniKitTransactionStatus(
    worldcoinTxId: string
  ): Promise<MiniKitTransactionStatusResponse> {
    try {
      const apiBase = this.getApiBase();
      // This endpoint on your backend might not require JWT if worldcoinTxId is not secret
      // and the Worldcoin API it calls only needs app_id.
      const headers = await this.getHeaders(); // Or new getPublicHeaders() if no auth needed

      console.log(`[WLDPaymentService] Fetching MiniKit tx status from backend for ID: ${worldcoinTxId}`);
      const response = await fetch(`${apiBase}/minikit-tx-status/${worldcoinTxId}`, {
        method: 'GET',
        headers,
      });

      const data: MiniKitTransactionStatusResponse = await response.json();
      if (!response.ok) {
        throw new Error(data.error_message || `Failed to fetch MiniKit transaction status (HTTP ${response.status})`);
      }
      console.log(`[WLDPaymentService] Received MiniKit tx status from backend:`, data);
      return data;
    } catch (error: any) {
      console.error(`[WLDPaymentService] Error fetching MiniKit transaction status for ${worldcoinTxId}:`, error);
      throw error;
    }
  }

  // # ############################################################################ #
  // # #  SECTION 8 - MODIFIED: NOTIFY BACKEND OF CONFIRMED DONATION (was donateWLD)  #
  // # ############################################################################ #
  // This method is now for notifying the backend AFTER on-chain confirmation via frontend.
  public async notifyBackendOfConfirmedDonation(
    campaignId: string,
    amountString: string, // The original amount the user intended to donate
    txHash: string,       // The actual on-chain transaction hash
    // Pass World ID details if your backend needs them for final recording or rules
    worldIdNullifier: string,
    worldIdVerificationLevel: VerificationLevel
  ): Promise<{ success: boolean; verificationStatus?: TransactionStatus; message?: string }> {
    try {
      const apiBase = this.getApiBase();
      const headers = await this.getHeaders(); // Requires auth

      // Calls your existing backend endpoint that now does on-chain verification
      const response = await fetch(`${apiBase}/campaigns/${campaignId}/donate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          donatedAmount: amountString, // Backend expects 'donatedAmount'
          transactionHash: txHash,     // Backend expects 'transactionHash'
          chainId: this.WORLDCHAIN_CHAIN_ID,
          worldIdNullifier,            // Optional: for backend records/rules
          worldIdVerificationLevel     // Optional: for backend records/rules
        }),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to notify backend or verify donation.');
      }

      return {
        success: responseData.verified === true, // Backend returns { verified: true/false, ... }
        verificationStatus: responseData.verified ? TransactionStatus.CONFIRMED : TransactionStatus.FAILED,
        message: responseData.message
      };
    } catch (error: any) {
      console.error('Failed to notify backend of confirmed donation:', error);
      return { success: false, verificationStatus: TransactionStatus.FAILED, message: error.message || 'Failed to notify backend of donation' };
    }
  }

  // # ############################################################################ #
  // # #          SECTION 9 - MODIFIED: GET CAMPAIGN RECIPIENT ADDRESS (from backend)         #
  // # ############################################################################ #
  public async getCampaignRecipientAddress(campaignId: string): Promise<{ campaignAddress: string }> {
    try {
      const apiBase = this.getApiBase();
      const headers = await this.getHeaders(); // This can be public or auth'd depending on your backend setup
      const response = await fetch(`${apiBase}/campaigns/${campaignId}/recipient`, { method: 'GET', headers });

      const data = await response.json(); // Try to parse JSON first
      if (!response.ok) {
        throw new Error(data.message || `Failed to fetch campaign recipient (HTTP ${response.status})`);
      }
      if (!data.campaignAddress) {
        throw new Error("Campaign recipient address not found in API response.");
      }
      return { campaignAddress: data.campaignAddress };
    } catch (error: any) {
      console.error('Failed to get campaign recipient address:', error);
      throw error; // Re-throw for UI to handle
    }
  }

  // # ############################################################################ #
  // # # SECTION 10 - DEPRECATED/MOCK: GET DONATION INSTRUCTIONS (Manual flow)  #
  // # ############################################################################ #
  // This is for the old manual flow, will be replaced by MiniKit guided flow.
  public async getDonationInstructions_manual(campaignId: string): Promise<{
    campaignAddress: string;
    instructions: string[];
    minAmount: number;
  }> {
    console.warn("getDonationInstructions_manual() is part of the old manual flow and should be replaced.");
    return {
      campaignAddress: '0xPREVIOUS_MOCK_ADDRESS',
      instructions: [
        'This is the old manual flow. The new flow uses World App directly.'
      ],
      minAmount: 0.01
    };
  }

  // # ############################################################################ #
  // # # SECTION 10.1 - NEW: GET MINIKIT DONATION INSTRUCTIONS                      #
  // # ############################################################################ #
  public getMiniKitDonationInstructions(): string[] {
      return [
          'You will be prompted to verify your World ID within the World App.',
          'Next, you will confirm the WLD donation amount and details in the World App.',
          'Please ensure you have sufficient WLD on the Worldchain network in your World App.'
      ];
  }


  // # ############################################################################ #
  // # # SECTION 10.2 - DEPRECATED/MOCK: VERIFY TRANSACTION (Manual flow)            #
  // # ############################################################################ #
  // This was for the old manual flow where user submitted a txHash.
  // The new flow's verification happens on the backend via notifyBackendOfConfirmedDonation.
  public async verifyTransaction_manualMock(txHash: string): Promise<{
    success: boolean;
    transaction?: WLDTransaction;
    error?: string;
  }> {
    console.warn("verifyTransaction_manualMock() is a mock from the old manual flow and should be replaced by backend on-chain verification.");
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      success: true,
      transaction: {
        txHash,
        from: '0xMockFromManualFlow',
        to: '0xMockToManualFlow',
        amount: '10.0', // Amount as string
        status: TransactionStatus.CONFIRMED,
        timestamp: Date.now(),
        campaignId: 'mockCampaignIdManual'
      }
    };
  }
}

// # ############################################################################ #
// # #                        SECTION 11 - SINGLETON INSTANCE EXPORT                        #
// # ############################################################################ #
export const wldPaymentService = WLDPaymentService.getInstance();
