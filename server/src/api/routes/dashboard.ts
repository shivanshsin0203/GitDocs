import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

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

export default router