// amplify/backend/function/authHandler/src/index.js

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Environment variables (you'll set these later)
const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// UPDATED CORS headers for World App compatibility
const corsHeaders = {
    "Access-Control-Allow-Origin": "*", // Allow all origins for World App
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Request-ID,X-Amz-User-Agent",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS,PUT,DELETE,PATCH",
    "Access-Control-Allow-Credentials": "false", // Set to false when using * origin
    "Access-Control-Max-Age": "86400", // Cache preflight for 24 hours
    "Vary": "Origin", // Important for caching
    "Content-Type": "application/json"
};

// Generate a secure nonce
function generateNonce() {
    return crypto.randomBytes(32).toString('hex');
}

// Validate wallet signature (simplified for now)
function validateWalletSignature(payload, nonce) {
    // TODO: Implement actual signature validation using ethers.js or similar
    // For now, basic validation
    if (!payload || !payload.message || !payload.signature) {
        return { valid: false, error: 'Missing required fields' };
    }
    
    if (!payload.message.includes(nonce)) {
        return { valid: false, error: 'Nonce mismatch' };
    }
    
    // TODO: Add actual cryptographic signature verification here
    // This is a placeholder - you'll need to verify the signature matches the wallet address
    
    return { valid: true, walletAddress: payload.address || 'mock-wallet-address' };
}

// Generate JWT token
function generateJWT(walletAddress) {
    return jwt.sign(
        { 
            walletAddress,
            type: 'wallet-auth',
            iat: Math.floor(Date.now() / 1000)
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);
    
    const { httpMethod, path, pathParameters, body, headers } = event;
    
    // Log request details for debugging
    console.log('Request details:', {
        httpMethod,
        path,
        origin: headers?.origin || headers?.Origin,
        userAgent: headers?.['"user-agent"'] || headers?.['User-Agent'],
        referer: headers?.referer || headers?.Referer
    });
    
    // Handle CORS preflight - ALWAYS respond to OPTIONS
    if (httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'CORS preflight successful' })
        };
    }
    
    try {
        // Route: GET /auth/nonce
        if (httpMethod === 'GET' && path.endsWith('/nonce')) {
            const nonce = generateNonce();
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    nonce,
                    timestamp: Date.now(),
                    environment: process.env.NODE_ENV || 'development'
                })
            };
        }
        
        // Route: POST /auth/verify-signature
        if (httpMethod === 'POST' && path.endsWith('/verify-signature')) {
            if (!body) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: 'Request body is required'
                    })
                };
            }
            
            const requestData = JSON.parse(body);
            const { payload, nonce } = requestData;
            
            if (!payload || !nonce) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: 'Missing payload or nonce'
                    })
                };
            }
            
            // Validate the signature
            const validation = validateWalletSignature(payload, nonce);
            
            if (!validation.valid) {
                return {
                    statusCode: 401,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: validation.error || 'Signature validation failed'
                    })
                };
            }
            
            // Generate JWT token
            const token = generateJWT(validation.walletAddress);
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    token,
                    walletAddress: validation.walletAddress,
                    message: 'Authentication successful'
                })
            };
        }
        
        // Route not found
        return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Route not found',
                availableRoutes: [
                    'GET /auth/nonce',
                    'POST /auth/verify-signature'
                ]
            })
        };
        
    } catch (error) {
        console.error('Lambda error:', error);
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};