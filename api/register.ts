import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma.js';
import argon2 from 'argon2';
import { randomUUID } from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { username, password } = body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const worldAppId = '';
    const worldNullifierHash = randomUUID();
    const passwordHash = await argon2.hash(password);

    const user = await prisma.user.create({
      data: {
        name: username,
        passwordHash,
        worldAppId,
        worldNullifierHash,
      },
    });

    return res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'User already exists' });
    }
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
