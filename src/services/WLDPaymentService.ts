// src/services/WLDPaymentService.ts

// # ############################################################################ #
// # #                               SECTION 1 - IMPORTS                                #
// # ############################################################################ #
import { authService } from './AuthService';
// NEW IMPORTS FOR WORLDCOIN & MINIKIT & ETHERS
import {
  MiniKit,
  VerificationLevel,
  type VerifyCommandInput,
  type SendTransactionInput,
} from '@worldcoin/minikit-js';
import { ethers } from 'ethers';

// # ############################################################################ #
// # #                           SECTION 2 - ENUMS & INTERFACES                           #
// # ############################################################################ #

// Transaction status enum - EXPANDED for the new MiniKit flow
export enum TransactionStatus {
  IDLE = 'idle',
  PENDING_WORLDID_USER_INPUT = 'pending_worldid_user_input',
  PENDING_WORLDID_BACKEND_VERIFICATION = 'pending_worldid_backend_verification',
  WORLDID_VERIFIED = 'worldid_verified',
  WORLDID_FAILED = 'worldid_failed',
  PENDING_WALLET_APPROVAL = 'pending_wallet_approval',
  PENDING_MINIKIT_SUBMISSION = 'pending_minikit_submission',
  POLLING_FOR_ONCHAIN_HASH = 'polling_for_onchain_hash',
  PENDING_CHAIN_CONFIRMATION = 'pending_chain_confirmation',
  BACKEND_VERIFICATION_NEEDED = 'backend_verification_needed',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

export interface WLDTransaction {
  txHash: string;
  from: string;
  to: string;
  amount: string;
  status: TransactionStatus;
  timestamp: number;
  campaignId?: string;
  worldcoinTransactionId?: string;
  worldIdNullifier?: string;
  worldIdVerificationLevel?: VerificationLevel;
}

interface MiniKitInternalTransactionObject {
  address: string;
  abi: ReadonlyArray<any>;
  functionName: string;
  args: ReadonlyArray<any>;
  value?: string;
}

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
type SendTransactionFinalPayload =
  | SendTransactionSuccessFinalPayload
  | CommandErrorFinalPayload
  | null;

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

export interface MiniKitTransactionStatusResponse {
  transaction_status: 'pending' | 'mined' | 'failed';
  transaction_hash: string | null;
  error_message: string | null;
}

// ############################################################################ #
// # #                  SECTION 3 - SERVICE CLASS: WLDPAYMENTSERVICE - DEFINITION                   #
// # ############################################################################ #
class WLDPaymentService {
  private static instance: WLDPaymentService;
  private API_BASE: string;

  // Environment Variables
  private WLD_DONATION_ACTION_ID = import.meta.env
    .VITE_WLD_DONATION_ACTION_ID as string;
  private WLD_CONTRACT_WORLDCHAIN = import.meta.env
    .VITE_WLD_CONTRACT_WORLDCHAIN as string;
  private WLD_DECIMALS = parseInt(import.meta.env.VITE_WLD_DECIMALS || '18');
  private WORLDCHAIN_CHAIN_ID = parseInt(
    import.meta.env.VITE_WORLDCHAIN_CHAIN_ID || '0'
  );

