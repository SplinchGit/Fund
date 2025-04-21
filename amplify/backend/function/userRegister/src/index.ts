// Filename: amplify/backend/function/userRegister/src/index.ts

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import argon2 from 'argon2'; // ← switched to Argon2

// Initialize DynamoDB Client (outside handler for connection reuse)
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Get table name from Lambda Environment Variables
const USER_TABLE_NAME = process.env.USER_TABLE_NAME;

// --- CORS Headers ---
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // Handle CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  // Ensure table name is configured
  if (!USER_TABLE_NAME) {
    console.error('USER_TABLE_NAME env var not set');
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Server configuration error: Missing table name' }),
    };
  }

  // Parse & validate body
  let username: string;
  let password: string;
  try {
    if (!event.body) throw new Error('Request body is missing');
    const requestBody = JSON.parse(event.body);
    console.log('Parsed request body:', requestBody);

    if (
      !requestBody.username ||
      typeof requestBody.username !== 'string' ||
      requestBody.username.trim().length === 0
    ) {
      throw new Error('Username is required and must be a non-empty string');
    }
    if (
      !requestBody.password ||
      typeof requestBody.password !== 'string' ||
      requestBody.password.length < 8
    ) {
      throw new Error('Password is required and must be at least 8 characters');
    }

    username = requestBody.username.trim();
    password = requestBody.password;
  } catch (error: any) {
    console.error('Bad Request Error:', error);
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Invalid request', detail: error.message }),
    };
  }

  try {
    // 1. Check if user exists
    const { Item: existingUser } = await docClient.send(
      new GetCommand({
        TableName: USER_TABLE_NAME,
        Key: { username },
      })
    );
    if (existingUser) {
      return {
        statusCode: 409,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Username already exists' }),
      };
    }

    // 2. Hash the password with Argon2id
    console.log(`Hashing password for user: ${username}`);
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,  // 64 MiB
      timeCost: 3,
      parallelism: 4
    });
    console.log(`Password hashed successfully.`);

    // 3. Store new user
    const newUserItem = {
      username,
      passwordHash,             // Store the Argon2 hash
      createdAt: new Date().toISOString(),
    };
    await docClient.send(
      new PutCommand({
        TableName: USER_TABLE_NAME,
        Item: newUserItem,
        ConditionExpression: 'attribute_not_exists(username)',
      })
    );
    console.log(`User ${username} created successfully.`);

    // 4. Return success
    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'User registered successfully', username }),
    };
  } catch (error: any) {
    console.error('Error during registration:', error);

    // Handle conditional check conflict
    if (error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Username already exists (race condition)' }),
      };
    }

    // Generic error
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Internal server error during registration',
        detail: error.message,
      }),
    };
  }
};
