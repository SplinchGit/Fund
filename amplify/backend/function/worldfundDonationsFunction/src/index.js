// worldfund-donations-function/index.js
// Handles all donation-related operations

// # ############################################################################ #
// # #                         SECTION 1 - MODULE IMPORTS                       #
// # ############################################################################ #
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand, ScanCommand, QueryCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

// Variables for Dynamically Loaded Modules & Shared Instances
let ethers; // ethers v6 module
let ethersProvider; // ethers.JsonRpcProvider instance

let dependenciesInitialized = false;

async function initializeDependencies() {
    if (dependenciesInitialized) return;
    console.log("Initializing dynamic dependencies...");
    try {
        ethers = await import('ethers');

        if (process.env.WORLDCHAIN_RPC_URL) {
            try {
                ethersProvider = new ethers.JsonRpcProvider(process.env.WORLDCHAIN_RPC_URL);
                console.log(`Ethers provider initialized for Worldchain: ${process.env.WORLDCHAIN_RPC_URL}`);
            } catch (e) {
                console.error("Failed to initialize Ethers provider:", e);
                ethersProvider = null;
            }
        } else {
            console.warn("WORLDCHAIN_RPC_URL environment variable is not set. On-chain verification will not be possible for donations.");
            ethersProvider = null;
        }
        dependenciesInitialized = true;
        console.log("Dynamic dependencies initialized successfully.");
    } catch (error) {
        console.error("CRITICAL: Failed to initialize dynamic dependencies:", error);
        throw new Error("Critical dependency initialization failed: " + error.message);
    }
}

// # ############################################################################ #
// # #                 SECTION 2 - GLOBAL CONFIGURATION & CONSTANTS               #
// # ############################################################################ #
const JWT_SECRET_ARN = process.env.JWT_SECRET_ARN;

const DEPLOYED_FRONTEND_URL = process.env.FRONTEND_URL || 'https://main.d2fvyjulmwt6nl.amplifyapp.com';
const LOCAL_DEV_URL = 'http://localhost:5173';
const ALLOWED_ORIGINS_LIST = [DEPLOYED_FRONTEND_URL, LOCAL_DEV_URL].filter(Boolean);

// # ############################################################################ #
// # #                 SECTION 3 - AWS SDK CLIENT INITIALIZATION                #
// # ############################################################################ #
const lambdaRegion = process.env.AWS_REGION || 'eu-west-2';
const secretsClient = new SecretsManagerClient({ region: lambdaRegion });
const dynamodbClient = new DynamoDBClient({ region: lambdaRegion });
const ddbDocClient = DynamoDBDocumentClient.from(dynamodbClient);

// # ############################################################################ #
// # #                     SECTION 4 - GLOBAL CACHE VARIABLES                   #
// # ############################################################################ #
let cachedJwtSecret = null;

// # ############################################################################ #
// # #           SECTION 6 - HELPER FUNCTION: CREATE API RESPONSE (WITH CORS)   #
// # ############################################################################ #
function createResponse(statusCode, body, requestOrigin) {
    let effectiveAllowOrigin = ALLOWED_ORIGINS_LIST.length > 0 ? ALLOWED_ORIGINS_LIST[0] : '*';
    if (requestOrigin && ALLOWED_ORIGINS_LIST.includes(requestOrigin)) {
        effectiveAllowOrigin = requestOrigin;
    }
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': effectiveAllowOrigin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Requested-With,Origin,x-attempt-number'
        },
        body: JSON.stringify(body)
    };
}

// # ############################################################################ #
// # #                  SECTION 7 - HELPER FUNCTION: GET JWT SECRET               #
// # ############################################################################ #
const getJwtSecret = async () => {
    if (cachedJwtSecret) return cachedJwtSecret;
    if (!JWT_SECRET_ARN) { console.error('JWT_SECRET_ARN missing.'); throw new Error('Server config error: JWT secret ARN missing.'); }
    try {
        const r = await secretsClient.send(new GetSecretValueCommand({ SecretId: JWT_SECRET_ARN }));
        if (r.SecretString) { cachedJwtSecret = r.SecretString; return cachedJwtSecret; }
        throw new Error('Failed to retrieve JWT secret content.');
    } catch (e) { console.error('Error retrieving JWT secret:', e); throw new Error('Failed to retrieve JWT secret'); }
};