  // # ############################################################################ #
  // # #                   SECTION 4 - SERVICE CLASS: WLDPAYMENTSERVICE - CONSTRUCTOR                   #
  // # ############################################################################ #
  private constructor() {
    // Get the API base URL from environment variables
    const envApi = import.meta.env.VITE_AMPLIFY_API;

    if (!envApi) {
      console.error('[WLDPaymentService] CRITICAL: VITE_AMPLIFY_API environment variable not set.');
      throw new Error('VITE_AMPLIFY_API environment variable is required but not configured.');
    }

    // Validate and normalize the URL
    try {
      const testUrl = new URL(envApi);
      if (!testUrl.protocol.startsWith('http')) {
        throw new Error('VITE_AMPLIFY_API must use HTTP or HTTPS protocol');
      }
      this.API_BASE = envApi.endsWith('/') ? envApi.slice(0, -1) : envApi;
      console.log('[WLDPaymentService] API Base URL configured:', this.API_BASE);
    } catch (error) {
      console.error('[WLDPaymentService] Invalid VITE_AMPLIFY_API URL format:', envApi, error);
      throw new Error(`Invalid VITE_AMPLIFY_API URL format: ${envApi}`);
    }

    // Environment Variables for WLD functionality
    this.WLD_DONATION_ACTION_ID = import.meta.env.VITE_WLD_DONATION_ACTION_ID as string;
    this.WLD_CONTRACT_WORLDCHAIN = import.meta.env.VITE_WLD_CONTRACT_WORLDCHAIN as string;
    this.WLD_DECIMALS = parseInt(import.meta.env.VITE_WLD_DECIMALS || '18');
    this.WORLDCHAIN_CHAIN_ID = parseInt(import.meta.env.VITE_WORLDCHAIN_CHAIN_ID || '0');

    if (!this.WLD_DONATION_ACTION_ID)
      console.error('VITE_WLD_DONATION_ACTION_ID is not configured!');
    if (!this.WLD_CONTRACT_WORLDCHAIN)
      console.error('VITE_WLD_CONTRACT_WORLDCHAIN is not configured!');
    if (this.WORLDCHAIN_CHAIN_ID === 0)
      console.error('VITE_WORLDCHAIN_CHAIN_ID is not configured or invalid!');
    if (this.WLD_DECIMALS !== 18) {
      console.warn(`WARNING: VITE_WLD_DECIMALS is configured as ${this.WLD_DECIMALS}. For accurate on-chain WLD token transactions, this should be 18.`);
    }
  }

  // # ############################################################################ #
  // # #                   SECTION 5 - SERVICE CLASS: WLDPAYMENTSERVICE - GET INSTANCE                    #
  // # ############################################################################ #
  public static getInstance(): WLDPaymentService {
    if (!WLDPaymentService.instance) {
      WLDPaymentService.instance = new WLDPaymentService();
    }
    return WLDPaymentService.instance;
  }

  // # ############################################################################ #
  // # #                               SECTION 6 - PRIVATE HELPER: GET HEADERS                                #
  // # ############################################################################ #
  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const auth = await authService.checkAuthStatus();
    if (auth && auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }
    return headers;
  }

  // NOTE: getApiBase method is now removed, as API_BASE is set robustly in the constructor.

  // # ############################################################################ #
  // # #               NEW SECTION 7.1 - PUBLIC METHOD: VERIFY IDENTITY FOR DONATION                #
  // # ############################################################################ #
  public async verifyIdentityForDonation(
    campaignId: string,
    userId: string | null,
    requestedLevel: VerificationLevel = VerificationLevel.Orb
  ): Promise<WorldIDProofData> {
    if (!MiniKit.isInstalled()) {
      throw new Error(
        'Please use Fund inside the World App to verify your identity.'
      );
    }
    if (!this.WLD_DONATION_ACTION_ID) {
      throw new Error(
        'Donation identity verification is currently misconfigured (Action ID missing).'
      );
    }

    const signalObject = {
      campaignId,
      timestamp: Date.now(),
      userId: userId || undefined,
      domain: 'fund_donation_verification',
    };
    const signalString = JSON.stringify(signalObject);

    const verifyPayload: VerifyCommandInput = {
      action: this.WLD_DONATION_ACTION_ID,
      signal: signalString,
      verification_level: requestedLevel,
    };

    console.log('Requesting World ID verification with payload:', verifyPayload);
    const rawResult: MiniKitVerifyCommandReturnObject =
      await MiniKit.commandsAsync.verify(verifyPayload);

    const finalPayload = rawResult.finalPayload;

    if (finalPayload && finalPayload.status === 'success') {
      console.log('World ID Verification Proof Received:', finalPayload);
      return {
        merkle_root: finalPayload.merkle_root,
        nullifier_hash: finalPayload.nullifier_hash,
        proof: finalPayload.proof,
        verification_level: finalPayload.verification_level,
        version: finalPayload.version,
        signalUsed: signalString,
      };
    } else if (finalPayload) {
      console.error('World ID Verification failed by user or error.', finalPayload);
      throw new Error(
        finalPayload.message ||
          finalPayload.error_code ||
          'World ID verification was not completed.'
      );
    } else {
      throw new Error(
        'World ID verification returned an unexpected empty or null finalPayload.'
      );
    }
  }

