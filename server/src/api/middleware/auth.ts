import { Request, Response, NextFunction } from 'express'
import { verifyJWT } from '../../lib/jwt'

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  try {
    const payload = verifyJWT(token)
    req.userId = payload.userId   // attach to request
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}