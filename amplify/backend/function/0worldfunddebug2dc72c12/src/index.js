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
  PutCommand
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
const CAMPAIGN_TABLE_NAME  = process.env.CAMPAIGN_TABLE_NAME || process.env.SPLINCH_NAME;
const JWT_SECRET_ARN       = process.env.JWT_SECRET_ARN;      // if using Secrets Manager
const JWT_SECRET_PLAINTEXT = process.env.JWT_SECRET;          // fallback if set directly
const SECRET_ID_FOR_API_KEY= process.env.SECRET_API_KEY_NAME;
const TOKEN_EXPIRY         = process.env.TOKEN_EXPIRY || "24h";

// --- Helpers ---
async function getJwtSecret() {
  if (JWT_SECRET_PLAINTEXT) return JWT_SECRET_PLAINTEXT;
  if (!JWT_SECRET_ARN) throw new Error("No JWT_SECRET or JWT_SECRET_ARN configured");
  const res = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: JWT_SECRET_ARN })
  );
  if (!res.SecretString) throw new Error("Empty secret in Secrets Manager");
  return res.SecretString;
}

async function getWorldAppId() {
  if (!SECRET_ID_FOR_API_KEY) throw new Error("SECRET_API_KEY_NAME not set");
  const res = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: SECRET_ID_FOR_API_KEY })
  );
  if (!res.SecretString) throw new Error("Empty secret in Secrets Manager");
  const json = JSON.parse(res.SecretString);
  if (!json.NEXT_PUBLIC_WORLD_APP_API) throw new Error("Missing NEXT_PUBLIC_WORLD_APP_API");
  return json.NEXT_PUBLIC_WORLD_APP_API;
}

