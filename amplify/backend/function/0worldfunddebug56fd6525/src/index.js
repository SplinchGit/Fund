// amplify/backend/function/0worldfunddebug56fd6525/src/index.js

// # ############################################################################ #
// # #                             SECTION 1 - MODULE IMPORTS                     #
// # ############################################################################ #
const crypto = require('crypto');
const { SiweMessage } = require('siwe');
const jwt = require('jsonwebtoken');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand, ScanCommand, QueryCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const ethers = require('ethers'); // For on-chain verification & SIWE
// const { verifyCloudProof } = require('@worldcoin/idkit'); // REMOVED OLD IMPORT
const fetch = require('node-fetch'); // For making HTTPS requests to Worldcoin API

// # ############################################################################ #
// # #                     SECTION 2 - GLOBAL CONFIGURATION & CONSTANTS             #
// # ############################################################################ #
// --- Configuration ---
const JWT_EXPIRY = '1d';
const WORLD_ID_APP_ID = process.env.VITE_WORLD_APP_ID || process.env.WORLD_APP_ID; // Used for verifyCloudProof & MiniKit status API
const JWT_SECRET_ARN = process.env.JWT_SECRET_ARN;

const GENERAL_USER_VERIFY_ACTION_ID = process.env.VITE_WORLD_ACTION_ID || 'verify-user';
const WLD_DONATION_VERIFY_ACTION_ID = process.env.WLD_DONATION_VERIFY_ACTION_ID;

const WORLDCHAIN_RPC_URL = process.env.WORLDCHAIN_RPC_URL;
const WLD_CONTRACT_ADDRESS_WORLDCHAIN = process.env.WLD_CONTRACT_ADDRESS_WORLDCHAIN;
const WLD_TOKEN_DECIMALS = parseInt(process.env.WLD_TOKEN_DECIMALS || '18');

const DEPLOYED_FRONTEND_URL = process.env.FRONTEND_URL || 'https://main.d2fvyjulmwt6nl.amplifyapp.com';
const LOCAL_DEV_URL = 'http://localhost:5173';
const ALLOWED_ORIGINS_LIST = [DEPLOYED_FRONTEND_URL, LOCAL_DEV_URL];

const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME || 'Users-dev'; // Will be Users-prod in prod env
const CAMPAIGNS_TABLE_NAME = process.env.CAMPAIGNS_TABLE_NAME || 'Campaigns-dev'; // Will be Campaigns-prod in prod env

// # ############################################################################ #
// # #                     SECTION 3 - AWS SDK CLIENT INITIALIZATION              #
// # ############################################################################ #
const lambdaRegion = process.env.AWS_REGION || 'eu-west-2';
const secretsClient = new SecretsManagerClient({ region: lambdaRegion });
const dynamodbClient = new DynamoDBClient({ region: lambdaRegion });
const ddbDocClient = DynamoDBDocumentClient.from(dynamodbClient);

let ethersProvider = null;
if (WORLDCHAIN_RPC_URL) {
    try {
        ethersProvider = new ethers.JsonRpcProvider(WORLDCHAIN_RPC_URL);
        console.log(`Ethers provider initialized for Worldchain: ${WORLDCHAIN_RPC_URL}`);
    } catch (e) {
        console.error("Failed to initialize Ethers provider for Worldchain:", e);
        ethersProvider = null;
    }
} else {
    console.warn("WORLDCHAIN_RPC_URL environment variable is not set. On-chain verification will not be possible for donations.");
}

// # ############################################################################ #
// # #                         SECTION 4 - GLOBAL CACHE VARIABLES                 #
// # ############################################################################ #
let cachedJwtSecret = null;
let verifyCloudProofFunc; // To store the dynamically imported function

// # ############################################################################ #
// # #                         SECTION 5 - HELPER FUNCTION: GENERATE NONCE          #
// # ############################################################################ #
const generateNonce = () => crypto.randomBytes(16).toString('hex');

// # ############################################################################ #
// # #                 SECTION 6 - HELPER FUNCTION: CREATE API RESPONSE (WITH CORS) #
// # ############################################################################ #
function createResponse(statusCode, body, requestOrigin) {
  let effectiveAllowOrigin = DEPLOYED_FRONTEND_URL; // Default to deployed frontend URL
  // More robust check for multiple allowed origins
  if (requestOrigin && ALLOWED_ORIGINS_LIST.includes(requestOrigin)) {
    effectiveAllowOrigin = requestOrigin;
  } else if (ALLOWED_ORIGINS_LIST.length > 0) {
    // If requestOrigin is not in the list but we have a list,
    // it's safer to default to the primary deployed URL or a restrictive policy.
    // For simplicity here, sticking to DEPLOYED_FRONTEND_URL if requestOrigin isn't an exact match.
    // A more complex setup might involve wildcards or more dynamic origin checking.
  }


  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': effectiveAllowOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Requested-With,Origin'
    },
    body: JSON.stringify(body)
  };
}

