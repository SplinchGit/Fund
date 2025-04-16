// /api/verify-worldid.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface VerifyRequestPayload {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: string;
  action: string;
  signal?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  console.log('Received /api/verify-worldid request');

  try {
    const {
      merkle_root,
      nullifier_hash,
      proof,
      verification_level, 
      // James Debug: 'verification_level' is declared but its value is never read. Importance?
      action,
      signal,
    } = req.body as VerifyRequestPayload;

    // 1. Load required environment variables securely (Set these in Vercel Project Settings)
    // Note: Vercel might expose vars without VITE_ prefix to serverless functions
    const worldcoinAppId = process.env.WORLD_APP_ID; // The App ID for verification (e.g., app_...)
    const worldcoinActionId = process.env.WORLD_ACTION_ID; // The specific Action ID being verified

    console.log('Verifying for App ID:', worldcoinAppId, 'Action:', worldcoinActionId);
    if (!worldcoinAppId || !worldcoinActionId) {
       console.error('Error: Server configuration missing WORLD_APP_ID or WORLD_ACTION_ID env vars');
       return res.status(500).json({ verified: false, error: 'Server configuration error' });
    }
    if (!merkle_root || !nullifier_hash || !proof || !action) {
      console.error('Error: Missing required fields from frontend request body');
      return res.status(400).json({ verified: false, error: 'Missing required fields' });
    }
    if (action !== worldcoinActionId) {
        console.error(`Error: Action mismatch. Received ${action}, expected ${worldcoinActionId}`);
        return res.status(400).json({ verified: false, error: 'Action ID mismatch' });
    }

    // Where is the signal used? It's optional, but should be passed to the API if provided? Needed?

    // 2. Prepare the payload for the Worldcoin Verification API
    const verificationRequestBody = {
      merkle_root,
      nullifier_hash,
      proof,
      action: worldcoinActionId, // Use the action ID from env vars
      signal: signal || '',      // Does now use, blank is fine.
    };

    // 3. NETWORKING: Call Worldcoin Verification API endpoint:
    const worldcoinVerifyUrl = `https://developer.worldcoin.org/api/v1/verify/${worldcoinAppId}`;
    // Check correct url.

    console.log('Calling Worldcoin Verify API:', worldcoinVerifyUrl);

    const verifyRes = await fetch(worldcoinVerifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verificationRequestBody),
    });

    // 4. Worldcoin Response Handling:
    if (verifyRes.ok) {
      // Proof is valid!

      const verificationSuccessData = await verifyRes.json(); // Contains nullifier_hash, etc.
      console.log('Worldcoin verification successful:', verificationSuccessData);
      // TODO: (NETWORK) Log the verification data to server, properly, account handling.
      return res.status(200).json({ verified: true, nullifierHash: verificationSuccessData.nullifier_hash });
    } else {

      // Proof is invalid or an error occurred
      const errorBody = await verifyRes.json().catch(() => ({})); // Try to get error details
      console.error('Worldcoin verification failed:', verifyRes.status, errorBody);
      return res.status(400).json({
        verified: false,
        error: errorBody?.code || 'verification_failed', // Send Worldcoin error code if available
        detail: errorBody?.detail || 'Unknown verification error'
      });
    }

  } catch (error: unknown) {
    // Handle unexpected errors during processing
    console.error('Unexpected error in /api/verify-worldid:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown internal error';
    return res.status(500).json({ verified: false, error: 'Internal Server Error', detail: errorMessage });
  }
}