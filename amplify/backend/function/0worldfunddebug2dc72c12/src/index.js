/* Amplify Params - DO NOT EDIT
	ENV
	REGION
Amplify Params - DO NOT EDIT */const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require("uuid");

const db = new DynamoDBClient({});
const TABLE_NAME = process.env.SPLINCH_NAME; // “Splinch”

exports.handler = async (event) => {
  try {
    const { username, password } = JSON.parse(event.body || "{}");
    if (!username || !password) {
      return { statusCode: 400, body: "Missing credentials" };
    }

    // Scan for items where owner=username
    const { Items } = await db.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "#o = :u",
      ExpressionAttributeNames: { "#o": "owner" },
      ExpressionAttributeValues: { ":u": { S: username } }
    }));

    if (!Items || Items.length === 0) {
      return { statusCode: 401, body: "Invalid user" };
    }

    const user = Items[0];
    if (password !== user.password.S) {  // replace with hash‐check in prod
      return { statusCode: 401, body: "Invalid password" };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ token: uuidv4() })
    };
  } catch (err) {
    console.error("Login error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: err.message })
    };
  }
};
