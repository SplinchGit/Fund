// Filename: amplify/backend/function/userRegister/src/index.ts

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import bcrypt from 'bcryptjs'; // Using bcryptjs

// Initialize DynamoDB Client (outside handler for connection reuse)
const client = new DynamoDBClient({}); // Assumes IAM role provides permissions
const docClient = DynamoDBDocumentClient.from(client);

// Get table name from Lambda Environment Variables (set this in your Lambda config via Amplify CLI)
const USER_TABLE_NAME = process.env.USER_TABLE_NAME;

// --- CORS Headers ---
// Adjust origin in production! '*' is okay for testing.
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Methods': 'POST, OPTIONS', // Allow POST and preflight OPTIONS
    'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Added Authorization just in case
};


export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // Handle CORS Preflight requests
    if (event.httpMethod === 'OPTIONS') {
        console.log('Handling OPTIONS preflight request');
        return {
            statusCode: 204, // No Content
            headers: CORS_HEADERS,
            body: '',
        };
    }

    // --- 1. Check Method ---
    if (event.httpMethod !== 'POST') {
         console.log(`Method ${event.httpMethod} not allowed.`);
        return {
            statusCode: 405, // Method Not Allowed
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
        };
    }

    // --- 2. Check Table Name Configuration ---
    if (!USER_TABLE_NAME) {
        console.error('FATAL: USER_TABLE_NAME environment variable not set for Lambda function.');
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Server configuration error: Missing table name' }),
        };
    }

    // --- 3. Parse and Validate Request Body ---
    let username: string;
    let password: string;
    try {
        if (!event.body) {
            throw new Error('Request body is missing');
        }
        const requestBody = JSON.parse(event.body);
        console.log('Parsed request body:', requestBody);

        // Basic presence and type validation
        if (!requestBody.username || typeof requestBody.username !== 'string' || requestBody.username.trim().length === 0) {
            throw new Error('Username is required and must be a non-empty string');
        }
        if (!requestBody.password || typeof requestBody.password !== 'string' || requestBody.password.length === 0) {
             // Check length explicitly as trim not suitable for passwords
            throw new Error('Password is required and must be a non-empty string');
        }

        username = requestBody.username.trim(); // Trim username
        password = requestBody.password; // Keep original password

        // Add more specific validation if needed (e.g., regex for username, length check)
        if (username.length < 3 || username.length > 20) {
             throw new Error('Username must be between 3 and 20 characters');
        }
        if (password.length < 8) {
             throw new Error('Password must be at least 8 characters');
             // Consider adding complexity checks here if not done client-side only
        }


    } catch (error: any) {
        console.error('Bad Request Error:', error);
        return {
            statusCode: 400, // Bad Request
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Invalid request', detail: error.message }),
        };
    }

    // --- Main Registration Logic ---
    try {
        // --- 4. Check if Username Already Exists ---
        const getParams = {
            TableName: USER_TABLE_NAME,
            Key: { username: username }, // Assumes 'username' is your Partition Key (PK)
        };
        console.log(`Checking if user exists: ${username} in table ${USER_TABLE_NAME}`);
        const { Item: existingUser } = await docClient.send(new GetCommand(getParams));

        if (existingUser) {
            console.log(`Username ${username} already exists.`);
            return {
                statusCode: 409, // Conflict
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: 'Username already exists' }),
            };
        }
        console.log(`Username ${username} is available.`);

        // --- 5. Hash the Password ---
        console.log(`Hashing password for user: ${username}`);
        const saltRounds = 10; // Standard recommendation
        const passwordHash = await bcrypt.hash(password, saltRounds);
        console.log(`Password hashed successfully.`);

        // --- 6. Store New User in DynamoDB ---
        const newUserItem = {
            username: username,
            passwordHash: passwordHash, // STORE THE HASH!
            createdAt: new Date().toISOString(),
            // Add any other default user attributes here (e.g., emailVerified: false)
        };
        const putParams = {
            TableName: USER_TABLE_NAME,
            Item: newUserItem,
            ConditionExpression: 'attribute_not_exists(username)' // Prevent race conditions
        };
        console.log(`Attempting to create user item: ${username}`);
        await docClient.send(new PutCommand(putParams));
        console.log(`User ${username} created successfully in DynamoDB.`);

        // --- 7. Return Success Response ---
        return {
            statusCode: 201, // Created
            headers: CORS_HEADERS,
            // Don't send sensitive info back, just confirmation
            body: JSON.stringify({ message: 'User registered successfully', username: username }),
        };

    } catch (error: any) {
        console.error('Error during registration database operation:', error);

        // Handle specific DynamoDB error for race condition
        if (error.name === 'ConditionalCheckFailedException') {
             console.log(`Race condition during registration for username: ${username}.`);
             return {
                 statusCode: 409, // Conflict
                 headers: CORS_HEADERS,
                 body: JSON.stringify({ message: 'Username already exists (concurrent registration attempt)' })
             };
        }

        // Generic server error for other DB or bcrypt issues
        return {
            statusCode: 500, // Internal Server Error
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Internal server error during registration', detail: error.message }),
        };
    }
}; // End of handler