  // # ############################################################################ #
  // # #            NEW SECTION 7.2 - PUBLIC METHOD: INITIATE WLD DONATION WITH MINIKIT             #
  // # ############################################################################ #
  public async initiateWLDDonationWithMiniKit(
    recipientAddress: string,
    amountString: string
  ): Promise<{ worldcoinTransactionId: string }> {
    if (!MiniKit.isInstalled()) {
      throw new Error(
        'MiniKit not installed. Please use Fund inside the World App to donate.'
      );
    }
    if (!this.WLD_CONTRACT_WORLDCHAIN) {
      throw new Error('Worldchain WLD Contract address is not configured.');
    }
    if (this.WLD_DECIMALS !== 18) {
      console.error(
        `WLD_DECIMALS is ${this.WLD_DECIMALS}, but 18 is required for on-chain parseUnits.`
      );
      throw new Error(
        'Client-side WLD decimal configuration error for transaction.'
      );
    }

    const amountInSmallestUnit = ethers.parseUnits(
      amountString,
      this.WLD_DECIMALS
    );
    const WLD_TRANSFER_ABI_FRAGMENT = [
      {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
      },
    ];

    const transactionDetails: MiniKitInternalTransactionObject = {
      address: this.WLD_CONTRACT_WORLDCHAIN,
      abi: WLD_TRANSFER_ABI_FRAGMENT,
      functionName: 'transfer',
      args: [recipientAddress, amountInSmallestUnit.toString()],
    };

    const txInput: SendTransactionInput = { transaction: [transactionDetails] };

    console.log('Sending transaction via MiniKit:', txInput);
    const rawResult: MiniKitSendTransactionCommandReturnObject =
      await MiniKit.commandsAsync.sendTransaction(txInput);

    const finalPayload = rawResult.finalPayload;

    if (finalPayload && finalPayload.status === 'success') {
      return { worldcoinTransactionId: finalPayload.transaction_id };
    } else if (finalPayload) {
      throw new Error(
        (finalPayload as CommandErrorFinalPayload).message ||
          (finalPayload as CommandErrorFinalPayload).error_code ||
          'Transaction submission via MiniKit failed.'
      );
    } else {
      throw new Error(
        'Transaction submission via MiniKit returned an unexpected empty or null finalPayload.'
      );
    }
  }

