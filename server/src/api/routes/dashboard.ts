import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { db } from "../../db";
import { users, projects } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { redis } from "../../lib/redis";
import { getPRStatus } from "../../lib/github-pr";

const PR_STATUS_TTL_MS = 60 * 1000;

const router = Router();

router.get("/me",authenticate,async(req,res)=>{
    const user=await db.select().from(users).where(eq(users.id,req.userId!))
    const response={message:"success",user:{avatar:user[0].avatar,name:user[0].name,email:user[0].email,username:user[0].username}}
    res.json(response)
})

router.get("/listrepos",authenticate,async(req,res)=>{
    try {
        const user=await db.select({githubToken:users.githubToken}).from(users).where(eq(users.id,req.userId!))
        if(!user.length || !user[0].githubToken){
            return res.status(404).json({error:"GitHub token not found"})
        }
        const repos:any[]=[]
        let page=1
        while(true){
            const response=await fetch(`https://api.github.com/user/repos?per_page=100&page=${page}`,{
                headers:{
                    Authorization:`Bearer ${user[0].githubToken}`,
                    Accept:"application/vnd.github+json"
                }
            })
            if(!response.ok){
                return res.status(response.status).json({error:"Failed to fetch repos from GitHub"})
            }
            const data=await response.json()
            if(data.length===0) break
            repos.push(...data)
            page++
        }
        const repoList=repos.map(r=>({
            id:r.id,
            name:r.name,
            full_name:r.full_name,
            private:r.private,
            html_url:r.html_url,
            description:r.description,
            language:r.language,
            default_branch:r.default_branch,
            updated_at:r.updated_at
        }))
        res.json({message:"success",repos:repoList})
    } catch(err){
        res.status(500).json({error:"Internal server error"})
    }
})

router.get("/projects", authenticate, async (req, res) => {
    try {
        const rows = await db
            .select()
            .from(projects)
            .where(eq(projects.userId, req.userId!))
            .orderBy(desc(projects.createdAt))
        console.log(`[dashboard] /projects user=${req.userId} rows=${rows.length}`)

        // Enrich open PRs whose status is stale (best-effort, never fails the dashboard)
        const now = Date.now()
        const openCount = rows.filter((r) => r.prStatus === "open").length
        const stale = rows.filter((r) =>
            r.prStatus === "open" &&
            r.prNumber !== null &&
            (!r.prCheckedAt || now - new Date(r.prCheckedAt as Date).getTime() > PR_STATUS_TTL_MS)
        )
        console.log(`[dashboard] open PRs: ${openCount}, stale (needs poll): ${stale.length}`)

        if (stale.length > 0) {
            const userRows = await db
                .select({ githubToken: users.githubToken })
                .from(users)
                .where(eq(users.id, req.userId!))
                .limit(1)
            const token = userRows[0]?.githubToken

            if (!token) {
                console.warn(`[dashboard] no github token for user=${req.userId}, skipping PR status enrichment`)
            } else {
                const results = await Promise.allSettled(
                    stale.map((r) => getPRStatus(token, r.repoOwner, r.repoName, r.prNumber!))
                )
                const checkedAt = new Date()
                const updates: Promise<unknown>[] = []
                for (let i = 0; i < stale.length; i++) {
                    const r = stale[i]
                    const result = results[i]
                    if (result.status === "fulfilled") {
                        const newStatus = result.value.status
                        console.log(
                            `[dashboard] poll project=${r.id} repo=${r.repoOwner}/${r.repoName} pr#${r.prNumber}: ${r.prStatus} → ${newStatus}`
                        )
                        r.prStatus = newStatus
                        r.prCheckedAt = checkedAt
                        updates.push(
                            db.update(projects)
                                .set({ prStatus: newStatus, prCheckedAt: checkedAt })
                                .where(eq(projects.id, r.id))
                                .then(
                                    () => console.log(`[dashboard] persisted pr status for ${r.id}`),
                                    (e) => console.error(`[dashboard] pr-status update failed for ${r.id}:`, e?.message ?? e)
                                )
                        )
                    } else {
                        console.warn(`[dashboard] pr-status check failed for ${r.id}:`, (result.reason as Error)?.message)
                    }
                }
                // Block the response until persistence completes so the next poll
                // doesn't re-fetch the same status from GitHub.
                if (updates.length) await Promise.allSettled(updates)
            }
        }

        res.json({ projects: rows })
    } catch (err: any) {
        console.error(`[dashboard] /projects error:`, err.message, "| cause:", err.cause?.message ?? err.cause ?? "(none)")
        res.status(500).json({ error: "Failed to fetch projects" })
    }
})

router.get("/active", authenticate, async (req, res) => {
    try {
        const userId = req.userId!
        const ids = await redis.smembers(`user:${userId}:active`)
        const jobs = await Promise.all(
            ids.map(async (id) => {
                const data = await redis.hgetall(`job:${id}`)
                return Object.keys(data).length ? { jobId: id, ...data } : null
            }),
        )
        const active = jobs.filter(Boolean)
        console.log(`[dashboard] /active user=${userId} active=${active.length}`)
        res.json({ active })
    } catch (err: any) {
        console.error(`[dashboard] /active error:`, err.message)
        res.status(500).json({ error: "Failed to fetch active jobs" })
    }
})

export default router