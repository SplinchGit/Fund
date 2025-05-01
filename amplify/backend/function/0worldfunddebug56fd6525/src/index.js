// amplify/backend/function/Oworldfunddebug56fd6525/src/index.js

const crypto = require('crypto');
const { SiweMessage } = require('siwe');
const jwt = require('jsonwebtoken');
// AWS SDK v3 for Secrets Manager
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

// --- Configuration ---
const JWT_EXPIRY = '1d'; // Session tokens expire in 1 day
const WORLD_ID_APP_ID = process.env.VITE_WORLD_APP_ID || process.env.WORLD_APP_ID; // Ensure this is set in Lambda Env
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'https://main.d2fvyjulmwt6nl.amplifyapp.com';
const JWT_SECRET_ARN = process.env.JWT_SECRET_ARN; // ARN of the secret stored in Secrets Manager

// --- AWS SDK Clients (Initialization) ---
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });
// Placeholder for DynamoDB Client (initialize when needed)
// const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
// const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
// const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
// const docClient = DynamoDBDocumentClient.from(dbClient);
// const USER_TABLE = process.env.USER_TABLE_NAME || 'Users-dev';

// --- Global variable to cache the JWT secret ---
let cachedJwtSecret = null;

// --- Helper Functions ---

// Fetches the JWT secret from AWS Secrets Manager (with caching)
const getJwtSecret = async () => {
  if (cachedJwtSecret) {
    return cachedJwtSecret;
  }
  if (!JWT_SECRET_ARN) {
    console.error("JWT_SECRET_ARN environment variable is not set.");
    throw new Error("Server configuration error: JWT secret ARN missing.");
  }
  try {
    console.log("Fetching JWT secret from Secrets Manager...");
    const command = new GetSecretValueCommand({ SecretId: JWT_SECRET_ARN });
    const data = await secretsClient.send(command);
    if (data.SecretString) {
      // Assuming the secret stores a JSON object like {"jwtSecret": "your_actual_secret"}
      // Adjust parsing if you stored the secret differently
      const secretObject = JSON.parse(data.SecretString);
      cachedJwtSecret = secretObject.jwtSecret; // Adjust key name if needed
      if (!cachedJwtSecret) {
         throw new Error("jwtSecret key not found within the stored secret value.");
      }
      console.log("JWT secret fetched and cached successfully.");
      return cachedJwtSecret;
    } else if (data.SecretBinary) {
      // Handle binary secrets if necessary
      console.error("JWT Secret is stored as binary, expected string.");
      throw new Error("Server configuration error: Invalid JWT secret format.");
    } else {
       throw new Error("Secret value not found in Secrets Manager response.");
    }
  } catch (error) {
    console.error("Failed to fetch JWT secret from Secrets Manager:", error);
    throw new Error("Server configuration error: Could not retrieve JWT secret.");
  }
};

// Generates a secure random nonce
const generateNonce = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Creates a standard API Gateway response with CORS headers
const createResponse = (statusCode, body, origin = ALLOWED_ORIGIN) => {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-api-key',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' // Allow necessary methods for CORS
    },
    body: JSON.stringify(body),
  };
};