// # ############################################################################ #
// # #                     SECTION 7 - HELPER FUNCTION: GET JWT SECRET            #
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

// # ############################################################################ #
// # #                     SECTION 8 - HELPER FUNCTION: VERIFY JWT TOKEN          #
// # ############################################################################ #
const verifyJWT = async (authHeader) => {
  if (!authHeader) throw new Error('No authorization header provided');
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  if (!token) throw new Error('No token provided');
  try {
    const secret = await getJwtSecret();
    if (!secret) throw new Error('JWT secret unavailable for verification.');
    return jwt.verify(token, secret);
  } catch (e) { console.error('JWT verification failed:', e); throw new Error('Invalid or expired token'); }
};

// # ############################################################################ #
// # #                 SECTION 9 - HELPER FUNCTION: SANITIZE SIWE MESSAGE         #
// # ############################################################################ #
const sanitizeSiweMessage = (message) => {
  if (typeof message !== 'string') { console.warn('SIWE Message not a string'); return ''; }
  return message.replace(/\r\n/g, '\n').trim();
};

// # ############################################################################ #
// # #             SECTION 10 - HELPER FUNCTION: VALIDATE SIGNATURE FORMAT        #
// # ############################################################################ #
const isValidSignatureFormat = (signature) => {
  if (typeof signature !== 'string') return false;
  const isValid = /^0x[0-9a-fA-F]{130}$/.test(signature);
  if (!isValid) console.warn('Invalid signature format:', signature);
  return isValid;
};

