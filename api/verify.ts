import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma.js';

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

  try {
    const {
      merkle_root,
      nullifier_hash,
      proof,
      verification_level,
      action,
      signal,
    } = req.body as VerifyRequestPayload;

    const worldcoinAppId = process.env.WORLD_APP_ID;
    const worldcoinActionId = process.env.WORLD_ACTION_ID;

    if (!worldcoinAppId || !worldcoinActionId) {
      return res.status(500).json({ verified: false, error: 'Missing Worldcoin config' });
    }

    if (!merkle_root || !nullifier_hash || !proof || !action) {
      return res.status(400).json({ verified: false, error: 'Missing required fields' });
    }

    if (action !== worldcoinActionId) {
      return res.status(400).json({ verified: false, error: 'Action mismatch' });
    }

    const verificationRequestBody = {
      merkle_root,
      nullifier_hash,
      proof,
      action: worldcoinActionId,
      signal: signal || '',
    };

    const worldcoinVerifyUrl = `https://developer.worldcoin.org/api/v1/verify/${worldcoinAppId}`;
    const verifyRes = await fetch(worldcoinVerifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verificationRequestBody),
    });

    if (!verifyRes.ok) {
      const errorBody = await verifyRes.json().catch(() => ({}));
      return res.status(400).json({
        verified: false,
        error: errorBody?.code || 'verification_failed',
        detail: errorBody?.detail || 'Unknown verification error',
      });
    }

    let user = await prisma.user.findUnique({
      where: { worldNullifierHash: nullifier_hash },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          worldNullifierHash: nullifier_hash,
          worldAppId: worldcoinAppId,
        },
      });
    }

    return res.status(200).json({
      verified: true,
      nullifierHash: nullifier_hash,
      userId: user.id,
    });
  } catch (error: any) {
    return res.status(500).json({
      verified: false,
      error: 'internal_error',
      detail: error?.message || 'Unhandled server error',
    });
  }
}
