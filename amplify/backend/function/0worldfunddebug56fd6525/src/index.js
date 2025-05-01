// amplify/backend/function/Oworldfunddebug56fd6525/src/index.js

const crypto = require('crypto');
const { SiweMessage } = require('siwe');
const jwt = require('jsonwebtoken');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

// --- Configuration ---
const JWT_EXPIRY = '1d'; 
const WORLD_ID_APP_ID = process.env.VITE_WORLD_APP_ID || process.env.WORLD_APP_ID; 
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'https://main.d2fvyjulmwt6nl.amplifyapp.com';
const JWT_SECRET_ARN = process.env.JWT_SECRET_ARN; 
const WORLD_ID_ACTION_ID = process.env.VITE_WORLD_ACTION_ID || 'verify-user'; 

// --- AWS SDK Clients ---
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });
// --- DynamoDB Placeholders ---
// ...

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
      let secretValue;
      try {
        // *** Attempt to parse as JSON first ***
        const secretObject = JSON.parse(data.SecretString);
        // *** Check if the specific key exists ***
        if (secretObject && typeof secretObject === 'object' && 'jwtSecret' in secretObject) {
           secretValue = secretObject.jwtSecret; 
           console.log("Successfully parsed secret from JSON object key 'jwtSecret'.");
        } else {
           // It's valid JSON, but doesn't have the expected key. 
           // Assume the whole string is the secret.
           console.log("Secret is valid JSON but missing 'jwtSecret' key. Assuming plain text.");
           secretValue = data.SecretString;
        }
      } catch (parseError) {
         // *** If JSON parsing fails, assume it's plain text ***
         console.log("Failed to parse secret as JSON, assuming plain text value.");
         secretValue = data.SecretString;
      }

      // Check if we actually got a non-empty string
      if (!secretValue || typeof secretValue !== 'string' || secretValue.trim() === '') {
           console.error("Extracted secret value is empty or not a string.");
           throw new Error("Could not extract a valid secret value.");
      }
      
      cachedJwtSecret = secretValue; // Cache the extracted secret
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
    // Add more details if available
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Throw a specific error that will be caught by the handler
    throw new Error(`Server configuration error: Could not retrieve JWT secret. Details: ${errorMessage}`); 
  }
};

// Generates a secure random nonce
const generateNonce = () => {
  // ... (no changes needed) ...
  return crypto.randomBytes(16).toString('hex');
};

