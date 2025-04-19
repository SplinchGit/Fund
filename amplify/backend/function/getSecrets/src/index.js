const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

// Initialize the Secrets Manager client
const secretsManager = new SecretsManagerClient({
  region: "eu-west-2" // Hard-coded to match your region
});

/**
 * Lambda function to securely retrieve configuration including World ID credentials
 * Only exposes non-sensitive configuration to the client
 */
exports.handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);
  
  try {
    // CORS headers for browser access
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,OPTIONS"
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Preflight call successful" })
      };
    }

    // Retrieve the secret value
    const secretResponse = await secretsManager.send(
      new GetSecretValueCommand({
        SecretId: "SplinchSecrets"
      })
    );

    // Parse the secret JSON
    const secretData = JSON.parse(secretResponse.SecretString);

    // Create safe client config that includes only what's needed client-side
    // Filter out sensitive credentials that should stay server-side only
    const clientConfig = {
      worldApp: {
        id: process.env.NEXT_PUBLIC_WORLD_APP_ID || secretData.WORLD_APP_ID,
        actionId: process.env.NEXT_PUBLIC_WORLD_ACTION_ID || secretData.WORLD_ACTION_ID,
        // Do NOT include any private keys or secrets here
      },
      api: {
        endpoint: process.env.NEXT_PUBLIC_API_ENDPOINT || secretData.API_ENDPOINT,
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(clientConfig)
    };
  } catch (error) {
    console.error('Error retrieving config:', error);
    
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
      },
            body: JSON.stringify({ 
              error: "Failed to retrieve configuration"
            })
          };
        }
      };