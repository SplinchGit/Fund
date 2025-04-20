// api/verify.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

// ─── 1) Load & cache Secrets Manager values ─────────────────────────────────
let cached: {
  worldAppSecret: string;
  jwtSecret:       string;
} | null = null;

async function loadSecrets() {
  if (cached) return cached;

  const sm = new SecretsManagerClient({ region: process.env.AWS_REGION });
  // WORLD_SECRET_ARN should point at your APP_API secret ({"client_id": "...", "client_secret": "sk-..."}):
  const worldResp = await sm.send(new GetSecretValueCommand({
    SecretId: process.env.WORLD_SECRET_ARN!
  }));
  const worldJson = JSON.parse(worldResp.SecretString!);
  const worldAppSecret = worldJson.client_secret;

  // JWT_SECRET_ARN should point at your SessionJWT secret (a raw string or JSON { "secret": "..." }):
  const jwtResp = await sm.send(new GetSecretValueCommand({
    SecretId: process.env.JWT_SECRET_ARN!
  }));
  let jwtSecret: string;
  try {
    const j = JSON.parse(jwtResp.SecretString!);
    jwtSecret = j.secret || j;  
  } catch {
    jwtSecret = jwtResp.SecretString!;
  }

  cached = { worldAppSecret, jwtSecret };
  return cached;
}

// ─── 2) DynamoDB setup ──────────────────────────────────────────────────────
const region = process.env.AWS_REGION || 'eu-west-2';
const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);

// ─── 3) Handler ────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Quick ENV check for everything except the two secrets (we’ll load those)
  console.log('ENV CHECK:', {
    WORLD_APP_ID:    !!process.env.WORLD_APP_ID,
    WORLD_ACTION_ID: !!process.env.WORLD_ACTION_ID,
    WORLD_SECRET_ARN:!!process.env.WORLD_SECRET_ARN,
    JWT_SECRET_ARN:  !!process.env.JWT_SECRET_ARN,
    USER_TABLE:      !!process.env.USER_TABLE,
    AWS_REGION:      process.env.AWS_REGION,
  });

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // 1) Parse & basic validation
    const { merkle_root, nullifier_hash, proof, action, signal } = req.body as any;
    if (!merkle_root || !nullifier_hash || !proof || !action) {
      return res.status(400).json({ verified: false, error: 'Missing required fields' });
    }

    // 2) Env‑var sanity
    const worldAppId = process.env.WORLD_APP_ID!;
    const worldActionId = process.env.WORLD_ACTION_ID!;
    const userTable = process.env.USER_TABLE!;
    if (!worldAppId || !worldActionId || !userTable) {
      return res.status(500).json({ verified: false, error: 'Server misconfiguration: missing env vars' });
    }
    if (action !== worldActionId) {
      return res.status(400).json({ verified: false, error: 'Action mismatch' });
    }

    // 3) Fetch secrets
    const { worldAppSecret, jwtSecret } = await loadSecrets();

    // 4) Call World ID verify endpoint
    const verifyRes = await fetch(
      `https://developer.worldcoin.org/api/v1/verify/${worldAppId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${worldAppSecret}`,
        },
        body: JSON.stringify({ merkle_root, nullifier_hash, proof, action: worldActionId, signal: signal||'' }),
      }
    );
    if (!verifyRes.ok) {
      const errJson = await verifyRes.json().catch(() => ({}));
      return res.status(400).json({
        verified: false,
        error:    errJson.code   || 'verification_failed',
        detail:   errJson.detail || 'Unknown verification error',
      });
    }

    // 5) Upsert user in DynamoDB
    const q = new QueryCommand({
      TableName: userTable,
      KeyConditionExpression: 'nullifierHash = :nh',
      ExpressionAttributeValues: { ':nh': nullifier_hash },
    });
    const { Items } = await docClient.send(q);

    let user: any;
    if (Items && Items.length > 0) {
      user = Items[0];
    } else {
      user = { id: crypto.randomUUID(), nullifierHash: nullifier_hash, createdAt: new Date().toISOString() };
      await docClient.send(new PutCommand({ TableName: userTable, Item: user }));
    }

    // 6) Issue your own session JWT
    const token = jwt.sign(
      { userId: user.id },
      jwtSecret,
      { expiresIn: process.env.SESSION_JWT_EXPIRY || '1h' }
    );

    return res.status(200).json({
      verified:      true,
      nullifierHash: nullifier_hash,
      userId:        user.id,
      token,
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