// Creates a standard API Gateway response with CORS headers
const createResponse = (statusCode, body, origin = ALLOWED_ORIGIN) => {
  // ... (no changes needed) ...
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
  // ... (routing logic remains the same) ...
  console.log('Received event:', JSON.stringify(event, null, 2));

  const httpMethod = event.httpMethod;
  const path = event.requestContext?.http?.path || event.path; 
  console.log(`Handling request: ${httpMethod} ${path}`);

  if (httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return createResponse(200, {}); 
  }

  // --- Route: GET /auth/nonce ---
  if (httpMethod === 'GET' && path === '/auth/nonce') {
    // ... (no changes needed) ...
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
      // *** Call the updated getJwtSecret ***
      jwtSecret = await getJwtSecret(); 

      // ... (rest of the signature verification logic remains the same) ...
      if (!event.body) {
        return createResponse(400, { message: 'Missing request body' });
      }
      console.log('Raw request body:', event.body); 
      const { payload, nonce: receivedNonce } = JSON.parse(event.body);
      console.log('Parsed payload:', payload);
      console.log('Received nonce:', receivedNonce);

      if (!payload || typeof payload !== 'object' || !payload.message || !payload.signature || !receivedNonce) {
        console.error('Invalid request body structure:', { payload, receivedNonce });
        return createResponse(400, { message: 'Invalid request body. Required fields: payload (with message and signature), nonce.' });
      }

      console.log('Verifying SIWE message...');
      const siweMessage = new SiweMessage(payload.message);
      const verificationResult = await siweMessage.verify({
        signature: payload.signature,
        nonce: receivedNonce,
      }).catch(verifyError => {
          console.error('Error during siweMessage.verify:', verifyError);
          return { success: false, error: verifyError }; 
      });

      if (!verificationResult.success) {
        const errorDetail = verificationResult.error instanceof Error ? verificationResult.error.message : String(verificationResult.error);
        console.error('SIWE verification failed:', errorDetail);
        return createResponse(401, { message: `Signature verification failed: ${errorDetail}` });
      }
      if (verificationResult.data.nonce !== receivedNonce) {
         console.error(`Nonce mismatch during verification. Expected: ${receivedNonce}, Got: ${verificationResult.data.nonce}`);
         return createResponse(401, { message: 'Nonce mismatch.' });
      }

      const walletAddress = verificationResult.data.address;
      console.log('SIWE verification successful for address:', walletAddress);

      // --- Placeholder: Find or Create User in DynamoDB ---
      console.log(`Placeholder: Find/Create user for wallet: ${walletAddress} in DB`);
      const userIdFromDb = `user_${walletAddress.substring(0, 8)}`; 
      // --- End Placeholder ---

      const tokenPayload = { sub: userIdFromDb, walletAddress: walletAddress };
      const sessionToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: JWT_EXPIRY });
      console.log('Session token generated.');

      return createResponse(200, { token: sessionToken, walletAddress: walletAddress });

    } catch (error) {
      // *** Updated Error Catching ***
      console.error('Error verifying wallet signature:', error);
      const message = (error instanceof SyntaxError)
          ? 'Invalid JSON in request body'
          // Use the specific error message if available
          : (error instanceof Error ? error.message : 'Internal server error during signature verification'); 
      // Determine status code based on error type
      const statusCode = (error instanceof SyntaxError || error?.message?.includes('Nonce mismatch')) ? 400 
                       : (error?.message?.includes('JWT secret')) ? 500 // Configuration error
                       : 500; // Default to 500
      if (error instanceof Error && statusCode === 500) {
         console.error(`Error Type: ${error.name}`);
      }
      return createResponse(statusCode, { message });
    }
  }

  // --- Route: POST /verify-worldid ---
  if (httpMethod === 'POST' && path === '/verify-worldid') {
    // ... (logic remains mostly the same, just ensure getJwtSecret is called) ...
    let jwtSecret;
    try {
        console.log('Received World ID verification request');
        jwtSecret = await getJwtSecret(); // Fetch/cache the secret

        // ... (rest of the verification logic) ...
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
            action: WORLD_ID_ACTION_ID || proofDetails.action, 
            signal: proofDetails.signal || '', 
        };
        console.log('Sending payload to World ID verify API:', verificationApiPayload);
        const verificationResponse = await fetch(verifyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(verificationApiPayload) });
        const verifyResult = await verificationResponse.json();
        console.log('World ID verify API response:', { status: verificationResponse.status, body: verifyResult });
        if (!verificationResponse.ok || !verifyResult.success) {
            console.error('World ID Cloud Verification failed:', verifyResult);
            return createResponse(400, { message: `World ID verification failed: ${verifyResult.detail || verifyResult.code || 'Unknown reason'}`, details: verifyResult });
        }
        console.log('World ID Cloud Verification successful for nullifier:', verifyResult.nullifier_hash);

        // --- Placeholder: Update User in DynamoDB ---
        const userWalletAddress = decodedToken.walletAddress; 
        console.log(`Placeholder: Update user ${userWalletAddress} in DB with verified status and nullifier ${verifyResult.nullifier_hash}`);
        // --- End Placeholder ---

        return createResponse(200, { success: true, nullifierHash: verifyResult.nullifier_hash });

    } catch (error) {
        console.error('Error verifying World ID proof:', error);
        const message = (error instanceof SyntaxError) ? 'Invalid JSON in request body' : (error.message || 'Internal server error during World ID verification');
        const statusCode = (error instanceof SyntaxError) ? 400 : (error?.message?.includes('JWT secret')) ? 500 : 500;
         if (error instanceof Error && statusCode === 500) { console.error(`Error Type: ${error.name}`); }
        return createResponse(statusCode, { message });
    }
  }

  // --- Default Route (Not Found) ---
  console.log(`Unhandled path: ${httpMethod} ${path}`);
  return createResponse(404, { message: `Not Found: ${httpMethod} ${path}` });
};

// --- Placeholder DB Functions ---
// ... 
