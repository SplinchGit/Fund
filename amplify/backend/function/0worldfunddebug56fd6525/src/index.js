// amplify/backend/function/0worldfunddebug56fd6525/src/index.js

const crypto = require('crypto');
const { SiweMessage } = require('siwe');
// const { ethers } = require('ethers'); // Not directly used in this version, can be removed if no direct ethers calls
const jwt = require('jsonwebtoken');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand, ScanCommand, QueryCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
// const fetch = require('node-fetch'); // Not used for World ID verify yet, can be kept if you plan to use it.

// --- Configuration ---
const JWT_EXPIRY = '1d';
const WORLD_ID_APP_ID = process.env.VITE_WORLD_APP_ID || process.env.WORLD_APP_ID;
const JWT_SECRET_ARN = process.env.JWT_SECRET_ARN;
const WORLD_ID_ACTION_ID = process.env.VITE_WORLD_ACTION_ID || 'verify-user';
// const RPC_URL = process.env.RPC_URL; // Declared but not used

// --- CORS Configuration ---
const DEPLOYED_FRONTEND_URL = process.env.FRONTEND_URL || 'https://main.d2fvyjulmwt6nl.amplifyapp.com'; // Your deployed Amplify app URL
const LOCAL_DEV_URL = 'http://localhost:5173'; // Your local Vite dev server URL
const ALLOWED_ORIGINS_LIST = [DEPLOYED_FRONTEND_URL, LOCAL_DEV_URL];

const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME || 'Users-dev';
const CAMPAIGNS_TABLE_NAME = process.env.CAMPAIGNS_TABLE_NAME || 'Campaigns-dev'; // Corrected from 'Campaigns-dev' to process.env.CAMPAIGNS_TABLE_NAME

// --- AWS SDK Clients ---
const lambdaRegion = process.env.AWS_REGION || 'eu-west-2';
const secretsClient = new SecretsManagerClient({ region: lambdaRegion });
const dynamodbClient = new DynamoDBClient({ region: lambdaRegion });
const ddbDocClient = DynamoDBDocumentClient.from(dynamodbClient);

// --- Global variable to cache the JWT secret ---
let cachedJwtSecret = null;

// --- HELPER FUNCTIONS ---

// Helper function to generate a secure nonce
const generateNonce = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Helper function to create consistent API responses with dynamic CORS
function createResponse(statusCode, body, requestOrigin) {
  let effectiveAllowOrigin = DEPLOYED_FRONTEND_URL; // Default to deployed URL

  if (requestOrigin && ALLOWED_ORIGINS_LIST.includes(requestOrigin)) {
    effectiveAllowOrigin = requestOrigin; // If requestOrigin is in the allowed list, use it
  }
  // For very open development (less secure, use with extreme caution, and not for prod):
  // if (process.env.NODE_ENV === 'development_unsafe_cors') {
  //   effectiveAllowOrigin = '*';
  // }


  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': effectiveAllowOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Requested-With,Origin' // Added Origin
    },
    body: JSON.stringify(body)
  };
}

// Helper to get JWT secret from AWS Secrets Manager
const getJwtSecret = async () => {
  if (cachedJwtSecret) {
    return cachedJwtSecret;
  }
  
  if (!JWT_SECRET_ARN) {
      console.error('JWT_SECRET_ARN environment variable is not set.');
      throw new Error('Server configuration error: JWT secret ARN is missing.');
  }

  try {
    const command = new GetSecretValueCommand({
      SecretId: JWT_SECRET_ARN,
    });
    
    const response = await secretsClient.send(command);
    if (response.SecretString) {
        cachedJwtSecret = response.SecretString;
        return cachedJwtSecret;
    } else {
        console.error('SecretString is empty in the response from Secrets Manager for JWT_SECRET_ARN:', JWT_SECRET_ARN);
        throw new Error('Failed to retrieve JWT secret content.');
    }
  } catch (error) {
    console.error('Error retrieving JWT secret from ARN:', JWT_SECRET_ARN, error);
    throw new Error('Failed to retrieve JWT secret');
  }
};

