// src/services/WLDPaymentService.ts

// # ############################################################################ #
// # #                               SECTION 1 - IMPORTS                                #
// # ############################################################################ #
import { authService } from './AuthService';
// UPDATED IMPORTS FOR WORLDCOIN & MINIKIT - Using Pay Command instead of SendTransaction
import {
  MiniKit,
  VerificationLevel,
  type VerifyCommandInput,
  type PayCommandInput,
  tokenToDecimals,
  Tokens,
} from '@worldcoin/minikit-js';

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

interface PaySuccessFinalPayload {
  status: 'success';
  transaction_id?: string;
  reference?: string;
  [key: string]: any; // Allow other properties that might be in the Pay response
}

type PayFinalPayload = PaySuccessFinalPayload | CommandErrorFinalPayload | null;

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

interface MiniKitPayCommandReturnObject {
  finalPayload: PayFinalPayload;
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
  private WORLDCHAIN_CHAIN_ID = parseInt(
    import.meta.env.VITE_WORLDCHAIN_CHAIN_ID || '480'
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
    this.WLD_DONATION_ACTION_ID = import.meta.env.VITE_WLD_DONATION_ACTION_ID as string || 'wld_donation_verify';
    this.WORLDCHAIN_CHAIN_ID = parseInt(import.meta.env.VITE_WORLDCHAIN_CHAIN_ID || '480');

    if (!this.WLD_DONATION_ACTION_ID) {
      console.warn('[WLDPaymentService] VITE_WLD_DONATION_ACTION_ID not configured, using default: wld_donation_verify');
      this.WLD_DONATION_ACTION_ID = 'wld_donation_verify';
    }

    console.log('[WLDPaymentService] Initialized with:', {
      API_BASE: this.API_BASE,
      WLD_DONATION_ACTION_ID: this.WLD_DONATION_ACTION_ID,
      WORLDCHAIN_CHAIN_ID: this.WORLDCHAIN_CHAIN_ID
    });
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
    const headers: HeadersInit = { 
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    try {
      const auth = await authService.checkAuthStatus();
      if (auth && auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }
    } catch (error) {
      console.warn('[WLDPaymentService] Could not get auth token:', error);
    }
    
    return headers;
  }

  // # ############################################################################ #
  // # #               SECTION 7.1 - PUBLIC METHOD: VERIFY IDENTITY FOR DONATION                #
  // # ############################################################################ #
  public async verifyIdentityForDonation(
    campaignId: string,
    userId: string | null,
    requestedLevel: VerificationLevel = VerificationLevel.Device
  ): Promise<WorldIDProofData> {
    console.log('[WLDPaymentService] Starting World ID verification for donation...');

    if (!MiniKit.isInstalled()) {
      throw new Error(
        'Please use WorldFund inside the World App to verify your identity.'
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
      domain: 'worldfund_donation_verification',
    };
    const signalString = JSON.stringify(signalObject);

    const verifyPayload: VerifyCommandInput = {
      action: this.WLD_DONATION_ACTION_ID,
      signal: signalString,
      verification_level: requestedLevel,
    };

    console.log('[WLDPaymentService] Requesting World ID verification with payload:', verifyPayload);

    try {
      const rawResult: MiniKitVerifyCommandReturnObject =
        await MiniKit.commandsAsync.verify(verifyPayload);

      const finalPayload = rawResult.finalPayload;

      if (finalPayload && finalPayload.status === 'success') {
        console.log('[WLDPaymentService] World ID Verification successful');
        return {
          merkle_root: finalPayload.merkle_root,
          nullifier_hash: finalPayload.nullifier_hash,
          proof: finalPayload.proof,
          verification_level: finalPayload.verification_level,
          version: finalPayload.version,
          signalUsed: signalString,
        };
      } else if (finalPayload && finalPayload.status === 'error') {
        throw new Error(
          finalPayload.message ||
            finalPayload.error_code ||
            'World ID verification failed'
        );
      } else {
        throw new Error(
          'World ID verification was cancelled or returned unexpected result'
        );
      }
    } catch (error: any) {
      console.error('[WLDPaymentService] World ID verification error:', error);
      throw new Error(error.message || 'World ID verification failed');
    }
  }

  // # ############################################################################ #
  // # #            SECTION 7.2 - PUBLIC METHOD: INITIATE WLD DONATION WITH MINIKIT (PAY COMMAND)             #
  // # ############################################################################ #
  public async initiateWLDDonationWithMiniKit(
    recipientAddress: string,
    amountString: string
  ): Promise<{ worldcoinTransactionId: string }> {
    console.log('[WLDPaymentService] Initiating WLD donation via MiniKit Pay Command...');

    if (!MiniKit.isInstalled()) {
      throw new Error(
        'MiniKit not installed. Please use WorldFund inside the World App to donate.'
      );
    }

    try {
      // Convert amount to WLD token decimals using MiniKit's utility
      const amountInTokenUnits = tokenToDecimals(parseFloat(amountString), Tokens.WLD);

      // Generate a unique reference for this payment
      const paymentReference = `donation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const payPayload: PayCommandInput = {
        reference: paymentReference,
        to: recipientAddress,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: amountInTokenUnits.toString(),
          }
        ],
        description: `WorldFund campaign donation`,
      };

      console.log('[WLDPaymentService] Sending payment with payload:', payPayload);

      const rawResult: MiniKitPayCommandReturnObject =
        await MiniKit.commandsAsync.pay(payPayload);

      const finalPayload = rawResult.finalPayload;

      if (finalPayload && finalPayload.status === 'success') {
        console.log('[WLDPaymentService] Payment initiated successfully');
        // For Pay command, the transaction ID might be in different fields
        const transactionId = finalPayload.transaction_id || 
                             finalPayload.reference || 
                             paymentReference;
        return { worldcoinTransactionId: transactionId };
      } else if (finalPayload && finalPayload.status === 'error') {
        throw new Error(
          finalPayload.message ||
            finalPayload.error_code ||
            'Payment failed'
        );
      } else {
        throw new Error(
          'Payment was cancelled or returned unexpected result'
        );
      }
    } catch (error: any) {
      console.error('[WLDPaymentService] Payment initiation error:', error);
      throw new Error(error.message || 'Failed to initiate payment');
    }
  }

  // # ############################################################################ #
  // # #         SECTION 7.3 - GET MINIKIT TRANSACTION STATUS (Calls backend endpoint)          #
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
          mode: 'cors'
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch MiniKit transaction status (HTTP ${response.status}): ${errorText}`
        );
      }

      const data: MiniKitTransactionStatusResponse = await response.json();
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
    console.log(`[WLDPaymentService] Notifying backend of confirmed donation for campaign ${campaignId}`);

    try {
      const headers = await this.getHeaders();

      const response = await fetch(
        `${this.API_BASE}/campaigns/${campaignId}/donate`,
        {
          method: 'POST',
          headers,
          mode: 'cors',
          body: JSON.stringify({
            donatedAmount: parseFloat(amountString),
            transactionHash: txHash,
            chainId: this.WORLDCHAIN_CHAIN_ID,
            worldIdNullifier,
            worldIdVerificationLevel,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Backend verification failed (HTTP ${response.status}): ${errorText}`
        );
      }

      const responseData = await response.json();
      console.log('[WLDPaymentService] Backend notification response:', responseData);

      return {
        success: responseData.verified === true || responseData.success === true,
        verificationStatus: responseData.verified || responseData.success
          ? TransactionStatus.CONFIRMED
          : TransactionStatus.FAILED,
        message: responseData.message || 'Donation processed',
      };
    } catch (error: any) {
      console.error('[WLDPaymentService] Backend notification error:', error);
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
    console.log(`[WLDPaymentService] Fetching recipient address for campaign ${campaignId}`);

    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${this.API_BASE}/campaigns/${campaignId}/recipient`,
        { 
          method: 'GET', 
          headers,
          mode: 'cors'
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch campaign recipient (HTTP ${response.status}): ${errorText}`
        );
      }

      const data = await response.json();
      
      if (!data.campaignAddress) {
        throw new Error('Campaign recipient address not found in API response');
      }

      console.log(`[WLDPaymentService] Retrieved recipient address: ${data.campaignAddress}`);
      return { campaignAddress: data.campaignAddress };
    } catch (error: any) {
      console.error('[WLDPaymentService] Error fetching campaign recipient address:', error);
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
      'Verify your World ID to ensure secure, sybil-resistant donations',
      'Confirm the WLD donation amount and recipient in the World App',
      'Your donation will be processed securely on the World Chain network',
      'You will receive confirmation once the transaction is verified'
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