  // # ############################################################################ #
  // # #         NEW SECTION 7.3 - GET MINIKIT TRANSACTION STATUS (Calls new backend endpoint)          #
  // # ############################################################################ #
  public async getMiniKitTransactionStatus(
    worldcoinTxId: string
  ): Promise<MiniKitTransactionStatusResponse> {
    try {
      const headers = await this.getHeaders();

      console.log(
        `[WLDPaymentService] Fetching MiniKit tx status from backend for ID: ${worldcoinTxId}`
      );
      const response = await fetch(
        `${this.API_BASE}/minikit-tx-status/${worldcoinTxId}`,
        {
          method: 'GET',
          headers,
        }
      );

      const data: MiniKitTransactionStatusResponse = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error_message ||
            `Failed to fetch MiniKit transaction status (HTTP ${response.status})`
        );
      }
      console.log(
        `[WLDPaymentService] Received MiniKit tx status from backend:`,
        data
      );
      return data;
    } catch (error: any) {
      console.error(
        `[WLDPaymentService] Error fetching MiniKit transaction status for ${worldcoinTxId}:`,
        error
      );
      throw error;
    }
  }

  // # ############################################################################ #
  // # #           SECTION 8 - MODIFIED: NOTIFY BACKEND OF CONFIRMED DONATION (was donateWLD)           #
  // # ############################################################################ #
  public async notifyBackendOfConfirmedDonation(
    campaignId: string,
    amountString: string,
    txHash: string,
    worldIdNullifier: string,
    worldIdVerificationLevel: VerificationLevel
  ): Promise<{
    success: boolean;
    verificationStatus?: TransactionStatus;
    message?: string;
  }> {
    try {
      const headers = await this.getHeaders();

      const response = await fetch(
        `${this.API_BASE}/campaigns/${campaignId}/donate`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            donatedAmount: amountString,
            transactionHash: txHash,
            chainId: this.WORLDCHAIN_CHAIN_ID,
            worldIdNullifier,
            worldIdVerificationLevel,
          }),
        }
      );

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(
          responseData.message || 'Failed to notify backend or verify donation.'
        );
      }

      return {
        success: responseData.verified === true,
        verificationStatus: responseData.verified
          ? TransactionStatus.CONFIRMED
          : TransactionStatus.FAILED,
        message: responseData.message,
      };
    } catch (error: any) {
      console.error('Failed to notify backend of confirmed donation:', error);
      return {
        success: false,
        verificationStatus: TransactionStatus.FAILED,
        message: error.message || 'Failed to notify backend of donation',
      };
    }
  }

  // # ############################################################################ #
  // # #         SECTION 9 - MODIFIED: GET CAMPAIGN RECIPIENT ADDRESS (from backend)          #
  // # ############################################################################ #
  public async getCampaignRecipientAddress(
    campaignId: string
  ): Promise<{ campaignAddress: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${this.API_BASE}/campaigns/${campaignId}/recipient`,
        { method: 'GET', headers }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message ||
            `Failed to fetch campaign recipient (HTTP ${response.status})`
        );
      }
      if (!data.campaignAddress) {
        throw new Error('Campaign recipient address not found in API response.');
      }
      return { campaignAddress: data.campaignAddress };
    } catch (error: any) {
      console.error('Failed to get campaign recipient address:', error);
      throw error;
    }
  }

  // # ############################################################################ #
  // # #        SECTION 10 - DEPRECATED/MOCK: GET DONATION INSTRUCTIONS (Manual flow)        #
  // # ############################################################################ #
  public async getDonationInstructions_manual(
    campaignId: string
  ): Promise<{
    campaignAddress: string;
    instructions: string[];
    minAmount: number;
  }> {
    console.warn(
      'getDonationInstructions_manual() is part of the old manual flow and should be replaced.'
    );
    return {
      campaignAddress: '0xPREVIOUS_MOCK_ADDRESS',
      instructions: [
        'This is the old manual flow. The new flow uses World App directly.',
      ],
      minAmount: 0.01,
    };
  }

  // # ############################################################################ #
  // # #                      SECTION 10.1 - NEW: GET MINIKIT DONATION INSTRUCTIONS                       #
  // # ############################################################################ #
  public getMiniKitDonationInstructions(): string[] {
    return [
      'You will be prompted to verify your World ID within the World App.',
      'Next, you will confirm the WLD donation amount and details in the World App.',
      'Please ensure you have sufficient WLD on the Worldchain network in your World App.',
    ];
  }

  // # ############################################################################ #
  // # #         SECTION 10.2 - DEPRECATED/MOCK: VERIFY TRANSACTION (Manual flow)           #
  // # ############################################################################ #
  public async verifyTransaction_manualMock(
    txHash: string
  ): Promise<{
    success: boolean;
    transaction?: WLDTransaction;
    error?: string;
  }> {
    console.warn(
      'verifyTransaction_manualMock() is a mock from the old manual flow and should be replaced by backend on-chain verification.'
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      success: true,
      transaction: {
        txHash,
        from: '0xMockFromManualFlow',
        to: '0xMockToManualFlow',
        amount: '10.0',
        status: TransactionStatus.CONFIRMED,
        timestamp: Date.now(),
        campaignId: 'mockCampaignIdManual',
      },
    };
  }
}

// # ############################################################################ #
// # #                          SECTION 11 - SINGLETON INSTANCE EXPORT                            #
// # ############################################################################ #
export const wldPaymentService = WLDPaymentService.getInstance();