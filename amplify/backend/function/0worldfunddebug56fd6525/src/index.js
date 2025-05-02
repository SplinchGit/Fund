// amplify/backend/function/Oworldfunddebug56fd6525/src/index.js

const crypto = require('crypto');
// Ensure 'siwe' v2+ and 'ethers' v5/v6 are installed
const { SiweMessage } = require('siwe');
const { ethers } = require('ethers'); // Ethers for SIWE verification
const jwt = require('jsonwebtoken');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
// *** Import AWS SDK v3 DynamoDB Clients ***
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
// Use node-fetch if Node.js version < 18, otherwise native fetch can be used
const fetch = require('node-fetch'); // Ensure 'node-fetch' is in package.json or Lambda layer

// --- Configuration ---
const JWT_EXPIRY = '1d';
const WORLD_ID_APP_ID = process.env.VITE_WORLD_APP_ID || process.env.WORLD_APP_ID;
// *** Fixed: Use || for default value assignment ***
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'https://main.d2fvyjulmwt6nl.amplifyapp.com';
const JWT_SECRET_ARN = process.env.JWT_SECRET_ARN;
// *** Fixed: Use || for default value assignment ***
const WORLD_ID_ACTION_ID = process.env.VITE_WORLD_ACTION_ID || 'verify-user';
const RPC_URL = process.env.RPC_URL; // e.g., 'https://mainnet.optimism.io'
// *** Add DynamoDB Table Name environment variable ***
const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

// --- AWS SDK Clients ---
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

// *** Initialize DynamoDB Document Client (SDK v3) ***
const dynamodbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(dynamodbClient);

// --- Global variable to cache the JWT secret ---
let cachedJwtSecret = null;

// --- Helper Functions ---