// # ############################################################################ #
// # #             SECTION 11 - MAIN LAMBDA HANDLER: INITIALIZATION & LOGGING     #
// # ############################################################################ #
exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  const requestOrigin = event.headers?.origin || event.headers?.Origin;
  console.log('Request Origin:', requestOrigin);

  console.log(`Effective USERS_TABLE_NAME: '${USERS_TABLE_NAME}'`);
  console.log(`Effective CAMPAIGNS_TABLE_NAME: '${CAMPAIGNS_TABLE_NAME}'`);
  // ... (other env var logging from your file) ...
  console.log(`Effective JWT_SECRET_ARN: '${JWT_SECRET_ARN}'`);
  console.log(`Effective WORLD_ID_APP_ID: '${WORLD_ID_APP_ID}'`);
  console.log(`Effective GENERAL_USER_VERIFY_ACTION_ID: '${GENERAL_USER_VERIFY_ACTION_ID}'`);
  console.log(`Effective WLD_DONATION_VERIFY_ACTION_ID: '${WLD_DONATION_VERIFY_ACTION_ID}'`);
  console.log(`Effective WORLDCHAIN_RPC_URL: '${WORLDCHAIN_RPC_URL}'`);
  console.log(`Effective WLD_CONTRACT_ADDRESS_WORLDCHAIN: '${WLD_CONTRACT_ADDRESS_WORLDCHAIN}'`);
  console.log(`Effective WLD_TOKEN_DECIMALS: '${WLD_TOKEN_DECIMALS}'`);


  const criticalEnvVars = {
    USERS_TABLE_NAME, CAMPAIGNS_TABLE_NAME, JWT_SECRET_ARN, WORLD_ID_APP_ID,
    WLD_DONATION_VERIFY_ACTION_ID, WORLDCHAIN_RPC_URL, WLD_CONTRACT_ADDRESS_WORLDCHAIN
  };
  for (const [key, value] of Object.entries(criticalEnvVars)) {
    if (!value) {
      console.error(`${key} environment variable is not set.`);
      return createResponse(500, { message: `Server configuration error: Missing critical environment variable ${key}.` }, requestOrigin);
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
  console.log(`Handling request: ${httpMethod} ${path}`);

// # ############################################################################ #
// # #             SECTION 12 - MAIN LAMBDA HANDLER: CORS PREFLIGHT (OPTIONS)     #
// # ############################################################################ #
  if (httpMethod === 'OPTIONS') {
    return createResponse(200, {}, requestOrigin);
  }

// # ############################################################################ #
// # #             SECTION 13 - MAIN LAMBDA HANDLER: ROUTE - GET /AUTH/NONCE      #
// # ############################################################################ #
  if (httpMethod === 'GET' && path === '/auth/nonce') {
    console.log('[GET /auth/nonce] Generating nonce...');
    try {
      const nonce = generateNonce();
      return createResponse(200, { nonce }, requestOrigin);
    } catch (error) {
      console.error('[GET /auth/nonce] Error:', error);
      return createResponse(500, { message: 'Failed to generate nonce' }, requestOrigin);
    }
  }

// # ############################################################################ #
// # #         SECTION 14 - MAIN LAMBDA HANDLER: ROUTE - POST /AUTH/VERIFY-SIGNATURE #
// # ############################################################################ #
  if (httpMethod === 'POST' && path === '/auth/verify-signature') {
    console.log('[POST /auth/verify-signature] Handler triggered');
    if (!event.body) {
      return createResponse(400, { message: 'Missing request body' }, requestOrigin);
    }
    try {
      const { payload, nonce: serverIssuedNonceFromClient } = JSON.parse(event.body);
      // --- Start of placeholder for your full SIWE verification logic ---
      // Ensure you have robust SIWE verification here. This is a simplified placeholder.
      // You would typically:
      // 1. Create a new SiweMessage instance from `payload.message`
      // 2. Call `siweMessage.verify({ signature: payload.signature, nonce: serverIssuedNonceFromClient /* or nonce from your DB/cache */ })`
      // 3. If successful, `siweMessage.address` is the verified address.
      
      // For this example, assuming payload.address is the result after successful verification
      const walletAddress = payload.address; 
      if (!walletAddress) { // Placeholder - real verification would throw if invalid
          throw new Error("SIWE verification failed or address missing.");
      }
      // --- End of placeholder for your full SIWE verification logic ---

      const now = new Date().toISOString();
      try {
        await ddbDocClient.send(new PutCommand({
            TableName: USERS_TABLE_NAME, Item: { walletAddress, createdAt: now, lastLoginAt: now, isWorldIdVerified: false },
            ConditionExpression: 'attribute_not_exists(walletAddress)'
        }));
      } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            await ddbDocClient.send(new UpdateCommand({
                TableName: USERS_TABLE_NAME, Key: { walletAddress },
                UpdateExpression: 'SET lastLoginAt = :now', ExpressionAttributeValues: { ':now': now }
            }));
        } else { throw err; }
      }
      const jwtSecretInternal = await getJwtSecret();
      const tokenInternal = jwt.sign({ walletAddress }, jwtSecretInternal, { expiresIn: JWT_EXPIRY });
      return createResponse(200, { success: true, token: tokenInternal, walletAddress }, requestOrigin);

    } catch (error) {
      console.error('[POST /auth/verify-signature] Error in catch block:', error);
      let errorMessage = 'Failed to verify signature';
      if (error instanceof Error) errorMessage = error.message;
      // Add more specific error status codes based on SIWE error types if possible
      return createResponse(500, { message: 'Failed to verify signature', error: errorMessage }, requestOrigin);
    }
  }

