const jwt = require('jsonwebtoken');

// This helper function generates the IAM policy document that API Gateway expects.
const generatePolicy = (principalId, effect, resource) => {
    const authResponse = {};
    authResponse.principalId = principalId; // The user's identity
    if (effect && resource) {
        const policyDocument = {
            Version: '2012-10-17',
            Statement: [{
                Action: 'execute-api:Invoke',
                Effect: effect, // "Allow" or "Deny"
                Resource: resource,
            }, ],
        };
        authResponse.policyDocument = policyDocument;
    }
    // We can also pass context to the next Lambda function
    authResponse.context = {
        walletAddress: principalId, // Pass the wallet address to the main logic function
    };
    return authResponse;
};

exports.handler = async (event) => {
    // Get the token from the Authorization header of the incoming request
    const token = event.authorizationToken;

    // If there's no token, deny access immediately.
    if (!token) {
        console.log("No authorization token found.");
        throw new Error("Unauthorized");
    }

    try {
        // Verify the token using the secret key from our environment variables
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // If verification is successful, the token is valid.
        // Generate a policy that "Allows" the request to proceed.
        console.log(`Valid token for principal: ${decoded.walletAddress}. Allowing request.`);
        return generatePolicy(decoded.walletAddress, 'Allow', event.methodArn);

    } catch (e) {
        // If verification fails, the token is invalid (expired, fake, etc.).
        console.error("Unauthorized: Invalid token.", e);
        // Deny access.
        throw new Error("Unauthorized");
    }
};