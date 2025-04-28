const { verifyCloudProof } = require('@worldcoin/idkit')

exports.handler = async (event) => {
  try {
    // Check for environment variables at the start
    const worldAppId = process.env.VITE_WORLD_APP_ID;
    const worldActionId = process.env.VITE_WORLD_ACTION_ID;
    
    if (!worldAppId) {
      console.error("Missing VITE_WORLD_APP_ID environment variable");
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: "Server configuration error - missing World ID App ID"
        }),
      };
    }
    
    const payload = JSON.parse(event.body);
    
    // Validate required payload fields
    if (!payload.proof) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required field: proof" }),
      };
    }
    
    // Use the action from payload if worldActionId is not available
    const action = worldActionId || payload.action;
    
    // Verify the proof
    const verifyResult = await verifyCloudProof(
      payload.proof,
      worldAppId,
      action,
      payload.signal
    );
    
    if (!verifyResult.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: "Invalid proof",
          details: verifyResult.error
        }),
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        nullifierHash: verifyResult.nullifier_hash
      }),
    };
  } catch (err) {
    console.error('Verification error:', err);
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        error: err.message || 'Verification failed',
        type: err.name || 'Error'
      }),
    };
  }
};