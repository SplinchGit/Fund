/* Amplify Params - DO NOT EDIT
  ENV
  REGION
Amplify Params - DO NOT EDIT */

// --- Necessary Requires ---
const { DynamoDBClient, ScanCommand, PutCommand } = require("@aws-sdk/client-dynamodb");
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const argon2 = require("argon2");
const { v4: uuidv4 } = require("uuid");

// --- Initialize AWS Clients ---
const db = new DynamoDBClient({});
const secretsClient = new SecretsManagerClient({});

// --- Get configuration from Environment Variables ---
const TABLE_NAME = process.env.USER_TABLE_NAME;
const SECRET_ID_FOR_API_KEY = process.env.SECRET_API_KEY_NAME; // Should be "APP_API" in Amplify

// --- Main Lambda Handler ---
exports.handler = async (event) => {
  const path = event.path;
  const httpMethod = event.httpMethod;

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
  };

  if (httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: JSON.stringify({ message: "CORS OK" }) };
  }

  try {
    if (path === "/createCampaign" && httpMethod === "POST") {
      console.log("Handling POST /createCampaign");
      const payload = JSON.parse(event.body || "{}");

      // 1. Fetch secret from Secrets Manager
      if (!SECRET_ID_FOR_API_KEY) {
        throw new Error("SECRET_API_KEY_NAME env var not configured");
      }
      const secretOutput = await secretsClient.send(
        new GetSecretValueCommand({ SecretId: SECRET_ID_FOR_API_KEY })
      );
      if (!secretOutput.SecretString) {
        throw new Error("Empty secret value returned");
      }

      // 2. Parse the actual Worldcoin App ID key
      let actualSecretValue;
      try {
        actualSecretValue = JSON.parse(secretOutput.SecretString).NEXT_PUBLIC_WORLD_APP_API;
        if (actualSecretValue === undefined) {
          throw new Error("Key 'NEXT_PUBLIC_WORLD_APP_API' not found");
        }
      } catch (parseError) {
        throw new Error(
          `Failed to parse secret JSON or missing key: ${parseError.message}`
        );
      }
      console.log("Successfully parsed secret.");

      // 3. Save campaign to DynamoDB
      console.log("Saving campaign data to DynamoDB...");
      const campaignId = uuidv4();
      const createdAt = new Date().toISOString();
      const campaignTableName = process.env.CAMPAIGN_TABLE_NAME;
      if (!campaignTableName) {
        throw new Error("CAMPAIGN_TABLE_NAME env var not set");
      }

      const campaignItem = {
        id: { S: campaignId },
        createdAt: { S: createdAt },
        ownerId: { S: payload.ownerId },
        title: { S: payload.title },
        goal: { N: String(payload.goal || 0) },
        description: { S: payload.description || "" },
        image: { S: payload.image || "" },
        verified: { BOOL: payload.verified || false },
        status: { S: payload.status || "active" },
        currentAmount: { N: "0" },
        worldAppId: { S: actualSecretValue }
      };

      await db.send(
        new PutCommand({
          TableName: campaignTableName,
          Item: campaignItem,
          ConditionExpression: "attribute_not_exists(id)"
        })
      );

      console.log(
        `Saved campaign ${campaignId} for ${payload.ownerId} in ${campaignTableName}`
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, id: campaignId, createdAt })
      };
    }

    // Add other routes here (e.g., GET /listCampaigns)
    throw new Error(`No handler for path ${path} + method ${httpMethod}`);
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  }
};
