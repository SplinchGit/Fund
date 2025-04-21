/* Amplify Params - DO NOT EDIT
  ENV
  REGION
Amplify Params - DO NOT EDIT */

// --- Necessary Requires ---
const { DynamoDBClient, ScanCommand, GetItemCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const jwt = require("jsonwebtoken");
const argon2 = require("argon2");
const { v4: uuidv4 } = require("uuid");

// --- Initialize AWS Clients ---
const db = new DynamoDBClient({});

// --- Get configuration from Environment Variables ---
const USER_TABLE_NAME = process.env.USER_TABLE_NAME;         // e.g., 'Users-dev'
const JWT_SECRET = process.env.JWT_SECRET;                   // Secret for signing JWTs
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '24h';      // Default 24 hour token expiry

// --- Main Lambda Handler ---
exports.handler = async (event) => {
  const path = event.path;
  const httpMethod = event.httpMethod;

  // Define CORS Headers (restrict in production)
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*", // Restrict to your domain in production
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
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
    // ─── POST /login ───────────────────────────────────────────────────
    if (path === "/login" && httpMethod === "POST") {
      console.log("Handling POST /login");
      const { username, password } = JSON.parse(event.body || "{}");

      // Validate input
      if (!username || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: "Missing credentials" })
        };
      }
      
      // Ensure table name is configured
      if (!USER_TABLE_NAME) {
        throw new Error("USER_TABLE_NAME env var not configured");
      }

      // Lookup user - first try GetItem (more efficient than Scan)
      let user;
      try {
        const getResult = await db.send(new GetItemCommand({
          TableName: USER_TABLE_NAME,
          Key: marshall({ username }),
        }));
        
        if (getResult.Item) {
          user = getResult.Item;
        } else {
          // Fallback to scan if username isn't the partition key
          const scanParams = {
            TableName: USER_TABLE_NAME,
            FilterExpression: "#u = :u",
            ExpressionAttributeNames: { "#u": "username" },
            ExpressionAttributeValues: { ":u": { S: username } }
          };
          const { Items } = await db.send(new ScanCommand(scanParams));
          if (Items && Items.length > 0) {
            user = Items[0];
          }
        }
      } catch (err) {
        console.error("Error looking up user:", err);
        throw new Error(`Database error during user lookup: ${err.message}`);
      }

      // Handle user not found
      if (!user) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: "Invalid username or password" })
        };
      }

      // Get stored password hash
      const storedHash = user.passwordHash?.S;
      if (!storedHash) {
        console.error(`User ${username} found but missing passwordHash attribute`);
        throw new Error("Invalid user record structure");
      }

      // Verify password with Argon2
      let isPasswordCorrect = false;
      try {
        isPasswordCorrect = await argon2.verify(storedHash, password);
      } catch (e) {
        console.error("Argon2 verify error:", e);
        throw new Error("Authentication comparison error");
      }

      // Handle invalid password
      if (!isPasswordCorrect) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: "Invalid username or password" })
        };
      }

      // Generate JWT token
      const userId = user.id?.S || user.username?.S || username;
      const userRoles = user.roles?.SS || ['user']; 

      if (!JWT_SECRET) {
        console.warn("JWT_SECRET env var not set, using insecure random value");
      }
      
      const tokenSecret = JWT_SECRET || uuidv4();
      
      const token = jwt.sign(
        { 
          sub: userId,
          username: username,
          roles: userRoles
        },
        tokenSecret,
        { 
          expiresIn: TOKEN_EXPIRY
        }
      );

      console.log(`User ${username} authenticated successfully`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          token,
          userId,
          expiresIn: TOKEN_EXPIRY,
          message: "Login successful" 
        })
      };
    }
    
    // ─── POST /register ────────────────────────────────────────────────
    else if (path === "/register" && httpMethod === "POST") {
      console.log("Handling POST /register");
      const { username, password, email } = JSON.parse(event.body || "{}");
      
      // Validate input
      if (!username || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: "Username and password are required" })
        };
      }
      
      if (password.length < 8) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: "Password must be at least 8 characters" })
        };
      }
      
      // Ensure table name is configured
      if (!USER_TABLE_NAME) {
        throw new Error("USER_TABLE_NAME env var not configured");
      }
      
      // Check if user already exists
      try {
        const getResult = await db.send(new GetItemCommand({
          TableName: USER_TABLE_NAME,
          Key: marshall({ username }),
        }));
        
        if (getResult.Item) {
          return {
            statusCode: 409,
            headers,
            body: JSON.stringify({ message: "Username already exists" })
          };
        }
      } catch (err) {
        console.error("Error checking existing user:", err);
        throw new Error(`Database error checking user existence: ${err.message}`);
      }
      
      // Hash the password with Argon2
      let passwordHash;
      try {
        passwordHash = await argon2.hash(password, {
          type: argon2.argon2id,
          memoryCost: 2 ** 16,
          timeCost: 3,
          parallelism: 4
        });
      } catch (err) {
        console.error("Error hashing password:", err);
        throw new Error("Failed to hash password");
      }
      
      // Create new user
      const userId = uuidv4();
      const now = new Date().toISOString();
      
      const userItem = {
        id: { S: userId },
        username: { S: username },
        passwordHash: { S: passwordHash },
        createdAt: { S: now },
        roles: { SS: ["user"] }
      };
      
      if (email) {
        userItem.email = { S: email };
      }
      
      try {
        await db.send(new PutItemCommand({
          TableName: USER_TABLE_NAME,
          Item: userItem,
          ConditionExpression: "attribute_not_exists(username)"
        }));
      } catch (err) {
        if (err.name === "ConditionalCheckFailedException") {
          return {
            statusCode: 409,
            headers,
            body: JSON.stringify({ message: "Username already exists" })
          };
        }
        throw err;
      }
      
      console.log(`User ${username} registered successfully with ID ${userId}`);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ 
          userId,
          username, 
          message: "Registration successful" 
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