// Helper to verify JWT token
const verifyJWT = async (authHeader) => {
  if (!authHeader) {
    throw new Error('No authorization header provided');
  }
  
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7)
    : authHeader;
  
  if (!token) {
    throw new Error('No token provided');
  }
  
  try {
    const jwtSecret = await getJwtSecret();
    if (!jwtSecret) { 
        throw new Error('JWT secret is not available for verification.');
    }
    const decoded = jwt.verify(token, jwtSecret);
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    throw new Error('Invalid or expired token');
  }
};

// --- Main Handler ---
exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    const requestOrigin = event.headers?.origin || event.headers?.Origin; // Get the origin from the request
    console.log('Request Origin:', requestOrigin);

    // Log effective table names at the start of each invocation for easier debugging
    console.log(`Effective USERS_TABLE_NAME: '${USERS_TABLE_NAME}' (from process.env.USERS_TABLE_NAME: '${process.env.USERS_TABLE_NAME}')`);
    console.log(`Effective CAMPAIGNS_TABLE_NAME: '${CAMPAIGNS_TABLE_NAME}' (from process.env.CAMPAIGNS_TABLE_NAME: '${process.env.CAMPAIGNS_TABLE_NAME}')`);
    console.log(`Effective JWT_SECRET_ARN: '${JWT_SECRET_ARN}'`);
    console.log(`Effective AWS_REGION: '${process.env.AWS_REGION}'`);

    // Check essential configuration early   
    if (!USERS_TABLE_NAME || (USERS_TABLE_NAME === 'Users-dev' && !process.env.USERS_TABLE_NAME)) { 
      console.error("USERS_TABLE_NAME not configured correctly. It's either not set or using fallback 'Users-dev' because process.env.USERS_TABLE_NAME is undefined.");
    }
    if (!CAMPAIGNS_TABLE_NAME || (CAMPAIGNS_TABLE_NAME === 'Campaigns-dev' && !process.env.CAMPAIGNS_TABLE_NAME)) { 
      console.error("CAMPAIGNS_TABLE_NAME not configured correctly. It's either not set or using fallback 'Campaigns-dev' because process.env.CAMPAIGNS_TABLE_NAME is undefined.");
    }
    if (!JWT_SECRET_ARN) {
      console.error("JWT_SECRET_ARN environment variable is not set. Cannot sign/verify tokens.");
      return createResponse(500, { message: "Server configuration error: Missing JWT secret configuration." }, requestOrigin);
    }
  
    const httpMethod = event.httpMethod;
    // API Gateway (REST API with Lambda Proxy) usually provides path in event.path
    // For HTTP API, it might be event.requestContext.http.path
    // Let's prioritize event.path and fallback if needed, or use what Amplify sets up.
    // Given Amplify setup, event.path should be correct for REST API with {proxy+}
    const path = event.path; 
    console.log(`Handling request: ${httpMethod} ${path}`);
  
    // Handle CORS preflight OPTIONS requests globally
    if (httpMethod === 'OPTIONS') {
      console.log('Handling OPTIONS preflight request');
      return createResponse(200, {}, requestOrigin);
    }
  
    // --- Auth Routes ---
    // API Gateway with {proxy+} on /auth will send /auth/nonce to event.path
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
  
    if (httpMethod === 'POST' && path === '/auth/verify-signature') {
      console.log('[POST /auth/verify-signature] Handler triggered');
      if (!event.body) {
        return createResponse(400, { message: 'Missing request body' }, requestOrigin);
      }
      try {
        const { payload, nonce } = JSON.parse(event.body);
        if (!payload || !nonce) {
          return createResponse(400, { message: 'Missing payload or nonce' }, requestOrigin);
        }
        const siweMessage = new SiweMessage(payload.message);
        const fields = await siweMessage.verify({ signature: payload.signature });
        if (!fields.success) {
          return createResponse(401, { message: 'Invalid signature' }, requestOrigin);
        }
        const walletAddress = siweMessage.address;
        const now = new Date().toISOString();
        try {
          await ddbDocClient.send(new PutCommand({
            TableName: USERS_TABLE_NAME,
            Item: { walletAddress, createdAt: now, lastLoginAt: now, isWorldIdVerified: false },
            ConditionExpression: 'attribute_not_exists(walletAddress)'
          }));
        } catch (err) {
          if (err.name === 'ConditionalCheckFailedException') {
            await ddbDocClient.send(new UpdateCommand({
              TableName: USERS_TABLE_NAME,
              Key: { walletAddress },
              UpdateExpression: 'SET lastLoginAt = :now',
              ExpressionAttributeValues: { ':now': now }
            }));
          } else {
            console.error(`Error putting/updating user in DynamoDB table '${USERS_TABLE_NAME}':`, err);
            throw err;
          }
        }
        const jwtSecret = await getJwtSecret();
        const token = jwt.sign({ walletAddress }, jwtSecret, { expiresIn: JWT_EXPIRY });
        return createResponse(200, { success: true, token, walletAddress }, requestOrigin);
      } catch (error) {
        console.error('[POST /auth/verify-signature] Error:', error);
        return createResponse(500, { message: 'Failed to verify signature', error: error.message }, requestOrigin);
      }
    }
  
    // Path for /verify-worldid (assuming it's a top-level path defined in Amplify CLI as /verify-worldid)
    if (httpMethod === 'POST' && path === '/verify-worldid') { 
      console.log('[POST /verify-worldid] Handler triggered');
      try {
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        const decodedToken = await verifyJWT(authHeader);
        const walletAddress = decodedToken.walletAddress;
        if (!event.body) {
          return createResponse(400, { message: 'Missing request body' }, requestOrigin);
        }
        const worldIdProof = JSON.parse(event.body);
        
        // --- Actual World ID Verification Logic (Placeholder) ---
        console.log(`Simulating World ID verification for app ${WORLD_ID_APP_ID}, action ${WORLD_ID_ACTION_ID}, signal ${walletAddress}`);
        // Replace with actual fetch call to World ID verification endpoint
        // const verificationResult = await fetch(`https://developer.worldcoin.org/api/v2/verify/${WORLD_ID_APP_ID}`, { /* ... */ });
        // if (!verificationResult.ok) { /* handle error */ }
        // For now, we'll assume verification is successful for testing purposes
        const isVerified = true; // Placeholder
        if (!isVerified) {
             return createResponse(400, { message: 'World ID proof verification failed (Simulated)' }, requestOrigin);
        }
        console.log('World ID proof successfully verified (Simulated).');
        // --- End of Placeholder ---

        const now = new Date().toISOString();
        await ddbDocClient.send(new UpdateCommand({
          TableName: USERS_TABLE_NAME,
          Key: { walletAddress },
          UpdateExpression: 'SET isWorldIdVerified = :true, worldIdVerifiedAt = :now, worldIdNullifier = :nullifier',
          ExpressionAttributeValues: {
            ':true': true,
            ':now': now,
            ':nullifier': worldIdProof.nullifier_hash || 'unknown'
          }
        }));
        return createResponse(200, { success: true }, requestOrigin);
      } catch (error) {
        console.error('[POST /verify-worldid] Error:', error);
        const errorMessage = error.message || 'Failed to verify World ID';
        return createResponse(error.message && error.message.includes('token') ? 401 : 500, { 
          message: errorMessage, errorDetails: error.message 
        }, requestOrigin);
      }
    }
  
    // --- Campaign Routes ---
    // API Gateway with {proxy+} on /campaigns will send /campaigns to event.path for base
    // and /campaigns/ID to event.path for specific campaign
    // and /campaigns/ID/donate to event.path for donation to specific campaign

    if (path.startsWith('/campaigns')) {
        const pathParts = path.split('/').filter(part => part !== ''); // e.g. ['campaigns', 'ID', 'donate'] or ['campaigns', 'ID'] or ['campaigns']
        
        // POST /campaigns (Create campaign)
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

        // GET /campaigns (List all campaigns)
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

        // Operations on a specific campaign: /campaigns/{campaignId}/*
        if (pathParts.length >= 2 && pathParts[0] === 'campaigns') {
            const campaignId = pathParts[1];

            // GET /campaigns/{campaignId}
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

            // PUT /campaigns/{campaignId}
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

            // DELETE /campaigns/{campaignId}
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

            // POST /campaigns/{campaignId}/donate
            if (httpMethod === 'POST' && pathParts.length === 3 && pathParts[2] === 'donate') {
                try {
                    const authHeader = event.headers?.Authorization || event.headers?.authorization;
                    const decodedToken = await verifyJWT(authHeader);
                    const donorWalletAddress = decodedToken.walletAddress; // Renamed for clarity
                    console.log(`[POST /campaigns/:id/donate] Donating to campaign ID: '${campaignId}' by user: ${donorWalletAddress}`);
                    if (!event.body) return createResponse(400, { message: 'Missing request body' }, requestOrigin);
                    const { amount, txHash } = JSON.parse(event.body);
                    if (!amount || !txHash) return createResponse(400, { message: 'Amount and transaction hash are required' }, requestOrigin);
                    if (typeof amount !== 'number' || amount <= 0) return createResponse(400, {message: 'Invalid amount'}, requestOrigin);
                    const now = new Date().toISOString();
                    const donation = { id: crypto.randomUUID(), amount: Number(amount), donor: donorWalletAddress, txHash, createdAt: now, currency: 'WLD' };
                    // TODO: Add on-chain verification of txHash
                    await ddbDocClient.send(new UpdateCommand({
                        TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId },
                        UpdateExpression: 'SET #r = #r + :a, #d = list_append(if_not_exists(#d, :el), :dn)',
                        ExpressionAttributeNames: { '#r': 'raised', '#d': 'donations' },
                        ExpressionAttributeValues: { ':a': Number(amount), ':dn': [donation], ':el': [] },
                        ConditionExpression: 'attribute_exists(id)'
                    }));
                    console.log(`Recorded donation for campaign ${campaignId}: ${amount} WLD`);
                    return createResponse(201, { success: true, donationId: donation.id }, requestOrigin);
                } catch (error) {
                    console.error(`Error recording donation for campaign '${campaignId}':`, error);
                    const errMsg = error.message || 'Failed to record donation';
                    if (error.name === 'ConditionalCheckFailedException') return createResponse(404, { message: 'Campaign not found for donation.' }, requestOrigin);
                    return createResponse(errMsg.includes('token') ? 401 : 500, { message: errMsg, errorDetails: error.message }, requestOrigin);
                }
            }
        }
    }
    
    // --- User Routes ---
    // API Gateway with {proxy+} on /users will send /users/{walletAddress}/campaigns to event.path
    if (path.startsWith('/users/')) {
        const pathParts = path.split('/').filter(part => part !== ''); // e.g. ['users', 'WALLET_ADDRESS', 'campaigns']
        if (httpMethod === 'GET' && pathParts.length === 3 && pathParts[0] === 'users' && pathParts[2] === 'campaigns') {
            const userWalletAddress = pathParts[1];
            try {
                console.log(`[GET /users/:walletAddress/campaigns] Fetching campaigns for user: '${userWalletAddress}'`);
                const result = await ddbDocClient.send(new ScanCommand({ // Consider Query if you have an index on ownerId
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

    // --- Donate Route (if you have a top-level /donate defined in Amplify CLI) ---
    // This is an example if you defined /donate as a base path.
    // If donations are always /campaigns/{id}/donate, this block might not be needed.
    if (httpMethod === 'POST' && path === '/donate') {
        console.log('[POST /donate] Top-level donate endpoint hit. This might be for a general donation pool or needs campaignId in body.');
        // Implement logic for a general donation if applicable, or return error if campaignId is expected in body
        // For example, if campaignId is expected in the body:
        // const { campaignId, amount, txHash } = JSON.parse(event.body);
        // if (!campaignId) return createResponse(400, { message: 'campaignId is required in the request body for /donate' }, requestOrigin);
        // ... then proceed similar to /campaigns/{id}/donate logic ...
        return createResponse(501, { message: 'Top-level /donate not fully implemented. Use /campaigns/{id}/donate' }, requestOrigin);
    }


    // --- Default Route (Not Found) ---
    console.log(`Unhandled path: ${httpMethod} ${path}`);
    return createResponse(404, { message: `Not Found: ${httpMethod} ${path}` }, requestOrigin);
};
