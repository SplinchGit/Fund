const { verifyProof } = require('@worldcoin/idkit-server')  
// or your World ID SDK import

exports.handler = async (event) => {
  try {
    const payload = JSON.parse(event.body);
    // Validate server‐side
    await verifyProof({
      app_id: process.env.WORLD_APP_ID,
      signal: payload.signal,
      proof: payload.proof,
      merkle_root: payload.merkle_root,
      nullifier_hash: payload.nullifier_hash,
      action: payload.action,
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
