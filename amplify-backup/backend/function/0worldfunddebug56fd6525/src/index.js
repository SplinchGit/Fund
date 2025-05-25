// amplify/backend/function/0worldfunddebug56fd6525/src/index.js
// FULL FIX: Secure SIWE, ESM Dynamic Imports, Categories, Limits, Profanity Filter, Ethers v6 BigInt

// # ############################################################################ #
// # #                         SECTION 1 - MODULE IMPORTS                       #
// # ############################################################################ #
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand, ScanCommand, QueryCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const fetch = require('node-fetch'); // Assuming v2.7.0 (CommonJS) as per previous context

// Variables for Dynamically Loaded Modules & Shared Instances
let SiweMessage;
let BadWordsFilterClass;
let profanityFilter;
let ethers; // ethers v6 module
let ethersProvider; // ethers.JsonRpcProvider instance

let dependenciesInitialized = false;

async function initializeDependencies() {
    if (dependenciesInitialized) return;
    console.log("Initializing dynamic dependencies...");
    try {
        const badWordsModule = await import('bad-words');
        BadWordsFilterClass = badWordsModule.default || badWordsModule;
        profanityFilter = new BadWordsFilterClass();
        // Example customization: profanityFilter.addWords('custombadword1');

        const siweModule = await import('siwe');
        SiweMessage = siweModule.SiweMessage;

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
const JWT_EXPIRY = '1d';
const JWT_SECRET_ARN = process.env.JWT_SECRET_ARN;
const NONCES_TABLE_NAME_ENV = process.env.NONCES_TABLE_NAME; // For SIWE nonces

const DEPLOYED_FRONTEND_URL = process.env.FRONTEND_URL || 'https://main.d2fvyjulmwt6nl.amplifyapp.com';
const LOCAL_DEV_URL = 'http://localhost:5173';
const ALLOWED_ORIGINS_LIST = [DEPLOYED_FRONTEND_URL, LOCAL_DEV_URL].filter(Boolean);

const PREDEFINED_CATEGORIES = [
    "Technology & Innovation", "Creative Works", "Community & Social Causes",
    "Small Business & Entrepreneurship", "Health & Wellness", "Other"
];
const NONCE_EXPIRY_SECONDS = 5 * 60; // 5 minutes for SIWE nonce validity

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
let verifyCloudProofFunc; // For @worldcoin/idkit, loaded on demand

// # ############################################################################ #
// # #                    SECTION 5 - HELPER FUNCTION: GENERATE NONCE           #
// # ############################################################################ #
const generateNonceForSIWE = () => crypto.randomBytes(32).toString('hex');

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
// sanitizeSiweMessage and isValidSignatureFormat are not directly used in the secure SIWE flow below,
// as the siwe library handles message parsing and signature format checks.
// If you need them for other purposes, they can remain.

// # ############################################################################ #
// # #            SECTION 11 - MAIN LAMBDA HANDLER: INITIALIZATION & LOGGING      #
// # ############################################################################ #
exports.handler = async (event) => {
    await initializeDependencies();

    // console.log('Received event:', JSON.stringify(event, null, 2));
    const requestOrigin = event.headers?.origin || event.headers?.Origin || (ALLOWED_ORIGINS_LIST.length > 0 ? ALLOWED_ORIGINS_LIST[0] : undefined);
    // console.log('Request Origin:', requestOrigin);

    const WORLD_ID_APP_ID = process.env.WORLD_ID_APP_ID || process.env.VITE_WORLD_APP_ID;
    const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME;
    const CAMPAIGNS_TABLE_NAME = process.env.CAMPAIGNS_TABLE_NAME;

    const criticalEnvVars = {
        USERS_TABLE_NAME, CAMPAIGNS_TABLE_NAME, JWT_SECRET_ARN,
        WORLD_ID_APP_ID, NONCES_TABLE_NAME: NONCES_TABLE_NAME_ENV
    };
    for (const [key, value] of Object.entries(criticalEnvVars)) {
        if (!value) {
            console.error(`Critical environment variable ${key} is missing.`);
            return createResponse(500, { message: `Server configuration error: Missing ${key}.` }, requestOrigin);
        }
    }

    const needsEthersProvider = (event.path.includes('/campaigns/') && event.path.endsWith('/donate')) || event.path.startsWith('/minikit-tx-status');
    if (needsEthersProvider && !ethersProvider) {
        console.error("Ethers provider for Worldchain is not initialized. WORLDCHAIN_RPC_URL might be missing or invalid.");
        return createResponse(500, { message: "Server configuration error: Blockchain provider not available." }, requestOrigin);
    }

    const httpMethod = event.httpMethod;
    const path = event.path;
    const pathParts = path.split('/').filter(part => part !== '');
    // console.log(`Handling request: ${httpMethod} ${path}`);

    if (httpMethod === 'OPTIONS') {
        return createResponse(200, {}, requestOrigin);
    }

// # ############################################################################ #
// # #            SECTION 13 - MAIN LAMBDA HANDLER: ROUTE - GET /AUTH/NONCE       #
// # ############################################################################ #
    if (httpMethod === 'GET' && path === '/auth/nonce') {
        console.log('[GET /auth/nonce] Generating and storing SIWE nonce...');
        try {
            const nonce = generateNonceForSIWE();
            const nowEpoch = Math.floor(Date.now() / 1000);
            const expiresAt = nowEpoch + NONCE_EXPIRY_SECONDS;

            await ddbDocClient.send(new PutCommand({
                TableName: NONCES_TABLE_NAME_ENV,
                Item: { nonce, createdAt: nowEpoch, expiresAt }
            }));
            console.log(`Stored nonce ${nonce}, expires at ${new Date(expiresAt * 1000).toISOString()}`);
            return createResponse(200, { nonce }, requestOrigin);
        } catch (error) {
            console.error('[GET /auth/nonce] Error:', error);
            return createResponse(500, { message: 'Failed to generate nonce', errorDetails: error.message }, requestOrigin);
        }
    }

// # ############################################################################ #
// # #      SECTION 14 - MAIN LAMBDA HANDLER: ROUTE - POST /AUTH/VERIFY-SIGNATURE #
// # ############################################################################ #
    if (httpMethod === 'POST' && path === '/auth/verify-signature') {
        console.log('[POST /auth/verify-signature] Secure SIWE Handler triggered');
        if (!event.body) {
            return createResponse(400, { message: 'Missing request body' }, requestOrigin);
        }
        try {
            const { message, signature } = JSON.parse(event.body);
            if (!message || typeof message !== 'string' || !signature || typeof signature !== 'string') {
                return createResponse(400, { message: 'SIWE message string and signature are required.' }, requestOrigin);
            }

            let siweMessageObject;
            try {
                siweMessageObject = new SiweMessage(message);
            } catch (parseError) {
                console.error("Error parsing SIWE message string:", parseError.message);
                return createResponse(400, { message: 'Invalid SIWE message format.', detail: parseError.message }, requestOrigin);
            }

            // 1. Nonce Validation & Consumption (Replay Protection)
            const nonceFromMessage = siweMessageObject.nonce;
            try {
                await ddbDocClient.send(new DeleteCommand({
                    TableName: NONCES_TABLE_NAME_ENV,
                    Key: { nonce: nonceFromMessage },
                    ConditionExpression: 'attribute_exists(nonce)'
                }));
                console.log(`Nonce ${nonceFromMessage} from message consumed successfully.`);
            } catch (e) {
                if (e.name === 'ConditionalCheckFailedException') {
                    console.error('Nonce validation failed: Nonce not found, expired, or already used.', nonceFromMessage);
                    return createResponse(403, { message: 'Invalid or expired nonce. Please request a new one and try again.' }, requestOrigin);
                }
                console.error('Error consuming nonce from DynamoDB:', e);
                return createResponse(500, { message: 'Nonce validation server error.' }, requestOrigin);
            }

            // 2. Domain Validation
            const domainFromMessage = siweMessageObject.domain;
            if (!ALLOWED_ORIGINS_LIST.includes(domainFromMessage)) {
                console.error(`SIWE domain mismatch. Message domain: ${domainFromMessage}. Allowed: ${ALLOWED_ORIGINS_LIST.join(', ')}`);
                return createResponse(403, { message: `Invalid SIWE domain. Expected one of: ${ALLOWED_ORIGINS_LIST.join(' or ')}` }, requestOrigin);
            }
             // Optional stricter check: Ensure message domain matches request origin if that's your policy
            if (domainFromMessage !== requestOrigin) {
                 console.warn(`SIWE message domain (${domainFromMessage}) does not exactly match request origin (${requestOrigin}). Verifying against allowed list only.`);
            }

            // 3. SIWE Signature and Standard Claims Verification
            const verificationResult = await siweMessageObject.verify({
                signature: signature,
                domain: domainFromMessage, // Library will check if siweMessageObject.domain matches this
                time: new Date().toISOString() // For checking notBefore and expirationTime
            });

            if (!verificationResult.success) {
                console.error('SIWE signature verification failed:', verificationResult.error);
                throw new Error(`SIWE verification failed: ${verificationResult.error?.type || 'Unknown reason'}`);
            }

            const walletAddress = verificationResult.data.address;
            console.log(`SIWE verification successful for address: ${walletAddress}`);

            // 4. User creation/update logic
            const nowIso = new Date().toISOString();
            try {
                await ddbDocClient.send(new PutCommand({
                    TableName: USERS_TABLE_NAME,
                    Item: { walletAddress, createdAt: nowIso, lastLoginAt: nowIso, isWorldIdVerified: false },
                    ConditionExpression: 'attribute_not_exists(walletAddress)'
                }));
                console.log(`New user created: ${walletAddress}`);
            } catch (err) {
                if (err.name === 'ConditionalCheckFailedException') {
                    await ddbDocClient.send(new UpdateCommand({
                        TableName: USERS_TABLE_NAME, Key: { walletAddress },
                        UpdateExpression: 'SET lastLoginAt = :now', ExpressionAttributeValues: { ':now': nowIso }
                    }));
                    console.log(`User login updated: ${walletAddress}`);
                } else {
                    console.error("Error interacting with Users table:", err);
                    throw err;
                }
            }

            // 5. Issue JWT
            const jwtSecretInternal = await getJwtSecret();
            const tokenInternal = jwt.sign({ walletAddress }, jwtSecretInternal, { expiresIn: JWT_EXPIRY });
            return createResponse(200, { success: true, token: tokenInternal, walletAddress }, requestOrigin);

        } catch (error) {
            console.error('[POST /auth/verify-signature] Error in SIWE verification process:', error);
            let errorMessage = 'Authentication failed.';
            if (error instanceof Error) errorMessage = error.message;
            let statusCode = 500;
            if (error.message.toLowerCase().includes('nonce') || error.message.toLowerCase().includes('siwe verification failed') || error.message.toLowerCase().includes('invalid siwe domain')) {
                statusCode = 403;
            } else if (error.message.toLowerCase().includes('invalid siwe message format')) {
                statusCode = 400;
            }
            return createResponse(statusCode, { message: 'Authentication failed.', error: errorMessage }, requestOrigin);
        }
    }

// # ############################################################################ #
// # #         SECTION 15 - MAIN LAMBDA HANDLER: ROUTE - POST /VERIFY-WORLDID     #
// # ############################################################################ #
    if (httpMethod === 'POST' && path === '/verify-worldid') {
        console.log('[POST /verify-worldid] World ID Proof Verification Handler triggered');
        if (!verifyCloudProofFunc) {
            try {
                console.log("Attempting dynamic import of @worldcoin/idkit for /verify-worldid route...");
                const idkitModule = await import('@worldcoin/idkit');
                if (typeof idkitModule.verifyCloudProof === 'function') {
                    verifyCloudProofFunc = idkitModule.verifyCloudProof;
                } else if (idkitModule.default && typeof idkitModule.default.verifyCloudProof === 'function') {
                    verifyCloudProofFunc = idkitModule.default.verifyCloudProof;
                } else {
                    throw new Error('verifyCloudProof function not found in @worldcoin/idkit module.');
                }
                console.log("verifyCloudProof function loaded successfully.");
            } catch (e) {
                console.error('Critical error during dynamic import of @worldcoin/idkit:', e);
                return createResponse(500, { verified: false, message: 'Server critical error: Failed to initialize World ID component.' }, requestOrigin);
            }
        }

        try {
            const authHeader = event.headers?.Authorization || event.headers?.authorization;
            const decodedToken = await verifyJWT(authHeader);
            const userWalletAddress = decodedToken.walletAddress;

            if (!event.body) {
                return createResponse(400, { message: 'Missing request body for proof verification' }, requestOrigin);
            }
            const proofPayloadFromClient = JSON.parse(event.body);
            const { merkle_root, nullifier_hash, proof, verification_level, signalUsed } = proofPayloadFromClient;

            if (!merkle_root || !nullifier_hash || !proof || !verification_level || signalUsed === undefined) {
                return createResponse(400, { verified: false, message: "Missing required World ID proof parameters." }, requestOrigin);
            }
            if (!WORLD_ID_APP_ID) {
                console.error("WORLD_ID_APP_ID missing for /verify-worldid");
                return createResponse(500, { verified: false, message: 'Server configuration error: World ID App ID not resolved.' }, requestOrigin);
            }
            const actionIdToUse = process.env.WLD_DONATION_VERIFY_ACTION_ID;
            if (!actionIdToUse) {
                 console.error("WLD_DONATION_VERIFY_ACTION_ID missing for /verify-worldid");
                return createResponse(500, { verified: false, message: 'Server configuration error: World ID Action ID not resolved.' }, requestOrigin);
            }
            console.log(`Verifying World ID proof with App ID: ${WORLD_ID_APP_ID}, Action ID: ${actionIdToUse}, Signal: ${signalUsed}`);
            const idKitProofForCloud = { merkle_root, nullifier_hash, proof, credential_type: verification_level === 'orb' ? 'orb' : 'phone' };

            await verifyCloudProofFunc(idKitProofForCloud, WORLD_ID_APP_ID, actionIdToUse, signalUsed);
            console.log("World ID proof successfully verified with Worldcoin cloud service for action:", actionIdToUse);

            const nowIso = new Date().toISOString();
            await ddbDocClient.send(new UpdateCommand({
                TableName: USERS_TABLE_NAME,
                Key: { walletAddress: userWalletAddress },
                UpdateExpression: 'SET isWorldIdVerified = :isVerified, worldIdVerifiedAt = :now, worldIdNullifier = :nullifier, lastUsedWorldIdAction = :action, lastUsedWorldIdSignal = :signal',
                ExpressionAttributeValues: {
                    ':isVerified': true, ':now': nowIso, ':nullifier': nullifier_hash,
                    ':action': actionIdToUse, ':signal': signalUsed
                }
            }));
            console.log(`User ${userWalletAddress} World ID status updated for action ${actionIdToUse}.`);
            return createResponse(200, { verified: true, message: "World ID proof verified successfully.", nullifier_hash, verification_level }, requestOrigin);
        } catch (error) {
            console.error('[POST /verify-worldid] Error:', error);
            const errorCode = error.code || 'verification_failed';
            const errorDetail = error.detail || error.message || 'Unknown error.';
            const statusCode = (error.message?.includes('token')) ? 401 : (errorCode !== 'verification_failed' ? 400 : 500);
            return createResponse(statusCode, { verified: false, message: `World ID proof verification failed: ${errorDetail}`, code: errorCode }, requestOrigin);
        }
    }

// # ####################################################################################
// # # START: HANDLER for GET /minikit-tx-status/{worldcoinTransactionId} (SECTION 15.1) #
// # ####################################################################################
    if (httpMethod === 'GET' && pathParts.length === 2 && pathParts[0] === 'minikit-tx-status') {
        const worldcoinTxId = pathParts[1];
        console.log(`[GET /minikit-tx-status/${worldcoinTxId}] Handler triggered`);
        try {
            if (!WORLD_ID_APP_ID) {
                console.error("WORLD_ID_APP_ID missing for /minikit-tx-status");
                return createResponse(500, { message: 'Server configuration error: World ID App ID not resolved.' }, requestOrigin);
            }
            const apiUrl = `https://developer.worldcoin.org/api/v2/minikit/transaction/${worldcoinTxId}?app_id=${WORLD_ID_APP_ID}`;
            const response = await fetch(apiUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: response.statusText }));
                console.error(`Worldcoin API error for txId ${worldcoinTxId}: ${response.status}`, errorData);
                throw new Error(`Failed to fetch transaction status: ${errorData.detail || response.statusText}`);
            }
            const data = await response.json();
            return createResponse(200, { transaction_status: data.transaction_status, transaction_hash: data.transaction_hash || null, error_message: data.error_message || null }, requestOrigin);
        } catch (error) {
            console.error(`[GET /minikit-tx-status/${worldcoinTxId}] Error:`, error);
            return createResponse(500, { message: "Failed to retrieve MiniKit transaction status.", errorDetails: error.message }, requestOrigin);
        }
    }

