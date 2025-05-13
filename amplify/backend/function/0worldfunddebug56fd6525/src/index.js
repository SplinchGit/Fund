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
const WORLD_ID_APP_ID = process.env.VITE_WORLD_APP_ID || process.env.WORLD_APP_ID;
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'https://main.d2fvyjulmwt6nl.amplifyapp.com';
const JWT_SECRET_ARN = process.env.JWT_SECRET_ARN;
const WORLD_ID_ACTION_ID = process.env.VITE_WORLD_ACTION_ID || 'verify-user';
const RPC_URL = process.env.RPC_URL;
const USERS_TABLE_NAME = process.env.USER_TABLE_NAME || 'Users-dev';
const CAMPAIGNS_TABLE_NAME = process.env.CAMPAIGN_TABLE_NAME || 'Campaigns-dev';

// --- AWS SDK Clients ---
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });
const dynamodbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(dynamodbClient);

// --- Global variable to cache the JWT secret ---
let cachedJwtSecret = null;

// --- HELPER FUNCTIONS (ADD THESE) ---

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
      'Access-Control-Allow-Origin': '*',
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
  
  try {
    const command = new GetSecretValueCommand({
      SecretId: JWT_SECRET_ARN,
    });
    
    const response = await secretsClient.send(command);
    cachedJwtSecret = response.SecretString;
    return cachedJwtSecret;
  } catch (error) {
    console.error('Error retrieving JWT secret:', error);
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
  
    // Check essential configuration early  
    if (!USERS_TABLE_NAME || !CAMPAIGNS_TABLE_NAME) {
      console.error("Table names not configured");
      return createResponse(500, { message: "Server configuration error: Missing table names." });
    }
  
    const httpMethod = event.httpMethod;
    const path = event.requestContext?.http?.path || event.path;
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
            throw err;
          }
        }
  
        // Generate JWT
        const jwtSecret = await getJwtSecret();
        const token = jwt.sign(
          { walletAddress },
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
        
        // TODO: Verify World ID proof with World ID API
        // For now, just update user record
        
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
        return createResponse(500, { 
          message: 'Failed to verify World ID',
          error: error.message 
        });
      }
    }
  
  // --- Campaign Routes ---
  
  // Create campaign
  if (httpMethod === 'POST' && path === '/campaigns') {
    try {
      const decodedToken = await verifyJWT(event.headers?.Authorization || event.headers?.authorization);
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
      return createResponse(
        error.message.includes('token') ? 401 : 500,
        { message: error.message || 'Failed to create campaign' }
      );
    }
  }

  // List all campaigns
  if (httpMethod === 'GET' && path === '/campaigns') {
    try {
      console.log(`[GET /campaigns] TRYING TO SCAN TABLE NAMED: '${CAMPAIGNS_TABLE_NAME}' (from process.env: '${process.env.CAMPAIGNS_TABLE_NAME}') (Region: '${process.env.AWS_REGION}')`);
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
      console.error('Error listing campaigns:', error);
      return createResponse(500, { message: 'Failed to list campaigns' });
    }
  }

  // Get single campaign
  if (httpMethod === 'GET' && path.startsWith('/campaigns/') && !path.endsWith('/donations')) {
    try {
      const campaignId = path.split('/')[2];
      
      const result = await ddbDocClient.send(new GetCommand({
        TableName: CAMPAIGNS_TABLE_NAME,
        Key: { id: campaignId }
      }));

      if (!result.Item) {
        return createResponse(404, { message: 'Campaign not found' });
      }

      return createResponse(200, result.Item);

    } catch (error) {
      console.error('Error getting campaign:', error);
      return createResponse(500, { message: 'Failed to get campaign' });
    }
  }

  // Update campaign
  if (httpMethod === 'PUT' && path.startsWith('/campaigns/')) {
    try {
      const decodedToken = await verifyJWT(event.headers?.Authorization || event.headers?.authorization);
      const walletAddress = decodedToken.walletAddress;
      const campaignId = path.split('/')[2];

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
      console.error('Error updating campaign:', error);
      return createResponse(
        error.message.includes('token') ? 401 : 
        error.message.includes('Not authorized') ? 403 : 500,
        { message: error.message || 'Failed to update campaign' }
      );
    }
  }

  // Delete campaign
  if (httpMethod === 'DELETE' && path.startsWith('/campaigns/')) {
    try {
      const decodedToken = await verifyJWT(event.headers?.Authorization || event.headers?.authorization);
      const walletAddress = decodedToken.walletAddress;
      const campaignId = path.split('/')[2];

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
      console.error('Error deleting campaign:', error);
      return createResponse(
        error.message.includes('token') ? 401 : 
        error.message.includes('Not authorized') ? 403 : 500,
        { message: error.message || 'Failed to delete campaign' }
      );
    }
  }

  // Record donation
  if (httpMethod === 'POST' && path.endsWith('/donate')) {
    try {
      const decodedToken = await verifyJWT(event.headers?.Authorization || event.headers?.authorization);
      const walletAddress = decodedToken.walletAddress;
      const campaignId = path.split('/')[2];

      if (!event.body) {
        return createResponse(400, { message: 'Missing request body' });
      }

      const { amount, txHash } = JSON.parse(event.body);

      if (!amount || !txHash) {
        return createResponse(400, { message: 'Amount and transaction hash are required' });
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
        }
      }));

      console.log(`Recorded donation for campaign ${campaignId}: ${amount} WLD`);
      return createResponse(201, { success: true, donationId: donation.id });

    } catch (error) {
      console.error('Error recording donation:', error);
      return createResponse(
        error.message.includes('token') ? 401 : 500,
        { message: error.message || 'Failed to record donation' }
      );
    }
  }

  // Get user's campaigns
  if (httpMethod === 'GET' && path.startsWith('/users/') && path.endsWith('/campaigns')) {
    try {
      const walletAddress = path.split('/')[2];
      
      // Verify the requester is the owner or has a valid token
      let requesterAddress = null;
      try {
        const decodedToken = await verifyJWT(event.headers?.Authorization || event.headers?.authorization);
        requesterAddress = decodedToken.walletAddress;
      } catch (e) {
        // Allow public access to user's campaigns
        console.log('No valid token, allowing public access to campaigns');
      }

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
      console.error('Error getting user campaigns:', error);
      return createResponse(500, { message: 'Failed to get user campaigns' });
    }
  }

  // --- Default Route (Not Found) ---
  console.log(`Unhandled path: ${httpMethod} ${path}`);
  return createResponse(404, { message: `Not Found: ${httpMethod} ${path}` });
};