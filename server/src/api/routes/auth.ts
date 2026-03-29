import express from 'express'
import { db } from '../../db'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

const router = express.Router()

router.get("/login", (_req, res) => {
  const params = new URLSearchParams({
    client_id:    process.env.GITHUB_CLIENT_ID ?? '',
    redirect_uri: process.env.GITHUB_CALLBACK_URL ?? '',
    scope:        'read:user user:email public_repo',
  })
  res.json({ url: `https://github.com/login/oauth/authorize?${params}` })
})


router.get("/callback", async(_req, res) => {
  const { code, state } = _req.query;
  console.log(code, state);
    const tokenRes = await fetch(
    'https://github.com/login/oauth/access_token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept':        'application/json',
      },
      body: JSON.stringify({
        client_id:     process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri:  process.env.GITHUB_CALLBACK_URL,
      })
    }
  )

  const tokenData = await tokenRes.json()
   if (tokenData.error) {
    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/error?reason=${tokenData.error}`
    )
  }


  const githubToken   = tokenData.access_token
  const grantedScope  = tokenData.scope
   console.log(tokenData)
  const hasWriteAccess = 
    grantedScope.includes('repo:write') || 
    grantedScope.includes('repo,')      ||
    grantedScope.startsWith('repo')

  const profileRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${githubToken}` }
  })
  const profile = await profileRes.json()


  const emailsRes = await fetch('https://api.github.com/user/emails', {
    headers: { Authorization: `Bearer ${githubToken}` }
  })
  const emails: { primary: boolean; email: string }[] = await emailsRes.json()
  const primaryEmail = emails.find(e => e.primary)?.email
  console.log(profile, primaryEmail, hasWriteAccess)
  await db.insert(users)
    .values({
      username:     profile.login,
      name:         profile.name,
      email:        primaryEmail,
      avatar:       profile.avatar_url,
      githubToken:  githubToken,
      grantedScope: grantedScope,
    })
    .onConflictDoUpdate({
      target: users.username,
      set: {
        githubToken:  githubToken,
        grantedScope: grantedScope,
        updatedAt:    new Date(),
      },
    })

  res.redirect("http://localhost:5173")
})

export default router