// Fetches the JWT secret from AWS Secrets Manager (with caching)
const getJwtSecret = async () => {
  if (cachedJwtSecret) {
    console.log("Using cached JWT secret.");
    return cachedJwtSecret;
  }
  if (!JWT_SECRET_ARN) {
    console.error("JWT_SECRET_ARN environment variable is not set.");
    throw new Error("Server configuration error: JWT secret ARN missing.");
  }
  try {
    console.log("Fetching JWT secret from Secrets Manager using ARN:", JWT_SECRET_ARN);
    const command = new GetSecretValueCommand({ SecretId: JWT_SECRET_ARN });
    const data = await secretsClient.send(command);

    if (data.SecretString) {
      let secretValue = null;
      try {
        const secretObject = JSON.parse(data.SecretString);
        if (secretObject && typeof secretObject === 'object' && 'jwtSecret' in secretObject) {
          secretValue = secretObject.jwtSecret;
          console.log("Successfully parsed secret from JSON object key 'jwtSecret'.");
        } else {
          console.warn("Secret parsed as JSON but missing 'jwtSecret' key. Treating raw string as secret.");
          secretValue = data.SecretString;
        }
      } catch (parseError) {
        console.log("Failed to parse secret as JSON, assuming plain text value.");
        secretValue = data.SecretString;
      }

      // *** Fixed: Use || and corrected logic checks ***
      if (!secretValue || typeof secretValue !== 'string' || secretValue.trim() === '') {
        console.error("Extracted secret value is empty or not a string. Value:", secretValue);
        throw new Error("Could not extract a valid secret value from Secrets Manager.");
      }

      cachedJwtSecret = secretValue;
      console.log("JWT secret fetched and cached successfully.");
      return cachedJwtSecret;

    } else if (data.SecretBinary) {
      console.error("JWT Secret is stored as binary, expected string.");
      throw new Error("Server configuration error: Invalid JWT secret format.");
    } else {
      throw new Error("Secret value not found in Secrets Manager response.");
    }
  } catch (error) {
    console.error("Failed to fetch/process JWT secret from Secrets Manager:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Server configuration error: Could not retrieve JWT secret. Details: ${errorMessage}`);
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
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
};

// --- Main Handler ---
exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // *** Check essential configuration early ***
  if (!DYNAMODB_TABLE_NAME) {
    console.error("DYNAMODB_TABLE_NAME environment variable is not set.");
    return createResponse(500, { message: "Server configuration error: Missing Database Table Name." });
  }

  const httpMethod = event.httpMethod;
  const path = event.requestContext?.http?.path || event.path; // API Gateway v2 vs v1
  console.log(`Handling request: ${httpMethod} ${path}`);

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
    let provider;

    try {
      console.log('Received signature verification request');
      jwtSecret = await getJwtSecret(); // Fetch/cache the secret

      // Instantiate ethers Provider
      if (!RPC_URL) {
        console.error("RPC_URL environment variable is not set.");
        throw new Error("Server configuration error: RPC URL missing.");
      }
      provider = new ethers.JsonRpcProvider(RPC_URL);
      console.log(`Using RPC provider at: ${RPC_URL}`);

      if (!event.body) { return createResponse(400, { message: 'Missing request body' }); }
      console.log('Raw request body:', event.body);
      const { payload, nonce: receivedNonce } = JSON.parse(event.body);
      console.log('Parsed payload:', payload);
      console.log('Received nonce:', receivedNonce);

      // *** Fixed: Use || and ! checks ***
      if (!payload || typeof payload !== 'object' || !payload.message || !payload.signature || !receivedNonce) {
        console.error('Invalid request body structure:', { payload, receivedNonce });
        return createResponse(400, { message: 'Invalid request body. Required fields: payload (with message and signature), nonce.' });
      }

      console.log('Verifying SIWE message...');
      const siweMessage = new SiweMessage(payload.message);

      const verificationResult = await siweMessage.verify({
        signature: payload.signature,
        nonce: receivedNonce,
      }, {
        provider: provider,
        suppressExceptions: true
      }).catch(verifyError => {
        console.error('Unexpected error during siweMessage.verify call:', verifyError);
        return { success: false, error: verifyError };
      });

      if (!verificationResult.success) {
        // *** Fixed: Use || for default value assignment ***
        const errorType = verificationResult.error?.type || 'Unknown';
        const errorMessage = verificationResult.error instanceof Error ? verificationResult.error.message : String(verificationResult.error);
        console.error(`SIWE verification failed. Type: ${errorType}, Message: ${errorMessage}`);
        return createResponse(401, { message: `Signature verification failed: ${errorType}` });
      }

      if (verificationResult.data.nonce !== receivedNonce) {
        console.error(`Nonce mismatch after successful verification (unexpected). Expected: ${receivedNonce}, Got: ${verificationResult.data.nonce}`);
        return createResponse(401, { message: 'Nonce mismatch.' });
      }

      const walletAddress = verificationResult.data.address;
      console.log('SIWE verification successful for address:', walletAddress);

      // --- *** Find or Create User in DynamoDB (Upsert) *** ---
      try {
          const now = new Date().toISOString();
          const userItem = {
              walletAddress: walletAddress, // Use walletAddress as the primary key
              userId: walletAddress,        // Can be the same or a different generated ID if needed
              createdAt: now,
              lastLoginAt: now,
              isWorldIdVerified: false, // Default value
              worldIdNullifier: null   // Default value
              // Add other user attributes as needed
          };

          // Using PutCommand acts as an upsert (create or replace)
          // We only update lastLoginAt if the user exists, PutCommand simplifies this
          // If you need to conditionally create only, use Get + Put or ConditionExpression
          const putParams = {
              TableName: DYNAMODB_TABLE_NAME,
              Item: userItem,
              // Update only lastLoginAt if exists? More complex, use UpdateCommand instead
              // For simplicity, this Put will overwrite createdAt but ensure lastLoginAt is updated
              // A better approach might be Get->Update or Get->Put if preserving createdAt is crucial
          };
          console.log(`Upserting user data for ${walletAddress} in table ${DYNAMODB_TABLE_NAME}`);
          await ddbDocClient.send(new PutCommand(putParams));
          console.log(`Successfully upserted user data for ${walletAddress}`);
      } catch (dbError) {
          console.error(`DynamoDB Error: Failed to find/create user ${walletAddress}:`, dbError);
          // Depending on requirements, you might want to fail the login or just log the error
          // For now, log and continue to issue token, but this might need adjustment
          // throw new Error("Database operation failed during login."); // Uncomment to block login on DB error
      }
      // --- *** End DynamoDB User Upsert *** ---

      // Use walletAddress directly in the token payload for consistency
      const tokenPayload = { sub: walletAddress, walletAddress: walletAddress };
      if (!jwtSecret) { throw new Error("JWT Secret is unavailable for signing."); }
      const sessionToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: JWT_EXPIRY });
      console.log('Session token generated.');

      return createResponse(200, { token: sessionToken, walletAddress: walletAddress });

    } catch (error) {
      console.error('Error in /auth/verify-signature handler:', error);
      const message = (error instanceof SyntaxError) ? 'Invalid JSON in request body'
                      : (error instanceof Error ? error.message
                      : 'Internal server error during signature verification');
      let statusCode = 500;
      if (error instanceof SyntaxError) {
        statusCode = 400;
      } else if (error?.message?.includes('Nonce mismatch')) {
        statusCode = 401;
      // *** Fixed: Use || check ***
      } else if (error?.message?.includes('JWT secret') || error?.message?.includes('RPC URL')) {
        statusCode = 500;
      } else if (error?.message?.includes('Database operation failed')) {
          statusCode = 500; // Or potentially 503 Service Unavailable
      }

      if (error instanceof Error && statusCode === 500) { console.error(`Error Type: ${error.name}`); }
      return createResponse(statusCode, { message });
    }
  }

  // --- Route: POST /verify-worldid ---
  if (httpMethod === 'POST' && path === '/verify-worldid') {
    let jwtSecret;
    try {
      console.log('Received World ID verification request');
      jwtSecret = await getJwtSecret();

      // --- Verify Session Token ---
      // *** Fixed: Use || check ***
      const authHeader = event.headers?.Authorization || event.headers?.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) { return createResponse(401, { message: 'Missing or invalid Authorization header' }); }
      const token = authHeader.split(' ')[1];
      let decodedToken;
      try {
        if (!jwtSecret) { throw new Error("JWT Secret is unavailable for verification."); }
        decodedToken = jwt.verify(token, jwtSecret);
        // Ensure walletAddress exists in the token
        if (!decodedToken || !decodedToken.walletAddress) {
             throw new Error("Invalid token payload: walletAddress missing.");
        }
        console.log('Session token verified for wallet:', decodedToken.walletAddress);
      } catch (jwtError) {
        console.error('Session token verification failed:', jwtError);
        return createResponse(401, { message: `Invalid or expired session token: ${jwtError.message}` });
      }
      // --- End Verify Session Token ---

      // Extract user's wallet address from the verified token
      const userWalletAddress = decodedToken.walletAddress;

      if (!event.body) { return createResponse(400, { message: 'Missing request body' }); }
      console.log('Raw World ID proof body:', event.body);
      const proofDetails = JSON.parse(event.body);
      if (!proofDetails.merkle_root || !proofDetails.nullifier_hash || !proofDetails.proof || !proofDetails.verification_level) {
        console.error('Invalid World ID proof body structure:', proofDetails);
        return createResponse(400, { message: 'Invalid request body. Missing required World ID proof fields.' });
      }
      if (!WORLD_ID_APP_ID) {
        console.error("Missing WORLD_ID_APP_ID environment variable for verification");
        return createResponse(500, { message: "Server configuration error - missing World ID App ID" });
      }

      console.log('Verifying World ID proof with Cloud Service...');
      const verifyUrl = `https://developer.worldcoin.org/api/v1/verify/${WORLD_ID_APP_ID}`;
      const verificationApiPayload = {
        merkle_root: proofDetails.merkle_root,
        nullifier_hash: proofDetails.nullifier_hash,
        proof: proofDetails.proof,
          // *** Fixed: Use || for default value assignment ***
        action: WORLD_ID_ACTION_ID || proofDetails.action, // Use configured action ID primarily
          // *** Fixed: Use || for default value assignment ***
        signal: proofDetails.signal || '', // Pass signal if provided by frontend
      };
      console.log('Sending payload to World ID verify API:', verificationApiPayload);

      const verificationResponse = await fetch(verifyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(verificationApiPayload) });
      const verifyResult = await verificationResponse.json();
      console.log('World ID verify API response:', { status: verificationResponse.status, body: verifyResult });

      if (!verificationResponse.ok || !verifyResult.success) {
        console.error('World ID Cloud Verification failed:', verifyResult);
        // *** Fixed: Use || for default error message parts ***
        return createResponse(400, { message: `World ID verification failed: ${verifyResult.detail || verifyResult.code || 'Unknown reason'}`, details: verifyResult });
      }
      const receivedNullifierHash = verifyResult.nullifier_hash; // Store the verified nullifier
      console.log('World ID Cloud Verification successful for nullifier:', receivedNullifierHash);

      // --- *** Update User in DynamoDB *** ---
      try {
          const updateParams = {
              TableName: DYNAMODB_TABLE_NAME,
              Key: {
                  walletAddress: userWalletAddress // Key to find the user item
              },
              UpdateExpression: "SET #isVerified = :verifiedValue, #nullifier = :nullifierValue, #verifiedAt = :verifiedAtValue",
              ExpressionAttributeNames: {
                  "#isVerified": "isWorldIdVerified",
                  "#nullifier": "worldIdNullifier",
                  "#verifiedAt": "worldIdVerifiedAt" // Add timestamp for verification
              },
              ExpressionAttributeValues: {
                  ":verifiedValue": true, // Set verification status to true
                  ":nullifierValue": receivedNullifierHash, // Store the verified nullifier hash
                  ":verifiedAtValue": new Date().toISOString() // Store verification timestamp
              },
              ConditionExpression: "attribute_exists(walletAddress)" // Optional: Ensure the user actually exists before updating
          };
          console.log(`Updating user ${userWalletAddress} in table ${DYNAMODB_TABLE_NAME} with World ID status`);
          await ddbDocClient.send(new UpdateCommand(updateParams));
          console.log(`Successfully updated user ${userWalletAddress} with World ID verification status.`);
      } catch (dbError) {
          // Handle potential errors, e.g., ConditionCheckFailed if user doesn't exist
          if (dbError.name === 'ConditionalCheckFailedException') {
              console.error(`DynamoDB Error: User with wallet address ${userWalletAddress} not found for update.`);
              return createResponse(404, { message: "User not found for World ID verification update." });
          } else {
              console.error(`DynamoDB Error: Failed to update user ${userWalletAddress}:`, dbError);
              // Decide if this is a fatal error for the request
              return createResponse(500, { message: "Database operation failed during World ID status update." });
          }
      }
      // --- *** End Update User in DynamoDB ---

      return createResponse(200, { success: true, nullifierHash: receivedNullifierHash }); // Return the nullifier hash

    } catch (error) {
      console.error('Error verifying World ID proof:', error);
      const message = (error instanceof SyntaxError) ? 'Invalid JSON in request body'
                      : (error instanceof jwt.JsonWebTokenError || error.message?.includes('token')) ? 'Invalid or malformed session token' // More specific JWT errors
                      : (error instanceof jwt.TokenExpiredError) ? 'Session token has expired'
                      : (error instanceof Error ? error.message
                      : 'Internal server error during World ID verification');
      let statusCode = 500;
      if (error instanceof SyntaxError) {
          statusCode = 400;
      } else if (error instanceof jwt.JsonWebTokenError || error.message?.includes('Invalid token') || error.message?.includes('walletAddress missing')) {
          statusCode = 401; // Unauthorized
      } else if (error instanceof jwt.TokenExpiredError) {
          statusCode = 401; // Unauthorized
      } else if (error?.message?.includes('JWT secret')) {
          statusCode = 500; // Configuration error
      } else if (error?.message?.includes('Database operation failed')) {
          statusCode = 500; // DB Error
      } else if (error?.message?.includes('User not found')) {
          statusCode = 404; // Specific DB condition failure
      }

      if (error instanceof Error && statusCode === 500) { console.error(`Error Type: ${error.name}`); }
      return createResponse(statusCode, { message });
    }
  }

  // --- Default Route (Not Found) ---
  console.log(`Unhandled path: ${httpMethod} ${path}`);
  return createResponse(404, { message: `Not Found: ${httpMethod} ${path}` });
};