// # ############################################################################ #
// # #             SECTION 15 - MAIN LAMBDA HANDLER: ROUTE - POST /VERIFY-WORLDID #
// # ############################################################################ #
  if (httpMethod === 'POST' && path === '/verify-worldid') {
    console.log('[POST /verify-worldid] World ID Proof Verification Handler triggered');
    
    // Load verifyCloudProof dynamically if not already loaded
    if (!verifyCloudProofFunc) {
      try {
        console.log("Attempting dynamic import of @worldcoin/idkit for /verify-worldid route...");
        const idkitModule = await import('@worldcoin/idkit');
        console.log("Dynamically imported @worldcoin/idkit. Module keys:", Object.keys(idkitModule));

        if (typeof idkitModule.verifyCloudProof === 'function') {
          verifyCloudProofFunc = idkitModule.verifyCloudProof;
          console.log("verifyCloudProof function loaded successfully from named export.");
        } else if (idkitModule.default && typeof idkitModule.default.verifyCloudProof === 'function') {
          verifyCloudProofFunc = idkitModule.default.verifyCloudProof;
          console.log("verifyCloudProof function loaded successfully from default export object.");
        } else {
          console.error('verifyCloudProof function not found in the dynamically imported @worldcoin/idkit module.', idkitModule);
          return createResponse(500, { verified: false, message: 'Server critical error: World ID component unavailable.' }, requestOrigin);
        }
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
      const {
        merkle_root, nullifier_hash, proof, verification_level, signalUsed
      } = proofPayloadFromClient;

      if (!merkle_root || !nullifier_hash || !proof || !verification_level || signalUsed === undefined) {
        return createResponse(400, { verified: false, message: "Missing required World ID proof parameters." }, requestOrigin);
      }

      const actionIdToUse = WLD_DONATION_VERIFY_ACTION_ID; 
      console.log(`Verifying World ID proof with App ID: ${WORLD_ID_APP_ID}, Action ID: ${actionIdToUse}, Signal: ${signalUsed}`);

      const idKitProofForCloud = {
        merkle_root, nullifier_hash, proof,
        credential_type: verification_level === 'orb' ? 'orb' : 'phone',
      };

      // Use the dynamically imported function
      await verifyCloudProofFunc(idKitProofForCloud, WORLD_ID_APP_ID, actionIdToUse, signalUsed);
      console.log("World ID proof successfully verified with Worldcoin cloud service for action:", actionIdToUse);

      const now = new Date().toISOString();
      await ddbDocClient.send(new UpdateCommand({
        TableName: USERS_TABLE_NAME,
        Key: { walletAddress: userWalletAddress },
        UpdateExpression: 'SET isWorldIdVerified = :isVerified, worldIdVerifiedAt = :now, worldIdNullifier = :nullifier, lastUsedWorldIdAction = :action, lastUsedWorldIdSignal = :signal',
        ExpressionAttributeValues: {
          ':isVerified': true, ':now': now, ':nullifier': nullifier_hash,
          ':action': actionIdToUse, ':signal': signalUsed
        }
      }));
      console.log(`User ${userWalletAddress} World ID status updated for action ${actionIdToUse}.`);

      return createResponse(200, {
        verified: true, message: "World ID proof verified successfully.",
        nullifier_hash: nullifier_hash, verification_level: verification_level,
      }, requestOrigin);

    } catch (error) {
      console.error('[POST /verify-worldid] Error during World ID proof verification:', error);
      const errorCode = error.code || 'verification_failed';
      const errorDetail = error.detail || error.message || 'Unknown error during proof verification.';
      const statusCode = (error.message && error.message.includes('token')) ? 401 : (errorCode !== 'verification_failed' ? 400 : 500);
      return createResponse(statusCode, { verified: false, message: `World ID proof verification failed: ${errorDetail}`, code: errorCode }, requestOrigin);
    }
  }

// ####################################################################################
// # START: NEW HANDLER for GET /minikit-tx-status/{worldcoinTransactionId} (SECTION 15.1 - NEW) #
// ####################################################################################
  if (httpMethod === 'GET' && pathParts.length === 2 && pathParts[0] === 'minikit-tx-status') {
    const worldcoinTxId = pathParts[1];
    console.log(`[GET /minikit-tx-status/${worldcoinTxId}] Handler triggered`);
    try {
        const apiUrl = `https://developer.worldcoin.org/api/v2/minikit/transaction/${worldcoinTxId}?app_id=${WORLD_ID_APP_ID}`;
        console.log(`Querying Worldcoin API: ${apiUrl}`);
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: response.statusText }));
            console.error(`Worldcoin API error for txId ${worldcoinTxId}: ${response.status}`, errorData);
            throw new Error(`Failed to fetch transaction status from Worldcoin API: ${errorData.detail || response.statusText}`);
        }
        const data = await response.json();
        console.log(`Worldcoin API response for txId ${worldcoinTxId}:`, data);
        return createResponse(200, {
            transaction_status: data.transaction_status,
            transaction_hash: data.transaction_hash || null,
            error_message: data.error_message || null,
        }, requestOrigin);
    } catch (error) {
        console.error(`[GET /minikit-tx-status/${worldcoinTxId}] Error:`, error);
        return createResponse(500, { message: "Failed to retrieve MiniKit transaction status.", errorDetails: error.message }, requestOrigin);
    }
  }
// ####################################################################################
// # END: NEW HANDLER for GET /minikit-tx-status/{worldcoinTransactionId}            #
// ####################################################################################

