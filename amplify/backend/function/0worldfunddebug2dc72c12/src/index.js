/* Amplify Params - DO NOT EDIT
  ENV
  REGION
Amplify Params - DO NOT EDIT */

// --- Necessary Requires ---
// Make sure PutCommand is included here
const { DynamoDBClient, ScanCommand, PutCommand } = require("@aws-sdk/client-dynamodb");
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const bcrypt = require("bcrypt"); // REQUIRE BCRYPT! (Run: npm install bcrypt)
const { v4: uuidv4 } = require("uuid");

// --- Initialize AWS Clients ---
const db = new DynamoDBClient({});
const secretsClient = new SecretsManagerClient({});

// --- Get configuration from Environment Variables ---
// Ensure these are set for your Lambda function in Amplify settings
const TABLE_NAME = process.env.USER_TABLE_NAME
const SECRET_ID_FOR_API_KEY = process.env.SECRET_API_KEY_NAME; // Should have value "APP_API" from your Amplify settings
const BCRYPT_SALT_ROUNDS = 10; // Typically 10-12

// --- Main Lambda Handler ---
exports.handler = async (event) => {

  // Determine path and method (Assuming standard proxy integration uses event.path)
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
      const payload = JSON.parse(event.body || "{}"); // Your CampaignPayload

      // Optional: Add payload validation here

      // 1. Fetch the secret from Secrets Manager
      if (!SECRET_ID_FOR_API_KEY) {
        throw new Error("Secret name environment variable (SECRET_API_KEY_NAME) is not configured for the function");
      }
      const secretOutput = await secretsClient.send(
        new GetSecretValueCommand({ SecretId: SECRET_ID_FOR_API_KEY }) // Uses the name set in env var (APP_API)
      );
      if (!secretOutput || !secretOutput.SecretString) {
        throw new Error("Could not retrieve secret value from Secrets Manager");
      }

      // 2. Parse the secret value (Using the key from your screenshot image_021495.png)
      let actualSecretValue; // This should hold the "app_0da..." string
      try {
          // *** Use the key YOU confirmed was in the secret JSON ***
          actualSecretValue = JSON.parse(secretOutput.SecretString).NEXT_PUBLIC_WORLD_APP_API; // <-- UPDATED KEY
          if (actualSecretValue === undefined) {
              throw new Error("Key ('NEXT_PUBLIC_WORLD_APP_API') not found in secret JSON stored in Secrets Manager");
          }
          console.log("Successfully parsed secret JSON.");
      } catch (parseError) {
          throw new Error(`Failed to parse secret value as JSON or find key 'NEXT_PUBLIC_WORLD_APP_API'. Check format in Secrets Manager. Error: ${parseError.message}`);
      }

      // --- Start replacing the placeholder here ---

      // 3. --- Implement Campaign Creation: Save to DynamoDB ---
      console.log("Saving campaign data to DynamoDB...");
      const campaignId = uuidv4(); // Generate a unique ID for the new campaign using uuidv4 required earlier
      const createdAt = new Date().toISOString();
      const campaignTableName = process.env.CAMPAIGN_TABLE_NAME; // Read table name from Lambda Env Var

      // Check if the environment variable for the table name is set
      if (!campaignTableName) {
          console.error("CAMPAIGN_TABLE_NAME environment variable not set!");
          throw new Error("Server configuration error: Campaign table name missing.");
      }

      // Prepare the item to be saved in DynamoDB format
      // Ensure these attribute names match what your frontend/app expects later
      const campaignItem = {
          id: { S: campaignId },                     // Partition key (String)
          createdAt: { S: createdAt },               // Sort key or attribute (String)
          ownerId: { S: payload.ownerId },           // From frontend payload (String)
          title: { S: payload.title },               // From frontend payload (String)
          goal: { N: String(payload.goal || 0) },    // From payload (Number, stored as String in DynamoDB)
          description: { S: payload.description || "" }, // From payload (String)
          image: { S: payload.image || "" },           // From payload (String, e.g., image URL)
          verified: { BOOL: payload.verified || false },// From payload (Boolean)
          status: { S: payload.status || "active" },   // Default status (String)
          currentAmount: { N: "0" },                 // Initialize donation amount (Number, stored as String)
          worldAppId: { S: actualSecretValue }     // Store the Worldcoin App ID ("app_0da...") fetched from secret
      };

      // Make sure PutCommand is required at the top of the file:
      // const { DynamoDBClient, ScanCommand, PutCommand } = require("@aws-sdk/client-dynamodb");
      const { PutCommand } = require("@aws-sdk/client-dynamodb"); // Ensure this line is present if PutCommand wasn't already required

      // Save the item using the 'db' client initialized earlier
      await db.send(new PutCommand({
          TableName: campaignTableName,
          Item: campaignItem,
          // ConditionExpression prevents overwriting an item if an ID collision somehow occurs
          ConditionExpression: "attribute_not_exists(id)"
      }));

      console.log(`Successfully saved campaign ${campaignId} owned by ${payload.ownerId} to table ${campaignTableName}`);
      // --- End of campaign creation logic (saving to DB) ---

            // 4. Return success response using the generated ID and timestamp
            const responseBody = { success: true, id: campaignId, createdAt: createdAt };
            // The existing return statement below this block handles sending the response
            return { statusCode: 200, headers, body: JSON.stringify(responseBody) };
          }
        } catch (error) {
          console.error('Error:', error);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal Server Error' })
          };
        }
      };