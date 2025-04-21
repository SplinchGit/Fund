/* Amplify Params - DO NOT EDIT
  ENV
  REGION
Amplify Params - DO NOT EDIT */

// --- Necessary Requires ---
const { DynamoDBClient, ScanCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const bcrypt = require("bcrypt"); // REQUIRE BCRYPT! Action needed below.
const { v4: uuidv4 } = require("uuid"); // Use v4 for IDs

// --- Initialize AWS Clients ---
const db = new DynamoDBClient({});
const secretsClient = new SecretsManagerClient({});

// --- Get configuration from Environment Variables ---
// IMPORTANT: Ensure these are set for THIS Lambda function in Amplify settings
const CAMPAIGN_TABLE_NAME = process.env.CAMPAIGN_TABLE_NAME; // e.g., 'Campaigns-dev'
const USER_TABLE_NAME = process.env.USER_TABLE_NAME;         // e.g., 'Users-dev'
const SECRET_ID_FOR_API_KEY = process.env.SECRET_API_KEY_NAME; // e.g., 'APP_API'
const BCRYPT_SALT_ROUNDS = 10; // Standard value for hashing rounds

// --- Main Lambda Handler ---
exports.handler = async (event) => {
  // Determine path and method (Assuming standard proxy integration uses event.path for REST API)
  // Verify this path property if routing doesn't work as expected! Check CloudWatch logs for the 'event' object.
  const path = event.path;
  const httpMethod = event.httpMethod;

  // Define CORS Headers (IMPORTANT: Restrict origin in production!)
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*", // CHANGE to your frontend domain for production!
    "Access-Control-Allow-Headers": "Content-Type,Authorization", // Add others if needed (e.g., x-api-key)
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET" // Add other methods if needed
  };

  // Pre-flight check for OPTIONS method (for CORS)
  if (httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS OK' }) };
  }

  try {
    // --- ROUTE: POST /createCampaign ---
    if (path === '/createCampaign' && httpMethod === 'POST') {
      console.log("Handling POST /createCampaign");
      const payload = JSON.parse(event.body || "{}"); // Your CampaignPayload from frontend

      // Basic Payload Validation
      if (!payload.title || !payload.goal || !payload.ownerId) {
           throw new Error("Missing required campaign fields: title, goal, ownerId.");
           // Note: Returning specific 400 error moved to main catch block for consistency
      }

      // 1. Fetch the secret from Secrets Manager
      if (!SECRET_ID_FOR_API_KEY) {
        throw new Error("Secret name environment variable (SECRET_API_KEY_NAME) is not configured for the function");
      }
      const secretOutput = await secretsClient.send(
        new GetSecretValueCommand({ SecretId: SECRET_ID_FOR_API_KEY })
      );
      if (!secretOutput || !secretOutput.SecretString) {
        throw new Error("Could not retrieve secret value from Secrets Manager");
      }

      // 2. Parse the secret value (Using the key you confirmed: NEXT_PUBLIC_WORLD_APP_API)
      let actualSecretValue; // This will hold the "app_0da..." string
      try {
          const secretJson = JSON.parse(secretOutput.SecretString);
          actualSecretValue = secretJson.NEXT_PUBLIC_WORLD_APP_API;
          if (actualSecretValue === undefined) {
              throw new Error("Key ('NEXT_PUBLIC_WORLD_APP_API') not found in secret JSON stored in Secrets Manager");
          }
          console.log("Successfully parsed secret JSON.");
      } catch (parseError) {
          throw new Error(`Failed to parse secret value as JSON or find key 'NEXT_PUBLIC_WORLD_APP_API'. Check format in Secrets Manager. Error: ${parseError.message}`);
      }

      // --- Start replacing the '!!! YOUR SPECIFIC LOGIC HERE !!!' placeholder ---

      // 3. Implement Campaign Creation: Save to DynamoDB
      console.log("Saving campaign data to DynamoDB...");
      const campaignId = uuidv4(); // Generate a unique ID using uuidv4 required earlier
      const createdAt = new Date().toISOString();
      const campaignTableName = process.env.CAMPAIGN_TABLE_NAME; // Read table name from Lambda Env Var

      // Check if the environment variable for the table name is set
      if (!campaignTableName) {
          console.error("CAMPAIGN_TABLE_NAME environment variable not set!");
          throw new Error("Server configuration error: Campaign table name missing.");
      }

      // Prepare the item with data from frontend payload + generated data + secret
      const campaignItem = {
          id: { S: campaignId },                     // Partition key
          createdAt: { S: createdAt },               // Sort key or attribute
          ownerId: { S: payload.ownerId },           // Assign to user
          title: { S: payload.title },
          goal: { N: String(payload.goal || 0) },    // Store numbers as strings for DynamoDB 'N' type
          description: { S: payload.description || "" },
          image: { S: payload.image || "" },
          verified: { BOOL: payload.verified || false },
          status: { S: payload.status || "active" },   // Default status
          currentAmount: { N: "0" },                 // Initialize donation amount
          worldAppId: { S: actualSecretValue }     // Store the Worldcoin App ID ("app_0da...") fetched from secret
      };

      // Make sure PutItemCommand is required at the top of the file
      // const { DynamoDBClient, ScanCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");
      const { PutItemCommand } = require("@aws-sdk/client-dynamodb"); // Ensure this line is present if PutItemCommand wasn't already required

      // Use the 'db' client initialized earlier to save the item
      await db.send(new PutItemCommand({
          TableName: campaignTableName,
          Item: campaignItem,
          ConditionExpression: "attribute_not_exists(id)" // Prevent overwriting
      }));

      console.log(`Successfully saved campaign ${campaignId} owned by ${payload.ownerId} to table ${campaignTableName}`);
      // --- End of campaign creation logic (saving to DB) ---

      // 4. Return success response using the generated ID/timestamp
      const responseBody = { success: true, id: campaignId, createdAt: createdAt };
      return { statusCode: 200, headers, body: JSON.stringify(responseBody) };
    }

    // --- ROUTE: POST /login --- (Assuming '/login' path from API Gateway)
    else if (path === '/login' && httpMethod === 'POST') {
      console.log("Handling POST /login");
      const { username, password } = JSON.parse(event.body || "{}");
      if (!username || !password) {
         // Returning 400 Bad Request
         return { statusCode: 400, headers, body: JSON.stringify({ message: "Missing credentials" }) };
      }
      if (!USER_TABLE_NAME) {
          throw new Error("User table name environment variable (USER_TABLE_NAME) is not configured.");
      }

      // Find user by username (assuming username is stored in 'owner' attribute)
      // Consider changing to GetItem by primary key (nullifierHash?) if possible for efficiency
      const scanParams = {
          TableName: USER_TABLE_NAME,
          FilterExpression: "#o = :u",
          ExpressionAttributeNames: { "#o": "owner" }, // CHANGE 'owner' if username stored differently
          ExpressionAttributeValues: { ":u": { S: username } }
      };
      const { Items } = await db.send(new ScanCommand(scanParams));

      if (!Items || Items.length === 0) {
        // Returning 401 Unauthorized
        return { statusCode: 401, headers, body: JSON.stringify({ message: "Invalid user or password" }) };
      }
      if (Items.length > 1) {
          // This shouldn't happen if username/owner is unique, but good to log
          console.warn(`Multiple users found for username: ${username}`);
      }
      const user = Items[0];

      // Securely compare password hash
      // *** ASSUMES HASH IS STORED IN 'passwordHash' ATTRIBUTE (String 'S') IN DYNAMODB ***
      const storedHash = user.passwordHash?.S; // <-- ADJUST 'passwordHash' if needed!
      if (!storedHash) {
          console.error(`User ${username} found but missing passwordHash attribute in DynamoDB.`);
          throw new Error("Server configuration error during login."); // Throw internal error
      }

      let isPasswordCorrect = false;
      try {
          isPasswordCorrect = await bcrypt.compare(password, storedHash);
      } catch (compareError) {
          console.error(`Bcrypt comparison error for user ${username}:`, compareError);
          throw new Error("Error during authentication comparison."); // Throw internal error
      }

      if (!isPasswordCorrect) {
        // Returning 401 Unauthorized
        return { statusCode: 401, headers, body: JSON.stringify({ message: "Invalid user or password" }) };
      }

      // Login successful - return token or user info
      console.log(`User ${username} logged in successfully.`);
      // Consider returning more useful info or a proper JWT instead of just uuid
      return { statusCode: 200, headers, body: JSON.stringify({ token: uuidv4(), message: "Login successful" }) };
    }

    // --- Default / Not Found Route ---
    else {
      console.log(`Unhandled route: ${httpMethod} ${path}`);
      // Returning 404 Not Found
      return { statusCode: 404, headers, body: JSON.stringify({ message: "Not Found" }) };
    }

  } catch (err) {
    console.error("Handler Error:", err);
    // Returning 500 Internal Server Error
    // Avoid leaking raw error details in production response body if possible
    const errorMessage = err.message || "Internal server error";
    return {
      statusCode: 500,
      headers, // Include CORS headers for errors too
      body: JSON.stringify({ message: "An internal server error occurred.", errorHint: errorMessage }) // Provide hint carefully
    };
  }
};