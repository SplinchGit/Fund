const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { randomUUID } = require("crypto");

const client = new DynamoDBClient();

exports.handler = async (event) => {
  try {
    // Parse the incoming JSON body
    const body = JSON.parse(event.body || "{}");
    const {
      title,
      goal,
      ownerId,
      description = "",
      image = "",
      verified = false,
      status = "draft",
    } = body;

    // Simple validation
    if (!title || !goal || !ownerId) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "title, goal and ownerId are required" }),
      };
    }

    // Generate IDs and timestamps
    const campaignId = randomUUID();
    const createdAt  = new Date().toISOString();

    // Put item into DynamoDB
    const command = new PutItemCommand({
      TableName: process.env.SPLINCH_NAME,      // injected by Amplify
      Item: {
        id:        { S: campaignId },
        createdAt: { S: createdAt },
        title:     { S: title },
        goal:      { N: goal.toString() },
        ownerId:   { S: ownerId },
        description:  { S: description },
        image:        { S: image },
        verified:     { BOOL: verified },
        status:       { S: status },
      },
    });
    await client.send(command);

    // Return success
    return {
      statusCode: 200,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST"
      },
      body: JSON.stringify({
        success: true,
        id: campaignId,
        createdAt,
      }),
    };
  } catch (err) {
    console.error("createCampaign error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
