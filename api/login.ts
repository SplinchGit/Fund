// api/login.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import argon2 from 'argon2';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[Login] Received request');

  if (req.method !== 'POST') {
    console.warn('[Login] Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse body (Vercel may give you a string)
  let body: any;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (err) {
    console.error('[Login] JSON parse error:', err);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  console.log('[Login] Parsed body:', body);

  const { username, password } = body;
  if (!username || !password) {
    console.warn('[Login] Missing username or password');
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    console.log('[Login] Looking up user:', username);

    const user = await prisma.user.findFirst({
      where: { name: username },
    });

    if (!user) {
      console.warn('[Login] User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.passwordHash) {
      console.warn('[Login] User found, but no passwordHash set');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('[Login] Verifying password');

    const valid = await argon2.verify(user.passwordHash, password);

    if (!valid) {
      console.warn('[Login] Password invalid for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('[Login] Login successful for user:', username);

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        createdAt: user.createdAt,
        isVerified: user.isVerified,
      },
    });
  } catch (err: any) {
    console.error('[Login] Uncaught error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
