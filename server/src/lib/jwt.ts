import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET!

export function createJWT(userId: string) {
  return jwt.sign({ userId }, SECRET, { expiresIn: '3d' })
}

export function verifyJWT(token: string): { userId: string } {
  return jwt.verify(token, SECRET) as { userId: string }
}