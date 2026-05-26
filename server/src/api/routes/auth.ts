import express from 'express'
import { randomBytes } from 'node:crypto'
import { db } from '../../db'
import { users } from '../../db/schema'
import { createJWT } from '../../lib/jwt'

const router = express.Router()

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'

function redirectToError(res: express.Response, reason: string) {
  return res.redirect(`${FRONTEND_URL}/auth/error?reason=${reason}`)
}

router.get("/login", (_req, res) => {
  const state = randomBytes(32).toString('hex')
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure:   true,
    sameSite: 'lax',
    maxAge:   10 * 60 * 1000,
  })
  const params = new URLSearchParams({
    client_id:    process.env.GITHUB_CLIENT_ID ?? '',
    redirect_uri: process.env.GITHUB_CALLBACK_URL ?? '',
    scope:        'read:user user:email public_repo',
    state,
  })
  res.json({ url: `https://github.com/login/oauth/authorize?${params}` })
})


router.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query
    const cookieState = req.cookies?.oauth_state
    res.clearCookie('oauth_state')

    if (!state || !cookieState || state !== cookieState) {
      return redirectToError(res, 'state_mismatch')
    }
    if (typeof code !== 'string' || !code) {
      return redirectToError(res, 'missing_code')
    }

    const tokenRes = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept':       'application/json',
        },
        body: JSON.stringify({
          client_id:     process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri:  process.env.GITHUB_CALLBACK_URL,
        })
      }
    )
    if (!tokenRes.ok) {
      return redirectToError(res, 'token_exchange_failed')
    }
    const tokenData = await tokenRes.json().catch(() => null)
    if (!tokenData || tokenData.error || !tokenData.access_token) {
      return redirectToError(res, tokenData?.error ?? 'token_exchange_failed')
    }

    const githubToken  = tokenData.access_token as string
    const grantedScope = (tokenData.scope ?? '') as string

    const profileRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${githubToken}` }
    })
    if (!profileRes.ok) {
      return redirectToError(res, 'profile_fetch_failed')
    }
    const profile = await profileRes.json().catch(() => null)
    if (!profile?.login) {
      return redirectToError(res, 'invalid_profile')
    }

    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${githubToken}` }
    })
    let primaryEmail: string | undefined
    if (emailsRes.ok) {
      const emails = await emailsRes.json().catch(() => null)
      if (Array.isArray(emails)) {
        primaryEmail = emails.find(
          (e: { primary?: boolean; verified?: boolean; email?: string }) =>
            e?.primary && e?.verified
        )?.email
      }
    }
    const email =
      primaryEmail ??
      profile.email ??
      `${profile.login}@users.noreply.github.com`

    const inserted = await db.insert(users)
      .values({
        username:     profile.login,
        name:         profile.name,
        email,
        avatar:       profile.avatar_url,
        githubToken,
        grantedScope,
      })
      .onConflictDoUpdate({
        target: users.username,
        set: {
          name:         profile.name,
          email,
          avatar:       profile.avatar_url,
          githubToken,
          grantedScope,
          updatedAt:    new Date(),
        },
      })
      .returning({ id: users.id })

    if (!inserted.length) {
      return redirectToError(res, 'user_persist_failed')
    }

    const token = createJWT(inserted[0].id)
    res
      .cookie("token", token, {
        httpOnly: true,
        secure:   true,
        sameSite: "lax",
        maxAge:   60 * 60 * 24 * 3 * 1000,
      })
      .redirect(`${FRONTEND_URL}/dashboard`)
  } catch (err) {
    console.error('oauth callback failed', err)
    return redirectToError(res, 'internal_error')
  }
})

router.post("/logout", (_req, res) => {
  res.clearCookie("token").json({ message: "Logged out successfully" })
})

export default router
