/* Amplify Params - DO NOT EDIT
  ENV
  REGION
  SPLINCH_NAME
Amplify Params - DO NOT EDIT */

// --- Necessary Requires ---
const { 
  DynamoDBClient, 
  ScanCommand, 
  GetItemCommand,
  PutCommand,
  QueryCommand
} = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const { 
  SecretsManagerClient, 
  GetSecretValueCommand 
} = require("@aws-sdk/client-secrets-manager");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

// --- Initialize AWS Clients ---
const db = new DynamoDBClient({});
const secretsClient = new SecretsManagerClient({});

// --- Get configuration from Environment Variables ---
const CAMPAIGN_TABLE_NAME = process.env.CAMPAIGN_TABLE_NAME || process.env.SPLINCH_NAME;
const JWT_SECRET = process.env.JWT_SECRET;
const SECRET_ID_FOR_API_KEY = process.env.SECRET_API_KEY_NAME;

// --- Main Lambda Handler ---
exports.handler = async (event) => {
  // Determine path and method
  const path = event.path;
  const httpMethod = event.httpMethod;

  // Define CORS Headers (restrict in production)
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*", // Restrict to your domain in production
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE"
  };

  // Pre-flight check for OPTIONS method (for CORS)
  if (httpMethod === 'OPTIONS') {
    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ message: 'CORS OK' }) 
    };
  }

  try {
    // Extract authentication token
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    let userId = null;
    let userRoles = [];

    // Verify JWT if present
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const tokenSecret = JWT_SECRET || (await getJwtSecret());
        const decoded = jwt.verify(token, tokenSecret);
        userId = decoded.sub;
        userRoles = decoded.roles || ['user'];
        console.log(`Request authenticated for user: ${userId}`);
      } catch (err) {
        console.warn(`Invalid token: ${err.message}`);
        // Continue processing to allow public endpoints
      }
    }

    // ─── POST /createCampaign ─────────────────────────────────────────
    if (path === '/createCampaign' && httpMethod === 'POST') {
      console.log("Handling POST /createCampaign");
      const payload = JSON.parse(event.body || "{}");

      // Check authentication for protected endpoint
      if (!userId) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: "Authentication required" })
        };
      }

      // Basic payload validation
      if (!payload.title || !payload.goal) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: "Missing required fields: title, goal" })
        };
      }

      // Fetch and parse World ID API secret
      let worldAppId;
      try {
        worldAppId = await getWorldAppId();
      } catch (err) {
        console.error("Error getting World App ID:", err);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: "Failed to retrieve configuration" })
        };
      }

      // Save campaign to DynamoDB
      console.log("Saving campaign to DynamoDB...");
      if (!CAMPAIGN_TABLE_NAME) {
        throw new Error("CAMPAIGN_TABLE_NAME env var not set");
      }

      const campaignId = uuidv4();
      const createdAt = new Date().toISOString();
      const campaignItem = {
        id: { S: campaignId },
        createdAt: { S: createdAt },
        ownerId: { S: userId }, // Use authenticated user ID
        title: { S: payload.title },
        goal: { N: String(payload.goal) },
        description: { S: payload.description || "" },
        image: { S: payload.image || "" },
        verified: { BOOL: payload.verified || false },
        status: { S: payload.status || "draft" },
        currentAmount: { N: "0" },
        worldAppId: { S: worldAppId }
      };

      await db.send(new PutCommand({
        TableName: CAMPAIGN_TABLE_NAME,
        Item: campaignItem,
        ConditionExpression: "attribute_not_exists(id)"
      }));

      console.log(`Campaign created: ${campaignId} by user ${userId}`);
      return {
        statusCode: 201, // Created
        headers,
        body: JSON.stringify({ 
          success: true, 
          id: campaignId, 
          createdAt,
          ownerId: userId
        })
      };
    }

    // ─── GET /campaigns ───────────────────────────────────────────────
    else if (path === '/campaigns' && httpMethod === 'GET') {
      console.log("Handling GET /campaigns");
      
      if (!CAMPAIGN_TABLE_NAME) {
        throw new Error("CAMPAIGN_TABLE_NAME env var not set");
      }

      // Get query parameters
      const limit = event.queryStringParameters?.limit || 20;
      const status = event.queryStringParameters?.status;
      const owner = event.queryStringParameters?.owner;

      // Build scan params
      const scanParams = {
        TableName: CAMPAIGN_TABLE_NAME,
        Limit: parseInt(limit)
      };

      // Add filter for status if provided
      if (status) {
        scanParams.FilterExpression = "#status = :status";
        scanParams.ExpressionAttributeNames = { "#status": "status" };
        scanParams.ExpressionAttributeValues = { ":status": { S: status } };
      }

      // Add filter for owner if provided
      if (owner) {
        scanParams.FilterExpression = scanParams.FilterExpression 
          ? `${scanParams.FilterExpression} AND ownerId = :owner` 
          : "ownerId = :owner";
        scanParams.ExpressionAttributeValues = { 
          ...(scanParams.ExpressionAttributeValues || {}),
          ":owner": { S: owner }
        };
      }

      // Execute the query
      const { Items, Count } = await db.send(new ScanCommand(scanParams));
      
      // Convert DynamoDB items to regular JavaScript objects
      const campaigns = Items ? Items.map(item => {
        const campaign = unmarshall(item);
        return {
          id: campaign.id,
          title: campaign.title,
          goal: campaign.goal,
          currentAmount: campaign.currentAmount,
          ownerId: campaign.ownerId,
          status: campaign.status,
          verified: campaign.verified,
          createdAt: campaign.createdAt,
          // Include other fields as needed
        };
      }) : [];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          campaigns,
          count: Count || 0
        })
      };
    }

    // ─── GET /campaigns/:id ───────────────────────────────────────────
    else if (path.match(/^\/campaigns\/[a-zA-Z0-9-]+$/) && httpMethod === 'GET') {
      console.log(`Handling GET ${path}`);
      
      if (!CAMPAIGN_TABLE_NAME) {
        throw new Error("CAMPAIGN_TABLE_NAME env var not set");
      }

      // Extract campaign ID from path
      const campaignId = path.split('/').pop();
      
      // Get the campaign
      const { Item } = await db.send(new GetItemCommand({
        TableName: CAMPAIGN_TABLE_NAME,
        Key: marshall({ id: campaignId })
      }));

      if (!Item) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: "Campaign not found" })
        };
      }

      // Convert DynamoDB item to regular JavaScript object
      const campaign = unmarshall(Item);

      // Check if user has permission to view this campaign
      const isOwner = userId === campaign.ownerId;
      const isAdmin = userRoles.includes('admin');
      const isDraft = campaign.status === 'draft';

      // Only owners and admins can view draft campaigns
      if (isDraft && !(isOwner || isAdmin)) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ message: "You don't have permission to view this campaign" })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(campaign)
      };
    }

    // ─── PUT /campaigns/:id ───────────────────────────────────────────
    else if (path.match(/^\/campaigns\/[a-zA-Z0-9-]+$/) && httpMethod === 'PUT') {
      console.log(`Handling PUT ${path}`);
      
      // Check authentication
      if (!userId) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: "Authentication required" })
        };
      }

      if (!CAMPAIGN_TABLE_NAME) {
        throw new Error("CAMPAIGN_TABLE_NAME env var not set");
      }

      // Extract campaign ID from path
      const campaignId = path.split('/').pop();
      const payload = JSON.parse(event.body || "{}");
      
      // Get the existing campaign
      const { Item } = await db.send(new GetItemCommand({
        TableName: CAMPAIGN_TABLE_NAME,
        Key: marshall({ id: campaignId })
      }));

      if (!Item) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: "Campaign not found" })
        };
      }

      // Convert DynamoDB item to regular JavaScript object
      const existingCampaign = unmarshall(Item);

      // Check if user has permission to update this campaign
      const isOwner = userId === existingCampaign.ownerId;
      const isAdmin = userRoles.includes('admin');

      if (!(isOwner || isAdmin)) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ message: "You don't have permission to update this campaign" })
        };
      }

      // Fields that can be updated
      const updatableFields = [
        'title', 'description', 'goal', 'image', 'status'
      ];

      // Build update expression
      let updateExpression = "SET";
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};
      let hasUpdates = false;

      updatableFields.forEach(field => {
        if (payload[field] !== undefined) {
          const attrName = `#${field}`;
          const attrValue = `:${field}`;
          
          updateExpression += ` ${attrName} = ${attrValue},`;
          expressionAttributeNames[attrName] = field;
          
          // Handle different types
          if (field === 'goal') {
            expressionAttributeValues[attrValue] = { N: String(payload[field]) };
          } else {
            expressionAttributeValues[attrValue] = { S: payload[field] };
          }
          
          hasUpdates = true;
        }
      });

      // Add updatedAt timestamp
      updateExpression += " #updatedAt = :updatedAt";
      expressionAttributeNames["#updatedAt"] = "updatedAt";
      expressionAttributeValues[":updatedAt"] = { S: new Date().toISOString() };

      // If no updates were requested
      if (!hasUpdates) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: "No valid updates provided" })
        };
      }

      // Remove trailing comma if present
      updateExpression = updateExpression.replace(/,$/, "");

      // Update the campaign
      await db.send({
        TableName: CAMPAIGN_TABLE_NAME,
        Key: marshall({ id: campaignId }),
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ConditionExpression: "attribute_exists(id)"
      });

      console.log(`Campaign ${campaignId} updated by user ${userId}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          id: campaignId,
          updatedAt: new Date().toISOString()
        })
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
        message: "An internal server error occurred.",
        errorHint: err.message
      })
    };
  }
};

// Helper function to get World App ID from Secrets Manager
async function getWorldAppId() {
  if (!SECRET_ID_FOR_API_KEY) {
    throw new Error("SECRET_API_KEY_NAME env var not configured");
  }
  
  const secretOutput = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: SECRET_ID_FOR_API_KEY })
  );
  
  if (!secretOutput.SecretString) {
    throw new Error("Empty secret returned from Secrets Manager");
  }
  
  try {
    const secretJson = JSON.parse(secretOutput.SecretString);
    const worldAppId = secretJson.NEXT_PUBLIC_WORLD_APP_API;
    
    if (worldAppId === undefined) {
      throw new Error("Key 'NEXT_PUBLIC_WORLD_APP_API' not found in secret");
    }
    
    return worldAppId;
  } catch (e) {
    throw new Error(`Failed to parse secret: ${e.message}`);
  }
}

// Helper function to get JWT secret (if not provided in env)
async function getJwtSecret() {
  // In production, you might want to fetch this from Secrets Manager too
  // For now, we'll generate a consistent one based on the app ID
  const worldAppId = await getWorldAppId();
  return `jwt_secret_${worldAppId.substring(4, 12)}`;
}