// --- Main Handler ---

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const httpMethod = event.httpMethod;
  // Adjust path extraction if using a base path mapping in API Gateway
  const path = event.path; 

  // Handle CORS preflight OPTIONS requests globally
  if (httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return createResponse(200, {}); 
  }

  // --- Route: GET /auth/nonce ---
  if (httpMethod === 'GET' && path === '/auth/nonce') {
    try {
      const nonce = generateNonce();
      console.log('Generated nonce:', nonce);
      return createResponse(200, { nonce });
    } catch (error) {
      console.error('Error generating nonce:', error);
      return createResponse(500, { message: 'Failed to generate nonce' });
    }
  }

  // --- Route: POST /auth/verify-signature ---
  if (httpMethod === 'POST' && path === '/auth/verify-signature') {
    let jwtSecret;
    try {
      console.log('Received signature verification request');
      jwtSecret = await getJwtSecret(); // Fetch/cache the secret

      if (!event.body) {
        return createResponse(400, { message: 'Missing request body' });
      }
      const { payload, nonce: receivedNonce } = JSON.parse(event.body);

      if (!payload || typeof payload !== 'object' || !payload.message || !payload.signature || !receivedNonce) {
        return createResponse(400, { message: 'Invalid request body. Required fields: payload (with message and signature), nonce.' });
      }

      console.log('Verifying SIWE message...');
      const siweMessage = new SiweMessage(payload.message);
      const verificationResult = await siweMessage.verify({
        signature: payload.signature,
        nonce: receivedNonce,
      });

      if (!verificationResult.success) {
        console.error('SIWE verification failed:', verificationResult.error);
        return createResponse(401, { message: `Signature verification failed: ${verificationResult.error?.type || 'Unknown reason'}` });
      }
      if (verificationResult.data.nonce !== receivedNonce) {
         console.error('Nonce mismatch during verification.');
         return createResponse(401, { message: 'Nonce mismatch.' });
      }

      const walletAddress = verificationResult.data.address;
      console.log('SIWE verification successful for address:', walletAddress);

      // --- Placeholder: Find or Create User in DynamoDB ---
      console.log(`Placeholder: Find/Create user for wallet: ${walletAddress} in DB`);
      const userIdFromDb = `user_${walletAddress.substring(0, 8)}`; // Replace with actual DB logic
      // --- End Placeholder ---

      // Generate session token (JWT)
      const tokenPayload = { sub: userIdFromDb, walletAddress: walletAddress };
      const sessionToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: JWT_EXPIRY });
      console.log('Session token generated.');

      return createResponse(200, { token: sessionToken, walletAddress: walletAddress });

    } catch (error) {
      console.error('Error verifying wallet signature:', error);
      const message = (error instanceof SyntaxError)
          ? 'Invalid JSON in request body'
          : (error.message || 'Internal server error during signature verification');
      const statusCode = (error instanceof SyntaxError) ? 400 : 500;
      // Include specific error name if available
      if (error instanceof Error && statusCode === 500) {
         console.error(`Error Type: ${error.name}`);
      }
      return createResponse(statusCode, { message });
    }
  }

  // --- Route: POST /verify-worldid ---
  if (httpMethod === 'POST' && path === '/verify-worldid') {
    let jwtSecret;
    try {
        console.log('Received World ID verification request');
        jwtSecret = await getJwtSecret(); // Fetch/cache the secret

        // --- Verify Session Token ---
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return createResponse(401, { message: 'Missing or invalid Authorization header' });
        }
        const token = authHeader.split(' ')[1];
        let decodedToken;
        try {
            decodedToken = jwt.verify(token, jwtSecret);
            console.log('Session token verified for user:', decodedToken.sub);
        } catch (jwtError) {
            console.error('Session token verification failed:', jwtError);
            return createResponse(401, { message: 'Invalid or expired session token' });
        }
        // --- End Verify Session Token ---

        if (!event.body) {
            return createResponse(400, { message: 'Missing request body' });
        }
        const proofDetails = JSON.parse(event.body); 

        if (!proofDetails.merkle_root || !proofDetails.nullifier_hash || !proofDetails.proof || !proofDetails.verification_level) {
            return createResponse(400, { message: 'Invalid request body. Missing required World ID proof fields.' });
        }
        
        if (!WORLD_ID_APP_ID) {
            console.error("Missing WORLD_ID_APP_ID environment variable for verification");
            return createResponse(500, { message: "Server configuration error - missing World ID App ID" });
        }

        console.log('Verifying World ID proof with Cloud Service...');
        const verifyUrl = `https://developer.worldcoin.org/api/v1/verify/${WORLD_ID_APP_ID}`;
        
        const verificationResponse = await fetch(verifyUrl, { // Using built-in fetch (Node 18+)
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                merkle_root: proofDetails.merkle_root,
                nullifier_hash: proofDetails.nullifier_hash,
                proof: proofDetails.proof,
                action: process.env.VITE_WORLD_ACTION_ID || proofDetails.action || 'verify-user', 
                signal: proofDetails.signal || '', 
            }),
        });

        const verifyResult = await verificationResponse.json();

        if (!verificationResponse.ok || !verifyResult.success) {
            console.error('World ID Cloud Verification failed:', verifyResult);
            return createResponse(400, { 
                message: `World ID verification failed: ${verifyResult.detail || verifyResult.code || 'Unknown reason'}`,
                details: verifyResult 
            });
        }

        console.log('World ID Cloud Verification successful for nullifier:', verifyResult.nullifier_hash);

        // --- Placeholder: Update User in DynamoDB ---
        const userWalletAddress = decodedToken.walletAddress; 
        console.log(`Placeholder: Update user ${userWalletAddress} in DB with verified status and nullifier ${verifyResult.nullifier_hash}`);
        // --- End Placeholder ---

        return createResponse(200, { 
            success: true, 
            nullifierHash: verifyResult.nullifier_hash 
        });

    } catch (error) {
        console.error('Error verifying World ID proof:', error);
        const message = (error instanceof SyntaxError) 
            ? 'Invalid JSON in request body' 
            : (error.message || 'Internal server error during World ID verification');
        const statusCode = (error instanceof SyntaxError) ? 400 : 500;
         if (error instanceof Error && statusCode === 500) {
             console.error(`Error Type: ${error.name}`);
         }
        return createResponse(statusCode, { message });
    }
  }

  // --- Default Route (Not Found) ---
  console.log(`Unhandled path: ${httpMethod} ${path}`);
  return createResponse(404, { message: `Not Found: ${httpMethod} ${path}` });
};

// --- Placeholder DB Functions (Implement using AWS SDK v3 for DynamoDB) ---
// ... (findUserByWallet, createUser, updateUserVerificationStatus) ...

