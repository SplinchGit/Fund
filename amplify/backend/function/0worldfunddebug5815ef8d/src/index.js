/* Amplify Params - DO NOT EDIT
  ENV
  REGION
Amplify Params - DO NOT EDIT */

// --- Necessary Requires ---
const { DynamoDBClient, ScanCommand, GetItemCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const jwt = require("jsonwebtoken");
const { scryptSync, randomBytes, timingSafeEqual } = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

// --- Initialize AWS Clients ---
const db = new DynamoDBClient({});
const secretsClient = new SecretsManagerClient({});

// --- Get configuration from Environment Variables ---
const USER_TABLE_NAME = process.env.USER_TABLE_NAME;       // e.g. 'Users-dev'
const JWT_SECRET_ARN   = process.env.JWT_SECRET_ARN;       // ARN in Secrets Manager
const TOKEN_EXPIRY      = process.env.TOKEN_EXPIRY || "24h";

// --- Helper to load JWT secret from Secrets Manager ---
let cachedJwtSecret;
async function getJwtSecret() {
  if (cachedJwtSecret) return cachedJwtSecret;
  if (!JWT_SECRET_ARN) throw new Error("JWT_SECRET_ARN env var not set");
  const { SecretString } = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: JWT_SECRET_ARN })
  );
  if (!SecretString) throw new Error("Secret has no string value");
  cachedJwtSecret = SecretString;
  return cachedJwtSecret;
}

// --- Main handler ---
exports.handler = async (event) => {
  const { path, httpMethod, body } = event;
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
    // ── POST /login ──────────────────────────────────────────────────
    if (path === "/login" && httpMethod === "POST") {
      const { username, password } = JSON.parse(body || "{}");
      if (!username || !password) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "Missing credentials" }) };
      }
      if (!USER_TABLE_NAME) throw new Error("USER_TABLE_NAME env var not set");

      // fetch user by primary key, fallback to scan
      let user;
      const getResult = await db.send(new GetItemCommand({
        TableName: USER_TABLE_NAME,
        Key: marshall({ username })
      }));
      if (getResult.Item) {
        user = getResult.Item;
      } else {
        const scanResult = await db.send(new ScanCommand({
          TableName: USER_TABLE_NAME,
          FilterExpression: "#u = :u",
          ExpressionAttributeNames: { "#u": "username" },
          ExpressionAttributeValues: { ":u": { S: username } }
        }));
        if (scanResult.Items?.length) user = scanResult.Items[0];
      }

      if (!user) {
        return { statusCode: 401, headers, body: JSON.stringify({ message: "Invalid username or password" }) };
      }

      // verify via scrypt
      const storedHash = user.passwordHash?.S;
      if (!storedHash) throw new Error("Malformed user record");
      const [salt, keyHex] = storedHash.split(":");
      const derived = scryptSync(password, salt, 64);
      const keyBuf  = Buffer.from(keyHex, "hex");
      if (!timingSafeEqual(keyBuf, derived)) {
        return { statusCode: 401, headers, body: JSON.stringify({ message: "Invalid username or password" }) };
      }

      // sign JWT
      const userId    = user.id?.S || username;
      const userRoles = user.roles?.SS || ["user"];
      const secret    = await getJwtSecret();
      const token     = jwt.sign({ sub: userId, username, roles: userRoles }, secret, { expiresIn: TOKEN_EXPIRY });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ token, userId, expiresIn: TOKEN_EXPIRY, message: "Login successful" })
      };
    }

    // ── POST /register ────────────────────────────────────────────────
    else if (path === "/register" && httpMethod === "POST") {
      const { username, password, email } = JSON.parse(body || "{}");
      if (!username || !password) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "Username and password are required" }) };
      }
      if (password.length < 8) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "Password must be at least 8 characters" }) };
      }
      if (!USER_TABLE_NAME) throw new Error("USER_TABLE_NAME env var not set");

      // ensure uniqueness
      const exists = await db.send(new GetItemCommand({
        TableName: USER_TABLE_NAME,
        Key: marshall({ username })
      }));
      if (exists.Item) {
        return { statusCode: 409, headers, body: JSON.stringify({ message: "Username already exists" }) };
      }

      // create scrypt hash
      const salt       = randomBytes(16).toString("hex");
      const derivedKey = scryptSync(password, salt, 64).toString("hex");
      const passwordHash = `${salt}:${derivedKey}`;

      // build user item
      const userId = uuidv4();
      const now    = new Date().toISOString();
      const userItem = {
        id:           { S: userId },
        username:     { S: username },
        passwordHash: { S: passwordHash },
        createdAt:    { S: now },
        roles:        { SS: ["user"] }
      };
      if (email) userItem.email = { S: email };

      await db.send(new PutItemCommand({
        TableName: USER_TABLE_NAME,
        Item: userItem,
        ConditionExpression: "attribute_not_exists(username)"
      }));

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ userId, username, message: "Registration successful" })
      };
    }

    // ── 404 for anything else ─────────────────────────────────────────
    else {
      return { statusCode: 404, headers, body: JSON.stringify({ message: "Not Found" }) };
    }
  }
  catch (err) {
    console.error("Handler Error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Internal server error", errorHint: err.message })
    };
  }
};
