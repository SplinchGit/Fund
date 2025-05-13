// amplify/backend/function/0worldfunddebug56fd6525/src/index.js

const crypto = require('crypto');
const { SiweMessage } = require('siwe');
const { ethers } = require('ethers');
const jwt = require('jsonwebtoken');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand, ScanCommand, QueryCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const fetch = require('node-fetch');

// --- Configuration ---
const JWT_EXPIRY = '1d';
const WORLD_ID_APP_ID = process.env.VITE_WORLD_APP_ID || process.env.WORLD_APP_ID; // This still relies on VITE_ or WORLD_APP_ID. Consider setting WORLD_APP_ID directly in Lambda env.
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'https://main.d2fvyjulmwt6nl.amplifyapp.com';
const JWT_SECRET_ARN = process.env.JWT_SECRET_ARN;
const WORLD_ID_ACTION_ID = process.env.VITE_WORLD_ACTION_ID || 'verify-user'; // Similar to WORLD_ID_APP_ID, consider direct env var.
const RPC_URL = process.env.RPC_URL; // This is declared but not used yet. Needed for on-chain verification.

// VV VV VV CORRECTED LINES HERE VV VV VV
const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME || 'Users-dev';         // CORRECTED: Now reads USERS_TABLE_NAME (plural S)
const CAMPAIGNS_TABLE_NAME = process.env.CAMPAIGNS_TABLE_NAME || 'Campaigns-dev'; // CORRECTED: Now reads CAMPAIGNS_TABLE_NAME (plural S)
// VV VV VV END OF CORRECTED LINES VV VV VV

// --- AWS SDK Clients ---
// Ensure AWS_REGION is set in your Lambda environment variables (Amplify usually does this)
const lambdaRegion = process.env.AWS_REGION || 'eu-west-2'; // Fallback if not set, but should be.
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