const verifyJWT = async (authHeader) => {
    if (!authHeader) throw new Error('No authorization header provided');
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    if (!token) throw new Error('No token provided');
    try {
        const secret = await getJwtSecret();
        if (!secret) throw new Error('JWT secret unavailable.');
        return jwt.verify(token, secret);
    } catch (e) { console.error('JWT verification failed:', e.message); throw new Error('Invalid or expired token'); }
};

// # ############################################################################ #
// # #            SECTION 8 - MAIN LAMBDA HANDLER                                 #
// # ############################################################################ #
exports.handler = async (event) => {
    await initializeDependencies();

    const requestOrigin = event.headers?.origin || event.headers?.Origin || (ALLOWED_ORIGINS_LIST.length > 0 ? ALLOWED_ORIGINS_LIST[0] : undefined);

    const CAMPAIGNS_TABLE_NAME = process.env.CAMPAIGNS_TABLE_NAME;

    const criticalEnvVars = {
        CAMPAIGNS_TABLE_NAME, JWT_SECRET_ARN
    };
    for (const [key, value] of Object.entries(criticalEnvVars)) {
        if (!value) {
            console.error(`Critical environment variable ${key} is missing.`);
            return createResponse(500, { message: `Server configuration error: Missing ${key}.` }, requestOrigin);
        }
    }

    const httpMethod = event.httpMethod;
    const path = event.path;
    const pathParts = path.split('/').filter(part => part !== '');

    if (httpMethod === 'OPTIONS') {
        return createResponse(200, {}, requestOrigin);
    }

    // Check for ethers provider availability for donation routes
    const needsEthersProvider = (path.includes('/campaigns/') && path.endsWith('/donate'));
    if (needsEthersProvider && !ethersProvider) {
        console.error("Ethers provider for Worldchain is not initialized. WORLDCHAIN_RPC_URL might be missing or invalid.");
        return createResponse(500, { message: "Server configuration error: Blockchain provider not available." }, requestOrigin);
    }

    // # ############################################################################ #
    // # #            DONATION ROUTE HANDLERS                                        #
    // # ############################################################################ #
    
    // POST /campaigns/{id}/donate (On-chain verification)
    if (httpMethod === 'POST' && pathParts.length === 3 && pathParts[0] === 'campaigns' && pathParts[2] === 'donate') {
        const campaignId = pathParts[1];
        console.log(`[POST /campaigns/${campaignId}/donate] On-Chain Verification Triggered`);
        try {
            const authHeader = event.headers?.Authorization || event.headers?.authorization;
            await verifyJWT(authHeader); // Authenticate user making the record
            if (!event.body) return createResponse(400, { message: 'Missing request body' }, requestOrigin);
            const { donatedAmount, transactionHash, chainId } = JSON.parse(event.body);

            if (!donatedAmount || !transactionHash || chainId === undefined) {
                return createResponse(400, { message: 'donatedAmount, transactionHash, and chainId are required.' }, requestOrigin);
            }
            const expectedChainId = parseInt(process.env.WORLDCHAIN_CHAIN_ID || '0'); // Ensure WORLDCHAIN_CHAIN_ID is set
            if (!expectedChainId) throw new Error("WORLDCHAIN_CHAIN_ID env var not set for donation verification.");
            if (parseInt(chainId) !== expectedChainId) {
                return createResponse(400, { message: `Invalid chain ID. This donation must be on Worldchain (ID: ${expectedChainId}).` }, requestOrigin);
            }

            const campaignData = await ddbDocClient.send(new GetCommand({ TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId } }));
            if (!campaignData.Item) return createResponse(404, { message: 'Campaign not found.' }, requestOrigin);
            if (campaignData.Item.donations?.some(d => d.txHash === transactionHash && d.verifiedStatus === 'VERIFIED')) {
                return createResponse(409, { message: 'This donation has already been recorded and verified.' }, requestOrigin);
            }
            if (!ethersProvider) throw new Error("Blockchain provider (ethers) not initialized.");
            const receipt = await ethersProvider.getTransactionReceipt(transactionHash);
            if (!receipt) return createResponse(404, { message: `Transaction receipt not found. It might still be processing or on a different network.` }, requestOrigin);
            if (receipt.status !== 1) return createResponse(400, { message: `Transaction failed on-chain. Status: ${receipt.status}` }, requestOrigin);
            
            const expectedWldContractLower = (process.env.WLD_CONTRACT_ADDRESS_WORLDCHAIN || "").toLowerCase();
            if (!expectedWldContractLower) throw new Error("WLD_CONTRACT_ADDRESS_WORLDCHAIN env var not set.");
            let transferDetails = null;
            const wldInterface = new ethers.Interface(["event Transfer(address indexed from, address indexed to, uint256 value)"]);

            for (const log of receipt.logs) {
                if (log.address.toLowerCase() === expectedWldContractLower) {
                    try {
                        const parsedLog = wldInterface.parseLog(log);
                        if (parsedLog && parsedLog.name === "Transfer") {
                            transferDetails = { from: parsedLog.args.from, to: parsedLog.args.to, value: parsedLog.args.value };
                            break;
                        }
                    } catch (e) { /* ignore parse errors for other logs */ }
                }
            }
            if (!transferDetails) return createResponse(400, { message: "Could not verify WLD transfer in the transaction logs for the expected token contract." }, requestOrigin);
            
            const campaignOwnerId = campaignData.Item.ownerId;
            if (transferDetails.to.toLowerCase() !== campaignOwnerId.toLowerCase()) {
                return createResponse(400, { message: `Donation recipient (${transferDetails.to}) does not match campaign owner (${campaignOwnerId}).` }, requestOrigin);
            }
            
            const WLD_TOKEN_DECIMALS = parseInt(process.env.WLD_TOKEN_DECIMALS || '18');
            const expectedAmountInSmallestUnit = ethers.parseUnits(String(donatedAmount), WLD_TOKEN_DECIMALS);
            const receivedValueBigInt = ethers.toBigInt(transferDetails.value.toString()); // Ensure it's BigInt

            if (receivedValueBigInt !== expectedAmountInSmallestUnit) { // Exact match for BigInts
                return createResponse(400, { message: `Donation amount does not match on-chain transfer. Expected ${donatedAmount} WLD, but found ${ethers.formatUnits(transferDetails.value, WLD_TOKEN_DECIMALS)} WLD.` }, requestOrigin);
            }

            const nowIso = new Date().toISOString();
            const verifiedDonation = {
                id: crypto.randomUUID(),
                amount: parseFloat(donatedAmount),
                onChainAmountSmallestUnit: transferDetails.value.toString(),
                donorAddress: transferDetails.from,
                txHash: transactionHash,
                verifiedStatus: 'VERIFIED',
                verifiedAt: nowIso,
                createdAt: nowIso,
                currency: 'WLD',
                chainId: parseInt(chainId),
                blockNumber: receipt.blockNumber.toString(),
            };
            await ddbDocClient.send(new UpdateCommand({
                TableName: CAMPAIGNS_TABLE_NAME,
                Key: { id: campaignId },
                UpdateExpression: 'SET #r = if_not_exists(#r, :z) + :a, #d = list_append(if_not_exists(#d, :el), :dn), #ua = :now',
                ExpressionAttributeNames: { '#r': 'raised', '#d': 'donations', '#ua': 'updatedAt' },
                ExpressionAttributeValues: { ':a': parseFloat(donatedAmount), ':dn': [verifiedDonation], ':el': [], ':now': nowIso, ':z': 0 },
                ConditionExpression: 'attribute_exists(id)'
            }));
            return createResponse(200, { verified: true, message: "Donation successfully verified and recorded.", donationId: verifiedDonation.id }, requestOrigin);
        } catch (error) {
            console.error(`[POST /campaigns/${campaignId}/donate] Error:`, error);
            const errMsg = error.message || 'Failed to verify donation.';
            const statusCode = (errMsg.includes('token')) ? 401 : (error.name === 'ConditionalCheckFailedException') ? 404 : (errMsg.includes('Invalid chain ID') || errMsg.includes('required') || errMsg.includes('does not match')) ? 400 : 500;
            return createResponse(statusCode, { verified: false, message: errMsg, errorDetails: error.message }, requestOrigin);
        }
    }

    // POST /donate (Generic donation endpoint)
    if (httpMethod === 'POST' && path === '/donate') {
        // This route was marked as not fully implemented previously.
        return createResponse(501, { message: 'Generic /donate endpoint not implemented. Use /campaigns/{id}/donate' }, requestOrigin);
    }

    // # ############################################################################ #
    // # #           DEFAULT ROUTE (NOT FOUND)                                       #
    // # ############################################################################ #
    console.log(`Unhandled path in donations function: ${httpMethod} ${path}`);
    return createResponse(404, { message: `Not Found: The requested path ${path} with method ${httpMethod} was not found on this server.` }, requestOrigin);
};