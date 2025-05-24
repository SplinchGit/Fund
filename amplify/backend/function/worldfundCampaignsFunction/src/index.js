// worldfund-campaigns-function/index.js
// Handles all campaign-related operations

// # ############################################################################ #
// # #                         SECTION 1 - MODULE IMPORTS                       #
// # ############################################################################ #
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand, ScanCommand, QueryCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

// Variables for Dynamically Loaded Modules & Shared Instances
let BadWordsFilterClass;
let profanityFilter;

let dependenciesInitialized = false;

async function initializeDependencies() {
    if (dependenciesInitialized) return;
    console.log("Initializing dynamic dependencies...");
    try {
        const badWordsModule = await import('bad-words');
        BadWordsFilterClass = badWordsModule.default || badWordsModule;
        profanityFilter = new BadWordsFilterClass();
        // Example customization: profanityFilter.addWords('custombadword1');

        dependenciesInitialized = true;
        console.log("Dynamic dependencies initialized successfully.");
    } catch (error) {
        console.error("CRITICAL: Failed to initialize dynamic dependencies:", error);
        throw new Error("Critical dependency initialization failed: " + error.message);
    }
}

// # ############################################################################ #
// # #                 SECTION 2 - GLOBAL CONFIGURATION & CONSTANTS               #
// # ############################################################################ #
const JWT_SECRET_ARN = process.env.JWT_SECRET_ARN;

const DEPLOYED_FRONTEND_URL = process.env.FRONTEND_URL || 'https://main.d2fvyjulmwt6nl.amplifyapp.com';
const LOCAL_DEV_URL = 'http://localhost:5173';
const ALLOWED_ORIGINS_LIST = [DEPLOYED_FRONTEND_URL, LOCAL_DEV_URL].filter(Boolean);

const PREDEFINED_CATEGORIES = [
    "Technology & Innovation", "Creative Works", "Community & Social Causes",
    "Small Business & Entrepreneurship", "Health & Wellness", "Other"
];

// # ############################################################################ #
// # #                 SECTION 3 - AWS SDK CLIENT INITIALIZATION                #
// # ############################################################################ #
const lambdaRegion = process.env.AWS_REGION || 'eu-west-2';
const secretsClient = new SecretsManagerClient({ region: lambdaRegion });
const dynamodbClient = new DynamoDBClient({ region: lambdaRegion });
const ddbDocClient = DynamoDBDocumentClient.from(dynamodbClient);

// # ############################################################################ #
// # #                     SECTION 4 - GLOBAL CACHE VARIABLES                   #
// # ############################################################################ #
let cachedJwtSecret = null;

// # ############################################################################ #
// # #           SECTION 6 - HELPER FUNCTION: CREATE API RESPONSE (WITH CORS)   #
// # ############################################################################ #
function createResponse(statusCode, body, requestOrigin) {
    let effectiveAllowOrigin = ALLOWED_ORIGINS_LIST.length > 0 ? ALLOWED_ORIGINS_LIST[0] : '*';
    if (requestOrigin && ALLOWED_ORIGINS_LIST.includes(requestOrigin)) {
        effectiveAllowOrigin = requestOrigin;
    }
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': effectiveAllowOrigin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Requested-With,Origin,x-attempt-number'
        },
        body: JSON.stringify(body)
    };
}

// # ############################################################################ #
// # #                  SECTION 7 - HELPER FUNCTION: GET JWT SECRET               #
// # ############################################################################ #
const getJwtSecret = async () => {
    if (cachedJwtSecret) return cachedJwtSecret;
    if (!JWT_SECRET_ARN) { console.error('JWT_SECRET_ARN missing.'); throw new Error('Server config error: JWT secret ARN missing.'); }
    try {
        const r = await secretsClient.send(new GetSecretValueCommand({ SecretId: JWT_SECRET_ARN }));
        if (r.SecretString) { cachedJwtSecret = r.SecretString; return cachedJwtSecret; }
        throw new Error('Failed to retrieve JWT secret content.');
    } catch (e) { console.error('Error retrieving JWT secret:', e); throw new Error('Failed to retrieve JWT secret'); }
};

const verifyJWT = async (authHeader) => {
    if (!authHeader) throw new Error('No authorization header provided');
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    if (!token) throw new Error('No token provided');
    try {
        const secret = await getJwtSecret();
        if (!secret) throw new Error('JWT secret unavailable.');
        return jwt.verify(token, secret);
    } catch (e) { console.error('JWT verification failed:', e.message); throw new Error('Invalid or expired token'); }
};

