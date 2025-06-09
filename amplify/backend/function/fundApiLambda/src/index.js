const crypto = require('crypto');
const { ethers } = require('ethers');
const jwt = require('jsonwebtoken');

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    console.log("Event received in fundApiLambda:", JSON.stringify(event, null, 2));

    // This is a simple router that checks which endpoint was hit.
    const httpMethod = event.httpMethod;
    const path = event.path;
    let response;

    // Define CORS headers that will be returned with every response
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // In production, we'll lock this down
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    };

    try {
        // --- ROUTE: For getting a login message ---
        if (httpMethod === "GET" && path.endsWith("/auth/nonce")) {
            const nonce = crypto.randomBytes(32).toString('hex');
            response = {
                statusCode: 200,
                body: JSON.stringify({ nonce: `Welcome to Fund! Please sign this message to log in: ${nonce}` }),
            };
        }
        // --- ROUTE: For verifying a signature and getting a token ---
        else if (httpMethod === "POST" && path.endsWith("/auth/verify-signature")) {
            const body = JSON.parse(event.body);
            const { walletAddress, signature, nonce: receivedNonce } = body;
            if (!walletAddress || !signature || !receivedNonce) throw new Error("Missing walletAddress, signature, or nonce.");
            
            const recoveredAddress = ethers.verifyMessage(receivedNonce, signature);

            if (recoveredAddress.toLowerCase() === walletAddress.toLowerCase()) {
                const payload = { walletAddress: recoveredAddress };
                const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
                response = {
                    statusCode: 200,
                    body: JSON.stringify({ status: "success", token: token }),
                };
            } else {
                throw new Error("Signature verification failed.");
            }
        }
        // --- ROUTE: For getting a user's profile (this will be a protected route) ---
        else if (httpMethod === "GET" && path.endsWith("/profile")) {
             // The walletAddress is passed securely from our Authorizer function
            const userWalletAddress = event.requestContext.authorizer.walletAddress;
            if (!userWalletAddress) throw new Error("Could not identify user from authorizer context.");

            response = {
                statusCode: 200,
                body: JSON.stringify({
                    message: `This is a protected route. You are authenticated as:`,
                    walletAddress: userWalletAddress
                }),
            };
        }
        // --- If no route matches ---
        else {
            throw new Error(`Unsupported route: "${httpMethod} ${path}"`);
        }
    } catch (error) {
        response = {
            statusCode: 400,
            body: JSON.stringify({ status: "error", message: error.message }),
        };
    }
    
    // Return the final response with CORS headers
    return { ...response, headers };
};