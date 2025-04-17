// api/register.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
const prisma = require('../lib/prisma');
import argon2 from 'argon2';
import { randomUUID } from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // parse body (Vercel may give you a string)
  let body: any;
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
    // placeholder WorldID fields
    const worldAppId = '';
    const worldNullifierHash = randomUUID();

    // hash the password
    const passwordHash = await argon2.hash(password);

    // create the user
    const user = await prisma.user.create({
      data: {
        name: username,
        passwordHash,
        worldAppId,
        worldNullifierHash,
      },
    });

    // respond with public user data
    return res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error(err);
    // Prisma unique constraint on username or hash?
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'User already exists' });
    }
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