// # ############################################################################ #
// # #            SECTION 16 - MAIN LAMBDA HANDLER: ROUTE BLOCK - /CAMPAIGNS      #
// # ############################################################################ #
    if (path.startsWith('/campaigns')) {
        // POST /campaigns (Create new campaign)
        if (httpMethod === 'POST' && pathParts.length === 1 && pathParts[0] === 'campaigns') {
            console.log('[POST /campaigns] Attempting to create new campaign...');
            try {
                const authHeader = event.headers?.Authorization || event.headers?.authorization;
                const decodedToken = await verifyJWT(authHeader);
                const ownerId = decodedToken.walletAddress;

                if (!event.body) return createResponse(400, { message: 'Missing request body' }, requestOrigin);
                const { title, description, goal, category, image } = JSON.parse(event.body);

                const queryUserCampaignsParams = {
                    TableName: CAMPAIGNS_TABLE_NAME, IndexName: 'OwnerId-Index', // Ensure GSI 'OwnerId-Index' exists
                    KeyConditionExpression: 'ownerId = :oid', ExpressionAttributeValues: { ':oid': ownerId }, Select: 'COUNT',
                };
                const userCampaignsResult = await ddbDocClient.send(new QueryCommand(queryUserCampaignsParams));
                if (userCampaignsResult.Count >= 3) {
                    return createResponse(400, { message: "Campaign creation limit of 3 per user reached." }, requestOrigin);
                }
                if (!category || !PREDEFINED_CATEGORIES.includes(category)) {
                    return createResponse(400, { message: "Invalid or missing category.", allowedCategories: PREDEFINED_CATEGORIES }, requestOrigin);
                }
                if (!title) return createResponse(400, { message: "Campaign title is required." }, requestOrigin);
                if (profanityFilter.isProfane(title)) {
                    return createResponse(400, { message: "Campaign title contains inappropriate language." }, requestOrigin);
                }
                if (description && profanityFilter.isProfane(description)) {
                    return createResponse(400, { message: "Campaign description contains inappropriate language." }, requestOrigin);
                }
                if (goal === undefined || isNaN(Number(goal)) || Number(goal) <= 0) {
                    return createResponse(400, { message: 'A valid positive campaign goal amount is required.' }, requestOrigin);
                }

                const campaignId = crypto.randomUUID();
                const nowIso = new Date().toISOString();
                const newCampaignItem = {
                    id: campaignId, ownerId, title, description: description || '', goal: Number(goal),
                    category, imageUrl: image || null, status: 'active', createdAt: nowIso, updatedAt: nowIso,
                    raised: 0, donations: [], currency: 'WLD'
                };
                await ddbDocClient.send(new PutCommand({ TableName: CAMPAIGNS_TABLE_NAME, Item: newCampaignItem }));
                console.log(`Created campaign ${campaignId} for user ${ownerId}`);
                return createResponse(201, { success: true, id: campaignId, createdAt: nowIso }, requestOrigin);
            } catch (error) { /* ... error handling for POST /campaigns ... */ 
                console.error('[POST /campaigns] Error:', error);
                const errMsg = error.message || 'Failed to create campaign';
                const statusCode = (errMsg.includes('token') || errMsg.includes('No authorization header')) ? 401 : (errMsg.includes('limit') || errMsg.includes('Invalid') || errMsg.includes('required')) ? 400 : 500;
                return createResponse(statusCode, { message: errMsg, errorDetails: error.message }, requestOrigin);
            }
        }

        // GET /campaigns (List campaigns, optionally filtered by category)
        if (httpMethod === 'GET' && pathParts.length === 1 && pathParts[0] === 'campaigns') {
            try {
                const categoryFilter = event.queryStringParameters?.category;
                let scanOrQueryParams;
                if (categoryFilter && PREDEFINED_CATEGORIES.includes(categoryFilter)) {
                    console.log(`[GET /campaigns] Filtering by category: ${categoryFilter}`);
                    scanOrQueryParams = { // Using Scan with Filter for simplicity; GSI on category+status would be better for performance at scale
                        TableName: CAMPAIGNS_TABLE_NAME,
                        FilterExpression: '#status = :active AND #cat = :catVal',
                        ExpressionAttributeNames: { '#status': 'status', "#cat": "category" },
                        ExpressionAttributeValues: { ':active': 'active', ":catVal": categoryFilter }
                    };
                } else {
                    if (categoryFilter) console.warn(`[GET /campaigns] Invalid category: ${categoryFilter}. Returning all active.`);
                    scanOrQueryParams = {
                        TableName: CAMPAIGNS_TABLE_NAME, FilterExpression: '#status = :active',
                        ExpressionAttributeNames: { '#status': 'status' }, ExpressionAttributeValues: { ':active': 'active' }
                    };
                }
                const result = await ddbDocClient.send(new ScanCommand(scanOrQueryParams));
                return createResponse(200, { campaigns: result.Items || [] }, requestOrigin);
            } catch (error) { /* ... error handling for GET /campaigns ... */ 
                console.error(`Error listing campaigns:`, error);
                return createResponse(500, { message: 'Failed to list campaigns', errorDetails: error.message }, requestOrigin);
            }
        }

        // Routes for /campaigns/{id}/*
        if (pathParts.length >= 2 && pathParts[0] === 'campaigns') {
            const campaignId = pathParts[1];

            // GET /campaigns/{id}
            if (httpMethod === 'GET' && pathParts.length === 2) {
                try {
                    const result = await ddbDocClient.send(new GetCommand({ TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId } }));
                    if (!result.Item) return createResponse(404, { message: 'Campaign not found' }, requestOrigin);
                    return createResponse(200, result.Item, requestOrigin);
                } catch (error) { /* ... error handling ... */ 
                    console.error(`Error getting campaign '${campaignId}':`, error);
                    return createResponse(500, { message: 'Failed to get campaign', errorDetails: error.message }, requestOrigin);
                }
            }

            // GET /campaigns/{id}/recipient
            if (httpMethod === 'GET' && pathParts.length === 3 && pathParts[2] === 'recipient') {
                try {
                    const { Item } = await ddbDocClient.send(new GetCommand({ TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId }, ProjectionExpression: "ownerId" }));
                    if (!Item || !Item.ownerId) return createResponse(404, { message: "Campaign or campaign owner not found." }, requestOrigin);
                    return createResponse(200, { campaignAddress: Item.ownerId }, requestOrigin);
                } catch (error) { /* ... error handling ... */ 
                    console.error(`Error getting campaign recipient '${campaignId}':`, error);
                    return createResponse(500, { message: "Failed to get campaign recipient.", errorDetails: error.message }, requestOrigin);
                }
            }

            // PUT /campaigns/{id} (Update campaign)
            if (httpMethod === 'PUT' && pathParts.length === 2) {
                try {
                    const authHeader = event.headers?.Authorization || event.headers?.authorization;
                    const decodedToken = await verifyJWT(authHeader);
                    const currentOwnerId = decodedToken.walletAddress;
                    const getResult = await ddbDocClient.send(new GetCommand({ TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId } }));
                    if (!getResult.Item) return createResponse(404, { message: 'Campaign not found' }, requestOrigin);
                    if (getResult.Item.ownerId !== currentOwnerId) return createResponse(403, { message: 'Not authorized to update this campaign' }, requestOrigin);
                    if (!event.body) return createResponse(400, { message: 'Missing request body for update' }, requestOrigin);
                    
                    const { title, description, goal, image, status, category } = JSON.parse(event.body);
                    const nowIso = new Date().toISOString();
                    let updateExpressionParts = ['#ua = :ua']; // Always update 'updatedAt'
                    let expressionAttributeNames = { '#ua': 'updatedAt' };
                    let expressionAttributeValues = { ':ua': nowIso };

                    if (title !== undefined) {
                        if (profanityFilter.isProfane(title)) return createResponse(400, { message: "Campaign title contains inappropriate language." }, requestOrigin);
                        updateExpressionParts.push('#t = :t'); expressionAttributeNames['#t'] = 'title'; expressionAttributeValues[':t'] = title;
                    }
                    if (description !== undefined) {
                        if (profanityFilter.isProfane(description)) return createResponse(400, { message: "Campaign description contains inappropriate language." }, requestOrigin);
                        updateExpressionParts.push('#d = :d'); expressionAttributeNames['#d'] = 'description'; expressionAttributeValues[':d'] = description;
                    }
                    if (goal !== undefined) {
                        if (isNaN(Number(goal)) || Number(goal) <= 0) return createResponse(400, { message: 'Valid positive campaign goal is required.' }, requestOrigin);
                        updateExpressionParts.push('#g = :g'); expressionAttributeNames['#g'] = 'goal'; expressionAttributeValues[':g'] = Number(goal);
                    }
                    if (image !== undefined) {
                        updateExpressionParts.push('#imgUrl = :imgUrl'); expressionAttributeNames['#imgUrl'] = 'imageUrl'; expressionAttributeValues[':imgUrl'] = image || null;
                    }
                    if (status !== undefined) { /* Add status validation if needed */
                        updateExpressionParts.push('#s = :s'); expressionAttributeNames['#s'] = 'status'; expressionAttributeValues[':s'] = status;
                    }
                    if (category !== undefined) {
                        if (!PREDEFINED_CATEGORIES.includes(category)) return createResponse(400, { message: "Invalid category for update.", allowedCategories: PREDEFINED_CATEGORIES }, requestOrigin);
                        updateExpressionParts.push('#cat = :cat'); expressionAttributeNames['#cat'] = 'category'; expressionAttributeValues[':cat'] = category;
                    }

                    if (updateExpressionParts.length === 1 && updateExpressionParts[0] === '#ua = :ua') { // Only updatedAt
                        return createResponse(400, { message: 'No valid fields provided for update.' }, requestOrigin);
                    }
                    await ddbDocClient.send(new UpdateCommand({
                        TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId },
                        UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
                        ExpressionAttributeNames: expressionAttributeNames, ExpressionAttributeValues: expressionAttributeValues
                    }));
                    return createResponse(200, { success: true, id: campaignId, updatedAt: nowIso }, requestOrigin);
                } catch (error) { /* ... error handling for PUT /campaigns/{id} ... */ 
                    console.error(`Error updating campaign '${campaignId}':`, error);
                    const errMsg = error.message || 'Failed to update campaign';
                    const statusCode = (errMsg.includes('token')) ? 401 : (errMsg.includes('Not authorized')) ? 403 : (errMsg.includes('Invalid') || errMsg.includes('required') || errMsg.includes('language')) ? 400 : 500;
                    return createResponse(statusCode, { message: errMsg, errorDetails: error.message }, requestOrigin);
                }
            }

            // DELETE /campaigns/{id}
            if (httpMethod === 'DELETE' && pathParts.length === 2) {
                try {
                    const authHeader = event.headers?.Authorization || event.headers?.authorization;
                    const decodedToken = await verifyJWT(authHeader);
                    const walletAddress = decodedToken.walletAddress;
                    const getResult = await ddbDocClient.send(new GetCommand({ TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId } }));
                    if (!getResult.Item) return createResponse(404, { message: 'Campaign not found' }, requestOrigin);
                    if (getResult.Item.ownerId !== walletAddress) return createResponse(403, { message: 'Not authorized to delete this campaign' }, requestOrigin);
                    await ddbDocClient.send(new DeleteCommand({ TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId } }));
                    return createResponse(200, { success: true, message: "Campaign deleted." }, requestOrigin);
                } catch (error) { /* ... error handling ... */ 
                    console.error(`Error deleting campaign '${campaignId}':`, error);
                    const errMsg = error.message || 'Failed to delete campaign';
                    const statusCode = (errMsg.includes('token')) ? 401 : (errMsg.includes('Not authorized')) ? 403 : 500;
                    return createResponse(statusCode, { message: errMsg, errorDetails: error.message }, requestOrigin);
                }
            }

            // POST /campaigns/{id}/donate (On-chain verification)
            if (httpMethod === 'POST' && pathParts.length === 3 && pathParts[2] === 'donate') {
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
                        id: crypto.randomUUID(), amount: parseFloat(donatedAmount), onChainAmountSmallestUnit: transferDetails.value.toString(),
                        donorAddress: transferDetails.from, txHash: transactionHash, verifiedStatus: 'VERIFIED', verifiedAt: nowIso,
                        createdAt: nowIso, currency: 'WLD', chainId: parseInt(chainId), blockNumber: receipt.blockNumber.toString(),
                    };
                    await ddbDocClient.send(new UpdateCommand({
                        TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId },
                        UpdateExpression: 'SET #r = if_not_exists(#r, :z) + :a, #d = list_append(if_not_exists(#d, :el), :dn), #ua = :now',
                        ExpressionAttributeNames: { '#r': 'raised', '#d': 'donations', '#ua': 'updatedAt' },
                        ExpressionAttributeValues: { ':a': parseFloat(donatedAmount), ':dn': [verifiedDonation], ':el': [], ':now': nowIso, ':z': 0 },
                        ConditionExpression: 'attribute_exists(id)'
                    }));
                    return createResponse(200, { verified: true, message: "Donation successfully verified and recorded.", donationId: verifiedDonation.id }, requestOrigin);
                } catch (error) { /* ... error handling for POST /campaigns/{id}/donate ... */ 
                    console.error(`[POST /campaigns/${campaignId}/donate] Error:`, error);
                    const errMsg = error.message || 'Failed to verify donation.';
                    const statusCode = (errMsg.includes('token')) ? 401 : (error.name === 'ConditionalCheckFailedException') ? 404 : (errMsg.includes('Invalid chain ID') || errMsg.includes('required') || errMsg.includes('does not match')) ? 400 : 500;
                    return createResponse(statusCode, { verified: false, message: errMsg, errorDetails: error.message }, requestOrigin);
                }
            }
        }
    }

