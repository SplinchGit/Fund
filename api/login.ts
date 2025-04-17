import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma.js';
import argon2 from 'argon2';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[Login] Received request');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (err) {
    console.error('[Login] JSON parse error:', err);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { username, password } = body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const user = await prisma.user.findFirst({ where: { name: username } });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        createdAt: user.createdAt,
        isVerified: user.isVerified,
      },
    });
  } catch (err: any) {
    console.error('[Login] Server error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
