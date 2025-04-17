// /api/verify.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../lib/prisma.js'; // <-- ✅ must match the named export AND include .js

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

  console.log('Received /api/verify request');

  try {
    const {
      merkle_root,
      nullifier_hash,
      proof,
      verification_level,
      action,
      signal,
    } = req.body as VerifyRequestPayload;

    // 1. Load environment variables
    const worldcoinAppId = process.env.WORLD_APP_ID;
    const worldcoinActionId = process.env.WORLD_ACTION_ID;

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

    // 2. Call Worldcoin Verification API
    const verificationRequestBody = {
      merkle_root,
      nullifier_hash,
      proof,
      action: worldcoinActionId,
      signal: signal || '',
    };

    const worldcoinVerifyUrl = `https://developer.worldcoin.org/api/v1/verify/${worldcoinAppId}`;
    console.log('Calling Worldcoin Verify API:', worldcoinVerifyUrl);

    const verifyRes = await fetch(worldcoinVerifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verificationRequestBody),
    });

    // 3. Handle Worldcoin response
    if (verifyRes.ok) {
      const verificationSuccessData = await verifyRes.json();
      console.log('Worldcoin verification successful:', verificationSuccessData);
      
      try {
        // 4. Check if user exists in database
        let user = await prisma.user.findUnique({
          where: {
            worldNullifierHash: nullifier_hash
          }
        });
        
        // 5. If user doesn't exist, create them
        if (!user) {
          console.log('Creating new user with nullifier hash:', nullifier_hash);
          user = await prisma.user.create({
            data: {
              worldNullifierHash: nullifier_hash,
              worldAppId: worldcoinAppId
            }
          });
          console.log('New user created:', user.id);
        } else {
          console.log('Existing user found:', user.id);
        }
        
        // 6. Return success response with user data
        return res.status(200).json({ 
          verified: true, 
          nullifierHash: nullifier_hash,
          userId: user.id 
        });
        
      } catch (dbError) {
        console.error('Database operation failed:', dbError);
        return res.status(500).json({ 
          verified: false, 
          error: 'database_error', 
          detail: 'Failed to process user data'
        });
      }
    } else {
      // Worldcoin verification failed
      const errorBody = await verifyRes.json().catch(() => ({}));
      console.error('Worldcoin verification failed:', verifyRes.status, errorBody);
      return res.status(400).json({
        verified: false,
        error: errorBody?.code || 'verification_failed',
        detail: errorBody?.detail || 'Unknown verification error'
      });
    }

  } catch (error: unknown) {
    console.error('Unexpected error in /api/verify:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown internal error';
    return res.status(500).json({ verified: false, error: 'Internal Server Error', detail: errorMessage });
  }
}