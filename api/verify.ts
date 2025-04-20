// api/verify.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand
} from '@aws-sdk/lib-dynamodb';

// Log early so you can verify in Vercel logs / CloudWatch
console.log('ENV CHECK:', {
  WORLD_APP_ID:     !!process.env.WORLD_APP_ID,
  WORLD_ACTION_ID:  !!process.env.WORLD_ACTION_ID,
  WORLD_APP_SECRET: !!process.env.WORLD_APP_SECRET,
  USER_TABLE:       !!process.env.USER_TABLE,
  AWS_REGION:       process.env.AWS_REGION,
});

const region = process.env.AWS_REGION || 'eu-west-2';
const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // 1) Parse & basic validation
    const {
      merkle_root,
      nullifier_hash,
      proof,
      action,
      signal,
    } = req.body as {
      merkle_root: string;
      nullifier_hash: string;
      proof: string;
      action: string;
      signal?: string;
    };

    if (!merkle_root || !nullifier_hash || !proof || !action) {
      return res.status(400).json({ verified: false, error: 'Missing required fields' });
    }

    // 2) Env‑var sanity
    const worldAppId     = process.env.WORLD_APP_ID;
    const worldActionId  = process.env.WORLD_ACTION_ID;
    const worldAppSecret = process.env.WORLD_APP_SECRET;
    const userTable      = process.env.USER_TABLE;

    if (!worldAppId || !worldActionId || !worldAppSecret || !userTable) {
      return res
        .status(500)
        .json({ verified: false, error: 'Server misconfiguration: missing env vars' });
    }

    if (action !== worldActionId) {
      return res.status(400).json({ verified: false, error: 'Action mismatch' });
    }

    // 3) Call World ID verify endpoint
    const verifyUrl = `https://developer.worldcoin.org/api/v1/verify/${worldAppId}`;
    const verifyRes = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${worldAppSecret}`,
      },
      body: JSON.stringify({
        merkle_root,
        nullifier_hash,
        proof,
        action: worldActionId,
        signal: signal || ''
      }),
    });

    if (!verifyRes.ok) {
      const errJson = await verifyRes.json().catch(() => ({}));
      return res.status(400).json({
        verified: false,
        error:  errJson.code   || 'verification_failed',
        detail: errJson.detail || 'Unknown verification error',
      });
    }

    // 4) Upsert user record by nullifier_hash
    const q = new QueryCommand({
      TableName:              userTable,
      KeyConditionExpression: 'nullifierHash = :nh',
      ExpressionAttributeValues: { ':nh': nullifier_hash },
    });
    const { Items } = await docClient.send(q);

    let user: { id: string; nullifierHash: string; createdAt: string };
    if (Items && Items.length > 0) {
      user = Items[0] as any;
    } else {
      user = {
        id: crypto.randomUUID(),
        nullifierHash: nullifier_hash,
        createdAt: new Date().toISOString(),
      };
      await docClient.send(
        new PutCommand({ TableName: userTable, Item: user })
      );
    }

    // 5) Return success
    return res.status(200).json({
      verified:      true,
      nullifierHash: nullifier_hash,
      userId:        user.id,
    });

  } catch (err: any) {
    console.error('verify handler error:', err);
    return res.status(500).json({
      verified: false,
      error:    'internal_error',
      detail:   err.message || 'Unhandled server error',
    });
  }
}