// # ############################################################################ #
// # #            SECTION 8 - MAIN LAMBDA HANDLER                                 #
// # ############################################################################ #
exports.handler = async (event) => {
    await initializeDependencies();

    const requestOrigin = event.headers?.origin || event.headers?.Origin || (ALLOWED_ORIGINS_LIST.length > 0 ? ALLOWED_ORIGINS_LIST[0] : undefined);

    const CAMPAIGNS_TABLE_NAME = process.env.CAMPAIGNS_TABLE_NAME;

    const criticalEnvVars = {
        CAMPAIGNS_TABLE_NAME, JWT_SECRET_ARN
    };
    for (const [key, value] of Object.entries(criticalEnvVars)) {
        if (!value) {
            console.error(`Critical environment variable ${key} is missing.`);
            return createResponse(500, { message: `Server configuration error: Missing ${key}.` }, requestOrigin);
        }
    }

    const httpMethod = event.httpMethod;
    const path = event.path;
    const pathParts = path.split('/').filter(part => part !== '');

    if (httpMethod === 'OPTIONS') {
        return createResponse(200, {}, requestOrigin);
    }

    // # ############################################################################ #
    // # #            CAMPAIGNS ROUTE HANDLERS                                       #
    // # ############################################################################ #
    
    // GET /campaigns (List campaigns, optionally filtered by category)
    if (httpMethod === 'GET' && pathParts.length === 1 && pathParts[0] === 'campaigns') {
        try {
            const categoryFilter = event.queryStringParameters?.category;
            let scanOrQueryParams;
            if (categoryFilter && PREDEFINED_CATEGORIES.includes(categoryFilter)) {
                console.log(`[GET /campaigns] Filtering by category: ${categoryFilter}`);
                scanOrQueryParams = {
                    TableName: CAMPAIGNS_TABLE_NAME,
                    FilterExpression: '#status = :active AND #cat = :catVal',
                    ExpressionAttributeNames: { '#status': 'status', "#cat": "category" },
                    ExpressionAttributeValues: { ':active': 'active', ":catVal": categoryFilter }
                };
            } else {
                if (categoryFilter) console.warn(`[GET /campaigns] Invalid category: ${categoryFilter}. Returning all active.`);
                scanOrQueryParams = {
                    TableName: CAMPAIGNS_TABLE_NAME, FilterExpression: '#status = :active',
                    ExpressionAttributeNames: { '#status': 'status' }, ExpressionAttributeValues: { ':active': 'active' }
                };
            }
            const result = await ddbDocClient.send(new ScanCommand(scanOrQueryParams));
            return createResponse(200, { campaigns: result.Items || [] }, requestOrigin);
        } catch (error) {
            console.error(`Error listing campaigns:`, error);
            return createResponse(500, { message: 'Failed to list campaigns', errorDetails: error.message }, requestOrigin);
        }
    }

    // POST /campaigns (Create new campaign)
    if (httpMethod === 'POST' && pathParts.length === 1 && pathParts[0] === 'campaigns') {
        console.log('[POST /campaigns] Attempting to create new campaign...');
        try {
            const authHeader = event.headers?.Authorization || event.headers?.authorization;
            const decodedToken = await verifyJWT(authHeader);
            const ownerId = decodedToken.walletAddress;

            if (!event.body) return createResponse(400, { message: 'Missing request body' }, requestOrigin);
            const { title, description, goal, category, image } = JSON.parse(event.body);

            const queryUserCampaignsParams = {
                TableName: CAMPAIGNS_TABLE_NAME,
                IndexName: 'OwnerId-Index', // Ensure GSI 'OwnerId-Index' exists
                KeyConditionExpression: 'ownerId = :oid',
                ExpressionAttributeValues: { ':oid': ownerId },
                Select: 'COUNT',
            };
            const userCampaignsResult = await ddbDocClient.send(new QueryCommand(queryUserCampaignsParams));
            if (userCampaignsResult.Count >= 3) {
                return createResponse(400, { message: "Campaign creation limit of 3 per user reached." }, requestOrigin);
            }
            if (!category || !PREDEFINED_CATEGORIES.includes(category)) {
                return createResponse(400, { message: "Invalid or missing category.", allowedCategories: PREDEFINED_CATEGORIES }, requestOrigin);
            }
            if (!title) return createResponse(400, { message: "Campaign title is required." }, requestOrigin);
            if (profanityFilter.isProfane(title)) {
                return createResponse(400, { message: "Campaign title contains inappropriate language." }, requestOrigin);
            }
            if (description && profanityFilter.isProfane(description)) {
                return createResponse(400, { message: "Campaign description contains inappropriate language." }, requestOrigin);
            }
            if (goal === undefined || isNaN(Number(goal)) || Number(goal) <= 0) {
                return createResponse(400, { message: 'A valid positive campaign goal amount is required.' }, requestOrigin);
            }

            const campaignId = crypto.randomUUID();
            const nowIso = new Date().toISOString();
            const newCampaignItem = {
                id: campaignId,
                ownerId,
                title,
                description: description || '',
                goal: Number(goal),
                category,
                imageUrl: image || null,
                status: 'active',
                createdAt: nowIso,
                updatedAt: nowIso,
                raised: 0,
                donations: [],
                currency: 'WLD'
            };
            await ddbDocClient.send(new PutCommand({ TableName: CAMPAIGNS_TABLE_NAME, Item: newCampaignItem }));
            console.log(`Created campaign ${campaignId} for user ${ownerId}`);
            return createResponse(201, { success: true, id: campaignId, createdAt: nowIso }, requestOrigin);
        } catch (error) {
            console.error('[POST /campaigns] Error:', error);
            const errMsg = error.message || 'Failed to create campaign';
            const statusCode = (errMsg.includes('token') || errMsg.includes('No authorization header')) ? 401 : (errMsg.includes('limit') || errMsg.includes('Invalid') || errMsg.includes('required')) ? 400 : 500;
            return createResponse(statusCode, { message: errMsg, errorDetails: error.message }, requestOrigin);
        }
    }

    // Routes for /campaigns/{id}/*
    if (pathParts.length >= 2 && pathParts[0] === 'campaigns') {
        const campaignId = pathParts[1];

        // GET /campaigns/{id}
        if (httpMethod === 'GET' && pathParts.length === 2) {
            try {
                const result = await ddbDocClient.send(new GetCommand({ TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId } }));
                if (!result.Item) return createResponse(404, { message: 'Campaign not found' }, requestOrigin);
                return createResponse(200, result.Item, requestOrigin);
            } catch (error) {
                console.error(`Error getting campaign '${campaignId}':`, error);
                return createResponse(500, { message: 'Failed to get campaign', errorDetails: error.message }, requestOrigin);
            }
        }

        // GET /campaigns/{id}/recipient
        if (httpMethod === 'GET' && pathParts.length === 3 && pathParts[2] === 'recipient') {
            try {
                const { Item } = await ddbDocClient.send(new GetCommand({ TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId }, ProjectionExpression: "ownerId" }));
                if (!Item || !Item.ownerId) return createResponse(404, { message: "Campaign or campaign owner not found." }, requestOrigin);
                return createResponse(200, { campaignAddress: Item.ownerId }, requestOrigin);
            } catch (error) {
                console.error(`Error getting campaign recipient '${campaignId}':`, error);
                return createResponse(500, { message: "Failed to get campaign recipient.", errorDetails: error.message }, requestOrigin);
            }
        }

        // PUT /campaigns/{id} (Update campaign)
        if (httpMethod === 'PUT' && pathParts.length === 2) {
            try {
                const authHeader = event.headers?.Authorization || event.headers?.authorization;
                const decodedToken = await verifyJWT(authHeader);
                const currentOwnerId = decodedToken.walletAddress;
                const getResult = await ddbDocClient.send(new GetCommand({ TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId } }));
                if (!getResult.Item) return createResponse(404, { message: 'Campaign not found' }, requestOrigin);
                if (getResult.Item.ownerId !== currentOwnerId) return createResponse(403, { message: 'Not authorized to update this campaign' }, requestOrigin);
                if (!event.body) return createResponse(400, { message: 'Missing request body for update' }, requestOrigin);
                
                const { title, description, goal, image, status, category } = JSON.parse(event.body);
                const nowIso = new Date().toISOString();
                let updateExpressionParts = ['#ua = :ua']; // Always update 'updatedAt'
                let expressionAttributeNames = { '#ua': 'updatedAt' };
                let expressionAttributeValues = { ':ua': nowIso };

                if (title !== undefined) {
                    if (profanityFilter.isProfane(title)) return createResponse(400, { message: "Campaign title contains inappropriate language." }, requestOrigin);
                    updateExpressionParts.push('#t = :t'); expressionAttributeNames['#t'] = 'title'; expressionAttributeValues[':t'] = title;
                }
                if (description !== undefined) {
                    if (profanityFilter.isProfane(description)) return createResponse(400, { message: "Campaign description contains inappropriate language." }, requestOrigin);
                    updateExpressionParts.push('#d = :d'); expressionAttributeNames['#d'] = 'description'; expressionAttributeValues[':d'] = description;
                }
                if (goal !== undefined) {
                    if (isNaN(Number(goal)) || Number(goal) <= 0) return createResponse(400, { message: 'Valid positive campaign goal is required.' }, requestOrigin);
                    updateExpressionParts.push('#g = :g'); expressionAttributeNames['#g'] = 'goal'; expressionAttributeValues[':g'] = Number(goal);
                }
                if (image !== undefined) {
                    updateExpressionParts.push('#imgUrl = :imgUrl'); expressionAttributeNames['#imgUrl'] = 'imageUrl'; expressionAttributeValues[':imgUrl'] = image || null;
                }
                if (status !== undefined) { /* Add status validation if needed */
                    updateExpressionParts.push('#s = :s'); expressionAttributeNames['#s'] = 'status'; expressionAttributeValues[':s'] = status;
                }
                if (category !== undefined) {
                    if (!PREDEFINED_CATEGORIES.includes(category)) return createResponse(400, { message: "Invalid category for update.", allowedCategories: PREDEFINED_CATEGORIES }, requestOrigin);
                    updateExpressionParts.push('#cat = :cat'); expressionAttributeNames['#cat'] = 'category'; expressionAttributeValues[':cat'] = category;
                }

                if (updateExpressionParts.length === 1 && updateExpressionParts[0] === '#ua = :ua') { // Only updatedAt
                    return createResponse(400, { message: 'No valid fields provided for update.' }, requestOrigin);
                }
                await ddbDocClient.send(new UpdateCommand({
                    TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId },
                    UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
                    ExpressionAttributeNames: expressionAttributeNames, ExpressionAttributeValues: expressionAttributeValues
                }));
                return createResponse(200, { success: true, id: campaignId, updatedAt: nowIso }, requestOrigin);
            } catch (error) {
                console.error(`Error updating campaign '${campaignId}':`, error);
                const errMsg = error.message || 'Failed to update campaign';
                const statusCode = (errMsg.includes('token')) ? 401 : (errMsg.includes('Not authorized')) ? 403 : (errMsg.includes('Invalid') || errMsg.includes('required') || errMsg.includes('language')) ? 400 : 500;
                return createResponse(statusCode, { message: errMsg, errorDetails: error.message }, requestOrigin);
            }
        }

        // DELETE /campaigns/{id}
        if (httpMethod === 'DELETE' && pathParts.length === 2) {
            try {
                const authHeader = event.headers?.Authorization || event.headers?.authorization;
                const decodedToken = await verifyJWT(authHeader);
                const walletAddress = decodedToken.walletAddress;
                const getResult = await ddbDocClient.send(new GetCommand({ TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId } }));
                if (!getResult.Item) return createResponse(404, { message: 'Campaign not found' }, requestOrigin);
                if (getResult.Item.ownerId !== walletAddress) return createResponse(403, { message: 'Not authorized to delete this campaign' }, requestOrigin);
                await ddbDocClient.send(new DeleteCommand({ TableName: CAMPAIGNS_TABLE_NAME, Key: { id: campaignId } }));
                return createResponse(200, { success: true, message: "Campaign deleted." }, requestOrigin);
            } catch (error) {
                console.error(`Error deleting campaign '${campaignId}':`, error);
                const errMsg = error.message || 'Failed to delete campaign';
                const statusCode = (errMsg.includes('token')) ? 401 : (errMsg.includes('Not authorized')) ? 403 : 500;
                return createResponse(statusCode, { message: errMsg, errorDetails: error.message }, requestOrigin);
            }
        }
    }

    // # ############################################################################ #
    // # #           DEFAULT ROUTE (NOT FOUND)                                       #
    // # ############################################################################ #
    console.log(`Unhandled path in campaigns function: ${httpMethod} ${path}`);
    return createResponse(404, { message: `Not Found: The requested path ${path} with method ${httpMethod} was not found on this server.` }, requestOrigin);
};
