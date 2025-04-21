/* Amplify Params - DO NOT EDIT
  ENV
  REGION
Amplify Params - DO NOT EDIT */

// --- Necessary Requires ---
const {
  DynamoDBClient,
  ScanCommand,
  PutItemCommand
} = require("@aws-sdk/client-dynamodb");
const {
  SecretsManagerClient,
  GetSecretValueCommand
} = require("@aws-sdk/client-secrets-manager");
const argon2 = require("argon2");
const { v4: uuidv4 } = require("uuid");

// --- Initialize AWS Clients ---
const db = new DynamoDBClient({});
const secretsClient = new SecretsManagerClient({});

// --- Get configuration from Environment Variables ---
const CAMPAIGN_TABLE_NAME = process.env.CAMPAIGN_TABLE_NAME; // e.g., 'Campaigns-dev'
const USER_TABLE_NAME = process.env.USER_TABLE_NAME;         // e.g., 'Users-dev'
const SECRET_ID_FOR_API_KEY = process.env.SECRET_API_KEY_NAME; // e.g., 'APP_API'

// --- Main Lambda Handler ---
exports.handler = async (event) => {
  const path       = event.path;
  const httpMethod = event.httpMethod;

  const headers = {
    "Content-Type":              "application/json",
    "Access-Control-Allow-Origin":"*",
    "Access-Control-Allow-Headers":"Content-Type,Authorization",
    "Access-Control-Allow-Methods":"OPTIONS,POST,GET"
  };

  if (httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "CORS OK" })
    };
  }

  try {
    // ─── POST /createCampaign ─────────────────────────────────────────
    if (path === "/createCampaign" && httpMethod === "POST") {
      console.log("Handling POST /createCampaign");
      const payload = JSON.parse(event.body || "{}");

      // Basic payload validation
      if (!payload.title || !payload.goal || !payload.ownerId) {
        throw new Error("Missing required campaign fields: title, goal, ownerId.");
      }

      // Fetch and parse secret
      if (!SECRET_ID_FOR_API_KEY) {
        throw new Error("SECRET_API_KEY_NAME env var not configured");
      }
      const secretOutput = await secretsClient.send(
        new GetSecretValueCommand({ SecretId: SECRET_ID_FOR_API_KEY })
      );
      if (!secretOutput.SecretString) {
        throw new Error("Empty secret returned from Secrets Manager");
      }
      let actualSecretValue;
      try {
        const s = JSON.parse(secretOutput.SecretString);
        actualSecretValue = s.NEXT_PUBLIC_WORLD_APP_API;
        if (actualSecretValue === undefined) {
          throw new Error("Key 'NEXT_PUBLIC_WORLD_APP_API' not found");
        }
      } catch (e) {
        throw new Error(`Secret parsing failed: ${e.message}`);
      }

      // Save to DynamoDB
      console.log("Saving campaign to DynamoDB...");
      if (!CAMPAIGN_TABLE_NAME) {
        throw new Error("CAMPAIGN_TABLE_NAME env var not set");
      }
      const campaignId   = uuidv4();
      const createdAt    = new Date().toISOString();
      const campaignItem = {
        id:            { S: campaignId },
        createdAt:     { S: createdAt },
        ownerId:       { S: payload.ownerId },
        title:         { S: payload.title },
        goal:          { N: String(payload.goal) },
        description:   { S: payload.description || "" },
        image:         { S: payload.image || "" },
        verified:      { BOOL: payload.verified || false },
        status:        { S: payload.status || "active" },
        currentAmount: { N: "0" },
        worldAppId:    { S: actualSecretValue }
      };
      await db.send(new PutItemCommand({
        TableName: CAMPAIGN_TABLE_NAME,
        Item:      campaignItem,
        ConditionExpression: "attribute_not_exists(id)"
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, id: campaignId, createdAt })
      };
    }

    // ─── POST /login ───────────────────────────────────────────────────
    else if (path === "/login" && httpMethod === "POST") {
      console.log("Handling POST /login");
      const { username, password } = JSON.parse(event.body || "{}");

      if (!username || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: "Missing credentials" })
        };
      }
      if (!USER_TABLE_NAME) {
        throw new Error("USER_TABLE_NAME env var not configured");
      }

      // Lookup user
      const scanParams = {
        TableName: USER_TABLE_NAME,
        FilterExpression:          "#o = :u",
        ExpressionAttributeNames:  { "#o": "owner" },
        ExpressionAttributeValues: { ":u": { S: username } }
      };
      const { Items } = await db.send(new ScanCommand(scanParams));
      if (!Items?.length) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: "Invalid user or password" })
        };
      }
      const user      = Items[0];
      const storedHash = user.passwordHash?.S;
      if (!storedHash) {
        throw new Error("Missing passwordHash in user record");
      }

      // Argon2 verify
      let isPasswordCorrect = false;
      try {
        isPasswordCorrect = await argon2.verify(storedHash, password);
      } catch (e) {
        console.error("Argon2 verify error:", e);
        throw new Error("Authentication comparison error");
      }
      if (!isPasswordCorrect) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: "Invalid user or password" })
        };
      }

      console.log(`User ${username} authenticated`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ token: uuidv4(), message: "Login successful" })
      };
    }

    // ─── 404 for anything else ───────────────────────────────────────
    else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: "Not Found" })
      };
    }
  }
  catch (err) {
    console.error("Handler Error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message:   "An internal server error occurred.",
        errorHint: err.message
      })
    };
  }
};