// # ############################################################################ #
// # #                 SECTION 24 - MAIN LAMBDA HANDLER: ROUTE BLOCK - /USERS     #
// # ############################################################################ #
    if (path.startsWith('/users/')) {
        if (httpMethod === 'GET' && pathParts.length === 3 && pathParts[0] === 'users' && pathParts[2] === 'campaigns') {
            const userWalletAddress = pathParts[1];
            try {
                console.log(`[GET /users/${userWalletAddress}/campaigns] Fetching campaigns...`);
                const result = await ddbDocClient.send(new QueryCommand({ // Query is better if GSI exists
                    TableName: CAMPAIGNS_TABLE_NAME,
                    IndexName: 'OwnerId-Index', // Ensure this GSI exists on 'ownerId'
                    KeyConditionExpression: 'ownerId = :walletAddress',
                    ExpressionAttributeValues: { ':walletAddress': userWalletAddress }
                }));
                // If not using GSI, fallback to Scan (less efficient)
                // const result = await ddbDocClient.send(new ScanCommand({ 
                // TableName: CAMPAIGNS_TABLE_NAME, FilterExpression: 'ownerId = :walletAddress',
                // ExpressionAttributeValues: { ':walletAddress': userWalletAddress }}));
                return createResponse(200, { campaigns: result.Items || [] }, requestOrigin);
            } catch (error) { /* ... error handling ... */ 
                console.error(`Error getting user campaigns for '${userWalletAddress}':`, error);
                return createResponse(500, { message: 'Failed to get user campaigns', errorDetails: error.message }, requestOrigin);
            }
        }
    }

// # ############################################################################ #
// # #            SECTION 26 - MAIN LAMBDA HANDLER: ROUTE - POST /DONATE (EXAMPLE)#
// # ############################################################################ #
    if (httpMethod === 'POST' && path === '/donate') {
        // This route was marked as not fully implemented previously.
        return createResponse(501, { message: 'Generic /donate endpoint not implemented. Use /campaigns/{id}/donate' }, requestOrigin);
    }

// # ############################################################################ #
// # #           SECTION 27 - MAIN LAMBDA HANDLER: DEFAULT ROUTE (NOT FOUND)     #
// # ############################################################################ #
    console.log(`Unhandled path: ${httpMethod} ${path}`);
    return createResponse(404, { message: `Not Found: The requested path ${path} with method ${httpMethod} was not found on this server.` }, requestOrigin);
};