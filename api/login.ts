// src/api/login.ts

import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import { Client } from 'pg'

// Vite loads env like this
const client = new Client({
  connectionString: import.meta.env.VITE_DATABASE_URL
})

const JWT_SECRET = import.meta.env.VITE_JWT_SECRET // ✅ make sure you add this to .env.local and Vercel!

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' })
  }

  try {
    await client.connect()

    const result = await client.query('SELECT * FROM users WHERE username = $1', [username])
    const user = result.rows[0]

    if (!user || !(await argon2.verify(user.password_hash, password))) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30m' })

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 30 // 30 mins
    })

    return res.status(200).json({ message: 'Login successful' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  } finally {
    await client.end()
  }
}
