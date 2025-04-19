// api/login.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

const API_BASE = process.env.AMPLIFY_API_ENDPOINT;
if (!API_BASE) {
  throw new Error('Missing env var: AMPLIFY_API_ENDPOINT');
}

const LoginSchema = z.object({
  username: z.string().min(1, 'username is required'),
  password: z.string().min(1, 'password is required'),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1) Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2) Validate & parse body
  const parse = LoginSchema.safeParse(req.body);
  if (!parse.success) {
    return res
      .status(400)
      .json({ error: 'Invalid payload', issues: parse.error.issues });
  }

  // 3) Proxy to Amplify Lambda
  try {
    const upstream = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parse.data),
    });

    const text = await upstream.text();
    // Preserve status and body from upstream
    return res.status(upstream.status).send(text);
  } catch (err: any) {
    console.error('[Login Proxy] Error calling Amplify:', err);
    return res.status(502).json({ error: 'Bad gateway' });
  }
}
