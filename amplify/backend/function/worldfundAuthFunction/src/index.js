// worldfund-auth-function/index.js
// Handles authentication, user identity verification, and user-related routes

// # ############################################################################ #
// # #                         SECTION 1 - MODULE IMPORTS                       #
// # ############################################################################ #
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand, ScanCommand, QueryCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const fetch = require('node-fetch'); // Assuming v2.7.0 (CommonJS)

// Variables for Dynamically Loaded Modules & Shared Instances
let SiweMessage;
let BadWordsFilterClass;
let profanityFilter;
let verifyCloudProofFunc;

let dependenciesInitialized = false;

async function initializeDependencies() {
    if (dependenciesInitialized) return;
    console.log("Initializing dynamic dependencies...");
    try {
        const badWordsModule = await import('bad-words');
        BadWordsFilterClass = badWordsModule.default || badWordsModule;
        profanityFilter = new BadWordsFilterClass();
        
        const siweModule = await import('siwe');
        SiweMessage = siweModule.SiweMessage;
        
        // Dynamically import World ID verification module
        try {
            console.log("Attempting dynamic import of @worldcoin/idkit...");
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

// # ############################################################################ #
// # #            SECTION 8 - MAIN LAMBDA HANDLER                                 #
// # ############################################################################ #
exports.handler = async (event) => {
    await initializeDependencies();

    const requestOrigin = event.headers?.origin || event.headers?.Origin || (ALLOWED_ORIGINS_LIST.length > 0 ? ALLOWED_ORIGINS_LIST[0] : undefined);

    const WORLD_ID_APP_ID = process.env.WORLD_ID_APP_ID || process.env.VITE_WORLD_APP_ID;
    const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME;

    const criticalEnvVars = {
        USERS_TABLE_NAME, JWT_SECRET_ARN,
        WORLD_ID_APP_ID, NONCES_TABLE_NAME: NONCES_TABLE_NAME_ENV
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

    // # ############################################################################ #
    // # #            ROUTE: GET /AUTH/NONCE                                         #
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
    // # #      ROUTE: POST /AUTH/VERIFY-SIGNATURE                                   #
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
    // # #         ROUTE: POST /VERIFY-WORLDID                                       #
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

    // # ############################################################################ #
    // # # ROUTE: GET /minikit-tx-status/{worldcoinTransactionId}                    #
    // # ############################################################################ #
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
    // # # ROUTE: GET /users/{walletAddress}/campaigns                               #
    // # ############################################################################ #
    if (httpMethod === 'GET' && pathParts.length === 3 && pathParts[0] === 'users' && pathParts[2] === 'campaigns') {
        const userWalletAddress = pathParts[1];
        try {
            console.log(`[GET /users/${userWalletAddress}/campaigns] Fetching campaigns...`);
            const result = await ddbDocClient.send(new QueryCommand({
                TableName: process.env.CAMPAIGNS_TABLE_NAME,
                IndexName: 'OwnerId-Index', // Ensure this GSI exists on 'ownerId'
                KeyConditionExpression: 'ownerId = :walletAddress',
                ExpressionAttributeValues: { ':walletAddress': userWalletAddress }
            }));
            return createResponse(200, { campaigns: result.Items || [] }, requestOrigin);
        } catch (error) {
            console.error(`Error getting user campaigns for '${userWalletAddress}':`, error);
            return createResponse(500, { message: 'Failed to get user campaigns', errorDetails: error.message }, requestOrigin);
        }
    }

    // # ############################################################################ #
    // # #           DEFAULT ROUTE (NOT FOUND)                                       #
    // # ############################################################################ #
    console.log(`Unhandled path in auth function: ${httpMethod} ${path}`);
    return createResponse(404, { message: `Not Found: The requested path ${path} with method ${httpMethod} was not found on this server.` }, requestOrigin);
};