// # ############################################################################ #
// # #             SECTION 16 - MAIN LAMBDA HANDLER: ROUTE BLOCK - /CAMPAIGNS     #
// # ############################################################################ #
  if (path.startsWith('/campaigns')) {
    // POST /campaigns
    if (httpMethod === 'POST' && pathParts.length === 1 && pathParts[0] === 'campaigns') {
      try {
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        const decodedToken = await verifyJWT(authHeader);
        const walletAddress = decodedToken.walletAddress;
        if (!event.body) return createResponse(400, { message: 'Missing request body' }, requestOrigin);
        const { title, description, goal, image } = JSON.parse(event.body);
        if (!title || !goal) return createResponse(400, { message: 'Title and goal are required' }, requestOrigin);
        const campaignId = crypto.randomUUID();
        const now = new Date().toISOString();
        const campaign = {
            id: campaignId, title, description: description || '', goal: Number(goal), raised: 0,
            ownerId: walletAddress, image: image || '', status: 'active',
            createdAt: now, updatedAt: now, donations: [], currency: 'WLD'
        };
        await ddbDocClient.send(new PutCommand({ TableName: CAMPAIGNS_TABLE_NAME, Item: campaign }));
        console.log(`Created campaign ${campaignId} for user ${walletAddress}`);
        return createResponse(201, { success: true, id: campaignId, createdAt: now }, requestOrigin);
      } catch (error) {
        console.error('Error creating campaign:', error);
        const errMsg = error.message || 'Failed to create campaign';
        return createResponse(errMsg.includes('token') ? 401 : 500, { message: errMsg, errorDetails: error.message }, requestOrigin);
      }
    }

    // GET /campaigns
    if (httpMethod === 'GET' && pathParts.length === 1 && pathParts[0] === 'campaigns') {
      try {
        console.log(`[GET /campaigns] TRYING TO SCAN TABLE NAMED: '${CAMPAIGNS_TABLE_NAME}'`);
        const result = await ddbDocClient.send(new ScanCommand({
            TableName: CAMPAIGNS_TABLE_NAME,
            FilterExpression: '#status = :active',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':active': 'active' }
        }));
        console.log(`Found ${result.Items?.length || 0} active campaigns`);
        return createResponse(200, { campaigns: result.Items || [] }, requestOrigin);
      } catch (error) {
        console.error(`Error listing campaigns from table '${CAMPAIGNS_TABLE_NAME}':`, error);
        return createResponse(500, { message: 'Failed to list campaigns', errorDetails: error.message }, requestOrigin);
      }
    }

    // Routes for /campaigns/{id}/*
    if (pathParts.length >= 2 && pathParts[0] === 'campaigns') {
      const campaignId = pathParts[1];

      // GET /campaigns/{id}
      if (httpMethod === 'GET' && pathParts.length === 2) {
        try {
            console.log(`[GET /campaigns/:id] Fetching campaign ID: '${campaignId}'`);
            const result = await ddbDocClient.send(new GetCommand({ TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId } }));
            if (!result.Item) return createResponse(404, { message: 'Campaign not found' }, requestOrigin);
            return createResponse(200, result.Item, requestOrigin);
        } catch (error) {
            console.error(`Error getting campaign '${campaignId}':`, error);
            return createResponse(500, { message: 'Failed to get campaign', errorDetails: error.message }, requestOrigin);
        }
      }

      // GET /campaigns/{id}/recipient
      if (httpMethod === 'GET' && pathParts.length === 3 && pathParts[2] === 'recipient') {
        console.log(`[GET /campaigns/${campaignId}/recipient] Handler triggered`);
        try {
            const params = { TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId }, ProjectionExpression: "ownerId" };
            const { Item } = await ddbDocClient.send(new GetCommand(params));
            if (!Item || !Item.ownerId) {
                console.warn(`Campaign ${campaignId} or its ownerId not found.`);
                return createResponse(404, { message: "Campaign or campaign owner not found." }, requestOrigin);
            }
            return createResponse(200, { campaignAddress: Item.ownerId }, requestOrigin);
        } catch (error) {
            console.error(`[GET /campaigns/${campaignId}/recipient] Error:`, error);
            return createResponse(500, { message: "Failed to retrieve campaign recipient address.", errorDetails: error.message }, requestOrigin);
        }
      }
      
      // PUT /campaigns/{id}
      if (httpMethod === 'PUT' && pathParts.length === 2) {
        try {
            const authHeader = event.headers?.Authorization || event.headers?.authorization;
            const decodedToken = await verifyJWT(authHeader);
            const walletAddress = decodedToken.walletAddress;
            console.log(`[PUT /campaigns/:id] Updating campaign ID: '${campaignId}' by user: ${walletAddress}`);
            const getResult = await ddbDocClient.send(new GetCommand({ TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId } }));
            if (!getResult.Item) return createResponse(404, { message: 'Campaign not found' }, requestOrigin);
            if (getResult.Item.ownerId !== walletAddress) return createResponse(403, { message: 'Not authorized to update this campaign' }, requestOrigin);
            if (!event.body) return createResponse(400, { message: 'Missing request body for update' }, requestOrigin);
            const { title, description, goal, image, status } = JSON.parse(event.body);
            const now = new Date().toISOString();
            const updateExpressions = [], expressionAttributeNames = {}, expressionAttributeValues = {};
            if (title !== undefined) { updateExpressions.push('#t = :t'); expressionAttributeNames['#t'] = 'title'; expressionAttributeValues[':t'] = title; }
            if (description !== undefined) { updateExpressions.push('#d = :d'); expressionAttributeNames['#d'] = 'description'; expressionAttributeValues[':d'] = description; }
            if (goal !== undefined) { updateExpressions.push('#g = :g'); expressionAttributeNames['#g'] = 'goal'; expressionAttributeValues[':g'] = Number(goal); }
            if (image !== undefined) { updateExpressions.push('#i = :i'); expressionAttributeNames['#i'] = 'image'; expressionAttributeValues[':i'] = image; }
            if (status !== undefined) { updateExpressions.push('#s = :s'); expressionAttributeNames['#s'] = 'status'; expressionAttributeValues[':s'] = status; }
            if (updateExpressions.length === 0) return createResponse(400, { message: 'No valid fields for update.'}, requestOrigin);
            updateExpressions.push('#ua = :ua'); expressionAttributeNames['#ua'] = 'updatedAt'; expressionAttributeValues[':ua'] = now;
            await ddbDocClient.send(new UpdateCommand({
                TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId },
                UpdateExpression: `SET ${updateExpressions.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames, ExpressionAttributeValues: expressionAttributeValues
            }));
            console.log(`Updated campaign ${campaignId}`);
            return createResponse(200, { success: true, updatedAt: now }, requestOrigin);
        } catch (error) {
            console.error(`Error updating campaign '${campaignId}':`, error);
            const errMsg = error.message || 'Failed to update campaign';
            return createResponse(errMsg.includes('token') ? 401 : errMsg.includes('Not authorized') ? 403 : 500, { message: errMsg, errorDetails: error.message }, requestOrigin);
        }
      }

      // DELETE /campaigns/{id}
      if (httpMethod === 'DELETE' && pathParts.length === 2) {
        try {
            const authHeader = event.headers?.Authorization || event.headers?.authorization;
            const decodedToken = await verifyJWT(authHeader);
            const walletAddress = decodedToken.walletAddress;
            console.log(`[DELETE /campaigns/:id] Deleting campaign ID: '${campaignId}' by user: ${walletAddress}`);
            const getResult = await ddbDocClient.send(new GetCommand({ TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId } }));
            if (!getResult.Item) return createResponse(404, { message: 'Campaign not found' }, requestOrigin);
            if (getResult.Item.ownerId !== walletAddress) return createResponse(403, { message: 'Not authorized to delete this campaign' }, requestOrigin);
            await ddbDocClient.send(new DeleteCommand({ TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId } }));
            console.log(`Deleted campaign ${campaignId}`);
            return createResponse(200, { success: true }, requestOrigin);
        } catch (error) {
            console.error(`Error deleting campaign '${campaignId}':`, error);
            const errMsg = error.message || 'Failed to delete campaign';
            return createResponse(errMsg.includes('token') ? 401 : errMsg.includes('Not authorized') ? 403 : 500, { message: errMsg, errorDetails: error.message }, requestOrigin);
        }
      }
      
      // POST /campaigns/{id}/donate
      if (httpMethod === 'POST' && pathParts.length === 3 && pathParts[2] === 'donate') {
        console.log(`[POST /campaigns/${campaignId}/donate] On-Chain Verification Handler Triggered`);
        try {
            const authHeader = event.headers?.Authorization || event.headers?.authorization;
            await verifyJWT(authHeader); // Just verify token, don't necessarily need donor address from JWT here
            if (!event.body) return createResponse(400, { message: 'Missing request body' }, requestOrigin);
            const { donatedAmount, transactionHash, chainId } = JSON.parse(event.body);

            if (!donatedAmount || !transactionHash || chainId === undefined) {
                return createResponse(400, { message: 'donatedAmount, transactionHash, and chainId are required.' }, requestOrigin);
            }
            const expectedChainId = parseInt(process.env.VITE_WORLDCHAIN_CHAIN_ID || '0'); 
            if (parseInt(chainId) !== expectedChainId) {
                console.error(`Chain ID mismatch. Expected: ${expectedChainId}, Received: ${chainId}`);
                return createResponse(400, { message: `Invalid chain ID. This donation must be on Worldchain (ID: ${expectedChainId}).` }, requestOrigin);
            }

            const campaignData = await ddbDocClient.send(new GetCommand({ TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId } }));
            if (!campaignData.Item) return createResponse(404, { message: 'Campaign not found.' }, requestOrigin);

            if (campaignData.Item.donations && campaignData.Item.donations.some(d => d.txHash === transactionHash && d.verifiedStatus === 'VERIFIED')) {
                console.warn(`[POST /campaigns/${campaignId}/donate] Transaction hash ${transactionHash} already processed and verified.`);
                return createResponse(409, { message: 'This donation has already been recorded and verified.' }, requestOrigin);
            }
            if (!ethersProvider) throw new Error("Blockchain provider (ethers) not initialized. Check WORLDCHAIN_RPC_URL.");
            console.log(`Workspaceing receipt for tx: ${transactionHash} on chainId: ${chainId}`);
            const receipt = await ethersProvider.getTransactionReceipt(transactionHash);

            if (!receipt) {
                return createResponse(404, { message: `Transaction receipt not found. It might still be processing or on a different network. Please try again later.` }, requestOrigin);
            }
            if (receipt.status !== 1) {
                return createResponse(400, { message: `Transaction failed on-chain. Status: ${receipt.status}` }, requestOrigin);
            }
            console.log(`Transaction ${transactionHash} successful on-chain. Status: ${receipt.status}, Block: ${receipt.blockNumber.toString()}`);
            
            const expectedWldContractLower = WLD_CONTRACT_ADDRESS_WORLDCHAIN.toLowerCase();
            let transferDetails = null;
            const wldInterface = new ethers.Interface(["event Transfer(address indexed from, address indexed to, uint256 value)"]);

            for (const log of receipt.logs) {
                if (log.address.toLowerCase() === expectedWldContractLower) {
                    try {
                        const parsedLog = wldInterface.parseLog(log);
                        if (parsedLog && parsedLog.name === "Transfer") {
                            transferDetails = { from: parsedLog.args.from, to: parsedLog.args.to, value: parsedLog.args.value };
                            console.log("Parsed WLD Transfer event:", {from: transferDetails.from, to: transferDetails.to, value: transferDetails.value.toString()});
                            break;
                        }
                    } catch (e) { /* ignore, not a WLD transfer from this contract */ }
                }
            }
            if (!transferDetails) {
                console.error(`No WLD Transfer event found from contract ${WLD_CONTRACT_ADDRESS_WORLDCHAIN} in tx ${transactionHash}.`);
                return createResponse(400, { message: "Could not verify WLD transfer in the transaction logs for the expected token contract." }, requestOrigin);
            }
            const campaignOwnerId = campaignData.Item.ownerId;
            if (transferDetails.to.toLowerCase() !== campaignOwnerId.toLowerCase()) {
                console.error(`Recipient mismatch for tx ${transactionHash}. Expected: ${campaignOwnerId}, Actual: ${transferDetails.to}`);
                return createResponse(400, { message: `Donation recipient (${transferDetails.to}) does not match campaign owner (${campaignOwnerId}).` }, requestOrigin);
            }
            console.log(`Recipient verified: ${transferDetails.to}`);

            const expectedAmountInSmallestUnit = ethers.parseUnits(donatedAmount, WLD_TOKEN_DECIMALS);
            if (!transferDetails.value.eq(expectedAmountInSmallestUnit)) { // Using .eq() for BigNumber comparison
                console.error(`Amount mismatch for tx ${transactionHash}. Expected: ${expectedAmountInSmallestUnit.toString()}, Actual: ${transferDetails.value.toString()}`);
                return createResponse(400, { message: `Donation amount does not match on-chain transfer. Expected ${donatedAmount} WLD, but found ${ethers.formatUnits(transferDetails.value, WLD_TOKEN_DECIMALS)} WLD.` }, requestOrigin);
            }
            console.log(`Amount verified: ${ethers.formatUnits(transferDetails.value, WLD_TOKEN_DECIMALS)} WLD`);

            const now = new Date().toISOString();
            const verifiedDonation = {
                id: crypto.randomUUID(),
                amount: parseFloat(donatedAmount),
                onChainAmountSmallestUnit: transferDetails.value.toString(),
                donorAddress: transferDetails.from,
                txHash: transactionHash,
                verifiedStatus: 'VERIFIED',
                verifiedAt: now,
                createdAt: now,
                currency: 'WLD',
                chainId: parseInt(chainId),
                blockNumber: receipt.blockNumber.toString(),
            };
            await ddbDocClient.send(new UpdateCommand({
                TableName: CAMPAIGNS_TABLE_NAME,
                Key: { id: campaignId },
                UpdateExpression: 'SET #r = if_not_exists(#r, :z) + :a, #d = list_append(if_not_exists(#d, :el), :dn), #ua = :now',
                ExpressionAttributeNames: { '#r': 'raised', '#d': 'donations', '#ua': 'updatedAt' },
                ExpressionAttributeValues: {
                    ':a': parseFloat(donatedAmount), ':dn': [verifiedDonation],
                    ':el': [], ':now': now, ':z': 0
                },
                ConditionExpression: 'attribute_exists(id)'
            }));
            console.log(`Successfully verified and recorded donation for campaign ${campaignId}: ${donatedAmount} WLD, Tx: ${transactionHash}`);
            return createResponse(200, {
                verified: true, message: "Donation successfully verified and recorded.",
                donationId: verifiedDonation.id
            }, requestOrigin);
        } catch (error) {
            console.error(`[POST /campaigns/${campaignId}/donate] On-Chain Verification Error:`, error);
            const errMsg = error.message || 'Failed to verify and record donation.';
            if (error.name === 'ConditionalCheckFailedException') return createResponse(404, { message: 'Campaign not found for donation.' }, requestOrigin);
            return createResponse(errMsg.includes('token') ? 401 : 500, { verified: false, message: errMsg, errorDetails: error.message }, requestOrigin);
        }
      }
    } // End of /campaigns/{id}/* block
  } // End of /campaigns block


// # ############################################################################ #
// # #                 SECTION 24 - MAIN LAMBDA HANDLER: ROUTE BLOCK - /USERS     #
// # ############################################################################ #
  if (path.startsWith('/users/')) {
    // pathParts is already defined
    if (httpMethod === 'GET' && pathParts.length === 3 && pathParts[0] === 'users' && pathParts[2] === 'campaigns') {
        const userWalletAddress = pathParts[1];
        try {
            console.log(`[GET /users/:walletAddress/campaigns] Fetching campaigns for user: '${userWalletAddress}'`);
            const result = await ddbDocClient.send(new ScanCommand({
                TableName: CAMPAIGNS_TABLE_NAME,
                FilterExpression: '#oId = :walletAddress',
                ExpressionAttributeNames: { '#oId': 'ownerId' },
                ExpressionAttributeValues: { ':walletAddress': userWalletAddress }
            }));
            console.log(`Found ${result.Items?.length || 0} campaigns for user ${userWalletAddress}`);
            return createResponse(200, { campaigns: result.Items || [] }, requestOrigin);
        } catch (error) {
            console.error(`Error getting user campaigns for '${userWalletAddress}':`, error);
            return createResponse(500, { message: 'Failed to get user campaigns', errorDetails: error.message }, requestOrigin);
        }
    }
  }

// # ############################################################################ #
// # #             SECTION 26 - MAIN LAMBDA HANDLER: ROUTE - POST /DONATE (EXAMPLE) #
// # ############################################################################ #
  if (httpMethod === 'POST' && path === '/donate') {
    console.log('[POST /donate] Top-level donate endpoint hit. This might be for a general donation pool or needs campaignId in body.');
    return createResponse(501, { message: 'Top-level /donate not fully implemented. Use /campaigns/{id}/donate' }, requestOrigin);
  }

// # ############################################################################ #
// # #             SECTION 27 - MAIN LAMBDA HANDLER: DEFAULT ROUTE (NOT FOUND)    #
// # ############################################################################ #
  console.log(`Unhandled path: ${httpMethod} ${path}`);
  return createResponse(404, { message: `Not Found: ${httpMethod} ${path}` }, requestOrigin);
};