// --- Main Lambda Handler ---
exports.handler = async (event) => {
  const { path, httpMethod, headers: hdrs, body } = event;

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE"
  };
  if (httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: JSON.stringify({ message: "CORS OK" }) };
  }

  // Authenticate if there’s a Bearer token
  let userId = null, userRoles = [];
  const authHeader = hdrs.Authorization || hdrs.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const secret = await getJwtSecret();
      const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
      userId = decoded.sub;
      userRoles = decoded.roles || ["user"];
    } catch (e) {
      console.warn("JWT invalid:", e.message);
    }
  }

  try {
    // ─── POST /createCampaign ─────────────────────────────────────────
    if (path === "/createCampaign" && httpMethod === "POST") {
      if (!userId) {
        return { statusCode: 401, headers, body: JSON.stringify({ message: "Auth required" }) };
      }
      const payload = JSON.parse(body || "{}");
      if (!payload.title || !payload.goal) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "Missing title or goal" }) };
      }
      const worldAppId = await getWorldAppId();
      if (!CAMPAIGN_TABLE_NAME) throw new Error("CAMPAIGN_TABLE_NAME not set");

      const id = uuidv4(), createdAt = new Date().toISOString();
      const item = {
        id: { S: id },
        createdAt: { S: createdAt },
        ownerId: { S: userId },
        title: { S: payload.title },
        goal: { N: String(payload.goal) },
        description: { S: payload.description || "" },
        image: { S: payload.image || "" },
        verified: { BOOL: !!payload.verified },
        status: { S: payload.status || "draft" },
        currentAmount: { N: "0" },
        worldAppId: { S: worldAppId }
      };

      await db.send(new PutCommand({
        TableName: CAMPAIGN_TABLE_NAME,
        Item: item,
        ConditionExpression: "attribute_not_exists(id)"
      }));

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, id, createdAt, ownerId: userId })
      };
    }

    // ─── GET /campaigns ───────────────────────────────────────────────
    if (path === "/campaigns" && httpMethod === "GET") {
      if (!CAMPAIGN_TABLE_NAME) throw new Error("CAMPAIGN_TABLE_NAME not set");
      const qs = event.queryStringParameters || {};
      const limit  = parseInt(qs.limit || "20", 10);
      const status = qs.status;
      const owner  = qs.owner;

      const params = { TableName: CAMPAIGN_TABLE_NAME, Limit: limit };
      if (status) {
        params.FilterExpression = "#s = :s";
        params.ExpressionAttributeNames = { "#s": "status" };
        params.ExpressionAttributeValues = { ":s": { S: status } };
      }
      if (owner) {
        const fe = params.FilterExpression
          ? `${params.FilterExpression} AND ownerId = :o`
          : "ownerId = :o";
        params.FilterExpression = fe;
        params.ExpressionAttributeValues = {
          ...(params.ExpressionAttributeValues || {}),
          ":o": { S: owner }
        };
      }

      const { Items, Count } = await db.send(new ScanCommand(params));
      const campaigns = (Items || []).map(i => unmarshall(i));
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ campaigns, count: Count || 0 })
      };
    }

    // ─── GET /campaigns/:id ───────────────────────────────────────────
    if (/^\/campaigns\/[A-Za-z0-9-]+$/.test(path) && httpMethod === "GET") {
      if (!CAMPAIGN_TABLE_NAME) throw new Error("CAMPAIGN_TABLE_NAME not set");
      const id = path.split("/").pop();
      const { Item } = await db.send(new GetItemCommand({
        TableName: CAMPAIGN_TABLE_NAME,
        Key: marshall({ id })
      }));
      if (!Item) {
        return { statusCode: 404, headers, body: JSON.stringify({ message: "Campaign not found" }) };
      }
      const camp = unmarshall(Item);
      const isOwner = camp.ownerId === userId;
      const isAdmin = userRoles.includes("admin");
      if (camp.status === "draft" && !(isOwner || isAdmin)) {
        return { statusCode: 403, headers, body: JSON.stringify({ message: "Forbidden" }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify(camp) };
    }

    // ─── PUT /campaigns/:id ───────────────────────────────────────────
    if (/^\/campaigns\/[A-Za-z0-9-]+$/.test(path) && httpMethod === "PUT") {
      if (!userId) {
        return { statusCode: 401, headers, body: JSON.stringify({ message: "Auth required" }) };
      }
      if (!CAMPAIGN_TABLE_NAME) throw new Error("CAMPAIGN_TABLE_NAME not set");

      const id = path.split("/").pop();
      const { Item } = await db.send(new GetItemCommand({
        TableName: CAMPAIGN_TABLE_NAME,
        Key: marshall({ id })
      }));
      if (!Item) {
        return { statusCode: 404, headers, body: JSON.stringify({ message: "Campaign not found" }) };
      }

      const existing = unmarshall(Item);
      const isOwner = existing.ownerId === userId;
      const isAdmin = userRoles.includes("admin");
      if (!(isOwner || isAdmin)) {
        return { statusCode: 403, headers, body: JSON.stringify({ message: "Forbidden" }) };
      }

      const updates = JSON.parse(body || "{}");
      const fields = ["title","description","goal","image","status"];
      let expr = "SET", names = {}, values = {}, changed = false;
      fields.forEach(f => {
        if (updates[f] !== undefined) {
          expr += ` #${f} = :${f},`;
          names[`#${f}`] = f;
          values[`:${f}`] = (f === "goal")
            ? { N: String(updates[f]) }
            : { S: updates[f] };
          changed = true;
        }
      });
      // updatedAt
      expr += " #updatedAt = :updatedAt";
      names["#updatedAt"] = "updatedAt";
      values[":updatedAt"] = { S: new Date().toISOString() };

      if (!changed) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "No changes provided" }) };
      }
      expr = expr.replace(/,$/, "");

      await db.send({
        TableName: CAMPAIGN_TABLE_NAME,
        Key: marshall({ id }),
        UpdateExpression: expr,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: "attribute_exists(id)"
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, id, updatedAt: values[":updatedAt"].S })
      };
    }

    // ─── Default 404 ─────────────────────────────────────────────────
    return { statusCode: 404, headers, body: JSON.stringify({ message: "Not Found" }) };

  } catch (err) {
    console.error("Handler Error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Internal error", error: err.message })
    };
  }
};
