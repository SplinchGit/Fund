// WLDFundAPI Main Router Lambda Function
// Routes requests to appropriate microservice functions

// # ############################################################################ #
// # #                         SECTION 1 - MODULE IMPORTS                       #
// # ############################################################################ #
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

// # ############################################################################ #
// # #                 SECTION 2 - GLOBAL CONFIGURATION & CONSTANTS               #
// # ############################################################################ #
const DEPLOYED_FRONTEND_URL = process.env.FRONTEND_URL || 'https://main.d2fvyjulmwt6nl.amplifyapp.com';
const LOCAL_DEV_URL = 'http://localhost:5173';
const ALLOWED_ORIGINS_LIST = [DEPLOYED_FRONTEND_URL, LOCAL_DEV_URL].filter(Boolean);

// Function name mappings
const FUNCTION_MAPPINGS = {
    auth: 'worldfundAuthFunction',
    donations: 'worldfundDonationsFunction',
    campaigns: 'worldfundCampaignsFunction'
};

// # ############################################################################ #
// # #                 SECTION 3 - AWS SDK CLIENT INITIALIZATION                #
// # ############################################################################ #
const lambdaRegion = process.env.AWS_REGION || 'eu-west-2';
const lambdaClient = new LambdaClient({ region: lambdaRegion });

// # ############################################################################ #
// # #           SECTION 4 - HELPER FUNCTION: CREATE API RESPONSE (WITH CORS)   #
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
// # #                 SECTION 5 - HELPER FUNCTION: ROUTE DETERMINATION         #
// # ############################################################################ #
function determineTargetFunction(routingPath) {
    // Authentication routes
    if (routingPath.startsWith('/auth') || 
        routingPath.startsWith('/verify-worldid') || 
        routingPath.startsWith('/minikit-tx-status')) {
        return FUNCTION_MAPPINGS.auth;
    }
    
    // Donation routes
    if (routingPath.includes('/donate') || 
        (routingPath.startsWith('/campaigns/') && routingPath.endsWith('/donate')) ||
        routingPath === '/donate') {
        return FUNCTION_MAPPINGS.donations;
    }
    
    // Campaign routes (must come after donation routes)
    if (routingPath.startsWith('/campaigns')) {
        return FUNCTION_MAPPINGS.campaigns;
    }
    
    // User routes (handled by auth function)
    if (routingPath.startsWith('/users')) {
        return FUNCTION_MAPPINGS.auth;
    }
    
    return null;
}

// # ############################################################################ #
// # #                 SECTION 6 - HELPER FUNCTION: INVOKE TARGET FUNCTION      #
// # ############################################################################ #
async function invokeTargetFunction(targetFunction, forwardedEvent, routingPath) {
    const functionName = `${targetFunction}-${process.env.ENV || 'dev'}`;
    
    console.log(`Routing to ${functionName} for path: ${routingPath}`);
    
    const command = new InvokeCommand({
        FunctionName: functionName,
        Payload: JSON.stringify(forwardedEvent),
        InvocationType: 'RequestResponse'
    });
    
    const response = await lambdaClient.send(command);
    
    if (!response.Payload) {
        throw new Error('No payload returned from target function');
    }
    
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));
    
    // Log the response for debugging
    console.log(`Response from ${functionName}:`, {
        statusCode: payload.statusCode,
        hasBody: !!payload.body
    });
    
    return payload;
}

// # ############################################################################ #
// # #            SECTION 7 - MAIN LAMBDA HANDLER                                #
// # ############################################################################ #
exports.handler = async (event) => {
    console.log('WLDFundAPI Router - Event:', JSON.stringify(event, null, 2));
    
    const path = event.path || event.rawPath;
    const httpMethod = event.httpMethod;
    const requestOrigin = event.headers?.origin || event.headers?.Origin;
    
    // Remove /items prefix if present for routing
    const routingPath = path.startsWith('/items') ? path.substring(6) : path;
    
    console.log(`Original path: ${path}, Routing path: ${routingPath}, Method: ${httpMethod}`);
    
    // # ############################################################################ #
    // # #            CORS PREFLIGHT HANDLING                                        #
    // # ############################################################################ #
    if (httpMethod === 'OPTIONS') {
        return createResponse(200, {}, requestOrigin);
    }
    
    // # ############################################################################ #
    // # #            ROUTE DETERMINATION                                            #
    // # ############################################################################ #
    const targetFunction = determineTargetFunction(routingPath);
    
    if (!targetFunction) {
        console.log(`No target function found for path: ${routingPath}`);
        return createResponse(404, { 
            message: `Route not found: ${httpMethod} ${path}`,
            routingPath: routingPath,
            availableRoutes: [
                '/auth/*', '/verify-worldid', '/minikit-tx-status',
                '/campaigns/*', '/campaigns/*/donate', '/donate',
                '/users/*'
            ]
        }, requestOrigin);
    }
    
    // # ############################################################################ #
    // # #            FUNCTION INVOCATION                                            #
    // # ############################################################################ #
    try {
        // Forward the event with the corrected path
        const forwardedEvent = {
            ...event,
            path: routingPath || '/',
            rawPath: routingPath || '/'
        };
        
        return await invokeTargetFunction(targetFunction, forwardedEvent, routingPath);
        
    } catch (error) {
        console.error('Lambda invocation error:', {
            error: error.message,
            targetFunction,
            functionName: `${targetFunction}-${process.env.ENV || 'dev'}`,
            path: routingPath,
            method: httpMethod
        });
        
        return createResponse(500, { 
            message: 'Internal server error',
            error: error.message,
            targetFunction,
            routingPath,
            timestamp: new Date().toISOString()
        }, requestOrigin);
    }
};