// Helper function to create consistent API responses
function createResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN, // Using configured ALLOWED_ORIGIN
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Requested-With'
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
    if (!jwtSecret) { // Additional check
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
  
    // Log effective table names at the start of each invocation for easier debugging
    console.log(`Effective USERS_TABLE_NAME: '${USERS_TABLE_NAME}' (from process.env.USERS_TABLE_NAME: '${process.env.USERS_TABLE_NAME}')`);
    console.log(`Effective CAMPAIGNS_TABLE_NAME: '${CAMPAIGNS_TABLE_NAME}' (from process.env.CAMPAIGNS_TABLE_NAME: '${process.env.CAMPAIGNS_TABLE_NAME}')`);
    console.log(`Effective JWT_SECRET_ARN: '${JWT_SECRET_ARN}'`);
    console.log(`Effective AWS_REGION: '${process.env.AWS_REGION}'`);


    // Check essential configuration early   
    if (!USERS_TABLE_NAME || USERS_TABLE_NAME === 'Users-dev' && !process.env.USERS_TABLE_NAME) { // Check if using fallback due to missing env var
      console.error("USERS_TABLE_NAME not configured correctly. It's either not set or using fallback 'Users-dev' because process.env.USERS_TABLE_NAME is undefined.");
      // Decide if this is critical enough to halt, or if 'Users-dev' fallback is sometimes acceptable.
      // For now, we let it proceed but the log above is important.
    }
    if (!CAMPAIGNS_TABLE_NAME || CAMPAIGNS_TABLE_NAME === 'Campaigns-dev' && !process.env.CAMPAIGNS_TABLE_NAME) { // Check if using fallback
      console.error("CAMPAIGNS_TABLE_NAME not configured correctly. It's either not set or using fallback 'Campaigns-dev' because process.env.CAMPAIGNS_TABLE_NAME is undefined.");
    }
    if (!JWT_SECRET_ARN) {
      console.error("JWT_SECRET_ARN environment variable is not set. Cannot sign/verify tokens.");
      return createResponse(500, { message: "Server configuration error: Missing JWT secret configuration." });
    }
  
    const httpMethod = event.httpMethod;
    const path = event.requestContext?.http?.path || event.path; // Using event.path as primary if event.requestContext.http.path is not standard for REST API
    console.log(`Handling request: ${httpMethod} ${path}`);
  
    // Handle CORS preflight OPTIONS requests globally
    if (httpMethod === 'OPTIONS') {
      console.log('Handling OPTIONS preflight request');
      return createResponse(200, {});
    }
  
    // --- Auth Routes ---
    
    // Generate nonce
    if (httpMethod === 'GET' && path === '/auth/nonce') {
      console.log('[GET /auth/nonce] Generating nonce...');
      try {
        const nonce = generateNonce();
        return createResponse(200, { nonce });
      } catch (error) {
        console.error('[GET /auth/nonce] Error:', error);
        return createResponse(500, { message: 'Failed to generate nonce' });
      }
    }
  
    // Verify wallet signature
    if (httpMethod === 'POST' && path === '/auth/verify-signature') {
      console.log('[POST /auth/verify-signature] Handler triggered');
      
      if (!event.body) {
        return createResponse(400, { message: 'Missing request body' });
      }
  
      try {
        const { payload, nonce } = JSON.parse(event.body);
        
        if (!payload || !nonce) {
          return createResponse(400, { message: 'Missing payload or nonce' });
        }
  
        // Verify SIWE message
        const siweMessage = new SiweMessage(payload.message);
        const fields = await siweMessage.verify({ signature: payload.signature });
        
        if (!fields.success) {
          return createResponse(401, { message: 'Invalid signature' });
        }
  
        const walletAddress = siweMessage.address;
        const now = new Date().toISOString();
  
        // Create/update user
        try {
          await ddbDocClient.send(new PutCommand({
            TableName: USERS_TABLE_NAME,
            Item: {
              walletAddress,
              createdAt: now,
              lastLoginAt: now,
              isWorldIdVerified: false
            },
            ConditionExpression: 'attribute_not_exists(walletAddress)'
          }));
        } catch (err) {
          if (err.name === 'ConditionalCheckFailedException') {
            // User exists, update last login
            await ddbDocClient.send(new UpdateCommand({
              TableName: USERS_TABLE_NAME,
              Key: { walletAddress },
              UpdateExpression: 'SET lastLoginAt = :now',
              ExpressionAttributeValues: { ':now': now }
            }));
          } else {
            console.error(`Error putting/updating user in DynamoDB table '${USERS_TABLE_NAME}':`, err);
            throw err; // Re-throw to be caught by outer try-catch
          }
        }
  
        // Generate JWT
        const jwtSecret = await getJwtSecret();
        const token = jwt.sign(
          { walletAddress }, // Payload includes walletAddress
          jwtSecret,
          { expiresIn: JWT_EXPIRY }
        );
  
        return createResponse(200, {
          success: true,
          token,
          walletAddress
        });
  
      } catch (error) {
        console.error('[POST /auth/verify-signature] Error:', error);
        return createResponse(500, { 
          message: 'Failed to verify signature',
          error: error.message 
        });
      }
    }
  
    // Verify World ID
    if (httpMethod === 'POST' && path === '/verify-worldid') {
      console.log('[POST /verify-worldid] Handler triggered');
      
      try {
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        const decodedToken = await verifyJWT(authHeader);
        const walletAddress = decodedToken.walletAddress;
  
        if (!event.body) {
          return createResponse(400, { message: 'Missing request body' });
        }
  
        const worldIdProof = JSON.parse(event.body);
        
        // TODO: Verify World ID proof with World ID API using WORLD_ID_APP_ID and WORLD_ID_ACTION_ID
        // Example:
        // const verificationResult = await fetch(`https://developer.worldcoin.org/api/v2/verify/${WORLD_ID_APP_ID}`, {
        //    method: 'POST',
        //    headers: { 'Content-Type': 'application/json' },
        //    body: JSON.stringify({
        //      merkle_root: worldIdProof.merkle_root,
        //      nullifier_hash: worldIdProof.nullifier_hash,
        //      proof: worldIdProof.proof,
        //      verification_level: worldIdProof.verification_level, // or your required level
        //      action: WORLD_ID_ACTION_ID, 
        //      signal: walletAddress // Or other signal if used
        //    })
        // });
        // if (!verificationResult.ok) {
        //    const errorData = await verificationResult.json().catch(() => ({}));
        //    console.error('World ID proof verification failed with API:', errorData);
        //    return createResponse(400, { message: 'World ID proof verification failed', details: errorData.code || errorData.detail });
        // }
        // console.log('World ID proof successfully verified with API.');
        
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
  
        return createResponse(200, { success: true });
  
      } catch (error) {
        console.error('[POST /verify-worldid] Error:', error);
        const errorMessage = error.message || 'Failed to verify World ID';
        return createResponse(error.message && error.message.includes('token') ? 401 : 500, { 
          message: errorMessage,
          errorDetails: error.message 
        });
      }
    }
  
  // --- Campaign Routes ---
  
  // Create campaign
  if (httpMethod === 'POST' && path === '/campaigns') {
    try {
      const authHeader = event.headers?.Authorization || event.headers?.authorization;
      const decodedToken = await verifyJWT(authHeader);
      const walletAddress = decodedToken.walletAddress;

      if (!event.body) {
        return createResponse(400, { message: 'Missing request body' });
      }

      const { title, description, goal, image } = JSON.parse(event.body);

      if (!title || !goal) {
        return createResponse(400, { message: 'Title and goal are required' });
      }

      const campaignId = crypto.randomUUID();
      const now = new Date().toISOString();

      const campaign = {
        id: campaignId,
        title,
        description: description || '',
        goal: Number(goal),
        raised: 0,
        ownerId: walletAddress,
        image: image || '',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        donations: [],
        currency: 'WLD' // Using WLD currency
      };

      await ddbDocClient.send(new PutCommand({
        TableName: CAMPAIGNS_TABLE_NAME,
        Item: campaign
      }));

      console.log(`Created campaign ${campaignId} for user ${walletAddress}`);
      return createResponse(201, { success: true, id: campaignId, createdAt: now });

    } catch (error) {
      console.error('Error creating campaign:', error);
      const errorMessage = error.message || 'Failed to create campaign';
      return createResponse(
        error.message && error.message.includes('token') ? 401 : 500,
        { message: errorMessage, errorDetails: error.message }
      );
    }
  }

  // List all campaigns
  if (httpMethod === 'GET' && path === '/campaigns') {
    try {
      // This is the diagnostic log you added - keep it for now
      console.log(`[GET /campaigns] TRYING TO SCAN TABLE NAMED: '${CAMPAIGNS_TABLE_NAME}' (from process.env.CAMPAIGNS_TABLE_NAME: '${process.env.CAMPAIGNS_TABLE_NAME}') (Region: '${process.env.AWS_REGION}')`);
      
      const result = await ddbDocClient.send(new ScanCommand({
        TableName: CAMPAIGNS_TABLE_NAME,
        FilterExpression: '#status = :active',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':active': 'active'
        }
      }));

      console.log(`Found ${result.Items?.length || 0} active campaigns`);
      return createResponse(200, { campaigns: result.Items || [] });

    } catch (error) {
      console.error(`Error listing campaigns from table '${CAMPAIGNS_TABLE_NAME}':`, error);
      return createResponse(500, { message: 'Failed to list campaigns', errorDetails: error.message });
    }
  }

  // Get single campaign
  if (httpMethod === 'GET' && path.startsWith('/campaigns/') && !path.endsWith('/donate')  && path.split('/').length === 3) {
    try {
      const campaignId = path.split('/')[2];
      console.log(`[GET /campaigns/:id] Fetching campaign with ID: '${campaignId}', using table: '${CAMPAIGNS_TABLE_NAME}'`);
      
      const result = await ddbDocClient.send(new GetCommand({
        TableName: CAMPAIGNS_TABLE_NAME,
        Key: { id: campaignId }
      }));

      if (!result.Item) {
        return createResponse(404, { message: 'Campaign not found' });
      }

      return createResponse(200, result.Item);

    } catch (error) {
      console.error(`Error getting campaign from table '${CAMPAIGNS_TABLE_NAME}':`, error);
      return createResponse(500, { message: 'Failed to get campaign', errorDetails: error.message });
    }
  }

  // Update campaign
  if (httpMethod === 'PUT' && path.startsWith('/campaigns/') && path.split('/').length === 3) {
    try {
      const authHeader = event.headers?.Authorization || event.headers?.authorization;
      const decodedToken = await verifyJWT(authHeader);
      const walletAddress = decodedToken.walletAddress;
      const campaignId = path.split('/')[2];
      console.log(`[PUT /campaigns/:id] Updating campaign with ID: '${campaignId}', using table: '${CAMPAIGNS_TABLE_NAME}' by user: ${walletAddress}`);


      // First, verify ownership
      const getResult = await ddbDocClient.send(new GetCommand({
        TableName: CAMPAIGNS_TABLE_NAME,
        Key: { id: campaignId }
      }));

      if (!getResult.Item) {
        return createResponse(404, { message: 'Campaign not found' });
      }

      if (getResult.Item.ownerId !== walletAddress) {
        return createResponse(403, { message: 'Not authorized to update this campaign' });
      }

      if (!event.body) {
        return createResponse(400, { message: 'Missing request body for update' });
      }
      const { title, description, goal, image, status } = JSON.parse(event.body);
      const now = new Date().toISOString();

      // Build update expression dynamically
      const updateExpressions = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      if (title !== undefined) {
        updateExpressions.push('#title = :title');
        expressionAttributeNames['#title'] = 'title';
        expressionAttributeValues[':title'] = title;
      }
      if (description !== undefined) {
        updateExpressions.push('#description = :description');
        expressionAttributeNames['#description'] = 'description';
        expressionAttributeValues[':description'] = description;
      }
      if (goal !== undefined) {
        updateExpressions.push('#goal = :goal');
        expressionAttributeNames['#goal'] = 'goal';
        expressionAttributeValues[':goal'] = Number(goal);
      }
      if (image !== undefined) {
        updateExpressions.push('#image = :image');
        expressionAttributeNames['#image'] = 'image';
        expressionAttributeValues[':image'] = image;
      }
      if (status !== undefined) {
        updateExpressions.push('#status = :status');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = status;
      }
      
      if (updateExpressions.length === 0) {
        return createResponse(400, { message: 'No valid fields provided for update.'});
      }

      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = now;

      await ddbDocClient.send(new UpdateCommand({
        TableName: CAMPAIGNS_TABLE_NAME,
        Key: { id: campaignId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      }));

      console.log(`Updated campaign ${campaignId}`);
      return createResponse(200, { success: true, updatedAt: now });

    } catch (error) {
      console.error(`Error updating campaign on table '${CAMPAIGNS_TABLE_NAME}':`, error);
      const errorMessage = error.message || 'Failed to update campaign';
      return createResponse(
        error.message && error.message.includes('token') ? 401 : 
        error.message && error.message.includes('Not authorized') ? 403 : 500,
        { message: errorMessage, errorDetails: error.message }
      );
    }
  }

  // Delete campaign
  if (httpMethod === 'DELETE' && path.startsWith('/campaigns/') && path.split('/').length === 3) {
    try {
      const authHeader = event.headers?.Authorization || event.headers?.authorization;
      const decodedToken = await verifyJWT(authHeader);
      const walletAddress = decodedToken.walletAddress;
      const campaignId = path.split('/')[2];
      console.log(`[DELETE /campaigns/:id] Deleting campaign with ID: '${campaignId}', using table: '${CAMPAIGNS_TABLE_NAME}' by user: ${walletAddress}`);


      // First, verify ownership
      const getResult = await ddbDocClient.send(new GetCommand({
        TableName: CAMPAIGNS_TABLE_NAME,
        Key: { id: campaignId }
      }));

      if (!getResult.Item) {
        return createResponse(404, { message: 'Campaign not found' });
      }

      if (getResult.Item.ownerId !== walletAddress) {
        return createResponse(403, { message: 'Not authorized to delete this campaign' });
      }

      await ddbDocClient.send(new DeleteCommand({
        TableName: CAMPAIGNS_TABLE_NAME,
        Key: { id: campaignId }
      }));

      console.log(`Deleted campaign ${campaignId}`);
      return createResponse(200, { success: true });

    } catch (error) {
      console.error(`Error deleting campaign on table '${CAMPAIGNS_TABLE_NAME}':`, error);
      const errorMessage = error.message || 'Failed to delete campaign';
      return createResponse(
        error.message && error.message.includes('token') ? 401 : 
        error.message && error.message.includes('Not authorized') ? 403 : 500,
        { message: errorMessage, errorDetails: error.message }
      );
    }
  }

  // Record donation
  if (httpMethod === 'POST' && path.startsWith('/campaigns/') && path.endsWith('/donate')) {
    try {
      const authHeader = event.headers?.Authorization || event.headers?.authorization;
      const decodedToken = await verifyJWT(authHeader);
      const walletAddress = decodedToken.walletAddress;
      const campaignId = path.split('/')[2]; // Correctly extracts campaignId
      console.log(`[POST /campaigns/:id/donate] Recording donation for campaign ID: '${campaignId}', using table: '${CAMPAIGNS_TABLE_NAME}' by user: ${walletAddress}`);


      if (!event.body) {
        return createResponse(400, { message: 'Missing request body' });
      }

      const { amount, txHash } = JSON.parse(event.body);

      if (!amount || !txHash) {
        return createResponse(400, { message: 'Amount and transaction hash are required' });
      }
      if (typeof amount !== 'number' || amount <= 0) {
        return createResponse(400, {message: 'Invalid amount'});
      }


      const now = new Date().toISOString();
      const donation = {
        id: crypto.randomUUID(),
        amount: Number(amount),
        donor: walletAddress,
        txHash,
        createdAt: now,
        currency: 'WLD'
      };

      // TODO: Add on-chain verification of txHash before updating DynamoDB

      // Update campaign with new donation
      await ddbDocClient.send(new UpdateCommand({
        TableName: CAMPAIGNS_TABLE_NAME,
        Key: { id: campaignId },
        UpdateExpression: 'SET #raised = #raised + :amount, #donations = list_append(if_not_exists(#donations, :empty_list), :donation)',
        ExpressionAttributeNames: {
          '#raised': 'raised',
          '#donations': 'donations'
        },
        ExpressionAttributeValues: {
          ':amount': Number(amount),
          ':donation': [donation],
          ':empty_list': []
        },
        ConditionExpression: 'attribute_exists(id)' // Ensure campaign exists
      }));

      console.log(`Recorded donation for campaign ${campaignId}: ${amount} WLD`);
      return createResponse(201, { success: true, donationId: donation.id });

    } catch (error) {
      console.error(`Error recording donation on table '${CAMPAIGNS_TABLE_NAME}':`, error);
      const errorMessage = error.message || 'Failed to record donation';
      if (error.name === 'ConditionalCheckFailedException') {
          return createResponse(404, { message: 'Campaign not found to record donation.' });
      }
      return createResponse(
        error.message && error.message.includes('token') ? 401 : 500,
        { message: errorMessage, errorDetails: error.message }
      );
    }
  }

  // Get user's campaigns
  if (httpMethod === 'GET' && path.startsWith('/users/') && path.endsWith('/campaigns')) {
    try {
      const walletAddress = path.split('/')[2];
      console.log(`[GET /users/:walletAddress/campaigns] Fetching campaigns for user: '${walletAddress}', using table: '${CAMPAIGNS_TABLE_NAME}'`);
      
      // Optional: Verify if the requester is the owner if you want to restrict this
      // For now, this allows anyone to see any user's campaigns by their wallet address.
      // let requesterAddress = null;
      // try {
      //   const authHeader = event.headers?.Authorization || event.headers?.authorization;
      //   if (authHeader) { // only try to verify if a token is present
      //      const decodedToken = await verifyJWT(authHeader);
      //      requesterAddress = decodedToken.walletAddress;
      //   }
      // } catch (e) {
      //   console.log('Token verification failed or no token, allowing public access to user campaigns if intended.');
      // }
      // if (requesterAddress !== walletAddress) {
      //   // Potentially return 403 if you only want users to see their own, and a token was provided but didn't match
      // }


      const result = await ddbDocClient.send(new ScanCommand({
        TableName: CAMPAIGNS_TABLE_NAME,
        FilterExpression: '#ownerId = :walletAddress',
        ExpressionAttributeNames: {
          '#ownerId': 'ownerId'
        },
        ExpressionAttributeValues: {
          ':walletAddress': walletAddress
        }
      }));

      console.log(`Found ${result.Items?.length || 0} campaigns for user ${walletAddress}`);
      return createResponse(200, { campaigns: result.Items || [] });

    } catch (error) {
      console.error(`Error getting user campaigns from table '${CAMPAIGNS_TABLE_NAME}':`, error);
      return createResponse(500, { message: 'Failed to get user campaigns', errorDetails: error.message });
    }
  }

  // --- Default Route (Not Found) ---
  console.log(`Unhandled path: ${httpMethod} ${path}`);
  return createResponse(404, { message: `Not Found: ${httpMethod} ${path}` });
};